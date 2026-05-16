/**
 * Hybrid Memory Search — Relative Score Fusion (FTS5 + Cosine Similarity)
 *
 * Architecture (derived from Weaviate + ObjectBox research):
 *
 *   1. FTS5 (BM25)         — keyword recall; zero API cost, always available
 *   2. Cosine similarity   — semantic recall; requires an embedding provider
 *   3. Relative Score Fusion — normalize both score distributions to [0, 1]
 *                              independently, then combine:
 *                              score = alpha * vec + (1 - alpha) * bm25
 *
 * Graceful degradation:
 *   - No embedder configured  → FTS5-only (alpha forced to 0)
 *   - FTS query is empty      → vector-only
 *   - Embedding API down      → FTS5-only (circuit breaker in embedder.ts)
 *
 * All results are ownership-checked — observations from other nodes are never
 * returned even if nodeId is incorrectly supplied.
 */

import {
  getFTSResults,
  getNodeEmbeddings,
  getObservationsByIds,
  upsertEmbedding,
  getObservationText,
  getNodesWithPendingEmbeddings,
  getObservationIdsWithoutEmbeddings,
  type ObservationExcerpt,
} from "../db/kernel";
import {
  embedText,
  getModelFingerprint,
  getEmbedderSpec,
  bufferToFloat32,
  float32ToBuffer,
} from "./embedder";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemorySearchResult extends ObservationExcerpt {
  score:     number;
  matchType: "hybrid" | "vector" | "fts5";
}

export interface MemorySearchOptions {
  k?:               number;  // results to return (default 5)
  alpha?:           number;  // vector weight in fusion, 0-1 (default 0.7)
  excludeSessionId?: string; // current session — excluded so recent turns aren't echoed
  minScore?:        number;  // minimum fused score (default 0.05)
}

// ─── Cosine similarity ────────────────────────────────────────────────────────

/**
 * Cosine similarity between two equal-length Float32Arrays.
 * Handles zero-norm vectors and dimension mismatch safely (returns 0).
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── FTS5 query builder ───────────────────────────────────────────────────────

/**
 * Convert free-form user text into a safe FTS5 MATCH expression.
 * Strips punctuation, filters tokens shorter than 3 chars (FTS5 default
 * minimum token length), and caps at 20 terms to stay within FTS5 limits.
 * Returns empty string when no usable tokens remain.
 */
export function buildFTSQuery(text: string): string {
  const tokens = text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 3)
    .slice(0, 20);

  return tokens.join(" "); // FTS5 implicit OR — any token match raises score
}

// ─── Relative Score Fusion ────────────────────────────────────────────────────

interface FuseOutput {
  obsId:     number;
  score:     number;
  matchType: "hybrid" | "vector" | "fts5";
}

/**
 * Relative Score Fusion (Weaviate relativeScoreFusion algorithm).
 *
 * Min-max normalizes each score list to [0, 1] independently so that
 * relative magnitude differences are preserved (unlike rank-only RRF).
 * Combined score: alpha * normalized_vec + (1 - alpha) * normalized_bm25.
 *
 * Items appearing in only one index are scored using their respective weight
 * (alpha or 1-alpha) so they remain comparable to hybrid results.
 */
