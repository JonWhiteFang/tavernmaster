# IMPLEMENTATION_PLAN_2_UI_REDESIGN

This task list strictly mirrors `temp/UI_REDESIGN_CODEX_PLAN.md` and is organized into phases with explicit dependencies, per-phase acceptance criteria, and per-phase testing.

## Phase 0 - Outcomes, scope, and IA alignment (Sections 1-3)

Depends on: None
Blocks: Phase 1+

### Tasks

- [x] Confirm the primary UX goals for the solo play loop.
- [x] Confirm the non-goals and scope guardrails.
- [x] Validate the current UX issues list against the current repo state.
- [x] Confirm the proposed IA labels and nav groupings map to existing routes (no feature loss).

### Acceptance criteria

- [x] Goals and non-goals are documented and agreed.
- [x] IA labels map to existing destinations without removing features.
- [x] Known issues list is verified or updated for accuracy.

### Testing

- [x] N/A (planning-only phase).

## Phase 1 - Global context + topbar command bar + nav relabel + dashboard upgrades (Sections 5.1, 5.2, 6, 7.1, 9)

Depends on: Phase 0
Blocks: Phase 2+

### Tasks

- [x] Add `AppContext` with `activeCampaignId`, `activeSessionId`, caches, and `ensureDefaults()`.
- [x] Add `usePersistentState` for localStorage-backed context.
- [x] Wrap `src/app/App.tsx` with the `AppContext` provider.
- [x] Update topbar to a command bar with campaign/session selectors.
- [x] Surface LLM indicator from `getAppSettings()` (model + host).
- [x] Surface sync indicator from `subscribeSyncStatus()`.
- [x] Add quick actions: New Journal, Export, Search.
- [x] Remove hardcoded "Copperbound" and other fixed campaign/session labels.
- [x] Update `src/app/layout/Topbar.tsx` (extract if needed).
- [x] Add sidebar section headers (PLAY / REFERENCE / SYSTEM) and relabel destinations.
- [x] Add keyboard shortcuts (Cmd+1..Cmd+7) for major screens.
- [x] Add `src/app/layout/SidebarNav.tsx` and `src/app/hooks/useHotkeys.ts`.
- [x] Update Dashboard to "Campaigns & Sessions" with New Campaign, New Session, and Resume Play.
- [x] Replace prompt-based New Campaign/Session with modal forms (reusable Modal).
- [x] Add "recent activity" (latest session recap + last AI log timestamp) to Dashboard.
- [x] Update `Journal.tsx` to use `activeCampaignId` (remove `seed-campaign`).
- [x] Update `LogsExports.tsx` to filter by active campaign/session.
- [x] Update `AiDirector.tsx` to pass `campaignId`/`sessionId` into contexts.
- [x] Add `createSession()` to `src/app/data/sessions.ts` with encryption and sync enqueue.

### Acceptance criteria

- [x] Topbar always shows active campaign/session and they are changeable.
- [x] Changing campaign/session updates Journal and Logs immediately.
- [x] Nav labels match the PLAY / REFERENCE / SYSTEM intent with routes intact.
- [x] Dashboard actions exist and "Resume Play" routes to Play Workspace.
- [x] Campaign/session creation uses modal forms (no prompt dialogs).
- [x] No hardcoded campaign/session IDs remain for Journal or Logs.

### Testing

- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run format:check`

## Phase 2 - Context Rail + Timeline Drawer + Party Quick View (Sections 5.3, 5.4, 7.6)

Depends on: Phase 1
Blocks: Phase 3+

### Tasks

- [x] Add `src/app/layout/ContextRail.tsx` rendered across screens.
- [x] Add always-available widgets: dice roller, party quick view, active campaign/session summary, recent narration snippets.
- [x] Add contextual widgets for Encounter, Map, Journal/Logs as described.
- [x] Add `src/app/layout/TimelineDrawer.tsx` with collapsible behavior.
- [x] Populate timeline from `ai_logs` filtered by campaign/session.
- [x] Add open/closed state persistence via localStorage.
- [x] Add click behavior to open Transcripts or expand inline.
- [x] Improve Party Sheets readability (vitals, ability grid, equipment).
- [x] Build Party Quick View component for the Context Rail.

### Acceptance criteria

- [x] Context Rail is present on most screens with correct widgets.
- [x] Timeline Drawer shows real AI logs, is collapsible, and remembers state.
- [x] Party Quick View is usable from the Context Rail.
- [x] Party Sheets readability improvements are visible and consistent.

### Testing

- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run format:check`

## Phase 3 - Play Workspace + shared hooks (Sections 4, 8, 10)

Depends on: Phase 2
Blocks: Phase 4+

### Tasks

