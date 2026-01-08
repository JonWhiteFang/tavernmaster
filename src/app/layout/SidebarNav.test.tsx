import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SidebarNav from "./SidebarNav";

describe("SidebarNav", () => {
  it("renders sections and navigates", () => {
    const onNavigate = vi.fn();
    render(
      <SidebarNav
        sections={[
          { title: "Play", items: [{ id: "play", label: "Play" }] },
          { title: "System", items: [{ id: "settings", label: "Settings" }] }
        ]}
        activeScreen="play"
        onNavigate={onNavigate}
      />
    );

    const playButton = screen.getByRole("button", { name: "Play" });
    const settingsButton = screen.getByRole("button", { name: "Settings" });

    expect(playButton).toHaveClass("is-active");
    expect(playButton).toHaveAttribute("aria-current", "page");

    fireEvent.click(settingsButton);
    expect(onNavigate).toHaveBeenCalledWith("settings");
  });
});
