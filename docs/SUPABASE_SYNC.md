# Supabase Sync (Single User)

Sync is designed for one person using multiple Macs. The local SQLite database is authoritative; Supabase mirrors data for portability.

## Strategy

- Use a single `user_key` stored in the OS keychain.
- Push local mutations into `sync_queue` and batch upload on a debounce timer.
- Pull updates by `updated_at` and resolve conflicts by latest timestamp, with a manual override screen.

## Supabase Schema

- Mirror the local tables with the same primary keys (`TEXT` ids).
- Store timestamps as ISO `TEXT` (`created_at`, `updated_at`) for SQLite parity and stable lexical ordering.
- Include `deleted_at` (`TEXT`, nullable) on user-authored tables for soft deletes.
- Index `updated_at` (and common foreign keys) for efficient pulls.
- Apply RLS with authenticated-only access (single-user assumption).

Schema lives in `supabase/migrations/20260106160000_schema_mirror.sql`.

## Security

- Never store the `user_key` in plaintext. Use the OS keychain via the Tauri secure command.
- Consider encrypting journal and narrative logs at rest.

## Status

- Supabase schema migration exists; push/pull and conflict UI are still pending.
