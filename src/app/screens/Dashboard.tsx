import type { CSSProperties } from "react";
import Panel from "../ui/Panel";

const quickStats = [
  { label: "Party HP", value: "118 / 142" },
  { label: "Initiative", value: "Round 2" },
  { label: "Threat", value: "Deadly" },
  { label: "Location", value: "Sunken Vault" }
];

export default function Dashboard() {
  return (
    <div className="dashboard">
      <section className="hero panel" style={{ "--delay": "80ms" } as CSSProperties}>
        <div>
          <div className="hero-kicker">Act II: The Drowned Reliquary</div>
          <h1 className="hero-title">Storm the reliquary before the tide turns.</h1>
          <p className="hero-copy">
            The AI Dungeon Master is staging a layered encounter with environmental hazards,
            faction agendas, and a time pressure clock.
          </p>
        </div>
        <div className="hero-actions">
          <button className="primary-button">Resume Encounter</button>
          <button className="ghost-button">Open Session Brief</button>
        </div>
      </section>

      <section className="stat-grid">
        {quickStats.map((stat, index) => (
          <div
            key={stat.label}
            className="stat-card panel"
            style={{ "--delay": `${120 + index * 60}ms` } as CSSProperties}
          >
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
          </div>
        ))}
      </section>

      <section className="panel-grid">
        <Panel title="Encounter Control" subtitle="Initiative, conditions, and battlefield tools" delay={240}>
          <ul className="feature-list">
            <li>Track initiative, legendary actions, lair effects.</li>
            <li>Pin conditions with rules references and durations.</li>
            <li>Stage environmental hazards and timed objectives.</li>
          </ul>
        </Panel>
        <Panel title="Party Command" subtitle="AI-managed companions with approval" delay={300}>
          <ul className="feature-list">
            <li>Review proposed actions before they execute.</li>
            <li>Set tactics profiles: protective, reckless, support.</li>
            <li>Auto-handle inventory, spells, and reactions.</li>
          </ul>
        </Panel>
        <Panel title="Map Studio" subtitle="Scene boards and tactical overlays" delay={360}>
          <ul className="feature-list">
            <li>Import static maps or sketch quick layouts.</li>
            <li>Drop tokens, fog-of-war, and line-of-sight rulers.</li>
            <li>Attach encounter notes and trigger zones.</li>
          </ul>
        </Panel>
        <Panel title="Journal & Exports" subtitle="Narrative log and session handoff" delay={420}>
          <ul className="feature-list">
            <li>Curate a cinematic transcript with highlights.</li>
            <li>Export to Markdown or PDF for sharing.</li>
            <li>Sync sessions across Macs via Supabase.</li>
          </ul>
        </Panel>
      </section>
    </div>
  );
}
