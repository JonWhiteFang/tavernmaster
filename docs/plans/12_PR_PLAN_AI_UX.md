# 12 — PR Plan: AI Guardrails + Player-first UX + macOS Conventions

**Covers:** Plan 03 + Plan 04.  
**PRs:** PR-013 through PR-019.

---

## PR-013 — Add Engine AI Schemas: TurnResponse (zod) + Strict Parser + Retry Policy

### Goal

Make AI output deterministic and safe to apply.

### Files

- **Add** `src/app/engine/ai/schemas.ts`
- **Add** `src/app/engine/ai/parse.ts`
- **Add** `src/app/engine/ai/parse.test.ts`
- **Update** (deprecate in main flow) `src/app/ai/parser.ts` (keep for dev tools)

### Checklist

- [x] Define `TurnResponse` schema exactly (scene, choices, mechanics, state_patch, canon_updates, etc.).
- [ ] Implement strict JSON parsing:
  - [x] accept raw JSON only; optionally extract first JSON object from text (no semantic rewrite)
- [ ] Implement retry policy:
  - [x] attempt 1: normal
  - [x] attempt 2: temperature=0 + “JSON ONLY” reinforcement
  - [x] on failure: surface error and store raw output for diagnostics

### Tests

- [x] parse succeeds on valid json
- [x] parse fails predictably on invalid json
- [x] retry logic called with correct params (mock client)

### Acceptance criteria

- No “LLM repair” used in core loop.

---

## PR-014 — Turn Orchestrator (Planner → Narrator) + Prompt Builder (Canon + State + Recent Turns)

### Goal

Replace manual context fields with an automatic prompt builder.

### Files

- **Add** `src/app/engine/ai/playStyles.ts`
- **Add** `src/app/engine/ai/promptBuilder.ts`
- **Add** `src/app/engine/ai/turnOrchestrator.ts`
- **Add** tests: `promptBuilder.test.ts`, `turnOrchestrator.test.ts`
- **Update** `src/app/ai/client.ts` (capability flags, response_format support when available)

### Checklist

- [x] Prompt builder uses:
  - [x] canon_summaries.long + recent
  - [x] CampaignStateDoc
  - [x] last N turns (bounded excerpts)
  - [x] player input
  - [x] play style preset
- [ ] Orchestrator:
  - [x] request Planner turn (low temp)
  - [x] validate TurnResponse
  - [ ] request Narrator rewrite for narrative only
  - [ ] validate and merge; fallback to planner narrative if narrator fails
- [ ] Add endpoint capability probe cached in settings (non-user-facing).

### Tests

- [x] prompt builder size bound test (never exceeds N chars)
- [x] narrator failure fallback test

### Acceptance criteria

- Engine can produce a TurnResponse without user editing any context fields.

---

## PR-015 — ApplyTurn Transaction: Validate Patch + Update State + Append Turn + Update Canon

### Goal

Single safe function applies a validated TurnResponse to persistence.

### Files

- **Add** `src/app/engine/apply/validators.ts`
- **Add** `src/app/engine/apply/applyTurn.ts`
- **Add** tests: `applyTurn.test.ts`

### Checklist

- [ ] Validate:
  - HP bounds, condition schema, quest transitions
  - state doc versioning
- [ ] Transactional apply:
  - [x] appendTurn
  - [x] snapshot
  - [x] update campaign_state doc
  - [x] upsert canon facts/quests
  - update search_index for recap/summary
- [ ] Store raw AI output separately for developer diagnostics.

### Tests

- [x] invalid patch rejected with explicit error
- [x] transaction ordering correct

### Acceptance criteria

- No state mutation happens without schema validation and invariants passing.

---

## PR-016 — New PlayView Screen (Scene + Choices + Status + Timeline) Wired to Turn Pipeline

### Goal

Player-first “game view” exists and is usable.

### Files

- **Add** `src/app/screens/PlayView.tsx`
- **Update** `src/app/App.tsx` (route `play` → PlayView)
- **Update** `src/app/layout/SidebarNav.tsx` (simplify nav)
- **Update** `src/app/state/AppContext.tsx` (ensure campaign selection is required)
- **Add** tests: `PlayView.test.tsx`

### Checklist

- [ ] PlayView shows:
  - [x] scene card (title + narrative)
  - [x] 3–7 choices as buttons
  - [x] custom action input
  - [x] your character summary (HP/AC/conditions)
  - [x] collapsible timeline drawer
- [ ] On choice/custom submit:
  - [x] orchestrate turn
  - [x] apply turn
  - [x] refresh state + timeline
- [ ] Error UX:
  - “Retry”
  - “Open details” (dev mode only)

### Tests

- [x] renders choices
- [x] submitting triggers orchestrator and then applyTurn
- [x] keyboard hotkeys 1..7 select choices

### Acceptance criteria

- Player can play a loop without touching AI Director or Settings.

---

## PR-017 — Developer Mode + Progressive Disclosure (Hide Tool Suite by Default)

### Goal

Keep advanced tools but remove them from the main path.

### Files

- **Add** `src/app/state/developerMode.ts`
- **Update** `src/app/layout/SidebarNav.tsx`
- **Update** `src/app/screens/Settings.tsx` (move model config to Advanced)
- **Update** `src/app/screens/LogsExports.tsx`, `src/app/screens/AiDirector.tsx`, `src/app/screens/EncounterFlow.tsx` (mark dev-only)
- **Add** tests: nav snapshot tests

### Checklist

- [x] Add persisted Developer Mode toggle in `app_settings`.
- [x] Sidebar shows only:
  - Play
  - Campaign Library
  - Character
  - Notes
- [x] Developer Mode reveals:
  - Logs & Exports
  - Director (Developer)
  - Combat Debugger
  - Prompt inspection panel
- [x] Ensure Developer Mode is off by default and doesn’t block play.

### Acceptance criteria

- Default user sees a simple app.

---

## PR-018 — macOS Menu + Keyboard Shortcuts + Accessibility Pass

### Goal

Make it feel native and efficient.

### Files

- **Update** `src-tauri/src/main.rs` (add menu setup)
- **Update** `src/app/*` to handle menu events/commands
- **Add** `src/app/platform/shortcuts.ts`
- **Add** tests: accessibility smoke tests in PlayView

### Checklist

- [x] Implement menu items: New Campaign, Undo, Branch, Export, Settings/Vault, Toggle Developer Mode
- [x] Keyboard shortcuts:
  - ⌘1 Play, ⌘2 Library, ⌘Z Undo, ⌘⇧B Branch, ⌘, Settings
- [ ] Accessibility:
  - aria-live for narration updates
  - focus management after turn resolves
  - labels on buttons/inputs

### Acceptance criteria

- macOS shortcuts work and are test-covered (as far as feasible in unit tests).

---

## PR-019 — Copy & Microcopy Rewrite (Game-first language)

### Goal

Remove “tool” language and reduce cognitive load.

### Files

- **Update** `src/app/layout/*`, `src/app/screens/*`, `src/app/ui/*`
- **Add** `src/app/content/copy.ts` (centralized strings where feasible)
- **Add** tests: copy snapshot tests (optional style but required here)

### Checklist

- [ ] Rename UI labels:
  - Stream Narration → Continue
  - Campaigns & Sessions → Campaign Library
  - Encounter → Combat (when active)
- [ ] Empty states: clear, friendly, action-oriented
- [ ] Error messages: plain language + actionable steps

### Acceptance criteria

- App reads like a game, not a dev console.
