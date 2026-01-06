import { useEffect, useMemo, useState } from "react";
import type { Character } from "../data/types";
import { listCharacters } from "../data/characters";

const abilityOrder: Array<keyof Character["abilities"]> = [
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha"
];

export default function PartySheets() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    void listCharacters().then((data) => {
      setCharacters(data);
      if (!activeId && data.length) {
        setActiveId(data[0].id);
      }
    });
  }, [activeId]);

  const activeCharacter = useMemo(
    () => characters.find((character) => character.id === activeId) ?? characters[0],
    [characters, activeId]
  );

  return (
    <div className="party">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">Party Sheets</div>
        <div className="panel-subtitle">
          Review character stats, conditions, and quick inventory references.
        </div>
      </section>

      <div className="party-grid">
        <section className="panel party-list">
          <div className="panel-title">Roster</div>
          <div className="panel-body">
            {characters.length === 0 ? (
              <div className="panel-copy">
                No characters yet. Seed data will appear on first run.
              </div>
            ) : (
              characters.map((character) => (
                <button
                  key={character.id}
                  className={`party-card ${activeId === character.id ? "is-active" : ""}`}
                  onClick={() => setActiveId(character.id)}
                >
                  <div>
                    <div className="party-name">{character.name}</div>
                    <div className="party-meta">
                      {character.className} {character.level} · {character.ancestry}
                    </div>
                  </div>
                  <div className="party-hp">{character.hitPoints} HP</div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="panel party-detail">
          <div className="panel-title">Character Detail</div>
          <div className="panel-body">
            {activeCharacter ? (
              <>
                <div className="detail-header">
                  <div>
                    <div className="detail-name">{activeCharacter.name}</div>
                    <div className="detail-meta">
                      {activeCharacter.className} {activeCharacter.level} ·{" "}
                      {activeCharacter.background}
                    </div>
                  </div>
                  <div className="detail-badges">
                    <span className="status-chip">AC {activeCharacter.armorClass}</span>
                    <span className="status-chip">
                      {activeCharacter.hitPoints}/{activeCharacter.hitPointMax} HP
                    </span>
                    <span className="status-chip">Speed {activeCharacter.speed}</span>
                  </div>
                </div>

                <div className="ability-grid">
                  {abilityOrder.map((ability) => (
                    <div key={ability} className="ability-card">
                      <div className="ability-label">{ability.toUpperCase()}</div>
                      <div className="ability-score">{activeCharacter.abilities[ability]}</div>
                      <div className="ability-mod">
                        {formatModifier(activeCharacter.abilities[ability])}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="detail-grid">
                  <div className="detail-section">
                    <div className="detail-title">Alignment</div>
                    <div className="detail-value">{activeCharacter.alignment}</div>
                  </div>
                  <div className="detail-section">
                    <div className="detail-title">Role</div>
                    <div className="detail-value">{activeCharacter.role}</div>
                  </div>
                  <div className="detail-section">
                    <div className="detail-title">Initiative</div>
                    <div className="detail-value">+{activeCharacter.initiativeBonus}</div>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-section">
                    <div className="detail-title">Inventory</div>
                    <div className="detail-value">
                      {activeCharacter.inventory.length
                        ? activeCharacter.inventory.join(", ")
                        : "No items recorded."}
                    </div>
                  </div>
                  <div className="detail-section">
                    <div className="detail-title">Proficiencies</div>
                    <div className="detail-value">
                      {activeCharacter.proficiencies.length
                        ? activeCharacter.proficiencies.join(", ")
                        : "No proficiencies recorded."}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="panel-copy">Select a party member to view their sheet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function formatModifier(score: number): string {
  const value = Math.floor((score - 10) / 2);
  return value >= 0 ? `+${value}` : `${value}`;
}
