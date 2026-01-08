import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppProvider, useAppContext } from "./AppContext";
import { listCampaigns } from "../data/campaigns";
import { listSessions } from "../data/sessions";

vi.mock("../data/campaigns", () => ({
  listCampaigns: vi.fn()
}));
vi.mock("../data/sessions", () => ({
  listSessions: vi.fn()
}));

function ContextView() {
  const {
    activeCampaignId,
    activeSessionId,
    campaigns,
    sessions,
    setActiveCampaignId,
    refreshSessions
  } = useAppContext();
  return (
    <div>
      <div data-testid="active-campaign">{activeCampaignId ?? "none"}</div>
      <div data-testid="active-session">{activeSessionId ?? "none"}</div>
      <div data-testid="campaign-count">{campaigns.length}</div>
      <div data-testid="session-count">{sessions.length}</div>
      <button onClick={() => setActiveCampaignId("camp-2")}>Set Campaign</button>
      <button onClick={() => refreshSessions(null)}>Clear Sessions</button>
    </div>
  );
}

describe("AppContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(listCampaigns).mockResolvedValue([]);
    vi.mocked(listSessions).mockResolvedValue([]);
  });

  it("loads stored selections when campaigns and sessions exist", async () => {
    localStorage.setItem("tm.activeCampaignId", JSON.stringify("camp-1"));
    localStorage.setItem("tm.activeSessionId", JSON.stringify("sess-1"));
    localStorage.setItem("tm.hasSelectedCampaign", JSON.stringify(true));
    localStorage.setItem("tm.hasSelectedSession", JSON.stringify(true));

    vi.mocked(listCampaigns).mockResolvedValue([
      { id: "camp-1", name: "Stormwatch", summary: "", createdAt: "now", updatedAt: "now" }
    ]);
    vi.mocked(listSessions).mockResolvedValue([
      {
        id: "sess-1",
        campaignId: "camp-1",
        title: "Session 1",
        startedAt: "now",
        endedAt: null,
        recap: null,
        createdAt: "now",
        updatedAt: "now"
      }
    ]);

    render(
      <AppProvider>
        <ContextView />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("active-campaign")).toHaveTextContent("camp-1");
      expect(screen.getByTestId("active-session")).toHaveTextContent("sess-1");
      expect(screen.getByTestId("campaign-count")).toHaveTextContent("1");
      expect(screen.getByTestId("session-count")).toHaveTextContent("1");
    });
  });

  it("clears invalid stored campaign selections", async () => {
    localStorage.setItem("tm.activeCampaignId", JSON.stringify("missing"));
    localStorage.setItem("tm.hasSelectedCampaign", JSON.stringify(true));

    render(
      <AppProvider>
        <ContextView />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("active-campaign")).toHaveTextContent("none");
      expect(screen.getByTestId("active-session")).toHaveTextContent("none");
    });
  });

  it("resets sessions when switching campaigns", async () => {
    const user = userEvent.setup();
    localStorage.setItem("tm.activeCampaignId", JSON.stringify("camp-1"));
    localStorage.setItem("tm.activeSessionId", JSON.stringify("sess-1"));
    localStorage.setItem("tm.hasSelectedCampaign", JSON.stringify(true));
    localStorage.setItem("tm.hasSelectedSession", JSON.stringify(true));

    vi.mocked(listCampaigns).mockResolvedValue([
      { id: "camp-1", name: "Stormwatch", summary: "", createdAt: "now", updatedAt: "now" },
      { id: "camp-2", name: "Sunken Vault", summary: "", createdAt: "now", updatedAt: "now" }
    ]);
    vi.mocked(listSessions).mockResolvedValue([
      {
        id: "sess-1",
        campaignId: "camp-1",
        title: "Session 1",
        startedAt: "now",
        endedAt: null,
        recap: null,
        createdAt: "now",
        updatedAt: "now"
      }
    ]);

    render(
      <AppProvider>
        <ContextView />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("active-session")).toHaveTextContent("sess-1");
    });

    await user.click(screen.getByRole("button", { name: "Set Campaign" }));
    expect(screen.getByTestId("active-campaign")).toHaveTextContent("camp-2");
    expect(screen.getByTestId("active-session")).toHaveTextContent("none");
  });

  it("clears sessions when refreshSessions is called without a campaign", async () => {
    const user = userEvent.setup();
    localStorage.setItem("tm.activeCampaignId", JSON.stringify("camp-1"));
    localStorage.setItem("tm.hasSelectedCampaign", JSON.stringify(true));

    vi.mocked(listCampaigns).mockResolvedValue([
      { id: "camp-1", name: "Stormwatch", summary: "", createdAt: "now", updatedAt: "now" }
    ]);
    vi.mocked(listSessions).mockResolvedValue([
      {
        id: "sess-1",
        campaignId: "camp-1",
        title: "Session 1",
        startedAt: "now",
        endedAt: null,
        recap: null,
        createdAt: "now",
        updatedAt: "now"
      }
    ]);

    render(
      <AppProvider>
        <ContextView />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("session-count")).toHaveTextContent("1");
    });

    await user.click(screen.getByRole("button", { name: "Clear Sessions" }));
    expect(screen.getByTestId("session-count")).toHaveTextContent("0");
  });

  it("throws when used outside the provider", () => {
    expect(() => render(<ContextView />)).toThrow("useAppContext must be used within AppProvider");
  });
});
