
# Plan 02 — Continuity: Turn Engine, Canon Memory, Recaps, Undo/Branch/Retcon

## Goal
Make campaign continuity the #1 feature:
- Every meaningful interaction is a **Turn** with an auditable history
- A **Campaign State Document** is the authoritative “what is true right now?”
- A **Canon Store** separates long-term facts from recent context
- Resume after months includes a reliable “Last time on…” recap
- Recovery tools exist: **Undo**, **Branch**, **Retcon**

This plan assumes Plan 01 is complete (migrations, vault, campaign invariants).

---

## A. Authoritative campaign state document

### A1) Define the state doc + schema
Create: `src/app/engine/state/CampaignStateDoc.ts`
- Use **zod** to validate.
- Include `version` for future state migrations.

Minimum required fields (expand as needed):
- `version: number`
- `mode: 'scene' | 'combat' | 'downtime'`
- `scene: { title: string; location?: string; summary: string; tags: string[] }`
- `player: { characterId: string; hp: number; hpMax: number; ac: number; conditions: string[]; resources: Record<string, number> }`
- `companions: Array<{ characterId: string; name: string; role: string; status: string }>`
- `quests: Array<{ id: string; title: string; state: 'active'|'paused'|'resolved'|'failed'; lastUpdate: string }>`
- `npcs: Array<{ id: string; name: string; relationship: 'hostile'|'wary'|'neutral'|'friendly'|'ally'; lastSeen?: string; notes?: string }>`
- `locations: Array<{ id: string; name: string; region?: string; notes?: string }>`
- `inventory: Array<{ id: string; name: string; qty: number; tags: string[] }>`
- `flags: Record<string, string|number|boolean>`
- `activeEncounterId?: string`

### A2) Storage and transactions
Create: `src/app/engine/state/store.ts`
- `loadCampaignState(campaignId)`
  - load from `campaign_state` table
  - if missing, synthesize from campaign + player character + companions + last session recap
- `saveCampaignState(campaignId, doc, tx)`
  - validates schema
  - persists `current_scene_title` + `current_scene_summary` columns for fast dashboard display

Update: `src/app/data/campaign_state.ts`
- store the full state doc in `campaign_state.state_json` (add column via migration)
- keep summary columns for quick list rendering

**Migration:** add `campaign_state.state_json TEXT NOT NULL` (encrypted)

---

## B. Turn engine (the campaign’s source of truth over time)

### B1) Tables
**Migration** adds:
- `turns(id TEXT PK, campaign_id TEXT, session_id TEXT, index_in_campaign INTEGER, kind TEXT, player_input TEXT, ai_output TEXT, created_at TEXT, status TEXT)`
  - `kind`: `choice` | `custom` | `system` | `combat`
  - `status`: `applied` | `undone`
- `turn_state_snapshots(turn_id TEXT PK, campaign_id TEXT, state_json TEXT, created_at TEXT)` (encrypted)
- `turn_branches(id TEXT PK, campaign_id TEXT, parent_turn_id TEXT, label TEXT, created_at TEXT)`

### B2) Turn store
Create: `src/app/engine/turns/turnStore.ts`
- `appendTurn({ campaignId, sessionId, kind, playerInput, aiOutput, nextStateDoc }, tx)`
  - compute `index_in_campaign` atomically
  - write `turns` + `turn_state_snapshots`
- `listTurns(campaignId, limit, cursor)`
- `getTurn(turnId)`

### B3) Replace continuity surfaces to use turns
Update:
- `src/app/layout/TimelineDrawer.tsx`
  - use `turns` (not `ai_logs`) as the primary story timeline
  - still merge `combat_log` entries if you keep them separate

Keep `ai_logs` as diagnostics/developer-only after Plan 04.

---

## C. Canon memory store (facts vs recent)

### C1) Tables
**Migration** adds:
- `canon_facts(id TEXT PK, campaign_id TEXT, fact_type TEXT, key TEXT, value_json TEXT, confidence REAL, source_turn_id TEXT, updated_at TEXT)`
- `canon_summaries(campaign_id TEXT PK, summary_long TEXT, summary_recent TEXT, updated_at TEXT)`
- `quest_threads(id TEXT PK, campaign_id TEXT, title TEXT, state TEXT, details TEXT, last_updated_turn_id TEXT, updated_at TEXT)`

### C2) Canon store module
Create: `src/app/engine/memory/canonStore.ts`
- `getCanonSummaries(campaignId)`
- `upsertCanonSummary(campaignId, { long, recent }, tx)`
- `upsertCanonFact(campaignId, { key, factType, valueJson, confidence, sourceTurnId }, tx)`
- `upsertQuestThread(...)`
- `listActiveQuests(campaignId)`

### C3) Search indexing
Update `search_index` (Plan 01) to index:
- `canon_summaries.summary_long`
- quest thread titles + details
- key NPC relationship lines

Add a small indexing helper:
- `src/app/engine/search/indexer.ts` with `reindexCampaign(campaignId)` and incremental updates after each turn.

---

## D. Session lifecycle: Start → Recap → Play → End → Summary

### D1) Start session
Create: `src/app/engine/sessions/lifecycle.ts`
- `startSession(campaignId)`
  - ensure there is an active session row (`sessions`)
  - build a deterministic recap from:
    - `canon_summaries.summary_recent`
    - state doc `scene`, `quests`, `npcs`
    - last 10 turns (short bullets)
  - return recap + active threads

### D2) End session
- `endSession(campaignId, sessionId)`
  - mark `ended_at`
  - generate a **session summary** (bullets) and store into `sessions.recap` (encrypted if you decide)
  - update `canon_summaries.summary_recent`
  - create a `turns` entry of kind `system` summarizing changes

### D3) Editing recap
- UI must allow editing the recap (player can correct AI mistakes).
- Store edits as a `retcon` entry (see Section E3).

---

## E. Recovery tools

### E1) Undo last turn
Create: `src/app/engine/recovery/undo.ts`
- `undoLastTurn(campaignId)`
  - find last `turns.status='applied'`
  - mark it `undone`
  - restore `campaign_state.state_json` from previous snapshot
  - append a small system turn “Undid turn X”

### E2) Branch campaign
Create: `src/app/engine/recovery/branch.ts`
- `branchCampaign({ campaignId, parentTurnId, label })`
  - clone campaigns row (new id)
  - clone `campaign_player`, `campaign_state`, `canon_*`, `quest_threads`
  - copy turns up to `parentTurnId`
  - write `turn_branches` entry

### E3) Retcon note
Create: `src/app/engine/recovery/retcon.ts`
- `addRetcon(campaignId, note)`
  - store as a canon fact: `fact_type='world'`, `key='retcon:<timestamp>'`, `confidence=1.0`
  - add to `canon_summaries.summary_long` or a dedicated `retcons` list

---

## Tests (mandatory)

### Unit tests
- `CampaignStateDoc` schema validation
- turn append increments index
- undo restores the exact prior snapshot
- branch creates independent campaign ids and correct history length
- retcon storage and retrieval

### Integration tests
- apply 20 turns, undo, branch, continue on branch and original without cross-contamination
- start session → end session produces recap and updates canon summaries

---

## Acceptance criteria
- Timeline is turn-driven and remains fast at 10k+ turns.
- Resume after weeks shows accurate recap + active quests + key NPCs.
- Undo/Branch/Retcon work reliably and are tested.
- Canon facts exist and are distinct from recent transcript.
