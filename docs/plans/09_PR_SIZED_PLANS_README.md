# TavernMaster — PR-Sized Implementation Plans (Execute in Order)

These PR plans break the larger implementation plans into **small, sequential, reviewable pull requests**.
They are designed for Codex CLI/Kiro to execute reliably with tight acceptance criteria and test gates.

## Execute in this order
1. **10_PR_PLAN_FOUNDATION.md** (PR-001 → PR-006)
2. **11_PR_PLAN_CONTINUITY.md** (PR-007 → PR-012)
3. **12_PR_PLAN_AI_UX.md** (PR-013 → PR-019)
4. **13_PR_PLAN_COMBAT_SRD_SYNC_RELEASE.md** (PR-020 → PR-026)

## Global gates (apply to every PR)
- `npm run lint` passes
- `npm test` passes
- `npm run format:check` passes
- No plaintext secrets stored or logged
- DB writes that affect campaign continuity must be transactional

## Repo anchors (current)
- UI: `src/app/*`
- Persistence: `src/app/data/*` using `@tauri-apps/plugin-sql` (`sqlite:tavernmaster.db`)
- Native/Tauri: `src-tauri/src/main.rs`, `src-tauri/src/commands.rs`
- AI: `src/app/ai/*` (existing) → new engine flow will live in `src/app/engine/*`
