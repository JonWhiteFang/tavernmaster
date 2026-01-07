import { useEffect, useState } from "react";
import type { JournalEntry } from "../data/types";
import { createJournalEntry, listJournalEntries, updateJournalEntry } from "../data/journal";
import { listAiLogs } from "../data/ai_logs";
import { downloadTextFile, openPrintWindow, toFilename } from "../ui/exports";
import { useAppContext } from "../state/AppContext";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";

export default function Journal() {
  const { activeCampaignId, activeSessionId } = useAppContext();
  const { pushToast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editorMode, setEditorMode] = useState<"new" | "edit" | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!activeCampaignId) {
      setEntries([]);
      setSelectedId(null);
      setEditorMode(null);
      setDraftTitle("");
      setDraftContent("");
      setIsSaving(false);
      setIsImporting(false);
      return;
    }
    void listJournalEntries(activeCampaignId).then((data) => {
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
  }, [activeCampaignId]);

  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm.trim()) {
      return true;
    }
    const query = searchTerm.toLowerCase();
    return entry.title.toLowerCase().includes(query) || entry.content.toLowerCase().includes(query);
  });

  useEffect(() => {
    if (editorMode) {
      return;
    }
    if (!filteredEntries.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredEntries.some((entry) => entry.id === selectedId)) {
      setSelectedId(filteredEntries[0].id);
    }
  }, [editorMode, filteredEntries, selectedId]);

  const activeEntry =
    filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0];

  const startNewEntry = () => {
    setEditorMode("new");
    setDraftTitle("");
    setDraftContent("");
  };

  const startEditEntry = () => {
    if (!activeEntry) {
      return;
    }
    setEditorMode("edit");
    setDraftTitle(activeEntry.title);
    setDraftContent(activeEntry.content);
  };

  const handleCancelEdit = () => {
    setEditorMode(null);
    setDraftTitle("");
    setDraftContent("");
  };

  const handleSaveEntry = async () => {
    if (!activeCampaignId) {
      pushToast({ tone: "error", message: "Select a campaign before saving." });
      return;
    }
    if (!draftTitle.trim() || !draftContent.trim()) {
      pushToast({ tone: "error", message: "Add a title and content before saving." });
      return;
    }

    setIsSaving(true);
    const title = draftTitle.trim();
    const content = draftContent.trim();

    try {
      if (editorMode === "new") {
        const entry = await createJournalEntry({ campaignId: activeCampaignId, title, content });
        setEntries((current) => [entry, ...current]);
        setSelectedId(entry.id);
        setSearchTerm("");
        setEditorMode(null);
        pushToast({ tone: "success", message: "Entry created." });
        return;
      }

      if (editorMode === "edit" && activeEntry) {
        const entry = await updateJournalEntry({
          id: activeEntry.id,
          campaignId: activeCampaignId,
          title,
          content,
          createdAt: activeEntry.createdAt
        });
        setEntries((current) => current.map((item) => (item.id === entry.id ? entry : item)));
        setSelectedId(entry.id);
        setEditorMode(null);
        pushToast({ tone: "success", message: "Entry updated." });
      }
    } catch (error) {
      console.error("Failed to save journal entry", error);
      pushToast({ tone: "error", message: "Unable to save journal entry." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportNarration = async () => {
    if (!activeCampaignId) {
      pushToast({ tone: "error", message: "Select a campaign before importing narration." });
      return;
    }
    setIsImporting(true);
    try {
      const entries = await listAiLogs({
        campaignId: activeCampaignId,
        sessionId: activeSessionId ?? undefined,
        limit: 8
      });
      const dmEntry = entries.find((entry) => entry.kind === "dm");
      if (!dmEntry) {
        pushToast({ tone: "error", message: "No DM narration found to import." });
        return;
      }
      const entry = await createJournalEntry({
        campaignId: activeCampaignId,
        title: `Narration ${new Date(dmEntry.createdAt).toLocaleDateString()}`,
        content: dmEntry.content
      });
      setEntries((current) => [entry, ...current]);
      setSelectedId(entry.id);
      setSearchTerm("");
      setEditorMode(null);
      pushToast({ tone: "success", message: "Narration imported." });
    } catch (error) {
      console.error("Failed to import narration", error);
      pushToast({ tone: "error", message: "Unable to import narration." });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!activeEntry) {
      pushToast({ tone: "error", message: "Select a journal entry to export." });
      return;
    }
    const content = `# ${activeEntry.title}\n\nCreated: ${formatDateTime(
      activeEntry.createdAt
    )}\n\n${activeEntry.content}\n`;
    const filename = toFilename(activeEntry.title, "journal-entry", "md");
    downloadTextFile(filename, content, "text/markdown");
    pushToast({ tone: "success", message: "Markdown exported." });
  };

  const handleExportPdf = () => {
    if (!activeEntry) {
      pushToast({ tone: "error", message: "Select a journal entry to export." });
      return;
    }
    const content = `${activeEntry.title}\n\nCreated: ${formatDateTime(
      activeEntry.createdAt
    )}\n\n${activeEntry.content}\n`;
    openPrintWindow(`Journal: ${activeEntry.title}`, content);
    pushToast({ tone: "success", message: "Print preview opened." });
  };

  const handleNavigate = (screen: string) => {
    window.dispatchEvent(new globalThis.CustomEvent("tm.navigate", { detail: { screen } }));
  };

  if (!activeCampaignId) {
    return (
      <div className="journal">
        <section className="panel">
          <div className="panel-title">Journal</div>
          <div className="panel-subtitle">
            Select or create a campaign to view and capture narrative entries.
          </div>
          <div className="button-row" style={{ marginTop: "1.2rem" }}>
            <Button onClick={() => handleNavigate("dashboard")}>Open Campaigns & Sessions</Button>
          </div>
        </section>
      </div>
    );
  }

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
              disabled={editorMode !== null}
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
                  disabled={editorMode !== null}
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
            <div className="button-row">
              {editorMode ? (
                <>
                  <Button onClick={handleSaveEntry} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Entry"}
                  </Button>
                  <Button variant="ghost" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={startNewEntry} disabled={isImporting}>
                    New Entry
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={startEditEntry}
                    disabled={!activeEntry || isImporting}
                  >
                    Edit Entry
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleImportNarration}
                    disabled={isImporting || !activeCampaignId || editorMode !== null}
                  >
                    {isImporting ? "Importing..." : "Import Latest Narration"}
                  </Button>
                </>
              )}
            </div>
            {editorMode ? (
              <>
                <div className="panel-subtitle">
                  {editorMode === "new" ? "New journal entry" : "Edit journal entry"}
                </div>
                <div className="form-grid">
                  <label className="form-field">
                    <span className="form-label">Title</span>
                    <input
                      className="form-input"
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      placeholder="Session recap"
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Notes</span>
                    <textarea
                      className="form-textarea"
                      rows={10}
                      value={draftContent}
                      onChange={(event) => setDraftContent(event.target.value)}
                      placeholder="Capture narration beats, rulings, and hooks."
                    />
                  </label>
                </div>
              </>
            ) : activeEntry ? (
              <>
                <div className="journal-detail-title">{activeEntry.title}</div>
                <div className="journal-detail-meta">{formatDateTime(activeEntry.createdAt)}</div>
                <div className="journal-content">{activeEntry.content}</div>
                <div className="button-row" style={{ marginTop: "1.2rem" }}>
                  <Button variant="secondary" onClick={handleExportMarkdown}>
                    Export Markdown
                  </Button>
                  <Button variant="secondary" onClick={handleExportPdf}>
                    Export PDF
                  </Button>
                </div>
              </>
            ) : (
              <div className="panel-copy">Select a journal entry to view its details.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}
