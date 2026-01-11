# Contributing to Tavern Master

## Development Setup

```bash
# Install dependencies
npm install

# Run dev server (frontend only)
npm run dev

# Run desktop app in dev mode
npm run tauri:dev
```

## Code Quality

Before submitting changes, ensure all checks pass:

```bash
npm run lint          # ESLint
npm run format:check  # Prettier
npm run test          # Vitest (256 tests)
npm run build         # Production build
```

## Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `chore:` Maintenance tasks
- `refactor:` Code refactoring (no behavior change)
- `test:` Test additions/changes

Examples:

```
feat: add campaign-scoped characters
fix(sync): prevent overlapping push/pull operations
docs: update architecture for RLS changes
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make changes with clear, atomic commits
3. Ensure all checks pass locally
4. Update relevant documentation
5. Update `CHANGELOG.md` under `[Unreleased]`
6. Submit PR with description of changes

## Testing Guidelines

- Place tests next to source files: `foo.ts` → `foo.test.ts`
- Use Vitest with React Testing Library for components
- Mock external dependencies (database, Supabase, Tauri APIs)
- Test files should include the `withTransaction` mock when testing data layer:

```typescript
vi.mock("./db", () => ({
  getDatabase: async () => fakeDb,
  withTransaction: async <T>(fn: (db: FakeDb) => Promise<T>): Promise<T> => fn(fakeDb)
}));
```

## Architecture Notes

- **Offline-first**: SQLite is the source of truth; Supabase mirrors for sync
- **Soft deletes**: Use `deleted_at` column, never hard delete synced data
- **Transactions**: Wrap multi-step writes in `withTransaction()`
- **Sync mutex**: Push/pull operations are serialized automatically

## File Organization

```
src/app/
├── ai/           # LLM orchestration, prompts, parsing
├── characterCreation/  # Wizard state machine
├── data/         # SQLite repositories, types
├── hooks/        # React hooks
├── layout/       # Shell components (sidebar, topbar)
├── rules/        # 5e SRD rules engine
├── screens/      # Page components
├── state/        # App context, store
├── sync/         # Supabase sync engine
├── test/         # Test utilities, fakes
├── tutorial/     # Tutorial steps
└── ui/           # Reusable UI components
```

## SRD Content

- All game content must be SRD-only (no proprietary D&D content)
- SRD data lives in `src/assets/srd/srd.json`
- Reference: [5e SRD](https://dnd.wizards.com/resources/systems-reference-document)
