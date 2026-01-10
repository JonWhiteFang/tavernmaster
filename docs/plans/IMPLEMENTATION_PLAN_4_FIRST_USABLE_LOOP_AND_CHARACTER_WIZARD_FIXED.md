# Tavern Master: First Usable Loop + Character Creation Wizard (Implementation Plan)

This plan merges the "First Usable Loop" roadmap with the "Questweaver-style Character Creation Wizard" roadmap into a single, ordered sequence. It is structured for PR-sized execution while keeping dependencies explicit.

## Goals

- Deliver a cohesive, DB-backed gameplay loop driven by a persistent App Spine.
- Replace hard-coded placeholders with real state and CRUD flows.
- Add a full character creation wizard with SRD-lite, strong tests, and end-to-end creation.

## Ordering Principles

- Establish the App Spine before wiring screens or exporting data.
- Move state into the database before adding cross-screen dependencies (AI logs, encounters).
- Ship pure logic + tests before UI in the wizard track.
- Keep migrations and ingestion upgrades early to avoid "fresh DB only" traps.

## Decisions & Assumptions

- App Spine introduces `src/app/state/AppContext.tsx` (React Context + reducer). It may wrap/reuse the existing `src/app/state/store.ts` reducer (or replace it), but there should be **one** source of truth for app state.
- Active IDs are persisted to SQLite `app_settings` under key `ui_state` (JSON). If any legacy builds stored these in localStorage, migrate once to `ui_state`, then ignore localStorage.
- `ui_state` stays local-only: sync already filters `app_settings` rows to `key === "app_settings"` in `src/app/sync/tables.ts`; keep that filter so `ui_state` does **not** sync or enqueue ops.
- Equipment step is skipped unless Option B (equipment choices) is enabled.
- Session recap is captured during session creation and used in exports.
- The merged feed is filtered by `activeCampaignId` and sorted by timestamp.
- Party proposals include stable character IDs and persist full payload JSON.
- SRD tables become the source of truth; align or retire any static SRD helpers (e.g. `src/app/rules/srd.ts` and `src/assets/srd/srd.json`) as DB-backed SRD-lite is introduced.

## Phase A: First Usable Loop (PR 1-10)

### PR 1 — App Spine: Active Campaign / Session / Encounter ✅ COMPLETE

**Goal:** One selected campaign/session/encounter drives the entire app and persists locally.

**Scope**

- Introduce a minimal global state layer using React Context + reducer.
- Create `src/app/state/AppContext.tsx` (**new**) exporting hooks like `useAppState()` / `useAppDispatch()`.
- Reuse and/or refactor the existing `src/app/state/store.ts` so the reducer + `initialState` are the single source of truth (avoid parallel state).
- Persist `{ activeCampaignId, activeSessionId, activeEncounterId }` to SQLite `app_settings` under key `ui_state` (JSON).
- Keep `ui_state` local-only: **do not** enqueue it for sync. This is already enforced because sync filters `app_settings` rows to `row.key === "app_settings"` in `src/app/sync/tables.ts` — keep that filter.
- Reset active IDs if the referenced record no longer exists.
- When `activeCampaignId` changes, clear `activeSessionId` and `activeEncounterId`.
- When `activeSessionId` changes, clear `activeEncounterId`.
- (Optional) If legacy builds stored active IDs in localStorage, migrate once to `ui_state`, then ignore localStorage.

**Suggested files**

- `src/app/state/AppContext.tsx` (new)
- `src/app/state/store.ts` (refactor to export reducer + initial state)
- `src/app/App.tsx` (wrap the app in the provider)
- `src/app/data/ui_state.ts` (new helpers to read/write `ui_state`)
- `src/app/sync/tables.ts` (comment only: keep `app_settings` syncFilter)

**Acceptance criteria**

- Active campaign/session/encounter survives app restart.
- Any screen can read active IDs via hooks (no hard-coded IDs).
- If active IDs are invalid, the app resets to a safe empty state.
- `ui_state` changes never appear in the sync queue.
- If legacy localStorage keys exist, they are migrated once and then ignored.

---

### PR 2 — Shell cleanup: wire topbar + remove hard-coded pills/placeholders ✅ COMPLETE

**Goal:** App chrome reflects real settings and selected campaign/session.

**Status:** Already implemented. Topbar uses real campaign/session data from AppContext, shows real LLM model/host from settings, and TimelineDrawer shows real ai_logs entries with proper empty states.

**Scope**

