# UI Redesign Phase 0 Review Notes

This review validates Phase 0 items from `docs/plans/IMPLEMENTATION_PLAN_2_UI_REDESIGN.md` against the current repo state.

## Goals and non-goals (confirmed)

- Primary UX goals: make the solo play loop obvious, keep context persistent, reduce screen switching, and preserve the fantasy-luxury look.
- Non-goals: no feature removal or data/sync changes, avoid heavy UI frameworks, remain offline-first, and avoid rewriting the rules engine or AI prompts.

## Issue validation (repo inspection)

- Active campaign/session is not global: `src/app/App.tsx` hardcodes the campaign label, `src/app/screens/Dashboard.tsx` keeps local selection state, and `src/app/screens/Journal.tsx` uses `seed-campaign`.
- Navigation labels emphasize internal modules: `src/app/App.tsx` uses "Session Dashboard", "AI Director", and similar labels instead of the solo-play workflow.
- App shell is static: the right inspector only renders on the dashboard in `src/app/App.tsx`, and the narrative feed footer is static placeholder text there.
- AI Director is hard to scan: proposals render raw JSON via `JSON.stringify` in `src/app/screens/AiDirector.tsx`.
- Reusable primitives are inconsistent: `src/app/ui/Panel.tsx` exists but no screens use `<Panel />` yet.

## IA mapping to existing screens

- PLAY: Play Workspace (new), Encounter -> `src/app/screens/EncounterFlow.tsx`, Map -> `src/app/screens/MapStudio.tsx`, Journal -> `src/app/screens/Journal.tsx`.
- REFERENCE: Party -> `src/app/screens/PartySheets.tsx`.
- SYSTEM: Transcripts & Exports -> `src/app/screens/LogsExports.tsx`, Settings -> `src/app/screens/Settings.tsx`.
- Dashboard remains as "Campaigns & Sessions" under PLAY with the existing `src/app/screens/Dashboard.tsx` route.

## Notes

- No mismatches found between the proposed IA labels and current routes; the only net-new destination is Play Workspace.
