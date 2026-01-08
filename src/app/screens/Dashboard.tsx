import { useEffect, useMemo, useState } from "react";
import { listAiLogs } from "../data/ai_logs";
import { createCampaign } from "../data/campaigns";
import { listCharacters } from "../data/characters";
import { createSession } from "../data/sessions";
import { useAppContext } from "../state/AppContext";
import Modal from "../ui/Modal";
import { useToast } from "../ui/Toast";

type DashboardProps = {
  onResumePlay?: () => void;
};

export default function Dashboard({ onResumePlay }: DashboardProps) {
  const {
    campaigns,
    sessions,
    activeCampaignId,
    activeSessionId,
    setActiveCampaignId,
    setActiveSessionId,
    refreshCampaigns,
    refreshSessions
  } = useAppContext();
  const { pushToast } = useToast();
  const [partyCount, setPartyCount] = useState(0);
  const [lastLogAt, setLastLogAt] = useState<string | null>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignSummary, setCampaignSummary] = useState("");
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    void listCharacters().then((data) => {
      setPartyCount(data.length);
    });
  }, []);

  useEffect(() => {
    if (!activeCampaignId) {
      setLastLogAt(null);
      return;
    }
    void listAiLogs({
      campaignId: activeCampaignId,
      sessionId: activeSessionId ?? undefined,
      limit: 1
    }).then((entries) => {
      setLastLogAt(entries[0]?.createdAt ?? null);
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

  const hasParty = partyCount > 0;

  const trimmedCampaignName = campaignName.trim();
  const trimmedCampaignSummary = campaignSummary.trim();
  const trimmedSessionTitle = sessionTitle.trim();
  const canCreateCampaign = trimmedCampaignName.length > 0 && !isCreatingCampaign;
  const canCreateSession =
    trimmedSessionTitle.length > 0 && !!activeCampaignId && !isCreatingSession;

  const openCampaignModal = () => {
    setCampaignName("");
    setCampaignSummary("");
    setCampaignError(null);
    setIsCampaignModalOpen(true);
  };

  const openSessionModal = () => {
    setSessionTitle("");
    setSessionError(null);
    setIsSessionModalOpen(true);
  };

  const handleCreateCampaign = async () => {
    if (!canCreateCampaign) {
      return;
    }
    setIsCreatingCampaign(true);
    setCampaignError(null);
    try {
      const campaign = await createCampaign({
        name: trimmedCampaignName,
        summary: trimmedCampaignSummary ? trimmedCampaignSummary : undefined
      });
      await refreshCampaigns();
      setActiveCampaignId(campaign.id);
      setIsCampaignModalOpen(false);
      pushToast({ tone: "success", message: "Campaign created." });
      window.dispatchEvent(new globalThis.CustomEvent("tm.tutorial.campaign-created"));
    } catch (error) {
      console.error("Failed to create campaign", error);
      setCampaignError("Unable to create campaign. Try again.");
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleCreateSession = async () => {
    if (!activeCampaignId || !canCreateSession) {
      return;
    }
    setIsCreatingSession(true);
    setSessionError(null);
    try {
      const session = await createSession({
        campaignId: activeCampaignId,
        title: trimmedSessionTitle,
        startedAt: new Date().toISOString()
      });
      await refreshSessions(activeCampaignId);
      setActiveSessionId(session.id);
      setIsSessionModalOpen(false);
      pushToast({ tone: "success", message: "Session created." });
      window.dispatchEvent(new globalThis.CustomEvent("tm.tutorial.session-created"));
    } catch (error) {
      console.error("Failed to create session", error);
      setSessionError("Unable to create session. Try again.");
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <div className="dashboard">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">Campaigns & Sessions</div>
        <div className="panel-subtitle">
          Select a campaign and session to review summaries, notes, and progress.
        </div>
        <div className="button-row right">
          <button
            className="primary-button"
            onClick={openCampaignModal}
            disabled={isCreatingCampaign}
            data-tutorial-id="dashboard-new-campaign"
          >
            New Campaign
          </button>
          <button
            className="secondary-button"
            onClick={openSessionModal}
            disabled={isCreatingSession || !activeCampaignId}
            data-tutorial-id="dashboard-new-session"
          >
            New Session
          </button>
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
                  <div className="panel-title">Recent Activity</div>
                  <div className="panel-copy">
                    {activeSession?.recap ?? "No session recap logged yet."}
                  </div>
                  <div className="panel-copy">
                    {lastLogAt
                      ? `Last AI log: ${new Date(lastLogAt).toLocaleString()}`
                      : "No AI logs captured yet."}
                  </div>
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

                <div className="session-block">
                  <div className="panel-title">Campaign Actions</div>
                  <div className="panel-copy">
                    {hasParty
                      ? "Party assembled. You can continue the campaign."
                      : "Add party members in Party Sheets before continuing."}
                  </div>
                  <div className="button-row" style={{ marginTop: "1rem" }}>
                    <button
                      className="primary-button"
                      onClick={onResumePlay}
                      disabled={!onResumePlay}
                      data-tutorial-id="dashboard-resume-play"
                    >
                      Resume Play
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="panel-copy">Select a campaign to view details.</div>
            )}
          </div>
        </section>
      </div>
      <Modal
        isOpen={isCampaignModalOpen}
        title="New Campaign"
        subtitle="Set the campaign name and optional summary."
        onClose={() => {
          setIsCampaignModalOpen(false);
          setCampaignError(null);
        }}
        footer={
          <div className="button-row right">
            <button className="secondary-button" onClick={() => setIsCampaignModalOpen(false)}>
              Cancel
            </button>
            <button
              className="primary-button"
              onClick={handleCreateCampaign}
              disabled={!canCreateCampaign}
            >
              Create Campaign
            </button>
          </div>
        }
      >
        <div className="form-grid">
          <label className="form-field">
            <span className="form-label">Campaign Name</span>
            <input
              className="form-input"
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
              placeholder="Copperbound"
            />
          </label>
          <label className="form-field">
            <span className="form-label">Summary (Optional)</span>
            <textarea
              className="form-textarea"
              rows={3}
              value={campaignSummary}
              onChange={(event) => setCampaignSummary(event.target.value)}
              placeholder="A coastal relic hunt with storms, rival crews, and ancient wards."
            />
          </label>
        </div>
        {campaignError ? <div className="status-chip status-error">{campaignError}</div> : null}
      </Modal>

      <Modal
        isOpen={isSessionModalOpen}
        title="New Session"
        subtitle="Create a session under the active campaign."
        onClose={() => {
          setIsSessionModalOpen(false);
          setSessionError(null);
        }}
        footer={
          <div className="button-row right">
            <button className="secondary-button" onClick={() => setIsSessionModalOpen(false)}>
              Cancel
            </button>
            <button
              className="primary-button"
              onClick={handleCreateSession}
              disabled={!canCreateSession}
            >
              Create Session
            </button>
          </div>
        }
      >
        <label className="form-field">
          <span className="form-label">Session Title</span>
          <input
            className="form-input"
            value={sessionTitle}
            onChange={(event) => setSessionTitle(event.target.value)}
            placeholder="Session One"
            disabled={!activeCampaignId}
          />
        </label>
        {!activeCampaignId ? (
          <div className="form-hint">Select a campaign before creating a session.</div>
        ) : null}
        {sessionError ? <div className="status-chip status-error">{sessionError}</div> : null}
      </Modal>
    </div>
  );
}