- Replace `Campaign: Copperbound` with active campaign name (or "None").
- Replace `LLM: Local` with model/base URL from settings.
- Replace footer "Narrative Feed" placeholder with latest `ai_logs` entry (or empty state).

**Suggested files**

- `src/app/App.tsx`
- `src/app/data/settings.ts`
- `src/app/data/ai_logs.ts`

**Acceptance criteria**

- No hard-coded demo strings in the app chrome.
- Footer shows real latest narration or a clear empty state.

---

### PR 3 — Dashboard becomes Home: Campaign create + Session create + Set Active ✅ COMPLETE

**Goal:** User can create their own campaign and sessions and set them active (regardless of demo seed data).

**Status:** Already implemented. Dashboard has New Campaign/Session modals, campaign/session lists with click-to-activate, createSession supports recap, and updateSession added for recap edits.

**Scope**

- "New Campaign" modal/form (use existing `createCampaign()` flow).
- Add "New Session" for the active campaign.
- Implement missing session writes in `src/app/data/sessions.ts`:
  - `createSession(...)` ✅
  - `updateSession(...)` (optional; for recap edits) ✅
- Capture session recap during session creation (optional text area).
- Add explicit "Set Active Session" action (updates App Spine).
- Note: `seedDatabase()` currently creates a demo campaign/session when the DB is empty. Keep this for v1, but ensure the UI always allows creating a new campaign and switching active selection. (Optional later: first-run prompt “Start with demo campaign?”)

**Suggested files**

- `src/app/screens/Dashboard.tsx`
- `src/app/data/sessions.ts` (add `createSession`; add `updateSession` if needed)
- `src/app/data/campaigns.ts` (optional: update name/summary)

**Acceptance criteria**

- User can create campaign → create session → set active.
- Works even if seeded demo content exists.
- Other screens automatically follow active selection.
- Session recap is stored on create (and on update if supported) and appears in exports.

---

### PR 4 — Journal: remove seed-campaign hard-code + add New Entry + basic edit ✅ COMPLETE

**Goal:** Journal becomes usable per campaign.

**Status:** Already implemented. Journal uses activeCampaignId from AppContext, has New Entry and Edit Entry modes, and updateJournalEntry exists in data layer.

**Scope**

- Replace hard-coded campaign ID with `activeCampaignId`.
- Add "New Entry" (title + content).
- Add basic "Edit" mode (requires `updateJournalEntry` in data layer).

**Suggested files**

- `src/app/screens/Journal.tsx`
- `src/app/data/journal.ts` (add `updateJournalEntry`)

**Acceptance criteria**

- Entries belong to selected campaign.
- Create/edit persists and survives reload.

---

### PR 5 — Logs & Exports: scope by active context + Export "Session Packet" (Markdown) ✅ COMPLETE

**Goal:** Export produces something a DM actually keeps after a session.

**Status:** Implemented. Added Export Session Packet that includes session recap, AI logs, and recent journal entries.

**Scope**

- Filter logs by active `campaignId` / `sessionId`.
- Create "Export Session Packet" (single Markdown file):
  - session recap
  - AI logs (dm/party/summary)
  - recent journal entries (campaign-scoped is fine initially)
- Implement a save flow (Tauri dialog) with a sanitized default filename.
- Ensure filesystem permissions/config allow writing the export file.

**Suggested files**

- `src/app/screens/LogsExports.tsx`
- `src/app/data/ai_logs.ts` (add query helpers if missing)
- `src/app/data/journal.ts`
- `src/app/data/sessions.ts`

**Acceptance criteria**

- One click exports a Markdown session packet that includes real data.
- Export uses a save dialog and writes successfully in a packaged app build.

---

### PR 6 — AI Director: attach to active campaign/session + persist proposals ✅ COMPLETE

**Goal:** AI output becomes part of the session record.

**Status:** Implemented. Created action_proposals data module with persistence, updated usePartyProposals hook to persist proposals and log to ai_logs, updated buildRoster to include character IDs, and added encounter requirement warning in AiDirector.

**Scope**

- On narration stream completion: insert `ai_logs` with `{ campaignId, sessionId, kind: "dm" }`.
- Party proposals: also insert into `ai_logs` (kind "party").
- Implement data module for `action_proposals`:
  - `createActionProposals(encounterId, proposals)`
  - `updateProposalStatus(id, status)`
  - `listPendingProposals(encounterId)`
