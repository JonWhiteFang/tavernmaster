import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import MapStudio from "./MapStudio";
import { useAppContext } from "../state/AppContext";

vi.mock("../state/AppContext", () => ({
  useAppContext: vi.fn()
}));

describe("MapStudio", () => {
  it("prompts when no campaign is active", () => {
    vi.mocked(useAppContext).mockReturnValue({ activeCampaignId: null } as never);

    render(<MapStudio />);

    expect(screen.getByText("Map Studio")).toBeInTheDocument();
    expect(screen.getByText(/Create or select a campaign/)).toBeInTheDocument();
  });

  it("adds tokens and filters the list", async () => {
    const user = userEvent.setup();
    vi.mocked(useAppContext).mockReturnValue({ activeCampaignId: "camp-1" } as never);

    render(<MapStudio />);

    const nameInput = screen.getByLabelText("Token Name");
    await user.type(nameInput, "Orc");
    await user.click(screen.getByRole("button", { name: "Add Token" }));

    expect(screen.getByDisplayValue("Orc")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search"), "Riven");
    expect(screen.getByText(/Matches/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /enemy \(1\)/i }));
    expect(screen.getByText(/enemy/)).toBeInTheDocument();
  });
});
