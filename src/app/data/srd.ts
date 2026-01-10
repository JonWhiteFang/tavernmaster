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
  classes: SrdEntry[];
  races: SrdEntry[];
  backgrounds: SrdEntry[];
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

async function tableIsEmpty(table: string): Promise<boolean> {
  const db = await getDatabase();
  const rows = await db.select<{ count: number }[]>(`SELECT COUNT(*) as count FROM ${table}`);
  return (rows[0]?.count ?? 0) === 0;
}

export async function importSrdIfNeeded(): Promise<void> {
  const now = new Date().toISOString();

  // Check each table independently for upgrade-safe ingestion
  if (await tableIsEmpty("srd_spells")) {
    await insertEntries("srd_spells", bundle.spells, now);
  }
  if (await tableIsEmpty("srd_items")) {
    await insertEntries("srd_items", bundle.items, now);
  }
  if (await tableIsEmpty("srd_monsters")) {
    await insertEntries("srd_monsters", bundle.monsters, now);
  }
  if (await tableIsEmpty("srd_conditions")) {
    await insertEntries("srd_conditions", bundle.conditions, now);
  }
  if (await tableIsEmpty("srd_rules")) {
    await insertEntries("srd_rules", bundle.rules, now);
  }
  if (await tableIsEmpty("srd_classes")) {
    await insertEntries("srd_classes", bundle.classes, now);
  }
  if (await tableIsEmpty("srd_races")) {
    await insertEntries("srd_races", bundle.races, now);
  }
  if (await tableIsEmpty("srd_backgrounds")) {
    await insertEntries("srd_backgrounds", bundle.backgrounds, now);
  }
}
