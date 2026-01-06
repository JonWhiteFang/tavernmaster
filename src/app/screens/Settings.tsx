import { useEffect, useMemo, useState } from "react";
import { requestChatCompletion } from "../ai/client";
import type { ChatMessage } from "../ai/types";
import { getAppSettings, upsertAppSettings } from "../data/settings";
import type { AppSettings } from "../data/settings";
import {
  getSyncStatus,
  isSupabaseConfigured,
  signInWithPassword,
  signOut,
  subscribeSyncStatus,
  syncNow
} from "../sync/client";
import { countOpenConflicts, listOpenConflicts, type SyncConflictRow } from "../sync/conflicts";
import { keepLocalForConflict, keepRemoteForConflict } from "../sync/resolve";

const testMessages: ChatMessage[] = [
  { role: "system", content: "Reply with 'OK' if you can read this." },
  { role: "user", content: "ping" }
];

type StatusState = "idle" | "saving" | "saved" | "error";

type TestState = "idle" | "testing" | "success" | "error";

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [status, setStatus] = useState<StatusState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestState>("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [{ status: syncStatus, message: syncMessage }, setSyncState] = useState(getSyncStatus());
  const [syncEmail, setSyncEmail] = useState("");
  const [syncPassword, setSyncPassword] = useState("");
  const [syncActionStatus, setSyncActionStatus] = useState<"idle" | "working" | "error">("idle");
  const [syncActionMessage, setSyncActionMessage] = useState<string | null>(null);
  const [conflictCount, setConflictCount] = useState(0);
  const [conflicts, setConflicts] = useState<SyncConflictRow[]>([]);
  const [selectedConflictKey, setSelectedConflictKey] = useState<string | null>(null);
  const [conflictStatus, setConflictStatus] = useState<"idle" | "working" | "error">("idle");
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void getAppSettings().then((loaded) => {
      if (!isMounted) {
        return;
      }
      setSettings(loaded);
      setDraft(loaded);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return subscribeSyncStatus((nextStatus, nextMessage) => {
      setSyncState({ status: nextStatus, message: nextMessage });
    });
  }, []);

  const refreshConflicts = async () => {
    const [count, rows] = await Promise.all([countOpenConflicts(), listOpenConflicts(50)]);
    setConflictCount(count);
    setConflicts(rows);
    if (
      selectedConflictKey &&
      !rows.some((row) => `${row.entity_type}:${row.entity_id}` === selectedConflictKey)
    ) {
      setSelectedConflictKey(null);
    }
  };

  useEffect(() => {
    void refreshConflicts();
    const id = window.setInterval(() => {
      void refreshConflicts();
    }, 5000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const hasChanges = useMemo(() => {
    if (!settings || !draft) {
      return false;
    }
    return JSON.stringify(settings) !== JSON.stringify(draft);
  }, [settings, draft]);

  if (!draft) {
    return (
      <section className="panel">
        <div className="panel-title">Settings</div>
        <div className="panel-body">Loading settings...</div>
      </section>
    );
  }

  const updateLlm = (patch: Partial<AppSettings["llm"]>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            llm: {
              ...current.llm,
              ...patch
            }
          }
        : current
    );
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }
    setStatus("saving");
    setStatusMessage(null);
    try {
      await upsertAppSettings(draft);
      setSettings(draft);
      setStatus("saved");
      setStatusMessage("Settings saved.");
    } catch (error) {
      setStatus("error");
      setStatusMessage("Failed to save settings.");
      console.error(error);
    }
  };

  const handleCancel = () => {
    if (settings) {
      setDraft(settings);
      setStatus("idle");
      setStatusMessage(null);
    }
  };

  const handleTest = async () => {
    setTestStatus("testing");
    setTestMessage(null);
    try {
      await requestChatCompletion(
        {
          ...draft.llm,
          temperature: 0,
          maxTokens: Math.min(draft.llm.maxTokens, 40),
          stream: false
        },
        testMessages
      );
      setTestStatus("success");
      setTestMessage("Connection OK.");
    } catch (error) {
      setTestStatus("error");
      setTestMessage("Connection failed. Check base URL and model.");
      console.error(error);
    }
  };

  const handleSyncSignIn = async () => {
    setSyncActionStatus("working");
    setSyncActionMessage(null);
    try {
      await signInWithPassword(syncEmail.trim(), syncPassword);
      setSyncPassword("");
      setSyncActionStatus("idle");
      setSyncActionMessage("Signed in.");
    } catch (error) {
      setSyncActionStatus("error");
      setSyncActionMessage(error instanceof Error ? error.message : "Sign-in failed.");
    }
  };

  const handleSyncSignOut = async () => {
    setSyncActionStatus("working");
    setSyncActionMessage(null);
    try {
      await signOut();
      setSyncActionStatus("idle");
      setSyncActionMessage("Signed out.");
    } catch (error) {
      setSyncActionStatus("error");
      setSyncActionMessage(error instanceof Error ? error.message : "Sign-out failed.");
    }
  };

  const handleSyncNow = async () => {
    setSyncActionStatus("working");
    setSyncActionMessage(null);
    try {
      await syncNow();
      setSyncActionStatus("idle");
      setSyncActionMessage("Sync complete.");
    } catch (error) {
      setSyncActionStatus("error");
      setSyncActionMessage(error instanceof Error ? error.message : "Sync failed.");
    }
  };

  const selected = selectedConflictKey
    ? (conflicts.find((row) => `${row.entity_type}:${row.entity_id}` === selectedConflictKey) ??
      null)
    : null;

  const handleKeepRemote = async () => {
    if (!selected) {
      return;
    }
    setConflictStatus("working");
    setConflictMessage(null);
    try {
      await keepRemoteForConflict(selected.entity_type, selected.entity_id);
      setConflictStatus("idle");
      setConflictMessage("Applied remote version locally.");
      await refreshConflicts();
    } catch (error) {
      setConflictStatus("error");
      setConflictMessage(
        error instanceof Error ? error.message : "Failed to apply remote version."
      );
    }
  };

  const handleKeepLocal = async () => {
    if (!selected) {
      return;
    }
    setConflictStatus("working");
    setConflictMessage(null);
    try {
      await keepLocalForConflict(selected.entity_type, selected.entity_id);
      setConflictStatus("idle");
      setConflictMessage("Kept local version (will push on next sync).");
      await refreshConflicts();
    } catch (error) {
      setConflictStatus("error");
      setConflictMessage(error instanceof Error ? error.message : "Failed to keep local version.");
    }
  };

  return (
    <div className="settings">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">Settings</div>
        <div className="panel-subtitle">
          Manage local LLM configuration, sync preferences, and SRD sources.
        </div>
        <div className="status-row" style={{ marginTop: "1rem" }}>
          <span className={`status-chip status-${status}`}>{statusMessage ?? "Ready"}</span>
          <span className={`status-chip status-${testStatus}`}>{testMessage ?? ""}</span>
        </div>
      </section>

      <div className="settings-grid">
        <section className="panel settings-card">
          <div className="panel-title">LLM Runtime</div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="form-field">
                <span className="form-label">Base URL</span>
                <input
                  className="form-input"
                  value={draft.llm.baseUrl}
                  onChange={(event) => updateLlm({ baseUrl: event.target.value })}
                  placeholder="http://localhost:11434"
                />
              </label>
              <label className="form-field">
                <span className="form-label">Model</span>
                <input
                  className="form-input"
                  value={draft.llm.model}
                  onChange={(event) => updateLlm({ model: event.target.value })}
                  placeholder="llama3.1:8b"
                />
              </label>
              <label className="form-field">
                <span className="form-label">Temperature</span>
                <input
                  className="form-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={draft.llm.temperature}
                  onChange={(event) => updateLlm({ temperature: Number(event.target.value) })}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Max Tokens</span>
                <input
                  className="form-input"
                  type="number"
                  min="64"
                  max="4096"
                  value={draft.llm.maxTokens}
                  onChange={(event) => updateLlm({ maxTokens: Number(event.target.value) })}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Top P</span>
                <input
                  className="form-input"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={draft.llm.topP}
                  onChange={(event) => updateLlm({ topP: Number(event.target.value) })}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Streaming</span>
                <div className="toggle-row">
                  <input
                    type="checkbox"
                    checked={draft.llm.stream}
                    onChange={(event) => updateLlm({ stream: event.target.checked })}
                  />
                  <span className="form-hint">Enable streaming for live narration.</span>
                </div>
              </label>
            </div>
            <div className="button-row">
              <button className="secondary-button" onClick={handleTest}>
                {testStatus === "testing" ? "Testing..." : "Test Connection"}
              </button>
              <div className="button-row right">
                <button className="ghost-button" onClick={handleCancel} disabled={!hasChanges}>
                  Cancel
                </button>
                <button className="primary-button" onClick={handleSave} disabled={!hasChanges}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="panel settings-card">
          <div className="panel-title">Sync & SRD</div>
          <div className="panel-body">
            <p className="panel-copy">
              Supabase sync is configured for a single-user workflow. Configure Supabase env vars
              and sign in to enable background push/pull.
            </p>
            <div className="form-grid">
              <label className="form-field">
                <span className="form-label">Sync Status</span>
                <input className="form-input" value={syncMessage ?? syncStatus} disabled />
              </label>
              <label className="form-field">
                <span className="form-label">Supabase Config</span>
                <input
                  className="form-input"
                  value={
                    isSupabaseConfigured()
                      ? "Configured"
                      : "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY"
                  }
                  disabled
                />
              </label>
              <label className="form-field">
                <span className="form-label">Email</span>
                <input
                  className="form-input"
                  value={syncEmail}
                  onChange={(event) => setSyncEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="username"
                />
              </label>
              <label className="form-field">
                <span className="form-label">Password</span>
                <input
                  className="form-input"
                  type="password"
                  value={syncPassword}
                  onChange={(event) => setSyncPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </label>
              <label className="form-field">
                <span className="form-label">Sync Actions</span>
                <input
                  className="form-input"
                  value={
                    syncActionMessage ?? (syncActionStatus === "working" ? "Working..." : "Ready")
                  }
                  disabled
                />
              </label>
              <label className="form-field">
                <span className="form-label">Conflicts</span>
                <input
                  className="form-input"
                  value={
                    conflictMessage ??
                    (conflictStatus === "working"
                      ? "Resolving..."
                      : conflictCount
                        ? `${conflictCount} pending`
                        : "None")
                  }
                  disabled
                />
              </label>
              <label className="form-field">
                <span className="form-label">SRD Source</span>
                <input className="form-input" value="Bundled 5e SRD" disabled />
              </label>
            </div>
            <div className="button-row" style={{ marginTop: "1rem" }}>
              <button
                className="secondary-button"
                onClick={handleSyncSignIn}
                disabled={!isSupabaseConfigured() || !syncEmail.trim() || !syncPassword}
              >
                Sign In
              </button>
              <button
                className="secondary-button"
                onClick={handleSyncSignOut}
                disabled={!isSupabaseConfigured()}
              >
                Sign Out
              </button>
              <div className="button-row right">
                <button
                  className="primary-button"
                  onClick={handleSyncNow}
                  disabled={!isSupabaseConfigured()}
                >
                  Sync Now
                </button>
              </div>
            </div>

            {conflicts.length ? (
              <div style={{ marginTop: "1rem" }}>
                <div className="panel-subtitle" style={{ marginBottom: "0.6rem" }}>
                  Resolve conflicts (remote is newer than local queued changes).
                </div>
                <div className="form-grid">
                  <label className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <span className="form-label">Select Conflict</span>
                    <select
                      className="form-input"
                      value={selectedConflictKey ?? ""}
                      onChange={(event) => setSelectedConflictKey(event.target.value || null)}
                    >
                      <option value="">Choose…</option>
                      {conflicts.map((row) => {
                        const key = `${row.entity_type}:${row.entity_id}`;
                        const local = row.local_updated_at ?? "unknown";
                        const remote = row.remote_updated_at ?? "unknown";
                        return (
                          <option key={key} value={key}>
                            {row.entity_type} • {row.entity_id} (local {local} / remote {remote})
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>

                {selected ? (
                  <>
                    <div className="button-row" style={{ marginTop: "0.8rem" }}>
                      <button className="secondary-button" onClick={handleKeepRemote}>
                        Keep Remote
                      </button>
                      <button className="secondary-button" onClick={handleKeepLocal}>
                        Keep Local
                      </button>
                    </div>
                    <details style={{ marginTop: "0.8rem" }}>
                      <summary className="panel-copy">View payloads</summary>
                      <div className="panel-copy" style={{ marginTop: "0.6rem" }}>
                        Local
                      </div>
                      <pre className="panel-copy" style={{ maxHeight: 200, overflow: "auto" }}>
                        {selected.local_payload_json}
                      </pre>
                      <div className="panel-copy" style={{ marginTop: "0.6rem" }}>
                        Remote
                      </div>
                      <pre className="panel-copy" style={{ maxHeight: 200, overflow: "auto" }}>
                        {selected.remote_payload_json}
                      </pre>
                    </details>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
