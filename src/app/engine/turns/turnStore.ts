import { withTransaction, getDatabase } from "../../data/db";
import type { CampaignStateDoc } from "../state/types";
import type { GameMode } from "../state/types";

export interface Turn {
  id: string;
  campaignId: string;
  sessionId: string | null;
  turnNumber: number;
  playerInput: string;
  aiOutput: string;
  mode: GameMode;
  createdAt: string;
}

export interface AppendTurnInput {
  campaignId: string;
  sessionId?: string;
  playerInput: string;
  aiOutput: string;
  mode: GameMode;
  stateDoc: CampaignStateDoc;
}

interface TurnRow {
  id: string;
  campaign_id: string;
  session_id: string | null;
  turn_number: number;
  player_input: string;
  ai_output: string;
  mode: string;
  created_at: string;
}

export async function appendTurn(input: AppendTurnInput): Promise<Turn> {
  const id = crypto.randomUUID();
  const snapshotId = crypto.randomUUID();
  const now = new Date().toISOString();

  await withTransaction(async (db) => {
    // Get current turn count
    const countRows = await db.select<{ cnt: number }[]>(
      "SELECT COUNT(*) as cnt FROM turns WHERE campaign_id = ?",
      [input.campaignId]
    );
    const turnNumber = (countRows[0]?.cnt ?? 0) + 1;

    // Insert turn
    await db.execute(
      `INSERT INTO turns (id, campaign_id, session_id, turn_number, player_input, ai_output, mode, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.campaignId,
        input.sessionId ?? null,
        turnNumber,
        input.playerInput,
        input.aiOutput,
        input.mode,
        now
      ]
    );

    // Insert snapshot
    const stateJson = JSON.stringify(input.stateDoc);
    await db.execute(
      `INSERT INTO turn_state_snapshots (id, turn_id, state_json, created_at)
       VALUES (?, ?, ?, ?)`,
      [snapshotId, id, stateJson, now]
    );

    // Update campaign_state
    await db.execute(
      `INSERT INTO campaign_state (campaign_id, state_json, current_scene, turn_count, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(campaign_id) DO UPDATE SET
         state_json = excluded.state_json,
         current_scene = excluded.current_scene,
         turn_count = excluded.turn_count,
         updated_at = excluded.updated_at`,
      [input.campaignId, stateJson, input.stateDoc.scene, turnNumber, now]
    );
  });

  return {
    id,
    campaignId: input.campaignId,
    sessionId: input.sessionId ?? null,
    turnNumber: 0, // Will be set correctly on fetch
    playerInput: input.playerInput,
    aiOutput: input.aiOutput,
    mode: input.mode,
    createdAt: now
  };
}

export async function listTurns(campaignId: string, limit = 10, offset = 0): Promise<Turn[]> {
  const db = await getDatabase();
  const rows = await db.select<TurnRow[]>(
    `SELECT id, campaign_id, session_id, turn_number, player_input, ai_output, mode, created_at
     FROM turns
     WHERE campaign_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [campaignId, limit, offset]
  );

  return rows.map((row) => ({
    id: row.id,
    campaignId: row.campaign_id,
    sessionId: row.session_id,
    turnNumber: row.turn_number,
    playerInput: row.player_input,
    aiOutput: row.ai_output,
    mode: row.mode as GameMode,
    createdAt: row.created_at
  }));
}

export async function getTurnSnapshot(turnId: string): Promise<CampaignStateDoc | null> {
  const db = await getDatabase();
  const rows = await db.select<{ state_json: string }[]>(
    "SELECT state_json FROM turn_state_snapshots WHERE turn_id = ?",
    [turnId]
  );

  if (rows.length === 0) return null;

  try {
    return JSON.parse(rows[0].state_json) as CampaignStateDoc;
  } catch {
    return null;
  }
}