export function relativeScoreFusion(
  ftsRows: { obsId: number; rawScore: number }[],
  vecRows: { obsId: number; score: number }[],
  alpha:   number,
): FuseOutput[] {
  // Normalize FTS5 BM25 scores
  // BM25 rank from SQLite is negative (more negative = better). Invert → positive.
  const ftsAbs   = ftsRows.map((r) => Math.abs(r.rawScore));
  const ftsMin   = ftsAbs.length ? Math.min(...ftsAbs) : 0;
  const ftsMax   = ftsAbs.length ? Math.max(...ftsAbs) : 0;
  const ftsRange = ftsMax - ftsMin;

  const normFTS = new Map<number, number>(
    ftsRows.map((r, i) => [
      r.obsId,
      ftsRange > 0 ? (ftsAbs[i] - ftsMin) / ftsRange : 1.0,
    ]),
  );

  // Normalize cosine scores (already [0, 1] but normalize for relative spread)
  const vecScores = vecRows.map((r) => r.score);
  const vecMin    = vecScores.length ? Math.min(...vecScores) : 0;
  const vecMax    = vecScores.length ? Math.max(...vecScores) : 0;
  const vecRange  = vecMax - vecMin;

  const normVec = new Map<number, number>(
    vecRows.map((r) => [
      r.obsId,
      vecRange > 0 ? (r.score - vecMin) / vecRange : 1.0,
    ]),
  );

  // Merge all unique observation IDs and compute fused score
  const allIds = new Set<number>([
    ...ftsRows.map((r) => r.obsId),
    ...vecRows.map((r) => r.obsId),
  ]);

  const fused: FuseOutput[] = [];

  for (const obsId of allIds) {
    const fts    = normFTS.get(obsId);
    const vec    = normVec.get(obsId);
    const hasFts = fts !== undefined;
    const hasVec = vec !== undefined;

    const score = hasFts && hasVec
      ? alpha * vec + (1 - alpha) * fts
      : hasVec
      ? alpha * vec
      : (1 - alpha) * (fts ?? 0);

    fused.push({
      obsId,
      score,
      matchType: hasFts && hasVec ? "hybrid" : hasVec ? "vector" : "fts5",
    });
  }

  return fused.sort((a, b) => b.score - a.score);
}

// ─── Main search ──────────────────────────────────────────────────────────────

const DEFAULT_K          = 5;
const DEFAULT_ALPHA      = 0.7;
const DEFAULT_MIN_SCORE  = 0.05;
const FTS_CANDIDATE_CAP  = 50;
const VEC_CANDIDATE_CAP  = 50;
const EMBED_LOAD_CAP     = 5_000;

/**
 * Retrieve the most relevant past observations for `nodeId` given `queryText`.
 *
 * FTS5 and vector searches run concurrently. Scores are fused via Relative
 * Score Fusion. Results are ownership-checked and session-excluded.
 */
