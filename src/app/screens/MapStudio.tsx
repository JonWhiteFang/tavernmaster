import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import Button from "../ui/Button";
import Chip from "../ui/Chip";
import { useAppContext } from "../state/AppContext";

type Token = {
  id: string;
  name: string;
  role: "party" | "enemy" | "neutral";
};

const roleOptions: Token["role"][] = ["party", "enemy", "neutral"];

export default function MapStudio() {
  const { activeCampaignId } = useAppContext();
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([
    { id: "t1", name: "Riven", role: "party" },
    { id: "t2", name: "Sable", role: "party" },
    { id: "t3", name: "Goblin Scout", role: "enemy" }
  ]);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenRole, setNewTokenRole] = useState<Token["role"]>("party");
  const [tokenSearch, setTokenSearch] = useState("");
  const [activeRoles, setActiveRoles] = useState<Token["role"][]>([]);

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

  const filteredTokens = useMemo(() => {
    return tokens.filter((token) => {
      if (activeRoles.length && !activeRoles.includes(token.role)) {
        return false;
      }
      if (!tokenSearch.trim()) {
        return true;
      }
      return token.name.toLowerCase().includes(tokenSearch.trim().toLowerCase());
    });
  }, [activeRoles, tokenSearch, tokens]);

  useEffect(() => {
    const payload = {
      ...tokenCounts,
      total: tokens.length
    };
    window.localStorage.setItem("tm.map.tokenCounts", JSON.stringify(payload));
    window.dispatchEvent(new globalThis.CustomEvent("tm.map.tokens", { detail: payload }));
  }, [tokenCounts, tokens.length]);

  const handleMapFile = (file: File | null) => {
    if (!file) {
      setMapFile(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      return;
    }
    setMapFile(file);
  };

  const handleDragOver = (event: DragEvent<globalThis.HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<globalThis.HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as globalThis.Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<globalThis.HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleMapFile(file);
  };

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

  const handleRenameToken = (id: string, name: string) => {
    setTokens((current) => current.map((token) => (token.id === id ? { ...token, name } : token)));
  };

  const handleToggleRoleFilter = (role: Token["role"]) => {
    setActiveRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
    );
  };

  const handleRoleChange = (id: string, role: Token["role"]) => {
    setTokens((current) => current.map((token) => (token.id === id ? { ...token, role } : token)));
  };

  const handleNavigate = (screen: string) => {
    window.dispatchEvent(new globalThis.CustomEvent("tm.navigate", { detail: { screen } }));
  };

  if (!activeCampaignId) {
    return (
      <div className="map-studio">
        <section className="panel">
          <div className="panel-title">Map Studio</div>
          <div className="panel-subtitle">Select a campaign to upload maps and manage tokens.</div>
          <div className="button-row" style={{ marginTop: "1.2rem" }}>
            <Button onClick={() => handleNavigate("dashboard")}>Open Campaigns & Sessions</Button>
            <Button variant="secondary" onClick={() => handleNavigate("party")}>
              Open Party Sheets
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="map-studio">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">Map Studio</div>
        <div className="panel-subtitle">
          Import tactical maps, manage tokens, and prepare fog-of-war staging.
        </div>
      </section>

      <div className="map-grid">
        <section className="panel map-panel">
          <div className="panel-title">Scene Canvas</div>
          <div className="panel-body">
            <div
              className={`map-preview ${isDragActive ? "is-dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
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
              {isDragActive ? (
                <div className="map-drop-overlay">
                  <div className="panel-subtitle">Drop map to upload</div>
                  <div className="panel-copy">PNG or JPG images supported.</div>
                </div>
              ) : null}
            </div>
            <div className="button-row" style={{ marginTop: "1rem" }}>
              <label className="secondary-button" style={{ cursor: "pointer" }}>
                Upload Map
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(event) => handleMapFile(event.target.files?.[0] ?? null)}
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
              <Chip>Party {tokenCounts.party}</Chip>
              <Chip>Enemy {tokenCounts.enemy}</Chip>
              <Chip>Neutral {tokenCounts.neutral}</Chip>
            </div>
            <div className="search-row" style={{ marginTop: "1rem" }}>
              <label className="form-field search-field">
                <span className="form-label">Search</span>
                <input
                  className="form-input"
                  value={tokenSearch}
                  onChange={(event) => setTokenSearch(event.target.value)}
                  placeholder="Search tokens"
                />
              </label>
              <Chip>Matches {filteredTokens.length}</Chip>
            </div>
            <div className="filter-row">
              <div className="filter-label">Roles</div>
              <div className="filter-chips">
                <button
                  className={`filter-chip ${activeRoles.length === 0 ? "is-active" : ""}`}
                  onClick={() => setActiveRoles([])}
                  type="button"
                >
                  All ({tokens.length})
                </button>
                {roleOptions.map((role) => (
                  <button
                    key={role}
                    className={`filter-chip ${activeRoles.includes(role) ? "is-active" : ""}`}
                    onClick={() => handleToggleRoleFilter(role)}
                    type="button"
                  >
                    {role} ({tokenCounts[role]})
                  </button>
                ))}
              </div>
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
              <Button onClick={handleAddToken}>Add Token</Button>
            </div>

            <div className="token-list">
              {filteredTokens.length === 0 ? (
                <div className="panel-copy">No tokens match your filters.</div>
              ) : (
                filteredTokens.map((token) => (
                  <div key={token.id} className={`token-row token-${token.role}`}>
                    <div className="token-main">
                      <input
                        className="form-input token-name-input"
                        value={token.name}
                        onChange={(event) => handleRenameToken(token.id, event.target.value)}
                      />
                      <div className="token-role-toggle">
                        {roleOptions.map((role) => (
                          <button
                            key={`${token.id}-${role}`}
                            className={`token-role-button ${
                              token.role === role ? "is-active" : ""
                            }`}
                            onClick={() => handleRoleChange(token.id, role)}
                            type="button"
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => handleRemoveToken(token.id)}>
                      Remove
                    </Button>
                  </div>
                ))
              )}
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
