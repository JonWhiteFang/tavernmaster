import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "../test/fakeDb";

let fakeDb: FakeDb;

vi.mock("./db", () => ({
  getDatabase: async () => fakeDb
}));

vi.mock("../../assets/srd/srd.json", () => ({
  default: {
    spells: [{ id: "spell-1", name: "Spell One", data: { level: 1 } }],
    items: [{ id: "item-1", name: "Item One", data: { type: "gear" } }],
    monsters: [{ id: "monster-1", name: "Monster One", data: { type: "beast" } }],
    conditions: [{ id: "condition-1", name: "Condition One", data: { duration: "1m" } }],
    rules: [{ id: "rule-1", name: "Rule One", data: { chapter: "combat" } }],
    classes: [{ id: "class-1", name: "Fighter", data: { hitDie: 10 } }],
    races: [{ id: "race-1", name: "Human", data: { speed: 30 } }],
    backgrounds: [{ id: "bg-1", name: "Soldier", data: { skillProficiencies: ["Athletics"] } }]
  }
}));

describe("SRD ingestion", () => {
  beforeEach(async () => {
    fakeDb = new FakeDb();
    vi.resetModules();
  });

  it("imports SRD into empty tables and is idempotent", async () => {
    const { importSrdIfNeeded } = await import("./srd");

    await importSrdIfNeeded();
    expect(fakeDb.getRow("srd_spells", "spell-1")).not.toBeNull();
    expect(fakeDb.getRow("srd_items", "item-1")).not.toBeNull();
    expect(fakeDb.getRow("srd_monsters", "monster-1")).not.toBeNull();
    expect(fakeDb.getRow("srd_conditions", "condition-1")).not.toBeNull();
    expect(fakeDb.getRow("srd_rules", "rule-1")).not.toBeNull();
    expect(fakeDb.getRow("srd_classes", "class-1")).not.toBeNull();
    expect(fakeDb.getRow("srd_races", "race-1")).not.toBeNull();
    expect(fakeDb.getRow("srd_backgrounds", "bg-1")).not.toBeNull();

    // Idempotent - second call doesn't duplicate
    await importSrdIfNeeded();
    expect(fakeDb.getRow("srd_spells", "spell-1")).not.toBeNull();
  });

  it("imports new tables even if existing tables have data", async () => {
    // Simulate existing DB with spells but no classes/races/backgrounds
    fakeDb.seedRow("srd_spells", { id: "existing-spell", name: "Old Spell" });

    const { importSrdIfNeeded } = await import("./srd");
    await importSrdIfNeeded();

    // Existing table not re-imported
    expect(fakeDb.getRow("srd_spells", "spell-1")).toBeNull();
    // New tables are imported
    expect(fakeDb.getRow("srd_classes", "class-1")).not.toBeNull();
    expect(fakeDb.getRow("srd_races", "race-1")).not.toBeNull();
    expect(fakeDb.getRow("srd_backgrounds", "bg-1")).not.toBeNull();
  });
});
