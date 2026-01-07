import { useEffect, useMemo, useState } from "react";
import type { DmContext, PartyContext } from "../ai/orchestrator";
import { listCharacters } from "../data/characters";
import { createJournalEntry } from "../data/journal";
import type { Action, RulesState } from "../rules/types";
import { useAppContext } from "../state/AppContext";
import { buildRoster, buildRulesState } from "../ai/partyRoster";
import { useDmNarration } from "../hooks/useDmNarration";
import { usePartyProposals } from "../hooks/usePartyProposals";
import Button from "../ui/Button";
import Chip from "../ui/Chip";
import ListCard from "../ui/ListCard";
import { useToast } from "../ui/Toast";

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

type ActionDetail = {
  label: string;
  value: string;
};

const formatModifier = (value: number) => (value >= 0 ? `+${value}` : `${value}`);

const formatActionSummary = (action: Action) => {
  switch (action.type) {
    case "attack":
      return `Attack ${action.targetId} with ${action.damage} ${action.damageType}.`;
    case "cast": {
      const targets = action.targetIds.length ? ` targeting ${action.targetIds.join(", ")}` : "";
      return `Cast ${action.spellId}${targets}.`;
    }
    case "dash":
      return "Dash to reposition.";
    case "dodge":
      return "Dodge to focus on defense.";
    case "disengage":
      return "Disengage and create space.";
    case "hide":
      return "Hide and break line of sight.";
    case "help":
      return `Help ${action.targetId} with positioning.`;
    case "ready":
      return "Ready a contingent action.";
    case "use-object":
      return action.description || "Use an object.";
    default:
      return action.type;
  }
};

const buildActionDetails = (action: Action) => {
  const details: ActionDetail[] = [];
  const add = (label: string, value?: string | number | null) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    details.push({ label, value: String(value) });
  };

  switch (action.type) {
    case "attack":
      add("Attacker", action.attackerId);
      add("Target", action.targetId);
      add("Attack Bonus", formatModifier(action.attackBonus));
      add("Damage", `${action.damage} ${action.damageType}`);
      if (action.advantage) {
        add("Advantage", action.advantage);
      }
      if (action.isMelee !== undefined) {
        add("Range", action.isMelee ? "Melee" : "Ranged");
      }
      break;
    case "cast":
      add("Caster", action.casterId);
      add("Spell", action.spellId);
      add("Slot", `Level ${action.slotLevel}`);
      if (action.targetIds.length) {
        add("Targets", action.targetIds.join(", "));
      }
      if (action.damage) {
        add("Damage", `${action.damage.dice} ${action.damage.type}`);
      }
      if (action.attack?.bonus !== undefined) {
        add("Attack Bonus", formatModifier(action.attack.bonus));
      }
      if (action.attack?.advantage) {
        add("Advantage", action.attack.advantage);
      }
      if (action.attack?.isMelee !== undefined) {
        add("Range", action.attack.isMelee ? "Melee" : "Ranged");
      }
      if (action.save) {
        add("Save", action.save.ability.toUpperCase());
        if (action.save.dc !== undefined) {
          add("Save DC", action.save.dc);
        }
        if (action.save.halfOnSave !== undefined) {
          add("Half on Save", action.save.halfOnSave ? "Yes" : "No");
        }
      }
      if (action.condition) {
        add("Condition", action.condition.name);
        if (action.condition.durationRounds !== undefined) {
          add(
            "Duration",
            action.condition.durationRounds === null
              ? "Until cleared"
              : `${action.condition.durationRounds} rounds`
          );
        }
      }
      if (action.concentration !== undefined) {
        add("Concentration", action.concentration ? "Yes" : "No");
      }
      break;
    case "dash":
    case "dodge":
    case "disengage":
    case "hide":
      add("Actor", action.actorId);
      break;
    case "help":
      add("Helper", action.helperId);
      add("Target", action.targetId);
      break;
    case "ready":
      add("Actor", action.actorId);
      add("Trigger", action.trigger);
      add("Readied Action", action.readiedAction);
      break;
    case "use-object":
      add("Actor", action.actorId);
      add("Description", action.description);
      break;
  }

  return details;
};

