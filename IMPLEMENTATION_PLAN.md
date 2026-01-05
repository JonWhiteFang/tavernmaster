# Tavern Master Implementation Plan

A living plan to track progress for the AI Dungeon Master desktop app (Mac, offline-first, SRD-only, local LLM, Supabase single-user sync). Update this file as work completes.

## Status Summary

- **Completed**: App scaffold, UI theme baseline, architecture/data model docs.
- **In progress**: Foundations for sync, AI prompt stubs, and rules placeholders.
- **Not started**: SQLite persistence, SRD ingestion, rules engine, AI runtime, full UI screens, tests, packaging.

## Milestones & Workstreams

### 1) Project Foundations

- [x] Scaffold Tauri + React + TypeScript (`package.json`, `src-tauri/tauri.conf.json`).
- [x] Establish directory structure (`src/app`, `src/styles`, `docs/`).
- [x] Create fantasy‑luxury theme baseline and dashboard shell.
- [x] Document architecture, data model, LLM runtime, Supabase strategy.
- [ ] Add formatting/linting (Prettier + ESLint, rustfmt config).
- [ ] Add CI workflow for build + lint + tests.

### 2) Data Layer & Persistence (SQLite)

- [x] Choose SQLite adapter and migration tool (tauri-plugin-sql).
- [x] Implement schema initialization from `docs/DATA_MODEL.md`.
- [x] Add baseline repository for Campaigns.
- [ ] Add repositories for Characters, Encounters, Journal.
- [ ] Implement SRD import on first launch (from bundled JSON).
- [ ] Add seed data for demo campaign and sample characters.

### 3) Rules Engine (5e SRD)

- [ ] Dice roller utilities (advantage/disadvantage, parsing `2d6+3`).
- [ ] Action validation for combat (attack, cast, dash, dodge, help, etc.).
- [ ] Conditions and durations (start/end of turn handling).
- [ ] Initiative and turn order management.
- [ ] Spellcasting resources and status effects.
- [ ] Encounter difficulty and CR helpers.

### 4) AI Orchestration (Local LLM)

- [ ] LLM client with OpenAI‑compatible settings (Ollama/LM Studio).
- [ ] Prompt templates for DM + Party, with structured JSON outputs.
- [ ] Approval workflow: propose → review → approve/reject → resolve.
- [ ] Context summarization + memory pruning (session summary every N turns).
- [ ] Rules reference retrieval from SRD index.

### 5) UI/UX (Fantasy‑Luxury Desktop)

- [x] Dashboard shell layout with panels and inspector.
- [ ] Campaign dashboard with session picker and summaries.
- [ ] Encounter screen (initiative tracker, combat log, conditions).
- [ ] Party sheets (character stats, inventory, spells).
- [ ] Map Studio (image import, tokens, fog, rulers).
- [ ] Journal + narrative transcript with export.
- [ ] AI Director panel (approval queue, tone, tactics profiles).
- [ ] Settings (LLM config, sync, SRD source, theme).

### 6) Supabase Sync (Single User)

- [ ] Supabase schema mirroring local tables.
- [ ] Sync queue + debounce push/pull.
- [ ] Conflict resolution UI (latest‑wins with manual override).
- [ ] Keychain storage for sync key and LLM settings.

### 7) Security & Reliability

- [ ] Secure storage for keys, offline data encryption for logs.
- [ ] Input validation for AI outputs (JSON schema checks).
- [ ] Crash recovery for in‑progress encounters.

### 8) Testing & Release

- [ ] Unit tests for rules engine and dice roller.
- [ ] Integration tests for sync + SRD ingestion.
- [ ] Build automation for DMG + notarization.
- [ ] Release checklist and user docs.

## Current File Map

- UI shell: `src/app/App.tsx`, `src/app/screens/Dashboard.tsx`, `src/styles/*.css`
- Architecture docs: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/LLM_RUNTIME.md`, `docs/SUPABASE_SYNC.md`, `docs/UI_STYLE.md`
- Stubs: `src/app/ai/prompts.ts`, `src/app/rules/srd.ts`, `src/app/sync/client.ts`
