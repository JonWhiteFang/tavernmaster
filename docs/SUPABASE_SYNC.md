# Supabase Sync (Single User)

Sync is designed for one person using multiple Macs. The local SQLite database is authoritative; Supabase mirrors data for portability.

## Strategy

- Use a single `user_key` stored in the OS keychain.
- Push local mutations into `sync_queue` and batch upload on a debounce timer.
- Pull updates by `updated_at` and resolve conflicts by latest timestamp, with a manual override screen.

## Supabase Schema

- Mirror the local tables with the same primary keys.
- Include `deleted_at` for soft deletes.
- Add an indexed `updated_at` column for efficient pulls.

## Security

- Never store the `user_key` in plaintext. Use the OS keychain via the Tauri secure command.
- Consider encrypting journal and narrative logs at rest.

## Status

- Local tables (`sync_state`, `sync_queue`) exist, but remote mirroring and conflict UI are still pending.
