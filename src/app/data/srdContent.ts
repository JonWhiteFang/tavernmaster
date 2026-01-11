import { getDatabase } from "./db";
import type {
  SrdClass,
  SrdRace,
  SrdBackground,
  SrdItem,
  AbilityBonuses,
  BonusChoices
} from "../characterCreation/types";

type SrdRow = { id: string; name: string; data_json: string };

export async function listSrdClasses(): Promise<SrdClass[]> {
  const db = await getDatabase();
  const rows = await db.select<SrdRow[]>(
    "SELECT id, name, data_json FROM srd_classes ORDER BY name"
  );
  return rows.map((row) => {
    const data = JSON.parse(row.data_json) as { hitDie: number; startingItemIds?: string[] };
    return {
      id: row.id,
      name: row.name,
      hitDie: data.hitDie,
      startingItemIds: data.startingItemIds ?? []
    };
  });
}

export async function listSrdRaces(): Promise<SrdRace[]> {
  const db = await getDatabase();
  const rows = await db.select<SrdRow[]>("SELECT id, name, data_json FROM srd_races ORDER BY name");
  return rows.map((row) => {
    const data = JSON.parse(row.data_json) as {
      speed: number;
      abilityBonuses: AbilityBonuses;
      bonusChoices?: BonusChoices;
    };
    return {
      id: row.id,
      name: row.name,
      speed: data.speed,
      abilityBonuses: data.abilityBonuses,
      bonusChoices: data.bonusChoices
    };
  });
}

export async function listSrdBackgrounds(): Promise<SrdBackground[]> {
  const db = await getDatabase();
  const rows = await db.select<SrdRow[]>(
    "SELECT id, name, data_json FROM srd_backgrounds ORDER BY name"
  );
  return rows.map((row) => {
    const data = JSON.parse(row.data_json) as { skillProficiencies: string[] };
    return { id: row.id, name: row.name, skillProficiencies: data.skillProficiencies };
  });
}

export async function getSrdItemsByIds(ids: string[]): Promise<SrdItem[]> {
  if (ids.length === 0) return [];
  const db = await getDatabase();
  const placeholders = ids.map(() => "?").join(", ");
  const rows = await db.select<SrdRow[]>(
    `SELECT id, name FROM srd_items WHERE id IN (${placeholders})`,
    ids
  );
  return rows.map((row) => ({ id: row.id, name: row.name }));
}
