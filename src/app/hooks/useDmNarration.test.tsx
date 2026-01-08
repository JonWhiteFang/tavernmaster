import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useDmNarration } from "./useDmNarration";
import type { DmContext } from "../ai/orchestrator";

vi.mock("../ai/orchestrator", () => ({
  streamDmNarration: vi.fn()
}));
vi.mock("../ai/parser", () => ({
  parseJsonWithRepair: vi.fn()
}));
vi.mock("../data/ai_logs", () => ({
  insertAiLog: vi.fn()
}));
vi.mock("../data/settings", () => ({
  getAppSettings: vi.fn()
}));

import { streamDmNarration } from "../ai/orchestrator";
import { parseJsonWithRepair } from "../ai/parser";
import { insertAiLog } from "../data/ai_logs";
import { getAppSettings } from "../data/settings";

const dmContext: DmContext = {
  campaignId: "camp-1",
  sessionId: "sess-1",
  summary: "summary",
  scene: "scene",
  partyRoster: "Aria"
};

function makeStream(chunks: string[]) {
  return (async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  })();
}

describe("useDmNarration", () => {
  const mockStreamDmNarration = vi.mocked(streamDmNarration);
  const mockParseJsonWithRepair = vi.mocked(parseJsonWithRepair);
  const mockInsertAiLog = vi.mocked(insertAiLog);
  const mockGetAppSettings = vi.mocked(getAppSettings);

  beforeEach(() => {
    mockStreamDmNarration.mockReset();
    mockParseJsonWithRepair.mockReset();
    mockInsertAiLog.mockReset();
    mockGetAppSettings.mockResolvedValue({
      llm: {
        baseUrl: "http://localhost",
        model: "llama3",
        temperature: 0.7,
        maxTokens: 800,
        topP: 1,
        stream: true
      }
    });
  });

  it("streams narration and parses highlights", async () => {
    mockStreamDmNarration.mockResolvedValue(makeStream(["Hello", " world"]) as never);
    mockParseJsonWithRepair.mockResolvedValue({
      narrative: "Intro",
      sceneUpdates: ["Scene"],
      questions: ["Next?"]
    });

    const { result } = renderHook(() => useDmNarration(dmContext));

    await act(async () => {
      await result.current.streamNarration();
    });

    await waitFor(() => expect(result.current.streamState).toBe("idle"));
    expect(result.current.output).toBe("Hello world");
    expect(result.current.parsedHighlights).toBe("Intro\n\nScene\n\nNext?");
    expect(mockInsertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "dm", content: "Hello world" })
    );
  });

  it("handles stream errors", async () => {
    mockStreamDmNarration.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useDmNarration(dmContext));

    await act(async () => {
      await result.current.streamNarration();
    });

    expect(result.current.streamState).toBe("error");
    expect(result.current.output).toBe("Failed to stream narration.");
  });
});
