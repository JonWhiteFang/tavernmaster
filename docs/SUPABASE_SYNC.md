# Supabase Sync (Single User)

Sync is designed for one person using multiple Macs. The local SQLite database is authoritative; Supabase mirrors data for portability.

## Strategy

- Use Supabase Auth with a single signed-in user (email/password).
- Push local mutations into `sync_queue` and batch upload on a debounce timer.
- Pull updates by `updated_at` and resolve conflicts by latest timestamp, with a manual override screen.

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

## Security

- Plan to store long-lived sync credentials (refresh tokens / keys) in the OS keychain via the Tauri secure commands.
- Journal and AI log content is encrypted before being stored locally and synced (see `src/app/data/encryption.ts`).

## Status

- Supabase schema migration and baseline push/pull are in place; conflict UI and keychain-backed credentials are still pending.
