type TutorialAdvanceEvent = {
  type: "event";
  name: string;
};

export type TutorialAdvance = TutorialAdvanceEvent;

export type TutorialStep = {
  id: string;
  title: string;
  body: string;
  targetId?: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  advanceOn?: TutorialAdvance;
};

export const tutorialVersion = "v2";

export const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Tavern Master",
    body: "This quick tour highlights the core loop and the places you will return to most.",
    placement: "center"
  },
  {
    id: "campaign-select",
    title: "Select a Campaign",
    body: "Pick or create a campaign before diving into sessions and play tools.",
    targetId: "topbar-campaign",
    placement: "bottom"
  },
  {
    id: "session-select",
    title: "Select a Session",
    body: "Sessions track recaps and transcripts for each play arc.",
    targetId: "topbar-session",
    placement: "bottom"
  },
  {
    id: "dashboard-nav",
    title: "Campaigns & Sessions",
    body: "Open the dashboard to create campaigns, sessions, and resume play.",
    targetId: "nav-dashboard",
    placement: "right"
  },
  {
    id: "dashboard-new-campaign",
    title: "Create a Campaign",
    body: "Start with a campaign name and optional summary.",
    targetId: "dashboard-new-campaign",
    placement: "bottom",
    advanceOn: { type: "event", name: "tm.tutorial.campaign-created" }
  },
  {
    id: "dashboard-new-session",
    title: "Create a Session",
    body: "Add a session under the active campaign to capture recaps.",
    targetId: "dashboard-new-session",
    placement: "bottom",
    advanceOn: { type: "event", name: "tm.tutorial.session-created" }
  },
  {
    id: "dashboard-resume",
    title: "Resume Play",
    body: "Jump into the play workspace once your party is ready.",
    targetId: "dashboard-resume-play",
    placement: "bottom"
  },
  {
    id: "party-nav",
    title: "Party Sheets",
    body: "Build party members here before running encounters or AI actions.",
    targetId: "nav-party",
    placement: "right"
  },
  {
    id: "party-create",
    title: "Create a Character",
    body: "Start a new party member and fill in their core identity.",
    targetId: "party-create-character",
    placement: "bottom"
  },
  {
    id: "party-control",
    title: "Set Control Mode",
    body: "Choose Player or AI control, then save to lock in the sheet.",
    targetId: "party-control-mode",
    placement: "bottom",
    advanceOn: { type: "event", name: "tm.tutorial.character-created" }
  },
  {
    id: "party-roster",
    title: "Confirm the Roster",
    body: "Your party list lives here. Select a hero to review details.",
    targetId: "party-roster",
    placement: "right"
  },
  {
    id: "play-nav",
    title: "Play Workspace",
    body: "Narration, actions, and notes live here once your campaign is ready.",
    targetId: "nav-play",
    placement: "right"
  },
  {
    id: "play-tab-narration",
    title: "Narration Tab",
    body: "Set the scene, intent, and encounter framing before streaming.",
    targetId: "play-tab-narration",
    placement: "bottom"
  },
  {
    id: "play-stream-narration",
    title: "Stream Narration",
    body: "Generate live DM narration and review the highlights.",
    targetId: "play-stream-narration",
    placement: "bottom"
  },
  {
    id: "play-tab-actions",
    title: "Actions Tab",
    body: "Generate, approve, and reject party actions from this queue.",
    targetId: "play-tab-actions",
    placement: "bottom"
  },
  {
    id: "play-generate-proposals",
    title: "Generate Proposals",
    body: "Ask the party for suggested actions and review their intent.",
    targetId: "play-generate-proposals",
    placement: "bottom"
  },
  {
    id: "play-tab-notes",
    title: "Notes Tab",
    body: "Capture quick notes while the scene is fresh.",
    targetId: "play-tab-notes",
    placement: "bottom"
  },
  {
    id: "play-save-journal",
    title: "Save to Journal",
    body: "Log quick notes directly to the campaign journal.",
    targetId: "play-save-journal",
    placement: "bottom"
  },
  {
    id: "play-import-narration",
    title: "Import Narration",
    body: "Pull the latest DM narration into your notes.",
    targetId: "play-import-narration",
    placement: "bottom"
  },
  {
    id: "director-nav",
    title: "AI Director",
    body: "Dive deeper into narration and party approvals.",
    targetId: "nav-director",
    placement: "right"
  },
  {
    id: "director-stream",
    title: "Stream Narration",
    body: "Run a full narration stream for the active session.",
    targetId: "director-stream-narration",
    placement: "bottom"
  },
  {
    id: "director-generate",
    title: "Generate Proposals",
    body: "Ask the party for actions with rules checks attached.",
    targetId: "director-generate-proposals",
    placement: "bottom"
  },
  {
    id: "director-approve",
    title: "Approve Actions",
    body: "Approve safe actions or review each proposal in detail.",
    targetId: "director-approve-all",
    placement: "bottom"
  },
  {
    id: "director-copy",
    title: "Copy to Journal",
    body: "Send the narration output into a journal entry.",
    targetId: "director-copy-journal",
    placement: "bottom"
  },
  {
    id: "journal-nav",
    title: "Journal",
    body: "Capture, edit, and export narrative entries.",
    targetId: "nav-journal",
    placement: "right"
  },
  {
    id: "journal-new",
    title: "Create a Journal Entry",
    body: "Start a new entry for recaps, rulings, and hooks.",
    targetId: "journal-new-entry",
    placement: "bottom"
  },
  {
    id: "journal-edit",
    title: "Edit Entries",
    body: "Update an entry to keep the narrative current.",
    targetId: "journal-edit-entry",
    placement: "bottom"
  },
  {
    id: "journal-export",
    title: "Export Notes",
    body: "Export a journal entry as Markdown or PDF.",
    targetId: "journal-export-markdown",
    placement: "bottom"
  },
  {
    id: "logs-nav",
    title: "Logs & Exports",
    body: "Review transcripts and export session archives.",
    targetId: "nav-logs",
    placement: "right"
  },
  {
    id: "logs-filter",
    title: "Filter Transcript Kinds",
    body: "Filter the logs by speaker or system channel.",
    targetId: "logs-filter-kinds",
    placement: "bottom"
  },
  {
    id: "logs-export-transcript",
    title: "Export Transcripts",
    body: "Download a campaign or session transcript.",
    targetId: "logs-export-transcript",
    placement: "bottom"
  },
  {
    id: "encounter-nav",
    title: "Encounter Flow",
    body: "Track initiative order and resolve combat turns.",
    targetId: "nav-encounter",
    placement: "right"
  },
  {
    id: "encounter-roll",
    title: "Roll Initiative",
    body: "Roll initiative to set the turn order.",
    targetId: "encounter-roll-initiative",
    placement: "bottom"
  },
  {
    id: "encounter-start",
    title: "Start Encounter",
    body: "Begin the encounter and roll combat stats.",
    targetId: "encounter-start-encounter",
    placement: "bottom"
  },
  {
    id: "encounter-advance",
    title: "Advance Turn",
    body: "Step through the turn order as combat unfolds.",
    targetId: "encounter-advance-turn",
    placement: "bottom"
  },
  {
    id: "map-nav",
    title: "Map Studio",
    body: "Stage maps, tokens, and fog for tactical play.",
    targetId: "nav-map",
    placement: "right"
  },
  {
    id: "map-upload",
    title: "Upload a Map",
    body: "Drop in a tactical map to stage the scene.",
    targetId: "map-upload",
    placement: "bottom"
  },
  {
    id: "map-add-token",
    title: "Add Tokens",
    body: "Create a token and assign its role.",
    targetId: "map-add-token",
    placement: "bottom"
  },
  {
    id: "map-role-toggle",
    title: "Toggle Roles",
    body: "Swap token roles to reflect alliances.",
    targetId: "map-role-toggle",
    placement: "bottom"
  },
  {
    id: "map-search",
    title: "Search Tokens",
    body: "Filter the token list by name or role.",
    targetId: "map-search",
    placement: "bottom"
  },
  {
    id: "context-rail",
    title: "Context Rail",
    body: "Keep a quick view of narration while you work.",
    targetId: "context-rail-recent-logs",
    placement: "left"
  },
  {
    id: "timeline",
    title: "Timeline Drawer",
    body: "Keep an eye on recent AI logs from any screen.",
    targetId: "timeline-toggle",
    placement: "top"
  },
  {
    id: "timeline-open-logs",
    title: "Open Transcripts",
    body: "Jump straight into the logs when you need a full transcript.",
    targetId: "timeline-open-logs",
    placement: "top"
  },
  {
    id: "settings-nav",
    title: "Settings",
    body: "Manage sync, tutorial controls, and sample data.",
    targetId: "nav-settings",
    placement: "right"
  },
  {
    id: "settings-tutorial",
    title: "Tutorial Controls",
    body: "Restart the walkthrough or reset progress anytime.",
    targetId: "settings-tutorial-panel",
    placement: "bottom"
  },
  {
    id: "settings-sync",
    title: "Sync Status",
    body: "Check Supabase configuration and run manual syncs.",
    targetId: "settings-sync-status",
    placement: "bottom"
  },
  {
    id: "settings-sample-data",
    title: "Sample Data",
    body: "Spin up a demo campaign when you want a sandbox.",
    targetId: "settings-sample-data",
    placement: "bottom"
  }
];
