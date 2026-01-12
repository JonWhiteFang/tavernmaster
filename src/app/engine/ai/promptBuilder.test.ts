import { describe, expect, it } from "vitest";
import { buildPrompt, getPromptSize, type PromptContext } from "./promptBuilder";

const baseCtx: PromptContext = {
  canonSummary: "The hero seeks the lost artifact.",
  recentSummary: "They entered the dungeon.",
  stateDoc: {
    version: 1,
    scene: "A dark corridor",
    playerSummary: "",
    companionsSummary: "",
    quests: [
      { id: "q1", name: "Find the artifact", description: "", status: "active", objectives: [] }
    ],
    npcs: [],
    locations: [],
    inventoryNotes: "",
    flags: {},
    mode: "exploration",
    turnCount: 5
  },
  recentTurns: [],
  playerInput: "I search for traps",
  playStyle: "classic"
};

describe("promptBuilder", () => {
  it("builds system prompt with context", () => {
    const { system } = buildPrompt(baseCtx);

    expect(system).toContain("fair and balanced");
    expect(system).toContain("lost artifact");
    expect(system).toContain("dark corridor");
    expect(system).toContain("Find the artifact");
    expect(system).toContain("JSON ONLY");
  });

  it("builds user prompt with player input", () => {
    const { user } = buildPrompt(baseCtx);

    expect(user).toContain("I search for traps");
  });

  it("includes recent turns in user prompt", () => {
    const ctx: PromptContext = {
      ...baseCtx,
      recentTurns: [
        {
          id: "t1",
          campaignId: "c1",
          sessionId: null,
          turnNumber: 1,
          playerInput: "I open the door",
          aiOutput: "The door creaks open revealing darkness beyond.",
          mode: "exploration",
          createdAt: "2024-01-01"
        }
      ]
    };

    const { user } = buildPrompt(ctx);

    expect(user).toContain("I open the door");
    expect(user).toContain("door creaks open");
  });

  it("respects max prompt size", () => {
    const ctx: PromptContext = {
      ...baseCtx,
      canonSummary: "A".repeat(5000),
      recentSummary: "B".repeat(5000),
      playerInput: "C".repeat(5000)
    };

    const size = getPromptSize(ctx);

    expect(size).toBeLessThanOrEqual(12000);
  });

  it("uses play style prompt", () => {
    const grittyCtx: PromptContext = { ...baseCtx, playStyle: "gritty" };
    const { system } = buildPrompt(grittyCtx);

    expect(system).toContain("harsh Dungeon Master");
  });
});
