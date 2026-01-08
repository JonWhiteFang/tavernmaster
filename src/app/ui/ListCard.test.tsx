import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ListCard from "./ListCard";

describe("ListCard", () => {
  it("renders optional sections", () => {
    render(
      <ListCard
        title="Entry"
        subtitle="Subtitle"
        status={<span>status</span>}
        footer={<div>Footer</div>}
      >
        <p>Body</p>
      </ListCard>
    );

    expect(screen.getByText("Entry")).toBeInTheDocument();
    expect(screen.getByText("Subtitle")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("omits empty sections", () => {
    const { getByText, queryByText } = render(<ListCard title="Only title" />);
    expect(getByText("Only title")).toBeInTheDocument();
    expect(queryByText("Footer")).not.toBeInTheDocument();
  });
});
