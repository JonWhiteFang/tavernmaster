import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createActionProposals,
  updateProposalStatus,
  listPendingProposals,
  listProposalsByEncounter
} from "./action_proposals";

vi.mock("./db", () => {
  const rows: Record<string, unknown>[] = [];
  return {
    getDatabase: vi.fn().mockResolvedValue({
      execute: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => {
        if (sql.includes("INSERT")) {
          rows.push({
            id: params[0],
            encounter_id: params[1],
            character_id: params[2],
            summary: params[3],
            rules_refs: params[4],
            status: params[5],
            payload_json: params[6],
            created_at: params[7],
            updated_at: params[8]
          });
        }
        if (sql.includes("UPDATE")) {
          const id = params[2];
          const row = rows.find((r) => r.id === id);
          if (row) {
            row.status = params[0];
            row.updated_at = params[1];
          }
        }
      }),
      select: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => {
        if (sql.includes("WHERE id = ?")) {
          return rows.filter((r) => r.id === params[0]);
        }
        if (sql.includes("status = 'pending'")) {
          return rows.filter((r) => r.encounter_id === params[0] && r.status === "pending");
        }
        if (sql.includes("WHERE encounter_id = ?")) {
          return rows.filter((r) => r.encounter_id === params[0]);
        }
        return [];
      })
    })
  };
});

vi.mock("../sync/ops", () => ({
  enqueueUpsertAndSchedule: vi.fn().mockResolvedValue(undefined)
}));

describe("action_proposals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates proposals with pending status", async () => {
    const encounterId = "enc-1";
    const proposals = [
      {
        characterId: "char-1",
        summary: "Attack goblin",
        rulesRefs: ["PHB 194"],
        payload: { action: { type: "attack" }, risks: ["low hp"] }
      }
    ];

    const result = await createActionProposals(encounterId, proposals);

    expect(result).toHaveLength(1);
    expect(result[0].encounterId).toBe(encounterId);
    expect(result[0].characterId).toBe("char-1");
    expect(result[0].summary).toBe("Attack goblin");
    expect(result[0].status).toBe("pending");
    expect(result[0].rulesRefs).toEqual(["PHB 194"]);
    expect(result[0].payload).toEqual({ action: { type: "attack" }, risks: ["low hp"] });
  });

  it("updates proposal status", async () => {
    const encounterId = "enc-2";
    const proposals = [{ characterId: "char-2", summary: "Dodge", rulesRefs: [] }];
    const created = await createActionProposals(encounterId, proposals);

    await updateProposalStatus(created[0].id, "approved");

    const pending = await listPendingProposals(encounterId);
    expect(pending).toHaveLength(0);
  });

  it("lists pending proposals for encounter", async () => {
    const encounterId = "enc-3";
    await createActionProposals(encounterId, [
      { characterId: "char-3", summary: "Cast spell", rulesRefs: [] }
    ]);

    const pending = await listPendingProposals(encounterId);

    expect(pending).toHaveLength(1);
    expect(pending[0].summary).toBe("Cast spell");
  });

  it("lists all proposals for encounter", async () => {
    const encounterId = "enc-4";
    const created = await createActionProposals(encounterId, [
      { characterId: "char-4", summary: "Dash", rulesRefs: [] },
      { characterId: "char-5", summary: "Hide", rulesRefs: [] }
    ]);

    await updateProposalStatus(created[0].id, "approved");

    const all = await listProposalsByEncounter(encounterId);
    expect(all).toHaveLength(2);
  });
});
