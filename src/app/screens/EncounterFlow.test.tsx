import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EncounterFlow from "./EncounterFlow";
import { useAppContext } from "../state/AppContext";
import { listCharacters } from "../data/characters";
import {
  clearEncounterRecovery,
  loadEncounterRecovery,
  saveEncounterRecovery
} from "../data/encounter_recovery";
import { advanceTurn, buildTurnOrder, rollInitiative, startEncounter } from "../rules/initiative";
import { applyEffects } from "../rules/effects";
import { createSeededRng } from "../rules/rng";
import { resolveAction } from "../rules/actions";

vi.mock("../state/AppContext", () => ({
  useAppContext: vi.fn()
}));
vi.mock("../data/characters", () => ({
  listCharacters: vi.fn()
}));
vi.mock("../data/encounter_recovery", () => ({
  clearEncounterRecovery: vi.fn(),
  loadEncounterRecovery: vi.fn(),
  saveEncounterRecovery: vi.fn()
}));
vi.mock("../rules/initiative", () => ({
  advanceTurn: vi.fn(),
  buildTurnOrder: vi.fn(),
  rollInitiative: vi.fn(),
  startEncounter: vi.fn()
}));
vi.mock("../rules/effects", () => ({
  applyEffects: vi.fn()
}));
vi.mock("../rules/rng", () => ({
  createSeededRng: vi.fn()
}));
vi.mock("../rules/actions", () => ({
  resolveAction: vi.fn()
}));

describe("EncounterFlow", () => {
  it("shows prompt when no campaign is active", () => {
    vi.mocked(useAppContext).mockReturnValue({ activeCampaignId: null } as never);
    vi.mocked(listCharacters).mockResolvedValue([]);
    vi.mocked(loadEncounterRecovery).mockResolvedValue(null);

    render(<EncounterFlow />);

    expect(screen.getByText("Encounter Flow")).toBeInTheDocument();
    expect(screen.getByText(/Create or select a campaign/)).toBeInTheDocument();
  });

  it("shows empty state when there are no characters", async () => {
    vi.mocked(useAppContext).mockReturnValue({ activeCampaignId: "camp-1" } as never);
    vi.mocked(loadEncounterRecovery).mockResolvedValue(null);
    vi.mocked(listCharacters).mockResolvedValue([]);

    render(<EncounterFlow />);

    expect(
      await screen.findByText("Create party members to start initiative tracking and combat turns.")
    ).toBeInTheDocument();
  });

  it("rolls initiative when active", async () => {
    const user = userEvent.setup();
    vi.mocked(useAppContext).mockReturnValue({ activeCampaignId: "camp-1" } as never);
    vi.mocked(loadEncounterRecovery).mockResolvedValue(null);
    vi.mocked(saveEncounterRecovery).mockResolvedValue();
    vi.mocked(clearEncounterRecovery).mockResolvedValue();

    vi.mocked(listCharacters).mockResolvedValue([
      {
        id: "c1",
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
        controlMode: "player"
      },
      {
        id: "c2",
        campaignId: "camp-1",
        name: "Borin",
        className: "Fighter",
        level: 3,
        experience: 0,
        ancestry: "Dwarf",
        background: "Soldier",
        alignment: "Neutral",
        hitPointMax: 24,
        hitPoints: 24,
        armorClass: 16,
        initiativeBonus: 1,
        speed: 25,
        abilities: {
          strength: 14,
          dexterity: 12,
          constitution: 13,
          intelligence: 10,
          wisdom: 10,
          charisma: 8
        },
        proficiencies: [],
        ancestryBonus: [],
        inventory: [],
        spells: [],
        createdAt: "now",
        updatedAt: "now",
        controlMode: "player"
      }
    ]);

    vi.mocked(createSeededRng).mockReturnValue({});
    vi.mocked(rollInitiative).mockReturnValue([
      { participantId: "c1", total: 12 },
      { participantId: "c2", total: 9 }
    ]);
    vi.mocked(buildTurnOrder).mockReturnValue(["c1", "c2"]);
    vi.mocked(startEncounter).mockReturnValue({ state: null, rolls: [] } as never);
    vi.mocked(advanceTurn).mockReturnValue({} as never);
    vi.mocked(resolveAction).mockReturnValue({ ok: false, log: [], effects: [] } as never);
    vi.mocked(applyEffects).mockReturnValue({} as never);

    render(<EncounterFlow />);

    await screen.findByText("Initiative & Turn Order");

    await user.click(screen.getByRole("button", { name: "Roll Initiative" }));

    expect(rollInitiative).toHaveBeenCalled();
    expect(buildTurnOrder).toHaveBeenCalled();
  });
});
