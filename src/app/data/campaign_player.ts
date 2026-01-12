import { getDatabase, withTransaction } from "./db";

interface CampaignPlayerRow {
  campaign_id: string;
  player_character_id: string;
  updated_at: string;
}

export async function getPlayerCharacterId(campaignId: string): Promise<string | null> {
  const db = await getDatabase();
  const rows = await db.select<CampaignPlayerRow[]>(
    "SELECT player_character_id FROM campaign_player WHERE campaign_id = ?",
    [campaignId]
  );
  return rows[0]?.player_character_id ?? null;
}

export async function setPlayerCharacter(campaignId: string, characterId: string): Promise<void> {
  await withTransaction(async (db) => {
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO campaign_player (campaign_id, player_character_id, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(campaign_id) DO UPDATE SET
         player_character_id = excluded.player_character_id,
         updated_at = excluded.updated_at`,
      [campaignId, characterId, now]
    );
  });
}

export async function clearPlayerCharacter(campaignId: string): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM campaign_player WHERE campaign_id = ?", [campaignId]);
}
