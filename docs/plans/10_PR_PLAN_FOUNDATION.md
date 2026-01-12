# 10 — PR Plan: Foundation (Persistence + Migrations + Backups + Vault + Baseline Tests)
**Covers:** Plan 01 (foundation).  
**PRs:** PR-001 through PR-006.

---

## PR-001 — Introduce Migration Runner (PRAGMA user_version) + Keep Legacy initDatabase Compatible
### Goal
Add a real migration framework without breaking existing installs.

### Files
- **Add** `src/app/data/migrations/README.md`
- **Add** `src/app/data/migrations/0001_baseline.ts` (TS migration that replays the current schemaStatements)
- **Add** `src/app/data/migrate.ts`
- **Update** `src/app/data/db.ts`
- **Update** `src/app/data/db.test.ts`
- **Add** `src/app/data/migrate.test.ts`

### Checklist
- [ ] Implement `getUserVersion(db)` and `setUserVersion(db, version)` using `PRAGMA user_version`.
- [ ] Implement a migration registry: `const migrations = [{ version: 1, name, up(db) }, ...]`.
- [ ] Implement `runMigrations(db)`:
  - [ ] reads `user_version`
  - [ ] runs migrations > current version in order
  - [ ] sets `user_version` after each successful migration
- [ ] Modify `initDatabase()` in `db.ts`:
  - [ ] `await runMigrations(db)` first
  - [ ] then run existing `schemaStatements` only if baseline migration needs it (ensure idempotency)
  - [ ] keep `ensureColumn` for now (deprecated later)
- [ ] Update docs in `migrations/README.md` for how to add a migration.

### Tests (required)
- [ ] `migrate.test.ts`: when `user_version = 0`, runner applies baseline migration and sets `user_version=1`.
- [ ] `migrate.test.ts`: when `user_version=1`, does not re-run baseline.
- [ ] `db.test.ts`: still passes with mocks.

### Acceptance criteria
- Existing tests pass.
- App starts on a clean DB and on a DB with existing tables.

---

## PR-002 — Add Backup/Restore Commands in Tauri + TS Wrapper
### Goal
Enable reliable automatic backups and restores **without relying on JS fs plugins**.

### Files
- **Update** `src-tauri/src/commands.rs`
- **Update** `src-tauri/src/main.rs`
- **Add** `src/app/data/backups.ts`
- **Add** `src/app/data/backups.test.ts`

### Checklist
- [ ] Add Tauri commands:
  - [ ] `get_app_data_dir()` → returns app data directory (string path)
  - [ ] `backup_database(reason: String)` → copies `tavernmaster.db` to `backups/` with timestamp and reason
  - [ ] `list_database_backups()` → returns list of backups (path, createdAt, reason)
  - [ ] `restore_database(backup_path: String)` → replaces current DB with backup
- [ ] Define backup retention: keep last 20; rotate oldest.
- [ ] In TS `backups.ts`, wrap commands with typed functions.
- [ ] Ensure restore is safe:
  - [ ] close DB connection (invalidate cached Database) before restore
  - [ ] after restore, reopen DB and re-run migrations

### Tests (required)
- [ ] TS: `backups.test.ts` mocks `invoke` and asserts correct command calls.
- [ ] TS: ensure restore triggers DB reset hook (export a `resetDatabaseForRestore()` in `db.ts` and test it).

### Acceptance criteria
- Backups can be created and listed from the app runtime.
- Restore flow is possible (UI added in PR-003).

---

## PR-003 — Migration Safety: Auto-Backup Before Migrations + Recovery Screen
### Goal
If a migration fails, restore automatically and show a recovery UI.

### Files
- **Update** `src/app/data/migrate.ts`
- **Add** `src/app/screens/Recovery.tsx`
- **Update** `src/app/App.tsx`
- **Add** `src/app/screens/Recovery.test.tsx`
- **Update** `src/app/data/migrate.test.ts`

### Checklist
- [ ] In `runMigrations()`:
  - [ ] call `backup_database("pre-migration vX→vY")` before each migration
  - [ ] wrap migration in try/catch
  - [ ] on failure, restore backup and throw a structured error
- [ ] Add `Recovery` screen:
  - [ ] explains failure in plain English
  - [ ] offers: Restore latest backup, Open backups folder (if supported), Retry
- [ ] In `App.tsx`, if migration fails, route to `Recovery` screen.

### Tests (required)
- [ ] migration failure test: runner calls restore and surfaces error.
- [ ] Recovery screen renders and buttons call expected handlers.

