/**
 * ANE Server — Hono HTTP API
 *
 * Endpoints:
 *   POST /api/interact       — Main interaction pipeline
 *   GET  /api/core/:id       — Fetch current NodeCore state
 *   GET  /api/patterns/:id   — Arousal patterns (longitudinal data)
 *   GET  /api/health         — Liveness check
 *
 * Runs on Bun, fully local. No external dependencies beyond Hono.
 * The Anthropic API key is read from environment; if absent, Claude
 * escalation is disabled and the entity runs purely locally.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { processInteraction } from "./engine/pipeline";
import { getNodeCore, getArousalPatterns } from "./db/kernel";
import type { InteractionRequest } from "./types/core";

const app = new Hono();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:4173", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/api/health", (c) => {
  return c.json({
    status: "operational",
    claudeApiAvailable: !!process.env.ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// ─── Interact ─────────────────────────────────────────────────────────────────

app.post("/api/interact", async (c) => {
  let body: InteractionRequest;

  try {
    body = await c.req.json<InteractionRequest>();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.userInput?.trim()) {
    return c.json({ error: "userInput is required" }, 400);
  }

  if (!body.currentCore?.id || !body.currentCore?.designation) {
    return c.json({ error: "currentCore.id and currentCore.designation are required" }, 400);
  }

  if (!body.sessionId) {
    return c.json({ error: "sessionId is required" }, 400);
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
  const { id } = c.req.param();
  const core = getNodeCore(id);

  if (!core) {
    return c.json({ error: "No entity found with that ID" }, 404);
  }

  return c.json(core);
});

// ─── Patterns ─────────────────────────────────────────────────────────────────

app.get("/api/patterns/:id", (c) => {
  const { id } = c.req.param();
  const patterns = getArousalPatterns(id);
  return c.json(patterns);
});

// ─── Server Bootstrap ─────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "3001", 10);

console.log(`\n  ANE Server`);
console.log(`  ──────────────────────────────`);
console.log(`  Listening on http://localhost:${PORT}`);
console.log(`  Claude API: ${process.env.ANTHROPIC_API_KEY ? "✓ active" : "✗ not configured (local-only mode)"}`);
console.log(`  DB: ${process.env.ANE_DB_PATH ?? "ane_kernel.sqlite"}\n`);

export default {
  port: PORT,
  fetch: app.fetch,
};
