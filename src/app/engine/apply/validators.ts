import type { TurnResponse } from "../ai/schemas";
import type { CampaignStateDoc } from "../state/types";

export interface ValidationError {
  field: string;
  message: string;
}

export function validateStatePatch(
  response: TurnResponse,
  currentState: CampaignStateDoc
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate HP delta bounds (assuming max 999 HP change per turn)
  if (response.statePatch.playerHpDelta !== undefined) {
    const delta = response.statePatch.playerHpDelta;
    if (delta < -999 || delta > 999) {
      errors.push({
        field: "statePatch.playerHpDelta",
        message: "HP delta out of bounds (-999 to 999)"
      });
    }
  }

  // Validate mode transition
  if (response.statePatch.mode) {
    const validModes = ["exploration", "combat", "dialogue", "rest"];
    if (!validModes.includes(response.statePatch.mode)) {
      errors.push({
        field: "statePatch.mode",
        message: `Invalid mode: ${response.statePatch.mode}`
      });
    }
  }

  // Validate quest transitions
  const validTransitions: Record<string, string[]> = {
    active: ["completed", "failed", "abandoned"],
    completed: [],
    failed: [],
    abandoned: ["active"]
  };

  for (const questUpdate of response.canonUpdates.quests) {
    if (questUpdate.status) {
      const existing = currentState.quests.find((q) => q.id === questUpdate.id);
      if (existing) {
        const allowed = validTransitions[existing.status] || [];
        if (!allowed.includes(questUpdate.status)) {
          errors.push({
            field: `canonUpdates.quests.${questUpdate.id}`,
            message: `Invalid quest transition: ${existing.status} → ${questUpdate.status}`
          });
        }
      }
    }
  }

  return errors;
}

export function isValidPatch(response: TurnResponse, currentState: CampaignStateDoc): boolean {
  return validateStatePatch(response, currentState).length === 0;
}
