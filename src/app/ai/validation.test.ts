import { describe, expect, it } from "vitest";
import { dmPayloadSchema, partyPayloadSchema } from "./validation";

describe("ai validation", () => {
  it("accepts valid dm payload", () => {
    const result = dmPayloadSchema.safeParse({
      narrative: "Test",
      sceneUpdates: ["Update"],
      questions: ["Q?"]
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid party payload", () => {
    const result = partyPayloadSchema.safeParse({
      proposals: [
        {
          characterId: "char-1",
          summary: "Attack",
          action: { type: "attack" },
          rulesRefs: [],
          risks: [],
          alternatives: []
        }
      ]
    });
    expect(result.success).toBe(true);
  });
});
