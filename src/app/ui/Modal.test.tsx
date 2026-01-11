import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "./Modal";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal isOpen={false} title="Test" onClose={vi.fn()}>
        Content
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when open", () => {
    render(
      <Modal isOpen={true} title="Test Modal" onClose={vi.fn()}>
        Modal content
      </Modal>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(
      <Modal isOpen={true} title="Title" subtitle="Subtitle text" onClose={vi.fn()}>
        Content
      </Modal>
    );
    expect(screen.getByText("Subtitle text")).toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    render(
      <Modal isOpen={true} title="Title" onClose={vi.fn()} footer={<button>Save</button>}>
        Content
      </Modal>
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} title="Title" onClose={onClose}>
        Content
      </Modal>
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when overlay clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} title="Title" onClose={onClose}>
        Content
      </Modal>
    );
    fireEvent.click(screen.getByRole("presentation"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when modal content clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} title="Title" onClose={onClose}>
        Content
      </Modal>
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} title="Title" onClose={onClose}>
        Content
      </Modal>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has correct aria attributes", () => {
    render(
      <Modal isOpen={true} title="Accessible Modal" subtitle="Description" onClose={vi.fn()}>
        Content
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAttribute("aria-describedby");
  });
});
