# Architecture Overview

Tavern Master is a Tauri desktop app with a React + TypeScript UI and a Rust host shell. The app is offline-first: SQLite holds canonical game state, while Supabase provides single-user sync between Macs.

## Core Modules

- `src/app`: UI shell, screens, and state orchestration.
- `src/app/rules`: 5e SRD rules helpers, combat flow, validation, and character creation defaults.
- `src/app/ai`: LLM orchestration, prompt templates, and response parsing.
- `src/app/data`: Typed models and content helpers (SQLite repositories + SRD queries).
- `src/app/sync`: Supabase sync client and conflict resolution helpers.
- `src-tauri`: native shell, window settings, and secure API bridges.

## Data Flow

1. UI triggers an intent (character creation, action approval, roll, encounter update).
2. Character creation uses SRD defaults (point-buy + ancestry bonuses) to derive stats.
3. Rules module validates actions and returns computed outcomes.
4. AI module proposes narrative or party actions, returning structured JSON.
5. State updates persist to SQLite, then sync to Supabase on a debounce cycle.
6. Sensitive narrative content is encrypted at rest via Tauri keychain-backed crypto commands.
7. Encounter flow snapshots are stored in `app_settings` to recover in-progress combat after crashes.

## Party Lifecycle

- Characters are created and edited in `Party Sheets`, persisted across `characters`, `character_stats`,
  `character_abilities`, `character_inventory`, and `character_spells`.
- `control_mode` determines who controls each character; the AI Director only uses AI-controlled members.
- Campaign continuation is gated until at least one party member exists.

## Local LLM Contract

The AI system expects OpenAI-compatible endpoints (Ollama/LM Studio). Prompts always request structured JSON for action proposals, and outputs are cached into the session log for traceability.

## Crash Recovery

- Encounter Flow persists a snapshot (rules state, combat log, RNG seed) under the `encounter_recovery` key in `app_settings`.
- On launch, the Encounter screen restores the latest snapshot and lets the user start fresh if needed.
