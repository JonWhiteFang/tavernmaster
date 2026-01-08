import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AiDirector from "./AiDirector";
import { useAppContext } from "../state/AppContext";
import { listCharacters } from "../data/characters";
import { createJournalEntry } from "../data/journal";

const streamNarration = vi.fn();
const clearOutput = vi.fn();
const generate = vi.fn();
const approve = vi.fn();
const reject = vi.fn();
const approveAllSafe = vi.fn();
const pushToast = vi.fn();

vi.mock("../state/AppContext", () => ({
  useAppContext: vi.fn()
}));
vi.mock("../data/characters", () => ({
  listCharacters: vi.fn()
}));
vi.mock("../data/journal", () => ({
  createJournalEntry: vi.fn()
}));
vi.mock("../hooks/useDmNarration", () => ({
  useDmNarration: () => ({
    streamState: "idle",
    output: "Narration",
    parsedHighlights: "Highlights",
    streamNarration,
    clearOutput
  })
}));
vi.mock("../hooks/usePartyProposals", () => ({
  usePartyProposals: () => ({
    proposalState: "idle",
    proposalError: null,
    proposals: [],
    approvalCounts: { pending: 0, approved: 0, rejected: 0 },
    generate,
    approve,
    reject,
    approveAllSafe
  })
}));
vi.mock("../ui/Toast", () => ({
  useToast: () => ({ pushToast })
}));

describe("AiDirector", () => {
  it("shows prompt when no campaign is active", () => {
    vi.mocked(useAppContext).mockReturnValue({
      activeCampaignId: null,
      activeSessionId: null
    } as never);
    vi.mocked(listCharacters).mockResolvedValue([]);

    render(<AiDirector />);

    expect(screen.getByText("AI Director")).toBeInTheDocument();
    expect(screen.getByText(/Create or select a campaign/)).toBeInTheDocument();
  });

  it("streams narration and saves to journal", async () => {
    const user = userEvent.setup();
    vi.mocked(useAppContext).mockReturnValue({
      activeCampaignId: "camp-1",
      activeSessionId: "sess-1"
    } as never);

    vi.mocked(listCharacters).mockResolvedValue([
      {
        id: "char-1",
        campaignId: "camp-1",
        name: "Aria",
        className: "Rogue",
        level: 3,
        experience: 0,
        ancestry: "Elf",
        background: "Scout",
        alignment: "Neutral",
        hitPointMax: 20,
        hitPoints: 20,
        armorClass: 15,
        initiativeBonus: 3,
        speed: 30,
        abilities: {
          strength: 10,
          dexterity: 16,
          constitution: 12,
          intelligence: 14,
          wisdom: 10,
          charisma: 12
        },
        proficiencies: [],
        ancestryBonus: [],
        inventory: [],
        spells: [],
        createdAt: "now",
        updatedAt: "now",
        controlMode: "ai"
      }
    ]);

    vi.mocked(createJournalEntry).mockResolvedValue({
      id: "entry-1",
      campaignId: "camp-1",
      title: "Narration",
      content: "Highlights",
      createdAt: "now",
      updatedAt: "now"
    });

    render(<AiDirector />);

    await user.click(screen.getByRole("button", { name: /Stream Narration/ }));
    expect(streamNarration).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Generate Proposals" }));
    expect(generate).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Copy to Journal" }));

    await waitFor(() => expect(createJournalEntry).toHaveBeenCalled());
    expect(pushToast).toHaveBeenCalledWith({ tone: "success", message: "Narration copied to Journal." });
  });
});
