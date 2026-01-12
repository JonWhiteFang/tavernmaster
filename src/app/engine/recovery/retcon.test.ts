import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertCanonFact = vi.fn();
const listCanonFacts = vi.fn();

vi.mock("../memory/canonStore", () => ({
  upsertCanonFact: (input: unknown) => upsertCanonFact(input),
  listCanonFacts: (id: string) => listCanonFacts(id)
}));

describe("retcon", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("addRetcon", () => {
    it("stores retcon as canon fact with timestamped key", async () => {
      upsertCanonFact.mockResolvedValue(undefined);

      const { addRetcon } = await import("./retcon");
      const key = await addRetcon("camp-1", "Actually, the dragon was friendly");

      expect(key).toMatch(/^retcon:\d+$/);
      expect(upsertCanonFact).toHaveBeenCalledWith({
        campaignId: "camp-1",
        key: expect.stringMatching(/^retcon:\d+$/),
        value: "Actually, the dragon was friendly",
        source: "player_retcon"
      });
    });
  });

  describe("listRetcons", () => {
    it("filters to only retcon facts", async () => {
      listCanonFacts.mockResolvedValue([
        { key: "retcon:123", value: "Note 1" },
        { key: "npc:bob", value: "Bob the innkeeper" },
        { key: "retcon:456", value: "Note 2" }
      ]);

      const { listRetcons } = await import("./retcon");
      const retcons = await listRetcons("camp-1");

      expect(retcons).toHaveLength(2);
      expect(retcons[0].note).toBe("Note 1");
      expect(retcons[1].note).toBe("Note 2");
    });
  });
});
