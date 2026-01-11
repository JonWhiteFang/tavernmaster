import { getDatabase } from "./db";
import { decryptValue, encryptValue } from "./encryption";
import type { Campaign, SrdRulesetVersion } from "./types";
import { enqueueUpsertAndSchedule } from "../sync/ops";

type CampaignRow = {
  id: string;
  name: string;
  summary: string | null;
  active_scene_id: string | null;
  ruleset_version: string;
  created_at: string;
  updated_at: string;
};

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    summary: row.summary ?? undefined,
    rulesetVersion: (row.ruleset_version || "5.1") as SrdRulesetVersion,
    activeSceneId: row.active_scene_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  const db = await getDatabase();
  const rows = await db.select<CampaignRow[]>(
    "SELECT id, name, summary, active_scene_id, ruleset_version, created_at, updated_at FROM campaigns WHERE deleted_at IS NULL ORDER BY updated_at DESC"
  );
  const campaigns = await Promise.all(
    rows.map(async (row) => {
      const summary = await decryptValue(row.summary);
      return mapCampaign({ ...row, summary });
    })
  );
  return campaigns;
}

export async function createCampaign(input: {
  name: string;
  summary?: string;
  rulesetVersion?: SrdRulesetVersion;
}): Promise<Campaign> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const summary = await encryptValue(input.summary ?? null);
  const rulesetVersion = input.rulesetVersion ?? "5.1";

  await db.execute(
    "INSERT INTO campaigns (id, name, summary, active_scene_id, ruleset_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, input.name, summary, null, rulesetVersion, now, now]
  );

  await enqueueUpsertAndSchedule("campaigns", id, {
    id,
    name: input.name,
    summary,
    active_scene_id: null,
    ruleset_version: rulesetVersion,
    deleted_at: null,
    created_at: now,
    updated_at: now
  });

  return {
    id,
    name: input.name,
    summary: input.summary,
    rulesetVersion,
    createdAt: now,
    updatedAt: now
  };
}
