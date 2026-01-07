# IMPLEMENTATION_PLAN_2_UI_REDESIGN

This task list strictly mirrors `temp/UI_REDESIGN_CODEX_PLAN.md` and is organized into phases with explicit dependencies, per-phase acceptance criteria, and per-phase testing.

## Phase 0 - Outcomes, scope, and IA alignment (Sections 1-3)
Depends on: None
Blocks: Phase 1+

### Tasks
- [ ] Confirm the primary UX goals for the solo play loop.
- [ ] Confirm the non-goals and scope guardrails.
- [ ] Validate the current UX issues list against the current repo state.
- [ ] Confirm the proposed IA labels and nav groupings map to existing routes (no feature loss).

### Acceptance criteria
- [ ] Goals and non-goals are documented and agreed.
- [ ] IA labels map to existing destinations without removing features.
- [ ] Known issues list is verified or updated for accuracy.

### Testing
- [ ] N/A (planning-only phase).

## Phase 1 - Global context + topbar command bar + nav relabel + dashboard upgrades (Sections 5.1, 5.2, 6, 7.1, 9)
Depends on: Phase 0
Blocks: Phase 2+

### Tasks
- [ ] Add `AppContext` with `activeCampaignId`, `activeSessionId`, caches, and `ensureDefaults()`.
- [ ] Add `usePersistentState` for localStorage-backed context.
- [ ] Wrap `src/app/App.tsx` with the `AppContext` provider.
- [ ] Update topbar to a command bar with campaign/session selectors.
- [ ] Surface LLM indicator from `getAppSettings()` (model + host).
- [ ] Surface sync indicator from `subscribeSyncStatus()`.
- [ ] Add quick actions: New Journal, Export, Search.
- [ ] Remove hardcoded "Copperbound" and other fixed campaign/session labels.
- [ ] Update `src/app/layout/Topbar.tsx` (extract if needed).
- [ ] Add sidebar section headers (PLAY / REFERENCE / SYSTEM) and relabel destinations.
- [ ] Add keyboard shortcuts (Cmd+1..Cmd+7) for major screens.
- [ ] Add `src/app/layout/SidebarNav.tsx` and `src/app/hooks/useHotkeys.ts`.
- [ ] Update Dashboard to "Campaigns & Sessions" with New Campaign, New Session, and Resume Play.
- [ ] Add "recent activity" (latest session recap + last AI log timestamp) to Dashboard.
- [ ] Update `Journal.tsx` to use `activeCampaignId` (remove `seed-campaign`).
- [ ] Update `LogsExports.tsx` to filter by active campaign/session.
- [ ] Update `AiDirector.tsx` to pass `campaignId`/`sessionId` into contexts.
- [ ] Add `createSession()` to `src/app/data/sessions.ts` with encryption and sync enqueue.

### Acceptance criteria
- [ ] Topbar always shows active campaign/session and they are changeable.
- [ ] Changing campaign/session updates Journal and Logs immediately.
- [ ] Nav labels match the PLAY / REFERENCE / SYSTEM intent with routes intact.
- [ ] Dashboard actions exist and "Resume Play" routes to Play Workspace.
- [ ] No hardcoded campaign/session IDs remain for Journal or Logs.

### Testing
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run format:check`

## Phase 2 - Context Rail + Timeline Drawer + Party Quick View (Sections 5.3, 5.4, 7.6)
Depends on: Phase 1
Blocks: Phase 3+

### Tasks
- [ ] Add `src/app/layout/ContextRail.tsx` rendered across screens.
- [ ] Add always-available widgets: dice roller, party quick view, active campaign/session summary, recent narration snippets.
- [ ] Add contextual widgets for Encounter, Map, Journal/Logs as described.
- [ ] Add `src/app/layout/TimelineDrawer.tsx` with collapsible behavior.
- [ ] Populate timeline from `ai_logs` filtered by campaign/session.
- [ ] Add open/closed state persistence via localStorage.
- [ ] Add click behavior to open Transcripts or expand inline.
- [ ] Improve Party Sheets readability (vitals, ability grid, equipment).
- [ ] Build Party Quick View component for the Context Rail.

### Acceptance criteria
- [ ] Context Rail is present on most screens with correct widgets.
- [ ] Timeline Drawer shows real AI logs, is collapsible, and remembers state.
- [ ] Party Quick View is usable from the Context Rail.
- [ ] Party Sheets readability improvements are visible and consistent.

### Testing
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run format:check`

