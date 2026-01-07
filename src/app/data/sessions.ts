import { getDatabase } from "./db";
import type { Session } from "./types";
import { decryptValue, encryptValue } from "./encryption";
import { enqueueUpsertAndSchedule } from "../sync/ops";

type SessionRow = {
  id: string;
  campaign_id: string;
  title: string;
  started_at: string | null;
  ended_at: string | null;
  recap: string | null;
  created_at: string;
  updated_at: string;
};

function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    title: row.title,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    recap: row.recap ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listSessions(campaignId: string): Promise<Session[]> {
  const db = await getDatabase();
  const rows = await db.select<SessionRow[]>(
    `SELECT id, campaign_id, title, started_at, ended_at, recap, created_at, updated_at
     FROM sessions
     WHERE campaign_id = ?
     ORDER BY created_at DESC`,
    [campaignId]
  );

  const sessions = await Promise.all(
    rows.map(async (row) => {
      const recap = await decryptValue(row.recap);
      return mapSession({ ...row, recap });
    })
  );
  return sessions;
}

export async function createSession(input: {
  campaignId: string;
  title: string;
  startedAt?: string;
  recap?: string;
}): Promise<Session> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const startedAt = input.startedAt ?? now;
  const recap = await encryptValue(input.recap ?? null);

  await db.execute(
    `INSERT INTO sessions (id, campaign_id, title, started_at, ended_at, recap, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.campaignId, input.title, startedAt, null, recap, now, now]
  );

  await enqueueUpsertAndSchedule("sessions", id, {
    id,
    campaign_id: input.campaignId,
    title: input.title,
    started_at: startedAt,
    ended_at: null,
    recap,
    deleted_at: null,
    created_at: now,
    updated_at: now
  });

  return {
    id,
    campaignId: input.campaignId,
    title: input.title,
    startedAt,
    recap: input.recap,
    createdAt: now,
    updatedAt: now
  };
}
