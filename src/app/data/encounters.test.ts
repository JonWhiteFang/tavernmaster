import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveInitiativeOrder, updateEncounterTurn, getEncounter } from "./encounters";

const mockRows: Record<string, unknown>[] = [];
const mockInitiative: Record<string, unknown>[] = [];

vi.mock("./db", () => ({
  getDatabase: vi.fn().mockResolvedValue({
    execute: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes("UPDATE initiative_entries SET deleted_at")) {
        const id = params[2];
        const row = mockInitiative.find((r) => r.id === id);
        if (row) row.deleted_at = params[0];
      }
      if (sql.includes("INSERT INTO initiative_entries")) {
        mockInitiative.push({
          id: params[0],
          encounter_id: params[1],
          character_id: params[2],
          order_index: params[3],
          created_at: params[4],
          deleted_at: null
        });
      }
      if (sql.includes("UPDATE encounters SET round")) {
        const encId = params[3];
        const row = mockRows.find((r) => r.id === encId);
        if (row) {
          row.round = params[0];
          row.active_turn_id = params[1];
          row.updated_at = params[2];
        }
      }
    }),
    select: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes("FROM encounters WHERE id")) {
        return mockRows.filter((r) => r.id === params[0] && r.deleted_at === null);
      }
      if (sql.includes("FROM initiative_entries")) {
        return mockInitiative.filter((r) => r.encounter_id === params[0] && r.deleted_at === null);
      }
      if (sql.includes("FROM encounter_conditions")) {
        return [];
      }
      return [];
    })
  })
}));

vi.mock("../sync/ops", () => ({
  enqueueUpsertAndSchedule: vi.fn().mockResolvedValue(undefined)
}));

describe("encounters initiative persistence", () => {
  beforeEach(() => {
    mockRows.length = 0;
    mockInitiative.length = 0;
    const now = new Date().toISOString();
    mockRows.push({
      id: "enc-1",
      campaign_id: "camp-1",
      name: "Test Encounter",
      environment: null,
      difficulty: "medium",
      round: 1,
      active_turn_id: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    });
  });

  it("saves initiative order", async () => {
    await saveInitiativeOrder("enc-1", ["char-a", "char-b", "char-c"]);

    const active = mockInitiative.filter((r) => r.deleted_at === null);
    expect(active).toHaveLength(3);
    expect(active[0].character_id).toBe("char-a");
    expect(active[0].order_index).toBe(0);
    expect(active[2].character_id).toBe("char-c");
    expect(active[2].order_index).toBe(2);
  });

  it("soft-deletes existing initiative before saving new order", async () => {
    await saveInitiativeOrder("enc-1", ["char-a"]);
    await saveInitiativeOrder("enc-1", ["char-x", "char-y"]);

    const active = mockInitiative.filter(
      (r) => r.encounter_id === "enc-1" && r.deleted_at === null
    );
    expect(active).toHaveLength(2);
    expect(active[0].character_id).toBe("char-x");
  });

  it("updates encounter turn state", async () => {
    await updateEncounterTurn("enc-1", 3, "char-b");

    const row = mockRows.find((r) => r.id === "enc-1");
    expect(row?.round).toBe(3);
    expect(row?.active_turn_id).toBe("char-b");
  });

  it("gets encounter with initiative order", async () => {
    const now = new Date().toISOString();
    mockInitiative.push(
      {
        id: "i1",
        encounter_id: "enc-1",
        character_id: "char-a",
        order_index: 0,
        created_at: now,
        deleted_at: null
      },
      {
        id: "i2",
        encounter_id: "enc-1",
        character_id: "char-b",
        order_index: 1,
        created_at: now,
        deleted_at: null
      }
    );

    const enc = await getEncounter("enc-1");

    expect(enc).not.toBeNull();
    expect(enc?.initiativeOrder).toEqual(["char-a", "char-b"]);
    expect(enc?.round).toBe(1);
  });

  it("returns null for non-existent encounter", async () => {
    const enc = await getEncounter("non-existent");
    expect(enc).toBeNull();
  });
});
