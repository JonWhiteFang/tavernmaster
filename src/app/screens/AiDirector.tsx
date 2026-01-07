import { useEffect, useMemo, useState } from "react";
import type { DmContext, PartyContext } from "../ai/orchestrator";
import { listCharacters } from "../data/characters";
import type { RulesState } from "../rules/types";
import { useAppContext } from "../state/AppContext";
import { buildRoster, buildRulesState } from "../ai/partyRoster";
import { useDmNarration } from "../hooks/useDmNarration";
import { usePartyProposals } from "../hooks/usePartyProposals";

const defaultSummary =
  "Act II: the party advances through the Sunken Vault to recover the Reliquary Core.";
const defaultScene =
  "A flooded corridor with crumbling arches, rising tide, and a sealed bronze vault door.";
const defaultEncounter = "Two goblins and a trained wolf guard the lockwheel platform.";

const defaultTactics = "Protect the rogue, prioritize healing, avoid splitting the party.";

const defaultIntent = "Scout the chamber and secure the lockwheel before enemies rally.";

const defaultRoster = `Riven Blackwell (Rogue 3, Human)
Sable Aster (Cleric 3, Elf)
Thorne Vale (Fighter 3, Dwarf)
Lyra Quill (Wizard 3, High Elf)
Bram Ironstep (Ranger 3, Halfling)`;

export default function AiDirector() {
  const { activeCampaignId, activeSessionId } = useAppContext();
  const [rulesState, setRulesState] = useState<RulesState | null>(null);
  const [partyRoster, setPartyRoster] = useState(defaultRoster);

  const [summary, setSummary] = useState(defaultSummary);
  const [scene, setScene] = useState(defaultScene);
  const [encounterSummary, setEncounterSummary] = useState(defaultEncounter);
  const [intent, setIntent] = useState(defaultIntent);

  const [tacticalNotes, setTacticalNotes] = useState(defaultTactics);

  useEffect(() => {
    void listCharacters().then((characters) => {
      const aiCharacters = characters.filter((character) => character.controlMode === "ai");
      if (!aiCharacters.length) {
        setPartyRoster("No AI-controlled party members available.");
        setRulesState(null);
        return;
      }
      setPartyRoster(buildRoster(aiCharacters));
      setRulesState(buildRulesState(aiCharacters));
    });
  }, []);

  const dmContext: DmContext = useMemo(
    () => ({
      campaignId: activeCampaignId ?? undefined,
      sessionId: activeSessionId ?? undefined,
      summary,
      scene,
      partyRoster,
      encounterSummary,
      intent
    }),
    [activeCampaignId, activeSessionId, summary, scene, partyRoster, encounterSummary, intent]
  );

  const partyContext: PartyContext = useMemo(
    () => ({
      campaignId: activeCampaignId ?? undefined,
      sessionId: activeSessionId ?? undefined,
      summary,
      encounterSummary,
      partyRoster,
      tacticalNotes
    }),
    [activeCampaignId, activeSessionId, summary, encounterSummary, partyRoster, tacticalNotes]
  );

  const { streamState, output, parsedHighlights, streamNarration, clearOutput } =
    useDmNarration(dmContext);
  const { proposalState, proposalError, proposals, approvalCounts, generate, approve, reject } =
    usePartyProposals(partyContext, rulesState);

  return (
    <div className="director">
      <section className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-title">AI Director</div>
        <div className="panel-subtitle">
          Stream Dungeon Master narration and approve party actions before resolving turns.
        </div>
        <div className="status-row" style={{ marginTop: "1rem" }}>
          <span className={`status-chip status-${streamState}`}>
            {streamState === "streaming" ? "Streaming" : "Narration Ready"}
          </span>
          <span className="status-chip">Pending: {approvalCounts.pending}</span>
          <span className="status-chip">Approved: {approvalCounts.approved}</span>
          <span className="status-chip">Rejected: {approvalCounts.rejected}</span>
        </div>
      </section>

      <div className="director-grid">
        <section className="panel director-card">
          <div className="panel-title">Narration Stream</div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="form-field">
                <span className="form-label">Session Summary</span>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Scene Frame</span>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={scene}
                  onChange={(event) => setScene(event.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Encounter Summary</span>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={encounterSummary}
                  onChange={(event) => setEncounterSummary(event.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Player Intent</span>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={intent}
                  onChange={(event) => setIntent(event.target.value)}
                />
              </label>
            </div>
            <div className="button-row">
              <button className="primary-button" onClick={streamNarration}>
                {streamState === "streaming" ? "Streaming..." : "Stream Narration"}
              </button>
              <button className="ghost-button" onClick={clearOutput}>
                Clear Output
              </button>
            </div>
            <div className="output-panel">
              <div className="panel-subtitle">Live Output</div>
              <pre className="output-text">{output || "Awaiting narration..."}</pre>
            </div>
            {parsedHighlights ? (
              <div className="output-panel">
                <div className="panel-subtitle">Parsed Highlights</div>
                <pre className="output-text">{parsedHighlights}</pre>
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel director-card">
          <div className="panel-title">Party Approval Queue</div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="form-field">
                <span className="form-label">Party Roster</span>
                <textarea
                  className="form-textarea"
                  rows={5}
                  value={partyRoster}
                  onChange={(event) => setPartyRoster(event.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Tactical Notes</span>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={tacticalNotes}
                  onChange={(event) => setTacticalNotes(event.target.value)}
                />
              </label>
            </div>
            <div className="button-row">
              <button className="primary-button" onClick={generate}>
                {proposalState === "loading" ? "Generating..." : "Generate Proposals"}
              </button>
              {proposalError ? (
                <span className="status-chip status-error">{proposalError}</span>
              ) : null}
            </div>
            <div className="proposal-list">
              {proposals.length === 0 ? (
                <div className="panel-copy">No proposals yet. Generate to review actions.</div>
              ) : (
                proposals.map((proposal, index) => (
                  <div className="proposal-card" key={`${proposal.characterId}-${index}`}>
                    <div className="proposal-header">
                      <div>
                        <div className="proposal-title">{proposal.summary}</div>
                        <div className="proposal-subtitle">{proposal.characterId}</div>
                      </div>
                      <span className={`status-chip status-${proposal.status}`}>
                        {proposal.status}
                      </span>
                    </div>
                    <pre className="output-text">{JSON.stringify(proposal.action, null, 2)}</pre>
                    {proposal.errors.length ? (
                      <div className="status-chip status-error">{proposal.errors.join(" ")}</div>
                    ) : null}
                    <div className="button-row">
                      <button className="secondary-button" onClick={() => approve(index)}>
                        Approve
                      </button>
                      <button className="ghost-button" onClick={() => reject(index)}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
