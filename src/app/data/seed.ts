import type { AbilityScore, CharacterRole } from "./types";
import { getDatabase } from "./db";

const abilityOrder: AbilityScore[] = ["str", "dex", "con", "int", "wis", "cha"];

type SeedCharacter = {
  name: string;
  role: CharacterRole;
  level: number;
  className: string;
  ancestry: string;
  background: string;
  alignment: string;
  stats: {
    hp: number;
    hpMax: number;
    ac: number;
    initiativeBonus: number;
    speed: number;
  };
  abilities: Record<AbilityScore, number>;
};

const demoCharacters: SeedCharacter[] = [
  {
    name: "Riven Blackwell",
    role: "player",
    level: 3,
    className: "Rogue",
    ancestry: "Human",
    background: "Criminal",
    alignment: "Neutral",
    stats: { hp: 22, hpMax: 22, ac: 15, initiativeBonus: 3, speed: 30 },
    abilities: { str: 10, dex: 16, con: 12, int: 13, wis: 11, cha: 14 }
  },
  {
    name: "Sable Aster",
    role: "ally",
    level: 3,
    className: "Cleric",
    ancestry: "Elf",
    background: "Acolyte",
    alignment: "Lawful Good",
    stats: { hp: 24, hpMax: 24, ac: 17, initiativeBonus: 1, speed: 30 },
    abilities: { str: 12, dex: 12, con: 13, int: 10, wis: 16, cha: 11 }
  },
  {
    name: "Thorne Vale",
    role: "ally",
    level: 3,
    className: "Fighter",
    ancestry: "Dwarf",
    background: "Soldier",
    alignment: "Neutral Good",
    stats: { hp: 30, hpMax: 30, ac: 18, initiativeBonus: 0, speed: 25 },
    abilities: { str: 16, dex: 10, con: 15, int: 10, wis: 12, cha: 8 }
  },
  {
    name: "Lyra Quill",
    role: "ally",
    level: 3,
    className: "Wizard",
    ancestry: "High Elf",
    background: "Sage",
    alignment: "Chaotic Good",
    stats: { hp: 18, hpMax: 18, ac: 13, initiativeBonus: 2, speed: 30 },
    abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 13, cha: 10 }
  },
  {
    name: "Bram Ironstep",
    role: "ally",
    level: 3,
    className: "Ranger",
    ancestry: "Halfling",
    background: "Outlander",
    alignment: "Neutral",
    stats: { hp: 26, hpMax: 26, ac: 16, initiativeBonus: 2, speed: 30 },
    abilities: { str: 12, dex: 15, con: 14, int: 10, wis: 14, cha: 8 }
  }
];

export async function seedDatabase(): Promise<void> {
  const db = await getDatabase();
  const [{ count }] = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM campaigns"
  );

  if (count > 0) {
    return;
  }

  const now = new Date().toISOString();
  const campaignId = "seed-campaign";

  await db.execute(
    `INSERT INTO campaigns (id, name, summary, active_scene_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      campaignId,
      "Copperbound",
      "A coastal relic hunt with storms, rival crews, and ancient wards.",
      null,
      now,
      now
    ]
  );

  await db.execute(
    `INSERT INTO sessions (id, campaign_id, title, started_at, ended_at, recap, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "seed-session-1",
      campaignId,
      "Session Zero",
      now,
      now,
      "The crew assembled at the Salted Eel, negotiated passage, and charted the Sunken Vault.",
      now,
      now
    ]
  );

  await db.execute(
    `INSERT INTO journal_entries (id, campaign_id, title, content, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      "seed-journal-1",
      campaignId,
      "Session Zero",
      "The crew assembles at the Salted Eel to negotiate passage into the Sunken Vault.",
      "setup",
      now,
      now
    ]
  );

  for (const character of demoCharacters) {
    const characterId = crypto.randomUUID();

    await db.execute(
      `INSERT INTO characters
        (id, name, role, level, class_name, ancestry, background, alignment, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        characterId,
        character.name,
        character.role,
        character.level,
        character.className,
        character.ancestry,
        character.background,
        character.alignment,
        now,
        now
      ]
    );

    await db.execute(
      `INSERT INTO character_stats
        (id, character_id, hp, hp_max, ac, initiative_bonus, speed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        characterId,
        character.stats.hp,
        character.stats.hpMax,
        character.stats.ac,
        character.stats.initiativeBonus,
        character.stats.speed,
        now,
        now
      ]
    );

    for (const ability of abilityOrder) {
      await db.execute(
        `INSERT INTO character_abilities
          (id, character_id, ability, score, save_bonus, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          characterId,
          ability,
          character.abilities[ability],
          Math.floor((character.abilities[ability] - 10) / 2),
          now,
          now
        ]
      );
    }
  }
}
