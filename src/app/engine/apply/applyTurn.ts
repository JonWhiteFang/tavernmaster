import { withTransaction } from "../../data/db";
import type { TurnResponse } from "../ai/schemas";
import type { CampaignStateDoc } from "../state/types";
import { appendTurn } from "../turns/turnStore";
import { upsertCanonFact } from "../memory/canonStore";
import { validateStatePatch } from "./validators";

export interface ApplyTurnInput {
  campaignId: string;
  sessionId?: string;
  playerInput: string;
  response: TurnResponse;
  currentState: CampaignStateDoc;
}

export interface ApplyTurnResult {
  success: true;
  turnId: string;
  newState: CampaignStateDoc;
}

export interface ApplyTurnError {
  success: false;
  errors: { field: string; message: string }[];
}

export type ApplyTurnOutcome = ApplyTurnResult | ApplyTurnError;

export async function applyTurn(input: ApplyTurnInput): Promise<ApplyTurnOutcome> {
  const { campaignId, sessionId, playerInput, response, currentState } = input;

  // Validate
  const errors = validateStatePatch(response, currentState);
  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Build new state
  const newState: CampaignStateDoc = {
    ...currentState,
    version: currentState.version,
    scene: response.statePatch.scene ?? currentState.scene,
    mode: response.statePatch.mode ?? currentState.mode,
    turnCount: currentState.turnCount + 1,
    quests: currentState.quests.map((q) => {
      const update = response.canonUpdates.quests.find((u) => u.id === q.id);
      if (update) {
        return { ...q, name: update.name ?? q.name, status: update.status ?? q.status };
      }
      return q;
    })
  };

  // Add new quests
  for (const questUpdate of response.canonUpdates.quests) {
    if (!currentState.quests.find((q) => q.id === questUpdate.id) && questUpdate.name) {
      newState.quests.push({
        id: questUpdate.id,
        name: questUpdate.name,
        description: "",
        status: questUpdate.status ?? "active",
        objectives: []
      });
    }
  }

  // Apply in transaction
  const turn = await appendTurn({
    campaignId,
    sessionId,
    playerInput,
    aiOutput: response.narrative,
    mode: newState.mode,
    stateDoc: newState
  });

  // Upsert canon facts (outside transaction for simplicity)
  await withTransaction(async () => {
    for (const fact of response.canonUpdates.facts) {
      await upsertCanonFact({ campaignId, key: fact.key, value: fact.value, source: "ai" });
    }
  });

  return { success: true, turnId: turn.id, newState };
}
