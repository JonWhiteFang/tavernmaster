import { useEffect, useMemo, useState } from "react";
import { listAiLogs } from "../data/ai_logs";
import { listCharacters } from "../data/characters";
import { listJournalEntries } from "../data/journal";
import { loadEncounterRecovery } from "../data/encounter_recovery";
import type { AiLogEntry } from "../data/ai_logs";
import type { JournalEntry } from "../data/types";
import type { RulesState } from "../rules/types";
import { parseDiceExpression, rollDice } from "../rules/dice";
import { systemRng } from "../rules/rng";
import { downloadTextFile, openPrintWindow, toFilename } from "../ui/exports";
import { useAppContext } from "../state/AppContext";

type DiceHistoryEntry = {
  id: string;
  label: string;
  rolls: number[];
  total: number;
  timestamp: string;
};

type EncounterSummary = {
  round: number;
  activeName: string | null;
  conditionsCount: number;
  combatantCount: number;
};

type MapTokenCounts = {
  party: number;
  enemy: number;
  neutral: number;
  total: number;
};

type ContextRailProps = {
  activeScreen: string;
};

const kindLabels: Record<AiLogEntry["kind"], string> = {
  dm: "DM",
  party: "Party",
  summary: "Summary",
  system: "System",
  user: "User"
};

