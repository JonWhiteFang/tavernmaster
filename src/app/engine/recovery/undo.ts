import { getDatabase, withTransaction } from "../../data/db";
import { saveCampaignState } from "../state/store";
import type { CampaignStateDoc } from "../state/types";

export interface UndoResult {
  undoneId: string;
  restoredState: CampaignStateDoc;
}

export async function undoLastTurn(campaignId: string): Promise<UndoResult | null> {
  const db = await getDatabase();

  // Find last applied turn
  const turns = await db.select<{ id: string }[]>(
    `SELECT id FROM turns WHERE campaign_id = ? AND status = 'applied' ORDER BY created_at DESC LIMIT 2`,
    [campaignId]
  );

  if (turns.length < 2) return null; // Need at least 2 turns to undo

  const lastTurnId = turns[0].id;
  const previousTurnId = turns[1].id;

  // Get previous snapshot
  const snapshots = await db.select<{ state_json: string }[]>(
    `SELECT state_json FROM turn_state_snapshots WHERE turn_id = ?`,
    [previousTurnId]
  );

  if (snapshots.length === 0) return null;

  const restoredState = JSON.parse(snapshots[0].state_json) as CampaignStateDoc;

  await withTransaction(async (txDb) => {
    // Mark turn as undone
    await txDb.execute(`UPDATE turns SET status = 'undone' WHERE id = ?`, [lastTurnId]);

    // Restore state
    await saveCampaignState(campaignId, restoredState);
  });

  return { undoneId: lastTurnId, restoredState };
}

export async function getUndoableCount(campaignId: string): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<{ cnt: number }[]>(
    `SELECT COUNT(*) as cnt FROM turns WHERE campaign_id = ? AND status = 'applied'`,
    [campaignId]
  );
  const count = rows[0]?.cnt ?? 0;
  return Math.max(0, count - 1); // Can undo all but the first turn
}
