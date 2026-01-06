import type { JournalEntry } from "./types";
import { getDatabase } from "./db";
import { decryptValue, encryptValue } from "./encryption";

type JournalRow = {
  id: string;
  campaign_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export async function listJournalEntries(campaignId: string): Promise<JournalEntry[]> {
  const db = await getDatabase();
  const rows = await db.select<JournalRow[]>(
    `SELECT id, campaign_id, title, content, created_at, updated_at
     FROM journal_entries
     WHERE campaign_id = ?
     ORDER BY created_at DESC`,
    [campaignId]
  );

  const entries = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      title: (await decryptValue(row.title)) ?? row.title,
      content: (await decryptValue(row.content)) ?? row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  );
  return entries;
}

export async function createJournalEntry(input: {
  campaignId: string;
  title: string;
  content: string;
}): Promise<JournalEntry> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const title = await encryptValue(input.title);
  const content = await encryptValue(input.content);

  await db.execute(
    `INSERT INTO journal_entries
      (id, campaign_id, title, content, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.campaignId, title, content, null, now, now]
  );

  return {
    id,
    campaignId: input.campaignId,
    title: input.title,
    content: input.content,
    createdAt: now,
    updatedAt: now
  };
}
