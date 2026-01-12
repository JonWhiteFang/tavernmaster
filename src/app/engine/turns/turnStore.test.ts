import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn();
const select = vi.fn();

vi.mock("../../data/db", () => ({
  getDatabase: vi.fn(async () => ({ execute, select })),
  withTransaction: vi.fn(async (fn) => fn({ execute, select }))
}));

describe("turnStore", () => {
  beforeEach(() => {
    vi.resetModules();
    execute.mockClear();
    select.mockClear();
  });

  it("appendTurn inserts turn, snapshot, and updates state in transaction", async () => {
    select.mockResolvedValue([{ cnt: 5 }]);
    execute.mockResolvedValue(undefined);

    const { appendTurn } = await import("./turnStore");

    const turn = await appendTurn({
      campaignId: "camp-1",
      sessionId: "sess-1",
      playerInput: "I attack the goblin",
      aiOutput: "You swing your sword...",
      mode: "combat",
      stateDoc: { version: 1, scene: "Battle", mode: "combat" } as never
    });

    expect(turn.campaignId).toBe("camp-1");
    expect(turn.playerInput).toBe("I attack the goblin");

    // Verify transaction calls
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO turns"),
      expect.arrayContaining(["camp-1", "sess-1"])
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO turn_state_snapshots"),
      expect.any(Array)
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO campaign_state"),
      expect.any(Array)
    );
  });

  it("listTurns returns paginated results", async () => {
    select.mockResolvedValue([
      {
        id: "t-1",
        campaign_id: "camp-1",
        session_id: "sess-1",
        turn_number: 1,
        player_input: "Hello",
        ai_output: "Hi",
        mode: "exploration",
        created_at: "2024-01-01"
      }
    ]);

    const { listTurns } = await import("./turnStore");
    const turns = await listTurns("camp-1", 10, 0);

    expect(turns).toHaveLength(1);
    expect(turns[0].playerInput).toBe("Hello");
    expect(select).toHaveBeenCalledWith(expect.stringContaining("ORDER BY created_at DESC"), [
      "camp-1",
      10,
      0
    ]);
  });

  it("getTurnSnapshot returns parsed state", async () => {
    const stateDoc = { version: 1, scene: "Forest", mode: "exploration" };
    select.mockResolvedValue([{ state_json: JSON.stringify(stateDoc) }]);

    const { getTurnSnapshot } = await import("./turnStore");
    const snapshot = await getTurnSnapshot("t-1");

    expect(snapshot?.scene).toBe("Forest");
  });

  it("getTurnSnapshot returns null when not found", async () => {
    select.mockResolvedValue([]);

    const { getTurnSnapshot } = await import("./turnStore");
    const snapshot = await getTurnSnapshot("t-missing");

    expect(snapshot).toBeNull();
  });
});
