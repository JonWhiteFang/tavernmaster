import { describe, expect, it, vi, beforeEach } from "vitest";
import type { LlmConfig } from "./types";
import type { DmContext, PartyContext } from "./orchestrator";
import {
  getDmNarration,
  getPartyProposals,
  lookupSrdReferences,
  streamDmNarration,
  summarizeSession,
  validatePartyProposals
} from "./orchestrator";

vi.mock("../data/settings", () => ({
  getAppSettings: vi.fn()
}));
vi.mock("../data/ai_logs", () => ({
  insertAiLog: vi.fn(),
  listAiLogs: vi.fn()
}));
vi.mock("../data/srd_queries", () => ({
  querySrd: vi.fn()
}));
vi.mock("./client", () => ({
  requestChatCompletion: vi.fn(),
  streamChatCompletion: vi.fn()
}));
vi.mock("./parser", () => ({
  parseJsonWithRepair: vi.fn()
}));
vi.mock("../rules/actions", () => ({
  validateAction: vi.fn()
}));

import { getAppSettings } from "../data/settings";
import { insertAiLog, listAiLogs } from "../data/ai_logs";
import { querySrd } from "../data/srd_queries";
import { requestChatCompletion, streamChatCompletion } from "./client";
import { parseJsonWithRepair } from "./parser";
import { validateAction } from "../rules/actions";

const baseLlm: LlmConfig = {
  baseUrl: "http://localhost:11434",
  model: "llama3",
  temperature: 0.7,
  maxTokens: 800,
  topP: 1,
  stream: false
};

const dmContext: DmContext = {
  campaignId: "camp-1",
  sessionId: "sess-1",
  summary: "summary",
  scene: "scene",
  partyRoster: "Aria"
};

const partyContext: PartyContext = {
  campaignId: "camp-1",
  sessionId: "sess-1",
  summary: "summary",
  encounterSummary: "encounter",
  partyRoster: "Aria"
};

function makeStream(chunks: string[]) {
  return (async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  })();
}

describe("ai orchestrator", () => {
  const mockGetAppSettings = vi.mocked(getAppSettings);
  const mockInsertAiLog = vi.mocked(insertAiLog);
  const mockListAiLogs = vi.mocked(listAiLogs);
  const mockQuerySrd = vi.mocked(querySrd);
  const mockRequestChatCompletion = vi.mocked(requestChatCompletion);
  const mockStreamChatCompletion = vi.mocked(streamChatCompletion);
  const mockParseJsonWithRepair = vi.mocked(parseJsonWithRepair);
  const mockValidateAction = vi.mocked(validateAction);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAppSettings.mockResolvedValue({ llm: { ...baseLlm } });
  });

  it("streams DM narration", async () => {
    const stream = makeStream(["Hello"]);
    mockStreamChatCompletion.mockReturnValue(stream as AsyncGenerator<string, { content: string }>);

    const generator = await streamDmNarration(dmContext);
    const output: string[] = [];
    for await (const chunk of generator) {
      output.push(chunk);
    }

    expect(output.join("")).toBe("Hello");
    expect(mockStreamChatCompletion).toHaveBeenCalledWith(
      baseLlm,
      expect.arrayContaining([
        expect.objectContaining({ role: "system" }),
        expect.objectContaining({ role: "user" })
      ])
    );
  });

  it("gets DM narration from request flow", async () => {
    mockRequestChatCompletion.mockResolvedValue({ content: "{}" });
    mockParseJsonWithRepair.mockResolvedValue({
      narrative: "Intro",
      sceneUpdates: ["Scene"],
      questions: ["What next?"]
    });

    const result = await getDmNarration(dmContext);

    expect(result).toEqual({
      narrative: "Intro",
      sceneUpdates: ["Scene"],
      questions: ["What next?"]
    });
    expect(mockInsertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "dm",
        content: "{}"
      })
    );
  });

  it("returns null when DM payload is invalid", async () => {
    mockRequestChatCompletion.mockResolvedValue({ content: "{}" });
    mockParseJsonWithRepair.mockResolvedValue({ sceneUpdates: ["Scene"] });

    const result = await getDmNarration(dmContext);

    expect(result).toBeNull();
  });

  it("normalizes and validates party proposals", async () => {
    mockGetAppSettings.mockResolvedValue({ llm: { ...baseLlm, stream: true } });
    mockStreamChatCompletion.mockReturnValue(makeStream(["payload"]) as AsyncGenerator<string>);
    mockParseJsonWithRepair.mockResolvedValue({
      proposals: [
        {
          character_id: "char-1",
          summary: "Strike",
          action: { type: "attack" },
          rules_refs: ["SRD"],
          risks: ["Risk"],
          alternatives: ["Alt"]
        }
      ]
    });

    const result = await getPartyProposals(partyContext);

    expect(result?.proposals[0]).toMatchObject({
      characterId: "char-1",
      summary: "Strike",
      action: { type: "attack" },
      rulesRefs: ["SRD"],
      risks: ["Risk"],
      alternatives: ["Alt"]
    });
  });

  it("validates party proposals against rules", () => {
    mockValidateAction.mockReturnValue({ errors: ["bad"] } as { errors: string[] });
    const approved = validatePartyProposals(
      {
        round: 1,
        turnOrder: [],
        activeTurnIndex: 0,
        participants: {},
        log: []
      },
      {
        proposals: [
          {
            characterId: "char-1",
            summary: "Strike",
            action: { type: "attack" } as { type: "attack" },
            rulesRefs: [],
            risks: [],
            alternatives: []
          }
        ]
      }
    );

    expect(approved).toEqual([
      {
        characterId: "char-1",
        action: { type: "attack" },
        errors: ["bad"]
      }
    ]);
  });

  it("looks up SRD references by type", async () => {
    mockQuerySrd.mockResolvedValue([{ name: "Magic Missile" }] as { name: string }[]);

    const result = await lookupSrdReferences({ spells: ["magic"] });

    expect(result).toEqual({ spells: ["Magic Missile"] });
    expect(mockQuerySrd).toHaveBeenCalledWith({ type: "spells", text: "magic", limit: 3 });
  });

  it("summarizes sessions when logs exist", async () => {
    mockListAiLogs.mockResolvedValue([
      {
        id: "1",
        kind: "dm",
        content: "Hello",
        createdAt: "t",
        updatedAt: "t"
      }
    ]);
    mockRequestChatCompletion.mockResolvedValue({ content: "Summary" });

    const summary = await summarizeSession({ campaignId: "camp-1", limit: 1 });

    expect(summary).toBe("Summary");
    expect(mockInsertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "summary", content: "Summary" })
    );
  });

  it("returns null when there are no logs to summarize", async () => {
    mockListAiLogs.mockResolvedValue([]);

    const summary = await summarizeSession({ campaignId: "camp-1", limit: 1 });

    expect(summary).toBeNull();
    expect(mockRequestChatCompletion).not.toHaveBeenCalled();
  });
});
