import { getDatabase, withTransaction } from "../../data/db";
import { getTurnSnapshot } from "../turns/turnStore";

export interface BranchInput {
  campaignId: string;
  parentTurnId: string;
  label: string;
}

export interface BranchResult {
  branchId: string;
  newCampaignId: string;
}

export async function branchCampaign(input: BranchInput): Promise<BranchResult> {
  const snapshot = await getTurnSnapshot(input.parentTurnId);
  if (!snapshot) throw new Error("No snapshot found for parent turn");

  const db = await getDatabase();
  const newCampaignId = crypto.randomUUID();
  const branchId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Get source campaign
  const campaigns = await db.select<{ name: string; ruleset_version: string }[]>(
    `SELECT name, ruleset_version FROM campaigns WHERE id = ?`,
    [input.campaignId]
  );
  if (campaigns.length === 0) throw new Error("Campaign not found");

  const source = campaigns[0];

  await withTransaction(async (txDb) => {
    // Create new campaign
    await txDb.execute(
      `INSERT INTO campaigns (id, name, summary, ruleset_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newCampaignId, `${source.name} (${input.label})`, null, source.ruleset_version, now, now]
    );

    // Copy campaign state from snapshot
    await txDb.execute(
      `INSERT INTO campaign_state (campaign_id, state_json, current_scene, turn_count, updated_at)
       VALUES (?, ?, ?, 0, ?)`,
      [newCampaignId, JSON.stringify(snapshot), snapshot.scene || "", now]
    );

    // Copy canon facts
    await txDb.execute(
      `INSERT INTO canon_facts (id, campaign_id, key, value, source, created_at, updated_at)
       SELECT ?, ?, key, value, source, ?, ?
       FROM canon_facts WHERE campaign_id = ?`,
      [crypto.randomUUID(), newCampaignId, now, now, input.campaignId]
    );

    // Record branch
    await txDb.execute(
      `INSERT INTO campaign_branches (id, source_campaign_id, target_campaign_id, parent_turn_id, label, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [branchId, input.campaignId, newCampaignId, input.parentTurnId, input.label, now]
    );
  });

  return { branchId, newCampaignId };
}

export async function listBranches(
  campaignId: string
): Promise<{ id: string; targetCampaignId: string; label: string; createdAt: string }[]> {
  const db = await getDatabase();
  const rows = await db.select<
    { id: string; target_campaign_id: string; label: string; created_at: string }[]
  >(
    `SELECT id, target_campaign_id, label, created_at FROM campaign_branches WHERE source_campaign_id = ? ORDER BY created_at DESC`,
    [campaignId]
  );
  return rows.map((r) => ({
    id: r.id,
    targetCampaignId: r.target_campaign_id,
    label: r.label,
    createdAt: r.created_at
  }));
}
