import { useCallback, useState } from "react";
import type { DmContext } from "../ai/orchestrator";
import { streamDmNarration } from "../ai/orchestrator";
import { parseJsonWithRepair } from "../ai/parser";
import { insertAiLog } from "../data/ai_logs";
import { getAppSettings } from "../data/settings";

type StreamState = "idle" | "streaming" | "error";

type ParsedHighlights = {
  narrative?: string;
  sceneUpdates?: string[];
  questions?: string[];
};

export function useDmNarration(dmContext: DmContext) {
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [output, setOutput] = useState("");
  const [parsedHighlights, setParsedHighlights] = useState<string | null>(null);

  const streamNarration = useCallback(async () => {
    if (streamState === "streaming") {
      return;
    }
    setStreamState("streaming");
    setOutput("");
    setParsedHighlights(null);

    let content = "";
    try {
      const stream = await streamDmNarration(dmContext);
      for await (const chunk of stream) {
        content += chunk;
        setOutput(content);
      }
      setStreamState("idle");
      setOutput(content);
      await insertAiLog({
        campaignId: dmContext.campaignId,
        sessionId: dmContext.sessionId,
        kind: "dm",
        content
      });

      const settings = await getAppSettings();
      const parsed = await parseJsonWithRepair<ParsedHighlights>(settings.llm, content, 1);
      if (parsed?.narrative) {
        const extra = [
          parsed.narrative,
          ...(parsed.sceneUpdates ?? []),
          ...(parsed.questions ?? [])
        ]
          .filter(Boolean)
          .join("\n\n");
        setParsedHighlights(extra);
      }
    } catch (error) {
      setStreamState("error");
      setOutput("Failed to stream narration.");
      console.error(error);
    }
  }, [dmContext, streamState]);

  const clearOutput = useCallback(() => {
    setOutput("");
    setParsedHighlights(null);
    setStreamState("idle");
  }, []);

  return {
    streamState,
    output,
    parsedHighlights,
    streamNarration,
    clearOutput
  };
}
