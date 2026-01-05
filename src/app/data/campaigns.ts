import { getDatabase } from "./db";
import type { Campaign } from "./types";

type CampaignRow = {
  id: string;
  name: string;
  summary: string | null;
  active_scene_id: string | null;
  created_at: string;
  updated_at: string;
};

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    summary: row.summary ?? undefined,
    activeSceneId: row.active_scene_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  const db = await getDatabase();
  const rows = await db.select<CampaignRow[]>(
    "SELECT id, name, summary, active_scene_id, created_at, updated_at FROM campaigns ORDER BY updated_at DESC"
  );
  return rows.map(mapCampaign);
}

export async function createCampaign(input: { name: string; summary?: string }): Promise<Campaign> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    "INSERT INTO campaigns (id, name, summary, active_scene_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, input.name, input.summary ?? null, null, now, now]
  );

  return {
    id,
    name: input.name,
    summary: input.summary,
    createdAt: now,
    updatedAt: now
  };
}
