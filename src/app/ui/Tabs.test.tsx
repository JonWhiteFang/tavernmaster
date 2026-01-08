import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Tabs from "./Tabs";

describe("Tabs", () => {
  it("renders active tab content and switches", () => {
    const onChange = vi.fn();
    render(
      <Tabs
        items={[
          { id: "one", label: "One", content: <div>First</div> },
          { id: "two", label: "Two", badge: 3, content: <div>Second</div> }
        ]}
        activeId="one"
        onChange={onChange}
        tutorialPrefix="demo"
      />
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    const secondTab = screen.getByRole("tab", { name: /Two/ });
    expect(secondTab).toHaveAttribute("data-tutorial-id", "demo-two");

    fireEvent.click(secondTab);
    expect(onChange).toHaveBeenCalledWith("two");
  });
});
