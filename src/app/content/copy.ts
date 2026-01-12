// Centralized UI copy for game-first language

export const copy = {
  // Navigation
  nav: {
    play: "Play",
    campaignLibrary: "Campaign Library",
    character: "Character",
    notes: "Notes",
    srdBrowser: "Rules Reference",
    settings: "Settings",
    licenses: "Licenses"
  },

  // Actions
  actions: {
    continue: "Continue",
    startSession: "Begin Session",
    endSession: "End Session",
    undo: "Undo",
    branch: "Branch Timeline",
    save: "Save",
    cancel: "Cancel",
    retry: "Try Again",
    dismiss: "Dismiss"
  },

  // Empty states
  empty: {
    noCampaign:
      "No campaign selected. Choose one from the Campaign Library to begin your adventure.",
    noCharacter: "Create or select a character to play.",
    noSessions: "No sessions yet. Start a new session to begin playing.",
    noQuests: "No active quests. Your adventure awaits.",
    noTurns: "The story begins with your first action."
  },

  // Errors
  errors: {
    generic: "Something went wrong. Please try again.",
    aiFailure: "The Dungeon Master needs a moment. Try your action again.",
    validationFailed: "That action couldn't be completed. Check the details and try again.",
    connectionFailed: "Couldn't connect to the AI. Check your LLM settings.",
    saveFailed: "Couldn't save your progress. Your data is safe locally."
  },

  // Status
  status: {
    loading: "Loading...",
    saving: "Saving...",
    thinking: "The DM is thinking...",
    ready: "Ready"
  },

  // Modes
  modes: {
    exploration: "Exploring",
    combat: "In Combat",
    dialogue: "Conversation",
    rest: "Resting"
  }
} as const;

export type CopyKey = keyof typeof copy;
