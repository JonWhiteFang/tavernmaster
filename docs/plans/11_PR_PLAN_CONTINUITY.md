# 11 — PR Plan: Continuity Engine (Turns + Canon Memory + Recap + Recovery Tools)

**Covers:** Plan 02.  
**PRs:** PR-007 through PR-012.

---

## PR-007 — Introduce CampaignStateDoc (versioned) Stored in campaign_state

### Goal

Create a single authoritative state document to rehydrate play instantly.

### Files

- **Add** `src/app/engine/state/types.ts`
- **Add** `src/app/engine/state/store.ts`
- **Update** `src/app/data/campaign_state.ts` (create if missing)
- **Add** `src/app/engine/state/store.test.ts`

### Checklist

- [x] Define `CampaignStateDoc` zod schema with `version` and core sections:
  - scene, player summary, companions summary, quests, npcs, locations, inventory, flags, mode
- [x] Implement load/save functions:
  - [x] `loadCampaignState(campaignId)` with default initializer
  - [x] `saveCampaignState(campaignId, doc, { tx })`
- [x] Ensure encryption is used for any sensitive long-form text fields if stored separately.

### Tests

- [x] default doc creation
- [x] schema validation + roundtrip
- [x] save updates `updated_at` correctly

### Acceptance criteria

- A campaign has a `CampaignStateDoc` even before the first session begins.

---

## PR-008 — Add Turns + Snapshots Tables and AppendTurn Transaction

### Goal

Every player action becomes an auditable, replayable Turn with a snapshot.

### Files

- **Add** migration `0005_turns_and_snapshots.sql`
- **Add** `src/app/engine/turns/turnStore.ts`
- **Add** `src/app/engine/turns/turnStore.test.ts`
- **Update** `src/app/layout/TimelineDrawer.tsx` (minimal: show turns)

### Checklist

- [x] Add `turns` and `turn_state_snapshots` tables.
- [x] Implement `appendTurn({ campaignId, sessionId, playerInput, aiOutput, mode, stateDoc })`:
  - [x] begin transaction
  - [x] insert into `turns`
  - [x] insert snapshot (encrypted json)
  - [x] update `campaign_state` to new `stateDoc`
  - [x] commit
- [x] TimelineDrawer:
  - [x] merge last 10 from turns + combat_log
  - [x] keep ai_logs view as dev-only later

### Tests

- [x] appendTurn is transactional (mock begin/commit/rollback if available; else statement ordering assertions)
- [x] list turns paging works

### Acceptance criteria

- After each turn, the campaign can reload into the same state without recomputing.

---

## PR-009 — Canon Store: canon_facts, canon_summaries, quest_threads

### Goal

Separate long-term canon from recent context and transcripts.

### Files

- **Add** migration `0006_canon_store.sql`
- **Add** `src/app/engine/memory/canonStore.ts`
- **Add** `src/app/engine/memory/canonStore.test.ts`

### Checklist

- [x] Add tables:
  - canon_facts (keyed upserts)
  - canon_summaries (long + recent)
  - quest_threads (state machine)
- [x] Implement:
  - [x] `upsertCanonFact({ key, type, value, confidence, sourceTurnId })`
  - [x] `getCanonSummary(campaignId)`
  - [x] `upsertCanonSummary(campaignId, { long, recent })`
  - [x] `listQuests(campaignId, filter)`
  - [x] validate quest state transitions

### Tests

- [x] idempotent upsert by key
- [x] quest transitions allowed/blocked correctly

### Acceptance criteria

- Canon facts and quests survive across sessions and are queryable quickly.

---

## PR-010 — Session Lifecycle Engine: Start Session → Recap → End Session → Summary

### Goal

Continuity is not optional: recap and summary become built-in lifecycle steps.

### Files

- **Add** `src/app/engine/sessions/lifecycle.ts`
- **Update** `src/app/data/sessions.ts`
- **Update** `src/app/screens/Dashboard.tsx`
- **Add** tests:
  - `src/app/engine/sessions/lifecycle.test.ts`
  - update Dashboard tests

### Checklist

- [x] Implement `startSession(campaignId)`:
  - [x] set active session in campaign_state
  - [x] build recap (offline deterministic first) from:
    - canon_summaries + state doc + last N turns
- [x] Implement `endSession(campaignId, sessionId)`:
  - [x] mark ended
  - [x] generate session recap (editable)
  - [x] update canon_summaries.recent
  - [ ] write a summary turn (mode=scene)
- [ ] Dashboard:
  - [ ] “Continue Campaign” triggers recap sheet modal

### Tests

- [x] recap exists without LLM configured
- [x] endSession writes recap + updates canon summaries transactionally

### Acceptance criteria

- Resuming after months always shows an accurate recap + threads.

---

## PR-011 — Recovery Tools: Undo Last Turn

### Goal

A single bad AI output must never permanently poison a campaign.

### Files

- **Add** migration `0007_turn_status.sql` (adds `turns.status`)
- **Add** `src/app/engine/recovery/undo.ts`
- **Update** `src/app/screens/PlayView.tsx` (stub UI hooks; PlayView lands in Plan 12 but undo hook can exist)
- **Add** tests: `undo.test.ts`

### Checklist

- [x] Add `turns.status` enum-like text: `applied|undone`.
- [ ] Implement `undoLastTurn(campaignId)`:
  - [x] find last applied turn
  - [x] load previous snapshot
  - [x] update campaign_state to previous snapshot
  - [x] mark last turn as undone
  - [ ] append a “system” log entry for audit (optional but required in data)
- [ ] Expose command in UI later via menu/shortcut.

### Tests

- [x] undo reverts state doc exactly
- [x] repeated undo behaves correctly

### Acceptance criteria

- Undo is reliable and does not delete history.

---

## PR-012 — Recovery Tools: Branch Campaign + Retcon Notes

### Goal

Support branching timelines and explicit canon corrections.

### Files

- **Add** migration `0008_branches_and_retcons.sql` (turn_branches table + retcon fields)
- **Add** `src/app/engine/recovery/branch.ts`
- **Add** `src/app/engine/recovery/retcon.ts`
- **Add** tests: `branch.test.ts`, `retcon.test.ts`

### Checklist

- [ ] Implement `branchCampaign({ campaignId, parentTurnId, label })`:
  - [x] duplicate campaign row (new id)
  - [x] copy campaign_state doc from snapshot at parentTurnId
  - [x] copy canon store + quests
  - [ ] copy turns up to parentTurnId (or reference them as read-only prefix)
- [ ] Implement `addRetcon({ campaignId, note })`:
  - [x] store as canon fact under key `retcon:<timestamp>`
  - [ ] include in canon summaries as “must include”
- [ ] Provide minimal UI hook points (actual UI in Plan 12+).

### Tests

- [x] branched campaign is playable and independent
- [x] retcon is stored and retrievable

### Acceptance criteria

- User can recover from bad turns by undoing, branching, or retconning.
