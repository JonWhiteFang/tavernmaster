# Repository Guidelines

Tavern Master is a Mac desktop app built with Tauri (Rust host shell) and a React + TypeScript frontend. The app is offline-first with local SQLite, single-user Supabase sync, and an OpenAI-compatible local LLM runtime (Ollama or LM Studio).

## Clarifying Questions (Required)

Before making any file changes, running commands, or proposing a detailed implementation, you MUST:

1. **Assess ambiguity** in the user’s prompt/task and decide whether you have enough information to proceed safely and correctly.
2. If anything is unclear, **ask clarifying questions first** and wait for answers. Do NOT guess.

### You MUST ask clarifying questions when any of the following are true

- **Goal ambiguity:** the desired outcome, scope, or definition of “done” isn’t explicit.
- **Constraints missing:** you don’t know key constraints (time, performance, compatibility, dependencies, style, security).
- **Environment uncertainty:** OS, toolchain, versions, build/test commands, credentials, or access assumptions matter.
- **Risk of destructive changes:** refactors, migrations, deletes, renames, or large-scale formatting could be unintended.
- **Multiple valid approaches:** there are competing solutions with meaningful tradeoffs (you must ask which the user prefers).
- **Unknown acceptance criteria:** you can’t tell how success will be verified (tests, lint, output format, UX, etc.).
- **External API/behavior assumptions:** you would need to assume undocumented behavior, third-party service details, or data formats.

### Clarifying Questions Format

When questions are needed, respond with:

- A one-sentence summary of what you believe the user wants.
- A **numbered list** of concise questions (aim for 1–5).
- (Optional) The **default assumption** you would use _if the user explicitly tells you to proceed without answers_.

### If no questions are needed

State: **“No clarifying questions needed.”** Then:

- Briefly restate the task in your own words.
- Propose a short plan (3–7 bullets).
- Proceed with implementation.

### Do NOT proceed if questions are pending

Until the user answers the clarifying questions, do not:

- Edit files
- Run commands
- Create commits/PRs
- Generate large code changes

(You may still inspect/read files to understand context if allowed by the environment.)

## Project Structure & Module Organization

- `src/`: React entry point and UI code.
- `src/app/`: Screens (`screens/`), reusable UI (`ui/`), AI prompts (`ai/`), rules helpers (`rules/`), sync (`sync/`), and state (`state/`).
- `src/styles/`: Theme tokens and layout styles for the fantasy-luxury UI.
- `src/assets/`: Fonts and static assets (licensed fonts go in `src/assets/fonts/`).
- `src-tauri/`: Rust host app and Tauri config.
- `docs/`: Architecture, data model, LLM runtime, sync strategy, and UI style notes.
- `IMPLEMENTATION_PLAN.md`: living checklist for current progress and next steps.

## Build, Test, and Development Commands

- `npm install`: install frontend dependencies.
- `npm run dev`: run the Vite dev server.
- `npm run build`: build the frontend bundle.
- `npm run format:check`: verify formatting.
- `npm run tauri:dev`: run the desktop app in dev mode.
- `npm run tauri:build`: build the desktop app bundle.

## Coding Style & Naming Conventions

- Indentation: 2 spaces for TS/TSX/CSS/JSON/Markdown; Rust follows rustfmt defaults.
- Naming: `PascalCase` for React components and files; `camelCase` for variables; `kebab-case` for CSS class names.
- Keep UI components small and composable; shared types live in `src/app/data/`.
- Use SRD-only naming for rules data and avoid non-SRD content.

## Testing Guidelines

- Use `npm run test` (Vitest) for unit checks.
- Place unit tests near modules and name them `*.test.ts` or `*.test.tsx`.
- Prioritize rules engine tests first (dice, conditions, action validation, initiative).

## Commit & Pull Request Guidelines

- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`.
- PRs should include a brief summary, test results (or "not run"), and screenshots for UI changes.

## Configuration & Secrets

- Store local configuration in `.env` files and keep Supabase keys and LLM URLs out of Git.
- Use the OS keychain for the single-user sync key once implemented.

## Codex CLI Workflow

- Definition of done: require `npm run lint`, `npm run test`, and `npm run format:check`, plus updating `IMPLEMENTATION_PLAN.md` when scope changes.
- Context continuity: use `codex resume` / `codex resume --last` for ongoing work.
- Prompting style: include goal, constraints, acceptance criteria; ask for a plan before execution when tasks are non-trivial.
