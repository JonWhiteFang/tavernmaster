import { beforeEach, describe, expect, it, vi } from "vitest";

const getDatabase = vi.fn();
const withTransaction = vi.fn();
const saveCampaignState = vi.fn();

vi.mock("../../data/db", () => ({
  getDatabase: () => getDatabase(),
  withTransaction: (fn: (db: unknown) => Promise<void>) => withTransaction(fn)
}));

vi.mock("../state/store", () => ({
  saveCampaignState: (id: string, doc: unknown) => saveCampaignState(id, doc)
}));

describe("undo", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("undoLastTurn", () => {
    it("returns null when fewer than 2 turns exist", async () => {
      const mockDb = { select: vi.fn().mockResolvedValue([{ id: "turn-1" }]) };
      getDatabase.mockResolvedValue(mockDb);

      const { undoLastTurn } = await import("./undo");
      const result = await undoLastTurn("camp-1");

      expect(result).toBeNull();
    });

    it("marks last turn as undone and restores previous state", async () => {
      const previousState = { version: 1, scene: "Previous scene" };
      const mockDb = {
        select: vi
          .fn()
          .mockResolvedValueOnce([{ id: "turn-2" }, { id: "turn-1" }])
          .mockResolvedValueOnce([{ state_json: JSON.stringify(previousState) }])
      };
      getDatabase.mockResolvedValue(mockDb);

      const txDb = { execute: vi.fn() };
      withTransaction.mockImplementation(async (fn) => fn(txDb));
      saveCampaignState.mockResolvedValue(undefined);

      const { undoLastTurn } = await import("./undo");
      const result = await undoLastTurn("camp-1");

      expect(result).not.toBeNull();
      expect(result?.undoneId).toBe("turn-2");
      expect(result?.restoredState).toEqual(previousState);
      expect(txDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE turns SET status = 'undone'"),
        ["turn-2"]
      );
      expect(saveCampaignState).toHaveBeenCalledWith("camp-1", previousState);
    });

    it("returns null when no snapshot exists", async () => {
      const mockDb = {
        select: vi
          .fn()
          .mockResolvedValueOnce([{ id: "turn-2" }, { id: "turn-1" }])
          .mockResolvedValueOnce([])
      };
      getDatabase.mockResolvedValue(mockDb);

      const { undoLastTurn } = await import("./undo");
      const result = await undoLastTurn("camp-1");

      expect(result).toBeNull();
    });
  });

  describe("getUndoableCount", () => {
    it("returns count minus 1", async () => {
      const mockDb = { select: vi.fn().mockResolvedValue([{ cnt: 5 }]) };
      getDatabase.mockResolvedValue(mockDb);

      const { getUndoableCount } = await import("./undo");
      const count = await getUndoableCount("camp-1");

      expect(count).toBe(4);
    });

    it("returns 0 when only 1 turn exists", async () => {
      const mockDb = { select: vi.fn().mockResolvedValue([{ cnt: 1 }]) };
      getDatabase.mockResolvedValue(mockDb);

      const { getUndoableCount } = await import("./undo");
      const count = await getUndoableCount("camp-1");

      expect(count).toBe(0);
    });
  });
});
