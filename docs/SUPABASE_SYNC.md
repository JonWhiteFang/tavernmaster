# Supabase Sync (Single User)

Sync is designed for one person using multiple Macs. The local SQLite database is authoritative; Supabase mirrors data for portability.

## Strategy

- Use Supabase Auth with a single signed-in user (email/password).
- Push local mutations into `sync_queue` and batch upload on a debounce timer.
- Pull updates by `updated_at`; if a queued local change collides with a newer remote row, record a conflict and require manual resolution.

## Supabase Schema

- Mirror the local tables with the same primary keys (`TEXT` ids).
- Store timestamps as ISO `TEXT` (`created_at`, `updated_at`) for SQLite parity and stable lexical ordering.
- Include `deleted_at` (`TEXT`, nullable) on user-authored tables for soft deletes.
- Index `updated_at` (and common foreign keys) for efficient pulls.
- Apply RLS with authenticated-only access (single-user assumption).

Schema lives in `supabase/migrations/20260106160000_schema_mirror.sql`.

## App Wiring

- Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (e.g. via `.env`).
- Sign in via `Settings → Sync & SRD` to enable background sync.
- Local writes enqueue upserts; sync debounces pushes and polls pulls periodically.
- Conflicts appear in `Settings → Sync & SRD` with “Keep Remote” / “Keep Local”.

## Security

- Plan to store long-lived sync credentials (refresh tokens / keys) in the OS keychain via the Tauri secure commands.
- Journal and AI log content is encrypted before being stored locally and synced (see `src/app/data/encryption.ts`).

## Status

- Supabase schema migration, push/pull, and conflict resolution UI are in place; keychain-backed credentials are still pending.
