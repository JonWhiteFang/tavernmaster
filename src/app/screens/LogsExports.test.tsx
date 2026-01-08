import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LogsExports from "./LogsExports";
import { useAppContext } from "../state/AppContext";
import { listAiLogs } from "../data/ai_logs";
import { downloadTextFile, openPrintWindow, toFilename } from "../ui/exports";

const pushToast = vi.fn();

vi.mock("../state/AppContext", () => ({
  useAppContext: vi.fn()
}));
vi.mock("../data/ai_logs", () => ({
  listAiLogs: vi.fn()
}));
vi.mock("../ui/exports", () => ({
  downloadTextFile: vi.fn(),
  openPrintWindow: vi.fn(),
  toFilename: vi.fn()
}));
vi.mock("../ui/Toast", () => ({
  useToast: () => ({ pushToast })
}));

describe("LogsExports", () => {
  it("shows prompt when no campaign is active", () => {
    vi.mocked(useAppContext).mockReturnValue({
      activeCampaignId: null,
      activeSessionId: null
    } as never);

    render(<LogsExports />);

    expect(screen.getByText("Logs & Exports")).toBeInTheDocument();
    expect(screen.getByText(/Create or select a campaign/)).toBeInTheDocument();
  });

  it("exports a session transcript", async () => {
    const user = userEvent.setup();
    vi.mocked(useAppContext).mockReturnValue({
      activeCampaignId: "camp-1",
      activeSessionId: "sess-1"
    } as never);

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

    vi.mocked(toFilename).mockReturnValue("session-transcript.md");

    render(<LogsExports />);

    await screen.findByText("Transcript Feed");

    await user.click(screen.getByRole("button", { name: /Export Session Transcript/ }));

    await waitFor(() => expect(downloadTextFile).toHaveBeenCalled());
    expect(openPrintWindow).not.toHaveBeenCalled();
    expect(pushToast).toHaveBeenCalledWith({ tone: "success", message: "Transcript exported." });
  });
});
