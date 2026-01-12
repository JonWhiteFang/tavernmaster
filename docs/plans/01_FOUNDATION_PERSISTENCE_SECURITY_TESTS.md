
# Plan 01 — Foundation: Versioned Persistence, Security, Backups, Tests

## Goal
Make TavernMaster safe for **years-long campaigns** before any UX overhaul:
- Versioned schema migrations (no fragile ad-hoc drift)
- Automatic backups + restore
- Secure, portable encryption (keychain is not the only source of truth)
- Enforce product truth: **exactly one player-controlled character per campaign**
- Add a real test harness (TS + Rust)

This plan is **mandatory** because every later feature depends on durable storage.

---

## A. Schema migrations (replace ad-hoc evolution)

### A1) Add schema version tracking
**Target:** `src/app/data/db.ts`, new `src/app/data/migrate.ts`

Implement a migration runner using `PRAGMA user_version`.

**Required behavior**
- Determine current version via `PRAGMA user_version`.
- Apply migrations in order (N+1...latest).
- Wrap each migration in a transaction.
- Before applying each migration, create a DB backup (see Section B).
- If a migration fails: restore backup, mark failure in logs, show a Recovery screen.

**Files**
- New: `src/app/data/migrations/0001_baseline.sql`
  - Baseline = current schema in `src/app/data/schema.ts` (copy SQL statements to one canonical baseline file).
- New: `src/app/data/migrations/0002_campaign_state_and_player.sql`
- New: `src/app/data/migrate.ts`
- Update: `src/app/data/init.ts` to ensure migrations run before seeding.

**Remove/retire**
- Phase out `ensureColumn()` as the primary evolution mechanism.
  - Keep only for one-time compatibility shims if needed (and add tests).

### A2) Migration authoring rules
- Migrations are append-only.
- Never edit past migrations once released.
- Every migration includes:
  - forward SQL
  - a rollback SQL section if feasible, else a documented rollback step relying on backup restore.

---

## B. Backups, restore, and safe failure modes

### B1) Implement DB file discovery + backup storage
**Targets:** `src-tauri/src/commands.rs`, new `src/app/data/backups.ts`

**Requirements**
- Determine the actual DB path used by `@tauri-apps/plugin-sql`.
- Create backups in:
  - `~/Library/Application Support/com.tavernmaster.app/backups/`
- Keep last 20 backups (rotate).
- Backups are timestamped and include:
  - schema version
  - app version
  - reason

**Implementation approach**
- Add Tauri command: `get_app_data_dir()` (and optionally `get_db_path()` if plugin path is stable).
- In TS: copy DB file to backups folder using `@tauri-apps/plugin-fs`.

### B2) Add a Recovery UI
**Targets:** new `src/app/screens/Recovery.tsx`, update `src/app/App.tsx`

If migration or DB open fails:
- Show Recovery screen with:
  - last error
  - list of backups
  - Restore button
  - “Open backups folder”
  - “Retry”

---

## C. Encryption that survives export/restore (vault passphrase)

### C1) Current risk
Encrypted content (e.g., `ai_logs.content`) uses a key stored in the macOS keychain. Copying the DB to another machine/user can make logs undecryptable.

### C2) Required solution
Introduce a **Vault Passphrase**:
- Generate a random **data key** used for encrypting DB fields.
- Store data key in keychain for convenience.
- Also store a **wrapped** version of the data key in DB, encrypted with a key derived from the passphrase (Argon2id preferred).
- Exports/backups can include the wrapped key so another device can restore by entering the passphrase.

### C3) New table
Migration adds `crypto_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)`
Store:
- `wrapped_data_key`
- `kdf_params_json`
- `key_version`

### C4) Tauri commands
**Targets:** `src-tauri/src/commands.rs`
Add commands:
- `crypto_init_or_load()` → ensures data key exists, returns status
- `crypto_set_passphrase(passphrase)` → wraps and stores in `crypto_meta`
- `crypto_unlock(passphrase)` → unwraps and caches key
- `crypto_rotate_passphrase(old, new)`
- Update existing `encrypt/decrypt` commands to use unlocked data key

### C5) Settings UI (minimal, not the big UX pass)
**Targets:** `src/app/screens/Settings.tsx`
Add “Vault” section:
- Set/Change Passphrase
- Export Recovery Bundle (writes backup + wrapped key metadata)
- Show “Vault locked/unlocked” status

---

## D. Enforce product truth: 1 player character per campaign

### D1) Add campaign state + player mapping tables
Migration adds:
- `campaign_state(campaign_id PK, mode, active_session_id, active_encounter_id, current_scene_title, current_scene_summary, last_turn_id, updated_at)`
- `campaign_player(campaign_id PK, player_character_id NOT NULL, updated_at)`

### D2) Data access modules
Create:
- `src/app/data/campaign_state.ts`
- `src/app/data/campaign_player.ts`

Update:
- `src/app/data/characters.ts`
  - stop treating `campaign_id IS NULL` characters as “normal play”
  - add helpers: `getPlayerCharacter(campaignId)`, `listCompanions(campaignId)`

### D3) UI gating
Update:
- `src/app/screens/Dashboard.tsx`
- `src/app/screens/TitleScreen.tsx`

Rules:
- “Play” is disabled until a campaign has:
  - a selected session (or auto-create)
  - a player character

---

## E. Scalability baseline (indices + FTS foundations)

### E1) Add indices for long campaigns
Migration adds:
- `ai_logs(campaign_id, session_id, created_at)`
- `sessions(campaign_id, created_at)`
- `combat_log(encounter_id, created_at)`
- indices on `deleted_at` where filtered heavily

### E2) Add minimal FTS search index
Create FTS5 virtual table:
- `search_index(entity_type, entity_id, campaign_id, text)`

Index initially:
- session recap
- journal entries
- summary logs

(Plans 02/03 expand to turns, quests, NPCs.)

---

## F. Tests (mandatory baseline)

### F1) Tooling
Add/ensure:
- `vitest` + `@testing-library/react`
- deterministic DB test utilities (temp file DB)
- fetch mocking for AI calls

### F2) Required test suites
- `migrations.test.ts`: version upgrades, failure rollback
- `backups.test.ts`: create/list/restore
- `crypto.test.ts`: wrap/unwrap + encrypt/decrypt roundtrip (mock invoke)
- `campaign_player_invariant.test.ts`: single player per campaign

### F3) Rust tests
- Unit tests for key wrapping/unwrapping (fixed vectors)

---

## Acceptance criteria
- Existing DBs migrate safely or recover with restore.
- Backups are created automatically and restorable.
- Encrypted logs remain readable after export/import using passphrase.
- App refuses to start “play” without a player character.
- Tests pass in CI and locally.
