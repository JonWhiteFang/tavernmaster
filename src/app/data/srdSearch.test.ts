import { beforeEach, describe, expect, it, vi } from "vitest";

const getDatabase = vi.fn();

vi.mock("./db", () => ({
  getDatabase: () => getDatabase()
}));

describe("srdSearch", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("searchSrd", () => {
    it("returns empty array for empty query", async () => {
      const { searchSrd } = await import("./srdSearch");
      const results = await searchSrd("");
      expect(results).toEqual([]);
    });

    it("searches with wildcard terms", async () => {
      const mockDb = {
        select: vi
          .fn()
          .mockResolvedValue([
            { entry_type: "spell", name: "Fireball", content: "A bright streak..." }
          ])
      };
      getDatabase.mockResolvedValue(mockDb);

      const { searchSrd } = await import("./srdSearch");
      const results = await searchSrd("fire");

      expect(mockDb.select).toHaveBeenCalledWith(expect.stringContaining("MATCH"), ["fire*", 20]);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Fireball");
    });

    it("handles multi-word queries", async () => {
      const mockDb = { select: vi.fn().mockResolvedValue([]) };
      getDatabase.mockResolvedValue(mockDb);

      const { searchSrd } = await import("./srdSearch");
      await searchSrd("magic missile");

      expect(mockDb.select).toHaveBeenCalledWith(expect.anything(), ["magic* missile*", 20]);
    });
  });

  describe("getSrdEntryTypes", () => {
    it("returns entry type counts", async () => {
      const mockDb = {
        select: vi.fn().mockResolvedValue([
          { entry_type: "spell", cnt: 100 },
          { entry_type: "monster", cnt: 50 }
        ])
      };
      getDatabase.mockResolvedValue(mockDb);

      const { getSrdEntryTypes } = await import("./srdSearch");
      const types = await getSrdEntryTypes();

      expect(types).toHaveLength(2);
      expect(types[0]).toEqual({ type: "spell", count: 100 });
    });
  });
});
