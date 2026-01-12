# 13 — PR Plan: Combat Completion + Progression + SRD + Export/Import + Sync + Release Hardening

**Covers:** Plan 05.  
**PRs:** PR-020 through PR-026.

---

## PR-020 — Combat Runner: Apply Combat Patch + Integrated Combat Mode in PlayView

### Goal

Combat is playable end-to-end in the main PlayView.

### Files

- **Add** `src/app/engine/combat/types.ts`
- **Add** `src/app/engine/combat/runner.ts`
- **Update** `src/app/screens/PlayView.tsx`
- **Update** `src/app/rules/*` (expand validators)
- **Add** tests: `combatRunner.test.ts`, PlayView combat tests

### Checklist

- [x] Define `CombatPatch` schema for TurnResponse.
- [ ] Validate and apply combat patch:
  - [x] initiative order
  - [x] HP/conditions/resources
  - [x] turn progression
- [ ] PlayView:
  - show “My turn” actions
  - auto-resolve AI turns quickly with short narration
- [ ] EncounterFlow becomes “Combat Debugger” (dev mode only).

### Acceptance criteria

- A full combat can run without leaving PlayView.

---

## PR-021 — Loot/Inventory/Leveling: AI-suggested, Player-approved, Persisted

### Goal

Between-session progression is durable and low-friction.

### Files

- **Update** `src/app/data/characters.ts` and related tables
- **Add** `src/app/engine/progression/levelUp.ts`
- **Add** `src/app/ui/LevelUpWizard.tsx`
- **Add** tests: progression unit tests + UI tests

### Checklist

- [ ] Inventory diffs applied via state patches (transactional).
- [ ] Level-up:
  - AI proposes choices
  - player approves in wizard
  - state + character tables updated

### Acceptance criteria

- Leveling works and survives reload; history is recorded in turns.

---

## PR-022 — SRD: Completeness Verification + FTS Search + Rules Links

### Goal

SRD reference is fast, complete, and linkable from mechanics.

### Files

- **Update** `src/app/data/srdSync.ts`
- **Update** `scripts/srd/verify.ts`
- **Add** migration `0009_srd_fts.sql`
- **Update** `src/app/screens/SrdBrowser.tsx`
- **Add** tests: verify script tests + search tests

### Checklist

- [ ] Add FTS virtual table for SRD entries and triggers.
- [ ] Ensure verify script asserts expected SRD types and minimum counts.
- [ ] Mechanics `rules_refs` deep link into SRD Browser.

### Acceptance criteria

- SRD search is instant and reliable.

---

## PR-023 — Campaign Bundles: Export/Import + Recovery Bundle (DB subset + wrapped key)

### Goal

Reliable long-term backups and portability.

### Files

- **Add** `src/app/engine/importExport/bundles.ts`
- **Update** `src/app/screens/Dashboard.tsx` (Export/Import UI)
- **Update** `src/app/data/backups.ts` (bundle support)
- **Add** tests: export/import roundtrip (mocked fs/commands)

### Checklist

- [ ] Export bundle includes:
  - schema version
  - app version
  - wrapped key material
  - campaign data (either full DB or campaign subset)
- [ ] Import validates versions and offers conflict-safe restore (new campaign id).

### Acceptance criteria

- Export → Import restores encrypted data and state.

---

## PR-024 — Optional Sync: New Tables + Crypto Meta + Conflict Resolution UI (Dev-hidden)

### Goal

Sync is robust and doesn’t break encryption.

### Files

- **Update** `src/app/sync/tables.ts`
- **Update** `src/app/sync/engine.ts`
- **Add** `src/app/screens/SyncConflicts.tsx` (dev-only)
- **Add** tests: simulated conflict tests

### Checklist

- [ ] Sync canon/turn/state tables.
- [ ] Sync crypto_meta safely.
- [ ] Conflicts surfaced and resolvable (keep local / keep remote / merge notes).

### Acceptance criteria

- Offline-first remains; sync doesn’t corrupt campaigns.

---

## PR-025 — Security Hardening: Logging Redaction, Secret Handling, Threat Model Checks

### Goal

Be safe by default.

### Files

- **Update** `src/app/*` (logging)
- **Update** `src/app/sync/*` (token handling)
- **Update** `src-tauri/src/commands.rs` (avoid leaking secrets)
- **Add** tests: security checks

### Checklist

- [ ] Redact secrets from logs (baseUrl tokens, supabase session, wrapped keys).
- [ ] Never persist vault passphrase.
- [ ] Audit localStorage usage (remove MapStudio tokenCounts persistence or migrate to DB).
- [ ] Add a security doc: `docs/SECURITY.md` describing storage and threat model.

### Acceptance criteria

- No secrets in logs; encrypted fields remain encrypted at rest.

---

## PR-026 — Release Quality Gates: CI, Coverage, Regression Packs, Rollback Validation

### Goal

“Complete app” quality bar.

### Files

- **Add/Update** CI config (repo-specific; e.g. `.github/workflows/ci.yml`)
- **Add** `scripts/regression/run_story_sim.ts` (simulates 200 turns with mocked model)
- **Update** tests across engine/UI
- **Add** `docs/ROLLBACK.md`

### Checklist

- [ ] CI runs lint, test, format:check, SRD verify.
- [ ] Regression sim runs and ensures:
  - state doc bounded size
  - canon summaries compact
  - undo/branch/retcon stable
- [ ] Rollback procedure tested: restore from backup and continue.

### Acceptance criteria

- A PR cannot merge unless all quality gates pass.
