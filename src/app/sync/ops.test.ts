import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueUpsertAndSchedule, enqueueUpsertsAndSchedule } from "./ops";
import { enqueueUpsert } from "./queue";
import { schedulePush } from "./client";

vi.mock("./queue", () => ({
  enqueueUpsert: vi.fn()
}));
vi.mock("./client", () => ({
  schedulePush: vi.fn()
}));

describe("sync ops", () => {
  const mockEnqueueUpsert = vi.mocked(enqueueUpsert);
  const mockSchedulePush = vi.mocked(schedulePush);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues a single upsert and schedules push", async () => {
    await enqueueUpsertAndSchedule("campaigns", "id-1", { ok: true });

    expect(mockEnqueueUpsert).toHaveBeenCalledWith("campaigns", "id-1", { ok: true });
    expect(mockSchedulePush).toHaveBeenCalled();
  });

  it("enqueues multiple upserts and schedules push", async () => {
    await enqueueUpsertsAndSchedule([
      { entityType: "sessions", entityId: "id-1", payload: { ok: true } },
      { entityType: "characters", entityId: "id-2", payload: { ok: false } }
    ]);

    expect(mockEnqueueUpsert).toHaveBeenCalledTimes(2);
    expect(mockSchedulePush).toHaveBeenCalled();
  });
});