- UI approve/reject persists status changes.
- Add data-layer tests for `action_proposals` create/update/list behavior.
- Update party roster and AI prompts to include stable character IDs and enforce/validate them in parsing so `action_proposals.character_id` is always valid.
- Store full proposal payloads (action, risks, alternatives, errors, etc.) in `action_proposals.payload_json` (already in schema). If supporting upgrades from older DBs, add an `ensureColumn()` safeguard.
- Require an active encounter before generating proposals (or prompt to create/select one).

**Suggested files**

- `src/app/screens/AiDirector.tsx`
- `src/app/data/action_proposals.ts` (new)
- `src/app/data/db.ts` (optional: `ensureColumn` guard if needed)

**Acceptance criteria**

- Approved/rejected proposals survive reload and are queryable.
- Data-layer tests cover proposal persistence and status transitions.
- Proposals persist with valid `character_id` values derived from the AI payload.

---

### PR 7 — Encounters: create/select encounter for active campaign (DB-backed) ✅ COMPLETE

**Goal:** Encounter Flow operates primarily on `encounters` table, not recovery snapshot.

**Status:** Implemented. Added encounter selector dropdown, New Encounter creation form, and integration with activeEncounterId from App Spine.

**Scope**

- Add "Active Encounter" selector + "New Encounter" on Encounter Flow screen.
- Use `activeEncounterId` from App Spine.
- Keep `encounter_recovery` as emergency resume only.

**Suggested files**

- `src/app/screens/EncounterFlow.tsx`
- `src/app/data/encounters.ts`
- `src/app/data/encounter_recovery.ts` (optional repositioning)

**Acceptance criteria**

- User can create encounter, switch encounters, return later and continue.

---

### PR 8 — Persist initiative + turn state in DB

**Goal:** Combat state survives reload and sync.

**Scope**

- Add data helpers:
  - write initiative order to `initiative_entries`
  - store `encounters.round` and `encounters.active_turn_id`
- Wire "roll initiative" and "advance turn" to DB updates.
- Add data-layer tests for initiative write/read and encounter turn updates.
- Clear existing `initiative_entries` for the encounter before writing a new order.

**Suggested files**

- `src/app/data/initiative.ts` (new, or extend `encounters.ts`)
- `src/app/screens/EncounterFlow.tsx`

**Acceptance criteria**

- Reload preserves initiative + active turn + round.
- Tests confirm initiative and turn state persistence.

---

### PR 9 — Combat log becomes first-class + unify the "Narrative Feed"

**Goal:** The app chrome timeline becomes a real merged session feed.

**Scope**

- Implement `combat_log` data module:
  - `appendCombatLog(encounterId, entryType, payload)`
  - `listCombatLog(encounterId, limit)`
- On action resolution in Encounter Flow, write combat log entries.
- In `App.tsx` footer, show merged feed:
  - latest `ai_logs` narration (filtered by `activeCampaignId`)
  - combat log summaries (filtered by `activeCampaignId`)
  - (optional later) journal highlights
- Add data-layer tests for combat log append/list ordering.
- Ensure combat log queries join encounters to filter by `campaign_id`.

**Suggested files**

- `src/app/data/combat_log.ts` (new)
- `src/app/screens/EncounterFlow.tsx`
- `src/app/App.tsx`

**Acceptance criteria**

- Timeline shows last ~10 real items across narration + combat events.
- Tests cover combat log persistence and query ordering.
- Feed merges and sorts entries by timestamp within the active campaign.

---

### PR 10 — "First playable loop" polish pass

**Goal:** Make the new workflow smooth and debuggable.

**Scope**

- Add empty-state CTAs everywhere ("Create campaign/session/encounter").
- Add quick actions on Dashboard:
  - Open AI Director
  - Open Encounter Flow
  - New Journal Entry
- Add error boundaries + toasts for async failures (LLM/DB).
- Add a small set of integration tests covering the new spine flow.

**Suggested files**

- `src/app/screens/*`
- `src/app/ui/toast.tsx` (new or minimal)
- `src/app/test/*`

**Acceptance criteria**

- A new user can complete the loop:
  1. Create campaign
  2. Create session
  3. Generate narration + proposals
  4. Approve proposals
  5. Run encounter turns
  6. Export session packet

---

## Phase B: Character Creation Wizard (PR 11-20)

### PR 11 — Ability score engine (pure logic + tests)

**Goal:** Port Questweaver's AbilityScoreGenerator into TS with strong tests.

**Add**

