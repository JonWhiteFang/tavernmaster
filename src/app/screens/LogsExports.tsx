import { useEffect, useMemo, useState } from "react";
import { listAiLogs } from "../data/ai_logs";
import type { AiLogEntry } from "../data/ai_logs";
import { downloadTextFile, openPrintWindow, toFilename } from "../ui/exports";
import { useAppContext } from "../state/AppContext";
import Button from "../ui/Button";
import Chip from "../ui/Chip";
import { useToast } from "../ui/Toast";

const kindLabels: Record<AiLogEntry["kind"], string> = {
  dm: "DM",
  party: "Party",
  summary: "Summary",
  system: "System",
  user: "User"
};

const kindOptions: AiLogEntry["kind"][] = ["dm", "party", "summary", "system", "user"];

export default function LogsExports() {
  const { activeCampaignId, activeSessionId } = useAppContext();
  const { pushToast } = useToast();
  const [entries, setEntries] = useState<AiLogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeKinds, setActiveKinds] = useState<AiLogEntry["kind"][]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!activeCampaignId) {
      setEntries([]);
      setSelectedId(null);
      return;
    }
    void listAiLogs({
      campaignId: activeCampaignId,
      sessionId: activeSessionId ?? undefined,
      limit: 40
    }).then((data) => {
      setEntries(data);
      setSelectedId((current) => {
        if (!data.length) {
          return null;
        }
        if (!current || !data.some((entry) => entry.id === current)) {
          return data[0].id;
        }
        return current;
      });
    });
  }, [activeCampaignId, activeSessionId]);

  const kindCounts = useMemo(
    () =>
      entries.reduce(
        (acc, entry) => {
          acc[entry.kind] += 1;
          return acc;
        },
        { dm: 0, party: 0, summary: 0, system: 0, user: 0 }
      ),
    [entries]
  );

  const filteredEntries = entries.filter((entry) => {
    if (activeKinds.length && !activeKinds.includes(entry.kind)) {
      return false;
    }
    if (!searchTerm.trim()) {
      return true;
    }
    const query = searchTerm.toLowerCase();
    const label = kindLabels[entry.kind].toLowerCase();
    return label.includes(query) || entry.content.toLowerCase().includes(query);
  });

  const handleToggleKind = (kind: AiLogEntry["kind"]) => {
    setActiveKinds((current) =>
      current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind]
    );
  };

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
      pushToast({ tone: "error", message: "Select a log entry to export." });
      return;
    }
    const content = `# ${kindLabels[activeEntry.kind]} Log\n\nCaptured: ${formatDateTime(
      activeEntry.createdAt
    )}\n\n${activeEntry.content}\n`;
    const filename = toFilename(`${kindLabels[activeEntry.kind]}-log`, "transcript", "md");
    downloadTextFile(filename, content, "text/markdown");
    pushToast({ tone: "success", message: "Markdown exported." });
  };

  const handleExportPdf = () => {
    if (!activeEntry) {
      pushToast({ tone: "error", message: "Select a log entry to export." });
      return;
    }
    const content = `${kindLabels[activeEntry.kind]} Log\n\nCaptured: ${formatDateTime(
      activeEntry.createdAt
    )}\n\n${activeEntry.content}\n`;
    openPrintWindow(`${kindLabels[activeEntry.kind]} Log`, content);
    pushToast({ tone: "success", message: "Print preview opened." });
  };

  const handleExportSessionTranscript = async () => {
    if (!activeCampaignId) {
      pushToast({ tone: "error", message: "Select a campaign before exporting." });
      return;
    }
    setIsExporting(true);
    try {
      const logs = await listAiLogs({
        campaignId: activeCampaignId,
        sessionId: activeSessionId ?? undefined,
        limit: 200
      });
      const filteredLogs = activeKinds.length
        ? logs.filter((entry) => activeKinds.includes(entry.kind))
        : logs;
      if (!filteredLogs.length) {
        pushToast({ tone: "error", message: "No logs available for export." });
        return;
      }
      const transcriptTitle = activeSessionId ? "Session Transcript" : "Campaign Transcript";
      const body = filteredLogs
        .slice()
        .reverse()
        .map(
          (entry) =>
            `## ${kindLabels[entry.kind]} — ${formatDateTime(entry.createdAt)}\n\n${entry.content}`
        )
        .join("\n\n");
      const content = `# ${transcriptTitle}\n\nGenerated: ${formatDateTime(
        new Date().toISOString()
      )}\n\n${body}\n`;
      const filename = toFilename(transcriptTitle, "transcript", "md");
      downloadTextFile(filename, content, "text/markdown");
      pushToast({ tone: "success", message: "Transcript exported." });
      window.dispatchEvent(new globalThis.CustomEvent("tm.tutorial.logs-exported"));
    } catch (error) {
      console.error("Failed to export transcript", error);
      pushToast({ tone: "error", message: "Unable to export transcript." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleNavigate = (screen: string) => {
    window.dispatchEvent(new globalThis.CustomEvent("tm.navigate", { detail: { screen } }));
  };

  if (!activeCampaignId) {
    return (
      <div className="logs">
        <section className="panel">
          <div className="panel-title">Logs & Exports</div>
          <div className="panel-subtitle">
            Create or select a campaign in Campaigns & Sessions to review and export transcripts.
          </div>
          <div className="button-row" style={{ marginTop: "1.2rem" }}>
            <Button onClick={() => handleNavigate("dashboard")}>Open Campaigns & Sessions</Button>
          </div>
        </section>
      </div>
    );
  }

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
              data-tutorial-id="logs-search"
            />
          </label>
          <Chip>Matches {filteredEntries.length}</Chip>
        </div>
        <div className="filter-row" data-tutorial-id="logs-filter-kinds">
          <div className="filter-label">Kinds</div>
          <div className="filter-chips">
            <button
              className={`filter-chip ${activeKinds.length === 0 ? "is-active" : ""}`}
              onClick={() => setActiveKinds([])}
              type="button"
            >
              All ({entries.length})
            </button>
            {kindOptions.map((kind) => (
              <button
                key={kind}
                className={`filter-chip ${activeKinds.includes(kind) ? "is-active" : ""}`}
                onClick={() => handleToggleKind(kind)}
                type="button"
              >
                {kindLabels[kind]} ({kindCounts[kind]})
              </button>
            ))}
          </div>
        </div>
        <div className="button-row right">
          <Button
            variant="secondary"
            onClick={handleExportSessionTranscript}
            disabled={!activeCampaignId || isExporting}
            data-tutorial-id="logs-export-transcript"
          >
            {isExporting
              ? "Exporting..."
              : activeSessionId
                ? "Export Session Transcript"
                : "Export Campaign Transcript"}
          </Button>
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
              <Button
                variant="secondary"
                onClick={handleExportMarkdown}
                data-tutorial-id="logs-export-markdown"
              >
                Export Markdown
              </Button>
              <Button
                variant="secondary"
                onClick={handleExportPdf}
                data-tutorial-id="logs-export-pdf"
              >
                Export PDF
              </Button>
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
