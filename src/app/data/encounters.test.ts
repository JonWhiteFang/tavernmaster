import { describe, expect, it, vi } from "vitest";
import { createEncounter, listEncounters } from "./encounters";
import { getDatabase } from "./db";
import { enqueueUpsertAndSchedule } from "../sync/ops";

vi.mock("./db", () => ({
  getDatabase: vi.fn()
}));
vi.mock("../sync/ops", () => ({
  enqueueUpsertAndSchedule: vi.fn()
}));

describe("encounters", () => {
  it("lists encounters with initiative and conditions", async () => {
    const encounterRows = [
      {
        id: "enc-1",
        campaign_id: "camp-1",
        name: "Ambush",
        environment: null,
        difficulty: "medium",
        round: 2,
        active_turn_id: null
      },
      {
        id: "enc-2",
        campaign_id: "camp-1",
        name: "Bridge",
        environment: "Cave",
        difficulty: "hard",
        round: 1,
        active_turn_id: "t2"
      }
    ];
    const initiativeRows = {
      "enc-1": [
        { character_id: "c2", order_index: 2 },
        { character_id: "c1", order_index: 1 }
      ],
      "enc-2": [{ character_id: "c3", order_index: 1 }]
    };
    const conditionRows = {
      "enc-1": [{ name: "poisoned" }],
      "enc-2": []
    };
    const select = vi.fn().mockImplementation((query: string, params?: string[]) => {
      if (query.includes("FROM encounters")) {
        return Promise.resolve(encounterRows);
      }
      if (query.includes("FROM initiative_entries")) {
        const encounterId = params?.[0] ?? "";
        return Promise.resolve(initiativeRows[encounterId] ?? []);
      }
      if (query.includes("FROM encounter_conditions")) {
        const encounterId = params?.[0] ?? "";
        return Promise.resolve(conditionRows[encounterId] ?? []);
      }
      return Promise.resolve([]);
    });
    vi.mocked(getDatabase).mockResolvedValue({ select } as never);

    const encounters = await listEncounters("camp-1");

    expect(encounters).toHaveLength(2);
    expect(encounters[0].initiativeOrder).toEqual(["c1", "c2"]);
    expect(encounters[0].conditions).toEqual(["poisoned"]);
    expect(encounters[1].environment).toBe("Cave");
    expect(select).toHaveBeenCalledTimes(5);
  });

  it("creates encounters and schedules sync", async () => {
    const execute = vi.fn();
    vi.mocked(getDatabase).mockResolvedValue({ execute } as never);
    const uuidSpy = vi.spyOn(crypto, "randomUUID").mockReturnValue("enc-id");

    const encounter = await createEncounter({
      campaignId: "camp-1",
      name: "Bridge",
      difficulty: "easy"
    });

    expect(encounter).toMatchObject({
      id: "enc-id",
      campaignId: "camp-1",
      name: "Bridge",
      environment: "",
      difficulty: "easy",
      round: 1,
      initiativeOrder: [],
      conditions: []
    });
    expect(execute).toHaveBeenCalled();
    expect(enqueueUpsertAndSchedule).toHaveBeenCalledWith(
      "encounters",
      "enc-id",
      expect.objectContaining({ id: "enc-id", campaign_id: "camp-1" })
    );
    uuidSpy.mockRestore();
  });
});
