import { getDatabase } from "./db";
import { decryptValue, encryptValue } from "./encryption";
import { enqueueUpsertAndSchedule } from "../sync/ops";

export type AiLogKind = "dm" | "party" | "summary" | "system" | "user";

export type AiLogEntry = {
  id: string;
  campaignId?: string;
  sessionId?: string;
  kind: AiLogKind;
  content: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export async function insertAiLog(entry: {
  campaignId?: string;
  sessionId?: string;
  kind: AiLogKind;
  content: string;
  payload?: Record<string, unknown>;
}): Promise<AiLogEntry> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const content = await encryptValue(entry.content);
  const payload = entry.payload ? await encryptValue(JSON.stringify(entry.payload)) : null;

  await db.execute(
    `INSERT INTO ai_logs (id, campaign_id, session_id, kind, content, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, entry.campaignId ?? null, entry.sessionId ?? null, entry.kind, content, payload, now, now]
  );

  await enqueueUpsertAndSchedule("ai_logs", id, {
    id,
    campaign_id: entry.campaignId ?? null,
    session_id: entry.sessionId ?? null,
    kind: entry.kind,
    content,
    payload_json: payload,
    deleted_at: null,
    created_at: now,
    updated_at: now
  });

  return {
    id,
    campaignId: entry.campaignId,
    sessionId: entry.sessionId,
    kind: entry.kind,
    content: entry.content,
    payload: entry.payload,
    createdAt: now,
    updatedAt: now
  };
}

export async function listAiLogs(params: {
  campaignId?: string;
  sessionId?: string;
  limit?: number;
}): Promise<AiLogEntry[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const values: (string | number)[] = [];

  if (params.campaignId) {
    clauses.push("campaign_id = ?");
    values.push(params.campaignId);
  }
  if (params.sessionId) {
    clauses.push("session_id = ?");
    values.push(params.sessionId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = params.limit ?? 50;

  const rows = await db.select<
    {
      id: string;
      campaign_id: string | null;
      session_id: string | null;
      kind: AiLogKind;
      content: string;
      payload_json: string | null;
      created_at: string;
      updated_at: string;
    }[]
  >(
    `SELECT id, campaign_id, session_id, kind, content, payload_json, created_at, updated_at
     FROM ai_logs
     ${where}
     ORDER BY created_at DESC
     LIMIT ?`,
    [...values, limit]
  );

  const entries = await Promise.all(
    rows.map(async (row) => {
      const content = await decryptValue(row.content);
      const payloadRaw = await decryptValue(row.payload_json);
      return {
        id: row.id,
        campaignId: row.campaign_id ?? undefined,
        sessionId: row.session_id ?? undefined,
        kind: row.kind,
        content: content ?? row.content,
        payload: payloadRaw ? JSON.parse(payloadRaw) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    })
  );
  return entries;
}
