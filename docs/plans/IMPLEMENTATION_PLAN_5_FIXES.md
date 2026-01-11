# TavernMaster — Issue Fixes Implementation Plan (Comprehensive)

## ✅ STATUS: COMPLETE

**All PRs Completed:** 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1
**Deferred:** PR 11.2 (Map Studio persistence), PR 11.3 (Streaming UX)

---

This plan turns the repo shortfalls/issues into a sequenced, PR-by-PR implementation roadmap. It prioritizes **data correctness and sync integrity first**, then UI correctness, then performance/security improvements.

Repo paths referenced below match the current codebase under `src/app/*` and `supabase/migrations/*`.

---

## Guiding principles

1. **Sync correctness beats convenience**  
   Prefer soft-deletes and deterministic `created_at/updated_at` semantics over “quick” hard deletes.

2. **Schema parity is non-negotiable**  
   Local SQLite schema and Supabase schema must match for every synced table/column.

3. **Make every change testable**  
   Add/extend unit tests for data-layer behavior and sync edge cases alongside each PR.

4. **Minimize breaking UI changes**  
   When adding new fields (e.g., `updatedAt` on Encounter), prefer additive changes and gradual adoption.

---

## Phase 0 — Baseline & safety net (PR 0)

### PR 0.1 — Add regression tests for the identified failure modes

**Goal:** lock in current behavior and ensure fixes don’t regress.

**Add tests (Vitest):**

- `src/app/data/encounters.test.ts`
  - `updateEncounterTurn` should preserve `created_at` in the enqueued sync payload.
  - `saveInitiativeOrder` should not “resurrect” stale initiative entries after a simulated pull (see Phase 2).
- `src/app/sync/client.test.ts`
  - ensure overlapping `pushOnce/pullOnce` do not run concurrently after locks are added (Phase 5).
- Extend existing tests where appropriate:
  - `src/app/data/action_proposals.test.ts` to include `payload_json` presence assumptions and guard schema parity.

**Acceptance criteria**

- Tests fail on current main branch for the known issues (where applicable), then pass once fixed.
- CI/local test command runs green.

---

## Phase 1 — Schema parity (critical) (PR 1) ✅

### PR 1.1 — Add `payload_json` column to Supabase `action_proposals` ✅

**Why:** App code upserts `payload_json` but Supabase table is missing it.

**Files**

- `supabase/migrations/20260106160000_schema_mirror.sql`
  - Add `payload_json text` to `public.action_proposals`.

**Also update local “fresh install” schema**

- `src/app/data/schema.ts`
  - Add `payload_json TEXT` to `CREATE TABLE IF NOT EXISTS action_proposals (...)`.
  - Keep `initDatabase()`’s `ensureColumn(..., "payload_json")` as an upgrade safety net.

**Acceptance criteria**

- Supabase table `action_proposals` has `payload_json`.
- Creating proposals with payload syncs without Supabase errors.
- Local DB new installs contain `payload_json` without needing an ALTER.

---

## Phase 2 — Initiative deletions must sync (PR 2) ✅

### PR 2.1 — Convert `saveInitiativeOrder` from hard-delete to soft-delete + sync ✅

**Why:** hard-deleting local `initiative_entries` doesn’t enqueue anything, so remote accumulates stale rows and pulls can reintroduce old state.

**Implementation**

- In `src/app/data/encounters.ts`:
  - Replace:
    - `DELETE FROM initiative_entries WHERE encounter_id = ?`
  - With:
    - `UPDATE initiative_entries SET deleted_at = ?, updated_at = ? WHERE encounter_id = ? AND deleted_at IS NULL`
  - For each affected row (or via a follow-up query), enqueue an upsert for the deleted row so remote receives the tombstone.

**Recommended helper**

- Add helper function in `src/app/data/encounters.ts` or a small shared module:
  - `softDeleteInitiativeEntries(encounterId, now)` returning deleted row ids.

**Update encounter list queries to ignore soft-deleted initiative entries**

- In `listEncounters()`:
  - initiative query should include `AND deleted_at IS NULL`
- Same in `getEncounter()`.

**Acceptance criteria**

- Re-ordering initiative correctly removes previous remote rows by setting `deleted_at`.
- Pull after push does not resurrect old initiative rows.
- Unit test covers: reorder → push → pull → initiative list matches expected.

---

## Phase 3 — Preserve `created_at` on encounter updates (PR 3) ✅

### PR 3.1 — Fix `updateEncounterTurn` to keep original `created_at` ✅

**Why:** currently `created_at` is set to `now` during a turn update, corrupting the remote record history.

**Implementation**

- In `src/app/data/encounters.ts`, change the “Get full row for sync” query to also select `created_at` and `updated_at`:
  - `SELECT ..., created_at, updated_at FROM encounters WHERE id = ?`
- Use the row’s `created_at` when enqueueing upsert (not `now`).

