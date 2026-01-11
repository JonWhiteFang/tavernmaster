import { useCallback, useEffect, useState } from "react";
import { querySrdEntries, getSrdEntryById, type SrdRecord } from "../data/srd_queries";
import type { SrdVersion, SrdEntryType } from "../data/srdSync";

const SRD_TYPES: { type: SrdEntryType; label: string }[] = [
  { type: "spell", label: "Spells" },
  { type: "monster", label: "Monsters" },
  { type: "equipment", label: "Equipment" },
  { type: "class", label: "Classes" },
  { type: "species", label: "Species" },
  { type: "background", label: "Backgrounds" },
  { type: "condition", label: "Conditions" },
  { type: "rule", label: "Rules" }
];

export default function SrdBrowser() {
  const [version, setVersion] = useState<SrdVersion>("5.1");
  const [selectedType, setSelectedType] = useState<SrdEntryType>("spell");
  const [searchText, setSearchText] = useState("");
  const [entries, setEntries] = useState<SrdRecord[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<SrdRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const results = await querySrdEntries({
        type: selectedType,
        version,
        text: searchText || undefined,
        limit: 100
      });
      setEntries(results);
      setSelectedEntry(null);
    } catch (error) {
      console.error("Failed to load SRD entries", error);
    } finally {
      setLoading(false);
    }
  }, [selectedType, version, searchText]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const handleSelectEntry = async (entry: SrdRecord) => {
    try {
      const full = await getSrdEntryById(entry.id, version);
      setSelectedEntry(full);
    } catch (error) {
      console.error("Failed to load entry details", error);
    }
  };

  return (
    <div className="srd-browser">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">SRD Browser</div>
        <div className="panel-subtitle">Browse the D&D 5e Systems Reference Document content.</div>
        <div className="form-grid" style={{ marginTop: "1rem" }}>
          <label className="form-field">
            <span className="form-label">SRD Version</span>
            <select
              className="form-input"
              value={version}
              onChange={(e) => setVersion(e.target.value as SrdVersion)}
            >
              <option value="5.1">SRD 5.1 (2014)</option>
              <option value="5.2.1">SRD 5.2.1 (2024)</option>
            </select>
          </label>
          <label className="form-field">
            <span className="form-label">Search</span>
            <input
              className="form-input"
              type="text"
              placeholder="Search entries..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </label>
        </div>
      </section>

      <div className="srd-browser-layout">
        <aside className="srd-browser-types">
          {SRD_TYPES.map(({ type, label }) => (
            <button
              key={type}
              className={`nav-item ${selectedType === type ? "is-active" : ""}`}
              onClick={() => setSelectedType(type)}
            >
              {label}
            </button>
          ))}
        </aside>

        <div className="srd-browser-list">
          {loading ? (
            <div className="panel-copy">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="panel-copy">No entries found.</div>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.id}
                className={`srd-entry-item ${selectedEntry?.id === entry.id ? "is-selected" : ""}`}
                onClick={() => handleSelectEntry(entry)}
              >
                {entry.name}
              </button>
            ))
          )}
        </div>

        <div className="srd-browser-detail">
          {selectedEntry ? (
            <section className="panel">
              <div className="panel-title">{selectedEntry.name}</div>
              <div className="panel-body">
                <SrdEntryDetail entry={selectedEntry} />
              </div>
            </section>
          ) : (
            <div className="panel-copy">Select an entry to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SrdEntryDetail({ entry }: { entry: SrdRecord }) {
  const data = entry.data;

  return (
    <div className="srd-entry-detail">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="srd-detail-row">
          <span className="srd-detail-label">{formatKey(key)}</span>
          <span className="srd-detail-value">{formatValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
