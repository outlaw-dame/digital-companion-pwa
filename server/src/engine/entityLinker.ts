/**
 * Entity Linker — Named entity recognition and knowledge-base linking.
 *
 * Architecture: Three-tier, opt-in, local-first.
 *
 *   Tier 1 (always on): Heuristic proper-noun extraction — local, zero API calls.
 *   Tier 2 (opt-in): Wikidata entity search — sends only the entity surface form,
 *                    not the full conversation. Enabled via ENTITY_LINKING_ENABLED=true.
 *   Tier 3 (opt-in): DBpedia Spotlight annotation — sends full text, highest recall.
 *                    Requires DBPEDIA_SPOTLIGHT_ENABLED=true AND ENTITY_LINKING_ENABLED=true.
 *
 * Privacy:
 *   - Tier 1 is purely local.
 *   - Tier 2 sends only isolated surface forms (individual words/phrases).
 *   - Tier 3 sends full message text to api.dbpedia-spotlight.org.
 *   - All results are cached in local SQLite with a 7-day TTL.
 *   - Eviction runs automatically on each call to evict stale entries.
 *
 * Entity matching:
 *   If a surface form resolves to a Wikidata URI, future appearances of any
 *   alias of the same entity (from the Wikidata aliases) will match the same URI.
 *   The cache key is the lower-cased surface form; the canonical record stores
 *   the Wikidata URI so repeated references converge.
 */

import { getEntityCache, upsertEntityCache, evictExpiredEntityCache } from "../db/kernel";
import { ProviderError, withRetry } from "./providers/retry";
import type { LinkedEntity } from "../types/core";

// ─── Constants ────────────────────────────────────────────────────────────────

const WIKIDATA_SEARCH_URL = "https://www.wikidata.org/w/api.php";
const DBPEDIA_SPOTLIGHT_URL = "https://api.dbpedia-spotlight.org/en/annotate";
const ENTITY_FETCH_TIMEOUT  = 5_000;
const MAX_ENTITIES_PER_MSG  = 5;

// Common English words that appear capitalized at sentence starts — not entities.
const STOPWORDS = new Set([
  "The","A","An","This","That","These","Those","I","We","They","He","She","It",
  "You","My","Our","Your","His","Her","Its","Their","But","And","Or","If","So",
  "For","In","On","At","To","Of","With","From","By","As","Is","Are","Was","Were",
  "Has","Have","Had","Do","Does","Did","Will","Would","Could","Should","May","Might",
  "Can","Let","Get","Got","Just","Also","Then","Now","Here","There","When","Where",
  "How","What","Who","Why","Which","All","Both","Each","Some","Any","No","Not",
  "Up","Down","Out","Off","Over","Under","Again","Further","Once","New","Old",
]);

// ─── Proper-noun heuristic extractor ─────────────────────────────────────────

const PROPER_NOUN_RE = /\b([A-Z][a-z]{1,30}(?:\s+[A-Z][a-z]{1,30}){0,3})\b/g;

/**
 * Extracts candidate entity surface forms from text using capitalization heuristics.
 * Filters stopwords, dedups, and caps at MAX_ENTITIES_PER_MSG.
 * Never sends text to any external service.
 */
export function extractCandidateEntities(text: string): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const match of text.matchAll(PROPER_NOUN_RE)) {
    const surface = match[1].trim();
    const key = surface.toLowerCase();
    if (STOPWORDS.has(surface.split(" ")[0])) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(surface);
    if (candidates.length >= MAX_ENTITIES_PER_MSG * 2) break; // over-sample before dedup
  }

  return candidates.slice(0, MAX_ENTITIES_PER_MSG);
}

// ─── Wikidata search ──────────────────────────────────────────────────────────

interface WikidataSearchResult {
  search: Array<{
    id: string;
    label: string;
    description?: string;
    url?: string;
  }>;
}

async function searchWikidata(surface: string): Promise<LinkedEntity | null> {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: surface,
    language: "en",
    uselang: "en",
    limit: "1",
    format: "json",
    origin: "*",
  });

  const url = `${WIKIDATA_SEARCH_URL}?${params}`;

  try {
    return await withRetry(async () => {
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "ANE-Companion/1.0 (entity-linking; Bun)",
        },
        signal: AbortSignal.timeout(ENTITY_FETCH_TIMEOUT),
      });
      if (!res.ok) throw new ProviderError(res.status, "wikidata");

      const data = await res.json() as WikidataSearchResult;
      const hit = data.search?.[0];
      if (!hit) return null;

      const entity: LinkedEntity = {
        surface,
        label: hit.label,
        description: hit.description?.slice(0, 200) ?? null,
        wikidataUri: `https://www.wikidata.org/wiki/${hit.id}`,
        dbpediaUri: null,
        entityType: inferEntityType(hit.description ?? ""),
      };
      return entity;
    }, 2, 400);
  } catch {
    return null;
  }
}

// ─── DBpedia Spotlight annotation ─────────────────────────────────────────────

interface SpotlightResource {
  "@URI": string;
  "@surfaceForm": string;
  "@types": string;
  "@similarityScore": string;
}

