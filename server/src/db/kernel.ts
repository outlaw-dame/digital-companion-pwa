/**
 * ANE Database Layer — Local-First Persistent Store
 *
 * Architecture:
 *   This is the "Kernel" — the ground truth store, separate from the governance
 *   layer (the processing engine). It has restricted write access; only the
 *   processInteraction pipeline may write observations. The NodeCore (identity)
 *   is stored separately from the observation log (event history).
 *
 * Uses Bun's native bun:sqlite — zero dependencies, zero network calls.
 * All sensitive emotional/behavioral data stays on-device.
 */

import { Database } from "bun:sqlite";
import type {
  NodeCore,
  ObservationRecord,
  MemoryAnchor,
  CapabilityTier,
  FeedContent,
  FeedItem,
  LinkedEntity,
} from "../types/core";
import {
  RESILIENCE_DECAY_PER_HOUR,
  RESILIENCE_MIN,
} from "../types/core";

// ─── Database Initialization ──────────────────────────────────────────────────

const DB_PATH = process.env.ANE_DB_PATH ?? "ane_kernel.sqlite";

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;

  _db = new Database(DB_PATH, { create: true });

  // Enable WAL mode for better concurrent read performance
  _db.exec("PRAGMA journal_mode = WAL;");
  _db.exec("PRAGMA foreign_keys = ON;");
  _db.exec("PRAGMA synchronous = NORMAL;");

  initSchema(_db);
  return _db;
}

function initSchema(db: Database): void {
  // NodeCore: the entity's identity and behavioral policy state
  db.exec(`
    CREATE TABLE IF NOT EXISTS node_core (
      id TEXT PRIMARY KEY,
      designation TEXT NOT NULL,
      attribute TEXT NOT NULL,
      tier TEXT NOT NULL DEFAULT 'nascent',
      trait_intelligence INTEGER NOT NULL DEFAULT 90,
      trait_empathy INTEGER NOT NULL DEFAULT 95,
      trait_accuracy INTEGER NOT NULL DEFAULT 95,
      trait_loyalty INTEGER NOT NULL DEFAULT 98,
      trait_resilience REAL NOT NULL DEFAULT 80.0,
      current_affect TEXT NOT NULL DEFAULT 'observing',
      sync_score REAL NOT NULL DEFAULT 0.5,
      interaction_count INTEGER NOT NULL DEFAULT 0,
      last_interaction TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Memory anchors: significant relational checkpoints
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_anchors (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL REFERENCES node_core(id) ON DELETE CASCADE,
      timestamp TEXT NOT NULL,
      summary TEXT NOT NULL,
      emotional_weight REAL NOT NULL DEFAULT 0.5,
      capability_tier_at_time TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Observation log: every interaction, timestamped and classified
  db.exec(`
    CREATE TABLE IF NOT EXISTS observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      timestamp TEXT NOT NULL,
      session_id TEXT NOT NULL,
      user_input TEXT NOT NULL,
      entity_response TEXT NOT NULL DEFAULT '',
      arousal_level INTEGER NOT NULL,
      valence TEXT NOT NULL,
      affect_state TEXT NOT NULL,
      eq_domain_targeted TEXT NOT NULL,
      capability_tier_at_time TEXT NOT NULL,
      sync_score REAL NOT NULL,
      companion_response_state TEXT NOT NULL,
      used_claude_api INTEGER NOT NULL DEFAULT 0,
      response_latency_ms INTEGER NOT NULL DEFAULT 0,
      node_id TEXT NOT NULL REFERENCES node_core(id) ON DELETE CASCADE
    )
  `);

  // Feed cache: short-lived cache of parsed feed content keyed by URL
  db.exec(`
    CREATE TABLE IF NOT EXISTS feed_cache (
      url TEXT PRIMARY KEY,
      feed_title TEXT,
      feed_format TEXT NOT NULL,
      feed_description TEXT,
      site_url TEXT,
      items_json TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )
  `);

  // Entity cache: knowledge-base lookups keyed by lower-cased surface form
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity_cache (
      surface_form TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT,
      wikidata_uri TEXT,
      dbpedia_uri TEXT,
      entity_type TEXT,
      fetched_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )
  `);

  // Migrations for existing databases (try-catch for portability)
  for (const migration of [
    `ALTER TABLE observations ADD COLUMN entity_response TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE observations ADD COLUMN parent_id INTEGER`,
  ]) {
    try { db.exec(migration); } catch { /* column exists — skip */ }
  }

  // Indexes for temporal queries and thread traversal
  db.exec(`CREATE INDEX IF NOT EXISTS idx_observations_timestamp ON observations(node_id, timestamp)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_observations_session ON observations(session_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_observations_parent ON observations(parent_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_entity_cache_expires ON entity_cache(expires_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_feed_cache_expires ON feed_cache(expires_at)`);
}

