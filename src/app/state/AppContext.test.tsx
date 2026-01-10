import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppProvider, useAppContext } from "./AppContext";
import { listCampaigns } from "../data/campaigns";
import { listSessions } from "../data/sessions";
import { listEncounters } from "../data/encounters";
import { getUiState, setUiState, migrateLocalStorageToUiState } from "../data/ui_state";

vi.mock("../data/campaigns", () => ({ listCampaigns: vi.fn() }));
vi.mock("../data/sessions", () => ({ listSessions: vi.fn() }));
vi.mock("../data/encounters", () => ({ listEncounters: vi.fn() }));
vi.mock("../data/ui_state", () => ({
  getUiState: vi.fn(),
  setUiState: vi.fn(),
  migrateLocalStorageToUiState: vi.fn()
}));

function ContextView() {
  const {
    activeCampaignId,
    activeSessionId,
    activeEncounterId,
    campaigns,
    sessions,
    encounters,
    setActiveCampaignId,
    setActiveSessionId,
    setActiveEncounterId
  } = useAppContext();
  return (
    <div>
      <div data-testid="active-campaign">{activeCampaignId ?? "none"}</div>
      <div data-testid="active-session">{activeSessionId ?? "none"}</div>
      <div data-testid="active-encounter">{activeEncounterId ?? "none"}</div>
      <div data-testid="campaign-count">{campaigns.length}</div>
      <div data-testid="session-count">{sessions.length}</div>
      <div data-testid="encounter-count">{encounters.length}</div>
      <button onClick={() => setActiveCampaignId("camp-2")}>Set Campaign</button>
      <button onClick={() => setActiveSessionId("sess-2")}>Set Session</button>
      <button onClick={() => setActiveEncounterId("enc-1")}>Set Encounter</button>
    </div>
  );
}

describe("AppContext", () => {
  beforeEach(() => {
    vi.mocked(listCampaigns).mockResolvedValue([]);
    vi.mocked(listSessions).mockResolvedValue([]);
    vi.mocked(listEncounters).mockResolvedValue([]);
    vi.mocked(getUiState).mockResolvedValue({
      activeCampaignId: null,
      activeSessionId: null,
      activeEncounterId: null
    });
    vi.mocked(setUiState).mockResolvedValue();
    vi.mocked(migrateLocalStorageToUiState).mockResolvedValue(null);
  });

  it("loads stored selections when campaigns, sessions, and encounters exist", async () => {
    vi.mocked(getUiState).mockResolvedValue({
      activeCampaignId: "camp-1",
      activeSessionId: "sess-1",
      activeEncounterId: "enc-1"
    });
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
    vi.mocked(listEncounters).mockResolvedValue([
      {
        id: "enc-1",
        campaignId: "camp-1",
        name: "Goblin Ambush",
        environment: "",
        difficulty: "medium",
        round: 1,
        initiativeOrder: [],
        conditions: []
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
      expect(screen.getByTestId("active-encounter")).toHaveTextContent("enc-1");
    });
  });

  it("clears invalid stored campaign selections", async () => {
    vi.mocked(getUiState).mockResolvedValue({
      activeCampaignId: "missing",
      activeSessionId: null,
      activeEncounterId: null
    });

    render(
      <AppProvider>
        <ContextView />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("active-campaign")).toHaveTextContent("none");
    });
    expect(setUiState).toHaveBeenCalledWith({
      activeCampaignId: null,
      activeSessionId: null,
      activeEncounterId: null
    });
  });

  it("resets session and encounter when switching campaigns", async () => {
    const user = userEvent.setup();
    vi.mocked(getUiState).mockResolvedValue({
      activeCampaignId: "camp-1",
      activeSessionId: "sess-1",
      activeEncounterId: "enc-1"
    });
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
    vi.mocked(listEncounters).mockResolvedValue([
      {
        id: "enc-1",
        campaignId: "camp-1",
        name: "Goblin Ambush",
        environment: "",
        difficulty: "medium",
        round: 1,
        initiativeOrder: [],
        conditions: []
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

    await waitFor(() => {
      expect(screen.getByTestId("active-campaign")).toHaveTextContent("camp-2");
      expect(screen.getByTestId("active-session")).toHaveTextContent("none");
      expect(screen.getByTestId("active-encounter")).toHaveTextContent("none");
    });
  });

  it("resets encounter when switching sessions", async () => {
    const user = userEvent.setup();
    vi.mocked(getUiState).mockResolvedValue({
      activeCampaignId: "camp-1",
      activeSessionId: "sess-1",
      activeEncounterId: "enc-1"
    });
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
    vi.mocked(listEncounters).mockResolvedValue([
      {
        id: "enc-1",
        campaignId: "camp-1",
        name: "Goblin Ambush",
        environment: "",
        difficulty: "medium",
        round: 1,
        initiativeOrder: [],
        conditions: []
      }
    ]);

    render(
      <AppProvider>
        <ContextView />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("active-encounter")).toHaveTextContent("enc-1");
    });

    await user.click(screen.getByRole("button", { name: "Set Session" }));

    await waitFor(() => {
      expect(screen.getByTestId("active-session")).toHaveTextContent("sess-2");
      expect(screen.getByTestId("active-encounter")).toHaveTextContent("none");
    });
  });

  it("throws when used outside the provider", () => {
    expect(() => render(<ContextView />)).toThrow("useAppContext must be used within AppProvider");
  });
});
