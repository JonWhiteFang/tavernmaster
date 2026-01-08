import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./Toast";

let syncCallback: ((status: string, message?: string) => void) | null = null;

vi.mock("../sync/client", () => ({
  subscribeSyncStatus: vi.fn((callback: (status: string, message?: string) => void) => {
    syncCallback = callback;
    return () => {};
  })
}));

function ToastHarness() {
  const { pushToast } = useToast();
  return (
    <button type="button" onClick={() => pushToast({ message: "Hello" })}>
      Push
    </button>
  );
}

describe("Toast", () => {
  it("shows and dismisses a toast", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: "Push" }));
    expect(screen.getByText("Hello")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Dismiss notification"));
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });

  it("pushes toasts for sync errors", () => {
    render(
      <ToastProvider>
        <div>Child</div>
      </ToastProvider>
    );

    act(() => {
      syncCallback?.("syncing", "Pushing changes...");
      syncCallback?.("error", "Sync failed");
    });

    expect(screen.getByText("Sync failed")).toBeInTheDocument();
  });
});