export default function ContextRail({ activeScreen }: ContextRailProps) {
  const { activeCampaign, activeSession, activeCampaignId, activeSessionId } = useAppContext();
  const [partyNames, setPartyNames] = useState<string[]>([]);
  const [recentLogs, setRecentLogs] = useState<AiLogEntry[]>([]);
  const [latestLogEntry, setLatestLogEntry] = useState<AiLogEntry | null>(null);
  const [latestJournalEntry, setLatestJournalEntry] = useState<JournalEntry | null>(null);
  const [encounterSummary, setEncounterSummary] = useState<EncounterSummary | null>(null);
  const [mapTokenCounts, setMapTokenCounts] = useState<MapTokenCounts | null>(null);
  const [diceExpression, setDiceExpression] = useState("1d20");
  const [diceHistory, setDiceHistory] = useState<DiceHistoryEntry[]>([]);
  const [diceError, setDiceError] = useState<string | null>(null);

  useEffect(() => {
    void listCharacters().then((characters) => {
      setPartyNames(characters.map((character) => character.name));
    });
  }, []);

  useEffect(() => {
    if (!activeCampaignId) {
      setRecentLogs([]);
      setLatestLogEntry(null);
      return;
    }
    void listAiLogs({
      campaignId: activeCampaignId,
      sessionId: activeSessionId ?? undefined,
      limit: 8
    }).then((entries) => {
      const narration = entries.filter((entry) => entry.kind === "dm");
      setRecentLogs((narration.length ? narration : entries).slice(0, 3));
    });
  }, [activeCampaignId, activeSessionId]);

  useEffect(() => {
    if (!activeCampaignId) {
      setLatestJournalEntry(null);
      return;
    }
    void listJournalEntries(activeCampaignId).then((entries) => {
      setLatestJournalEntry(entries[0] ?? null);
    });
  }, [activeCampaignId]);

  useEffect(() => {
    if (!activeCampaignId) {
      setLatestLogEntry(null);
      return;
    }
    void listAiLogs({
      campaignId: activeCampaignId,
      sessionId: activeSessionId ?? undefined,
      limit: 1
    }).then((entries) => {
      setLatestLogEntry(entries[0] ?? null);
    });
  }, [activeCampaignId, activeSessionId]);

  useEffect(() => {
    const readMapCounts = () => {
      if (typeof window === "undefined") {
        return;
      }
      try {
        const raw = window.localStorage.getItem("tm.map.tokenCounts");
        if (!raw) {
          setMapTokenCounts(null);
          return;
        }
        const parsed = JSON.parse(raw) as MapTokenCounts;
        setMapTokenCounts(parsed);
      } catch {
        setMapTokenCounts(null);
      }
    };
    readMapCounts();

    const handleUpdate = (event: globalThis.Event) => {
      const detail = (event as globalThis.CustomEvent<MapTokenCounts | null>).detail;
      setMapTokenCounts(detail ?? null);
    };
    window.addEventListener("tm.map.tokens", handleUpdate as globalThis.EventListener);
    return () =>
      window.removeEventListener("tm.map.tokens", handleUpdate as globalThis.EventListener);
  }, []);

  useEffect(() => {
    if (activeScreen !== "encounter") {
      return;
    }
    void loadEncounterRecovery().then((snapshot) => {
      if (!snapshot) {
        setEncounterSummary(null);
        return;
      }
      setEncounterSummary(summarizeEncounter(snapshot.rulesState));
    });
  }, [activeScreen]);

  useEffect(() => {
    const handleUpdate = (event: globalThis.Event) => {
      const detail = (event as globalThis.CustomEvent<EncounterSummary | null>).detail;
      setEncounterSummary(detail ?? null);
    };
    window.addEventListener("tm.encounter.summary", handleUpdate as globalThis.EventListener);
    return () =>
      window.removeEventListener("tm.encounter.summary", handleUpdate as globalThis.EventListener);
  }, []);

  const recentPartyNames = useMemo(() => partyNames.slice(0, 3), [partyNames]);

  const handleRoll = (expressionOverride?: string) => {
    const expression = expressionOverride ?? diceExpression;
    try {
      const parsed = parseDiceExpression(expression);
      const result = rollDice(parsed, systemRng);
      const nextEntry: DiceHistoryEntry = {
        id: crypto.randomUUID(),
        label: expression,
        rolls: result.rolls,
        total: result.total,
        timestamp: new Date().toISOString()
      };
      setDiceHistory((current) => [nextEntry, ...current].slice(0, 6));
      setDiceError(null);
      if (expressionOverride) {
        setDiceExpression(expressionOverride);
      }
    } catch (error) {
      setDiceError(error instanceof Error ? error.message : "Invalid dice expression.");
    }
  };

  const showEncounterWidget = activeScreen === "encounter";
  const showMapWidget = activeScreen === "map";
  const showJournalWidget = activeScreen === "journal";
  const showLogsWidget = activeScreen === "logs";

  const handleExportLatestJournal = () => {
    if (!latestJournalEntry) {
      return;
    }
    const content = `# ${latestJournalEntry.title}\n\nCreated: ${formatDateTime(
      latestJournalEntry.createdAt
    )}\n\n${latestJournalEntry.content}\n`;
    const filename = toFilename(latestJournalEntry.title, "journal-entry", "md");
    downloadTextFile(filename, content, "text/markdown");
  };

  const handleExportLatestLog = () => {
    if (!latestLogEntry) {
      return;
    }
    const label = kindLabels[latestLogEntry.kind];
    const content = `${label} Log\n\nCaptured: ${formatDateTime(
      latestLogEntry.createdAt
    )}\n\n${latestLogEntry.content}\n`;
    openPrintWindow(`${label} Log`, content);
  };

  return (
    <aside className="context-rail">
      <section className="panel context-card">
        <div className="panel-title">Active Context</div>
        <div className="panel-body">
          <div className="context-line">
            <span className="context-label">Campaign</span>
            <span>{activeCampaign?.name ?? "No campaign selected"}</span>
          </div>
          <div className="context-line">
            <span className="context-label">Session</span>
            <span>{activeSession?.title ?? "No session selected"}</span>
          </div>
        </div>
      </section>

      <section className="panel context-card">
        <div className="panel-title">Dice Roller</div>
        <div className="panel-body">
          <label className="form-field">
            <span className="form-label">Expression</span>
            <input
              className="form-input"
              value={diceExpression}
              onChange={(event) => setDiceExpression(event.target.value)}
              placeholder="1d20+5"
            />
          </label>
          {diceError ? <div className="status-chip status-error">{diceError}</div> : null}
          <div className="dice-quick-row">
            {["1d20", "1d12", "1d10", "1d8", "1d6", "1d4"].map((expression) => (
              <button
                key={expression}
                className="ghost-button"
                onClick={() => handleRoll(expression)}
              >
                {expression}
              </button>
            ))}
            <button className="primary-button" onClick={() => handleRoll()}>
              Roll
            </button>
          </div>
          <div className="dice-history">
            {diceHistory.length === 0 ? (
              <div className="panel-copy">No rolls yet.</div>
            ) : (
              diceHistory.map((entry) => (
                <div key={entry.id} className="dice-history-row">
                  <div className="dice-history-main">
                    <span className="dice-history-label">{entry.label}</span>
                    <span className="dice-history-total">{entry.total}</span>
                  </div>
                  <div className="dice-history-rolls">{entry.rolls.join(", ")}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="panel context-card">
        <div className="panel-title">Party Quick View</div>
        <div className="panel-body">
          <div className="panel-copy">
            {partyNames.length ? `${partyNames.length} party members` : "No party members yet."}
          </div>
          <div className="party-quick-list">
            {recentPartyNames.map((name) => (
              <div key={name} className="party-quick-name">
                {name}
              </div>
            ))}
            {partyNames.length > recentPartyNames.length ? (
              <div className="party-quick-more">
                +{partyNames.length - recentPartyNames.length} more
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel context-card" data-tutorial-id="context-rail-recent-logs">
        <div className="panel-title">Recent Narration</div>
        <div className="panel-body">
          {recentLogs.length === 0 ? (
            <div className="panel-copy">No narration captured yet.</div>
          ) : (
            recentLogs.map((entry) => (
              <div key={entry.id} className="context-log">
                <div className="context-log-meta">
                  {entry.kind.toUpperCase()} - {formatTimestamp(entry.createdAt)}
                </div>
                <div className="context-log-body">{truncate(entry.content, 120)}</div>
              </div>
            ))
          )}
        </div>
      </section>

      {showEncounterWidget ? (
        <section className="panel context-card">
          <div className="panel-title">Encounter Status</div>
          <div className="panel-body">
            {encounterSummary ? (
              <>
                <div className="context-line">
                  <span className="context-label">Round</span>
                  <span>{encounterSummary.round}</span>
                </div>
                <div className="context-line">
                  <span className="context-label">Active Turn</span>
                  <span>{encounterSummary.activeName ?? "No active combatant"}</span>
                </div>
                <div className="context-line">
                  <span className="context-label">Combatants</span>
                  <span>{encounterSummary.combatantCount}</span>
                </div>
                <div className="context-line">
                  <span className="context-label">Conditions</span>
                  <span>{encounterSummary.conditionsCount}</span>
                </div>
              </>
            ) : (
              <div className="panel-copy">No encounter snapshot yet.</div>
            )}
          </div>
        </section>
      ) : null}

      {showMapWidget ? (
        <section className="panel context-card">
          <div className="panel-title">Map Snapshot</div>
          <div className="panel-body">
            {mapTokenCounts ? (
              <>
                <div className="context-line">
                  <span className="context-label">Tokens</span>
                  <span>{mapTokenCounts.total}</span>
                </div>
                <div className="context-line">
                  <span className="context-label">Party</span>
                  <span>{mapTokenCounts.party}</span>
                </div>
                <div className="context-line">
                  <span className="context-label">Enemy</span>
                  <span>{mapTokenCounts.enemy}</span>
                </div>
                <div className="context-line">
                  <span className="context-label">Neutral</span>
                  <span>{mapTokenCounts.neutral}</span>
                </div>
              </>
            ) : (
              <div className="panel-copy">No map token data yet.</div>
            )}
          </div>
        </section>
      ) : null}

      {showJournalWidget ? (
        <section className="panel context-card">
          <div className="panel-title">Journal Snapshot</div>
          <div className="panel-body">
            <div className="panel-copy">
              {latestJournalEntry ? latestJournalEntry.title : "No journal entries yet."}
            </div>
            <div className="context-actions">
              <button
                className="secondary-button"
                onClick={handleExportLatestJournal}
                disabled={!latestJournalEntry}
              >
                Export Latest Entry
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {showLogsWidget ? (
        <section className="panel context-card">
          <div className="panel-title">Log Snapshot</div>
          <div className="panel-body">
            <div className="panel-copy">
              {latestLogEntry
                ? `${kindLabels[latestLogEntry.kind]} - ${truncate(latestLogEntry.content, 60)}`
                : "No logs recorded yet."}
            </div>
            <div className="context-actions">
              <button
                className="secondary-button"
                onClick={handleExportLatestLog}
                disabled={!latestLogEntry}
              >
                Export Latest Log
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </aside>
  );
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trim()}...`;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString();
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function summarizeEncounter(rulesState: RulesState): EncounterSummary {
  const combatantCount = rulesState.turnOrder.length;
  const activeId = rulesState.turnOrder[rulesState.activeTurnIndex];
  const activeName = activeId ? (rulesState.participants[activeId]?.name ?? null) : null;
  const conditionsCount = Object.values(rulesState.participants).reduce(
    (total, participant) => total + participant.conditions.length,
    0
  );

  return {
    round: rulesState.round,
    activeName,
    conditionsCount,
    combatantCount
  };
}
