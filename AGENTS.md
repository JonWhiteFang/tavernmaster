# Repository Guidelines

Tavern Master is a Mac desktop app built with Tauri (Rust host shell) and a React + TypeScript frontend. The app is offline-first with local SQLite, single-user Supabase sync, and an OpenAI-compatible local LLM runtime (Ollama or LM Studio).

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
- `npm run tauri:dev`: run the desktop app in dev mode.
- `npm run tauri:build`: build the desktop app bundle.

## Coding Style & Naming Conventions

- Indentation: 2 spaces for TS/TSX/CSS/JSON/Markdown; Rust follows rustfmt defaults.
- Naming: `PascalCase` for React components and files; `camelCase` for variables; `kebab-case` for CSS class names.
- Keep UI components small and composable; shared types live in `src/app/data/`.
- Use SRD-only naming for rules data and avoid non-SRD content.

## Testing Guidelines

- Tests are not set up yet. When added, place unit tests near modules and name them `*.test.ts` or `*.test.tsx`.
- Prioritize rules engine tests first (dice, conditions, action validation, initiative).

## Commit & Pull Request Guidelines

- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`.
- PRs should include a brief summary, test results (or "not run"), and screenshots for UI changes.

## Configuration & Secrets

- Store local configuration in `.env` files and keep Supabase keys and LLM URLs out of Git.
- Use the OS keychain for the single-user sync key once implemented.
