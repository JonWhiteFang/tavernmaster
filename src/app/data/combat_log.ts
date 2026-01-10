import { getDatabase } from "./db";
import { enqueueUpsertAndSchedule } from "../sync/ops";

export type CombatLogEntry = {
  id: string;
  encounterId: string;
  entryType: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export async function appendCombatLog(
  encounterId: string,
  entryType: string,
  payload: Record<string, unknown>
): Promise<CombatLogEntry> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const payloadJson = JSON.stringify(payload);

  await db.execute(
    `INSERT INTO combat_log (id, encounter_id, entry_type, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, encounterId, entryType, payloadJson, now, now]
  );

  await enqueueUpsertAndSchedule("combat_log", id, {
    id,
    encounter_id: encounterId,
    entry_type: entryType,
    payload_json: payloadJson,
    deleted_at: null,
    created_at: now,
    updated_at: now
  });

  return { id, encounterId, entryType, payload, createdAt: now };
}

export async function listCombatLog(encounterId: string, limit = 20): Promise<CombatLogEntry[]> {
  const db = await getDatabase();
  const rows = await db.select<
    {
      id: string;
      encounter_id: string;
      entry_type: string;
      payload_json: string;
      created_at: string;
    }[]
  >(
    `SELECT id, encounter_id, entry_type, payload_json, created_at
     FROM combat_log
     WHERE encounter_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT ?`,
    [encounterId, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    encounterId: row.encounter_id,
    entryType: row.entry_type,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    createdAt: row.created_at
  }));
}

export async function listCombatLogByCampaign(
  campaignId: string,
  limit = 10
): Promise<CombatLogEntry[]> {
  const db = await getDatabase();
  const rows = await db.select<
    {
      id: string;
      encounter_id: string;
      entry_type: string;
      payload_json: string;
      created_at: string;
    }[]
  >(
    `SELECT cl.id, cl.encounter_id, cl.entry_type, cl.payload_json, cl.created_at
     FROM combat_log cl
     JOIN encounters e ON e.id = cl.encounter_id
     WHERE e.campaign_id = ? AND cl.deleted_at IS NULL
     ORDER BY cl.created_at DESC
     LIMIT ?`,
    [campaignId, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    encounterId: row.encounter_id,
    entryType: row.entry_type,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    createdAt: row.created_at
  }));
}
