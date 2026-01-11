import { describe, expect, it, vi } from "vitest";
import { getSrdById, querySrd, querySrdEntries, getSrdEntryById } from "./srd_queries";
import { getDatabase } from "./db";

vi.mock("./db", () => ({
  getDatabase: vi.fn()
}));

describe("srd queries", () => {
  it("filters SRD records based on query parameters", async () => {
    const select = vi.fn().mockResolvedValue([
      {
        id: "srd:5.1:spell:fireball",
        name: "Fireball",
        type: "spell",
        srd_version: "5.1",
        data_json: JSON.stringify({ level: 3, school: "Evocation" })
      },
      {
        id: "srd:5.1:spell:charm",
        name: "Charm",
        type: "spell",
        srd_version: "5.1",
        data_json: JSON.stringify({ level: 1, school: "Enchantment" })
      }
    ]);
    vi.mocked(getDatabase).mockResolvedValue({ select } as never);

    const results = await querySrd({
      type: "spells",
      text: "Fire",
      spellLevel: 3,
      school: "evocation",
      limit: 10
    });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Fireball");
    expect(select).toHaveBeenCalledWith(
      expect.stringContaining("WHERE"),
      expect.arrayContaining(["spell", "5.1", "%Fire%"])
    );
  });

  it("returns null when a record is missing", async () => {
    const select = vi.fn().mockResolvedValue([]);
    vi.mocked(getDatabase).mockResolvedValue({ select } as never);

    await expect(getSrdById("spells", "missing")).resolves.toBeNull();
  });

  it("parses stored SRD records", async () => {
    const select = vi.fn().mockResolvedValue([
      {
        id: "srd:5.1:equipment:lantern",
        name: "Lantern",
        type: "equipment",
        srd_version: "5.1",
        data_json: JSON.stringify({ type: "gear" })
      }
    ]);
    vi.mocked(getDatabase).mockResolvedValue({ select } as never);

    const result = await getSrdById("items", "srd:5.1:equipment:lantern");

    expect(result).toEqual({
      id: "srd:5.1:equipment:lantern",
      name: "Lantern",
      data: { type: "gear" }
    });
  });

  describe("querySrdEntries", () => {
    it("queries entries by type and version", async () => {
      const select = vi.fn().mockResolvedValue([
        {
          id: "srd:5.1:monster:goblin",
          name: "Goblin",
          type: "monster",
          srd_version: "5.1",
          data_json: JSON.stringify({ cr: "1/4" })
        }
      ]);
      vi.mocked(getDatabase).mockResolvedValue({ select } as never);

      const results = await querySrdEntries({
        type: "monster",
        version: "5.1"
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Goblin");
    });
  });

  describe("getSrdEntryById", () => {
    it("returns entry by id and version", async () => {
      const select = vi.fn().mockResolvedValue([
        {
          id: "srd:5.1:spell:fireball",
          name: "Fireball",
          type: "spell",
          srd_version: "5.1",
          data_json: JSON.stringify({ level: 3 })
        }
      ]);
      vi.mocked(getDatabase).mockResolvedValue({ select } as never);

      const result = await getSrdEntryById("srd:5.1:spell:fireball", "5.1");

      expect(result).toEqual({
        id: "srd:5.1:spell:fireball",
        name: "Fireball",
        data: { level: 3 }
      });
    });
  });
});
