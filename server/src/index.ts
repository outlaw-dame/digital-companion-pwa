/**
 * ANE Server — Hono HTTP API
 *
 * Endpoints:
 *   POST /api/interact                  — Main interaction pipeline
 *   GET  /api/core/:id                  — Fetch current NodeCore state
 *   GET  /api/patterns/:id              — Arousal patterns (longitudinal)
 *   GET  /api/providers                 — Available provider status
 *   GET  /api/providers/models/cloudflare — Cloudflare model catalog
 *   GET  /api/health                    — Liveness check
 *
 * Supports: Claude (Anthropic), Cloudflare Workers AI, Ollama, local-only.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { processInteraction } from "./engine/pipeline";
import { getNodeCore, getArousalPatterns, getObservation, deleteObservation, deleteMemoryAnchor } from "./db/kernel";
import { checkDeletionSafety, safetyHoldResponse } from "./engine/safetyGate";
import { getRegistry } from "./engine/providers/registry";
import { CLOUDFLARE_MODELS } from "./engine/providers/cloudflare";
import { processLinks } from "./engine/linkProcessor";
import { getKlipyClient, isKlipyAvailable } from "./engine/klipyClient";
import { makeRateLimiter } from "./utils/rateLimiter";
import { sanitizeDesignation } from "./utils/promptSanitizer";
import { runEmbeddingBackfill } from "./engine/memorySearch";
import type { InteractionRequest } from "./types/core";
import type { ProviderName } from "./engine/providers/interface";

const app = new Hono();

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BODY_BYTES    = 64 * 1024;   // 64 KB — generous for any real conversation turn
const MAX_INPUT_CHARS   = 4_000;       // ~3× typical paragraph; beyond this is abuse
const MAX_DESIGNATION   = 64;
const UUID_RE           = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const allowInteractRequest  = makeRateLimiter(30, 60_000);   // 30 interactions/min per IP
const allowPreviewRequest   = makeRateLimiter(20, 60_000);
const allowMediaRequest     = makeRateLimiter(60, 60_000);   // GIF keyboard fetches in bursts
const allowDeleteRequest    = makeRateLimiter(10, 60_000);   // 10 deletes/minute per IP
const allowReadRequest      = makeRateLimiter(60, 60_000);   // read-only endpoints

function clientIp(req: { header(name: string): string | undefined }): string {
  return (
    req.header("x-forwarded-for")?.split(",")[0].trim() ??
    req.header("x-real-ip") ??
    "unknown"
  );
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Configurable via ALLOWED_ORIGINS env var (comma-separated).
// Dev default allows localhost. Set explicitly in production.

const rawOrigins = process.env.ALLOWED_ORIGINS ?? "";
const allowedOrigins: string[] = rawOrigins.trim()
  ? rawOrigins.split(",").map((o) => o.trim()).filter(Boolean)
  : ["http://localhost:5173", "http://localhost:4173", "http://localhost:3000"];

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: allowedOrigins,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

// Cross-Origin isolation — required for WebLLM SharedArrayBuffer (WebGPU multi-threading).
// Without these headers, WebLLM throws "SharedArrayBuffer is not defined".
// In production, set these on your static file server / CDN as well.
app.use("*", async (c, next) => {
  await next();
  c.res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  c.res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  c.res.headers.set("X-Content-Type-Options", "nosniff");
});

// Request size guard — reject oversized bodies before parsing JSON.
app.use("/api/interact", async (c, next) => {
  const rawLen = c.req.header("content-length");
  const contentLength = rawLen ? parseInt(rawLen, 10) : 0;
  if (contentLength > MAX_BODY_BYTES) {
    return c.json({ error: "Request body too large" }, 413);
  }
  const ct = c.req.header("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return c.json({ error: "Content-Type must be application/json" }, 415);
  }
  await next();
});


// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/api/health", (c) => {
  if (!allowReadRequest(clientIp(c.req))) return c.json({ error: "Too many requests" }, 429);
  const registry = getRegistry();
  const primary = registry.getPrimaryProvider();
  return c.json({
    status: "operational",
    primaryProvider: primary?.name ?? "local",
    availableProviderCount: registry.getAvailableCount(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Providers ────────────────────────────────────────────────────────────────

app.get("/api/providers", (c) => {
  if (!allowReadRequest(clientIp(c.req))) return c.json({ error: "Too many requests" }, 429);
  const registry = getRegistry();
  return c.json(registry.getStatus());
});

app.get("/api/providers/models/cloudflare", (c) => {
  if (!allowReadRequest(clientIp(c.req))) return c.json({ error: "Too many requests" }, 429);
  return Response.json(CLOUDFLARE_MODELS);
});

// ─── Link Preview (standalone) ───────────────────────────────────────────────
// Client can call this to get OG previews for URLs before or outside of an interaction.

app.post("/api/links/preview", async (c) => {
  if (!allowPreviewRequest(clientIp(c.req))) {
    return c.json({ error: "Too many requests" }, 429);
  }

  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return c.json({ error: "Content-Type must be application/json" }, 415);
  }

  let body: { urls?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return c.json({ error: "urls must be a non-empty array" }, 400);
  }

  const input = body.urls
    .filter((u): u is string => typeof u === "string")
    .slice(0, 5)
    .join(" ");

  // Overall 12 s wall-clock cap — prevents slow/hung URL fetches from tying up a handler.
  const previews = await Promise.race([
    processLinks(input, process.env.GOOGLE_SAFE_BROWSING_API_KEY),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("link preview timeout")), 12_000),
    ),
  ]).catch(() => []);

  return c.json({ previews });
});

// ─── GIF Media Proxy ─────────────────────────────────────────────────────────
// Proxies Klipy API so the API key is never exposed to the client.
// Scope: GIF keyboard only — search, trending, categories, share trigger.

const VALID_RATINGS = new Set(["g", "pg", "pg-13", "r"]);
const KLIPY_SLUG_RE = /^[a-zA-Z0-9_-]{1,200}$/;

function safeRating(raw: string | undefined): string {
  return VALID_RATINGS.has(raw ?? "") ? raw! : "g";
}

function safePage(raw: string | undefined, fallback = 1): number {
  const n = parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 1000) : fallback;
}

function safePerPage(raw: string | undefined, fallback = 24): number {
  const n = parseInt(raw ?? "", 10);
  return Number.isFinite(n) ? Math.min(50, Math.max(8, n)) : fallback;
}

app.get("/api/media/gifs/trending", async (c) => {
  if (!allowMediaRequest(clientIp(c.req))) return c.json({ error: "Too many requests" }, 429);
  const klipy = getKlipyClient();
  if (!klipy) return c.json({ error: "GIF service not configured" }, 503);
  const page     = safePage(c.req.query("page"));
  const per_page = safePerPage(c.req.query("per_page"));
  const rating   = safeRating(c.req.query("rating"));
  try {
    const data = await klipy.trending({ page, per_page, rating });
    if (data.result !== true || !Array.isArray(data.data?.data)) {
      console.error("[klipy] trending: unexpected response shape");
      return c.json({ error: "GIF fetch failed" }, 502);
    }
    return c.json(data);
  } catch (err) {
    console.error("[klipy] trending failed:", err);
    return c.json({ error: "GIF fetch failed" }, 502);
  }
});

app.get("/api/media/gifs/search", async (c) => {
  if (!allowMediaRequest(clientIp(c.req))) return c.json({ error: "Too many requests" }, 429);
  const klipy = getKlipyClient();
  if (!klipy) return c.json({ error: "GIF service not configured" }, 503);
  const q = (c.req.query("q") ?? "").trim().slice(0, 200);
  if (!q) return c.json({ error: "q is required" }, 400);
  const page     = safePage(c.req.query("page"));
  const per_page = safePerPage(c.req.query("per_page"));
  const rating   = safeRating(c.req.query("rating"));
  try {
    const data = await klipy.search(q, { page, per_page, rating });
    if (data.result !== true || !Array.isArray(data.data?.data)) {
      console.error("[klipy] search: unexpected response shape");
      return c.json({ error: "GIF search failed" }, 502);
    }
    return c.json(data);
  } catch (err) {
    console.error("[klipy] search failed:", err);
    return c.json({ error: "GIF search failed" }, 502);
  }
});

app.get("/api/media/gifs/categories", async (c) => {
  if (!allowMediaRequest(clientIp(c.req))) return c.json({ error: "Too many requests" }, 429);
  const klipy = getKlipyClient();
  if (!klipy) return c.json({ error: "GIF service not configured" }, 503);
  try {
    const data = await klipy.categories();
    if (data.result !== true || !Array.isArray(data.data)) {
      console.error("[klipy] categories: unexpected response shape");
      return c.json({ error: "GIF categories failed" }, 502);
    }
    return c.json(data);
  } catch (err) {
    console.error("[klipy] categories failed:", err);
    return c.json({ error: "GIF categories failed" }, 502);
  }
});

app.post("/api/media/gifs/:slug/share", async (c) => {
  const klipy = getKlipyClient();
  if (!klipy) return c.json({ ok: false }, 200); // silently no-op if not configured
  const { slug } = c.req.param();
  if (!slug || !KLIPY_SLUG_RE.test(slug)) return c.json({ error: "Invalid slug" }, 400);
  klipy.share(slug); // fire-and-forget
  return c.json({ ok: true });
});

app.get("/api/media/status", (c) => {
  if (!allowReadRequest(clientIp(c.req))) return c.json({ error: "Too many requests" }, 429);
  return c.json({ gifAvailable: isKlipyAvailable() });
});

// ─── Observation Delete ───────────────────────────────────────────────────────
// Hard-deletes an observation (user message + entity response pair).
// Safety-gated: high-acuity crisis content is rejected with 403.
// Ownership-enforced: the observation's node_id must match the body's nodeId.

app.delete("/api/observations/:id", async (c) => {
  if (!allowDeleteRequest(clientIp(c.req))) {
    return c.json({ error: "Too many requests" }, 429);
  }

  const { id: rawId } = c.req.param();
  const obsId = parseInt(rawId, 10);
  if (!Number.isFinite(obsId) || obsId <= 0) {
    return c.json({ error: "Invalid observation id" }, 400);
  }

  const ct = c.req.header("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return c.json({ error: "Content-Type must be application/json" }, 415);
  }

  let body: { nodeId?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body.nodeId !== "string" || !UUID_RE.test(body.nodeId)) {
    return c.json({ error: "nodeId must be a valid UUID" }, 400);
  }
  const nodeId = body.nodeId;

  const obs = getObservation(obsId, nodeId);
  if (!obs) return c.json({ error: "Not found" }, 404);

  const safety = checkDeletionSafety(`${obs.user_input} ${obs.entity_response}`);
  if (!safety.canDelete) {
    // Load node core for character-consistent response; fall back to generic if not found
    const core = getNodeCore(nodeId);
    const attribute = core?.attribute ?? "sentinel";
    const designation = core?.designation ?? "you";
    return c.json({
      deleted: false,
      reason: safety.hold,
      entityMessage: safetyHoldResponse(safety.hold!, designation, attribute),
    }, 403);
  }

  const deleted = deleteObservation(obsId, nodeId);
  if (!deleted) return c.json({ error: "Not found" }, 404);

  return c.json({ deleted: true });
});

// ─── Memory Anchor Delete ─────────────────────────────────────────────────────
// Hard-deletes a memory anchor. No safety gate — anchors are entity-generated
// summaries, not raw user input; user retains full control over their anchors.

app.delete("/api/anchors/:anchorId", async (c) => {
  if (!allowDeleteRequest(clientIp(c.req))) {
    return c.json({ error: "Too many requests" }, 429);
  }

  const { anchorId } = c.req.param();
  if (!anchorId || !UUID_RE.test(anchorId)) {
    return c.json({ error: "Invalid anchor id" }, 400);
  }

  const ct = c.req.header("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return c.json({ error: "Content-Type must be application/json" }, 415);
  }

  let body: { nodeId?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body.nodeId !== "string" || !UUID_RE.test(body.nodeId)) {
    return c.json({ error: "nodeId must be a valid UUID" }, 400);
  }

  const deleted = deleteMemoryAnchor(anchorId, body.nodeId);
  if (!deleted) return c.json({ error: "Not found" }, 404);

  return c.json({ deleted: true });
});

// ─── Interact ─────────────────────────────────────────────────────────────────

app.post("/api/interact", async (c) => {
  if (!allowInteractRequest(clientIp(c.req))) {
    return c.json({ error: "Too many requests" }, 429);
  }

  let body: InteractionRequest & { preferredProvider?: ProviderName };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const input = body.userInput?.trim() ?? "";
  if (!input) {
    return c.json({ error: "userInput is required" }, 400);
  }
  if (input.length > MAX_INPUT_CHARS) {
    return c.json({ error: `userInput exceeds ${MAX_INPUT_CHARS} characters` }, 400);
  }

  if (!body.currentCore?.id || !body.currentCore?.designation) {
    return c.json({ error: "currentCore.id and currentCore.designation are required" }, 400);
  }
  if (!UUID_RE.test(body.currentCore.id)) {
    return c.json({ error: "currentCore.id must be a valid UUID" }, 400);
  }
  const rawDesignation = body.currentCore.designation;
  if (typeof rawDesignation !== "string" ||
      rawDesignation.trim().length === 0 ||
      rawDesignation.length > MAX_DESIGNATION) {
    return c.json({ error: "currentCore.designation is invalid" }, 400);
  }
  // Sanitize designation — prevents a crafted name from injecting into system prompts.
  // The pipeline also sanitizes, but we do it here too so the cleaned value
  // is consistent if the body is used directly downstream.
  body.currentCore.designation = sanitizeDesignation(rawDesignation);

  if (!body.sessionId || !UUID_RE.test(body.sessionId)) {
    return c.json({ error: "sessionId must be a valid UUID" }, 400);
  }

  if (body.parentObservationId !== undefined) {
    if (!Number.isInteger(body.parentObservationId) || body.parentObservationId <= 0) {
      return c.json({ error: "parentObservationId must be a positive integer" }, 400);
    }
  }

  try {
    const result = await processInteraction(body);
    return c.json(result);
  } catch (err) {
    console.error("Pipeline error:", err);
    return c.json({ error: "Internal processing error" }, 500);
  }
});

// ─── Core State ───────────────────────────────────────────────────────────────

app.get("/api/core/:id", (c) => {
  if (!allowReadRequest(clientIp(c.req))) return c.json({ error: "Too many requests" }, 429);
  const { id } = c.req.param();
  if (!UUID_RE.test(id)) return c.json({ error: "Invalid id" }, 400);
  const core = getNodeCore(id);
  if (!core) return c.json({ error: "No entity found with that ID" }, 404);
  return c.json(core);
});

// ─── Patterns ─────────────────────────────────────────────────────────────────

app.get("/api/patterns/:id", (c) => {
  if (!allowReadRequest(clientIp(c.req))) return c.json({ error: "Too many requests" }, 429);
  const { id } = c.req.param();
  if (!UUID_RE.test(id)) return c.json({ error: "Invalid id" }, 400);
  const patterns = getArousalPatterns(id);
  return c.json(patterns);
});

// ─── Server Bootstrap ─────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const registry = getRegistry();

const allProviders = registry.getStatus();
const edgeProviders  = allProviders.filter((p) => p.tier === "edge"  && p.isAvailable);
const largeProviders = allProviders.filter((p) => p.tier === "large" && p.isAvailable);
const hasLLMClassifier = !!(registry.cfToken && registry.cfAccountId);

console.log(`\n  ANE Server`);
console.log(`  ──────────────────────────────────────`);
console.log(`  Listening on http://localhost:${PORT}`);
console.log(`  Router: hybrid (rule-based + ${hasLLMClassifier ? "Cloudflare LLM classifier" : "rules-only, no Cloudflare configured"})`);
console.log(`  Edge  : ${edgeProviders.map((p) => p.label).join(", ") || "none"}`);
console.log(`  Large : ${largeProviders.map((p) => p.label).join(", ") || "none (local fallback)"}`);
console.log(`  Providers:`);
for (const p of allProviders) {
  const icon = p.isAvailable ? "✓" : "✗";
  const primary = p.isPrimary ? " [PRIMARY]" : "";
  const tier = p.tier !== "local" ? ` [${p.tier}]` : "";
  console.log(`    ${icon} ${p.label} (${p.modelId})${tier}${primary}`);
}
console.log(`  GIFs : ${isKlipyAvailable() ? "Klipy connected" : "disabled (set KLIPY_API_KEY)"}`);
console.log(`  DB: ${process.env.ANE_DB_PATH ?? "ane_kernel.sqlite"}\n`);

// Embed any observations that predate this server version in the background.
// Non-blocking: server is already listening when this begins.
void runEmbeddingBackfill().catch((err: unknown) => {
  console.warn("[startup] Embedding backfill error:", (err as Error).message);
});

export default {
  port: PORT,
  fetch: app.fetch,
};
