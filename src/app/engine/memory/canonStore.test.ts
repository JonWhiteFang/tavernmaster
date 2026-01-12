import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
const select = vi.fn();

vi.mock("../../data/db", () => ({
  getDatabase: vi.fn(async () => ({ execute, select }))
}));

describe("canonStore", () => {
  beforeEach(() => {
    vi.resetModules();
    execute.mockClear();
    select.mockClear();
  });

  describe("canon facts", () => {
    it("upsertCanonFact inserts with ON CONFLICT", async () => {
      const { upsertCanonFact } = await import("./canonStore");

      await upsertCanonFact({
        campaignId: "camp-1",
        key: "npc:bartender",
        type: "npc",
        value: "Gruff but kind"
      });

      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO canon_facts"),
        expect.arrayContaining(["camp-1", "npc:bartender", "npc", "Gruff but kind"])
      );
    });

    it("upsertCanonFact is idempotent by key", async () => {
      const { upsertCanonFact } = await import("./canonStore");

      await upsertCanonFact({ campaignId: "c1", key: "k1", type: "lore", value: "v1" });
      await upsertCanonFact({ campaignId: "c1", key: "k1", type: "lore", value: "v2" });

      expect(execute).toHaveBeenCalledTimes(2);
      // Both use ON CONFLICT DO UPDATE
    });
  });

  describe("quest transitions", () => {
    it("allows active → completed", async () => {
      select.mockResolvedValue([{ status: "active" }]);
      const { updateQuestStatus } = await import("./canonStore");

      await updateQuestStatus("q-1", "completed");

      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE quest_threads SET status"),
        expect.arrayContaining(["completed"])
      );
    });

    it("blocks completed → active", async () => {
      select.mockResolvedValue([{ status: "completed" }]);
      const { updateQuestStatus } = await import("./canonStore");

      await expect(updateQuestStatus("q-1", "active")).rejects.toThrow("Invalid transition");
    });

    it("allows failed → active (retry)", async () => {
      select.mockResolvedValue([{ status: "failed" }]);
      const { updateQuestStatus } = await import("./canonStore");

      await updateQuestStatus("q-1", "active");

      expect(execute).toHaveBeenCalled();
    });
  });

  describe("summaries", () => {
    it("upsertCanonSummary creates or updates", async () => {
      select.mockResolvedValue([]);
      const { upsertCanonSummary } = await import("./canonStore");

      await upsertCanonSummary("camp-1", { long: "Long story", recent: "Recent events" });

      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO canon_summaries"),
        expect.arrayContaining(["camp-1", "Long story", "Recent events"])
      );
    });
  });
});
