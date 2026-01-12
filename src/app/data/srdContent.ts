import { getDatabase } from "./db";
import type {
  SrdClass,
  SrdRace,
  SrdBackground,
  SrdItem,
  AbilityBonuses,
  BonusChoices
} from "../characterCreation/types";
import type { SrdVersion } from "./srdSync";

type SrdEntryRow = { id: string; name: string; data_json: string };

export async function listSrdClasses(version: SrdVersion = "5.1"): Promise<SrdClass[]> {
  const db = await getDatabase();
  const rows = await db.select<SrdEntryRow[]>(
    "SELECT id, name, data_json FROM srd_entries WHERE type = ? AND srd_version = ? ORDER BY name",
    ["class", version]
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

export async function listSrdRaces(version: SrdVersion = "5.1"): Promise<SrdRace[]> {
  const db = await getDatabase();
  const rows = await db.select<SrdEntryRow[]>(
    "SELECT id, name, data_json FROM srd_entries WHERE type = ? AND srd_version = ? ORDER BY name",
    ["species", version]
  );
  return rows.map((row) => {
    const data = JSON.parse(row.data_json) as {
      speed: number;
      abilityBonuses?: Array<{ ability: string; bonus: number }> | AbilityBonuses;
      bonusChoices?: BonusChoices;
    };
    // Convert array format to object format if needed
    let bonuses: AbilityBonuses = {};
    if (Array.isArray(data.abilityBonuses)) {
      for (const b of data.abilityBonuses) {
        bonuses[b.ability.toLowerCase() as keyof AbilityBonuses] = b.bonus;
      }
    } else if (data.abilityBonuses) {
      bonuses = data.abilityBonuses;
    }
    return {
      id: row.id,
      name: row.name,
      speed: data.speed,
      abilityBonuses: bonuses,
      bonusChoices: data.bonusChoices
    };
  });
}

export async function listSrdBackgrounds(version: SrdVersion = "5.1"): Promise<SrdBackground[]> {
  const db = await getDatabase();
  const rows = await db.select<SrdEntryRow[]>(
    "SELECT id, name, data_json FROM srd_entries WHERE type = ? AND srd_version = ? ORDER BY name",
    ["background", version]
  );
  return rows.map((row) => {
    const data = JSON.parse(row.data_json) as { skillProficiencies: string[] };
    return { id: row.id, name: row.name, skillProficiencies: data.skillProficiencies };
  });
}

export async function getSrdItemsByIds(
  ids: string[],
  version: SrdVersion = "5.1"
): Promise<SrdItem[]> {
  if (ids.length === 0) return [];
  const db = await getDatabase();

  // Map legacy item IDs to new format
  const newIds = ids.map((id) => {
    // Convert legacy IDs like "item-longsword" to new format "srd:5.1:equipment:longsword"
    if (id.startsWith("item-")) {
      const slug = id.replace("item-", "");
      return `srd:${version}:equipment:${slug}`;
    }
    return id;
  });

  const placeholders = newIds.map(() => "?").join(", ");
  const rows = await db.select<SrdEntryRow[]>(
    `SELECT id, name, data_json FROM srd_entries WHERE id IN (${placeholders}) AND srd_version = ?`,
    [...newIds, version]
  );
  return rows.map((row) => ({ id: row.id, name: row.name }));
}
