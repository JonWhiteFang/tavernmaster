import { beforeEach, describe, expect, it, vi } from "vitest";

const getDatabase = vi.fn();
const withTransaction = vi.fn();
const getTurnSnapshot = vi.fn();

vi.mock("../../data/db", () => ({
  getDatabase: () => getDatabase(),
  withTransaction: (fn: (db: unknown) => Promise<void>) => withTransaction(fn)
}));

vi.mock("../turns/turnStore", () => ({
  getTurnSnapshot: (id: string) => getTurnSnapshot(id)
}));

describe("branch", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("branchCampaign", () => {
    it("creates new campaign from snapshot", async () => {
      const snapshot = { version: 1, scene: "The tavern" };
      getTurnSnapshot.mockResolvedValue(snapshot);

      const mockDb = {
        select: vi.fn().mockResolvedValue([{ name: "My Campaign", ruleset_version: "5.1" }])
      };
      getDatabase.mockResolvedValue(mockDb);

      const txDb = { execute: vi.fn() };
      withTransaction.mockImplementation(async (fn) => fn(txDb));

      const { branchCampaign } = await import("./branch");
      const result = await branchCampaign({
        campaignId: "camp-1",
        parentTurnId: "turn-5",
        label: "What if?"
      });

      expect(result.newCampaignId).toBeDefined();
      expect(result.branchId).toBeDefined();
      expect(txDb.execute).toHaveBeenCalledTimes(4); // campaign, state, facts, branch record
    });

    it("throws when no snapshot exists", async () => {
      getTurnSnapshot.mockResolvedValue(null);

      const { branchCampaign } = await import("./branch");

      await expect(
        branchCampaign({ campaignId: "camp-1", parentTurnId: "turn-5", label: "Test" })
      ).rejects.toThrow("No snapshot found");
    });
  });

  describe("listBranches", () => {
    it("returns branches for campaign", async () => {
      const mockDb = {
        select: vi
          .fn()
          .mockResolvedValue([
            { id: "b1", target_campaign_id: "camp-2", label: "Alt", created_at: "2024-01-01" }
          ])
      };
      getDatabase.mockResolvedValue(mockDb);

      const { listBranches } = await import("./branch");
      const branches = await listBranches("camp-1");

      expect(branches).toHaveLength(1);
      expect(branches[0].label).toBe("Alt");
    });
  });
});
