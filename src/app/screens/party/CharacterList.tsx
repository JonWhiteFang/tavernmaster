import type { Character, CharacterControl } from "../../data/types";

type Props = {
  characters: Character[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onWizard: () => void;
  onManual: () => void;
  disabled: boolean;
};

const controlLabels: Record<CharacterControl, string> = {
  player: "Player",
  ai: "AI"
};

export default function CharacterList({
  characters,
  activeId,
  onSelect,
  onWizard,
  onManual,
  disabled
}: Props) {
  return (
    <section className="panel party-list" data-tutorial-id="party-roster">
      <div className="panel-header">
        <div>
          <div className="panel-title">Roster</div>
          <div className="panel-subtitle">{characters.length} party members</div>
        </div>
        <div className="button-row" style={{ gap: "0.5rem" }}>
          <button className="primary-button" onClick={onWizard} disabled={disabled}>
            Wizard
          </button>
          <button
            className="secondary-button"
            onClick={onManual}
            disabled={disabled}
            data-tutorial-id="party-create-character"
          >
            Manual
          </button>
        </div>
      </div>
      <div className="panel-body">
        {characters.length === 0 ? (
          <div className="panel-copy">No characters yet. Create a party member to begin.</div>
        ) : (
          characters.map((character) => (
            <button
              key={character.id}
              className={`party-card ${activeId === character.id ? "is-active" : ""}`}
              onClick={() => onSelect(character.id)}
              disabled={disabled}
            >
              <div>
                <div className="party-name">{character.name}</div>
                <div className="party-meta">
                  {character.className} {character.level} · {character.ancestry} ·{" "}
                  {controlLabels[character.controlMode]}
                </div>
              </div>
              <div className="party-hp">{character.hitPoints} HP</div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
