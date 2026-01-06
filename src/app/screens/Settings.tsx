import { useEffect, useMemo, useState } from "react";
import { requestChatCompletion } from "../ai/client";
import type { ChatMessage } from "../ai/types";
import { getAppSettings, upsertAppSettings } from "../data/settings";
import type { AppSettings } from "../data/settings";

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
              Supabase sync is configured for a single-user workflow. UI controls will be added
              alongside the account keychain integration.
            </p>
            <div className="form-grid">
              <label className="form-field">
                <span className="form-label">Sync Status</span>
                <input className="form-input" value="Offline-first" disabled />
              </label>
              <label className="form-field">
                <span className="form-label">SRD Source</span>
                <input className="form-input" value="Bundled 5e SRD" disabled />
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
