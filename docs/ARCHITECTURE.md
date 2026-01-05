# Architecture Overview

Tavern Master is a Tauri desktop app with a React + TypeScript UI and a Rust host shell. The app is offline-first: SQLite holds canonical game state, while Supabase provides single-user sync between Macs.

## Core Modules

- `src/app`: UI shell, screens, and state orchestration.
- `src/app/rules`: 5e SRD rules helpers, combat flow, and validation.
- `src/app/ai`: LLM orchestration, prompt templates, and response parsing.
- `src/app/data`: Typed models and content helpers.
- `src/app/sync`: Supabase sync client and conflict resolution helpers.
- `src-tauri`: native shell, window settings, and secure API bridges.

## Data Flow

1. UI triggers an intent (action approval, roll, encounter update).
2. Rules module validates the action and returns computed outcomes.
3. AI module proposes narrative or party actions, returning structured JSON.
4. State updates persist to SQLite, then sync to Supabase on a debounce cycle.

## Local LLM Contract

The AI system expects OpenAI-compatible endpoints (Ollama/LM Studio). Prompts always request structured JSON for action proposals, and outputs are cached into the session log for traceability.
