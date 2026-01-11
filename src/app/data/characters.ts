import type {
  AbilityScore,
  Character,
  CharacterControl,
  CharacterInventoryItem,
  CharacterRole,
  CharacterSpell
} from "./types";
import { getDatabase, withTransaction } from "./db";
import { enqueueUpsertsAndSchedule } from "../sync/ops";
import { getSrdById } from "./srd_queries";

type CharacterRow = {
  id: string;
  campaign_id: string | null;
  name: string;
  role: CharacterRole;
  control_mode: CharacterControl | null;
  level: number;
  class_name: string;
  ancestry: string;
  background: string;
  alignment: string;
  proficiencies_json: string | null;
  ancestry_bonus_json: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type CharacterStatsRow = {
  id: string;
  hp: number;
  hp_max: number;
  ac: number;
  initiative_bonus: number;
  speed: number;
};

type CharacterStatsPayloadRow = CharacterStatsRow & {
  character_id: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type AbilityRow = {
  ability: AbilityScore;
  score: number;
};

type AbilityPayloadRow = {
  id: string;
  character_id: string;
  ability: AbilityScore;
  score: number;
  save_bonus: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type InventoryRow = {
  id: string;
  item_id: string;
  quantity: number;
  attuned: number;
};

type InventoryPayloadRow = {
  id: string;
  character_id: string;
  item_id: string;
  quantity: number;
  attuned: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type SpellRow = {
  id: string;
  spell_id: string;
  prepared: number;
  slots_used: number;
};

type SpellPayloadRow = {
  id: string;
  character_id: string;
  spell_id: string;
  prepared: number;
  slots_used: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CharacterInventoryInput = {
  itemId: string;
  quantity: number;
  attuned: boolean;
};

export type CharacterSpellInput = {
  spellId: string;
  prepared: boolean;
  slotsUsed: number;
};

export type NewCharacterInput = {
  campaignId?: string;
  name: string;
  role: CharacterRole;
  controlMode: CharacterControl;
  level: number;
  className: string;
  ancestry: string;
  background: string;
  alignment: string;
  ancestryBonusSelections: AbilityScore[];
  hitPoints: number;
  hitPointMax: number;
  armorClass: number;
  initiativeBonus: number;
  speed: number;
  abilities: Record<AbilityScore, number>;
  proficiencies: string[];
  inventory: CharacterInventoryInput[];
  spells: CharacterSpellInput[];
};

const defaultAbilities: Record<AbilityScore, number> = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10
};

function parseStringArray(value: string | null): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function parseAbilityArray(value: string | null): AbilityScore[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is AbilityScore => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

function buildAbilityMap(abilities: AbilityRow[]): Record<AbilityScore, number> {
  return abilities.reduce<Record<AbilityScore, number>>(
    (acc, ability) => {
      acc[ability.ability] = ability.score;
      return acc;
    },
    { ...defaultAbilities }
  );
}

async function resolveInventoryEntries(rows: InventoryRow[]): Promise<CharacterInventoryItem[]> {
  return Promise.all(
    rows.map(async (row) => {
      const record = await getSrdById("items", row.item_id);
      return {
        id: row.id,
        itemId: row.item_id,
        name: record?.name ?? row.item_id,
        quantity: row.quantity,
        attuned: row.attuned === 1
      };
    })
  );
}

async function resolveSpellEntries(rows: SpellRow[]): Promise<CharacterSpell[]> {
  return Promise.all(
    rows.map(async (row) => {
      const record = await getSrdById("spells", row.spell_id);
      const level = record?.data.level;
      const school = record?.data.school;
      return {
        id: row.id,
        spellId: row.spell_id,
        name: record?.name ?? row.spell_id,
        level: typeof level === "number" ? level : undefined,
        school: typeof school === "string" ? school : undefined,
        prepared: row.prepared === 1,
        slotsUsed: row.slots_used
      };
    })
  );
}

function mapCharacter(
  row: CharacterRow,
  stats: CharacterStatsRow,
  abilities: AbilityRow[],
  inventory: CharacterInventoryItem[],
  spells: CharacterSpell[]
): Character {
  return {
    id: row.id,
    campaignId: row.campaign_id ?? undefined,
    name: row.name,
    role: row.role,
    controlMode: row.control_mode ?? "player",
    level: row.level,
    className: row.class_name,
    ancestry: row.ancestry,
    background: row.background,
    alignment: row.alignment,
    ancestryBonusSelections: parseAbilityArray(row.ancestry_bonus_json),
    hitPoints: stats.hp,
    hitPointMax: stats.hp_max,
    armorClass: stats.ac,
    initiativeBonus: stats.initiative_bonus,
    speed: stats.speed,
    abilities: buildAbilityMap(abilities),
    proficiencies: parseStringArray(row.proficiencies_json),
    inventory,
    spells
  };
}

export async function listCharacters(campaignId?: string): Promise<Character[]> {
  const db = await getDatabase();
  const whereClause = campaignId
    ? "WHERE deleted_at IS NULL AND (campaign_id = ? OR campaign_id IS NULL)"
    : "WHERE deleted_at IS NULL";
  const params = campaignId ? [campaignId] : [];
  const rows = await db.select<CharacterRow[]>(
    `SELECT id, campaign_id, name, role, control_mode, level, class_name, ancestry, background, alignment,
      proficiencies_json, ancestry_bonus_json, deleted_at, created_at, updated_at
     FROM characters
     ${whereClause}
     ORDER BY name`,
    params
  );

  const characters = await Promise.all(
    rows.map(async (row) => {
      const statsRows = await db.select<CharacterStatsRow[]>(
        `SELECT id, hp, hp_max, ac, initiative_bonus, speed
         FROM character_stats
         WHERE character_id = ? AND deleted_at IS NULL
         LIMIT 1`,
        [row.id]
      );
      const stats = statsRows[0];
      if (!stats) {
        return null;
      }

      const abilities = await db.select<AbilityRow[]>(
        `SELECT ability, score
         FROM character_abilities
         WHERE character_id = ? AND deleted_at IS NULL`,
        [row.id]
      );

      const inventoryRows = await db.select<InventoryRow[]>(
        `SELECT id, item_id, quantity, attuned
         FROM character_inventory
         WHERE character_id = ? AND deleted_at IS NULL`,
        [row.id]
      );

      const spellRows = await db.select<SpellRow[]>(
        `SELECT id, spell_id, prepared, slots_used
         FROM character_spells
         WHERE character_id = ? AND deleted_at IS NULL`,
        [row.id]
      );

      const inventory = await resolveInventoryEntries(inventoryRows);
      const spells = await resolveSpellEntries(spellRows);

      return mapCharacter(row, stats, abilities, inventory, spells);
    })
  );

  return characters.filter((character): character is Character => character !== null);
}

export async function createCharacter(input: NewCharacterInput): Promise<Character> {
  const id = crypto.randomUUID();
  const statsId = crypto.randomUUID();
  const now = new Date().toISOString();
  const proficienciesJson = JSON.stringify(input.proficiencies ?? []);
  const ancestryBonusJson = JSON.stringify(input.ancestryBonusSelections ?? []);

  const abilityPayloads: AbilityPayloadRow[] = (Object.keys(input.abilities) as AbilityScore[]).map(
    (ability) => ({
      id: crypto.randomUUID(),
      character_id: id,
      ability,
      score: input.abilities[ability],
      save_bonus: Math.floor((input.abilities[ability] - 10) / 2),
      deleted_at: null,
      created_at: now,
      updated_at: now
    })
  );

  const inventoryPayloads: InventoryPayloadRow[] = input.inventory.map((entry) => ({
    id: crypto.randomUUID(),
    character_id: id,
    item_id: entry.itemId,
    quantity: entry.quantity,
    attuned: entry.attuned ? 1 : 0,
    deleted_at: null,
    created_at: now,
    updated_at: now
  }));

  const spellPayloads: SpellPayloadRow[] = input.spells.map((entry) => ({
    id: crypto.randomUUID(),
    character_id: id,
    spell_id: entry.spellId,
    prepared: entry.prepared ? 1 : 0,
    slots_used: entry.slotsUsed,
    deleted_at: null,
    created_at: now,
    updated_at: now
  }));

  await withTransaction(async (db) => {
    await db.execute(
      `INSERT INTO characters
        (id, campaign_id, name, role, control_mode, level, class_name, ancestry, background, alignment,
         proficiencies_json, ancestry_bonus_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.campaignId ?? null,
        input.name,
        input.role,
        input.controlMode,
        input.level,
        input.className,
        input.ancestry,
        input.background,
        input.alignment,
        proficienciesJson,
        ancestryBonusJson,
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

    for (const payload of abilityPayloads) {
      await db.execute(
        `INSERT INTO character_abilities
          (id, character_id, ability, score, save_bonus, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.id,
          payload.character_id,
          payload.ability,
          payload.score,
          payload.save_bonus,
          now,
          now
        ]
      );
    }

    for (const payload of inventoryPayloads) {
      await db.execute(
        `INSERT INTO character_inventory
          (id, character_id, item_id, quantity, attuned, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.id,
          payload.character_id,
          payload.item_id,
          payload.quantity,
          payload.attuned,
          now,
          now
        ]
      );
    }

    for (const payload of spellPayloads) {
      await db.execute(
        `INSERT INTO character_spells
          (id, character_id, spell_id, prepared, slots_used, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.id,
          payload.character_id,
          payload.spell_id,
          payload.prepared,
          payload.slots_used,
          now,
          now
        ]
      );
    }
  });

  await enqueueUpsertsAndSchedule([
    {
      entityType: "characters",
      entityId: id,
      payload: {
        id,
        campaign_id: input.campaignId ?? null,
        name: input.name,
        role: input.role,
        control_mode: input.controlMode,
        level: input.level,
        class_name: input.className,
        ancestry: input.ancestry,
        background: input.background,
        alignment: input.alignment,
        proficiencies_json: proficienciesJson,
        ancestry_bonus_json: ancestryBonusJson,
        deleted_at: null,
        created_at: now,
        updated_at: now
      }
    },
    {
      entityType: "character_stats",
      entityId: statsId,
      payload: {
        id: statsId,
        character_id: id,
        hp: input.hitPoints,
        hp_max: input.hitPointMax,
        ac: input.armorClass,
        initiative_bonus: input.initiativeBonus,
        speed: input.speed,
        deleted_at: null,
        created_at: now,
        updated_at: now
      }
    },
    ...abilityPayloads.map((payload) => ({
      entityType: "character_abilities" as const,
      entityId: payload.id,
      payload
    })),
    ...inventoryPayloads.map((payload) => ({
      entityType: "character_inventory" as const,
      entityId: payload.id,
      payload
    })),
    ...spellPayloads.map((payload) => ({
      entityType: "character_spells" as const,
      entityId: payload.id,
      payload
    }))
  ]);

  const inventory = await resolveInventoryEntries(
    inventoryPayloads.map((entry) => ({
      id: entry.id,
      item_id: entry.item_id,
      quantity: entry.quantity,
      attuned: entry.attuned
    }))
  );

  const spells = await resolveSpellEntries(
    spellPayloads.map((entry) => ({
      id: entry.id,
      spell_id: entry.spell_id,
      prepared: entry.prepared,
      slots_used: entry.slots_used
    }))
  );

  return {
    id,
    campaignId: input.campaignId,
    name: input.name,
    role: input.role,
    controlMode: input.controlMode,
    level: input.level,
    className: input.className,
    ancestry: input.ancestry,
    background: input.background,
    alignment: input.alignment,
    ancestryBonusSelections: input.ancestryBonusSelections,
    hitPoints: input.hitPoints,
    hitPointMax: input.hitPointMax,
    armorClass: input.armorClass,
    initiativeBonus: input.initiativeBonus,
    speed: input.speed,
    abilities: input.abilities,
    proficiencies: input.proficiencies,
    inventory,
    spells
  };
}

async function getCharacterPayload(id: string): Promise<CharacterRow | null> {
  const db = await getDatabase();
  const rows = await db.select<CharacterRow[]>(
    `SELECT id, campaign_id, name, role, control_mode, level, class_name, ancestry, background, alignment,
      proficiencies_json, ancestry_bonus_json, deleted_at, created_at, updated_at
     FROM characters
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

async function getCharacterStatsPayload(id: string): Promise<CharacterStatsPayloadRow | null> {
  const db = await getDatabase();
  const rows = await db.select<CharacterStatsPayloadRow[]>(
    `SELECT id, character_id, hp, hp_max, ac, initiative_bonus, speed, deleted_at, created_at, updated_at
     FROM character_stats
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function updateCharacter(id: string, input: NewCharacterInput): Promise<Character> {
  const now = new Date().toISOString();
  const proficienciesJson = JSON.stringify(input.proficiencies ?? []);
  const ancestryBonusJson = JSON.stringify(input.ancestryBonusSelections ?? []);

  const abilityPayloads: AbilityPayloadRow[] = (Object.keys(input.abilities) as AbilityScore[]).map(
    (ability) => ({
      id: crypto.randomUUID(),
      character_id: id,
      ability,
      score: input.abilities[ability],
      save_bonus: Math.floor((input.abilities[ability] - 10) / 2),
      deleted_at: null,
      created_at: now,
      updated_at: now
    })
  );

  const inventoryPayloads: InventoryPayloadRow[] = input.inventory.map((entry) => ({
    id: crypto.randomUUID(),
    character_id: id,
    item_id: entry.itemId,
    quantity: entry.quantity,
    attuned: entry.attuned ? 1 : 0,
    deleted_at: null,
    created_at: now,
    updated_at: now
  }));

  const spellPayloads: SpellPayloadRow[] = input.spells.map((entry) => ({
    id: crypto.randomUUID(),
    character_id: id,
    spell_id: entry.spellId,
    prepared: entry.prepared ? 1 : 0,
    slots_used: entry.slotsUsed,
    deleted_at: null,
    created_at: now,
    updated_at: now
  }));

  const { statsId, deletedAbilityPayloads, deletedInventoryPayloads, deletedSpellPayloads } =
    await withTransaction(async (db) => {
      await db.execute(
        `UPDATE characters
         SET name = ?, role = ?, control_mode = ?, level = ?, class_name = ?, ancestry = ?, background = ?,
             alignment = ?, proficiencies_json = ?, ancestry_bonus_json = ?, updated_at = ?
         WHERE id = ?`,
        [
          input.name,
          input.role,
          input.controlMode,
          input.level,
          input.className,
          input.ancestry,
          input.background,
          input.alignment,
          proficienciesJson,
          ancestryBonusJson,
          now,
          id
        ]
      );

      const statsRows = await db.select<{ id: string }[]>(
        `SELECT id FROM character_stats WHERE character_id = ? AND deleted_at IS NULL LIMIT 1`,
        [id]
      );
      let statsId = statsRows[0]?.id ?? null;

      if (statsId) {
        await db.execute(
          `UPDATE character_stats
           SET hp = ?, hp_max = ?, ac = ?, initiative_bonus = ?, speed = ?, updated_at = ?
           WHERE id = ?`,
          [
            input.hitPoints,
            input.hitPointMax,
            input.armorClass,
            input.initiativeBonus,
            input.speed,
            now,
            statsId
          ]
        );
      } else {
        statsId = crypto.randomUUID();
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
      }

      const existingAbilities = await db.select<AbilityPayloadRow[]>(
        `SELECT id, character_id, ability, score, save_bonus, deleted_at, created_at, updated_at
         FROM character_abilities
         WHERE character_id = ? AND deleted_at IS NULL`,
        [id]
      );

      for (const row of existingAbilities) {
        await db.execute(
          `UPDATE character_abilities SET deleted_at = ?, updated_at = ? WHERE id = ?`,
          [now, now, row.id]
        );
      }

      const deletedAbilityPayloads = existingAbilities.map((row) => ({
        ...row,
        deleted_at: now,
        updated_at: now
      }));

      for (const payload of abilityPayloads) {
        await db.execute(
          `INSERT INTO character_abilities
            (id, character_id, ability, score, save_bonus, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            payload.id,
            payload.character_id,
            payload.ability,
            payload.score,
            payload.save_bonus,
            now,
            now
          ]
        );
      }

      const existingInventory = await db.select<InventoryPayloadRow[]>(
        `SELECT id, character_id, item_id, quantity, attuned, deleted_at, created_at, updated_at
         FROM character_inventory
         WHERE character_id = ? AND deleted_at IS NULL`,
        [id]
      );

      for (const row of existingInventory) {
        await db.execute(
          `UPDATE character_inventory SET deleted_at = ?, updated_at = ? WHERE id = ?`,
          [now, now, row.id]
        );
      }

      const deletedInventoryPayloads = existingInventory.map((row) => ({
        ...row,
        deleted_at: now,
        updated_at: now
      }));

      for (const payload of inventoryPayloads) {
        await db.execute(
          `INSERT INTO character_inventory
            (id, character_id, item_id, quantity, attuned, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            payload.id,
            payload.character_id,
            payload.item_id,
            payload.quantity,
            payload.attuned,
            now,
            now
          ]
        );
      }

      const existingSpells = await db.select<SpellPayloadRow[]>(
        `SELECT id, character_id, spell_id, prepared, slots_used, deleted_at, created_at, updated_at
         FROM character_spells
         WHERE character_id = ? AND deleted_at IS NULL`,
        [id]
      );

      for (const row of existingSpells) {
        await db.execute(
          `UPDATE character_spells SET deleted_at = ?, updated_at = ? WHERE id = ?`,
          [now, now, row.id]
        );
      }

      const deletedSpellPayloads = existingSpells.map((row) => ({
        ...row,
        deleted_at: now,
        updated_at: now
      }));

      for (const payload of spellPayloads) {
        await db.execute(
          `INSERT INTO character_spells
            (id, character_id, spell_id, prepared, slots_used, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            payload.id,
            payload.character_id,
            payload.spell_id,
            payload.prepared,
            payload.slots_used,
            now,
            now
          ]
        );
      }

      return { statsId, deletedAbilityPayloads, deletedInventoryPayloads, deletedSpellPayloads };
    });

  const characterPayload = await getCharacterPayload(id);
  const statsPayload = statsId ? await getCharacterStatsPayload(statsId) : null;

  const ops = [
    ...(characterPayload
      ? [
          {
            entityType: "characters" as const,
            entityId: characterPayload.id,
            payload: characterPayload
          }
        ]
      : []),
    ...(statsPayload
      ? [
          {
            entityType: "character_stats" as const,
            entityId: statsPayload.id,
            payload: statsPayload
          }
        ]
      : []),
    ...deletedAbilityPayloads.map((payload) => ({
      entityType: "character_abilities" as const,
      entityId: payload.id,
      payload
    })),
    ...abilityPayloads.map((payload) => ({
      entityType: "character_abilities" as const,
      entityId: payload.id,
      payload
    })),
    ...deletedInventoryPayloads.map((payload) => ({
      entityType: "character_inventory" as const,
      entityId: payload.id,
      payload
    })),
    ...inventoryPayloads.map((payload) => ({
      entityType: "character_inventory" as const,
      entityId: payload.id,
      payload
    })),
    ...deletedSpellPayloads.map((payload) => ({
      entityType: "character_spells" as const,
      entityId: payload.id,
      payload
    })),
    ...spellPayloads.map((payload) => ({
      entityType: "character_spells" as const,
      entityId: payload.id,
      payload
    }))
  ];

  if (ops.length) {
    await enqueueUpsertsAndSchedule(ops);
  }

  const inventory = await resolveInventoryEntries(
    inventoryPayloads.map((entry) => ({
      id: entry.id,
      item_id: entry.item_id,
      quantity: entry.quantity,
      attuned: entry.attuned
    }))
  );

  const spells = await resolveSpellEntries(
    spellPayloads.map((entry) => ({
      id: entry.id,
      spell_id: entry.spell_id,
      prepared: entry.prepared,
      slots_used: entry.slots_used
    }))
  );

  return {
    id,
    campaignId: input.campaignId,
    name: input.name,
    role: input.role,
    controlMode: input.controlMode,
    level: input.level,
    className: input.className,
    ancestry: input.ancestry,
    background: input.background,
    alignment: input.alignment,
    ancestryBonusSelections: input.ancestryBonusSelections,
    hitPoints: input.hitPoints,
    hitPointMax: input.hitPointMax,
    armorClass: input.armorClass,
    initiativeBonus: input.initiativeBonus,
    speed: input.speed,
    abilities: input.abilities,
    proficiencies: input.proficiencies,
    inventory,
    spells
  };
}

export async function deleteCharacter(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const characterPayload = await getCharacterPayload(id);
  if (!characterPayload) {
    return;
  }

  await db.execute(`UPDATE characters SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
    now,
    now,
    id
  ]);

  const statsRows = await db.select<CharacterStatsPayloadRow[]>(
    `SELECT id, character_id, hp, hp_max, ac, initiative_bonus, speed, deleted_at, created_at, updated_at
     FROM character_stats
     WHERE character_id = ? AND deleted_at IS NULL`,
    [id]
  );

  await Promise.all(
    statsRows.map((row) =>
      db.execute(`UPDATE character_stats SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
        now,
        now,
        row.id
      ])
    )
  );

  const abilityRows = await db.select<AbilityPayloadRow[]>(
    `SELECT id, character_id, ability, score, save_bonus, deleted_at, created_at, updated_at
     FROM character_abilities
     WHERE character_id = ? AND deleted_at IS NULL`,
    [id]
  );

  await Promise.all(
    abilityRows.map((row) =>
      db.execute(`UPDATE character_abilities SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
        now,
        now,
        row.id
      ])
    )
  );

  const inventoryRows = await db.select<InventoryPayloadRow[]>(
    `SELECT id, character_id, item_id, quantity, attuned, deleted_at, created_at, updated_at
     FROM character_inventory
     WHERE character_id = ? AND deleted_at IS NULL`,
    [id]
  );

  await Promise.all(
    inventoryRows.map((row) =>
      db.execute(`UPDATE character_inventory SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
        now,
        now,
        row.id
      ])
    )
  );

  const spellRows = await db.select<SpellPayloadRow[]>(
    `SELECT id, character_id, spell_id, prepared, slots_used, deleted_at, created_at, updated_at
     FROM character_spells
     WHERE character_id = ? AND deleted_at IS NULL`,
    [id]
  );

  await Promise.all(
    spellRows.map((row) =>
      db.execute(`UPDATE character_spells SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
        now,
        now,
        row.id
      ])
    )
  );

  await enqueueUpsertsAndSchedule([
    {
      entityType: "characters",
      entityId: characterPayload.id,
      payload: { ...characterPayload, deleted_at: now, updated_at: now }
    },
    ...statsRows.map((row) => ({
      entityType: "character_stats" as const,
      entityId: row.id,
      payload: { ...row, deleted_at: now, updated_at: now }
    })),
    ...abilityRows.map((row) => ({
      entityType: "character_abilities" as const,
      entityId: row.id,
      payload: { ...row, deleted_at: now, updated_at: now }
    })),
    ...inventoryRows.map((row) => ({
      entityType: "character_inventory" as const,
      entityId: row.id,
      payload: { ...row, deleted_at: now, updated_at: now }
    })),
    ...spellRows.map((row) => ({
      entityType: "character_spells" as const,
      entityId: row.id,
      payload: { ...row, deleted_at: now, updated_at: now }
    }))
  ]);
}
