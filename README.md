# Tavern Master

Tavern Master is a Mac desktop AI Dungeon Master for solo D&D 5e (SRD-only). It runs offline-first with a local SQLite store, supports single-user Supabase sync across Macs, and talks to local LLMs via an OpenAI-compatible API (Ollama or LM Studio).

## Highlights

- AI Dungeon Master narration with structured, player-approved party actions.
- SRD-backed rules helpers for combat, conditions, and spellcasting.
- Tactical encounter tools: initiative, map studio, journal, and exports.
- Fantasy-luxury UI designed for long-form solo play.

## Quickstart

1) Install dependencies:

```bash
npm install
```

2) Run the desktop app in development:

```bash
npm run tauri:dev
```

3) Build the desktop bundle:

```bash
npm run tauri:build
```

## Local LLM Setup

- Ollama (default): `http://localhost:11434`
- LM Studio: set an OpenAI-compatible base URL in Settings

Recommended default model: `llama3.1:8b` (swap as needed for your Mac).

## Documentation

- Architecture: `docs/ARCHITECTURE.md`
- Data model: `docs/DATA_MODEL.md`
- LLM runtime: `docs/LLM_RUNTIME.md`
- Sync strategy: `docs/SUPABASE_SYNC.md`
- UI style: `docs/UI_STYLE.md`
- Implementation plan: `IMPLEMENTATION_PLAN.md`
