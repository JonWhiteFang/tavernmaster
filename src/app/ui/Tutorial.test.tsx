import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TutorialProvider, useTutorial } from "./Tutorial";

vi.mock("../tutorial/steps", () => ({
  tutorialSteps: [
    {
      id: "intro",
      title: "Intro",
      body: "Welcome",
      targetId: "demo-target"
    },
    {
      id: "second",
      title: "Second",
      body: "Next step"
    }
  ],
  tutorialVersion: "test"
}));

function TutorialHarness() {
  const { status } = useTutorial();
  return <div>Status: {status}</div>;
}

describe("Tutorial", () => {
  it("auto-starts and advances steps", async () => {
    const user = userEvent.setup();
    render(
      <TutorialProvider>
        <div data-tutorial-id="demo-target">Target</div>
        <TutorialHarness />
      </TutorialProvider>
    );

    expect(screen.getByText("Intro")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish" })).toBeInTheDocument();
  });

  it("pauses on Escape", () => {
    const { getByText } = render(
      <TutorialProvider>
        <div data-tutorial-id="demo-target">Target</div>
        <TutorialHarness />
      </TutorialProvider>
    );

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(getByText("Status: paused")).toBeInTheDocument();
  });

  it("throws outside provider", () => {
    expect(() => render(<TutorialHarness />)).toThrow(
      "useTutorial must be used within TutorialProvider"
    );
  });
});
