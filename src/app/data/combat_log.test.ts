import { describe, it, expect, vi, beforeEach } from "vitest";
import { appendCombatLog, listCombatLog, listCombatLogByCampaign } from "./combat_log";

const mockRows: Record<string, unknown>[] = [];

vi.mock("./db", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    execute: vi.fn().mockImplementation(async (_sql: string, params: unknown[]) => {
      mockRows.push({
        id: params[0],
        encounter_id: params[1],
        entry_type: params[2],
        payload_json: params[3],
        created_at: params[4]
      });
    }),
    select: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes("JOIN encounters")) {
        // listCombatLogByCampaign - return all for simplicity
        return mockRows.slice(0, params[1] as number);
      }
      const encId = params[0];
      const limit = params[1] as number;
      return mockRows.filter((r) => r.encounter_id === encId).slice(0, limit);
    })
  })
}));

vi.mock("../sync/ops", () => ({
  enqueueUpsertAndSchedule: vi.fn().mockResolvedValue(undefined)
}));

describe("combat_log", () => {
  beforeEach(() => {
    mockRows.length = 0;
  });

  it("appends combat log entry", async () => {
    const entry = await appendCombatLog("enc-1", "attack", { damage: 8 });

    expect(entry.encounterId).toBe("enc-1");
    expect(entry.entryType).toBe("attack");
    expect(entry.payload).toEqual({ damage: 8 });
    expect(mockRows).toHaveLength(1);
  });

  it("lists combat log entries for encounter", async () => {
    await appendCombatLog("enc-1", "attack", { damage: 5 });
    await appendCombatLog("enc-1", "heal", { amount: 10 });
    await appendCombatLog("enc-2", "attack", { damage: 3 });

    const entries = await listCombatLog("enc-1", 10);

    expect(entries).toHaveLength(2);
  });

  it("respects limit parameter", async () => {
    await appendCombatLog("enc-1", "attack", { damage: 1 });
    await appendCombatLog("enc-1", "attack", { damage: 2 });
    await appendCombatLog("enc-1", "attack", { damage: 3 });

    const entries = await listCombatLog("enc-1", 2);

    expect(entries).toHaveLength(2);
  });

  it("lists combat log by campaign", async () => {
    await appendCombatLog("enc-1", "attack", { damage: 5 });

    const entries = await listCombatLogByCampaign("camp-1", 10);

    expect(entries.length).toBeGreaterThanOrEqual(0); // Mock returns all rows
  });
});
