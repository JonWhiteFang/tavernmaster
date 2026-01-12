import { getDatabase } from "../../data/db";

export type CanonFactType = "npc" | "location" | "item" | "event" | "lore" | "retcon";
export type QuestStatus = "active" | "completed" | "failed" | "abandoned";

const VALID_QUEST_TRANSITIONS: Record<QuestStatus, QuestStatus[]> = {
  active: ["completed", "failed", "abandoned"],
  completed: [],
  failed: ["active"],
  abandoned: ["active"]
};

export interface CanonFact {
  id: string;
  campaignId: string;
  key: string;
  type: CanonFactType;
  value: string;
  confidence: number;
  sourceTurnId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CanonSummary {
  campaignId: string;
  longSummary: string;
  recentSummary: string;
  updatedAt: string;
}

export interface QuestThread {
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  status: QuestStatus;
  objectives: string[];
  createdAt: string;
  updatedAt: string;
}

export async function upsertCanonFact(input: {
  campaignId: string;
  key: string;
  type: CanonFactType;
  value: string;
  confidence?: number;
  sourceTurnId?: string;
}): Promise<void> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO canon_facts (id, campaign_id, key, type, value, confidence, source_turn_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(campaign_id, key) DO UPDATE SET
       type = excluded.type,
       value = excluded.value,
       confidence = excluded.confidence,
       source_turn_id = excluded.source_turn_id,
       updated_at = excluded.updated_at`,
    [
      id,
      input.campaignId,
      input.key,
      input.type,
      input.value,
      input.confidence ?? 1.0,
      input.sourceTurnId ?? null,
      now,
      now
    ]
  );
}

export async function getCanonFact(campaignId: string, key: string): Promise<CanonFact | null> {
  const db = await getDatabase();
  const rows = await db.select<CanonFact[]>(
    "SELECT * FROM canon_facts WHERE campaign_id = ? AND key = ?",
    [campaignId, key]
  );
  return rows[0] ?? null;
}

export async function listCanonFacts(
  campaignId: string,
  type?: CanonFactType
): Promise<CanonFact[]> {
  const db = await getDatabase();
  if (type) {
    return db.select("SELECT * FROM canon_facts WHERE campaign_id = ? AND type = ?", [
      campaignId,
      type
    ]);
  }
  return db.select("SELECT * FROM canon_facts WHERE campaign_id = ?", [campaignId]);
}

export async function getCanonSummary(campaignId: string): Promise<CanonSummary | null> {
  const db = await getDatabase();
  const rows = await db.select<
    { campaign_id: string; long_summary: string; recent_summary: string; updated_at: string }[]
  >("SELECT * FROM canon_summaries WHERE campaign_id = ?", [campaignId]);
  if (rows.length === 0) return null;
  return {
    campaignId: rows[0].campaign_id,
    longSummary: rows[0].long_summary,
    recentSummary: rows[0].recent_summary,
    updatedAt: rows[0].updated_at
  };
}

export async function upsertCanonSummary(
  campaignId: string,
  summary: { long?: string; recent?: string }
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const existing = await getCanonSummary(campaignId);

  await db.execute(
    `INSERT INTO canon_summaries (campaign_id, long_summary, recent_summary, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(campaign_id) DO UPDATE SET
       long_summary = excluded.long_summary,
       recent_summary = excluded.recent_summary,
       updated_at = excluded.updated_at`,
    [
      campaignId,
      summary.long ?? existing?.longSummary ?? "",
      summary.recent ?? existing?.recentSummary ?? "",
      now
    ]
  );
}

export async function listQuests(campaignId: string, status?: QuestStatus): Promise<QuestThread[]> {
  const db = await getDatabase();
  let sql = "SELECT * FROM quest_threads WHERE campaign_id = ?";
  const params: string[] = [campaignId];

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }

  const rows = await db.select<
    {
      id: string;
      campaign_id: string;
      name: string;
      description: string | null;
      status: string;
      objectives_json: string;
      created_at: string;
      updated_at: string;
    }[]
  >(sql, params);

  return rows.map((r) => ({
    id: r.id,
    campaignId: r.campaign_id,
    name: r.name,
    description: r.description,
    status: r.status as QuestStatus,
    objectives: JSON.parse(r.objectives_json),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}

export async function createQuest(input: {
  campaignId: string;
  name: string;
  description?: string;
  objectives?: string[];
}): Promise<QuestThread> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    "INSERT INTO quest_threads (id, campaign_id, name, description, status, objectives_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      input.campaignId,
      input.name,
      input.description ?? null,
      "active",
      JSON.stringify(input.objectives ?? []),
      now,
      now
    ]
  );

  return {
    id,
    campaignId: input.campaignId,
    name: input.name,
    description: input.description ?? null,
    status: "active",
    objectives: input.objectives ?? [],
    createdAt: now,
    updatedAt: now
  };
}

export async function updateQuestStatus(questId: string, newStatus: QuestStatus): Promise<void> {
  const db = await getDatabase();
  const rows = await db.select<{ status: string }[]>(
    "SELECT status FROM quest_threads WHERE id = ?",
    [questId]
  );

  if (rows.length === 0) throw new Error("Quest not found");

  const currentStatus = rows[0].status as QuestStatus;
  const allowed = VALID_QUEST_TRANSITIONS[currentStatus];

  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid transition from ${currentStatus} to ${newStatus}`);
  }

  await db.execute("UPDATE quest_threads SET status = ?, updated_at = ? WHERE id = ?", [
    newStatus,
    new Date().toISOString(),
    questId
  ]);
}
