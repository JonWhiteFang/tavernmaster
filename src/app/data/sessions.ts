import { getDatabase } from "./db";
import type { Session } from "./types";
import { decryptValue } from "./encryption";

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
