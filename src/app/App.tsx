import { useEffect, useMemo, useState } from "react";
import { initializeData } from "./data/init";
import { initializeSync } from "./sync/client";
import Dashboard from "./screens/Dashboard";
import AiDirector from "./screens/AiDirector";
import EncounterFlow from "./screens/EncounterFlow";
import PlayWorkspace from "./screens/PlayWorkspace";
import Journal from "./screens/Journal";
import MapStudio from "./screens/MapStudio";
import LogsExports from "./screens/LogsExports";
import PartySheets from "./screens/PartySheets";
import Settings from "./screens/Settings";
import { AppProvider } from "./state/AppContext";
import Topbar from "./layout/Topbar";
import SidebarNav from "./layout/SidebarNav";
import { useHotkeys } from "./hooks/useHotkeys";
import ContextRail from "./layout/ContextRail";
import TimelineDrawer from "./layout/TimelineDrawer";
import { ToastProvider } from "./ui/Toast";

type ScreenKey =
  | "play"
  | "dashboard"
  | "encounter"
  | "party"
  | "map"
  | "journal"
  | "director"
  | "logs"
  | "settings";

const screens: ScreenKey[] = [
  "play",
  "dashboard",
  "encounter",
  "party",
  "map",
  "journal",
  "director",
  "logs",
  "settings"
];

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AppProvider>
  );
}

function AppShell() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("play");
  const navSections = useMemo(
    () => [
      {
        title: "PLAY",
        items: [
          { id: "play" as const, label: "Play Workspace" },
          { id: "dashboard" as const, label: "Campaigns & Sessions" },
          { id: "encounter" as const, label: "Encounter" },
          { id: "map" as const, label: "Map" },
          { id: "journal" as const, label: "Journal" },
          { id: "director" as const, label: "AI Director" }
        ]
      },
      {
        title: "REFERENCE",
        items: [{ id: "party" as const, label: "Party" }]
      },
      {
        title: "SYSTEM",
        items: [
          { id: "logs" as const, label: "Transcripts & Exports" },
          { id: "settings" as const, label: "Settings" }
        ]
      }
    ],
    []
  );

  useHotkeys([
    { key: "1", meta: true, handler: () => setActiveScreen("play") },
    { key: "2", meta: true, handler: () => setActiveScreen("dashboard") },
    { key: "3", meta: true, handler: () => setActiveScreen("encounter") },
    { key: "4", meta: true, handler: () => setActiveScreen("map") },
    { key: "5", meta: true, handler: () => setActiveScreen("journal") },
    { key: "6", meta: true, handler: () => setActiveScreen("director") },
    { key: "7", meta: true, handler: () => setActiveScreen("logs") },
    { key: "8", meta: true, handler: () => setActiveScreen("party") },
    { key: "9", meta: true, handler: () => setActiveScreen("settings") }
  ]);

  useEffect(() => {
    void (async () => {
      try {
        await initializeData();
        await initializeSync();
      } catch (error) {
        console.error("Failed to initialize app data", error);
      }
    })();
  }, []);

  useEffect(() => {
    const handleNavigate = (event: globalThis.Event) => {
      const detail = (event as globalThis.CustomEvent<{ screen?: string }>).detail;
      if (!detail?.screen) {
        return;
      }
      if (screens.includes(detail.screen as ScreenKey)) {
        setActiveScreen(detail.screen as ScreenKey);
      }
    };
    window.addEventListener("tm.navigate", handleNavigate);
    return () => window.removeEventListener("tm.navigate", handleNavigate);
  }, []);

  const renderScreen = () => {
    switch (activeScreen) {
      case "play":
        return <PlayWorkspace />;
      case "settings":
        return <Settings />;
      case "director":
        return <AiDirector />;
      case "encounter":
        return <EncounterFlow />;
      case "journal":
        return <Journal />;
      case "map":
        return <MapStudio />;
      case "logs":
        return <LogsExports />;
      case "party":
        return <PartySheets />;
      case "dashboard":
        return <Dashboard onResumePlay={() => setActiveScreen("play")} />;
      default:
        return (
          <section className="panel">
            <div className="panel-title">Coming Soon</div>
            <div className="panel-body">This area is queued next in the implementation plan.</div>
          </section>
        );
    }
  };

  const showContextRail = activeScreen !== "settings";

  return (
    <div className="app">
      <Topbar
        onNewJournal={() => setActiveScreen("journal")}
        onExport={() => setActiveScreen("logs")}
        onSearch={() => setActiveScreen("logs")}
      />
      <div className={`app-body ${showContextRail ? "" : "no-rail"}`}>
        <SidebarNav
          sections={navSections}
          activeScreen={activeScreen}
          onNavigate={setActiveScreen}
        />
        <main className="main">{renderScreen()}</main>
        {showContextRail ? <ContextRail activeScreen={activeScreen} /> : null}
      </div>
      <TimelineDrawer onOpenLogs={() => setActiveScreen("logs")} />
    </div>
  );
}
