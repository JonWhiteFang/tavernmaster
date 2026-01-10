import { useEffect, useMemo, useState } from "react";
import { listAiLogs } from "../data/ai_logs";
import type { AiLogEntry } from "../data/ai_logs";
import { listCombatLogByCampaign } from "../data/combat_log";
import type { CombatLogEntry } from "../data/combat_log";
import { usePersistentState } from "../hooks/usePersistentState";
import { useAppContext } from "../state/AppContext";

type TimelineEntry = {
  id: string;
  kind: "ai" | "combat";
  label: string;
  content: string;
  createdAt: string;
};

type TimelineDrawerProps = {
  onOpenLogs: () => void;
};

export default function TimelineDrawer({ onOpenLogs }: TimelineDrawerProps) {
  const { activeCampaignId, activeSessionId } = useAppContext();
  const [isOpen, setIsOpen] = usePersistentState("tm.timeline.open", true);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    if (!activeCampaignId) {
      setEntries([]);
      return;
    }
    void (async () => {
      const [aiLogs, combatLogs] = await Promise.all([
        listAiLogs({
          campaignId: activeCampaignId,
          sessionId: activeSessionId ?? undefined,
          limit: 10
        }),
        listCombatLogByCampaign(activeCampaignId, 10)
      ]);

      const merged: TimelineEntry[] = [
        ...aiLogs.map((e: AiLogEntry) => ({
          id: e.id,
          kind: "ai" as const,
          label: e.kind.toUpperCase(),
          content: e.content,
          createdAt: e.createdAt
        })),
        ...combatLogs.map((e: CombatLogEntry) => ({
          id: e.id,
          kind: "combat" as const,
          label: e.entryType.toUpperCase(),
          content: formatCombatEntry(e),
          createdAt: e.createdAt
        }))
      ];

      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setEntries(merged.slice(0, 10));
    })();
  }, [activeCampaignId, activeSessionId]);

  const toggleLabel = isOpen ? "Collapse" : "Expand";
  const recentLabel = useMemo(
    () => (activeSessionId ? "Session Timeline" : "Campaign Timeline"),
    [activeSessionId]
  );

  return (
    <footer className={`timeline-drawer ${isOpen ? "is-open" : "is-closed"}`}>
      <div className="timeline-header">
        <button
          className="ghost-button timeline-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          data-tutorial-id="timeline-toggle"
        >
          {toggleLabel}
        </button>
        <div>
          <div className="timeline-title">{recentLabel}</div>
          <div className="timeline-subtitle">
            {entries.length ? `${entries.length} recent entries` : "No entries yet"}
          </div>
        </div>
        <button
          className="secondary-button"
          onClick={onOpenLogs}
          data-tutorial-id="timeline-open-logs"
        >
          Open Transcripts
        </button>
      </div>
      {isOpen ? (
        <div className="timeline-body">
          {entries.length === 0 ? (
            <div className="timeline-empty">No activity captured yet.</div>
          ) : (
            <div className="timeline-list">
              {entries.map((entry) => (
                <button key={entry.id} className="timeline-entry" onClick={onOpenLogs}>
                  <div className="timeline-entry-meta">
                    {entry.label} - {formatTimestamp(entry.createdAt)}
                  </div>
                  <div className="timeline-entry-body">{truncate(entry.content, 140)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </footer>
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

function formatCombatEntry(entry: CombatLogEntry): string {
  const log = entry.payload.log as string[] | undefined;
  if (log?.length) {
    return log.join(" ");
  }
  return `${entry.entryType} action`;
}
