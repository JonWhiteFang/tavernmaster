import { useEffect, useMemo, useState } from "react";
import { getAppSettings } from "../data/settings";
import { getSyncStatus, subscribeSyncStatus } from "../sync/client";
import { useAppContext } from "../state/AppContext";

type TopbarProps = {
  onNewJournal: () => void;
  onExport: () => void;
  onSearch: () => void;
};

export default function Topbar({ onNewJournal, onExport, onSearch }: TopbarProps) {
  const {
    campaigns,
    sessions,
    activeCampaignId,
    activeSessionId,
    setActiveCampaignId,
    setActiveSessionId
  } = useAppContext();
  const [llmLabel, setLlmLabel] = useState("Loading LLM...");
  const [{ status: syncStatus, message: syncMessage }, setSyncStatus] = useState(getSyncStatus());

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((status, message) => {
      setSyncStatus({ status, message });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const settings = await getAppSettings();
      const host = normalizeHost(settings.llm.baseUrl);
      setLlmLabel(`${settings.llm.model} @ ${host}`);
    })();
  }, []);

  const syncLabel = useMemo(() => {
    if (syncStatus === "idle") {
      return "Ready";
    }
    return syncStatus;
  }, [syncStatus]);

  const syncDetail = syncStatus !== "idle" && syncMessage ? ` (${syncMessage})` : "";

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">TM</div>
        <div>
          <div className="brand-title">Tavern Master</div>
          <div className="brand-subtitle">Solo 5e orchestration suite</div>
        </div>
      </div>
      <div className="topbar-center">
        <label className="form-field topbar-field">
          <span className="form-label">Campaign</span>
          <select
            className="form-input topbar-select"
            value={activeCampaignId ?? ""}
            onChange={(event) => setActiveCampaignId(event.target.value || null)}
            disabled={!campaigns.length}
          >
            <option value="">{campaigns.length ? "Select campaign" : "No campaigns"}</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field topbar-field">
          <span className="form-label">Session</span>
          <select
            className="form-input topbar-select"
            value={activeSessionId ?? ""}
            onChange={(event) => setActiveSessionId(event.target.value || null)}
            disabled={!sessions.length}
          >
            <option value="">{sessions.length ? "Select session" : "No sessions"}</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="topbar-right">
        <div className="status-row">
          <div className="status-pill">LLM: {llmLabel}</div>
          <div className="status-pill">
            Sync: {syncLabel}
            {syncDetail}
          </div>
        </div>
        <div className="topbar-actions">
          <button className="secondary-button" onClick={onNewJournal}>
            New Journal
          </button>
          <button className="secondary-button" onClick={onExport}>
            Export
          </button>
          <button className="ghost-button" onClick={onSearch}>
            Search
          </button>
        </div>
      </div>
    </header>
  );
}

function normalizeHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl.replace(/^https?:\/\//, "");
  }
}
