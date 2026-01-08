import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Panel from "./Panel";

describe("Panel", () => {
  it("renders title and subtitle", () => {
    render(
      <Panel title="Header" subtitle="Subtitle">
        <div>Content</div>
      </Panel>
    );

    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Subtitle")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("applies delay style when provided", () => {
    const { container } = render(
      <Panel title="Delayed" delay={120}>
        <div>Content</div>
      </Panel>
    );
    const section = container.querySelector("section");
    expect(section).toHaveStyle("--delay: 120ms");
  });
});
