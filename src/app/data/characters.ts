import type { AbilityScore, Character, CharacterRole } from "./types";
import { getDatabase } from "./db";

type CharacterRow = {
  id: string;
  name: string;
  role: CharacterRole;
  level: number;
  class_name: string;
  ancestry: string;
  background: string;
  alignment: string;
  hp: number;
  hp_max: number;
  ac: number;
  initiative_bonus: number;
  speed: number;
};

type AbilityRow = {
  ability: AbilityScore;
  score: number;
};

export type NewCharacterInput = {
  name: string;
  role: CharacterRole;
  level: number;
  className: string;
  ancestry: string;
  background: string;
  alignment: string;
  hitPoints: number;
  hitPointMax: number;
  armorClass: number;
  initiativeBonus: number;
  speed: number;
  abilities: Record<AbilityScore, number>;
};

function mapCharacter(row: CharacterRow, abilities: AbilityRow[]): Character {
  const abilityMap = abilities.reduce<Record<AbilityScore, number>>(
    (acc, ability) => {
      acc[ability.ability] = ability.score;
      return acc;
    },
    { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  );

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    level: row.level,
    className: row.class_name,
    ancestry: row.ancestry,
    background: row.background,
    alignment: row.alignment,
    hitPoints: row.hp,
    hitPointMax: row.hp_max,
    armorClass: row.ac,
    initiativeBonus: row.initiative_bonus,
    speed: row.speed,
    abilities: abilityMap,
    proficiencies: [],
    inventory: []
  };
}

export async function listCharacters(): Promise<Character[]> {
  const db = await getDatabase();
  const rows = await db.select<CharacterRow[]>(
    `SELECT c.id, c.name, c.role, c.level, c.class_name, c.ancestry, c.background, c.alignment,
      s.hp, s.hp_max, s.ac, s.initiative_bonus, s.speed
     FROM characters c
     JOIN character_stats s ON s.character_id = c.id
     ORDER BY c.name`
  );

  const characters = await Promise.all(
    rows.map(async (row) => {
      const abilities = await db.select<AbilityRow[]>(
        "SELECT ability, score FROM character_abilities WHERE character_id = ?",
        [row.id]
      );
      return mapCharacter(row, abilities);
    })
  );

  return characters;
}

export async function createCharacter(input: NewCharacterInput): Promise<Character> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const statsId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO characters
      (id, name, role, level, class_name, ancestry, background, alignment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.role,
      input.level,
      input.className,
      input.ancestry,
      input.background,
      input.alignment,
      now,
      now
    ]
  );

  await db.execute(
    `INSERT INTO character_stats
      (id, character_id, hp, hp_max, ac, initiative_bonus, speed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      statsId,
      id,
      input.hitPoints,
      input.hitPointMax,
      input.armorClass,
      input.initiativeBonus,
      input.speed,
      now,
      now
    ]
  );

  await Promise.all(
    (Object.keys(input.abilities) as AbilityScore[]).map((ability) =>
      db.execute(
        `INSERT INTO character_abilities
          (id, character_id, ability, score, save_bonus, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          id,
          ability,
          input.abilities[ability],
          Math.floor((input.abilities[ability] - 10) / 2),
          now,
          now
        ]
      )
    )
  );

  return {
    id,
    name: input.name,
    role: input.role,
    level: input.level,
    className: input.className,
    ancestry: input.ancestry,
    background: input.background,
    alignment: input.alignment,
    hitPoints: input.hitPoints,
    hitPointMax: input.hitPointMax,
    armorClass: input.armorClass,
    initiativeBonus: input.initiativeBonus,
    speed: input.speed,
    abilities: input.abilities,
    proficiencies: [],
    inventory: []
  };
}