**Acceptance criteria**

- `created_at` remains stable across updates.
- `updated_at` changes.
- Test verifies sync payload uses original `created_at`.

---

## Phase 4 — Make soft-deletes consistently respected (PR 4) ✅

### PR 4.1 — Add `deleted_at IS NULL` filters to user-facing list queries ✅

**Why:** several list queries ignore soft delete, so deleted rows can still appear (especially after sync pulls).

**Target files**

- `src/app/data/campaigns.ts`
  - Add `WHERE deleted_at IS NULL`
- `src/app/data/sessions.ts`
  - Add `AND deleted_at IS NULL` to `listSessions`
  - Ensure any update queries don’t accidentally “revive” rows (keep `deleted_at` intact).
- `src/app/data/journal.ts`
  - Add `AND deleted_at IS NULL` to `listJournalEntries`
- `src/app/data/encounters.ts`
  - Add `AND deleted_at IS NULL` to `listEncounters`
  - Ensure joined condition queries exclude soft-deleted rows:
    - `encounter_conditions.deleted_at IS NULL`
    - `conditions.deleted_at IS NULL`
- `src/app/data/ai_logs.ts`
  - Add `WHERE deleted_at IS NULL` (and include it in clause logic)

**Acceptance criteria**

- Soft-deleted rows never appear in lists.
- Pulling remote tombstones does not show deleted records.

---

## Phase 5 — Prevent overlapping sync operations (PR 5) ✅

### PR 5.1 — Add push/pull mutual exclusion (mutex) in `sync/client.ts` ✅

**Why:** `setInterval(pullOnce)` and scheduled pushes can overlap. This can cause SQLite lock contention, incorrect status, and inconsistent last_pulled/last_pushed updates.

**Implementation (simple + robust)**

- In `src/app/sync/client.ts`:
  - Introduce promise-based locks:
    - `let pushPromise: Promise<boolean> | null = null;`
    - `let pullPromise: Promise<boolean> | null = null;`
  - `pushOnce()` returns the in-flight promise if already running.
  - `pullOnce()` returns the in-flight promise if already running.
  - Optional: if a pull fires while a push is in progress, await push before pulling (serialized sync).

**Status handling**

- Avoid status flicker:
  - Only set status to `syncing` when actually starting an operation (not when returning an in-flight promise).

**Acceptance criteria**

- Multiple calls to `schedulePush`, interval pull, and manual `syncNow()` do not run concurrently.
- Unit test demonstrates: fire `pushOnce` twice quickly → `pushPendingOps` called once.

---

## Phase 6 — Ensure encounters UI updates correctly (PR 6) ✅

### PR 6.1 — Fix `areEncountersEqual` so encounter list refreshes when details change ✅

**Why:** it currently compares only `id` and `campaignId`, so changes to round/turn/name/etc may not render.

**Two viable approaches (pick one):**

**Option A (recommended): add `updatedAt` to Encounter model**

- Update `src/app/data/types.ts`:
  - Add `createdAt: string; updatedAt: string;` to `Encounter`
- Update `src/app/data/encounters.ts`:
  - Select `created_at, updated_at` and include in `mapEncounter`.
- Update `src/app/state/AppContext.tsx`:
  - Update `areEncountersEqual` to compare `updatedAt` like campaigns/sessions.

**Option B: remove equality short-circuit for encounters**

- In `AppContext.tsx` always `setEncounters(data)`.

**Acceptance criteria**

- Encounter list updates after advancing the turn (round/activeTurnId changes).
- Encounter list updates after editing encounter metadata (if present).

---

## Phase 7 — Remove duplicate AI logging (PR 7) ✅

### PR 7.1 — Ensure Party proposals are logged exactly once ✅

**Why:** `getPartyProposals()` logs to `ai_logs`, and `usePartyProposals.generate()` logs again, duplicating entries.

**Recommended approach**

- Keep logging in the orchestrator (`src/app/ai/orchestrator.ts`) as the single source of truth.
- Remove the `insertAiLog` call in `src/app/hooks/usePartyProposals.ts`.

**Optional improvement (nice-to-have)**

- In orchestrator, log both:
  - `content`: raw model output (string)
  - `payload`: parsed and normalized payload (object) once parsing succeeds

**Acceptance criteria**

- Generating proposals creates a single `ai_logs` entry per generation.
- No change in user-visible behavior besides fewer log records.

---

## Phase 8 — Transactions + performance hardening (PR 8) ✅

### PR 8.1 — Add a lightweight transaction helper for SQLite writes ✅

**Why:** multi-step writes currently run without a transaction and sometimes in `Promise.all`, risking partial saves and lock contention.

**Implementation**

- Add helper in `src/app/data/db.ts`:
  - `withTransaction<T>(fn: (db: Database) => Promise<T>): Promise<T>`
  - Executes:
    - `BEGIN`
    - `COMMIT` on success
    - `ROLLBACK` on error

