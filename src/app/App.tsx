import { useEffect } from "react";
import { initDatabase } from "./data/db";
import Dashboard from "./screens/Dashboard";

export default function App() {
  useEffect(() => {
    void initDatabase().catch((error) => {
      console.error("Failed to initialize database", error);
    });
  }, []);

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
          <button className="nav-item is-active">Session Dashboard</button>
          <button className="nav-item">Encounter Flow</button>
          <button className="nav-item">Party Sheets</button>
          <button className="nav-item">Map Studio</button>
          <button className="nav-item">Journal</button>
          <button className="nav-item">AI Director</button>
          <div className="nav-divider" />
          <button className="nav-item">Logs & Exports</button>
          <button className="nav-item">Settings</button>
        </aside>
        <main className="main">
          <Dashboard />
        </main>
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
