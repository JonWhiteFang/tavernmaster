import type { Action, RulesState } from "../rules/types";
import { validateAction } from "../rules/actions";
import { insertAiLog, listAiLogs } from "../data/ai_logs";
import { querySrd } from "../data/srd_queries";
import { getAppSettings } from "../data/settings";
import { requestChatCompletion, streamChatCompletion } from "./client";
import { parseJsonWithRepair } from "./parser";
import { dmJsonSchema, dmSystemPrompt, partyJsonSchema, partySystemPrompt } from "./prompts";
import type { ChatMessage, DmPayload, PartyActionPayload, PartyActionProposal } from "./types";

export type DmContext = {
  campaignId?: string;
  sessionId?: string;
  summary: string;
  scene: string;
  partyRoster: string;
  encounterSummary?: string;
  intent?: string;
};

export type PartyContext = {
  campaignId?: string;
  sessionId?: string;
  summary: string;
  encounterSummary: string;
  partyRoster: string;
  tacticalNotes?: string;
};

export type ApprovedAction = {
  characterId: string;
  action: Action;
  errors: string[];
};

function buildDmMessages(context: DmContext): ChatMessage[] {
  return [
    { role: "system", content: dmSystemPrompt },
    {
      role: "user",
      content: `${dmJsonSchema}\n\nContext:\n${JSON.stringify(context, null, 2)}`
    }
  ];
}

function buildPartyMessages(context: PartyContext): ChatMessage[] {
  return [
    { role: "system", content: partySystemPrompt },
    {
      role: "user",
      content: `${partyJsonSchema}\n\nContext:\n${JSON.stringify(context, null, 2)}`
    }
  ];
}

export async function streamDmNarration(context: DmContext): Promise<AsyncGenerator<string>> {
  const settings = await getAppSettings();
  return streamChatCompletion(settings.llm, buildDmMessages(context));
}

export async function getDmNarration(context: DmContext): Promise<DmPayload | null> {
  const settings = await getAppSettings();
  const response = settings.llm.stream
    ? await collectStream(streamChatCompletion(settings.llm, buildDmMessages(context)))
    : await requestChatCompletion(settings.llm, buildDmMessages(context));

  await insertAiLog({
    campaignId: context.campaignId,
    sessionId: context.sessionId,
    kind: "dm",
    content: response.content
  });

  const parsed = await parseJsonWithRepair<unknown>(settings.llm, response.content, 1);
  return normalizeDmPayload(parsed);
}

export async function getPartyProposals(context: PartyContext): Promise<PartyActionPayload | null> {
  const settings = await getAppSettings();
  const response = settings.llm.stream
    ? await collectStream(streamChatCompletion(settings.llm, buildPartyMessages(context)))
    : await requestChatCompletion(settings.llm, buildPartyMessages(context));

  await insertAiLog({
    campaignId: context.campaignId,
    sessionId: context.sessionId,
    kind: "party",
    content: response.content
  });

  const parsed = await parseJsonWithRepair<unknown>(settings.llm, response.content, 1);
  return normalizePartyPayload(parsed);
}

export function validatePartyProposals(
  state: RulesState,
  proposals: PartyActionPayload
): ApprovedAction[] {
  return proposals.proposals.map((proposal) => {
    const validation = validateAction(proposal.action, state);
    return {
      characterId: proposal.characterId,
      action: proposal.action,
      errors: validation.errors
    };
  });
}

export async function lookupSrdReferences(terms: {
  spells?: string[];
  items?: string[];
  monsters?: string[];
  conditions?: string[];
  rules?: string[];
}): Promise<Record<string, string[]>> {
  const results: Record<string, string[]> = {};

  if (terms.spells?.length) {
    const records = await Promise.all(
      terms.spells.map((text) => querySrd({ type: "spells", text, limit: 3 }))
    );
    results.spells = records.flat().map((record) => record.name);
  }

  if (terms.items?.length) {
    const records = await Promise.all(
      terms.items.map((text) => querySrd({ type: "items", text, limit: 3 }))
    );
    results.items = records.flat().map((record) => record.name);
  }

  if (terms.monsters?.length) {
    const records = await Promise.all(
      terms.monsters.map((text) => querySrd({ type: "monsters", text, limit: 3 }))
    );
    results.monsters = records.flat().map((record) => record.name);
  }

  if (terms.conditions?.length) {
    const records = await Promise.all(
      terms.conditions.map((text) => querySrd({ type: "conditions", text, limit: 3 }))
    );
    results.conditions = records.flat().map((record) => record.name);
  }

  if (terms.rules?.length) {
    const records = await Promise.all(
      terms.rules.map((text) => querySrd({ type: "rules", text, limit: 3 }))
    );
    results.rules = records.flat().map((record) => record.name);
  }

  return results;
}

export async function summarizeSession(params: {
  campaignId?: string;
  sessionId?: string;
  limit?: number;
}): Promise<string | null> {
  const settings = await getAppSettings();
  const logs = await listAiLogs({
    campaignId: params.campaignId,
    sessionId: params.sessionId,
    limit: params.limit ?? 40
  });

  if (!logs.length) {
    return null;
  }

  const content = logs
    .reverse()
    .map((entry) => `${entry.kind.toUpperCase()}: ${entry.content}`)
    .join("\n");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: "Summarize the following D&D 5e session log in 5-8 bullet points. Keep it factual."
    },
    { role: "user", content }
  ];

  const response = await requestChatCompletion(
    { ...settings.llm, temperature: 0.2, maxTokens: Math.min(settings.llm.maxTokens, 500) },
    messages
  );

  await insertAiLog({
    campaignId: params.campaignId,
    sessionId: params.sessionId,
    kind: "summary",
    content: response.content
  });

  return response.content;
}

function normalizeDmPayload(payload: unknown): DmPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as {
    narrative?: string;
    scene_updates?: string[];
    sceneUpdates?: string[];
    questions?: string[];
  };

  if (!data.narrative) {
    return null;
  }

  return {
    narrative: data.narrative,
    sceneUpdates: data.scene_updates ?? data.sceneUpdates ?? [],
    questions: data.questions ?? []
  };
}

function normalizePartyPayload(payload: unknown): PartyActionPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as { proposals?: Array<Record<string, unknown>> };
  if (!Array.isArray(data.proposals)) {
    return null;
  }

  const proposals: PartyActionProposal[] = data.proposals
    .map((proposal) => {
      const record = proposal as {
        character_id?: string;
        characterId?: string;
        summary?: string;
        action?: Action;
        rules_refs?: string[];
        rulesRefs?: string[];
        risks?: string[];
        alternatives?: string[];
      };

      if (!record.action || !record.summary) {
        return null;
      }

      return {
        characterId: record.characterId ?? record.character_id ?? "",
        summary: record.summary,
        action: record.action,
        rulesRefs: record.rulesRefs ?? record.rules_refs ?? [],
        risks: record.risks ?? [],
        alternatives: record.alternatives ?? []
      };
    })
    .filter((proposal): proposal is PartyActionProposal => proposal !== null);

  return { proposals };
}

async function collectStream(
  generator: AsyncGenerator<string, { content: string }, void>
): Promise<{ content: string }> {
  let content = "";
  for await (const chunk of generator) {
    content += chunk;
  }
  return { content };
}
