import { getDatabase } from "./db";

export type SearchEntityType = "session" | "journal" | "ai_log";

export interface SearchResult {
  entityType: SearchEntityType;
  entityId: string;
  campaignId: string;
  snippet: string;
}

export async function upsertSearchEntry(
  entityType: SearchEntityType,
  entityId: string,
  campaignId: string,
  content: string
): Promise<void> {
  const db = await getDatabase();
  // Delete existing entry first (FTS5 doesn't support ON CONFLICT)
  await db.execute("DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?", [
    entityType,
    entityId
  ]);
  await db.execute(
    "INSERT INTO search_index (entity_type, entity_id, campaign_id, content) VALUES (?, ?, ?, ?)",
    [entityType, entityId, campaignId, content]
  );
}

export async function deleteSearchEntry(
  entityType: SearchEntityType,
  entityId: string
): Promise<void> {
  const db = await getDatabase();
  await db.execute("DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?", [
    entityType,
    entityId
  ]);
}

export async function searchContent(
  query: string,
  campaignId?: string,
  limit = 50
): Promise<SearchResult[]> {
  const db = await getDatabase();
  const safeQuery = query.replace(/['"]/g, "");

  let sql = `
    SELECT entity_type, entity_id, campaign_id, snippet(search_index, 3, '<b>', '</b>', '...', 32) as snippet
    FROM search_index
    WHERE search_index MATCH ?
  `;
  const params: (string | number)[] = [safeQuery];

  if (campaignId) {
    sql += " AND campaign_id = ?";
    params.push(campaignId);
  }

  sql += " ORDER BY rank LIMIT ?";
  params.push(limit);

  const rows = await db.select<
    { entity_type: string; entity_id: string; campaign_id: string; snippet: string }[]
  >(sql, params);

  return rows.map((row) => ({
    entityType: row.entity_type as SearchEntityType,
    entityId: row.entity_id,
    campaignId: row.campaign_id,
    snippet: row.snippet
  }));
}
