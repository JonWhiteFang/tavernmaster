import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "./Modal";

describe("Modal", () => {
  it("returns null when closed", () => {
    render(
      <Modal isOpen={false} title="Title" onClose={() => {}}>
        Body
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders content and closes on overlay click and escape", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen title="Title" subtitle="Subtitle" onClose={onClose} footer={<div>Footer</div>}>
        Body
      </Modal>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Subtitle")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    const overlay = dialog.parentElement;
    expect(overlay).toBeTruthy();
    if (overlay) {
      fireEvent.click(overlay);
    }
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