**Apply to**

- `src/app/data/characters.ts`
  - `createCharacter`
  - `updateCharacter`
  - Replace `Promise.all([...db.execute])` with sequential writes inside the transaction (or keep parallel if plugin supports it reliably, but sequential is safer).
- `src/app/data/srd.ts`
  - Wrap each table import in a transaction (or one transaction per table chunk).

**Acceptance criteria**

- Character create/update is atomic: failure mid-way doesn’t leave partial sub-rows.
- SRD import time reduces noticeably (transaction improves bulk insert).

---

## Phase 9 — Encryption semantics: don’t treat empty string as null (PR 9)

### PR 9.1 — Adjust `encryptValue` to only nullify `null/undefined` ✅

**Why:** `encryptValue("")` currently returns `null`. That can violate NOT NULL columns or cause unexpected data loss.

**Implementation**

- In `src/app/data/encryption.ts`:
  - Change:
    - `if (!value) return null;`
  - To:
    - `if (value === null || value === undefined) return null;`

**Call-site tightening (optional but recommended)**

- If you want “empty means null” semantics for optional fields:
  - In callers (campaign/session recap), convert `""` → `null` explicitly before encrypting.

**Acceptance criteria**

- Empty string values persist as empty strings (encrypted payload exists).
- Optional fields still behave as expected (either by explicit caller handling or allowing empty).

---

## Phase 10 — Security hardening for Supabase RLS (optional but recommended) (PR 10) ✅

> **This is a project decision point.** If TavernMaster is intended to ever support multiple users, the current policies (`using (true)`) are unsafe because any authenticated user can read/write everything.

### PR 10.1 — Introduce ownership + RLS enforcement ✅

**High-level approach**

- Add `user_id uuid not null` columns to all user-authored tables in Supabase.
- Default `user_id` to `auth.uid()` on insert.
- Update RLS policies to:
  - `USING (user_id = auth.uid())`
  - `WITH CHECK (user_id = auth.uid())`

**Handling existing rows**

- If this is applied early (no production data), simplest is to apply without backfill.
- If there is existing data, you need a one-time backfill strategy (manual mapping or service role script).

**Note on local schema**

- Local SQLite does not need `user_id` as long as Supabase sets it by default and keeps it on updates.

**Acceptance criteria**

- User A cannot read/write User B’s rows.
- Sync still works for a single user.

---

## Phase 11 — Product shortfalls / enhancements (optional roadmap)

These are not “bugs” but known limitations identified in the review.

### PR 11.1 — Campaign-scoped characters (bigger feature) ✅

**Problem:** `characters` are global; campaigns cannot have distinct party rosters.

**Sketch**

- Add `campaign_id` to characters and child tables (or create a join table).
- Update UI to show party per campaign.
- Data migration: assign existing characters to the active campaign or a default.

### PR 11.2 — Persist Map Studio state (currently stubbed) — DEFERRED

**Problem:** Map Studio uses local component state + localStorage counters, no DB persistence or sync.

**Sketch**

- Add tables:
  - `maps` (id, campaign_id, name, image_blob_ref or path, created_at, updated_at, deleted_at)
  - `map_tokens` (id, map_id, name, role, x, y, etc.)
- Store map images via a local file store and sync only metadata (or store in Supabase Storage).
- Wire Map Studio to load/save per campaign.

### PR 11.3 — Improve streaming UX for JSON outputs — DEFERRED

**Problem:** streaming JSON is hard to render incrementally.

**Sketch**

- Stream to a “raw output” panel while a “parsed view” updates once valid JSON is detected.
- Use incremental repair/parsing or show a structured preview once parse succeeds.

---

## Suggested execution order (recommended PR stacking)

1. PR 0.1 — Baseline tests
2. PR 1.1 — Schema parity (`payload_json` in Supabase + local create)
3. PR 2.1 — Initiative soft delete + sync tombstones
4. PR 3.1 — Preserve encounter `created_at`
5. PR 4.1 — Consistent `deleted_at` filtering
6. PR 5.1 — Sync mutex / serialization
7. PR 6.1 — Encounter list refresh correctness
8. PR 7.1 — Remove duplicate AI logging
9. PR 8.1 — Transactions + SRD import performance
10. PR 9.1 — Encryption semantics fix
11. PR 10+ / 11+ — Optional security + product roadmap items

---

## Definition of done

- No schema drift between local and Supabase for all synced tables/columns.
- Sync does not resurrect deleted initiative entries.
- Encounter updates preserve correct timestamps.
- Soft-deleted records never appear in UI lists.
- Sync operations never overlap.
- Encounter list UI always reflects updated encounter state.
- No duplicate AI logs per generation.
- Multi-step writes are transactional.
- Empty strings don’t get silently converted to null.
