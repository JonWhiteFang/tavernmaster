# Tavern Master User Guide

Tavern Master is a Mac desktop app for solo 5e (SRD-only) play: offline-first local SQLite, optional single-user Supabase sync, and a local OpenAI-compatible LLM runtime (Ollama or LM Studio).

## Install

Prereqs:

- Node.js 20+
- Rust toolchain (for Tauri builds)

Install dependencies:

```bash
npm install
```

## Run (Dev)

```bash
npm run tauri:dev
```

## Build (Local)

```bash
npm run tauri:build
```

## Party Sheets & Character Creation

Party creation happens in `Party Sheets`. Each party member is created individually and can be set to either player- or AI-controlled.

### Create a party member

1. Open `Party Sheets`.
2. Click `Create Character`.
3. Fill out the core identity fields (name, controller, role, class, level, ancestry, background, alignment).

### Ability Scores (SRD Point Buy)

- Use the SRD point-buy system (27 points total; scores 8-15).
- The UI shows points remaining and prevents saving if you exceed budget.
- Ancestry bonuses apply on top of your base scores.
- Flexible ancestry bonuses (ex: Half-Elf) require selecting distinct ability options.

### Derived Stats

- By default, hit points, AC, initiative, and speed auto-calculate from SRD defaults:
  - HP uses the class hit die and average rolls (level 1 max, later levels average).
  - AC and initiative use Dexterity modifier.
  - Speed comes from ancestry.
- Disable auto-calc if you want manual overrides.
- Use `Recalculate Stats` to snap back to SRD defaults.

### Inventory & Spells

- Add SRD items and set quantity + attunement.
- Add SRD spells, mark them prepared, and track slots used.

### Proficiencies

- Enter a comma-separated list (skills, tools, languages, etc.).

### Edit, Delete, and Control

- Select a character in the roster, then `Edit` to update their sheet.
- Toggle controller between `Player` and `AI` during creation or in edits.
- `Delete` soft-removes the character (kept for sync history).

### Campaign Gating

- `Start/Continue Campaign` is disabled until at least one party member exists.
- The AI Director only uses AI-controlled party members for proposals.

## Local LLM Setup

Tavern Master talks to an OpenAI-compatible HTTP endpoint.

- Ollama: `http://localhost:11434` (default)
- LM Studio: enable the OpenAI-compatible server and use its base URL

In-app: `Settings → LLM Runtime`

- Base URL: your local server URL
- Model: e.g. `llama3.1:8b`

## Supabase Sync (Single User)

Sync is optional. If configured, Tavern Master pushes local changes and pulls remote changes in the background. Conflicts are detected when a local queued change collides with a newer remote row.

### 1) Create a Supabase project

- Create a new Supabase project.
- Enable email/password auth for your user.

### 2) Apply the schema migration

Run the SQL migration in the Supabase SQL editor:

- `supabase/migrations/20260106160000_schema_mirror.sql`

### 3) Configure env vars

Create a `.env` (or set env vars in your shell):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

See `.env.example` for the full list.

### 4) Sign in

In-app: `Settings → Sync & SRD`

- Enter email + password
- Click `Sign In`

The Supabase auth session is persisted in the OS keychain.

### Conflicts

If a conflict is detected, it appears in `Settings → Sync & SRD`.

- `Keep Remote`: apply the remote row locally and discard the pending local queued op
- `Keep Local`: keep your pending local op and push it on the next sync

## Data & Safety Notes

- Your local database remains the source of truth.
- Journal and AI log content is encrypted before being stored locally and synced.
- Back up your local database file if you’re doing active playtesting.

## Troubleshooting

- Sync shows “Supabase not configured”: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Sync shows “Not signed in”: sign in in `Settings → Sync & SRD`.
- LLM connection fails: confirm the base URL is reachable and the model exists on your local runtime.
