import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";
import { useAppContext } from "../state/AppContext";
import { listCharacters } from "../data/characters";
import { listAiLogs } from "../data/ai_logs";
import { createCampaign } from "../data/campaigns";
import { createSession } from "../data/sessions";

const pushToast = vi.fn();

vi.mock("../state/AppContext", () => ({
  useAppContext: vi.fn()
}));
vi.mock("../data/characters", () => ({
  listCharacters: vi.fn()
}));
vi.mock("../data/ai_logs", () => ({
  listAiLogs: vi.fn()
}));
vi.mock("../data/campaigns", () => ({
  createCampaign: vi.fn()
}));
vi.mock("../data/sessions", () => ({
  createSession: vi.fn()
}));
vi.mock("../ui/Toast", () => ({
  useToast: () => ({ pushToast })
}));

describe("Dashboard", () => {
  it("shows empty campaign state", async () => {
    vi.mocked(useAppContext).mockReturnValue({
      campaigns: [],
      sessions: [],
      activeCampaignId: null,
      activeSessionId: null,
      setActiveCampaignId: vi.fn(),
      setActiveSessionId: vi.fn(),
      refreshCampaigns: vi.fn().mockResolvedValue(undefined),
      refreshSessions: vi.fn().mockResolvedValue(undefined)
    } as never);

    vi.mocked(listCharacters).mockResolvedValue([]);
    vi.mocked(listAiLogs).mockResolvedValue([]);

    render(<Dashboard />);

    expect(await screen.findByText("No campaigns yet.")).toBeInTheDocument();
    expect(screen.getByText("Select a campaign to view details.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Session" })).toBeDisabled();
  });

  it("creates campaigns and sessions", async () => {
    const user = userEvent.setup();
    const setActiveCampaignId = vi.fn();
    const setActiveSessionId = vi.fn();
    const refreshCampaigns = vi.fn().mockResolvedValue(undefined);
    const refreshSessions = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useAppContext).mockReturnValue({
      campaigns: [
        {
          id: "camp-1",
          name: "Campaign",
          summary: "Summary",
          createdAt: "t1",
          updatedAt: "t2"
        }
      ],
      sessions: [],
      activeCampaignId: "camp-1",
      activeSessionId: null,
      setActiveCampaignId,
      setActiveSessionId,
      refreshCampaigns,
      refreshSessions
    } as never);

    vi.mocked(listCharacters).mockResolvedValue([]);
    vi.mocked(listAiLogs).mockResolvedValue([]);
    vi.mocked(createCampaign).mockResolvedValue({
      id: "camp-new",
      name: "New Campaign",
      summary: undefined,
      createdAt: "now",
      updatedAt: "now"
    });
    vi.mocked(createSession).mockResolvedValue({
      id: "sess-new",
      campaignId: "camp-1",
      title: "Session One",
      startedAt: "now",
      createdAt: "now",
      updatedAt: "now"
    });

    render(<Dashboard />);

    await user.click(screen.getByRole("button", { name: "New Campaign" }));
    await user.type(screen.getByLabelText("Campaign Name"), "New Campaign");
    await user.click(screen.getByRole("button", { name: "Create Campaign" }));

    await waitFor(() => expect(createCampaign).toHaveBeenCalled());
    expect(refreshCampaigns).toHaveBeenCalled();
    expect(setActiveCampaignId).toHaveBeenCalledWith("camp-new");
    expect(pushToast).toHaveBeenCalledWith({ tone: "success", message: "Campaign created." });

    await user.click(screen.getByRole("button", { name: "New Session" }));
    await user.type(screen.getByLabelText("Session Title"), "Session One");
    await user.click(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => expect(createSession).toHaveBeenCalled());
    expect(refreshSessions).toHaveBeenCalledWith("camp-1");
    expect(setActiveSessionId).toHaveBeenCalledWith("sess-new");
    expect(pushToast).toHaveBeenCalledWith({ tone: "success", message: "Session created." });
  });
});
