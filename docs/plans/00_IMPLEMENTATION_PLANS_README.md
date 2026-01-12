# TavernMaster — Implementation Plans (Execute in Order)

These plans are intended to be implemented **in order**. Completing all of them yields the **complete mac-only, AI-guided solo campaign app** focused on **years-long continuity**, including **migrations, backups, security, and thorough tests**.

## Order

1. **01_FOUNDATION_PERSISTENCE_SECURITY_TESTS.md**
2. **02_CONTINUITY_TURN_ENGINE_CANON_MEMORY.md**
3. **03_AI_GUARDRAILS_PLAYER_UX_COMBAT_SYNC.md**

## Non‑negotiables (apply throughout)

- All campaign mutations are transactional.
- Save format is versioned (schema + state) with automatic backups and rollback.
- AI outputs are schema-validated before any state mutation.
- Campaign continuity surfaces are first-class: recap on resume, timeline, quests, NPC relationships.
- Recovery tools exist: undo/rewind, branch, retcon note.
- Advanced/dev tooling stays available but is hidden behind **Developer Mode**.

## Repo anchors

- UI: `src/app/*` (React/TS)
- Shell: `src-tauri/*` (Rust/Tauri)
- DB: SQLite via `@tauri-apps/plugin-sql` (`src/app/data/*`)
- AI: OpenAI-compatible `/v1/chat/completions` (`src/app/ai/*`)
- Optional sync: Supabase (`src/app/sync/*`)
