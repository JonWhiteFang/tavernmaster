# Supabase Sync (Single User)

Sync is designed for one person using multiple Macs. The local SQLite database is authoritative; Supabase mirrors data for portability.

## Strategy

- Use Supabase Auth with a single signed-in user (email/password).
- Push local mutations into `sync_queue` and batch upload on a debounce timer.
- Pull updates by `updated_at`; if a queued local change collides with a newer remote row, record a conflict and require manual resolution.
- Sync operations are serialized via a mutex to prevent overlapping push/pull operations.

## Supabase Schema

- Mirror the local tables with the same primary keys (`TEXT` ids).
- Store timestamps as ISO `TEXT` (`created_at`, `updated_at`) for SQLite parity and stable lexical ordering.
- Include `deleted_at` (`TEXT`, nullable) on user-authored tables for soft deletes.
- `characters` includes `campaign_id`, `control_mode`, `proficiencies_json`, and `ancestry_bonus_json`.
- `character_inventory` and `character_spells` sync SRD ids plus state (quantity, attuned, prepared, slots_used).
- Index `updated_at` (and common foreign keys) for efficient pulls.

Schema lives in `supabase/migrations/20260106160000_schema_mirror.sql`.

## Row-Level Security (RLS)

User data isolation is enforced via RLS policies with `user_id` columns:

- All user-authored tables include a `user_id uuid` column.
- RLS policies enforce `user_id = auth.uid()` for all operations.
- The sync engine automatically injects the current user's ID when pushing data.
- Rows with NULL `user_id` remain accessible during migration (backward compatibility).

RLS migration lives in `supabase/migrations/20260111060000_rls_user_ownership.sql`.

## App Wiring

- Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (e.g. via `.env`).
- Sign in via `Settings → Sync & SRD` to enable background sync.
- Local writes enqueue upserts; sync debounces pushes and polls pulls periodically.
- Conflicts appear in `Settings → Sync & SRD` with "Keep Remote" / "Keep Local".
- Supabase auth session is persisted in the OS keychain (not localStorage).

## Data Integrity

- Soft deletes are used consistently; `deleted_at IS NULL` filters are applied to all list queries.
- Initiative entries use soft-delete with sync tombstones (not hard delete).
- Encounter updates preserve original `created_at` timestamps.
- Multi-step writes (character create/update) use SQLite transactions for atomicity.

## Security

- Long-lived sync credentials (refresh tokens / keys) are stored in the OS keychain via Tauri secure commands.
- Journal and AI log content is encrypted before being stored locally and synced (see `src/app/data/encryption.ts`).
- LLM settings are persisted in the OS keychain (see `src/app/data/settings.ts`).
- Empty strings are preserved (not converted to null) during encryption.

## Status

- ✅ Supabase schema migration with RLS
- ✅ Push/pull with sync mutex
- ✅ Conflict resolution UI
- ✅ Soft delete consistency
- ✅ Transaction support for atomic writes
- ✅ User-scoped RLS policies
