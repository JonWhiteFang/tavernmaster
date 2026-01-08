import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Settings from "./Settings";
import { getAppSettings, upsertAppSettings } from "../data/settings";
import { requestChatCompletion } from "../ai/client";
import {
  getSyncStatus,
  isSupabaseConfigured,
  signInWithPassword,
  signOut,
  subscribeSyncStatus,
  syncNow
} from "../sync/client";
import { countOpenConflicts, listOpenConflicts } from "../sync/conflicts";
import { keepLocalForConflict, keepRemoteForConflict } from "../sync/resolve";
import { seedDatabase } from "../data/seed";
import { useAppContext } from "../state/AppContext";

const pushToast = vi.fn();
const startTutorial = vi.fn();
const resumeTutorial = vi.fn();
const pauseTutorial = vi.fn();
const restartTutorial = vi.fn();
const resetTutorial = vi.fn();

vi.mock("../data/settings", () => ({
  getAppSettings: vi.fn(),
  upsertAppSettings: vi.fn()
}));
vi.mock("../ai/client", () => ({
  requestChatCompletion: vi.fn()
}));
vi.mock("../sync/client", () => ({
  getSyncStatus: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  subscribeSyncStatus: vi.fn(),
  syncNow: vi.fn()
}));
vi.mock("../sync/conflicts", () => ({
  countOpenConflicts: vi.fn(),
  listOpenConflicts: vi.fn()
}));
vi.mock("../sync/resolve", () => ({
  keepLocalForConflict: vi.fn(),
  keepRemoteForConflict: vi.fn()
}));
vi.mock("../data/seed", () => ({
  seedDatabase: vi.fn()
}));
vi.mock("../state/AppContext", () => ({
  useAppContext: vi.fn()
}));
vi.mock("../ui/Toast", () => ({
  useToast: () => ({ pushToast })
}));
vi.mock("../ui/Tutorial", () => ({
  useTutorial: () => ({
    status: "idle",
    stepIndex: 0,
    totalSteps: 4,
    startTutorial,
    resumeTutorial,
    pauseTutorial,
    restartTutorial,
    resetTutorial
  })
}));

describe("Settings", () => {
  it("saves settings and tests connection", async () => {
    const user = userEvent.setup();
    vi.mocked(useAppContext).mockReturnValue({
      refreshCampaigns: vi.fn(),
      refreshSessions: vi.fn()
    } as never);

    vi.mocked(getAppSettings).mockResolvedValue({
      llm: {
        baseUrl: "http://localhost:11434",
        model: "llama3",
        temperature: 0.7,
        maxTokens: 800,
        topP: 1,
        stream: false
      }
    });
    vi.mocked(upsertAppSettings).mockResolvedValue();
    vi.mocked(requestChatCompletion).mockResolvedValue({ content: "OK" } as never);
    vi.mocked(getSyncStatus).mockReturnValue({ status: "idle", message: null });
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(subscribeSyncStatus).mockReturnValue(() => {});
    vi.mocked(signInWithPassword).mockResolvedValue();
    vi.mocked(signOut).mockResolvedValue();
    vi.mocked(syncNow).mockResolvedValue();
    vi.mocked(countOpenConflicts).mockResolvedValue(0);
    vi.mocked(listOpenConflicts).mockResolvedValue([]);
    vi.mocked(keepLocalForConflict).mockResolvedValue();
    vi.mocked(keepRemoteForConflict).mockResolvedValue();
    vi.mocked(seedDatabase).mockResolvedValue();

    render(<Settings />);

    expect(await screen.findByText("LLM Runtime")).toBeInTheDocument();

    const baseUrl = screen.getByLabelText("Base URL");
    await user.clear(baseUrl);
    await user.type(baseUrl, "http://localhost:1234");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(upsertAppSettings).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Test Connection" }));
    await waitFor(() => expect(requestChatCompletion).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Start Tutorial" }));
    expect(startTutorial).toHaveBeenCalled();
  });
});