## Phase 3 - Play Workspace + shared hooks (Sections 4, 8, 10)
Depends on: Phase 2
Blocks: Phase 4+

### Tasks
- [ ] Add `src/app/screens/PlayWorkspace.tsx` as the new home.
- [ ] Implement tabs: Narration, Actions, Notes.
- [ ] Narration tab: streaming output + parsed highlights.
- [ ] Actions tab: readable proposal cards + approve/reject + Approve All Safe.
- [ ] Notes tab: quick capture + link to Journal + import latest narration.
- [ ] Add `useDmNarration` hook (stream state, output, highlights, stream/clear).
- [ ] Add `usePartyProposals` hook (generate, approve/reject, approveAllSafe).
- [ ] Refactor `AiDirector.tsx` to use shared hooks (no logic duplication).
- [ ] Add shared UI primitives needed here: Button, Chip, Modal, Tabs, ListCard.
- [ ] Apply `Panel` consistently across Play Workspace subviews.

### Acceptance criteria
- [ ] Play Workspace supports the solo loop (narration -> actions -> notes).
- [ ] Hooks are shared between Play Workspace and AI Director.
- [ ] UI primitives are in place and used consistently where introduced.

### Testing
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run format:check`

## Phase 4 - AI Director readability upgrades (Section 7.3)
Depends on: Phase 3
Blocks: Phase 5+

### Tasks
- [ ] Replace raw JSON-first layout with readable proposal cards.
- [ ] Add rules refs chips, risks, alternatives, validation errors.
- [ ] Move raw JSON behind `<details>`.
- [ ] Add "Approve All Safe" and "Copy Narration to Journal".

### Acceptance criteria
- [ ] AI Director default view is human-readable and scannable.
- [ ] Raw JSON is accessible but not the primary display.

### Testing
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run format:check`

## Phase 5 - Journal create/edit + import narration (Section 7.7)
Depends on: Phase 4
Blocks: Phase 6+

### Tasks
- [ ] Add New Entry flow with Save/Cancel.
- [ ] Add Edit Entry flow with Save/Cancel.
- [ ] Add "Import latest DM narration" action.
- [ ] Ensure Journal respects active campaign/session context.

### Acceptance criteria
- [ ] Journal supports create/edit flows without losing context.
- [ ] Import narration creates a new entry correctly.

### Testing
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run format:check`

## Phase 6 - Logs & Exports improvements (Section 7.8)
Depends on: Phase 5
Blocks: Phase 7+

### Tasks
- [ ] Add kind filters (DM, Party, Summary, System, User).
- [ ] Add "Export Current Session Transcript" to combine N logs into one output.
- [ ] Ensure context filters apply (campaign + optional session).

### Acceptance criteria
- [ ] Logs filter correctly by kind and context.
- [ ] Transcript export generates a single combined output for the session.

### Testing
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run format:check`

## Phase 7 - Encounter + Map ergonomics (Sections 7.4, 7.5)
Depends on: Phase 6
Blocks: Phase 8

### Tasks
- [ ] Rework Encounter action bar: Start Fresh, Roll Initiative, Start Encounter, Advance Turn.
- [ ] Improve turn list with number, name, HP, AC, conditions count, active highlight.
- [ ] Surface crash recovery chip and clear snapshot action.
- [ ] Rebalance Map Studio layout to enlarge canvas.
- [ ] Add drag/drop upload on map canvas.
- [ ] Add token roster inline rename, role toggle, search/filter.

### Acceptance criteria
- [ ] Encounter Flow is faster to read and operate.
- [ ] Crash recovery is visible and actionable.
- [ ] Map Studio usability improved and drag/drop works.

### Testing
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run format:check`

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
