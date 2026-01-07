# IMPLEMENTATION_PLAN_3_TUTORIAL_CAMPAIGN

Plan for removing default campaign/party on first load and adding a detailed in-app tutorial.

Assumptions:

- Active campaign/session remain null until the user selects or creates them.
- Navigation remains available with clear empty states (no hard blocking).
- Tutorial runs automatically once for new users, with Skip and Restart in Settings.
- Tutorial uses in-app overlays with step highlights and persisted progress.

## Phase 0 - Requirements and UX mapping

Depends on: None
Blocks: Phase 1+

### Tasks

- [ ] Confirm "no default campaign/party" applies even if existing data is present.
- [ ] Define which screens show empty states and which actions are disabled without a campaign.
- [ ] List the tutorial milestones (campaign, session, party, play loop, exports, tools).
- [ ] Decide tutorial entry points (auto-run, Settings link, optional Dashboard CTA).

### Acceptance criteria

- [ ] Requirements for startup behavior and tutorial flow are documented.
- [ ] Empty state and tutorial scope are agreed.

### Testing

- [ ] N/A (planning-only phase).

## Phase 1 - No default campaign/session/party on first load

Depends on: Phase 0
Blocks: Phase 2+

### Tasks

- [x] Update `src/app/data/seed.ts` to stop inserting demo campaign/session/journal/characters by default.
- [x] Add an explicit "Create sample data" action (likely in Settings) if demo data is still desired.
- [x] Adjust `src/app/data/init.ts` to respect the new seeding behavior.
- [x] Update `src/app/state/AppContext.tsx` so `ensureDefaults()` does not auto-select the first campaign/session unless the user has explicitly chosen one before (persist a flag).
- [x] Update `src/app/layout/Topbar.tsx` to show placeholder options like "Select campaign/session".
- [x] Add empty-state panels/CTAs in key screens when no campaign is selected:
  - [x] Play Workspace (route to Dashboard and Party).
  - [x] Journal / Logs & Exports (prompt to pick campaign).
  - [x] Encounter / Map / AI Director (prompt to pick campaign and create party).
- [x] Ensure "New Campaign" and "Create Character" flows remain accessible without a selected campaign.

### Acceptance criteria

- [x] App loads with no active campaign/session selected and no seed data created.
- [x] All screens render safely with null campaign/session and provide clear next steps.
- [x] User can create their own campaign and party without any default data.

### Testing

- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run format:check`

## Phase 2 - Tutorial framework and infrastructure

Depends on: Phase 1
Blocks: Phase 3+

### Tasks

- [ ] Define tutorial step schema (id, title, body, target selector, placement, completion event).
- [ ] Add `TutorialProvider` with persisted progress (`localStorage`/`usePersistentState`).
- [ ] Build overlay + spotlight components (step card, next/back/skip, progress indicator).
- [ ] Add a safe fallback when a step target is missing (centered card + "Skip step").
- [ ] Add `data-tutorial-id` attributes to key UI elements for reliable anchors.
- [ ] Add a "Start Tutorial" / "Resume Tutorial" action in Settings.
- [ ] Add tutorial completion/skip tracking and versioning (reset if tutorial content changes).
- [ ] Ensure tutorial supports keyboard controls (Esc to exit, Enter for Next).

### Acceptance criteria

- [ ] Tutorial can start, pause, skip, and resume with progress persisted.
- [ ] Highlighted elements align with UI targets on all major screens.

### Testing

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run format:check`

## Phase 3 - Tutorial content for core features

Depends on: Phase 2
Blocks: Phase 4+

### Tasks

- [ ] Dashboard steps: create campaign, create session, resume play.
- [ ] Party Sheets steps: create character, set control mode, confirm roster.
- [ ] Play Workspace steps: narration, actions, notes, import narration.
- [ ] AI Director steps: stream narration, approve proposals, copy to Journal.
- [ ] Journal steps: create entry, edit entry, export.
- [ ] Logs & Exports steps: filter kinds, export transcript.
- [ ] Encounter Flow steps: roll initiative, start encounter, advance turn.
- [ ] Map Studio steps: upload map, add token, toggle role, search/filter.
- [ ] Context Rail + Timeline Drawer steps: open timeline, view recent logs.
- [ ] Settings steps: sync status, tutorial reset, optional sample data creation.
- [ ] Add event hooks to advance steps on success (campaign/session/character creation, export actions).

### Acceptance criteria

- [ ] New users can complete a full guided flow across the app.
- [ ] Tutorial advances automatically on key actions without breaking normal usage.

### Testing

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run format:check`

## Phase 4 - UX polish and QA

Depends on: Phase 3
Blocks: Release

### Tasks

- [ ] Audit empty-state copy for clarity and consistency.
- [ ] Ensure tutorial overlay is accessible (aria labels, focus order).
- [ ] Verify tutorial does not block critical actions; allow Skip at all times.
- [ ] Validate the tutorial across screen sizes (desktop + small viewport).
- [ ] Update `docs/USER_GUIDE.md` with tutorial and first-run behavior.

### Acceptance criteria

- [ ] First-run experience is clear and does not auto-create data.
- [ ] Tutorial is usable, accessible, and easy to restart.

### Testing

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run format:check`