- `src/app/characterCreation/abilityScores.ts`
  - `STANDARD_ARRAY = [15,14,13,12,10,8]`
  - `roll4d6DropLowest(rng)`
  - `rollAbilityScores(rng): number[]`
  - `POINT_BUY_BUDGET = 27`
  - `pointBuyCost(score)` (8-15)
  - `abilityMod(score)`
  - Prefer reusing or replacing overlapping utilities in `src/app/rules/srd.ts` to avoid duplicate logic.

**Tests**

- Deterministic rolling using `createSeededRng()` (`src/app/rules/rng.ts`).
- Point-buy budget never goes negative for valid ranges.
- Modifier table sanity.

**Acceptance**

- `npm run test` passes.
- No UI changes yet.

---

### PR 12 — Add SRD-lite tables + ingestion upgrade

**Goal:** Make the wizard data-driven with upgrade-safe SRD ingestion.

**Schema**

- Update `src/app/data/schema.ts` to add:
  - `srd_classes`
  - `srd_races`
  - `srd_backgrounds`

**SRD bundle**

- Extend `src/assets/srd/srd.json` with:
  - `classes: [...]`
  - `races: [...]`
  - `backgrounds: [...]`

**Critical fix**

- Update `src/app/data/srd.ts` so ingestion does not bail after checking only spells.
  - Check each SRD table independently (if empty → insert that section).
  - Keep ingestion idempotent and upgrade existing installs.
- Plan to retire static SRD lists in `src/app/rules/srd.ts` once SRD tables are live.

**Tests**

- Extend `src/app/data/srd.ingestion.test.ts`:
  - classes/races/backgrounds inserted
  - ingestion remains idempotent

**Acceptance**

- Fresh DB gets all SRD tables populated.
- Existing DB (already has spells) still gets new SRD tables populated on next run.

---

### PR 13 — SRD content access layer (typed list functions)

**Goal:** Avoid JSON parsing in UI.

**Add**

- `src/app/data/srdContent.ts`
  - `listSrdClasses()`
  - `listSrdRaces()`
  - `listSrdBackgrounds()`

**Add types**

- `src/app/characterCreation/types.ts`
  - `SrdClass { id, name, hitDie, ... }`
  - `SrdRace { id, name, speed, abilityBonuses, ... }`
  - `SrdBackground { id, name, proficiencies, ... }`

**Acceptance**

- A component can call `listSrdClasses()` and get typed results.

---

### PR 14 — Wizard reducer/state machine (Questweaver-style) + tests

**Goal:** Implement "intents in, state out" pattern.

**Add**

- `src/app/characterCreation/state.ts`
  - `CreationStep = "ability" | "class" | "race" | "background" | "equipment" | "confirm"`
  - `CharacterCreationState` containing:
    - `step`
    - ability method + scores/assignments/pointbuy
    - selectedClass / selectedRace / selectedBackground
    - equipment selections (can be empty in v1)
    - name / role / alignment
  - `CharacterCreationAction` union mirroring intents
  - `reducer(state, action)`
  - selectors:
    - `finalAbilityScores(state)`
    - `remainingPointBuyPoints(state)`
    - `unassignedScores(state)`
    - `canProceed(state)`
    - `canGoBack(state)`

**Tests**

- Step gating works (cannot proceed unless complete).
- Data preserved across back/next.
- Rolling resets assignments when rerolling (if chosen UX).
- Equipment step is skipped unless the Option B flow is enabled.

**Acceptance**

- Reducer and selectors fully testable, no UI yet.
- Default flow bypasses equipment without blocking progress.

---

### PR 15 — CharacterBuilder (pure) outputs `NewCharacterInput` + tests

**Goal:** Copy Questweaver's CharacterBuilder concept.

**Add**

- `src/app/characterCreation/builder.ts`
  - `applyRacialBonuses(scores, race)`
  - `deriveVitals({ level, srdClass, race, scores })`
    - initiative = DEX mod
    - speed = race.speed (fallback 30)
    - HP (simple v1):
      `hpMax = hitDie + conMod + (level-1) * (floor(hitDie/2)+1 + conMod)`
      `hp = hpMax`
    - AC (v1): `10 + dexMod`
  - `buildNewCharacterInput(state): NewCharacterInput`
    - default `level` to 1
    - default `controlMode` to player
    - set empty arrays for `proficiencies`, `inventory`, `spells`, `ancestryBonusSelections` until a UI step exists

**Tests**

- Racial bonuses applied correctly.
- Derived stats stable for fixtures (fighter vs wizard, etc.).

