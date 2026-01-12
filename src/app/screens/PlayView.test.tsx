import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockAppContext = { activeCampaignId: "camp-1" };

vi.mock("../state/AppContext", () => ({
  useAppContext: () => mockAppContext
}));

vi.mock("../engine/state/store", () => ({
  loadCampaignState: vi.fn().mockResolvedValue({
    version: 1,
    scene: "The tavern",
    mode: "exploration",
    turnCount: 5,
    quests: [{ id: "q1", name: "Find artifact", status: "active" }]
  })
}));

vi.mock("../engine/turns/turnStore", () => ({
  listTurns: vi
    .fn()
    .mockResolvedValue([
      { id: "t1", playerInput: "I look around", aiOutput: "You see a dimly lit room." }
    ])
}));

vi.mock("../engine/memory/canonStore", () => ({
  getCanonSummary: vi.fn().mockResolvedValue({ longSummary: "A hero's tale" })
}));

vi.mock("../engine/ai/turnOrchestrator", () => ({
  orchestrateTurn: vi.fn()
}));

vi.mock("../engine/apply/applyTurn", () => ({
  applyTurn: vi.fn()
}));

vi.mock("../data/settings", () => ({
  getLlmConfig: vi
    .fn()
    .mockResolvedValue({ baseUrl: "http://localhost", model: "test", temperature: 0.7 })
}));

describe("PlayView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppContext.activeCampaignId = "camp-1";
  });

  it("renders scene and status", async () => {
    const PlayView = (await import("./PlayView")).default;
    render(<PlayView />);

    expect(await screen.findByText("The tavern")).toBeInTheDocument();
    expect(screen.getByText(/Mode: exploration/)).toBeInTheDocument();
    expect(screen.getByText(/Turn: 5/)).toBeInTheDocument();
  });

  it("shows message when no campaign selected", async () => {
    mockAppContext.activeCampaignId = "";
    const PlayView = (await import("./PlayView")).default;
    render(<PlayView />);

    expect(screen.getByText(/Select a campaign/)).toBeInTheDocument();
  });

  it("renders custom action input", async () => {
    const PlayView = (await import("./PlayView")).default;
    render(<PlayView />);

    const input = await screen.findByPlaceholderText(/type your own action/i);
    expect(input).toBeInTheDocument();
  });

  it("has timeline toggle", async () => {
    const PlayView = (await import("./PlayView")).default;
    render(<PlayView />);

    const toggle = await screen.findByText(/Show Timeline/);
    expect(toggle).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByText(/Hide Timeline/)).toBeInTheDocument();
  });
});
