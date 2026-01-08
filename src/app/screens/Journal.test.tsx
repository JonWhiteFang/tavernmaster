import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Journal from "./Journal";
import { useAppContext } from "../state/AppContext";
import { createJournalEntry, listJournalEntries } from "../data/journal";
import { listAiLogs } from "../data/ai_logs";

const pushToast = vi.fn();

vi.mock("../state/AppContext", () => ({
  useAppContext: vi.fn()
}));
vi.mock("../data/journal", () => ({
  createJournalEntry: vi.fn(),
  listJournalEntries: vi.fn(),
  updateJournalEntry: vi.fn()
}));
vi.mock("../data/ai_logs", () => ({
  listAiLogs: vi.fn()
}));
vi.mock("../ui/Toast", () => ({
  useToast: () => ({ pushToast })
}));

describe("Journal", () => {
  it("shows prompt when no campaign is active", () => {
    vi.mocked(useAppContext).mockReturnValue({
      activeCampaignId: null,
      activeSessionId: null
    } as never);

    render(<Journal />);

    expect(screen.getByText("Journal")).toBeInTheDocument();
    expect(screen.getByText(/Create or select a campaign/)).toBeInTheDocument();
  });

  it("creates a new entry", async () => {
    const user = userEvent.setup();
    vi.mocked(useAppContext).mockReturnValue({
      activeCampaignId: "camp-1",
      activeSessionId: "sess-1"
    } as never);

    vi.mocked(listJournalEntries).mockResolvedValue([]);
    vi.mocked(createJournalEntry).mockResolvedValue({
      id: "entry-1",
      campaignId: "camp-1",
      title: "Recap",
      content: "Notes",
      createdAt: "now",
      updatedAt: "now"
    });

    render(<Journal />);

    await user.click(screen.getByRole("button", { name: "New Entry" }));
    await user.type(screen.getByLabelText("Title"), "Recap");
    await user.type(screen.getByLabelText("Notes"), "Notes");
    await user.click(screen.getByRole("button", { name: "Save Entry" }));

    await waitFor(() => expect(createJournalEntry).toHaveBeenCalled());
    expect(createJournalEntry).toHaveBeenCalledWith({
      campaignId: "camp-1",
      title: "Recap",
      content: "Notes"
    });
    expect(pushToast).toHaveBeenCalledWith({ tone: "success", message: "Entry created." });
  });

  it("imports narration into a new entry", async () => {
    const user = userEvent.setup();
    vi.mocked(useAppContext).mockReturnValue({
      activeCampaignId: "camp-1",
      activeSessionId: "sess-1"
    } as never);

    vi.mocked(listJournalEntries).mockResolvedValue([]);
    vi.mocked(listAiLogs).mockResolvedValue([
      {
        id: "log-1",
        campaignId: "camp-1",
        sessionId: "sess-1",
        kind: "dm",
        content: "Narration",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
    vi.mocked(createJournalEntry).mockResolvedValue({
      id: "entry-2",
      campaignId: "camp-1",
      title: "Narration",
      content: "Narration",
      createdAt: "now",
      updatedAt: "now"
    });

    render(<Journal />);

    await user.click(screen.getByRole("button", { name: "Import Latest Narration" }));

    await waitFor(() => expect(createJournalEntry).toHaveBeenCalled());
    expect(pushToast).toHaveBeenCalledWith({ tone: "success", message: "Narration imported." });
  });
});
