# Changelog

All notable changes to Tavern Master are documented in this file.

## [Unreleased]

### Added

- **Campaign-scoped characters** (PR 11.1): Characters can now be assigned to specific campaigns via `campaign_id`. Characters with NULL campaign_id remain visible across all campaigns for backward compatibility.
- **User-scoped RLS** (PR 10.1): Supabase Row-Level Security now enforces per-user data isolation via `user_id` columns on all user-authored tables.
- **Transaction helper** (PR 8.1): `withTransaction()` helper for atomic multi-step SQLite writes. Character create/update operations are now transactional.
- **Sync mutex** (PR 5.1): Push and pull operations are serialized to prevent overlapping sync operations.

### Fixed

- **Schema parity** (PR 1.1): Added missing `payload_json` column to `action_proposals` in both local and Supabase schemas.
- **Initiative sync** (PR 2.1): Initiative entries now use soft-delete with sync tombstones instead of hard delete, preventing stale data resurrection on pull.
- **Timestamp preservation** (PR 3.1): Encounter updates now preserve original `created_at` timestamps in sync payloads.
- **Soft delete filtering** (PR 4.1): All list queries now consistently filter by `deleted_at IS NULL` (campaigns, sessions, journal entries, AI logs, encounters, initiative entries).
- **Encounter refresh** (PR 6.1): Added `createdAt`/`updatedAt` to Encounter type; `areEncountersEqual` now compares `updatedAt` for proper UI refresh.
- **Duplicate AI logging** (PR 7.1): Removed duplicate `insertAiLog` call from `usePartyProposals` hook (logging handled in orchestrator).
- **Encryption semantics** (PR 9.1): `encryptValue` now treats empty string as null; `decryptValue` uses explicit null/undefined check instead of falsy check.

### Changed

- Sync engine now injects `user_id` from the current session when pushing to Supabase.
- Character queries support optional `campaignId` parameter for filtering.

## [0.1.0] - 2026-01-10

### Added

- Initial release with core features:
  - AI Dungeon Master narration with structured party actions
  - Character Creation Wizard (6-step flow)
  - SRD party creation with point-buy, ancestry bonuses, inventory, and spell tracking
  - Tactical encounter tools: initiative, map studio, journal, exports
  - Offline-first SQLite storage with Supabase sync
  - Local LLM integration (Ollama/LM Studio)
  - Crash recovery snapshots for in-progress encounters
  - Fantasy-luxury UI for long-form solo play
