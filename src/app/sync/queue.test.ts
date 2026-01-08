import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteOp,
  deleteOpForEntity,
  ensureSyncState,
  hasPendingOp,
  listPendingOps,
  makeSyncQueueId,
  updateSyncState
} from "./queue";
import { getDatabase } from "../data/db";

vi.mock("../data/db", () => ({
  getDatabase: vi.fn()
}));

describe("sync queue", () => {
  const mockGetDatabase = vi.mocked(getDatabase);
  const select = vi.fn();
  const execute = vi.fn();

  beforeEach(() => {
    select.mockReset();
    execute.mockReset();
    mockGetDatabase.mockResolvedValue({ select, execute } as never);
  });

  it("builds queue ids", () => {
    expect(makeSyncQueueId("campaigns", "id-1")).toBe("campaigns:id-1");
  });

  it("returns existing sync state when present", async () => {
    select.mockResolvedValue([
      {
        id: "default",
        last_pulled_at: "t1",
        last_pushed_at: "t2",
        conflict_count: 1,
        created_at: "t0",
        updated_at: "t3"
      }
    ]);

    const state = await ensureSyncState();

    expect(state.conflict_count).toBe(1);
    expect(execute).not.toHaveBeenCalled();
  });

  it("creates sync state when missing", async () => {
    select.mockResolvedValue([]);

    const state = await ensureSyncState();

    expect(state.conflict_count).toBe(0);
    expect(execute).toHaveBeenCalled();
  });

  it("updates sync state fields", async () => {
    select.mockResolvedValue([
      {
        id: "default",
        last_pulled_at: "t1",
        last_pushed_at: "t2",
        conflict_count: 1,
        created_at: "t0",
        updated_at: "t3"
      }
    ]);

    await updateSyncState({ lastPulledAt: "t9", conflictCount: 3 });

    expect(execute).toHaveBeenCalledWith(expect.stringContaining("UPDATE sync_state"), [
      "t9",
      "t2",
      3,
      expect.any(String),
      "default"
    ]);
  });

  it("clamps listPendingOps limits", async () => {
    select.mockResolvedValue([]);

    await listPendingOps(0);
    expect(select).toHaveBeenCalledWith(expect.stringContaining("LIMIT 1"));

    await listPendingOps(2000);
    expect(select).toHaveBeenCalledWith(expect.stringContaining("LIMIT 1000"));
  });

  it("checks for pending ops", async () => {
    select.mockResolvedValue([{ id: "campaigns:id-1" }]);

    await expect(hasPendingOp("campaigns", "id-1")).resolves.toBe(true);
  });

  it("deletes ops by id", async () => {
    await deleteOp("campaigns:id-1");
    expect(execute).toHaveBeenCalledWith("DELETE FROM sync_queue WHERE id = ?", ["campaigns:id-1"]);
  });

  it("deletes ops by entity", async () => {
    await deleteOpForEntity("campaigns", "id-9");
    expect(execute).toHaveBeenCalledWith("DELETE FROM sync_queue WHERE id = ?", ["campaigns:id-9"]);
  });
});
