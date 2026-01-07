import { useEffect, useMemo, useState } from "react";
import type { PartyContext, DmContext } from "../ai/orchestrator";
import { buildRoster, buildRulesState } from "../ai/partyRoster";
import type { RulesState } from "../rules/types";
import { listCharacters } from "../data/characters";
import { listAiLogs } from "../data/ai_logs";
import { createJournalEntry } from "../data/journal";
import { useAppContext } from "../state/AppContext";
import { useDmNarration } from "../hooks/useDmNarration";
import { usePartyProposals } from "../hooks/usePartyProposals";
import Panel from "../ui/Panel";
import Tabs from "../ui/Tabs";
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

type TabKey = "narration" | "actions" | "notes";

export default function PlayWorkspace() {
  const { activeCampaignId, activeSessionId } = useAppContext();
  const { pushToast } = useToast();
  const [rulesState, setRulesState] = useState<RulesState | null>(null);
  const [partyRoster, setPartyRoster] = useState(defaultRoster);
  const [summary, setSummary] = useState(defaultSummary);
  const [scene, setScene] = useState(defaultScene);
  const [encounterSummary, setEncounterSummary] = useState(defaultEncounter);
  const [intent, setIntent] = useState(defaultIntent);
  const [tacticalNotes, setTacticalNotes] = useState(defaultTactics);
  const [activeTab, setActiveTab] = useState<TabKey>("narration");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSaveNote = async () => {
    if (!activeCampaignId) {
      pushToast({ tone: "error", message: "Select a campaign before saving notes." });
      return;
    }
    if (!noteTitle.trim() || !noteContent.trim()) {
      pushToast({ tone: "error", message: "Add a title and content before saving." });
      return;
    }
    setIsSaving(true);
    try {
      await createJournalEntry({
        campaignId: activeCampaignId,
        title: noteTitle.trim(),
        content: noteContent.trim()
      });
      setNoteTitle("");
      setNoteContent("");
      pushToast({ tone: "success", message: "Journal entry saved." });
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
    const entries = await listAiLogs({
      campaignId: activeCampaignId,
      sessionId: activeSessionId ?? undefined,
      limit: 6
    });
    const dmEntry = entries.find((entry) => entry.kind === "dm");
    if (!dmEntry) {
      pushToast({ tone: "error", message: "No narration logs available yet." });
      return;
    }
    setNoteContent(dmEntry.content);
    if (!noteTitle.trim()) {
      setNoteTitle(`Narration ${new Date(dmEntry.createdAt).toLocaleDateString()}`);
    }
    pushToast({ tone: "success", message: "Narration imported." });
  };

  const handleNavigate = (screen: string) => {
    window.dispatchEvent(new globalThis.CustomEvent("tm.navigate", { detail: { screen } }));
  };

  if (!activeCampaignId) {
    return (
      <div className="play-workspace">
        <section className="panel">
          <div className="panel-title">Play Workspace</div>
          <div className="panel-subtitle">
            Create or select a campaign to begin the solo play loop.
          </div>
          <div className="panel-copy" style={{ marginTop: "0.8rem" }}>
            Start a new campaign, then build your party roster before streaming narration.
          </div>
          <div className="button-row" style={{ marginTop: "1.2rem" }}>
            <Button onClick={() => handleNavigate("dashboard")}>Create Campaign</Button>
            <Button variant="secondary" onClick={() => handleNavigate("party")}>
              Open Party Sheets
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const narrationContent = (
    <div className="play-tab-grid">
      <Panel title="Narration Context" subtitle="Frame the scene and intent for the DM stream.">
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
      </Panel>

      <Panel title="Narration Stream" subtitle="Stream DM narration and review highlights.">
        <div className="button-row">
          <Button onClick={streamNarration} disabled={streamState === "streaming"}>
            {streamState === "streaming" ? "Streaming..." : "Stream Narration"}
          </Button>
          <Button variant="ghost" onClick={clearOutput}>
            Clear Output
          </Button>
          <Chip>{streamState === "streaming" ? "Streaming" : "Ready"}</Chip>
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
      </Panel>
    </div>
  );

  const actionsContent = (
    <div className="play-tab-grid">
      <Panel title="Party Context" subtitle="Prepare the party roster and tactical framing.">
        <div className="form-grid">
          <label className="form-field">
            <span className="form-label">Party Roster</span>
            <textarea
              className="form-textarea"
              rows={6}
              value={partyRoster}
              onChange={(event) => setPartyRoster(event.target.value)}
            />
          </label>
          <label className="form-field">
            <span className="form-label">Tactical Notes</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={tacticalNotes}
              onChange={(event) => setTacticalNotes(event.target.value)}
            />
          </label>
        </div>
      </Panel>

      <Panel title="Approval Queue" subtitle="Review and approve proposed actions.">
        <div className="button-row">
          <Button onClick={generate} disabled={proposalState === "loading"}>
            {proposalState === "loading" ? "Generating..." : "Generate Proposals"}
          </Button>
          <Button variant="secondary" onClick={approveAllSafe} disabled={proposals.length === 0}>
            Approve All Safe
          </Button>
          <div className="status-row">
            <Chip>Pending {approvalCounts.pending}</Chip>
            <Chip tone="success">Approved {approvalCounts.approved}</Chip>
            <Chip tone="error">Rejected {approvalCounts.rejected}</Chip>
          </div>
          {proposalError ? <Chip tone="error">{proposalError}</Chip> : null}
        </div>
        {proposals.length === 0 ? (
          <div className="panel-copy">No proposals yet. Generate to review actions.</div>
        ) : (
          <div className="proposal-list">
            {proposals.map((proposal, index) => (
              <ListCard
                key={`${proposal.characterId}-${index}`}
                title={proposal.summary}
                subtitle={proposal.characterId}
                status={<Chip>{proposal.status}</Chip>}
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
                <div>Action: {proposal.action.type}</div>
                {proposal.errors.length ? (
                  <Chip tone="error">Errors: {proposal.errors.join(" ")}</Chip>
                ) : (
                  <Chip tone="success">Validated</Chip>
                )}
              </ListCard>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );

  const notesContent = (
    <div className="play-tab-grid">
      <Panel title="Quick Notes" subtitle="Capture a journal entry in the moment.">
        <div className="form-grid">
          <label className="form-field">
            <span className="form-label">Title</span>
            <input
              className="form-input"
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
              placeholder="Session recap"
            />
          </label>
          <label className="form-field">
            <span className="form-label">Notes</span>
            <textarea
              className="form-textarea"
              rows={6}
              value={noteContent}
              onChange={(event) => setNoteContent(event.target.value)}
              placeholder="Capture narration beats, rulings, and new hooks."
            />
          </label>
        </div>
        <div className="button-row">
          <Button onClick={handleSaveNote} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save to Journal"}
          </Button>
          <Button variant="secondary" onClick={handleImportNarration}>
            Import Latest Narration
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setNoteTitle("");
              setNoteContent("");
            }}
          >
            Clear
          </Button>
        </div>
      </Panel>
    </div>
  );

  const tabs = [
    { id: "narration", label: "Narration", content: narrationContent },
    {
      id: "actions",
      label: "Actions",
      badge: approvalCounts.pending,
      content: actionsContent
    },
    { id: "notes", label: "Notes", content: notesContent }
  ];

  return (
    <div className="play-workspace">
      <section className="panel">
        <div className="panel-title">Play Workspace</div>
        <div className="panel-subtitle">
          Run narration, approve actions, and capture notes in one workspace.
        </div>
        <div className="status-row" style={{ marginTop: "1rem" }}>
          <Chip>Campaign {activeCampaignId ? "Active" : "None"}</Chip>
          <Chip>Session {activeSessionId ? "Active" : "None"}</Chip>
        </div>
      </section>

      <Tabs items={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as TabKey)} />
    </div>
  );
}
