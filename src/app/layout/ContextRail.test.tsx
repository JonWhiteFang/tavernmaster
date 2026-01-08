import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContextRail from "./ContextRail";
import { useAppContext } from "../state/AppContext";
import { listAiLogs } from "../data/ai_logs";
import { listCharacters } from "../data/characters";
import { listJournalEntries } from "../data/journal";
import { loadEncounterRecovery } from "../data/encounter_recovery";
import { parseDiceExpression, rollDice } from "../rules/dice";
import { downloadTextFile, openPrintWindow, toFilename } from "../ui/exports";

vi.mock("../state/AppContext", () => ({
  useAppContext: vi.fn()
}));
vi.mock("../data/ai_logs", () => ({
  listAiLogs: vi.fn()
}));
vi.mock("../data/characters", () => ({
  listCharacters: vi.fn()
}));
vi.mock("../data/journal", () => ({
  listJournalEntries: vi.fn()
}));
vi.mock("../data/encounter_recovery", () => ({
  loadEncounterRecovery: vi.fn()
}));
vi.mock("../rules/dice", () => ({
  parseDiceExpression: vi.fn(),
  rollDice: vi.fn()
}));
vi.mock("../ui/exports", () => ({
  downloadTextFile: vi.fn(),
  openPrintWindow: vi.fn(),
  toFilename: vi.fn()
}));

describe("ContextRail", () => {
  it("renders dice history and log export", async () => {
    vi.mocked(useAppContext).mockReturnValue({
      activeCampaignId: "camp-1",
      activeSessionId: "sess-1",
      activeCampaign: { id: "camp-1", name: "Campaign" },
      activeSession: { id: "sess-1", title: "Session" }
    } as never);

    vi.mocked(listCharacters).mockResolvedValue([
      {
        id: "c1",
        name: "Aria",
        className: "Rogue",
        level: 3,
        hitPointMax: 20,
        hitPoints: 20,
        armorClass: 15,
        initiativeBonus: 4,
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
        campaignId: "camp-1",
        ancestry: "Elf",
        background: "Scout",
        alignment: "Neutral",
        experience: 0,
        createdAt: "now",
        updatedAt: "now",
        controlMode: "player"
      }
    ]);

    vi.mocked(listAiLogs)
      .mockResolvedValueOnce([
        {
          id: "log-1",
          campaignId: "camp-1",
          sessionId: "sess-1",
          kind: "dm",
          content: "Narration entry",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "log-2",
          campaignId: "camp-1",
          sessionId: "sess-1",
          kind: "dm",
          content: "Latest log",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);

    vi.mocked(listJournalEntries).mockResolvedValue([
      {
        id: "j1",
        campaignId: "camp-1",
        title: "Entry",
        content: "Notes",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);

    vi.mocked(parseDiceExpression).mockReturnValue({ dice: 1, sides: 20, modifier: 0 } as never);
    vi.mocked(rollDice).mockReturnValue({ rolls: [15], total: 15 } as never);
    vi.mocked(toFilename).mockReturnValue("log.md");

    render(<ContextRail activeScreen="logs" />);

    await waitFor(() => expect(listAiLogs).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    expect(screen.getByText("15", { selector: ".dice-history-total" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Export Latest Log" }));
    expect(openPrintWindow).toHaveBeenCalled();
    expect(downloadTextFile).not.toHaveBeenCalled();
  });

  it("renders encounter summary when available", async () => {
    vi.mocked(useAppContext).mockReturnValue({
      activeCampaignId: "camp-1",
      activeSessionId: "sess-1",
      activeCampaign: { id: "camp-1", name: "Campaign" },
      activeSession: { id: "sess-1", title: "Session" }
    } as never);

    vi.mocked(listCharacters).mockResolvedValue([]);
    vi.mocked(listAiLogs).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    vi.mocked(listJournalEntries).mockResolvedValue([]);
    vi.mocked(loadEncounterRecovery).mockResolvedValue({
      rulesState: {
        round: 2,
        turnOrder: ["c1"],
        activeTurnIndex: 0,
        participants: {
          c1: {
            id: "c1",
            name: "Hero",
            maxHp: 20,
            hp: 20,
            armorClass: 14,
            initiativeBonus: 2,
            speed: 30,
            abilities: {
              strength: 10,
              dexterity: 14,
              constitution: 12,
              intelligence: 10,
              wisdom: 10,
              charisma: 10
            },
            savingThrows: {},
            proficiencyBonus: 2,
            conditions: ["poisoned"]
          }
        },
        log: []
      }
    });

    render(<ContextRail activeScreen="encounter" />);

    expect(await screen.findByText("Encounter Status")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Hero")).toBeInTheDocument();
  });
});
