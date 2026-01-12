import React, { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../state/AppContext";
import { loadCampaignState } from "../engine/state/store";
import { listTurns } from "../engine/turns/turnStore";
import { getCanonSummary } from "../engine/memory/canonStore";
import { orchestrateTurn } from "../engine/ai/turnOrchestrator";
import { applyTurn } from "../engine/apply/applyTurn";
import type { CampaignStateDoc } from "../engine/state/types";
import type { Turn } from "../engine/turns/turnStore";
import type { Choice } from "../engine/ai/schemas";
import type { PlayStyle } from "../engine/ai/playStyles";
import { getLlmConfig } from "../data/settings";
import { copy } from "../content/copy";

interface PlayViewProps {
  onNeedsCampaign?: () => void;
}

export default function PlayView({ onNeedsCampaign }: PlayViewProps) {
  const { activeCampaignId } = useAppContext();
  const [state, setState] = useState<CampaignStateDoc | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [narrative, setNarrative] = useState("");
  const [customAction, setCustomAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    if (!activeCampaignId) {
      onNeedsCampaign?.();
      return;
    }
    void loadState();
  }, [activeCampaignId]);

  const loadState = async () => {
    if (!activeCampaignId) return;
    const [stateDoc, recentTurns] = await Promise.all([
      loadCampaignState(activeCampaignId),
      listTurns(activeCampaignId, 10)
    ]);
    setState(stateDoc);
    setTurns(recentTurns);
    if (recentTurns.length > 0) {
      setNarrative(recentTurns[0].aiOutput);
    }
  };

  const handleAction = useCallback(
    async (action: string) => {
      if (!activeCampaignId || !state || loading) return;

      setLoading(true);
      setError(null);

      try {
        const [config, summary] = await Promise.all([
          getLlmConfig(),
          getCanonSummary(activeCampaignId)
        ]);

        const result = await orchestrateTurn(
          {
            canonSummary: summary?.longSummary || "",
            recentSummary: summary?.recent || "",
            stateDoc: state,
            recentTurns: turns.slice(0, 5),
            playerInput: action,
            playStyle: "classic" as PlayStyle
          },
          config
        );

        if (!result.success) {
          setError(result.error);
          return;
        }

        const applyResult = await applyTurn({
          campaignId: activeCampaignId,
          playerInput: action,
          response: result.response,
          currentState: state
        });

        if (!applyResult.success) {
          setError(applyResult.errors.map((e) => e.message).join(", "));
          return;
        }

        setState(applyResult.newState);
        setNarrative(result.response.narrative);
        setChoices(result.response.choices);
        setCustomAction("");
        await loadState();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [activeCampaignId, state, turns, loading]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "7" && !e.metaKey && !e.ctrlKey) {
        const idx = parseInt(e.key) - 1;
        if (choices[idx]) {
          void handleAction(choices[idx].text);
        }
      }
    },
    [choices, handleAction]
  );

  if (!activeCampaignId) {
    return (
      <section className="panel">
        <div className="panel-title">{copy.nav.play}</div>
        <div className="panel-body">
          <p>{copy.empty.noCampaign}</p>
        </div>
      </section>
    );
  }

  return (
    <div className="play-view" onKeyDown={handleKeyDown} tabIndex={0}>
      <section className="panel scene-panel">
        <div className="panel-title">{state?.scene || "The Adventure Begins"}</div>
        <div className="panel-body">
          <p className="narrative" aria-live="polite">
            {narrative || "What would you like to do?"}
          </p>
        </div>
      </section>

      <section className="panel choices-panel">
        <div className="panel-title">Actions</div>
        <div className="panel-body">
          {choices.length > 0 ? (
            <div className="choices-grid">
              {choices.map((choice, idx) => (
                <button
                  key={choice.id}
                  className="choice-btn"
                  onClick={() => handleAction(choice.text)}
                  disabled={loading}
                  aria-label={`Choice ${idx + 1}: ${choice.text}`}
                >
                  <span className="choice-key">{idx + 1}</span>
                  {choice.text}
                </button>
              ))}
            </div>
          ) : (
            <p>Enter an action to begin.</p>
          )}

          <div className="custom-action">
            <input
              type="text"
              value={customAction}
              onChange={(e) => setCustomAction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customAction.trim()) {
                  void handleAction(customAction.trim());
                }
              }}
              placeholder="Or type your own action..."
              disabled={loading}
              aria-label="Custom action input"
            />
            <button
              onClick={() => handleAction(customAction.trim())}
              disabled={loading || !customAction.trim()}
            >
              {loading ? copy.status.thinking : copy.actions.continue}
            </button>
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
              <button onClick={() => setError(null)}>{copy.actions.dismiss}</button>
            </div>
          )}
        </div>
      </section>

      <section className="panel status-panel">
        <div className="panel-title">{copy.status.ready}</div>
        <div className="panel-body">
          <p>Mode: {copy.modes[state?.mode || "exploration"]}</p>
          <p>Turn: {state?.turnCount || 0}</p>
          <p>
            Quests:{" "}
            {state?.quests
              .filter((q) => q.status === "active")
              .map((q) => q.name)
              .join(", ") || copy.empty.noQuests.split(".")[0]}
          </p>
        </div>
      </section>

      <button
        className="timeline-toggle"
        onClick={() => setShowTimeline(!showTimeline)}
        aria-expanded={showTimeline}
      >
        {showTimeline ? "Hide" : "Show"} Timeline
      </button>

      {showTimeline && (
        <section className="panel timeline-panel">
          <div className="panel-title">Recent Events</div>
          <div className="panel-body">
            {turns.slice(0, 5).map((turn) => (
              <div key={turn.id} className="timeline-entry">
                <strong>&gt; {turn.playerInput}</strong>
                <p>{turn.aiOutput.slice(0, 200)}...</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
