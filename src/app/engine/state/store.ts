import { getDatabase, withTransaction } from "../../data/db";
import { CampaignStateDocSchema, createDefaultStateDoc, type CampaignStateDoc } from "./types";

interface StateRow {
  campaign_id: string;
  state_json: string;
  updated_at: string;
}

export async function loadCampaignState(campaignId: string): Promise<CampaignStateDoc> {
  const db = await getDatabase();
  const rows = await db.select<StateRow[]>(
    "SELECT state_json FROM campaign_state WHERE campaign_id = ?",
    [campaignId]
  );

  if (rows.length === 0 || !rows[0].state_json) {
    const defaultDoc = createDefaultStateDoc();
    await saveCampaignState(campaignId, defaultDoc);
    return defaultDoc;
  }

  try {
    const parsed = JSON.parse(rows[0].state_json);
    return CampaignStateDocSchema.parse(parsed);
  } catch {
    return createDefaultStateDoc();
  }
}

export async function saveCampaignState(campaignId: string, doc: CampaignStateDoc): Promise<void> {
  const validated = CampaignStateDocSchema.parse(doc);
  const json = JSON.stringify(validated);
  const now = new Date().toISOString();

  await withTransaction(async (db) => {
    await db.execute(
      `INSERT INTO campaign_state (campaign_id, state_json, current_scene, turn_count, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(campaign_id) DO UPDATE SET
         state_json = excluded.state_json,
         current_scene = excluded.current_scene,
         turn_count = excluded.turn_count,
         updated_at = excluded.updated_at`,
      [campaignId, json, doc.scene, doc.turnCount, now]
    );
  });
}

export async function getCampaignStateUpdatedAt(campaignId: string): Promise<string | null> {
  const db = await getDatabase();
  const rows = await db.select<{ updated_at: string }[]>(
    "SELECT updated_at FROM campaign_state WHERE campaign_id = ?",
    [campaignId]
  );
  return rows[0]?.updated_at ?? null;
}
