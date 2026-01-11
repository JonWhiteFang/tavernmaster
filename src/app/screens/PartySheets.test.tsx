import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PartySheets from "./PartySheets";
import { listCharacters } from "../data/characters";
import { querySrd } from "../data/srd_queries";
import { AppProvider } from "../state/AppContext";

vi.mock("../data/characters", () => ({
  listCharacters: vi.fn(),
  createCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn()
}));
vi.mock("../data/srd_queries", () => ({
  querySrd: vi.fn()
}));
vi.mock("../data/campaigns", () => ({
  listCampaigns: vi.fn().mockResolvedValue([])
}));
vi.mock("../data/sessions", () => ({
  listSessions: vi.fn().mockResolvedValue([])
}));
vi.mock("../data/encounters", () => ({
  listEncounters: vi.fn().mockResolvedValue([])
}));
vi.mock("../data/ui_state", () => ({
  getUiState: vi.fn().mockResolvedValue({}),
  setUiState: vi.fn(),
  migrateLocalStorageToUiState: vi.fn()
}));

describe("PartySheets", () => {
  it("shows empty roster and enters create mode", async () => {
    const user = userEvent.setup();
    vi.mocked(listCharacters).mockResolvedValue([]);
    vi.mocked(querySrd).mockResolvedValue([]);

    render(
      <AppProvider>
        <PartySheets />
      </AppProvider>
    );

    expect(
      await screen.findByText("No characters yet. Create a party member to begin.")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Manual" }));

    expect(screen.getByText("New Character")).toBeInTheDocument();
  });
});
