# LLM Runtime

Tavern Master talks to local LLMs via an OpenAI-compatible API (Ollama or LM Studio). The runtime config is stored per user and includes:

- `base_url` (default `http://localhost:11434` for Ollama)
- `model` (default `llama3.1:8b` or similar)
- `temperature`, `max_tokens`, and `top_p`
- `stream` (enable streaming responses in the UI)

## Roles

- **Dungeon Master**: narration, scene framing, tactical consequences, and rules reminders.
- **Party Controller**: proposes actions for AI-controlled party members (control_mode = `ai`) with SRD references.

## Party Context

- Party rosters are assembled from the Party Sheets roster and only include AI-controlled members.
- If no AI-controlled characters exist, the Party Controller has no roster to act on.

## Approval Flow

1. AI returns structured JSON proposals for each AI-controlled ally.
2. Player approves, edits, or rejects each proposal.
3. Approved actions are resolved via the rules engine before narration.

## Safety & Determinism

- Require JSON output for actions to keep results deterministic.
- Summarize long conversations into `session_summary` every N turns to keep context tight.
- Attempt a single JSON repair pass when output is malformed.

## Settings Storage

- LLM runtime settings are persisted in the local SQLite `app_settings` table.
