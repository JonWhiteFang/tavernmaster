import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "../test/fakeDb";

let fakeDb: FakeDb;

vi.mock("./db", () => ({
  getDatabase: async () => fakeDb
}));

describe("srdContent", () => {
  beforeEach(() => {
    fakeDb = new FakeDb();
    vi.resetModules();
  });

  it("listSrdClasses returns typed classes sorted by name", async () => {
    fakeDb.seedRow("srd_entries", {
      id: "srd:5.1:class:wizard",
      name: "Wizard",
      type: "class",
      srd_version: "5.1",
      data_json: JSON.stringify({ hitDie: 6 })
    });
    fakeDb.seedRow("srd_entries", {
      id: "srd:5.1:class:fighter",
      name: "Fighter",
      type: "class",
      srd_version: "5.1",
      data_json: JSON.stringify({ hitDie: 10 })
    });

    const { listSrdClasses } = await import("./srdContent");
    const classes = await listSrdClasses();

    expect(classes).toHaveLength(2);
    expect(classes[0]).toEqual({
      id: "srd:5.1:class:fighter",
      name: "Fighter",
      hitDie: 10,
      startingItemIds: []
    });
    expect(classes[1]).toEqual({
      id: "srd:5.1:class:wizard",
      name: "Wizard",
      hitDie: 6,
      startingItemIds: []
    });
  });

  it("listSrdRaces returns typed races with ability bonuses", async () => {
    fakeDb.seedRow("srd_entries", {
      id: "srd:5.1:species:human",
      name: "Human",
      type: "species",
      srd_version: "5.1",
      data_json: JSON.stringify({
        speed: 30,
        abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }
      })
    });
    fakeDb.seedRow("srd_entries", {
      id: "srd:5.1:species:half-elf",
      name: "Half-Elf",
      type: "species",
      srd_version: "5.1",
      data_json: JSON.stringify({
        speed: 30,
        abilityBonuses: { cha: 2 },
        bonusChoices: { count: 2, value: 1, options: ["str", "dex", "con", "int", "wis"] }
      })
    });

    const { listSrdRaces } = await import("./srdContent");
    const races = await listSrdRaces();

    expect(races).toHaveLength(2);
    expect(races[0].name).toBe("Half-Elf");
    expect(races[0].bonusChoices).toEqual({
      count: 2,
      value: 1,
      options: ["str", "dex", "con", "int", "wis"]
    });
    expect(races[1].name).toBe("Human");
    expect(races[1].abilityBonuses).toEqual({ str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 });
  });

  it("listSrdBackgrounds returns typed backgrounds with skill proficiencies", async () => {
    fakeDb.seedRow("srd_entries", {
      id: "srd:5.1:background:soldier",
      name: "Soldier",
      type: "background",
      srd_version: "5.1",
      data_json: JSON.stringify({ skillProficiencies: ["Athletics", "Intimidation"] })
    });

    const { listSrdBackgrounds } = await import("./srdContent");
    const backgrounds = await listSrdBackgrounds();

    expect(backgrounds).toHaveLength(1);
    expect(backgrounds[0]).toEqual({
      id: "srd:5.1:background:soldier",
      name: "Soldier",
      skillProficiencies: ["Athletics", "Intimidation"]
    });
  });

  it("listSrdClasses supports version parameter", async () => {
    fakeDb.seedRow("srd_entries", {
      id: "srd:5.2.1:class:wizard",
      name: "Wizard",
      type: "class",
      srd_version: "5.2.1",
      data_json: JSON.stringify({ hitDie: 6 })
    });

    const { listSrdClasses } = await import("./srdContent");
    const classes = await listSrdClasses("5.2.1");

    expect(classes).toHaveLength(1);
    expect(classes[0].id).toBe("srd:5.2.1:class:wizard");
  });
});
