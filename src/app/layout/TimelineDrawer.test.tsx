import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TimelineDrawer from "./TimelineDrawer";
import { useAppContext } from "../state/AppContext";
import { listAiLogs } from "../data/ai_logs";

vi.mock("../state/AppContext", () => ({
  useAppContext: vi.fn()
}));
vi.mock("../data/ai_logs", () => ({
  listAiLogs: vi.fn()
}));

describe("TimelineDrawer", () => {
  it("renders entries and toggles open state", async () => {
    const onOpenLogs = vi.fn();
    window.localStorage.setItem("tm.timeline.open", JSON.stringify(true));

    vi.mocked(useAppContext).mockReturnValue({
      activeCampaignId: "camp-1",
      activeSessionId: null
    } as never);

    vi.mocked(listAiLogs).mockResolvedValue([
      {
        id: "log-1",
        campaignId: "camp-1",
        sessionId: null,
        kind: "dm",
        content: "Narration",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);

    render(<TimelineDrawer onOpenLogs={onOpenLogs} />);

    expect(await screen.findByText("Open Transcripts")).toBeInTheDocument();
    expect(screen.getByText(/1 recent entries/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Transcripts" }));
    expect(onOpenLogs).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Collapse" }));

    await waitFor(() => {
      expect(screen.queryByText("Narration")).not.toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
  });
});
