import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TitleScreen from "./TitleScreen";
import { listCampaigns } from "../data/campaigns";

vi.mock("../data/campaigns", () => ({
  listCampaigns: vi.fn()
}));

describe("TitleScreen", () => {
  it("renders title and tagline", () => {
    vi.mocked(listCampaigns).mockResolvedValue([]);
    render(
      <TitleScreen
        onNewCampaign={vi.fn()}
        onContinue={vi.fn()}
        onSettings={vi.fn()}
        onExit={vi.fn()}
      />
    );

    expect(screen.getByText("Tavern Master")).toBeInTheDocument();
    expect(screen.getByText(/Solo D&D 5e/)).toBeInTheDocument();
  });

  it("disables continue when no campaigns", async () => {
    vi.mocked(listCampaigns).mockResolvedValue([]);
    render(
      <TitleScreen
        onNewCampaign={vi.fn()}
        onContinue={vi.fn()}
        onSettings={vi.fn()}
        onExit={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continue Campaign" })).toBeDisabled();
    });
  });

  it("enables continue when campaigns exist", async () => {
    vi.mocked(listCampaigns).mockResolvedValue([
      { id: "1", name: "Test", rulesetVersion: "5.1", createdAt: "", updatedAt: "" }
    ]);
    render(
      <TitleScreen
        onNewCampaign={vi.fn()}
        onContinue={vi.fn()}
        onSettings={vi.fn()}
        onExit={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continue Campaign" })).not.toBeDisabled();
    });
  });

  it("calls onNewCampaign when button clicked", () => {
    vi.mocked(listCampaigns).mockResolvedValue([]);
    const onNewCampaign = vi.fn();
    render(
      <TitleScreen
        onNewCampaign={onNewCampaign}
        onContinue={vi.fn()}
        onSettings={vi.fn()}
        onExit={vi.fn()}
      />
    );

    screen.getByRole("button", { name: "New Campaign" }).click();
    expect(onNewCampaign).toHaveBeenCalled();
  });
});
