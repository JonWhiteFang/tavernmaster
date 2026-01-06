import { useEffect, useState } from "react";
import { listAiLogs } from "../data/ai_logs";
import type { AiLogEntry } from "../data/ai_logs";
import { downloadTextFile, openPrintWindow, toFilename } from "../ui/exports";

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
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    void listAiLogs({ limit: 40 }).then((data) => {
      setEntries(data);
      if (data.length && !selectedId) {
        setSelectedId(data[0].id);
      }
    });
  }, []);

  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm.trim()) {
      return true;
    }
    const query = searchTerm.toLowerCase();
    const label = kindLabels[entry.kind].toLowerCase();
    return label.includes(query) || entry.content.toLowerCase().includes(query);
  });

  useEffect(() => {
    if (!filteredEntries.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredEntries.some((entry) => entry.id === selectedId)) {
      setSelectedId(filteredEntries[0].id);
    }
  }, [filteredEntries, selectedId]);

  const activeEntry =
    filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0];

  const handleExportMarkdown = () => {
    if (!activeEntry) {
      return;
    }
    const content = `# ${kindLabels[activeEntry.kind]} Log\n\nCaptured: ${formatDateTime(
      activeEntry.createdAt
    )}\n\n${activeEntry.content}\n`;
    const filename = toFilename(`${kindLabels[activeEntry.kind]}-log`, "transcript", "md");
    downloadTextFile(filename, content, "text/markdown");
  };

  const handleExportPdf = () => {
    if (!activeEntry) {
      return;
    }
    const content = `${kindLabels[activeEntry.kind]} Log\n\nCaptured: ${formatDateTime(
      activeEntry.createdAt
    )}\n\n${activeEntry.content}\n`;
    openPrintWindow(`${kindLabels[activeEntry.kind]} Log`, content);
  };

  return (
    <div className="logs">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">Logs & Exports</div>
        <div className="panel-subtitle">
          Review AI transcripts, capture rulings, and export session archives.
        </div>
        <div className="search-row" style={{ marginTop: "1rem" }}>
          <label className="form-field search-field">
            <span className="form-label">Search</span>
            <input
              className="form-input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search transcripts"
            />
          </label>
          <span className="status-chip">Matches {filteredEntries.length}</span>
        </div>
      </section>

      <div className="logs-grid">
        <section className="panel logs-list">
          <div className="panel-title">Transcript Feed</div>
          <div className="panel-body">
            {filteredEntries.length === 0 ? (
              <div className="panel-copy">No AI logs captured yet.</div>
            ) : (
              filteredEntries.map((entry) => (
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
                <div className="log-detail-meta">{formatDateTime(activeEntry.createdAt)}</div>
                <div className="log-content">{activeEntry.content}</div>
              </>
            ) : (
              <div className="panel-copy">Select a log entry to review its contents.</div>
            )}
            <div className="button-row" style={{ marginTop: "1.2rem" }}>
              <button className="secondary-button" onClick={handleExportMarkdown}>
                Export Markdown
              </button>
              <button className="secondary-button" onClick={handleExportPdf}>
                Export PDF
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}