### Acceptance criteria
- A forced migration error results in restore + recovery UI, not a broken app.

---

## PR-004 — Campaign Player Invariant (1 player character per campaign) + UI Gating
### Goal
Align data model with product truth: player controls exactly one party member.

### Files
- **Add** migration `0002_campaign_player_and_state.sql` (or TS migration) under `src/app/data/migrations/`
- **Add** `src/app/data/campaign_player.ts`
- **Update** `src/app/data/characters.ts`
- **Update** `src/app/screens/Dashboard.tsx`
- **Update** `src/app/screens/PartySheets.tsx`
- **Add** tests:
  - `src/app/data/campaign_player.test.ts`
  - `src/app/data/characters.test.ts` (extend)
  - `src/app/screens/Dashboard.test.tsx` (extend)

### Checklist
- [ ] Add table `campaign_player(campaign_id PK, player_character_id, updated_at)`.
- [ ] Add table `campaign_state` (minimal fields for now; enriched later).
- [ ] Implement `getPlayerCharacterId()` and `setPlayerCharacter()` transactional.
- [ ] Modify character listing:
  - [ ] normal mode lists characters strictly by campaign_id
  - [ ] treat `campaign_id IS NULL` as legacy; provide a one-time attach/cleanup path (migration helper).
- [ ] UI gating:
  - [ ] “Play/Continue” disabled until player character selected
  - [ ] provide a “Choose your character” prompt that opens Party Sheets selection.

### Tests (required)
- [ ] Can’t start play without campaign_player set.
- [ ] Setting player character overwrites previous value safely (one row per campaign).
- [ ] Dashboard CTA changes appropriately.

### Acceptance criteria
- A campaign can only have one player-controlled character in normal flow.

---

## PR-005 — Vault Passphrase + Wrapped Data Key (Portability without weakening encryption)
### Goal
Make encrypted campaign data portable across device restores via an explicit Vault passphrase.

### Files
- **Add** migration `0003_crypto_meta.sql`
- **Update** `src-tauri/src/commands.rs`
- **Update** `src-tauri/src/main.rs`
- **Update** `src/app/data/encryption.ts`
- **Update** `src/app/data/settings.ts` (if it stores secrets)
- **Add** `src/app/screens/VaultSettings.tsx` (minimal UI)
- **Add** tests:
  - `src/app/data/encryption.test.ts` (extend)
  - `src-tauri/src/commands_tests.rs` (add Rust unit tests if feasible)

### Checklist
- [ ] Add table `crypto_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)`.
- [ ] Implement in Rust:
  - [ ] generate random `data_key` if none exists
  - [ ] derive wrapping key from passphrase using Argon2id (store salt + params in kdf_params)
  - [ ] wrap/unwrap `data_key` via AES-GCM, store `wrapped_data_key`
- [ ] Keep keychain as a cache, but DB+passphrase as the durable source.
- [ ] Update TS encryption helper to request the active data key from Tauri commands.
- [ ] Add Vault UI:
  - [ ] set passphrase
  - [ ] rotate passphrase (rewrap only)
  - [ ] export recovery bundle hook (actual export in later PRs)

### Tests (required)
- [ ] Rust: wrap/unwrap roundtrip with fixed vectors.
- [ ] TS: encrypt/decrypt roundtrip remains valid across app reload (mocked invoke).

### Acceptance criteria
- Copying DB + wrapped key + knowing passphrase allows decrypting logs on a fresh install (completed fully in export/import PRs later).

---

## PR-006 — Indexing + FTS Foundation (Search Index Table)
### Goal
Prevent performance cliffs as campaigns grow.

### Files
- **Add** migration `0004_indices_and_search.sql`
- **Update** `src/app/data/schema.test.ts`
- **Add** `src/app/data/search_index.ts`
- **Add** `src/app/data/search_index.test.ts`

### Checklist
- [ ] Add indices:
  - [ ] `ai_logs(campaign_id, session_id, created_at)`
  - [ ] `sessions(campaign_id, started_at, created_at)`
  - [ ] `combat_log(encounter_id, created_at)`
- [ ] Add FTS5 table `search_index` with triggers or explicit upsert functions.
- [ ] Index: session recap + journal entries + summary logs (initial scope).

### Tests (required)
- [ ] SQL executed includes CREATE INDEX statements.
- [ ] search_index upsert/list/search behaviors.

### Acceptance criteria
- Timeline/search queries do not degrade with large datasets (basic smoke tests in unit harness).

