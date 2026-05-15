// ─── Remember detection ───────────────────────────────────────────────────────

const REMEMBER_RE =
  /^\s*(?:remember|keep in mind|don(?:'|')t forget|make a note(?:\s+of)?|note that|save this)[:\s]+(.*)/i;

const REMEMBER_KEYWORD_RE = /^\s*remember[:\s]+/i;

// ─── Delete detection ─────────────────────────────────────────────────────────
// Intentionally narrow — only clear, unambiguous erasure commands.
// "delete my file" / "please forget to add milk" do NOT match because they
// include additional content after the pronoun; the anchoring $ prevents that.

const DELETE_RE =
  /^\s*(?:please\s+)?(?:delete|forget|remove|erase|clear)\s+(?:this|that|it|(?:my\s+)?last(?:\s+message)?)\s*[.!?]?\s*$/i;

const CONTROL_CHARS_RE = /[\x00-\x1f\x7f]/g;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemoryDetectionResult {
  isMemoryRequest: boolean;
  content: string | null;
}

export interface DeleteDetectionResult {
  isDeleteRequest: boolean;
}

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Detects explicit memory requests ("remember this", "remember that X", etc.).
 * Returns isMemoryRequest=false when the input is not a memory request at all.
 * Returns content=null when it IS a memory request but has no explicit content
 * (e.g. "remember this" with nothing after) — caller should anchor last context.
 * Returns content=string when explicit content is provided to anchor.
 */
export function detectExplicitMemoryRequest(input: string): MemoryDetectionResult {
  const trimmed = input.trim();
  const m = REMEMBER_RE.exec(trimmed);
  if (!m) return { isMemoryRequest: false, content: null };
  let captured = m[1];
  if (REMEMBER_KEYWORD_RE.test(trimmed)) {
    captured = captured.replace(/^(?:that|this)(?:\s+|$)/i, "");
  }
  const content = captured
    .replace(CONTROL_CHARS_RE, " ")
    .trim()
    .slice(0, 200);
  return { isMemoryRequest: true, content: content || null };
}

/**
 * Detects explicit delete/forget commands ("delete this", "forget that", etc.).
 * Narrow match — only pure erasure commands with no additional noun.
 * "delete my file" and "forget to buy milk" do NOT match.
 */
export function detectDeleteRequest(input: string): DeleteDetectionResult {
  return { isDeleteRequest: DELETE_RE.test(input.trim()) };
}
