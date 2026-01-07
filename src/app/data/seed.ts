import type { AbilityScore, CharacterRole } from "./types";
import { getDatabase } from "./db";
import { encryptValue } from "./encryption";

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

export type SeedResult = {
  created: boolean;
  campaignId: string | null;
  sessionId: string | null;
  characterCount: number;
};

export async function seedDatabase(
  options: { includeDemoData?: boolean } = {}
): Promise<SeedResult> {
  const db = await getDatabase();
  const includeDemoData = options.includeDemoData ?? false;
  const [
    [{ count: campaignCount }],
    [{ count: sessionCount }],
    [{ count: journalCount }],
    [{ count: characterCount }]
  ] = await Promise.all([
    db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM campaigns"),
    db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM sessions"),
    db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM journal_entries"),
    db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM characters")
  ]);

  if (
    !includeDemoData ||
    campaignCount > 0 ||
    sessionCount > 0 ||
    journalCount > 0 ||
    characterCount > 0
  ) {
    return { created: false, campaignId: null, sessionId: null, characterCount: 0 };
  }

  let created = false;
  const now = new Date().toISOString();
  const campaignId = "seed-campaign";
  const campaignSummary = await encryptValue(
    "A coastal relic hunt with storms, rival crews, and ancient wards."
  );
  await db.execute(
    `INSERT INTO campaigns (id, name, summary, active_scene_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [campaignId, "Copperbound", campaignSummary, null, now, now]
  );
  created = true;

  const sessionRecap = await encryptValue(
    "The crew assembled at the Salted Eel, negotiated passage, and charted the Sunken Vault."
  );
  await db.execute(
    `INSERT INTO sessions (id, campaign_id, title, started_at, ended_at, recap, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ["seed-session-1", campaignId, "Session Zero", now, now, sessionRecap, now, now]
  );

  const journalContent = await encryptValue(
    "The crew assembles at the Salted Eel to negotiate passage into the Sunken Vault."
  );
  const journalTitle = await encryptValue("Session Zero");
  await db.execute(
    `INSERT INTO journal_entries (id, campaign_id, title, content, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["seed-journal-1", campaignId, journalTitle, journalContent, "setup", now, now]
  );

  let createdCharacterCount = 0;
  for (const character of demoCharacters) {
    const characterId = crypto.randomUUID();
    const controlMode = character.role === "player" ? "player" : "ai";

    await db.execute(
      `INSERT INTO characters
        (id, name, role, control_mode, level, class_name, ancestry, background, alignment,
         proficiencies_json, ancestry_bonus_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        characterId,
        character.name,
        character.role,
        controlMode,
        character.level,
        character.className,
        character.ancestry,
        character.background,
        character.alignment,
        "[]",
        "[]",
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
    createdCharacterCount += 1;
  }

  return {
    created,
    campaignId,
    sessionId: "seed-session-1",
    characterCount: createdCharacterCount
  };
}
