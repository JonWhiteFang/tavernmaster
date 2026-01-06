import { useEffect, useMemo, useState } from "react";
import { initializeData } from "./data/init";
import Dashboard from "./screens/Dashboard";
import AiDirector from "./screens/AiDirector";
import PartySheets from "./screens/PartySheets";
import Settings from "./screens/Settings";

type ScreenKey =
  | "dashboard"
  | "encounter"
  | "party"
  | "map"
  | "journal"
  | "director"
  | "logs"
  | "settings";

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("dashboard");

  const navItems = useMemo(
    () => [
      { id: "dashboard" as const, label: "Session Dashboard" },
      { id: "encounter" as const, label: "Encounter Flow" },
      { id: "party" as const, label: "Party Sheets" },
      { id: "map" as const, label: "Map Studio" },
      { id: "journal" as const, label: "Journal" },
      { id: "director" as const, label: "AI Director" },
      { id: "logs" as const, label: "Logs & Exports" },
      { id: "settings" as const, label: "Settings" }
    ],
    []
  );

  useEffect(() => {
    void initializeData().catch((error) => {
      console.error("Failed to initialize app data", error);
    });
  }, []);

  const renderScreen = () => {
    switch (activeScreen) {
      case "settings":
        return <Settings />;
      case "director":
        return <AiDirector />;
      case "party":
        return <PartySheets />;
      case "dashboard":
        return <Dashboard />;
      default:
        return (
          <section className="panel">
            <div className="panel-title">Coming Soon</div>
            <div className="panel-body">This area is queued next in the implementation plan.</div>
          </section>
        );
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">TM</div>
          <div>
            <div className="brand-title">Tavern Master</div>
            <div className="brand-subtitle">Solo 5e orchestration suite</div>
          </div>
        </div>
        <div className="status-row">
          <div className="status-pill">LLM: Local</div>
          <div className="status-pill">Sync: Ready</div>
          <div className="status-pill">Campaign: Copperbound</div>
        </div>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <div className="nav-section">Overview</div>
          {navItems.slice(0, 6).map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeScreen === item.id ? "is-active" : ""}`}
              onClick={() => setActiveScreen(item.id)}
            >
              {item.label}
            </button>
          ))}
          <div className="nav-divider" />
          {navItems.slice(6).map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeScreen === item.id ? "is-active" : ""}`}
              onClick={() => setActiveScreen(item.id)}
            >
              {item.label}
            </button>
          ))}
        </aside>
        <main className="main">{renderScreen()}</main>
        {activeScreen === "dashboard" ? (
          <aside className="inspector">
            <div className="inspector-header">Scene Controls</div>
            <div className="inspector-card">
              <div className="inspector-title">Action Approval</div>
              <p className="inspector-copy">
                Review AI-proposed party actions before they are committed to the turn.
              </p>
              <button className="primary-button">Review 3 Pending Actions</button>
            </div>
            <div className="inspector-card">
              <div className="inspector-title">Session Tone</div>
              <p className="inspector-copy">Cinematic, tactical, low-comedy.</p>
              <div className="tag-row">
                <span className="tag">5e SRD</span>
                <span className="tag">Hard Encounters</span>
              </div>
            </div>
            <div className="inspector-card">
              <div className="inspector-title">Dice Console</div>
              <div className="dice-row">
                <button className="dice">d20</button>
                <button className="dice">d12</button>
                <button className="dice">d8</button>
                <button className="dice">d6</button>
                <button className="dice">d4</button>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
      <footer className="logbar">
        <div className="log-title">Narrative Feed</div>
        <div className="log-entry">
          The wind howls through the broken archway as your party approaches the silver gate.
        </div>
      </footer>
    </div>
  );
}
