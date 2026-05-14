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
  TIER_THRESHOLDS,
} from "../types/core";
import {
  RESILIENCE_DECAY_PER_HOUR,
  RESILIENCE_MAX,
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
      timestamp TEXT NOT NULL,
      session_id TEXT NOT NULL,
      user_input TEXT NOT NULL,
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

  // Index for temporal queries (pattern detection over time)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_observations_timestamp
    ON observations(node_id, timestamp);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_observations_session
    ON observations(session_id);
  `);
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

export function updateNodeCore(core: NodeCore): void {
  const db = getDb();
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
    core.designation,
    core.attribute,
    core.tier,
    core.traits.intelligence,
    core.traits.empathy,
    core.traits.accuracy,
    core.traits.loyalty,
    core.traits.resilience,
    core.currentAffect,
    core.syncScore,
    core.interactionCount,
    core.lastInteraction,
    core.id,
  );
}

// ─── Observation Log ──────────────────────────────────────────────────────────

export function logObservation(
  nodeId: string,
  record: Omit<ObservationRecord, "id">,
): void {
  const db = getDb();
  db.query(`
    INSERT INTO observations (
      timestamp, session_id, user_input, arousal_level, valence,
      affect_state, eq_domain_targeted, capability_tier_at_time,
      sync_score, companion_response_state, used_claude_api,
      response_latency_ms, node_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.timestamp,
    record.session_id,
    record.user_input,
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

  const updated = {
    ...core,
    traits: { ...core.traits, resilience: decayed },
  };

  updateNodeCore(updated);
  return updated;
}
