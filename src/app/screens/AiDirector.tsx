import { useEffect, useMemo, useState } from "react";
import type { PartyActionProposal } from "../ai/types";
import type { DmContext, PartyContext } from "../ai/orchestrator";
import { getPartyProposals, streamDmNarration, validatePartyProposals } from "../ai/orchestrator";
import { insertAiLog } from "../data/ai_logs";
import { getAppSettings } from "../data/settings";
import { listCharacters } from "../data/characters";
import { parseJsonWithRepair } from "../ai/parser";
import type { RulesParticipant, RulesState } from "../rules/types";
import type { Character } from "../data/types";
import { useAppContext } from "../state/AppContext";

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

type ProposalStatus = "pending" | "approved" | "rejected";

type ProposalState = PartyActionProposal & {
  status: ProposalStatus;
  errors: string[];
};

type StreamState = "idle" | "streaming" | "error";

type ProposalStateStatus = "idle" | "loading" | "error" | "ready";

export default function AiDirector() {
  const { activeCampaignId, activeSessionId } = useAppContext();
  const [rulesState, setRulesState] = useState<RulesState | null>(null);
  const [partyRoster, setPartyRoster] = useState(defaultRoster);

  const [summary, setSummary] = useState(defaultSummary);
  const [scene, setScene] = useState(defaultScene);
  const [encounterSummary, setEncounterSummary] = useState(defaultEncounter);
  const [intent, setIntent] = useState(defaultIntent);

  const [tacticalNotes, setTacticalNotes] = useState(defaultTactics);

  const [dmStreamState, setDmStreamState] = useState<StreamState>("idle");
  const [dmOutput, setDmOutput] = useState("");
  const [dmParsed, setDmParsed] = useState<string | null>(null);

  const [proposalState, setProposalState] = useState<ProposalStateStatus>("idle");
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalState[]>([]);

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

  const approvalCounts = useMemo(() => {
    return proposals.reduce(
      (acc, proposal) => {
        acc[proposal.status] += 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 }
    );
  }, [proposals]);

  const dmContext: DmContext = {
    campaignId: activeCampaignId ?? undefined,
    sessionId: activeSessionId ?? undefined,
    summary,
    scene,
    partyRoster,
    encounterSummary,
    intent
  };

  const partyContext: PartyContext = {
    campaignId: activeCampaignId ?? undefined,
    sessionId: activeSessionId ?? undefined,
    summary,
    encounterSummary,
    partyRoster,
    tacticalNotes
  };

  const handleStreamNarration = async () => {
    if (dmStreamState === "streaming") {
      return;
    }
    setDmStreamState("streaming");
    setDmOutput("");
    setDmParsed(null);

    let content = "";
    try {
      const stream = await streamDmNarration(dmContext);
      for await (const chunk of stream) {
        content += chunk;
        setDmOutput(content);
      }
      setDmStreamState("idle");
      setDmOutput(content);
      await insertAiLog({
        campaignId: activeCampaignId ?? undefined,
        sessionId: activeSessionId ?? undefined,
        kind: "dm",
        content
      });
      const settings = await getAppSettings();
      const parsed = await parseJsonWithRepair<{
        narrative?: string;
        sceneUpdates?: string[];
        questions?: string[];
      }>(settings.llm, content, 1);
      if (parsed?.narrative) {
        const extra = [
          parsed.narrative,
          ...(parsed.sceneUpdates ?? []),
          ...(parsed.questions ?? [])
        ]
          .filter(Boolean)
          .join("\n\n");
        setDmParsed(extra);
      }
    } catch (error) {
      setDmStreamState("error");
      setDmOutput("Failed to stream narration.");
      console.error(error);
    }
  };

  const handleGenerateProposals = async () => {
    setProposalState("loading");
    setProposalError(null);
    try {
      const payload = await getPartyProposals(partyContext);
      if (!payload || !payload.proposals.length) {
        setProposalState("error");
        setProposalError("No proposals returned.");
        setProposals([]);
        return;
      }
      const validated = rulesState ? validatePartyProposals(rulesState, payload) : [];
      const nextProposals = payload.proposals.map((proposal) => {
        const validation = validated.find((entry) => entry.characterId === proposal.characterId);
        return {
          ...proposal,
          status: "pending" as ProposalStatus,
          errors: validation?.errors ?? []
        };
      });
      setProposals(nextProposals);
      setProposalState("ready");
    } catch (error) {
      setProposalState("error");
      setProposalError("Failed to generate proposals.");
      console.error(error);
    }
  };

  const updateProposalStatus = (index: number, status: ProposalStatus) => {
    setProposals((current) =>
      current.map((proposal, proposalIndex) =>
        proposalIndex === index ? { ...proposal, status } : proposal
      )
    );
  };

  return (
    <div className="director">
      <section className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-title">AI Director</div>
        <div className="panel-subtitle">
          Stream Dungeon Master narration and approve party actions before resolving turns.
        </div>
        <div className="status-row" style={{ marginTop: "1rem" }}>
          <span className={`status-chip status-${dmStreamState}`}>
            {dmStreamState === "streaming" ? "Streaming" : "Narration Ready"}
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
              <button className="primary-button" onClick={handleStreamNarration}>
                {dmStreamState === "streaming" ? "Streaming..." : "Stream Narration"}
              </button>
              <button className="ghost-button" onClick={() => setDmOutput("")}>
                Clear Output
              </button>
            </div>
            <div className="output-panel">
              <div className="panel-subtitle">Live Output</div>
              <pre className="output-text">{dmOutput || "Awaiting narration..."}</pre>
            </div>
            {dmParsed ? (
              <div className="output-panel">
                <div className="panel-subtitle">Parsed Highlights</div>
                <pre className="output-text">{dmParsed}</pre>
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
              <button className="primary-button" onClick={handleGenerateProposals}>
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
                      <button
                        className="secondary-button"
                        onClick={() => updateProposalStatus(index, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => updateProposalStatus(index, "rejected")}
                      >
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

function buildRoster(characters: Character[]): string {
  return characters
    .map((character) => `${character.name} (${character.className} ${character.level})`)
    .join("\n");
}

function buildRulesState(characters: Character[]): RulesState {
  const participants: Record<string, RulesParticipant> = {};
  for (const character of characters) {
    participants[character.id] = {
      id: character.id,
      name: character.name,
      maxHp: character.hitPointMax,
      hp: character.hitPoints,
      armorClass: character.armorClass,
      initiativeBonus: character.initiativeBonus,
      speed: character.speed,
      abilities: character.abilities,
      savingThrows: {},
      proficiencyBonus: getProficiencyBonus(character.level),
      conditions: []
    };
  }

  return {
    round: 1,
    turnOrder: characters.map((character) => character.id),
    activeTurnIndex: 0,
    participants,
    log: []
  };
}

function getProficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}
