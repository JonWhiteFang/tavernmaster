import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TurnResponse } from "../ai/schemas";
import type { CampaignStateDoc } from "../state/types";

const appendTurn = vi.fn();
const upsertCanonFact = vi.fn();
const withTransaction = vi.fn();

vi.mock("../../data/db", () => ({
  withTransaction: (fn: () => Promise<void>) => withTransaction(fn)
}));

vi.mock("../turns/turnStore", () => ({
  appendTurn: (input: unknown) => appendTurn(input)
}));

vi.mock("../memory/canonStore", () => ({
  upsertCanonFact: (input: unknown) => upsertCanonFact(input)
}));

const baseState: CampaignStateDoc = {
  version: 1,
  scene: "The tavern",
  playerSummary: "",
  companionsSummary: "",
  quests: [{ id: "q1", name: "Find artifact", description: "", status: "active", objectives: [] }],
  npcs: [],
  locations: [],
  inventoryNotes: "",
  flags: {},
  mode: "exploration",
  turnCount: 5
};

const validResponse: TurnResponse = {
  narrative: "You search the room.",
  choices: [{ id: "1", text: "Continue", type: "action" }],
  mechanics: { rolls: [], conditions: [] },
  statePatch: { scene: "A hidden passage" },
  canonUpdates: { facts: [], quests: [] }
};

describe("applyTurn", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    appendTurn.mockResolvedValue({ id: "turn-1" });
    withTransaction.mockImplementation(async (fn) => fn());
  });

  it("applies valid turn and returns new state", async () => {
    const { applyTurn } = await import("./applyTurn");

    const result = await applyTurn({
      campaignId: "camp-1",
      playerInput: "I search",
      response: validResponse,
      currentState: baseState
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.turnId).toBe("turn-1");
      expect(result.newState.scene).toBe("A hidden passage");
      expect(result.newState.turnCount).toBe(6);
    }
  });

  it("rejects invalid HP delta", async () => {
    const { applyTurn } = await import("./applyTurn");

    const badResponse: TurnResponse = {
      ...validResponse,
      statePatch: { playerHpDelta: 9999 }
    };

    const result = await applyTurn({
      campaignId: "camp-1",
      playerInput: "I search",
      response: badResponse,
      currentState: baseState
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].field).toBe("statePatch.playerHpDelta");
    }
  });

  it("rejects invalid quest transition", async () => {
    const { applyTurn } = await import("./applyTurn");

    const badResponse: TurnResponse = {
      ...validResponse,
      canonUpdates: { facts: [], quests: [{ id: "q1", status: "active" }] }
    };

    const stateWithCompleted: CampaignStateDoc = {
      ...baseState,
      quests: [{ id: "q1", name: "Done", description: "", status: "completed", objectives: [] }]
    };

    const result = await applyTurn({
      campaignId: "camp-1",
      playerInput: "I search",
      response: badResponse,
      currentState: stateWithCompleted
    });

    expect(result.success).toBe(false);
  });

  it("adds new quests from canon updates", async () => {
    const { applyTurn } = await import("./applyTurn");

    const responseWithNewQuest: TurnResponse = {
      ...validResponse,
      canonUpdates: { facts: [], quests: [{ id: "q2", name: "New Quest", status: "active" }] }
    };

    const result = await applyTurn({
      campaignId: "camp-1",
      playerInput: "I search",
      response: responseWithNewQuest,
      currentState: baseState
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.newState.quests).toHaveLength(2);
      expect(result.newState.quests[1].name).toBe("New Quest");
    }
  });

  it("upserts canon facts", async () => {
    const { applyTurn } = await import("./applyTurn");

    const responseWithFacts: TurnResponse = {
      ...validResponse,
      canonUpdates: { facts: [{ key: "npc:bob", value: "Bob is friendly" }], quests: [] }
    };

    await applyTurn({
      campaignId: "camp-1",
      playerInput: "I search",
      response: responseWithFacts,
      currentState: baseState
    });

    expect(upsertCanonFact).toHaveBeenCalledWith({
      campaignId: "camp-1",
      key: "npc:bob",
      value: "Bob is friendly",
      source: "ai"
    });
  });
});
