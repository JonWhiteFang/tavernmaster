# TavernMaster — Agent Guide

TavernMaster is a **macOS-only** desktop app (Tauri + React/TypeScript) for a **solo, AI-guided D&D campaign**.
The player controls **exactly one** party member. The AI runs everything else (DMing, companions, enemies, bookkeeping).

**North star:** campaigns that feel real over **months/years**. Continuity and recoverability are priority #1.

---

## Plans index (start here)

The canonical build plan lives in `docs/plans/`.

### Execute in order (end-to-end “complete app”)

1. `docs/plans/00_IMPLEMENTATION_PLANS_README.md`
2. `docs/plans/01_FOUNDATION_PERSISTENCE_SECURITY_TESTS.md`
3. `docs/plans/02_CONTINUITY_TURN_ENGINE_CANON_MEMORY.md`
4. `docs/plans/03_AI_GUARDRAILS_PLAYER_UX_COMBAT_SYNC.md`

### PR-sized execution breakdown (preferred for implementation)

1. `docs/plans/09_PR_SIZED_PLANS_README.md`
2. `docs/plans/10_PR_PLAN_FOUNDATION.md` (PR-001 → PR-006)
3. `docs/plans/11_PR_PLAN_CONTINUITY.md` (PR-007 → PR-012)
4. `docs/plans/12_PR_PLAN_AI_UX.md` (PR-013 → PR-019)
5. `docs/plans/13_PR_PLAN_COMBAT_SRD_SYNC_RELEASE.md` (PR-020 → PR-026)

---

## How to work (Kiro workflow)

### Default approach

- Prefer **small, sequential PRs** (follow the PR plan documents).
- After completing a task from `docs/plans/*`, **check it off in the plan** in the same PR so work isn’t duplicated.
- Make changes **reversible** and **test-backed**.
- Prefer **additive** schema changes + migrations over refactors that risk data loss.
- Keep advanced/dev tools, but hide them behind **Developer Mode** in the UI.

### Clarifying questions

Ask questions only when they are truly blocking or high-risk (data loss/security). Otherwise:

- state assumptions explicitly
- proceed with the safest reversible approach
- add tests and a rollback path

**Hard stop questions are allowed only for:**

- destructive migrations / data deletion
- secrets / auth / crypto changes that could lock users out
- external integrations that require credentials not present

---

## Project structure (high level)

- `src/`: React entry point and UI code.
- `src/app/`: screens, layout, reusable UI, AI integration, rules, sync, shared state.
- `src/app/data/`: SQLite access + schema + DAOs.
- `src-tauri/`: Rust host (Tauri) + native commands (crypto/keychain/etc).
- `docs/`: architecture notes, runtime, sync, guides, plans.
- `scripts/`: SRD generation/verification and utilities.

---

## Build / test commands (required gates)

Install:

- `npm install`

Frontend:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run format:check`

Desktop (Tauri):

- `npm run tauri:dev`
- `npm run tauri:build`

Rust (recommended when touching `src-tauri/`):

- `cd src-tauri && cargo fmt`
- `cd src-tauri && cargo clippy`

SRD:

- `npm run srd:generate`
- `npm run srd:verify`

**Quality gate:** PRs should pass `lint`, `test`, and `format:check`.  
If SRD data or import changes, `srd:verify` must pass.

---

## Campaign continuity rules (non-negotiable)

### Persistence & migrations

- Use **versioned migrations** (`PRAGMA user_version`) — no “silent” schema drift.
- Any migration must:
  - create an automatic DB backup first
  - be idempotent
  - have a tested rollback path (restore backup) if it fails

### Transactional state updates

Anything that affects long-term continuity must be applied in **one transaction**:

- append a Turn
- save a snapshot
- update campaign state
- upsert canon facts/quests

### Canon vs context

- Separate **long-term canon** (facts, NPCs, quests, locations) from **recent context** (last N turns).
- Avoid prompt bloat: always bound the amount of history sent to the model.

### Recovery

The app must support:

- Undo last turn (non-destructive)
- Branch from a prior turn
- Retcon notes (explicit canon corrections)

---

## AI safety/consistency rules (app integrity)

- Never apply AI output without **schema validation** (zod).
- No semantic “repair” of invalid JSON in the main play loop.
  - Retry with stricter prompting; if still invalid, fail safely with a retry UI.
- Apply state patches only after validating game invariants (HP bounds, quest states, etc.).
- Preserve raw AI output in developer diagnostics, but keep it out of the default player path.

---

## Security & secrets

- Do not commit secrets. Use `.env` (see `.env.example`).
- Treat Supabase auth/session and any API keys as secrets.
- Do not log secrets or full decrypted content.
- Prefer key material stored in:
  - OS keychain as cache
  - durable **Vault passphrase wrapped key** for cross-device restore (see plans)

---

## UI principles (player-first)

Default Play View must show only:

1. Current Scene (short)
2. Immediate Choices (3–7 + custom)
3. Your Character status (at a glance)
4. Collapsible Timeline (“what just happened”)

Everything else is progressive disclosure:

- Details expanders
- DM Notes panel
- Combat details toggle
- Developer Mode for logs/prompt inspection

---

## Commit / PR conventions

- Commit changes in **incremental, logical steps**:
  - keep each commit focused (one cohesive change)
  - avoid “mega-commits” that mix migrations, UI, and refactors unless unavoidable
  - ensure the app builds/tests between major steps
- When a plan task is completed, **update the corresponding plan file** in `docs/plans/`:
  - check off completed checklist items
  - note any deviations with a short rationale

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`.
- PR description should include:
  - what changed
  - how to test
  - risks/rollback (especially for migrations)
  - screenshots for UI changes
