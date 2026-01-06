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
    rules: [{ id: "rule-1", name: "Rule One", data: { chapter: "combat" } }]
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

    await importSrdIfNeeded();
    expect(fakeDb.getRow("srd_spells", "spell-1")).not.toBeNull();
  });
});
