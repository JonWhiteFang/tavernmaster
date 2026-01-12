import { getDatabase } from "./db";

export interface SrdSearchResult {
  entryType: string;
  name: string;
  snippet: string;
}

export async function searchSrd(query: string, limit = 20): Promise<SrdSearchResult[]> {
  if (!query.trim()) return [];

  const db = await getDatabase();
  const searchQuery = query
    .trim()
    .split(/\s+/)
    .map((term) => `${term}*`)
    .join(" ");

  const rows = await db.select<{ entry_type: string; name: string; content: string }[]>(
    `SELECT entry_type, name, snippet(srd_fts, 2, '<b>', '</b>', '...', 32) as content
     FROM srd_fts
     WHERE srd_fts MATCH ?
     ORDER BY rank
     LIMIT ?`,
    [searchQuery, limit]
  );

  return rows.map((row) => ({
    entryType: row.entry_type,
    name: row.name,
    snippet: row.content
  }));
}

export async function getSrdEntryTypes(): Promise<{ type: string; count: number }[]> {
  const db = await getDatabase();
  const rows = await db.select<{ entry_type: string; cnt: number }[]>(
    `SELECT entry_type, COUNT(*) as cnt FROM srd_fts GROUP BY entry_type`
  );
  return rows.map((row) => ({ type: row.entry_type, count: row.cnt }));
}
