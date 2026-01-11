import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { FakeDb } from "../test/fakeDb";
import type { NewCharacterInput } from "./characters";
import { createCharacter, deleteCharacter, listCharacters, updateCharacter } from "./characters";

let fakeDb: FakeDb;
const { enqueueUpsertsAndSchedule } = vi.hoisted(() => ({
  enqueueUpsertsAndSchedule: vi.fn()
}));

vi.mock("./db", () => ({
  getDatabase: async () => fakeDb,
  withTransaction: async <T>(fn: (db: FakeDb) => Promise<T>): Promise<T> => fn(fakeDb)
}));

vi.mock("../sync/ops", () => ({
  enqueueUpsertsAndSchedule
}));

describe("character data", () => {
  beforeEach(() => {
    fakeDb = new FakeDb();
    enqueueUpsertsAndSchedule.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates characters with inventory and spells", async () => {
    const idQueue = [
      "char-1",
      "stats-1",
      "ability-1",
      "ability-2",
      "ability-3",
      "ability-4",
      "ability-5",
      "ability-6",
      "inv-1",
      "spell-1"
    ];
    vi.stubGlobal("crypto", {
      randomUUID: () => idQueue.shift() ?? "fallback-id"
    });

    fakeDb.seedRow("srd_items", {
      id: "item-1",
      name: "Potion",
      data_json: JSON.stringify({ type: "potion" })
    });
    fakeDb.seedRow("srd_spells", {
      id: "spell-1",
      name: "Fire Bolt",
      data_json: JSON.stringify({ level: 0, school: "Evocation" })
    });

    const input: NewCharacterInput = {
      name: "Test Hero",
      role: "player",
      controlMode: "player",
      level: 1,
      className: "Fighter",
      ancestry: "Human",
      background: "Soldier",
      alignment: "Neutral",
      ancestryBonusSelections: [],
      hitPoints: 12,
      hitPointMax: 12,
      armorClass: 15,
      initiativeBonus: 2,
      speed: 30,
      abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      proficiencies: ["Athletics"],
      inventory: [{ itemId: "item-1", quantity: 1, attuned: false }],
      spells: [{ spellId: "spell-1", prepared: true, slotsUsed: 0 }]
    };

    const created = await createCharacter(input);

    expect(created.id).toBe("char-1");
    expect(created.inventory[0]?.name).toBe("Potion");
    expect(created.spells[0]?.name).toBe("Fire Bolt");
    expect(fakeDb.getTableRows("characters").length).toBe(1);
    expect(fakeDb.getTableRows("character_abilities").length).toBe(6);
    expect(fakeDb.getTableRows("character_inventory").length).toBe(1);
    expect(fakeDb.getTableRows("character_spells").length).toBe(1);
    expect(enqueueUpsertsAndSchedule).toHaveBeenCalled();
  });

  it("lists characters with resolved inventory and spells", async () => {
    fakeDb.seedRow("srd_items", {
      id: "item-1",
      name: "Potion",
      data_json: JSON.stringify({ type: "potion" })
    });
    fakeDb.seedRow("srd_spells", {
      id: "spell-1",
      name: "Fire Bolt",
      data_json: JSON.stringify({ level: 0, school: "Evocation" })
    });

    fakeDb.seedRow("characters", {
      id: "char-1",
      name: "Riven",
      role: "player",
      control_mode: "player",
      level: 2,
      class_name: "Rogue",
      ancestry: "Human",
      background: "Criminal",
      alignment: "Neutral",
      proficiencies_json: JSON.stringify(["Stealth"]),
      ancestry_bonus_json: JSON.stringify([]),
      deleted_at: null,
      created_at: "t0",
      updated_at: "t0"
    });
    fakeDb.seedRow("character_stats", {
      id: "stats-1",
      character_id: "char-1",
      hp: 14,
      hp_max: 14,
      ac: 14,
      initiative_bonus: 2,
      speed: 30,
      deleted_at: null,
      created_at: "t0",
      updated_at: "t0"
    });

    const abilities = [
      { ability: "str", score: 10 },
      { ability: "dex", score: 16 },
      { ability: "con", score: 12 },
      { ability: "int", score: 13 },
      { ability: "wis", score: 11 },
      { ability: "cha", score: 14 }
    ];
    abilities.forEach((entry, index) => {
      fakeDb.seedRow("character_abilities", {
        id: `ability-${index}`,
        character_id: "char-1",
        ability: entry.ability,
        score: entry.score,
        save_bonus: 0,
        deleted_at: null,
        created_at: "t0",
        updated_at: "t0"
      });
    });

    fakeDb.seedRow("character_inventory", {
      id: "inv-1",
      character_id: "char-1",
      item_id: "item-1",
      quantity: 2,
      attuned: 0,
      deleted_at: null,
      created_at: "t0",
      updated_at: "t0"
    });
    fakeDb.seedRow("character_spells", {
      id: "spell-entry-1",
      character_id: "char-1",
      spell_id: "spell-1",
      prepared: 1,
      slots_used: 0,
      deleted_at: null,
      created_at: "t0",
      updated_at: "t0"
    });

    const characters = await listCharacters();

    expect(characters).toHaveLength(1);
    expect(characters[0].inventory[0]?.name).toBe("Potion");
    expect(characters[0].spells[0]?.name).toBe("Fire Bolt");
    expect(characters[0].proficiencies).toEqual(["Stealth"]);
  });

  it("updates characters and replaces related rows", async () => {
    const idQueue = [
      "ability-new-1",
      "ability-new-2",
      "ability-new-3",
      "ability-new-4",
      "ability-new-5",
      "ability-new-6",
      "inv-new-1",
      "spell-new-1"
    ];
    vi.stubGlobal("crypto", {
      randomUUID: () => idQueue.shift() ?? "fallback-id"
    });

    fakeDb.seedRow("characters", {
      id: "char-1",
      name: "Old",
      role: "player",
      control_mode: "player",
      level: 1,
      class_name: "Fighter",
      ancestry: "Human",
      background: "Soldier",
      alignment: "Neutral",
      proficiencies_json: JSON.stringify([]),
      ancestry_bonus_json: JSON.stringify([]),
      deleted_at: null,
      created_at: "t0",
      updated_at: "t0"
    });
    fakeDb.seedRow("character_stats", {
      id: "stats-1",
      character_id: "char-1",
      hp: 10,
      hp_max: 10,
      ac: 12,
      initiative_bonus: 1,
      speed: 30,
      deleted_at: null,
      created_at: "t0",
      updated_at: "t0"
    });

    abilitySeeds.forEach((entry) => {
      fakeDb.seedRow("character_abilities", {
        ...entry,
        deleted_at: null,
        created_at: "t0",
        updated_at: "t0"
      });
    });

    fakeDb.seedRow("character_inventory", {
      id: "inv-old-1",
      character_id: "char-1",
      item_id: "item-1",
      quantity: 1,
      attuned: 0,
      deleted_at: null,
      created_at: "t0",
      updated_at: "t0"
    });
    fakeDb.seedRow("character_spells", {
      id: "spell-old-1",
      character_id: "char-1",
      spell_id: "spell-1",
      prepared: 0,
      slots_used: 0,
      deleted_at: null,
      created_at: "t0",
      updated_at: "t0"
    });

    const updatedInput: NewCharacterInput = {
      name: "Updated",
      role: "ally",
      controlMode: "ai",
      level: 2,
      className: "Rogue",
      ancestry: "Elf",
      background: "Criminal",
      alignment: "Chaotic Good",
      ancestryBonusSelections: [],
      hitPoints: 18,
      hitPointMax: 18,
      armorClass: 14,
      initiativeBonus: 3,
      speed: 30,
      abilities: { str: 10, dex: 16, con: 12, int: 13, wis: 11, cha: 14 },
      proficiencies: ["Stealth"],
      inventory: [{ itemId: "item-1", quantity: 2, attuned: false }],
      spells: [{ spellId: "spell-1", prepared: true, slotsUsed: 0 }]
    };

    const updated = await updateCharacter("char-1", updatedInput);

    const updatedRow = fakeDb.getRow("characters", "char-1");
    expect(updatedRow?.name).toBe("Updated");
    expect(updated.controlMode).toBe("ai");
    expect(fakeDb.getTableRows("character_abilities").length).toBe(12);
    expect(fakeDb.getRow("character_abilities", "ability-1")?.deleted_at).not.toBeNull();
    expect(enqueueUpsertsAndSchedule).toHaveBeenCalled();
  });

  it("soft-deletes characters and related rows", async () => {
    fakeDb.seedRow("characters", {
      id: "char-1",
      name: "Delete Me",
      role: "player",
      control_mode: "player",
      level: 1,
      class_name: "Fighter",
      ancestry: "Human",
      background: "Soldier",
      alignment: "Neutral",
      proficiencies_json: JSON.stringify([]),
      ancestry_bonus_json: JSON.stringify([]),
      deleted_at: null,
      created_at: "t0",
      updated_at: "t0"
    });
    fakeDb.seedRow("character_stats", {
      id: "stats-1",
      character_id: "char-1",
      hp: 10,
      hp_max: 10,
      ac: 12,
      initiative_bonus: 1,
      speed: 30,
      deleted_at: null,
      created_at: "t0",
      updated_at: "t0"
    });

    abilitySeeds.forEach((entry) => {
      fakeDb.seedRow("character_abilities", {
        ...entry,
        deleted_at: null,
        created_at: "t0",
        updated_at: "t0"
      });
    });
    fakeDb.seedRow("character_inventory", {
      id: "inv-1",
      character_id: "char-1",
      item_id: "item-1",
      quantity: 1,
      attuned: 0,
      deleted_at: null,
      created_at: "t0",
      updated_at: "t0"
    });
    fakeDb.seedRow("character_spells", {
      id: "spell-1",
      character_id: "char-1",
      spell_id: "spell-1",
      prepared: 0,
      slots_used: 0,
      deleted_at: null,
      created_at: "t0",
      updated_at: "t0"
    });

    await deleteCharacter("char-1");

    expect(fakeDb.getRow("characters", "char-1")?.deleted_at).not.toBeNull();
    expect(fakeDb.getRow("character_stats", "stats-1")?.deleted_at).not.toBeNull();
    expect(fakeDb.getRow("character_abilities", "ability-1")?.deleted_at).not.toBeNull();
    expect(fakeDb.getRow("character_inventory", "inv-1")?.deleted_at).not.toBeNull();
    expect(fakeDb.getRow("character_spells", "spell-1")?.deleted_at).not.toBeNull();
  });
});

const abilitySeeds = [
  { id: "ability-1", character_id: "char-1", ability: "str", score: 10, save_bonus: 0 },
  { id: "ability-2", character_id: "char-1", ability: "dex", score: 14, save_bonus: 2 },
  { id: "ability-3", character_id: "char-1", ability: "con", score: 12, save_bonus: 1 },
  { id: "ability-4", character_id: "char-1", ability: "int", score: 10, save_bonus: 0 },
  { id: "ability-5", character_id: "char-1", ability: "wis", score: 11, save_bonus: 0 },
  { id: "ability-6", character_id: "char-1", ability: "cha", score: 8, save_bonus: -1 }
];
