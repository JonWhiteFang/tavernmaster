import { useEffect, useMemo, useState } from "react";
import type { Campaign, Session } from "../data/types";
import { listCampaigns } from "../data/campaigns";
import { listSessions } from "../data/sessions";

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    void listCampaigns().then((data) => {
      setCampaigns(data);
      if (data.length && !activeCampaignId) {
        setActiveCampaignId(data[0].id);
      }
    });
  }, [activeCampaignId]);

  useEffect(() => {
    if (!activeCampaignId) {
      return;
    }
    void listSessions(activeCampaignId).then((data) => {
      setSessions(data);
      if (data.length && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    });
  }, [activeCampaignId, activeSessionId]);

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === activeCampaignId) ?? campaigns[0],
    [campaigns, activeCampaignId]
  );

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0],
    [sessions, activeSessionId]
  );

  return (
    <div className="dashboard">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">Campaign Dashboard</div>
        <div className="panel-subtitle">
          Select a campaign and session to review summaries, notes, and progress.
        </div>
      </section>

      <div className="campaign-grid">
        <section className="panel campaign-list">
          <div className="panel-title">Campaigns</div>
          <div className="panel-body">
            {campaigns.length === 0 ? (
              <div className="panel-copy">No campaigns yet.</div>
            ) : (
              campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  className={`campaign-card ${campaign.id === activeCampaignId ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveCampaignId(campaign.id);
                    setActiveSessionId(null);
                  }}
                >
                  <div className="campaign-title">{campaign.name}</div>
                  <div className="campaign-meta">
                    Updated {new Date(campaign.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="panel campaign-detail">
          <div className="panel-title">Campaign Overview</div>
          <div className="panel-body">
            {activeCampaign ? (
              <>
                <div className="detail-header">
                  <div>
                    <div className="detail-name">{activeCampaign.name}</div>
                    <div className="detail-meta">
                      Last updated {new Date(activeCampaign.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="detail-badges">
                    <span className="status-chip">Sessions {sessions.length}</span>
                    <span className="status-chip">SRD 5e</span>
                  </div>
                </div>
                <div className="panel-copy">
                  {activeCampaign.summary ?? "No campaign summary yet."}
                </div>

                <div className="session-block">
                  <div className="panel-title">Sessions</div>
                  <div className="session-grid">
                    <div className="session-list">
                      {sessions.length === 0 ? (
                        <div className="panel-copy">No sessions recorded.</div>
                      ) : (
                        sessions.map((session) => (
                          <button
                            key={session.id}
                            className={`session-card ${
                              session.id === activeSessionId ? "is-active" : ""
                            }`}
                            onClick={() => setActiveSessionId(session.id)}
                          >
                            <div className="session-title">{session.title}</div>
                            <div className="session-meta">
                              {session.startedAt
                                ? new Date(session.startedAt).toLocaleDateString()
                                : "Unscheduled"}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="session-detail">
                      {activeSession ? (
                        <>
                          <div className="session-detail-title">{activeSession.title}</div>
                          <div className="session-detail-meta">
                            {activeSession.startedAt
                              ? new Date(activeSession.startedAt).toLocaleString()
                              : "No start time"}
                          </div>
                          <div className="panel-copy">
                            {activeSession.recap ?? "No recap logged yet."}
                          </div>
                        </>
                      ) : (
                        <div className="panel-copy">Select a session to view summary.</div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="panel-copy">Select a campaign to view details.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