- [x] Add `src/app/screens/PlayWorkspace.tsx` as the new home.
- [x] Implement tabs: Narration, Actions, Notes.
- [x] Narration tab: streaming output + parsed highlights.
- [x] Actions tab: readable proposal cards + approve/reject + Approve All Safe.
- [x] Notes tab: quick capture + link to Journal + import latest narration.
- [x] Add `useDmNarration` hook (stream state, output, highlights, stream/clear).
- [x] Add `usePartyProposals` hook (generate, approve/reject, approveAllSafe).
- [x] Refactor `AiDirector.tsx` to use shared hooks (no logic duplication).
- [x] Add shared UI primitives needed here: Button, Chip, Modal, Tabs, ListCard.
- [x] Apply `Panel` consistently across Play Workspace subviews.

### Acceptance criteria

- [x] Play Workspace supports the solo loop (narration -> actions -> notes).
- [x] Hooks are shared between Play Workspace and AI Director.
- [x] UI primitives are in place and used consistently where introduced.

### Testing

- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run format:check`

## Phase 4 - AI Director readability upgrades (Section 7.3)

Depends on: Phase 3
Blocks: Phase 5+

### Tasks

- [x] Replace raw JSON-first layout with readable proposal cards.
- [x] Add rules refs chips, risks, alternatives, validation errors.
- [x] Move raw JSON behind `<details>`.
- [x] Add "Approve All Safe" and "Copy Narration to Journal".

### Acceptance criteria

- [x] AI Director default view is human-readable and scannable.
- [x] Raw JSON is accessible but not the primary display.

### Testing

- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run format:check`

## Phase 5 - Journal create/edit + import narration (Section 7.7)

Depends on: Phase 4
Blocks: Phase 6+

### Tasks

- [x] Add New Entry flow with Save/Cancel.
- [x] Add Edit Entry flow with Save/Cancel.
- [x] Add "Import latest DM narration" action.
- [x] Ensure Journal respects active campaign/session context.

### Acceptance criteria

- [x] Journal supports create/edit flows without losing context.
- [x] Import narration creates a new entry correctly.

### Testing

- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run format:check`

## Phase 6 - Logs & Exports improvements (Section 7.8)

Depends on: Phase 5
Blocks: Phase 7+

### Tasks

- [x] Add kind filters (DM, Party, Summary, System, User).
- [x] Add "Export Current Session Transcript" to combine N logs into one output.
- [x] Ensure context filters apply (campaign + optional session).

### Acceptance criteria

- [x] Logs filter correctly by kind and context.
- [x] Transcript export generates a single combined output for the session.

### Testing

- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run format:check`

## Phase 7 - Encounter + Map ergonomics (Sections 7.4, 7.5)

Depends on: Phase 6
Blocks: Phase 8

### Tasks

- [x] Rework Encounter action bar: Start Fresh, Roll Initiative, Start Encounter, Advance Turn.
- [x] Improve turn list with number, name, HP, AC, conditions count, active highlight.
- [x] Surface crash recovery chip and clear snapshot action.
- [x] Rebalance Map Studio layout to enlarge canvas.
- [x] Add drag/drop upload on map canvas.
- [x] Add token roster inline rename, role toggle, search/filter.

### Acceptance criteria

- [x] Encounter Flow is faster to read and operate.
- [x] Crash recovery is visible and actionable.
- [x] Map Studio usability improved and drag/drop works.

### Testing

- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run format:check`

## Phase 8 - Visual + interaction polish (Section 11)

Depends on: Phase 7
Blocks: Phase 9

### Tasks

- [ ] Add visible focus outlines for keyboard navigation.
- [ ] Improve long-text readability (width and line-height).
- [ ] Add lightweight toast/snackbar feedback for saves/exports/sync.
- [ ] Update `src/styles/layout.css` (and optional `components.css` if needed).

### Acceptance criteria

- [ ] Focus states are visible and consistent.
- [ ] Long text is easier to read without layout regressions.
- [ ] Feedback toasts appear for save/export/sync actions.

### Testing

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run format:check`

## Phase 9 - Global UX acceptance checklist (Section 13)

Depends on: Phase 8
Blocks: Release

### Tasks

- [ ] Active campaign/session always visible and changeable in topbar.
- [ ] Journal and Logs never hard-code seed IDs; they reflect selected context.
- [ ] Core loop runs from Play Workspace without hunting.
- [ ] Timeline drawer shows stored AI logs and is usable from any screen.
- [ ] All existing features remain reachable from navigation.
- [ ] Keyboard shortcuts work for major screens.
- [ ] Basic accessibility: focus states, labels, keyboard activation on list items.

### Acceptance criteria

- [ ] All checklist items above are complete.

### Testing

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run format:check`
