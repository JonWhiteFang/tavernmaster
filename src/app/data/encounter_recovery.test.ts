import { describe, expect, it, vi } from "vitest";
import {
  clearEncounterRecovery,
  loadEncounterRecovery,
  saveEncounterRecovery
} from "./encounter_recovery";
import { getDatabase } from "./db";

vi.mock("./db", () => ({
  getDatabase: vi.fn()
}));

describe("encounter recovery", () => {
  it("returns null when no snapshot exists", async () => {
    const select = vi.fn().mockResolvedValue([]);
    vi.mocked(getDatabase).mockResolvedValue({ select } as never);

    await expect(loadEncounterRecovery()).resolves.toBeNull();
  });

  it("returns null when stored data is invalid", async () => {
    const select = vi.fn().mockResolvedValue([{ value_json: "{bad-json" }]);
    vi.mocked(getDatabase).mockResolvedValue({ select } as never);

    await expect(loadEncounterRecovery()).resolves.toBeNull();
  });

  it("loads a valid snapshot", async () => {
    const rulesState = {
      round: 1,
      turnOrder: [],
      activeTurnIndex: 0,
      participants: {},
      log: []
    };
    const snapshot = {
      version: 1,
      savedAt: "now",
      rngSeed: 12,
      log: [],
      rulesState
    };
    const select = vi
      .fn()
      .mockResolvedValue([{ value_json: JSON.stringify(snapshot) }]);
    vi.mocked(getDatabase).mockResolvedValue({ select } as never);

    await expect(loadEncounterRecovery()).resolves.toEqual(snapshot);
  });

  it("persists snapshots and clears them", async () => {
    const execute = vi.fn();
    vi.mocked(getDatabase).mockResolvedValue({ execute } as never);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    await saveEncounterRecovery({
      rngSeed: 5,
      log: ["start"],
      rulesState: {
        round: 2,
        turnOrder: [],
        activeTurnIndex: 0,
        participants: {},
        log: []
      }
    });

    const savedArgs = execute.mock.calls[0]?.[1] as string[];
    const parsed = JSON.parse(savedArgs[1]);
    expect(parsed.version).toBe(1);
    expect(parsed.savedAt).toBe("2024-01-01T00:00:00.000Z");

    await clearEncounterRecovery();
    expect(execute).toHaveBeenCalledWith("DELETE FROM app_settings WHERE key = ?", [
      "encounter_recovery"
    ]);

    vi.useRealTimers();
  });
});
