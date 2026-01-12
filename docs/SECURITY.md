# Security Model

TavernMaster is designed for offline-first solo play with optional cloud sync. This document describes the security architecture and threat model.

## Data at Rest

### Local SQLite Database

- Campaign data stored in `tavernmaster.db` in the app data directory
- Sensitive fields (recaps, summaries, journal content) encrypted with AES-GCM
- Encryption key derived from user passphrase using Argon2id

### Vault System

- Master key wrapped with passphrase-derived key
- Wrapped key stored in `crypto_meta` table
- Passphrase never persisted (entered on unlock, held in memory only)
- Key material cleared on app close or explicit lock

### macOS Keychain

- Session tokens cached in Keychain for convenience
- Keychain access requires user authentication
- Tokens have limited lifetime

## Data in Transit

### LLM Communication

- Requests to local LLM (Ollama/LM Studio) over localhost
- No campaign data sent to external services by default
- API keys stored in app settings, redacted from logs

### Supabase Sync (Optional)

- HTTPS for all sync traffic
- Row-level security on Supabase tables
- Encrypted fields remain encrypted during sync
- Auth tokens stored in Keychain, not localStorage

## Logging

### Redaction

All logs automatically redact:

- JWT tokens
- API keys
- Passwords
- Wrapped keys
- Other secret patterns

### What's Logged

- App lifecycle events
- Error messages (redacted)
- Sync status changes

### What's NOT Logged

- Full prompt/response content
- Decrypted field values
- User passphrases
- Raw key material

## Threat Model

### In Scope

- Protecting campaign data from casual access
- Preventing accidental secret exposure in logs
- Secure sync to user's own Supabase instance

### Out of Scope

- Protection against malware with full system access
- Protection against physical device theft (use FileVault)
- Multi-user access control (single-user app)

## Best Practices

1. **Enable FileVault** on macOS for full-disk encryption
2. **Use a strong vault passphrase** (12+ characters)
3. **Don't share database files** without re-encrypting
4. **Review exported bundles** before sharing (they may contain campaign secrets)

## Incident Response

If you suspect a security issue:

1. Lock the vault immediately
2. Change your Supabase credentials if sync was enabled
3. Report issues via GitHub (do not include sensitive data)
