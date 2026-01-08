import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Topbar from "./Topbar";
import { useAppContext } from "../state/AppContext";
import { getAppSettings } from "../data/settings";
import { getSyncStatus } from "../sync/client";

let syncCallback: ((status: string, message?: string) => void) | null = null;

vi.mock("../state/AppContext", () => ({
  useAppContext: vi.fn()
}));
vi.mock("../data/settings", () => ({
  getAppSettings: vi.fn()
}));
vi.mock("../sync/client", () => ({
  getSyncStatus: vi.fn(),
  subscribeSyncStatus: vi.fn((callback: (status: string, message?: string) => void) => {
    syncCallback = callback;
    return () => {};
  })
}));

describe("Topbar", () => {
  it("renders labels and handles actions", async () => {
    const onNewJournal = vi.fn();
    const onExport = vi.fn();
    const onSearch = vi.fn();
    const setActiveCampaignId = vi.fn();
    const setActiveSessionId = vi.fn();

    vi.mocked(useAppContext).mockReturnValue({
      campaigns: [{ id: "camp-1", name: "Campaign" }],
      sessions: [{ id: "sess-1", title: "Session", campaignId: "camp-1" }],
      activeCampaignId: "camp-1",
      activeSessionId: "sess-1",
      setActiveCampaignId,
      setActiveSessionId
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

    vi.mocked(getSyncStatus).mockReturnValue({ status: "idle", message: null });

    render(<Topbar onNewJournal={onNewJournal} onExport={onExport} onSearch={onSearch} />);

    expect(await screen.findByText(/LLM: llama3 @ localhost:11434/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Campaign"), { target: { value: "camp-1" } });
    expect(setActiveCampaignId).toHaveBeenCalledWith("camp-1");

    fireEvent.change(screen.getByLabelText("Session"), { target: { value: "sess-1" } });
    expect(setActiveSessionId).toHaveBeenCalledWith("sess-1");

    fireEvent.click(screen.getByRole("button", { name: "New Journal" }));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onNewJournal).toHaveBeenCalled();
    expect(onExport).toHaveBeenCalled();
    expect(onSearch).toHaveBeenCalled();

    act(() => {
      syncCallback?.("syncing", "Pushing changes...");
    });

    expect(screen.getByText(/Sync: syncing/)).toBeInTheDocument();
  });
});
