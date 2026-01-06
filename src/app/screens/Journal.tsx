import { useEffect, useState } from "react";
import type { JournalEntry } from "../data/types";
import { listJournalEntries } from "../data/journal";
import { downloadTextFile, openPrintWindow, toFilename } from "../ui/exports";

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    void listJournalEntries("seed-campaign").then((data) => {
      setEntries(data);
      if (!selectedId && data.length) {
        setSelectedId(data[0].id);
      }
    });
  }, []);

  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm.trim()) {
      return true;
    }
    const query = searchTerm.toLowerCase();
    return entry.title.toLowerCase().includes(query) || entry.content.toLowerCase().includes(query);
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
    const content = `# ${activeEntry.title}\n\nCreated: ${formatDateTime(
      activeEntry.createdAt
    )}\n\n${activeEntry.content}\n`;
    const filename = toFilename(activeEntry.title, "journal-entry", "md");
    downloadTextFile(filename, content, "text/markdown");
  };

  const handleExportPdf = () => {
    if (!activeEntry) {
      return;
    }
    const content = `${activeEntry.title}\n\nCreated: ${formatDateTime(
      activeEntry.createdAt
    )}\n\n${activeEntry.content}\n`;
    openPrintWindow(`Journal: ${activeEntry.title}`, content);
  };

  return (
    <div className="journal">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">Journal</div>
        <div className="panel-subtitle">
          Curate the narrative log, capture key beats, and export session notes.
        </div>
        <div className="search-row" style={{ marginTop: "1rem" }}>
          <label className="form-field search-field">
            <span className="form-label">Search</span>
            <input
              className="form-input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search title or notes"
            />
          </label>
          <span className="status-chip">Matches {filteredEntries.length}</span>
        </div>
      </section>

      <div className="journal-grid">
        <section className="panel journal-list">
          <div className="panel-title">Entries</div>
          <div className="panel-body">
            {filteredEntries.length === 0 ? (
              <div className="panel-copy">No journal entries available.</div>
            ) : (
              filteredEntries.map((entry) => (
                <button
                  key={entry.id}
                  className={`journal-card ${entry.id === selectedId ? "is-active" : ""}`}
                  onClick={() => setSelectedId(entry.id)}
                >
                  <div className="journal-card-title">{entry.title}</div>
                  <div className="journal-card-meta">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="panel journal-detail">
          <div className="panel-title">Narrative</div>
          <div className="panel-body">
            {activeEntry ? (
              <>
                <div className="journal-detail-title">{activeEntry.title}</div>
                <div className="journal-detail-meta">{formatDateTime(activeEntry.createdAt)}</div>
                <div className="journal-content">{activeEntry.content}</div>
              </>
            ) : (
              <div className="panel-copy">Select a journal entry to view its details.</div>
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
