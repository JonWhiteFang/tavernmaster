import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PartySheets from "./PartySheets";
import { listCharacters } from "../data/characters";
import { querySrd } from "../data/srd_queries";

vi.mock("../data/characters", () => ({
  listCharacters: vi.fn(),
  createCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  deleteCharacter: vi.fn()
}));
vi.mock("../data/srd_queries", () => ({
  querySrd: vi.fn()
}));

describe("PartySheets", () => {
  it("shows empty roster and enters create mode", async () => {
    const user = userEvent.setup();
    vi.mocked(listCharacters).mockResolvedValue([]);
    vi.mocked(querySrd).mockResolvedValue([]);

    render(<PartySheets />);

    expect(await screen.findByText("No characters yet. Create a party member to begin.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create Character" }));

    expect(screen.getByText("New Character")).toBeInTheDocument();
  });
});
