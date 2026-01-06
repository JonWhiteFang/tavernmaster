import { useEffect, useMemo, useState } from "react";

type Token = {
  id: string;
  name: string;
  role: "party" | "enemy" | "neutral";
};

export default function MapStudio() {
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Token[]>([
    { id: "t1", name: "Riven", role: "party" },
    { id: "t2", name: "Sable", role: "party" },
    { id: "t3", name: "Goblin Scout", role: "enemy" }
  ]);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenRole, setNewTokenRole] = useState<Token["role"]>("party");

  useEffect(() => {
    if (!mapFile) {
      setMapUrl(null);
      return;
    }
    const url = URL.createObjectURL(mapFile);
    setMapUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mapFile]);

  const tokenCounts = useMemo(() => {
    return tokens.reduce(
      (acc, token) => {
        acc[token.role] += 1;
        return acc;
      },
      { party: 0, enemy: 0, neutral: 0 }
    );
  }, [tokens]);

  const handleAddToken = () => {
    if (!newTokenName.trim()) {
      return;
    }
    setTokens((current) => [
      ...current,
      { id: crypto.randomUUID(), name: newTokenName.trim(), role: newTokenRole }
    ]);
    setNewTokenName("");
  };

  const handleRemoveToken = (id: string) => {
    setTokens((current) => current.filter((token) => token.id !== id));
  };

  return (
    <div className="map-studio">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">Map Studio</div>
        <div className="panel-subtitle">
          Import tactical maps, manage tokens, and prepare fog-of-war staging.
        </div>
      </section>

      <div className="map-grid">
        <section className="panel">
          <div className="panel-title">Scene Canvas</div>
          <div className="panel-body">
            <div className="map-preview">
              {mapUrl ? (
                <img src={mapUrl} alt="Map preview" className="map-image" />
              ) : (
                <div className="map-placeholder">
                  <div className="panel-subtitle">No map loaded</div>
                  <div className="panel-copy">
                    Drop a tactical map to begin staging the encounter.
                  </div>
                </div>
              )}
            </div>
            <div className="button-row" style={{ marginTop: "1rem" }}>
              <label className="secondary-button" style={{ cursor: "pointer" }}>
                Upload Map
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(event) => setMapFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <button className="ghost-button" onClick={() => setMapFile(null)}>
                Clear Map
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">Token Roster</div>
          <div className="panel-body">
            <div className="token-summary">
              <span className="status-chip">Party {tokenCounts.party}</span>
              <span className="status-chip">Enemy {tokenCounts.enemy}</span>
              <span className="status-chip">Neutral {tokenCounts.neutral}</span>
            </div>
            <div className="form-grid" style={{ marginTop: "1rem" }}>
              <label className="form-field">
                <span className="form-label">Token Name</span>
                <input
                  className="form-input"
                  value={newTokenName}
                  onChange={(event) => setNewTokenName(event.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Role</span>
                <select
                  className="form-input"
                  value={newTokenRole}
                  onChange={(event) => setNewTokenRole(event.target.value as Token["role"])}
                >
                  <option value="party">Party</option>
                  <option value="enemy">Enemy</option>
                  <option value="neutral">Neutral</option>
                </select>
              </label>
            </div>
            <div className="button-row">
              <button className="primary-button" onClick={handleAddToken}>
                Add Token
              </button>
            </div>

            <div className="token-list">
              {tokens.map((token) => (
                <div key={token.id} className={`token-row token-${token.role}`}>
                  <div>
                    <div className="token-name">{token.name}</div>
                    <div className="token-role">{token.role}</div>
                  </div>
                  <button className="ghost-button" onClick={() => handleRemoveToken(token.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">Fog & Rulers</div>
          <div className="panel-body">
            <div className="form-grid">
              <label className="form-field">
                <span className="form-label">Fog Mode</span>
                <select className="form-input" defaultValue="soft">
                  <option value="soft">Soft Reveal</option>
                  <option value="hard">Hard Mask</option>
                  <option value="none">Disabled</option>
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Grid Size</span>
                <input className="form-input" type="number" defaultValue={5} />
              </label>
            </div>
            <div className="button-row">
              <button className="secondary-button">Toggle Ruler</button>
              <button className="secondary-button">Draw Zone</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
