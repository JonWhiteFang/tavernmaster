import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("renders with the default variant", () => {
    render(<Button>Click</Button>);
    const button = screen.getByRole("button", { name: "Click" });
    expect(button).toHaveClass("primary-button");
  });

  it("applies the variant and custom class", () => {
    render(
      <Button variant="secondary" className="extra">
        Action
      </Button>
    );
    const button = screen.getByRole("button", { name: "Action" });
    expect(button).toHaveClass("secondary-button");
    expect(button).toHaveClass("extra");
  });
});
