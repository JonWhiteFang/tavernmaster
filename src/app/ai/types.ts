import type { Action } from "../rules/types";

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type LlmConfig = {
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  stream: boolean;
};

export type DmResponse = {
  narrative: string;
  sceneUpdates: string[];
  questions: string[];
};

export type PartyActionProposal = {
  characterId: string;
  summary: string;
  action: Action;
  rulesRefs: string[];
  risks: string[];
  alternatives: string[];
};

export type PartyActionPayload = {
  proposals: PartyActionProposal[];
};

export type DmPayload = DmResponse;

export type LlmUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type LlmResponse = {
  content: string;
  usage?: LlmUsage;
};