export default function AiDirector() {
  const { activeCampaignId, activeSessionId } = useAppContext();
  const { pushToast } = useToast();
  const [rulesState, setRulesState] = useState<RulesState | null>(null);
  const [partyRoster, setPartyRoster] = useState(defaultRoster);
  const [isSavingJournal, setIsSavingJournal] = useState(false);

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
  const {
    proposalState,
    proposalError,
    proposals,
    approvalCounts,
    generate,
    approve,
    reject,
    approveAllSafe
  } = usePartyProposals(partyContext, rulesState);

  const handleStreamNarration = () => {
    void streamNarration();
  };

  const handleClearOutput = () => {
    clearOutput();
  };

  const handleCopyNarration = async () => {
    if (!activeCampaignId) {
      pushToast({ tone: "error", message: "Select a campaign before saving narration." });
      return;
    }
    const content = (parsedHighlights ?? output).trim();
    if (!content) {
      pushToast({ tone: "error", message: "Stream narration before copying to Journal." });
      return;
    }
    setIsSavingJournal(true);
    try {
      await createJournalEntry({
        campaignId: activeCampaignId,
        title: `Narration ${new Date().toLocaleDateString()}`,
        content
      });
      pushToast({ tone: "success", message: "Narration copied to Journal." });
    } catch (error) {
      console.error("Failed to copy narration to journal", error);
      pushToast({ tone: "error", message: "Unable to save narration." });
    } finally {
      setIsSavingJournal(false);
    }
  };

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
              <Button onClick={handleStreamNarration} disabled={streamState === "streaming"}>
                {streamState === "streaming" ? "Streaming..." : "Stream Narration"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleCopyNarration}
                disabled={isSavingJournal || streamState === "streaming"}
              >
                {isSavingJournal ? "Saving..." : "Copy to Journal"}
              </Button>
              <Button variant="ghost" onClick={handleClearOutput}>
                Clear Output
              </Button>
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
              <Button onClick={generate} disabled={proposalState === "loading"}>
                {proposalState === "loading" ? "Generating..." : "Generate Proposals"}
              </Button>
              <Button
                variant="secondary"
                onClick={approveAllSafe}
                disabled={proposals.length === 0}
              >
                Approve All Safe
              </Button>
              {proposalError ? <Chip tone="error">{proposalError}</Chip> : null}
            </div>
            <div className="proposal-list">
              {proposals.length === 0 ? (
                <div className="panel-copy">No proposals yet. Generate to review actions.</div>
              ) : (
                proposals.map((proposal, index) => {
                  const actionDetails = buildActionDetails(proposal.action);
                  return (
                    <ListCard
                      key={`${proposal.characterId}-${index}`}
                      title={proposal.summary}
                      subtitle={proposal.characterId}
                      status={
                        <Chip
                          tone={
                            proposal.status === "approved"
                              ? "success"
                              : proposal.status === "rejected"
                                ? "error"
                                : "default"
                          }
                        >
                          {proposal.status}
                        </Chip>
                      }
                      footer={
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => approve(index)}
                            disabled={proposal.status === "approved"}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => reject(index)}
                            disabled={proposal.status === "rejected"}
                          >
                            Reject
                          </Button>
                        </>
                      }
                    >
                      <div className="detail-group">
                        <div className="detail-group-title">Action</div>
                        <div className="detail-value">{formatActionSummary(proposal.action)}</div>
                        {actionDetails.length ? (
                          <div className="detail-grid">
                            {actionDetails.map((detail) => (
                              <div className="detail-section" key={detail.label}>
                                <div className="detail-title">{detail.label}</div>
                                <div className="detail-value">{detail.value}</div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="detail-group">
                        <div className="detail-group-title">Rules refs</div>
                        {proposal.rulesRefs.length ? (
                          <div className="detail-badges">
                            {proposal.rulesRefs.map((ref) => (
                              <Chip key={`${proposal.characterId}-${ref}`}>{ref}</Chip>
                            ))}
                          </div>
                        ) : (
                          <div className="detail-value">None noted.</div>
                        )}
                      </div>
                      <div className="detail-group">
                        <div className="detail-group-title">Risks</div>
                        {proposal.risks.length ? (
                          <ul className="proposal-listing">
                            {proposal.risks.map((risk, riskIndex) => (
                              <li key={`${proposal.characterId}-risk-${riskIndex}`}>{risk}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="detail-value">None noted.</div>
                        )}
                      </div>
                      <div className="detail-group">
                        <div className="detail-group-title">Alternatives</div>
                        {proposal.alternatives.length ? (
                          <ul className="proposal-listing">
                            {proposal.alternatives.map((alternative, altIndex) => (
                              <li key={`${proposal.characterId}-alt-${altIndex}`}>{alternative}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="detail-value">None noted.</div>
                        )}
                      </div>
                      <div className="detail-group">
                        <div className="detail-group-title">Validation</div>
                        {proposal.errors.length ? (
                          <div className="detail-badges">
                            {proposal.errors.map((error, errorIndex) => (
                              <Chip
                                tone="error"
                                key={`${proposal.characterId}-error-${errorIndex}`}
                              >
                                {error}
                              </Chip>
                            ))}
                          </div>
                        ) : (
                          <Chip tone="success">Validated</Chip>
                        )}
                      </div>
                      <details className="proposal-details">
                        <summary>Raw action payload</summary>
                        <pre className="output-text">
                          {JSON.stringify(proposal.action, null, 2)}
                        </pre>
                      </details>
                    </ListCard>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
