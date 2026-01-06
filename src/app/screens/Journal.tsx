import { useEffect, useState } from "react";
import type { JournalEntry } from "../data/types";
import { listJournalEntries } from "../data/journal";

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void listJournalEntries("seed-campaign").then((data) => {
      setEntries(data);
      if (!selectedId && data.length) {
        setSelectedId(data[0].id);
      }
    });
  }, [selectedId]);

  const activeEntry = entries.find((entry) => entry.id === selectedId) ?? entries[0];

  return (
    <div className="journal">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">Journal</div>
        <div className="panel-subtitle">
          Curate the narrative log, capture key beats, and export session notes.
        </div>
      </section>

      <div className="journal-grid">
        <section className="panel journal-list">
          <div className="panel-title">Entries</div>
          <div className="panel-body">
            {entries.length === 0 ? (
              <div className="panel-copy">No journal entries available.</div>
            ) : (
              entries.map((entry) => (
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
                <div className="journal-detail-meta">
                  {new Date(activeEntry.createdAt).toLocaleString()}
                </div>
                <div className="journal-content">{activeEntry.content}</div>
              </>
            ) : (
              <div className="panel-copy">Select a journal entry to view its details.</div>
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
