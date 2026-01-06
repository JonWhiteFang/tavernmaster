import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "../test/fakeDb";
import { FakeSupabaseClient } from "../test/fakeSupabase";

let fakeDb: FakeDb;
let fakeSupabase: FakeSupabaseClient;

vi.mock("../data/db", () => ({
  getDatabase: async () => fakeDb
}));

vi.mock("./supabase", () => ({
  getSupabaseClient: () => fakeSupabase
}));

describe("sync engine integration", () => {
  beforeEach(async () => {
    fakeDb = new FakeDb();
    fakeSupabase = new FakeSupabaseClient();
    vi.resetModules();
  });

  it("pushPendingOps pushes queued upserts and clears the queue", async () => {
    const { enqueueUpsert, listPendingOps } = await import("./queue");
    const { pushPendingOps } = await import("./engine");

    await enqueueUpsert("campaigns", "c1", {
      id: "c1",
      name: "Local",
      summary: null,
      active_scene_id: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    });

    const before = await listPendingOps(10);
    expect(before).toHaveLength(1);

    const result = await pushPendingOps();
    expect(result.ok).toBe(true);
    expect(fakeSupabase.upserts).toHaveLength(1);

    const after = await listPendingOps(10);
    expect(after).toHaveLength(0);
  });

  it("pushPendingOps skips ops with unresolved conflicts", async () => {
    const { enqueueUpsert, listPendingOps } = await import("./queue");
    const { upsertConflict } = await import("./conflicts");
    const { pushPendingOps } = await import("./engine");

    await upsertConflict({
      entityType: "campaigns",
      entityId: "c1",
      localPayload: { id: "c1" },
      remotePayload: { id: "c1" },
      localUpdatedAt: "2026-01-01T00:00:00.000Z",
      remoteUpdatedAt: "2026-01-02T00:00:00.000Z"
    });

    await enqueueUpsert("campaigns", "c1", {
      id: "c1",
      name: "Local",
      summary: null,
      active_scene_id: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-03T00:00:00.000Z"
    });

    const result = await pushPendingOps();
    expect(result.ok).toBe(true);
    expect(fakeSupabase.upserts).toHaveLength(0);

    const pending = await listPendingOps(10);
    expect(pending).toHaveLength(1);
  });

  it("pullRemoteChanges creates a conflict when remote is newer than a queued local change", async () => {
    const { enqueueUpsert, listPendingOps } = await import("./queue");
    const { pullRemoteChanges } = await import("./engine");
    const { listOpenConflicts } = await import("./conflicts");

    fakeDb.seedRow("campaigns", {
      id: "c1",
      name: "Local",
      summary: null,
      active_scene_id: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    });

    await enqueueUpsert("campaigns", "c1", {
      id: "c1",
      name: "Local edit",
      summary: null,
      active_scene_id: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-03T00:00:00.000Z"
    });

    fakeSupabase.setRemoteRows("campaigns", [
      {
        id: "c1",
        name: "Remote",
        summary: null,
        active_scene_id: null,
        deleted_at: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z"
      }
    ]);

    const result = await pullRemoteChanges();
    expect(result.ok).toBe(true);

    const conflicts = await listOpenConflicts(10);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].entity_type).toBe("campaigns");
    expect(conflicts[0].entity_id).toBe("c1");

    const row = fakeDb.getRow("campaigns", "c1");
    expect(row?.name).toBe("Local");

    const pending = await listPendingOps(10);
    expect(pending).toHaveLength(1);
  });

  it("keepRemoteForConflict applies remote and clears op + conflict", async () => {
    const { enqueueUpsert, listPendingOps } = await import("./queue");
    const { pullRemoteChanges } = await import("./engine");
    const { listOpenConflicts } = await import("./conflicts");
    const { keepRemoteForConflict } = await import("./resolve");

    fakeDb.seedRow("campaigns", {
      id: "c1",
      name: "Local",
      summary: null,
      active_scene_id: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    });

    await enqueueUpsert("campaigns", "c1", {
      id: "c1",
      name: "Local edit",
      summary: null,
      active_scene_id: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-03T00:00:00.000Z"
    });

    fakeSupabase.setRemoteRows("campaigns", [
      {
        id: "c1",
        name: "Remote",
        summary: null,
        active_scene_id: null,
        deleted_at: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z"
      }
    ]);

    await pullRemoteChanges();
    expect(await listOpenConflicts(10)).toHaveLength(1);

    await keepRemoteForConflict("campaigns", "c1");

    expect(await listOpenConflicts(10)).toHaveLength(0);
    expect(await listPendingOps(10)).toHaveLength(0);
    expect(fakeDb.getRow("campaigns", "c1")?.name).toBe("Remote");
    expect(fakeDb.getRow("campaigns", "c1")?.updated_at).toBe("2026-01-02T00:00:00.000Z");
  });
});
