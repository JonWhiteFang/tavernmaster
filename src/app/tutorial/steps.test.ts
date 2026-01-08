import { describe, expect, it } from "vitest";
import { tutorialSteps, tutorialVersion } from "./steps";

describe("tutorial steps", () => {
  it("defines a stable version and unique step ids", () => {
    expect(tutorialVersion).toBeTruthy();

    const ids = new Set<string>();
    for (const step of tutorialSteps) {
      expect(step.id).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.body).toBeTruthy();
      expect(ids.has(step.id)).toBe(false);
      ids.add(step.id);
      if (step.advanceOn) {
        expect(step.advanceOn.type).toBe("event");
        expect(step.advanceOn.name).toBeTruthy();
      }
    }
  });
});
