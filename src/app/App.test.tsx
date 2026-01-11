import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const { initializeData, initializeSync } = vi.hoisted(() => ({
  initializeData: vi.fn(),
  initializeSync: vi.fn()
}));
const hotkeyBindings: Array<{ key: string; handler: () => void }> = [];

vi.mock("./data/init", () => ({
  initializeData
}));
vi.mock("./sync/client", () => ({
  initializeSync
}));
vi.mock("./state/AppContext", () => ({
  AppProvider: ({ children }: { children: ReactNode }) => <>{children}</>
}));
vi.mock("./ui/Toast", () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>
}));
vi.mock("./ui/Tutorial", () => ({
  TutorialProvider: ({ children }: { children: ReactNode }) => <>{children}</>
}));
vi.mock("./hooks/useHotkeys", () => ({
  useHotkeys: (bindings: Array<{ key: string; handler: () => void }>) => {
    hotkeyBindings.splice(0, hotkeyBindings.length, ...bindings);
  }
}));
vi.mock("./layout/Topbar", () => ({
  default: ({
    onNewJournal,
    onExport,
    onSearch
  }: {
    onNewJournal: () => void;
    onExport: () => void;
    onSearch: () => void;
  }) => (
    <div>
      <button onClick={onNewJournal}>New Journal</button>
      <button onClick={onExport}>Export</button>
      <button onClick={onSearch}>Search</button>
    </div>
  )
}));
vi.mock("./layout/SidebarNav", () => ({
  default: ({
    onNavigate,
    activeScreen
  }: {
    onNavigate: (screen: string) => void;
    activeScreen: string;
  }) => (
    <div>
      <div data-testid="active-screen">{activeScreen}</div>
      <button onClick={() => onNavigate("settings")}>Go Settings</button>
      <button onClick={() => onNavigate("dashboard")}>Go Dashboard</button>
    </div>
  )
}));
vi.mock("./layout/ContextRail", () => ({
  default: ({ activeScreen }: { activeScreen: string }) => (
    <div data-testid="context-rail">{activeScreen}</div>
  )
}));
vi.mock("./layout/TimelineDrawer", () => ({
  default: ({ onOpenLogs }: { onOpenLogs: () => void }) => (
    <button onClick={onOpenLogs}>Open Logs</button>
  )
}));

vi.mock("./screens/PlayWorkspace", () => ({
  default: () => <div>Play Workspace Screen</div>
}));
vi.mock("./screens/Settings", () => ({
  default: () => <div>Settings Screen</div>
}));
vi.mock("./screens/LogsExports", () => ({
  default: () => <div>Logs Screen</div>
}));
vi.mock("./screens/Journal", () => ({
  default: () => <div>Journal Screen</div>
}));
vi.mock("./screens/EncounterFlow", () => ({
  default: () => <div>Encounter Screen</div>
}));
vi.mock("./screens/PartySheets", () => ({
  default: () => <div>Party Screen</div>
}));
vi.mock("./screens/AiDirector", () => ({
  default: () => <div>Director Screen</div>
}));
vi.mock("./screens/MapStudio", () => ({
  default: () => <div>Map Screen</div>
}));
vi.mock("./screens/Dashboard", () => ({
  default: ({ onResumePlay }: { onResumePlay: () => void }) => (
    <button onClick={onResumePlay}>Dashboard Screen</button>
  )
}));
vi.mock("./screens/TitleScreen", () => ({
  default: ({
    onNewCampaign,
    onContinue,
    onSettings,
    onExit
  }: {
    onNewCampaign: () => void;
    onContinue: () => void;
    onSettings: () => void;
    onExit: () => void;
  }) => (
    <div>
      <div>Title Screen</div>
      <button onClick={onContinue}>Continue</button>
      <button onClick={onNewCampaign}>New Campaign</button>
      <button onClick={onSettings}>Settings</button>
      <button onClick={onExit}>Exit</button>
    </div>
  )
}));

describe("App", () => {
  beforeEach(() => {
    initializeData.mockResolvedValue(undefined);
    initializeSync.mockResolvedValue(undefined);
    hotkeyBindings.length = 0;
    vi.clearAllMocks();
  });

  it("initializes data and sync on mount", async () => {
    render(<App />);

    await waitFor(() => {
      expect(initializeData).toHaveBeenCalledTimes(1);
      expect(initializeSync).toHaveBeenCalledTimes(1);
    });
  });

  it("shows title screen first and navigates to main app", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText("Title Screen")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Play Workspace Screen")).toBeInTheDocument();
  });

  it("navigates via app chrome and hides the context rail in settings", async () => {
    const user = userEvent.setup();
    render(<App />);

    // First exit title screen
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Play Workspace Screen")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Go Settings" }));
    expect(screen.getByText("Settings Screen")).toBeInTheDocument();
    expect(screen.queryByTestId("context-rail")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByText("Logs Screen")).toBeInTheDocument();
    expect(screen.getByTestId("context-rail")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Logs" }));
    expect(screen.getByText("Logs Screen")).toBeInTheDocument();
  });

  it("responds to navigation events", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Exit title screen first
    await user.click(screen.getByRole("button", { name: "Continue" }));

    window.dispatchEvent(new window.CustomEvent("tm.navigate", { detail: { screen: "journal" } }));

    return waitFor(() => {
      expect(screen.getByText("Journal Screen")).toBeInTheDocument();
    });
  });

  it("handles hotkey navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Exit title screen first
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const binding = hotkeyBindings.find((entry) => entry.key === "2");
    expect(binding).toBeDefined();
    binding?.handler();

    await waitFor(() => {
      expect(screen.getByText("Dashboard Screen")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Dashboard Screen" }));
    expect(screen.getByText("Play Workspace Screen")).toBeInTheDocument();
  });

  it("logs initialization errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("boom");
    initializeData.mockRejectedValueOnce(error);

    render(<App />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Failed to initialize app data", error);
    });

    consoleSpy.mockRestore();
  });
});
