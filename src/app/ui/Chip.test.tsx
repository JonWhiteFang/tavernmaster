import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Chip from "./Chip";

describe("Chip", () => {
  it("renders with default tone", () => {
    render(<Chip>Ready</Chip>);
    const chip = screen.getByText("Ready");
    expect(chip).toHaveClass("status-chip");
    expect(chip).not.toHaveClass("status-success");
    expect(chip).not.toHaveClass("status-error");
  });

  it("renders success and error tones", () => {
    const { rerender } = render(<Chip tone="success">Ok</Chip>);
    expect(screen.getByText("Ok")).toHaveClass("status-success");

    rerender(<Chip tone="error">Fail</Chip>);
    expect(screen.getByText("Fail")).toHaveClass("status-error");
  });
});
