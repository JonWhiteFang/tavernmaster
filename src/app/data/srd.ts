import { getDatabase } from "./db";
import srdBundle from "../../assets/srd/srd.json";

type SrdEntry = {
  id: string;
  name: string;
  data: Record<string, unknown>;
};

type SrdBundle = {
  spells: SrdEntry[];
  items: SrdEntry[];
  monsters: SrdEntry[];
  conditions: SrdEntry[];
  rules: SrdEntry[];
};

const bundle = srdBundle as SrdBundle;

async function insertEntries(table: string, entries: SrdEntry[], now: string): Promise<void> {
  const db = await getDatabase();
  for (const entry of entries) {
    await db.execute(
      `INSERT INTO ${table} (id, name, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [entry.id, entry.name, JSON.stringify(entry.data), now, now]
    );
  }
}

export async function importSrdIfNeeded(): Promise<void> {
  const db = await getDatabase();
  const rows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM srd_spells"
  );
  const count = rows[0]?.count ?? 0;

  if (count > 0) {
    return;
  }

  const now = new Date().toISOString();
  await insertEntries("srd_spells", bundle.spells, now);
  await insertEntries("srd_items", bundle.items, now);
  await insertEntries("srd_monsters", bundle.monsters, now);
  await insertEntries("srd_conditions", bundle.conditions, now);
  await insertEntries("srd_rules", bundle.rules, now);
}
