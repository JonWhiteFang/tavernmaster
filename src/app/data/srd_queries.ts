import { getDatabase } from "./db";

export type SrdTable = "spells" | "items" | "monsters" | "conditions" | "rules";

export type SrdQuery = {
  type: SrdTable;
  text?: string;
  limit?: number;
  spellLevel?: number;
  school?: string;
  itemType?: string;
  monsterType?: string;
};

export type SrdRecord = {
  id: string;
  name: string;
  data: Record<string, unknown>;
};

type SrdRow = {
  id: string;
  name: string;
  data_json: string;
};

function matchesFilter(record: SrdRecord, query: SrdQuery): boolean {
  if (query.type === "spells") {
    const level = record.data.level as number | undefined;
    const school = record.data.school as string | undefined;
    if (query.spellLevel !== undefined && level !== query.spellLevel) {
      return false;
    }
    if (query.school && school?.toLowerCase() !== query.school.toLowerCase()) {
      return false;
    }
  }

  if (query.type === "items" && query.itemType) {
    const itemType = record.data.type as string | undefined;
    if (itemType?.toLowerCase() !== query.itemType.toLowerCase()) {
      return false;
    }
  }

  if (query.type === "monsters" && query.monsterType) {
    const monsterType = record.data.type as string | undefined;
    if (monsterType?.toLowerCase() !== query.monsterType.toLowerCase()) {
      return false;
    }
  }

  return true;
}

export async function querySrd(query: SrdQuery): Promise<SrdRecord[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (query.text) {
    clauses.push("(name LIKE ? OR data_json LIKE ?)");
    const value = `%${query.text}%`;
    params.push(value, value);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = query.limit ?? 25;

  const rows = await db.select<SrdRow[]>(
    `SELECT id, name, data_json FROM srd_${query.type} ${where} LIMIT ?`,
    [...params, limit]
  );

  return rows
    .map((row) => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(row.data_json);
      } catch {
        data = {};
      }
      return { id: row.id, name: row.name, data };
    })
    .filter((record) => matchesFilter(record, query));
}

export async function getSrdById(type: SrdTable, id: string): Promise<SrdRecord | null> {
  const db = await getDatabase();
  const rows = await db.select<SrdRow[]>(
    `SELECT id, name, data_json FROM srd_${type} WHERE id = ?`,
    [id]
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    data: JSON.parse(row.data_json)
  };
}
