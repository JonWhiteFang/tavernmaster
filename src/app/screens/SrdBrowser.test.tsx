import type { ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import SrdBrowser from "./SrdBrowser";
import { querySrdEntries, getSrdEntryById } from "../data/srd_queries";
import { ToastProvider } from "../ui/Toast";

vi.mock("../data/srd_queries", () => ({
  querySrdEntries: vi.fn(),
  getSrdEntryById: vi.fn()
}));

const renderWithToast = (ui: ReactElement) => render(<ToastProvider>{ui}</ToastProvider>);

describe("SrdBrowser", () => {
  beforeEach(() => {
    vi.mocked(querySrdEntries).mockResolvedValue([]);
    vi.mocked(getSrdEntryById).mockResolvedValue(null);
  });

  it("renders browser with type selector", async () => {
    renderWithToast(<SrdBrowser />);

    expect(screen.getByText("SRD Browser")).toBeInTheDocument();
    expect(screen.getByLabelText("SRD Version")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });

  it("loads entries on mount", async () => {
    vi.mocked(querySrdEntries).mockResolvedValue([
      { id: "spell-1", name: "Fireball", type: "spell", version: "5.1", data: {} }
    ]);

    renderWithToast(<SrdBrowser />);

    await waitFor(() => {
      expect(querySrdEntries).toHaveBeenCalledWith(
        expect.objectContaining({ type: "spell", version: "5.1" })
      );
    });
  });

  it("shows entry list", async () => {
    vi.mocked(querySrdEntries).mockResolvedValue([
      { id: "spell-1", name: "Fireball", type: "spell", version: "5.1", data: {} },
      { id: "spell-2", name: "Magic Missile", type: "spell", version: "5.1", data: {} }
    ]);

    renderWithToast(<SrdBrowser />);

    expect(await screen.findByText("Fireball")).toBeInTheDocument();
    expect(screen.getByText("Magic Missile")).toBeInTheDocument();
  });

  it("changes version when selector changed", async () => {
    const user = userEvent.setup();
    renderWithToast(<SrdBrowser />);

    const versionSelect = screen.getByLabelText("SRD Version");
    await user.selectOptions(versionSelect, "5.2.1");

    await waitFor(() => {
      expect(querySrdEntries).toHaveBeenCalledWith(expect.objectContaining({ version: "5.2.1" }));
    });
  });
});
