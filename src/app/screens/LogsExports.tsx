import { useEffect, useState } from "react";
import { listAiLogs } from "../data/ai_logs";
import type { AiLogEntry } from "../data/ai_logs";

const kindLabels: Record<AiLogEntry["kind"], string> = {
  dm: "DM",
  party: "Party",
  summary: "Summary",
  system: "System",
  user: "User"
};

export default function LogsExports() {
  const [entries, setEntries] = useState<AiLogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void listAiLogs({ limit: 40 }).then((data) => {
      setEntries(data);
      if (data.length && !selectedId) {
        setSelectedId(data[0].id);
      }
    });
  }, [selectedId]);

  const activeEntry = entries.find((entry) => entry.id === selectedId) ?? entries[0];

  return (
    <div className="logs">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">Logs & Exports</div>
        <div className="panel-subtitle">
          Review AI transcripts, capture rulings, and export session archives.
        </div>
      </section>

      <div className="logs-grid">
        <section className="panel logs-list">
          <div className="panel-title">Transcript Feed</div>
          <div className="panel-body">
            {entries.length === 0 ? (
              <div className="panel-copy">No AI logs captured yet.</div>
            ) : (
              entries.map((entry) => (
                <button
                  key={entry.id}
                  className={`log-card ${entry.id === selectedId ? "is-active" : ""}`}
                  onClick={() => setSelectedId(entry.id)}
                >
                  <div className="log-card-title">{kindLabels[entry.kind]}</div>
                  <div className="log-card-meta">
                    {new Date(entry.createdAt).toLocaleTimeString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="panel logs-detail">
          <div className="panel-title">Transcript Detail</div>
          <div className="panel-body">
            {activeEntry ? (
              <>
                <div className="log-detail-title">{kindLabels[activeEntry.kind]} Log</div>
                <div className="log-detail-meta">
                  {new Date(activeEntry.createdAt).toLocaleString()}
                </div>
                <div className="log-content">{activeEntry.content}</div>
              </>
            ) : (
              <div className="panel-copy">Select a log entry to review its contents.</div>
            )}
            <div className="button-row" style={{ marginTop: "1.2rem" }}>
              <button className="secondary-button">Export Markdown</button>
              <button className="secondary-button">Export PDF</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
