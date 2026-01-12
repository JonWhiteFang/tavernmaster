import type { CampaignStateDoc } from "../state/types";
import type { Turn } from "../turns/turnStore";
import { playStylePrompts, type PlayStyle } from "./playStyles";

const MAX_PROMPT_CHARS = 12000;
const MAX_TURN_EXCERPT = 200;

export interface PromptContext {
  canonSummary: string;
  recentSummary: string;
  stateDoc: CampaignStateDoc;
  recentTurns: Turn[];
  playerInput: string;
  playStyle: PlayStyle;
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const style = playStylePrompts[ctx.playStyle];
  const scene = ctx.stateDoc.scene || "The adventure begins.";
  const quests = ctx.stateDoc.quests
    .filter((q) => q.status === "active")
    .map((q) => `- ${q.name}`)
    .join("\n");

  return `${style}

## Campaign Summary
${ctx.canonSummary || "A new adventure."}

## Recent Events
${ctx.recentSummary || "None yet."}

## Current Scene
${scene}

## Active Quests
${quests || "None"}

## Response Format
Respond with valid JSON matching this schema:
{
  "narrative": "string - what happens next",
  "choices": [{"id": "string", "text": "string", "type": "action|dialogue|move|rest|combat"}],
  "mechanics": {"rolls": [], "damage": null, "healing": null, "conditions": []},
  "statePatch": {"scene": null, "mode": null, "playerHpDelta": null},
  "canonUpdates": {"facts": [], "quests": []}
}
Provide 3-7 choices. JSON ONLY, no markdown.`;
}

export function buildUserPrompt(ctx: PromptContext): string {
  const turnHistory = ctx.recentTurns
    .slice(0, 5)
    .map((t) => `> ${t.playerInput}\n${t.aiOutput.slice(0, MAX_TURN_EXCERPT)}...`)
    .join("\n\n");

  let prompt = "";
  if (turnHistory) {
    prompt += `Recent turns:\n${turnHistory}\n\n`;
  }
  prompt += `Player action: ${ctx.playerInput}`;

  return prompt;
}

export function buildPrompt(ctx: PromptContext): { system: string; user: string } {
  const system = buildSystemPrompt(ctx);
  let user = buildUserPrompt(ctx);

  // Truncate if needed
  const total = system.length + user.length;
  if (total > MAX_PROMPT_CHARS) {
    const available = MAX_PROMPT_CHARS - system.length - 100;
    user = user.slice(0, available) + "...";
  }

  return { system, user };
}

export function getPromptSize(ctx: PromptContext): number {
  const { system, user } = buildPrompt(ctx);
  return system.length + user.length;
}