export async function searchMemory(
  nodeId:    string,
  queryText: string,
  opts:      MemorySearchOptions = {},
): Promise<MemorySearchResult[]> {
  const k              = Math.max(1, opts.k              ?? DEFAULT_K);
  const alpha          = Math.min(1, Math.max(0, opts.alpha  ?? DEFAULT_ALPHA));
  const minScore       = opts.minScore                   ?? DEFAULT_MIN_SCORE;
  const excludeSession = opts.excludeSessionId           ?? "";

  if (!queryText.trim()) return [];

  // Build FTS query (may be empty if query has no usable tokens)
  const ftsQuery = buildFTSQuery(queryText);

  // FTS5 search and vector search run concurrently
  const ftsPromise = ftsQuery.length > 0
    ? Promise.resolve(getFTSResults(nodeId, ftsQuery, excludeSession, FTS_CANDIDATE_CAP))
    : Promise.resolve([] as { obsId: number; rawScore: number }[]);

  const fingerprint = getModelFingerprint();
  const vecPromise: Promise<{ obsId: number; score: number }[]> = fingerprint
    ? embedText(queryText).then((queryVec) => {
        if (!queryVec) return [];

        const rows = getNodeEmbeddings(nodeId, fingerprint, EMBED_LOAD_CAP);
        if (rows.length === 0) return [];

        return rows
          .map((row) => ({
            obsId: row.obsId,
            score: cosineSimilarity(queryVec, bufferToFloat32(row.embedding)),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, VEC_CANDIDATE_CAP);
      })
    : Promise.resolve([]);

  const [ftsRows, vecRows] = await Promise.all([ftsPromise, vecPromise]);

  if (ftsRows.length === 0 && vecRows.length === 0) return [];

  // Use FTS-only alpha when no vector results (avoids meaningless zero-vec bias)
  const effectiveAlpha = vecRows.length === 0 ? 0 : alpha;
  const fused          = relativeScoreFusion(ftsRows, vecRows, effectiveAlpha);

  const topCandidates = fused
    .filter((r) => r.score >= minScore)
    .slice(0, k);

  if (topCandidates.length === 0) return [];

  const ids  = topCandidates.map((r) => r.obsId);
  const rows = getObservationsByIds(ids, nodeId);

  const scoreMap = new Map(topCandidates.map((r) => [r.obsId, r]));

  return rows
    .flatMap((row) => {
      const fuse = scoreMap.get(row.id);
      return fuse ? [{ ...row, score: fuse.score, matchType: fuse.matchType } satisfies MemorySearchResult] : [];
    })
    .sort((a, b) => b.score - a.score);
}

// ─── Prompt formatter ─────────────────────────────────────────────────────────

/**
 * Format retrieved memories for injection as prompt augmentation.
 * These are the entity's OWN past records — they use a different wrapper
 * from wrapExternalContext (no "treat as data" instruction needed).
 * Returns empty string for empty input.
 */
export function formatMemoriesForPrompt(memories: MemorySearchResult[]): string {
  if (memories.length === 0) return "";

  const lines = memories.map((m) => {
    const date       = m.timestamp.slice(0, 10);
    const userSnip   = m.user_input.slice(0, 100).replace(/\n/g, " ");
    const entitySnip = m.entity_response.slice(0, 100).replace(/\n/g, " ");
    return `• [${date}] (arousal:${m.arousal_level}, ${m.valence}) User: "${userSnip}" → You: "${entitySnip}"`;
  });

  return [
    "\n[YOUR RECALLED MEMORIES — past exchanges retrieved by relevance to this message]",
    ...lines,
    "[END RECALLED MEMORIES]",
  ].join("\n");
}

// ─── Async embedding scheduler ────────────────────────────────────────────────

/**
 * Queue an async embedding for a freshly-logged observation.
 * Uses queueMicrotask so the pipeline response is returned to the client
 * before this begins. Failures are logged and never propagated.
 */
export function scheduleEmbedding(observationId: number): void {
  const fingerprint = getModelFingerprint();
  if (!fingerprint) return;

  queueMicrotask(() => {
    void (async () => {
      try {
        const text = getObservationText(observationId);
        if (!text) return;

        const vec = await embedText(text);
        if (!vec) return;

        const spec = getEmbedderSpec();
        if (!spec) return;

        upsertEmbedding(observationId, float32ToBuffer(vec), spec.dim, fingerprint);
      } catch (err) {
        console.warn(
          `[memorySearch] scheduleEmbedding(${observationId}) failed:`,
          (err as Error).message,
        );
      }
    })();
  });
}

// ─── Startup backfill ─────────────────────────────────────────────────────────

const BACKFILL_BATCH    = 10;
const BACKFILL_DELAY_MS = 500; // rate-limit friendly inter-batch pause

/**
 * Embed all observations that lack vectors for the current model fingerprint.
 * Processes oldest-first so partial backfills give coverage from the past forward.
 * Stops automatically if the embedding provider goes down (circuit breaker).
 * Call once from server startup — does not block the listening port.
 */
export async function runEmbeddingBackfill(): Promise<void> {
  const fingerprint = getModelFingerprint();
  if (!fingerprint) return;

  const nodeIds = getNodesWithPendingEmbeddings(fingerprint);
  if (nodeIds.length === 0) return;

  console.log(`[backfill] Beginning for ${nodeIds.length} node(s) — model: ${fingerprint}`);

  for (const nodeId of nodeIds) {
    let total = 0;

    for (;;) {
      const ids = getObservationIdsWithoutEmbeddings(nodeId, fingerprint, BACKFILL_BATCH);
      if (ids.length === 0) break;

      for (const id of ids) {
        try {
          const text = getObservationText(id);
          if (!text) continue;

          const vec = await embedText(text);
          if (!vec) {
            // Circuit breaker or provider down — abort; resume on next startup
            console.log(`[backfill] Paused (embedder unavailable). Embedded ${total} observation(s).`);
            return;
          }

          const spec = getEmbedderSpec();
          if (!spec) return;

          upsertEmbedding(id, float32ToBuffer(vec), spec.dim, fingerprint);
          total++;
        } catch (err) {
          // Single observation failure — log and continue with the batch
          console.warn(`[backfill] obs ${id} failed:`, (err as Error).message);
        }
      }

      await new Promise<void>((resolve) => setTimeout(resolve, BACKFILL_DELAY_MS));
    }

    if (total > 0) console.log(`[backfill] Node ${nodeId}: embedded ${total} observation(s).`);
  }

  console.log("[backfill] Complete.");
}
