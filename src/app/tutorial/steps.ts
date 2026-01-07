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

export const tutorialVersion = "v1";

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
    id: "dashboard-nav",
    title: "Campaigns & Sessions",
    body: "Open the dashboard to create campaigns, sessions, and resume play.",
    targetId: "nav-dashboard",
    placement: "right"
  },
  {
    id: "party-nav",
    title: "Party Sheets",
    body: "Build party members here before running encounters or AI actions.",
    targetId: "nav-party",
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
    id: "logs-nav",
    title: "Logs & Exports",
    body: "Review transcripts and export session archives from here.",
    targetId: "nav-logs",
    placement: "right"
  },
  {
    id: "timeline",
    title: "Timeline Drawer",
    body: "Keep an eye on recent AI logs from any screen.",
    targetId: "timeline-toggle",
    placement: "top"
  }
];
