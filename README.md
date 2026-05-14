# ANE — Autonomous Node Entity

A local-first digital companion PWA. Feels native on iOS, adapts to Android and desktop. Hybrid intelligence: fast local signal processing with Claude API escalation for complex queries.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Backend | Hono (Bun HTTP) |
| Local DB | bun:sqlite (WAL mode) |
| Frontend | Vite + React 19 |
| UI Components | Konsta UI v5 (iOS 26 / Material 2025) |
| Styling | Tailwind CSS v4 |
| PWA | vite-plugin-pwa + Workbox |
| Intelligence | Local weighted scoring + Claude API (hybrid) |

---

## Project Structure

```
ane-companion/
├── server/                     # Bun backend
│   └── src/
│       ├── types/core.ts       # All type definitions (NodeCore, SyncSignal, etc.)
│       ├── db/kernel.ts        # SQLite persistence layer (the "Kernel")
│       ├── engine/
│       │   ├── syncBridge.ts   # Local signal processing (fast path)
│       │   ├── claudeBridge.ts # Claude API escalation (complex queries)
│       │   └── pipeline.ts     # Main orchestration (interaction loop)
│       └── index.ts            # Hono HTTP server
│
└── client/                     # Vite React PWA
    └── src/
        ├── types/core.ts       # Client-side mirror of server types
        ├── hooks/
        │   ├── usePlatform.ts  # iOS/Android/desktop detection + safe areas
        │   └── useANE.ts       # State management + API client
        └── components/
            ├── AuraOrb.tsx     # Entity visual manifestation
            ├── MessageFeed.tsx # Conversation display
            ├── SyncInput.tsx   # iOS-native message input
            └── StatusBar.tsx   # Top navigation / status
```

---

## Setup

### Prerequisites
- Bun ≥ 1.1.0 (`curl -fsSL https://bun.sh/install | bash`)
- Node.js ≥ 20 (for Vite dev server, if needed)

### Install

```bash
# From project root
bun install

# Install workspace packages
cd server && bun install && cd ..
cd client && bun install && cd ..
```

### Configure

```bash
cd server
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

If `ANTHROPIC_API_KEY` is absent or empty, the entity runs in **local-only mode** — all signal processing is on-device. The Claude escalation path is simply skipped.

### Run (development)

```bash
# From project root — starts both server and client concurrently
bun run dev

# Or individually:
cd server && bun run dev     # http://localhost:3001
cd client && bun run dev     # http://localhost:5173
```

### Build (production)

```bash
bun run build

# Serve the built client:
cd client && bun run preview
```

### Install as PWA (iOS)

1. Open `http://localhost:5173` in Safari
2. Tap the Share button → "Add to Home Screen"
3. The app launches in standalone mode with proper safe areas

---

## Architecture Notes

### The Hybrid Intelligence Model

Every interaction goes through this pipeline:

```
User Input
    ↓
Local SyncBridge (always runs — <1ms)
    ↓
Confidence ≥ 0.75? ──YES──→ Local response generated
    ↓ NO
Claude API Escalation
    ↓
Refined signal merged back
    ↓
NodeCore updated + logged to SQLite
    ↓
Response returned to client
```

**Goal:** >80% of interactions handled locally. Claude is reserved for genuine ambiguity, complex emotional states, and deep synthesis.

### Resilience Decay (X-Antibody mechanic)

The entity's `traits.resilience` decays at **0.5 points/hour** of inactivity and replenishes **+2 points per interaction**. This means:

- Consistent daily use keeps resilience at 80–100
- A week of inactivity drops it to ~60
- Two weeks of complete inactivity: ~40 (degraded state, entity acknowledges this)
- The entity does NOT silently maintain capability without engagement

### Tier Promotion Gates

| Tier | Interaction Count | Sync Score Required |
|---|---|---|
| nascent | 0 | — |
| apprentice | ≥ 10 | ≥ 0.50 |
| adept | ≥ 50 | ≥ 0.65 |
| sovereign | ≥ 200 | ≥ 0.80 |
| apex | ≥ 1000 | ≥ 0.90 |

Tiers cannot be forced. They require **both** sustained interaction volume AND quality (sync score). Sync score only grows through substantive, high-confidence interactions.

### Memory Anchors

Significant moments are stored as `MemoryAnchors` — a relational checkpoint layer that persists across session resets. These are included in Claude API prompts so the entity maintains continuity of character. Triggers:

- Tier promotions (always create an anchor)
- High-significance Claude-escalated interactions
- Sync score peaks

---

## Extending the System

### Adding new affect states
1. Add to `AffectState` union in `server/src/types/core.ts` AND `client/src/types/core.ts`
2. Add entry to `AFFECT_META` in `client/src/types/core.ts`
3. Add CSS variables `--aura-{state}` and `--glow-{state}` in `client/src/index.css`
4. Add lexicon entries that map to the new state in `server/src/engine/syncBridge.ts`

### Adding new lexicon terms
Edit `LEXICON` in `server/src/engine/syncBridge.ts`. Each entry needs:
- `arousalDelta`: how much it shifts arousal from the 5-midpoint baseline
- `valence`: `positive | negative | neutral`
- `affectHint`: which AffectState this term suggests
- `eqDomain`: which Goleman domain this targets
- `weight`: confidence contribution (0.0–1.0)

### Replacing Claude with a local LLM
In `server/src/engine/claudeBridge.ts`, replace the `fetch()` call to `CLAUDE_API_URL` with a call to your local Ollama/llama.cpp endpoint. The prompt structure and response parsing remain the same.

### Adding a voice interface
The `useANE` hook's `sendMessage` function accepts any string. Wire it to the Web Speech API's `SpeechRecognition` for voice input, and `SpeechSynthesis` for entity voice output.

---

## API Reference

### `POST /api/interact`

Request:
```json
{
  "sessionId": "uuid",
  "userInput": "I'm feeling overwhelmed by this deadline",
  "currentCore": { ...NodeCore }
}
```

Response:
```json
{
  "updatedCore": { ...NodeCore },
  "signal": { ...SyncSignal },
  "entityResponse": "Your system is running hot...",
  "affectState": "grounding",
  "usedClaudeApi": true,
  "shouldCreateAnchor": false
}
```

### `GET /api/core/:id`
Returns the stored NodeCore for a given entity ID.

### `GET /api/patterns/:id`
Returns hourly arousal patterns from the last 30 days.

### `GET /api/health`
Returns `{ status, claudeApiAvailable, timestamp }`.

---

## License

MIT — build freely, keep the data local.
