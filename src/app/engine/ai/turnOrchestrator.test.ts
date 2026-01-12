import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PromptContext } from "./promptBuilder";

const requestChatCompletion = vi.fn();

vi.mock("../../ai/client", () => ({
  requestChatCompletion: (...args: unknown[]) => requestChatCompletion(...args)
}));

const baseCtx: PromptContext = {
  canonSummary: "Test campaign",
  recentSummary: "Recent events",
  stateDoc: {
    version: 1,
    scene: "Test scene",
    playerSummary: "",
    companionsSummary: "",
    quests: [],
    npcs: [],
    locations: [],
    inventoryNotes: "",
    flags: {},
    mode: "exploration",
    turnCount: 0
  },
  recentTurns: [],
  playerInput: "I attack",
  playStyle: "classic"
};

const validResponse = JSON.stringify({
  narrative: "You swing your sword.",
  choices: [{ id: "1", text: "Continue" }]
});

describe("turnOrchestrator", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns success on valid response", async () => {
    requestChatCompletion.mockResolvedValue({ content: validResponse });

    const { orchestrateTurn } = await import("./turnOrchestrator");
    const result = await orchestrateTurn(baseCtx, {
      baseUrl: "http://localhost",
      model: "test",
      temperature: 0.7
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.response.narrative).toBe("You swing your sword.");
      expect(result.attempts).toBe(1);
    }
  });

  it("retries with temperature 0 on failure", async () => {
    requestChatCompletion
      .mockResolvedValueOnce({ content: "invalid" })
      .mockResolvedValueOnce({ content: validResponse });

    const { orchestrateTurn } = await import("./turnOrchestrator");
    const result = await orchestrateTurn(baseCtx, {
      baseUrl: "http://localhost",
      model: "test",
      temperature: 0.7
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(requestChatCompletion).toHaveBeenCalledTimes(2);

    // Second call should have temperature 0
    const secondCall = requestChatCompletion.mock.calls[1][0];
    expect(secondCall.temperature).toBe(0);
  });

  it("returns error after all retries fail", async () => {
    requestChatCompletion.mockResolvedValue({ content: "invalid" });

    const { orchestrateTurn } = await import("./turnOrchestrator");
    const result = await orchestrateTurn(baseCtx, {
      baseUrl: "http://localhost",
      model: "test",
      temperature: 0.7
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(2);
    expect(result.rawOutputs).toHaveLength(2);
  });
});
