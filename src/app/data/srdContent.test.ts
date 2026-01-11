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
    fakeDb.seedRow("srd_classes", {
      id: "class-wizard",
      name: "Wizard",
      data_json: JSON.stringify({ hitDie: 6 })
    });
    fakeDb.seedRow("srd_classes", {
      id: "class-fighter",
      name: "Fighter",
      data_json: JSON.stringify({ hitDie: 10 })
    });

    const { listSrdClasses } = await import("./srdContent");
    const classes = await listSrdClasses();

    expect(classes).toHaveLength(2);
    expect(classes[0]).toEqual({
      id: "class-fighter",
      name: "Fighter",
      hitDie: 10,
      startingItemIds: []
    });
    expect(classes[1]).toEqual({
      id: "class-wizard",
      name: "Wizard",
      hitDie: 6,
      startingItemIds: []
    });
  });

  it("listSrdRaces returns typed races with ability bonuses", async () => {
    fakeDb.seedRow("srd_races", {
      id: "race-human",
      name: "Human",
      data_json: JSON.stringify({
        speed: 30,
        abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }
      })
    });
    fakeDb.seedRow("srd_races", {
      id: "race-half-elf",
      name: "Half-Elf",
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
    fakeDb.seedRow("srd_backgrounds", {
      id: "bg-soldier",
      name: "Soldier",
      data_json: JSON.stringify({ skillProficiencies: ["Athletics", "Intimidation"] })
    });

    const { listSrdBackgrounds } = await import("./srdContent");
    const backgrounds = await listSrdBackgrounds();

    expect(backgrounds).toHaveLength(1);
    expect(backgrounds[0]).toEqual({
      id: "bg-soldier",
      name: "Soldier",
      skillProficiencies: ["Athletics", "Intimidation"]
    });
  });
});
