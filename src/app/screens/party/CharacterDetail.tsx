import type { Character, CharacterControl } from "../../data/types";
import { abilityOrder, abilityModifier } from "../../rules/characterCreation";

type Props = {
  character: Character;
  isPlayerCharacter: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetAsPlayer?: () => void;
};

const controlLabels: Record<CharacterControl, string> = {
  player: "Player",
  ai: "AI"
};

function formatModifier(score: number): string {
  const value = abilityModifier(score);
  return value >= 0 ? `+${value}` : `${value}`;
}

function formatSpellSummary(spell: Character["spells"][number]): string {
  const levelLabel =
    typeof spell.level === "number" ? (spell.level === 0 ? "Cantrip" : `Lv ${spell.level}`) : "";
  const detail = [levelLabel, spell.school].filter(Boolean).join(" ");
  const prepared = spell.prepared ? "prepared" : "unprepared";
  return detail ? `${spell.name} (${detail}, ${prepared})` : `${spell.name} (${prepared})`;
}

export default function CharacterDetail({
  character,
  isPlayerCharacter,
  onEdit,
  onDelete,
  onSetAsPlayer
}: Props) {
  return (
    <>
      <div className="panel-header">
        <div className="panel-title">
          Character Detail
          {isPlayerCharacter && (
            <span className="status-chip" style={{ marginLeft: "0.5rem" }}>
              Your Character
            </span>
          )}
        </div>
        <div className="button-row" style={{ marginTop: 0 }}>
          {!isPlayerCharacter && onSetAsPlayer && (
            <button className="primary-button" onClick={onSetAsPlayer}>
              Set as Your Character
            </button>
          )}
          <button className="secondary-button" onClick={onEdit}>
            Edit
          </button>
          <button className="ghost-button" onClick={() => { console.log('Delete clicked'); onDelete(); }}>
            Delete
          </button>
        </div>
      </div>
      <div className="panel-body">
        <div className="detail-header">
          <div>
            <div className="detail-name">{character.name}</div>
            <div className="detail-meta">
              {character.className} {character.level} · {character.background}
            </div>
          </div>
        </div>

        <div className="detail-group">
          <div className="detail-group-title">Vitals</div>
          <div className="detail-badges">
            <span className="status-chip">AC {character.armorClass}</span>
            <span className="status-chip">
              {character.hitPoints}/{character.hitPointMax} HP
            </span>
            <span className="status-chip">Speed {character.speed}</span>
            <span className="status-chip">{controlLabels[character.controlMode]} Control</span>
          </div>
        </div>

        <div className="detail-group">
          <div className="detail-group-title">Ability Scores</div>
          <div className="ability-grid">
            {abilityOrder.map((ability) => (
              <div key={ability} className="ability-card">
                <div className="ability-label">{ability.toUpperCase()}</div>
                <div className="ability-score">{character.abilities[ability]}</div>
                <div className="ability-mod">{formatModifier(character.abilities[ability])}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-group">
          <div className="detail-group-title">Profile</div>
          <div className="detail-grid">
            <div className="detail-section">
              <div className="detail-title">Alignment</div>
              <div className="detail-value">{character.alignment}</div>
            </div>
            <div className="detail-section">
              <div className="detail-title">Role</div>
              <div className="detail-value">{character.role}</div>
            </div>
            <div className="detail-section">
              <div className="detail-title">Initiative</div>
              <div className="detail-value">+{character.initiativeBonus}</div>
            </div>
          </div>
        </div>

        <div className="detail-group">
          <div className="detail-group-title">Equipment</div>
          <div className="detail-grid">
            <div className="detail-section">
              <div className="detail-title">Inventory</div>
              <div className="detail-value">
                {character.inventory.length
                  ? character.inventory
                      .map((item) =>
                        item.attuned
                          ? `${item.name} x${item.quantity} (attuned)`
                          : `${item.name} x${item.quantity}`
                      )
                      .join(", ")
                  : "No items recorded."}
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-title">Spells</div>
              <div className="detail-value">
                {character.spells.length
                  ? character.spells.map((spell) => formatSpellSummary(spell)).join(", ")
                  : "No spells recorded."}
              </div>
            </div>
          </div>
        </div>

        <div className="detail-group">
          <div className="detail-group-title">Traits</div>
          <div className="detail-grid">
            <div className="detail-section">
              <div className="detail-title">Proficiencies</div>
              <div className="detail-value">
                {character.proficiencies.length
                  ? character.proficiencies.join(", ")
                  : "No proficiencies recorded."}
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-title">Ancestry Bonuses</div>
              <div className="detail-value">
                {character.ancestryBonusSelections.length
                  ? character.ancestryBonusSelections.map((a) => a.toUpperCase()).join(", ")
                  : "None"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
