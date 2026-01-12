import type { LlmConfig } from "../../ai/types";
import { requestChatCompletion } from "../../ai/client";
import { parseWithRetry } from "./parse";
import { buildPrompt, type PromptContext } from "./promptBuilder";
import type { TurnResponse } from "./schemas";

export interface OrchestratorResult {
  success: true;
  response: TurnResponse;
  attempts: number;
  rawOutputs: string[];
}

export interface OrchestratorError {
  success: false;
  error: string;
  attempts: number;
  rawOutputs: string[];
}

export type OrchestratorOutcome = OrchestratorResult | OrchestratorError;

export async function orchestrateTurn(
  ctx: PromptContext,
  config: LlmConfig
): Promise<OrchestratorOutcome> {
  const { system, user } = buildPrompt(ctx);

  const result = await parseWithRetry(
    async (attempt) => {
      const temp = attempt === 1 ? config.temperature : 0;
      const messages = [
        { role: "system" as const, content: system },
        {
          role: "user" as const,
          content: attempt > 1 ? `${user}\n\nJSON ONLY. No explanation.` : user
        }
      ];

      const response = await requestChatCompletion({ ...config, temperature: temp }, messages);
      return response.content;
    },
    { maxAttempts: 2 }
  );

  if (result.success) {
    return {
      success: true,
      response: result.data,
      attempts: result.attempts,
      rawOutputs: result.rawOutputs
    };
  }

  return {
    success: false,
    error: result.error,
    attempts: result.attempts,
    rawOutputs: result.rawOutputs
  };
}

export function isOrchestratorSuccess(outcome: OrchestratorOutcome): outcome is OrchestratorResult {
  return outcome.success;
}