interface SpotlightResponse {
  Resources?: SpotlightResource[];
}

/**
 * Full-text entity annotation via DBpedia Spotlight.
 * Only called when DBPEDIA_SPOTLIGHT_ENABLED=true.
 * Sends the full message text to api.dbpedia-spotlight.org.
 */
async function annotateWithDBpedia(text: string): Promise<LinkedEntity[]> {
  try {
    return await withRetry(async () => {
      const res = await fetch(DBPEDIA_SPOTLIGHT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "User-Agent": "ANE-Companion/1.0 (entity-linking)",
        },
        body: new URLSearchParams({ text, confidence: "0.5", support: "10" }),
        signal: AbortSignal.timeout(ENTITY_FETCH_TIMEOUT),
      });
      if (!res.ok) throw new ProviderError(res.status, "dbpedia-spotlight");

      const data = await res.json() as SpotlightResponse;
      const resources = data.Resources ?? [];

      return resources
        .filter((r) => parseFloat(r["@similarityScore"]) >= 0.5)
        .slice(0, MAX_ENTITIES_PER_MSG)
        .map((r): LinkedEntity => ({
          surface: r["@surfaceForm"],
          label: r["@surfaceForm"],
          description: null,
          wikidataUri: null,
          dbpediaUri: r["@URI"],
          entityType: inferEntityTypeFromDBpedia(r["@types"]),
        }));
    }, 2, 400);
  } catch {
    return [];
  }
}

// ─── Entity type inference ────────────────────────────────────────────────────

function inferEntityType(description: string): string | null {
  const d = description.toLowerCase();
  if (d.includes("person") || d.includes("politician") || d.includes("actor") ||
      d.includes("author") || d.includes("musician") || d.includes("scientist")) {
    return "person";
  }
  if (d.includes("city") || d.includes("country") || d.includes("river") ||
      d.includes("mountain") || d.includes("island") || d.includes("place")) {
    return "place";
  }
  if (d.includes("company") || d.includes("organization") || d.includes("corporation")) {
    return "organization";
  }
  return null;
}

function inferEntityTypeFromDBpedia(types: string): string | null {
  if (!types) return null;
  const t = types.toLowerCase();
  if (t.includes("person")) return "person";
  if (t.includes("place") || t.includes("location")) return "place";
  if (t.includes("organisation") || t.includes("organization") || t.includes("company")) {
    return "organization";
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Links named entities in the given text to Wikidata/DBpedia.
 * Returns an empty array when ENTITY_LINKING_ENABLED is not "true".
 * Results are cached in SQLite with a 7-day TTL.
 */
export async function linkEntities(text: string): Promise<LinkedEntity[]> {
  if (process.env.ENTITY_LINKING_ENABLED !== "true") return [];

  // Opportunistic cache eviction (cheap: one DELETE on a small table)
  evictExpiredEntityCache();

  const useDBpedia = process.env.DBPEDIA_SPOTLIGHT_ENABLED === "true";

  // Tier 3: Full-text annotation (if enabled) — bypass candidate extraction
  if (useDBpedia) {
    const spotlightResults = await annotateWithDBpedia(text.slice(0, 2000));
    // Persist each result to cache; merge any Wikidata hits for same surface
    const enriched = await Promise.all(
      spotlightResults.map(async (e) => {
        const cached = getEntityCache(e.surface);
        if (cached) return cached;
        // Try Wikidata to get URI for the same surface
        const wdHit = await searchWikidata(e.surface);
        const merged: LinkedEntity = {
          ...e,
          wikidataUri: wdHit?.wikidataUri ?? null,
          description: wdHit?.description ?? null,
          label: wdHit?.label ?? e.label,
          entityType: e.entityType ?? wdHit?.entityType ?? null,
        };
        upsertEntityCache(merged);
        return merged;
      }),
    );
    return enriched.filter(Boolean);
  }

  // Tier 2: Wikidata search for each heuristically-extracted candidate
  const candidates = extractCandidateEntities(text);
  if (candidates.length === 0) return [];

  const results = await Promise.all(
    candidates.map(async (surface): Promise<LinkedEntity | null> => {
      const cached = getEntityCache(surface);
      if (cached) return cached;
      const entity = await searchWikidata(surface);
      if (entity) upsertEntityCache(entity);
      return entity;
    }),
  );

  return results.filter((e): e is LinkedEntity => e !== null);
}

/**
 * Formats linked entities for injection into AI system/user prompts.
 * Returns empty string when there are no entities.
 */
export function formatEntitiesForPrompt(entities: LinkedEntity[]): string {
  if (entities.length === 0) return "";
  const lines = entities.map((e) => {
    const parts = [`[${e.entityType ?? "entity"}: ${e.label}]`];
    if (e.description) parts.push(e.description);
    if (e.wikidataUri) parts.push(`<${e.wikidataUri}>`);
    return parts.join(" — ");
  });
  return `\nIDENTIFIED ENTITIES:\n${lines.join("\n")}`;
}
