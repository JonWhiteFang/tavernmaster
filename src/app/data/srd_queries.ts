import { getDatabase } from "./db";
import type { SrdVersion, SrdEntryType } from "./srdSync";

// Legacy type mapping for backward compatibility
const LEGACY_TYPE_MAP: Record<string, SrdEntryType> = {
  spells: "spell",
  items: "equipment",
  monsters: "monster",
  conditions: "condition",
  rules: "rule"
};

export type SrdTable = "spells" | "items" | "monsters" | "conditions" | "rules";

export type SrdQuery = {
  type: SrdTable;
  text?: string;
  limit?: number;
  spellLevel?: number;
  school?: string;
  itemType?: string;
  monsterType?: string;
  version?: SrdVersion;
};

export type SrdRecord = {
  id: string;
  name: string;
  data: Record<string, unknown>;
};

type SrdEntryRow = {
  id: string;
  name: string;
  type: string;
  srd_version: string;
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
  const entryType = LEGACY_TYPE_MAP[query.type] ?? query.type;
  const version = query.version ?? "5.1";
  const clauses: string[] = ["type = ?", "srd_version = ?"];
  const params: Array<string | number> = [entryType, version];

  if (query.text) {
    clauses.push("(name LIKE ? OR data_json LIKE ? OR search_text LIKE ?)");
    const value = `%${query.text}%`;
    params.push(value, value, value);
  }

  const where = `WHERE ${clauses.join(" AND ")}`;
  const limit = query.limit ?? 25;

  const rows = await db.select<SrdEntryRow[]>(
    `SELECT id, name, type, srd_version, data_json FROM srd_entries ${where} LIMIT ?`,
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

export async function getSrdById(
  type: SrdTable,
  id: string,
  version: SrdVersion = "5.1"
): Promise<SrdRecord | null> {
  const db = await getDatabase();
  const entryType = LEGACY_TYPE_MAP[type] ?? type;

  const rows = await db.select<SrdEntryRow[]>(
    `SELECT id, name, type, srd_version, data_json FROM srd_entries 
     WHERE type = ? AND srd_version = ? AND id = ?`,
    [entryType, version, id]
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

// New versioned query function
export async function querySrdEntries(options: {
  type: SrdEntryType;
  version: SrdVersion;
  text?: string;
  limit?: number;
}): Promise<SrdRecord[]> {
  const db = await getDatabase();
  const clauses: string[] = ["type = ?", "srd_version = ?"];
  const params: Array<string | number> = [options.type, options.version];

  if (options.text) {
    clauses.push("(name LIKE ? OR search_text LIKE ?)");
    const value = `%${options.text}%`;
    params.push(value, value);
  }

  const where = `WHERE ${clauses.join(" AND ")}`;
  const limit = options.limit ?? 50;

  const rows = await db.select<SrdEntryRow[]>(
    `SELECT id, name, type, srd_version, data_json FROM srd_entries ${where} ORDER BY name LIMIT ?`,
    [...params, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    data: JSON.parse(row.data_json)
  }));
}

export async function getSrdEntryById(
  id: string,
  version: SrdVersion = "5.1"
): Promise<SrdRecord | null> {
  const db = await getDatabase();

  const rows = await db.select<SrdEntryRow[]>(
    `SELECT id, name, type, srd_version, data_json FROM srd_entries 
     WHERE id = ? AND srd_version = ?`,
    [id, version]
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