**Acceptance**

- Calling `createCharacter(buildNewCharacterInput(state))` works.
- Builder outputs a complete `NewCharacterInput` without missing required fields.

---

### PR 16 — Wizard shell UI as a modal (stepper + nav)

**Goal:** Visible progress early, minimal disruption to app navigation.

**Add**

- `src/app/components/characterCreation/CharacterCreationModal.tsx`
  - overlay + close/cancel
  - step indicator (labels or dots)
  - Back/Next buttons (Next disabled by `canProceed`)
  - internal `useReducer(reducer, initialState)`

**Add**

- `src/app/components/characterCreation/steps/AbilityScoresStep.tsx`
  - method picker: Standard / Point Buy / Rolling
  - standard + rolling score assignment UI
  - point buy UI with remaining points

**Styles**

- Add wizard styles to `src/styles/layout.css` or a new `src/styles/wizard.css` imported once.

**Acceptance**

- Modal opens and completes Ability step gating correctly.

---

### PR 17 — Class/Race/Background steps UI (data-driven lists)

**Goal:** Capture the Questweaver feel with list + detail selection screens.

**Add step components**

- `ClassStep.tsx`
  - list + detail pane (hit die, proficiencies)
  - select 1 class
- `RaceStep.tsx`
  - list + detail pane (speed, ability bonuses)
- `BackgroundStep.tsx`
  - list + detail pane (skills/proficiencies, flavor)

**Wiring**

- On modal open: load SRD lists via `listSrdClasses/races/backgrounds`.
- Handle loading and error states cleanly.

**Acceptance**

- User can progress Ability → Class → Race → Background.

---

### PR 18 — Confirmation step + persistence + Party Sheets integration

**Goal:** First fully usable version.

**Add**

- `ConfirmationStep.tsx`
  - name input (required)
  - role dropdown (player/ally/npc)
  - alignment dropdown (default Neutral)
  - summary of: class/race/background + ability scores + derived stats

**Integrate**

- Update `src/app/screens/PartySheets.tsx`
  - Add a Create Character button in roster panel
  - On confirm:
    - `createCharacter(buildNewCharacterInput(state))`
    - refresh `listCharacters()`
    - set activeId to new character

**Acceptance**

- Create a character in-app and see it in the roster immediately.

---

### PR 19 — Equipment step v1 + inventory persistence (optional but high impact)

**Goal:** Start matching Questweaver's starting kit feel.

**Option A (fast + good enough for v1)**

- Add to SRD-lite JSON:
  - class: `startingItemIds: string[]`
  - background: `startingItemIds: string[]`
- On confirm:
  - insert `character_inventory` rows for these items
- Confirm a stable item source exists; if not, seed a minimal item list before wiring starter items.

**Add**

- `src/app/data/inventory.ts` with `addCharacterInventory(characterId, items[])`

**Acceptance**

- New characters show starter items in Party Sheets inventory.

**Option B (Questweaver-like choices)**

- Implement an `equipmentChoices` structure and an Equipment step with "choose A or B".
- Save chosen items to inventory.
- Only enable the equipment step when Option B is active.

---

### PR 20 — Wizard polish + future-proofing

**Scope**

- "Cancel wizard?" confirm if dirty.
- Search/filter in class/race/background lists.
- Better error surfaces (inline callouts + retry).
- Docs: `docs/character-creation-wizard.md`.
- Expand SRD-lite dataset beyond the initial subset.

**Acceptance**

- Wizard is robust and user-friendly for first-time creation.

---

## Minimal SRD-lite dataset (v1)

- Classes: Fighter (d10), Rogue (d8), Cleric (d8), Wizard (d6)
- Races: Human, Elf, Dwarf, Halfling (speed + ability bonuses)
- Backgrounds: Acolyte, Criminal, Soldier, Sage, Outlander

## Definition of Done (per repo)

- `npm run lint`, `npm run test`, and `npm run format:check` on each PR.
- Update `docs/IMPLEMENTATION_PLAN.md` only if scope materially changes.
- Include screenshots for UI changes.

## Risks & Mitigations

- **SRD ingestion upgrade**: ensure per-table checks to avoid fresh-only data.
- **DB-backed encounter state**: keep recovery snapshots as fallback until stable.
- **Wizard schema growth**: keep SRD-lite small and additive for v1.
- **SRD source drift**: deprecate or align `src/app/rules/srd.ts` with the new SRD tables to avoid divergent data sources.
