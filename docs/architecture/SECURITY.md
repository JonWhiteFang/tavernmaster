# Security Architecture

Tavern Master implements multiple layers of security for user data protection.

## Data Encryption

### At-Rest Encryption

Sensitive content is encrypted before storage using Tauri's keychain-backed crypto:

- **Journal entries**: Content encrypted via `encryptValue()` before SQLite insert
- **AI logs**: Narrative content encrypted before storage
- **Encryption key**: Stored in macOS Keychain, never in app storage

```typescript
// src/app/data/encryption.ts
export async function encryptValue(value: string | null | undefined): Promise<string | null>;
export async function decryptValue(value: string | null | undefined): Promise<string | null>;
```

### Encryption Semantics

- `null` and `undefined` → returns `null` (no encryption)
- Empty string `""` → returns `null` (treated as no value)
- Non-empty string → encrypted via Tauri `encrypt_text` command

## Supabase Row-Level Security (RLS)

### User Isolation

All user-authored tables include a `user_id` column enforcing data isolation:

```sql
-- Policy pattern applied to all tables
create policy "user_owns_tablename"
on public.tablename for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());
```

### Protected Tables

- campaigns, sessions, journal_entries
- characters, character_stats, character_abilities, character_inventory, character_spells
- encounters, initiative_entries, conditions, encounter_conditions
- action_proposals, combat_log
- sync_state, sync_queue, app_settings, ai_logs

### Migration Compatibility

Rows with `NULL` user_id remain accessible during migration from older versions. New rows always have `user_id` set to the current authenticated user.

## Authentication

### Supabase Auth

- Email/password authentication via Supabase Auth
- Session tokens stored in macOS Keychain (not localStorage)
- Automatic token refresh handled by Supabase client

### LLM Credentials

- LLM base URL and model stored in `app_settings` (not sensitive)
- API keys (if required) stored in macOS Keychain via `src/app/data/settings.ts`

## Sync Security

### Transport

- All Supabase communication over HTTPS
- Anon key used for initial connection; RLS enforces access control

### User ID Injection

The sync engine automatically injects the current user's ID when pushing:

```typescript
// src/app/sync/engine.ts
const rowWithUser = { ...row, user_id: sessionData.session.user.id };
```

### Conflict Resolution

- Conflicts detected when local queued change collides with newer remote row
- User must explicitly choose "Keep Local" or "Keep Remote"
- No automatic overwrites of user data

## Local Storage

### SQLite Database

- Location: `tavernmaster.db` in app data directory
- Contains all game state, encrypted content stored as ciphertext
- Soft deletes preserve history (`deleted_at` column)

### What's NOT Stored Locally

- Supabase credentials (in Keychain)
- LLM API keys (in Keychain)
- Encryption keys (in Keychain)

## Tauri Security

### Capabilities

Defined in `src-tauri/capabilities/default.json`:

- File system access (app data only)
- HTTP client (for LLM and Supabase)
- Keychain access (for secure storage)
- SQL plugin (SQLite)

### Rust Commands

Secure operations exposed via Tauri commands in `src-tauri/src/commands.rs`:

- `encrypt_text`: Encrypt plaintext using keychain-stored key
- `decrypt_text`: Decrypt ciphertext using keychain-stored key

## Best Practices

1. **Never log sensitive data**: Encryption keys, tokens, personal content
2. **Use soft deletes**: Preserve sync history, allow recovery
3. **Validate on both ends**: Client-side and RLS policies
4. **Encrypt before sync**: Sensitive content encrypted before leaving device
5. **Keychain for secrets**: Never store credentials in app storage or env vars at runtime
