import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("renders with primary variant by default", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button.className).toContain("primary-button");
  });

  it("renders with secondary variant", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button", { name: "Secondary" });
    expect(button.className).toContain("secondary-button");
  });

  it("renders with ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button", { name: "Ghost" });
    expect(button.className).toContain("ghost-button");
  });

  it("passes through additional props", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Disabled
      </Button>
    );
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("merges custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole("button", { name: "Custom" });
    expect(button.className).toContain("primary-button");
    expect(button.className).toContain("custom-class");
  });
});
