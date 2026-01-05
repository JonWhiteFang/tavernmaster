# LLM Runtime

Tavern Master talks to local LLMs via an OpenAI-compatible API (Ollama or LM Studio). The runtime config is stored per user and includes:

- `base_url` (default `http://localhost:11434` for Ollama)
- `model` (default `llama3.1:8b` or similar)
- `temperature`, `max_tokens`, and `top_p`

## Roles

- **Dungeon Master**: narration, scene framing, tactical consequences, and rules reminders.
- **Party Controller**: proposes actions for non-player party members with SRD references.

## Approval Flow

1. AI returns structured JSON proposals for each ally.
2. Player approves, edits, or rejects each proposal.
3. Approved actions are resolved via the rules engine before narration.

## Safety & Determinism

- Require JSON output for actions to keep results deterministic.
- Summarize long conversations into `session_summary` every N turns to keep context tight.
