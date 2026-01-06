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
- [x] Add formatting/linting (Prettier + ESLint, rustfmt config).
- [x] Add CI workflow for build + lint + tests.
- [x] Generate app icon set and bundle identifier.

### 2) Data Layer & Persistence (SQLite)

- [x] Choose SQLite adapter and migration tool (tauri-plugin-sql).
- [x] Implement schema initialization from `docs/DATA_MODEL.md`.
- [x] Add baseline repository for Campaigns.
- [x] Add repositories for Characters, Encounters, Journal.
- [x] Implement SRD import on first launch (from bundled JSON).
- [x] Add seed data for demo campaign and sample characters.

### 3) Rules Engine (5e SRD)

- [x] Dice roller utilities (advantage/disadvantage, parsing `2d6+3`).
- [x] Action validation for combat (attack, cast, dash, dodge, help, etc.).
- [x] Conditions and durations (start/end of turn handling).
- [x] Initiative and turn order management.
- [x] Spellcasting resources and status effects.
- [x] Encounter difficulty and CR helpers.

### 4) AI Orchestration (Local LLM)

- [x] LLM client with OpenAI‑compatible settings (Ollama/LM Studio).
- [x] Prompt templates for DM + Party, with structured JSON outputs.
- [x] Approval workflow: propose → review → approve/reject → resolve.
- [x] Context summarization + memory pruning (session summary every N turns).
- [x] Rules reference retrieval from SRD index.

### 5) UI/UX (Fantasy‑Luxury Desktop)

- [x] Dashboard shell layout with panels and inspector.
- [x] Campaign dashboard with session picker and summaries.
- [x] Encounter screen (initiative tracker, combat log, conditions).
- [x] Party sheets (character stats, inventory, spells).
- [x] Map Studio (image import, tokens, fog, rulers).
- [x] Journal + narrative transcript with export.
- [x] Logs & Exports screen (transcript viewer + export stub).
- [x] AI Director panel (approval queue, tone, tactics profiles).
- [x] Settings UI (LLM config, sync, SRD source, theme).

### 6) Supabase Sync (Single User)

- [x] Supabase schema mirroring local tables (`supabase/migrations/20260106160000_schema_mirror.sql`).
- [x] Sync queue + debounce push/pull.
- [x] Conflict resolution UI (latest‑wins with manual override).
- [x] Keychain storage for sync key and LLM settings.

### 7) Security & Reliability

- [x] Secure storage for keys.
- [x] Offline data encryption for logs.
- [x] Input validation for AI outputs (JSON schema checks).
- [x] Crash recovery for in‑progress encounters.

### 8) Testing & Release

- [x] Unit tests for rules engine and dice roller.
- [x] Integration tests for sync + SRD ingestion.
- [x] Build automation for unsigned DMG (GitHub Actions).
- [x] Release checklist and user docs (`docs/USER_GUIDE.md`).

## Current File Map

- UI shell: `src/app/App.tsx`, `src/app/screens/Dashboard.tsx`, `src/styles/*.css`
- Architecture docs: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/LLM_RUNTIME.md`, `docs/SUPABASE_SYNC.md`, `docs/UI_STYLE.md`
- Stubs: `src/app/ai/prompts.ts`, `src/app/rules/srd.ts`, `src/app/sync/client.ts`
