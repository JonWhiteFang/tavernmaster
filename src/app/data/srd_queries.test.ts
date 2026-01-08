import { describe, expect, it, vi } from "vitest";
import { getSrdById, querySrd } from "./srd_queries";
import { getDatabase } from "./db";

vi.mock("./db", () => ({
  getDatabase: vi.fn()
}));

describe("srd queries", () => {
  it("filters SRD records based on query parameters", async () => {
    const select = vi.fn().mockResolvedValue([
      {
        id: "spell-1",
        name: "Fireball",
        data_json: JSON.stringify({ level: 3, school: "Evocation" })
      },
      {
        id: "spell-2",
        name: "Charm",
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
      expect.arrayContaining(["%Fire%", "%Fire%", 10])
    );
  });

  it("returns null when a record is missing", async () => {
    const select = vi.fn().mockResolvedValue([]);
    vi.mocked(getDatabase).mockResolvedValue({ select } as never);

    await expect(getSrdById("spells", "missing")).resolves.toBeNull();
  });

  it("parses stored SRD records", async () => {
    const select = vi
      .fn()
      .mockResolvedValue([
        { id: "item-1", name: "Lantern", data_json: JSON.stringify({ type: "gear" }) }
      ]);
    vi.mocked(getDatabase).mockResolvedValue({ select } as never);

    const result = await getSrdById("items", "item-1");

    expect(result).toEqual({
      id: "item-1",
      name: "Lantern",
      data: { type: "gear" }
    });
  });
});