// ─── NodeCore CRUD ────────────────────────────────────────────────────────────

export function getNodeCore(id: string): NodeCore | null {
  const db = getDb();
  const row = db
    .query(`SELECT * FROM node_core WHERE id = ?`)
    .get(id) as Record<string, unknown> | null;

  if (!row) return null;

  const anchors = getMemoryAnchors(id);

  return deserializeCore(row, anchors);
}

export function getOrCreateNodeCore(id: string, designation: string): NodeCore {
  const existing = getNodeCore(id);
  if (existing) return applyResilienceDecay(existing);

  const db = getDb();
  db.query(`
    INSERT INTO node_core (id, designation, attribute, tier)
    VALUES (?, ?, 'sentinel', 'nascent')
  `).run(id, designation);

  return getNodeCore(id)!;
}

// Valid enum values — used to guard writes against corrupted or malicious input.
const VALID_ATTRIBUTES  = new Set(["sentinel", "arbiter", "catalyst"]);
const VALID_TIERS       = new Set(["nascent", "apprentice", "adept", "sovereign", "apex"]);
const VALID_AFFECTS     = new Set([
  "observing", "resonating", "grounding", "activating",
  "analyzing", "synchronizing", "dormant",
]);

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

export function updateNodeCore(core: NodeCore): void {
  const db = getDb();

  // Clamp numeric fields to valid ranges and validate enums before writing.
  // Prevents corrupted or attacker-supplied NodeCore from poisoning the DB.
  const attribute     = VALID_ATTRIBUTES.has(core.attribute)     ? core.attribute     : "arbiter";
  const tier          = VALID_TIERS.has(core.tier)               ? core.tier          : "nascent";
  const currentAffect = VALID_AFFECTS.has(core.currentAffect)    ? core.currentAffect : "observing";

  db.query(`
    UPDATE node_core SET
      designation = ?,
      attribute = ?,
      tier = ?,
      trait_intelligence = ?,
      trait_empathy = ?,
      trait_accuracy = ?,
      trait_loyalty = ?,
      trait_resilience = ?,
      current_affect = ?,
      sync_score = ?,
      interaction_count = ?,
      last_interaction = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    core.designation.slice(0, 64),
    attribute,
    tier,
    clamp(core.traits.intelligence, 0, 100),
    clamp(core.traits.empathy,      0, 100),
    clamp(core.traits.accuracy,     0, 100),
    clamp(core.traits.loyalty,      0, 100),
    clamp(core.traits.resilience,   0, 100),
    currentAffect,
    clamp(core.syncScore,           0, 1),
    Math.max(0, Math.floor(core.interactionCount)),
    core.lastInteraction,
    core.id,
  );
}

// ─── Observation Log ──────────────────────────────────────────────────────────

export function logObservation(
  nodeId: string,
  record: Omit<ObservationRecord, "id">,
): number {
  const db = getDb();
  const result = db.query(`
    INSERT INTO observations (
      parent_id, timestamp, session_id, user_input, entity_response, arousal_level,
      valence, affect_state, eq_domain_targeted, capability_tier_at_time,
      sync_score, companion_response_state, used_claude_api,
      response_latency_ms, node_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.parent_id ?? null,
    record.timestamp,
    record.session_id,
    record.user_input,
    record.entity_response,
    record.arousal_level,
    record.valence,
    record.affect_state,
    record.eq_domain_targeted,
    record.capability_tier_at_time,
    record.sync_score,
    record.companion_response_state,
    record.used_claude_api ? 1 : 0,
    record.response_latency_ms,
    nodeId,
  );
  return Number(result.lastInsertRowid);
}

// ─── Observation Deletion ─────────────────────────────────────────────────────

export interface ObservationSummary {
  id: number;
  user_input: string;
  entity_response: string;
  node_id: string;
}

/**
 * Returns the most recent observation for a node.
 * Used by the "delete this" verbal command to identify what to delete.
 */
export function getLastObservation(nodeId: string): ObservationSummary | null {
  const db = getDb();
  return (db.query(`
    SELECT id, user_input, entity_response, node_id FROM observations
    WHERE node_id = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(nodeId) as ObservationSummary | null);
}

/**
 * Fetches a single observation by ID with ownership verification.
 * Returns null if not found or if nodeId doesn't match — prevents cross-node access.
 */
export function getObservation(id: number, nodeId: string): ObservationSummary | null {
  const db = getDb();
  return (db.query(`
    SELECT id, user_input, entity_response, node_id FROM observations
    WHERE id = ? AND node_id = ?
  `).get(id, nodeId) as ObservationSummary | null);
}

/**
 * Hard-deletes an observation. Ownership-checked: nodeId must match.
 * Returns true if a row was deleted, false if not found or ownership mismatch.
 */
export function deleteObservation(id: number, nodeId: string): boolean {
  const db = getDb();
  const result = db.query(`
    DELETE FROM observations WHERE id = ? AND node_id = ?
  `).run(id, nodeId);
  return result.changes > 0;
}

/**
 * Hard-deletes a memory anchor. Ownership-checked: nodeId must match.
 * Returns true if a row was deleted, false if not found or ownership mismatch.
 */
export function deleteMemoryAnchor(anchorId: string, nodeId: string): boolean {
  const db = getDb();
  const result = db.query(`
    DELETE FROM memory_anchors WHERE id = ? AND node_id = ?
  `).run(anchorId, nodeId);
  return result.changes > 0;
}

// ─── Conversation Retrieval ───────────────────────────────────────────────────
// Reads recent turns from the local SQLite store.
// This is the ONLY source of conversation history for provider prompts —
// the client never sends conversation data to the server.

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export function getRecentConversation(
  nodeId: string,
  limit = 3,            // number of exchanges (each = 1 user + 1 assistant turn)
): ConversationTurn[] {
  const db = getDb();
  const rows = db.query(`
    SELECT user_input, entity_response FROM observations
    WHERE node_id = ?
      AND entity_response != ''
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(nodeId, limit) as { user_input: string; entity_response: string }[];

  // Rows come back newest-first; reverse to chronological before flattening
  return rows
    .reverse()
    .flatMap((r) => [
      { role: "user" as const,      content: r.user_input.slice(0, 500) },
      { role: "assistant" as const, content: r.entity_response.slice(0, 500) },
    ]);
}

/**
 * Returns the conversation chain for a threaded reply, walking up parent_id
 * links using a recursive CTE. Returns turns in chronological order.
 * Used instead of getRecentConversation when a reply targets a specific thread.
 */
export function getThreadContext(
  parentObservationId: number,
  limit = 5,
): ConversationTurn[] {
  const db = getDb();
  // Walk from parentObservationId upward through parent_id links
  const rows = db.query(`
    WITH RECURSIVE chain AS (
      SELECT id, user_input, entity_response, parent_id, 1 AS depth
      FROM observations WHERE id = ?
      UNION ALL
      SELECT o.id, o.user_input, o.entity_response, o.parent_id, c.depth + 1
      FROM observations o
      INNER JOIN chain c ON o.id = c.parent_id
      WHERE c.parent_id IS NOT NULL AND c.depth < ?
    )
    SELECT id, user_input, entity_response FROM chain ORDER BY id ASC
  `).all(parentObservationId, limit) as {
    id: number;
    user_input: string;
    entity_response: string;
  }[];

  return rows.flatMap((r) => [
    { role: "user" as const,      content: r.user_input.slice(0, 500) },
    { role: "assistant" as const, content: r.entity_response.slice(0, 500) },
  ]);
}

// ─── Feed Cache ────────────────────────────────────────────────────────────────

export function getFeedCache(url: string): FeedContent | null {
  const db = getDb();
  const row = db.query(`
    SELECT * FROM feed_cache WHERE url = ? AND expires_at > datetime('now')
  `).get(url) as Record<string, unknown> | null;
  if (!row) return null;
  try {
    return {
      url: row.url as string,
      format: row.feed_format as FeedContent["format"],
      title: row.feed_title as string | null,
      description: row.feed_description as string | null,
      siteUrl: row.site_url as string | null,
      items: JSON.parse(row.items_json as string) as FeedItem[],
      fetchedAt: row.fetched_at as string,
    };
  } catch {
    return null;
  }
}

export function upsertFeedCache(content: FeedContent, ttlSeconds = 1800): void {
  const db = getDb();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  db.query(`
    INSERT INTO feed_cache (url, feed_title, feed_format, feed_description, site_url, items_json, fetched_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(url) DO UPDATE SET
      feed_title=excluded.feed_title, feed_format=excluded.feed_format,
      feed_description=excluded.feed_description, site_url=excluded.site_url,
      items_json=excluded.items_json, fetched_at=excluded.fetched_at,
      expires_at=excluded.expires_at
  `).run(
    content.url,
    content.title,
    content.format,
    content.description,
    content.siteUrl,
    JSON.stringify(content.items),
    content.fetchedAt,
    expiresAt,
  );
}

export function evictExpiredFeedCache(): void {
  getDb().exec(`DELETE FROM feed_cache WHERE expires_at <= datetime('now')`);
}

// ─── Entity Cache ─────────────────────────────────────────────────────────────

export function getEntityCache(surfaceForm: string): LinkedEntity | null {
  const db = getDb();
  const row = db.query(`
    SELECT * FROM entity_cache
    WHERE surface_form = ? AND expires_at > datetime('now')
  `).get(surfaceForm.toLowerCase()) as Record<string, unknown> | null;
  if (!row) return null;
  return {
    surface: surfaceForm,
    label: row.label as string,
    description: row.description as string | null,
    wikidataUri: row.wikidata_uri as string | null,
    dbpediaUri: row.dbpedia_uri as string | null,
    entityType: row.entity_type as string | null,
  };
}

export function upsertEntityCache(entity: LinkedEntity, ttlSeconds = 604_800): void {
  const db = getDb();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  db.query(`
    INSERT INTO entity_cache (surface_form, label, description, wikidata_uri, dbpedia_uri, entity_type, fetched_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
    ON CONFLICT(surface_form) DO UPDATE SET
      label=excluded.label, description=excluded.description,
      wikidata_uri=excluded.wikidata_uri, dbpedia_uri=excluded.dbpedia_uri,
      entity_type=excluded.entity_type, fetched_at=excluded.fetched_at,
      expires_at=excluded.expires_at
  `).run(
    entity.surface.toLowerCase(),
    entity.label,
    entity.description,
    entity.wikidataUri,
    entity.dbpediaUri,
    entity.entityType,
    expiresAt,
  );
}

export function evictExpiredEntityCache(): void {
  getDb().exec(`DELETE FROM entity_cache WHERE expires_at <= datetime('now')`);
}

// ─── Pattern Queries ──────────────────────────────────────────────────────────
// These feed the longitudinal awareness the entity uses for proactive insight.

export interface ArousalPattern {
  hour: number;
  avg_arousal: number;
  sample_count: number;
}

export function getArousalPatterns(nodeId: string): ArousalPattern[] {
  const db = getDb();
  return db.query(`
    SELECT
      CAST(strftime('%H', timestamp) AS INTEGER) as hour,
      ROUND(AVG(arousal_level), 2) as avg_arousal,
      COUNT(*) as sample_count
    FROM observations
    WHERE node_id = ?
      AND timestamp > datetime('now', '-30 days')
    GROUP BY hour
    ORDER BY hour
  `).all(nodeId) as ArousalPattern[];
}

export function getRecentObservations(
  nodeId: string,
  limit = 10,
): ObservationRecord[] {
  const db = getDb();
  return db.query(`
    SELECT * FROM observations
    WHERE node_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(nodeId, limit) as ObservationRecord[];
}

// ─── Memory Anchors ───────────────────────────────────────────────────────────

export function addMemoryAnchor(nodeId: string, anchor: MemoryAnchor): void {
  const db = getDb();
  db.query(`
    INSERT INTO memory_anchors (
      id, node_id, timestamp, summary, emotional_weight,
      capability_tier_at_time, trigger_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    anchor.id,
    nodeId,
    anchor.timestamp,
    anchor.summary,
    anchor.emotionalWeight,
    anchor.capabilityTierAtTime,
    anchor.triggerType,
  );
}

function getMemoryAnchors(nodeId: string): MemoryAnchor[] {
  const db = getDb();
  const rows = db.query(`
    SELECT * FROM memory_anchors WHERE node_id = ?
    ORDER BY emotional_weight DESC
    LIMIT 20
  `).all(nodeId) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    timestamp: r.timestamp as string,
    summary: r.summary as string,
    emotionalWeight: r.emotional_weight as number,
    capabilityTierAtTime: r.capability_tier_at_time as CapabilityTier,
    triggerType: r.trigger_type as MemoryAnchor["triggerType"],
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deserializeCore(
  row: Record<string, unknown>,
  anchors: MemoryAnchor[],
): NodeCore {
  return {
    id: row.id as string,
    designation: row.designation as string,
    attribute: row.attribute as NodeCore["attribute"],
    tier: row.tier as CapabilityTier,
    traits: {
      intelligence: row.trait_intelligence as number,
      empathy: row.trait_empathy as number,
      accuracy: row.trait_accuracy as number,
      loyalty: row.trait_loyalty as number,
      resilience: row.trait_resilience as number,
    },
    currentAffect: row.current_affect as NodeCore["currentAffect"],
    syncScore: row.sync_score as number,
    interactionCount: row.interaction_count as number,
    lastInteraction: row.last_interaction as string | null,
    memoryAnchors: anchors,
  };
}

// ─── Test Injection ───────────────────────────────────────────────────────────
// Allows tests to inject an in-memory database without touching the real store.
// NEVER call this from production code.

export function __setTestDb(db: Database): void {
  _db = db;
  initSchema(db);
}

/**
 * Applies resilience decay based on elapsed time since last interaction.
 * This is the X-Antibody decay mechanic: capability is not permanent.
 * It degrades without use and must be maintained through continued engagement.
 */
function applyResilienceDecay(core: NodeCore): NodeCore {
  if (!core.lastInteraction) return core;

  const lastMs = new Date(core.lastInteraction).getTime();
  const nowMs = Date.now();
  const hoursElapsed = (nowMs - lastMs) / (1000 * 60 * 60);

  const decayed = Math.max(
    RESILIENCE_MIN,
    core.traits.resilience - hoursElapsed * RESILIENCE_DECAY_PER_HOUR,
  );

  if (decayed === core.traits.resilience) return core;

  return {
    ...core,
    traits: { ...core.traits, resilience: decayed },
  };
}
