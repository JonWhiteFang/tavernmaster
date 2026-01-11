import type { Dispatch, SetStateAction } from "react";
import type { AbilityScore, CharacterControl, CharacterRole } from "../../data/types";
import type { SrdRecord } from "../../data/srd_queries";
import type {
  CharacterFormState,
  InventoryEntryForm,
  SpellEntryForm
} from "../../hooks/useCharacterForm";
import {
  abilityModifier,
  abilityOrder,
  getAbilityScoreCost,
  getAncestryByName,
  srdAlignments,
  srdAncestries,
  srdBackgrounds,
  srdClasses
} from "../../rules/characterCreation";

type Props = {
  formState: CharacterFormState;
  setFormState: Dispatch<SetStateAction<CharacterFormState>>;
  derivedAbilities: Record<AbilityScore, number>;
  normalizedBonusSelections: AbilityScore[];
  selectedAncestry: ReturnType<typeof getAncestryByName>;
  pointBuyRemaining: number;
  autoDerived: boolean;
  setAutoDerived: (value: boolean) => void;
  srdItems: SrdRecord[];
  srdSpells: SrdRecord[];
  formError: string | null;
  canSave: boolean;
  isSaving: boolean;
  isEdit: boolean;
  onSave: () => void;
  onCancel: () => void;
};

const pointBuyScores = [8, 9, 10, 11, 12, 13, 14, 15];

function formatModifier(score: number): string {
  const value = abilityModifier(score);
  return value >= 0 ? `+${value}` : `${value}`;
}

function formatSpellOption(spell: SrdRecord): string {
  const level = spell.data.level;
  if (typeof level === "number") {
    return level === 0 ? `${spell.name} (Cantrip)` : `${spell.name} (Lv ${level})`;
  }
  return spell.name;
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export default function CharacterForm({
  formState,
  setFormState,
  derivedAbilities,
  normalizedBonusSelections,
  selectedAncestry,
  pointBuyRemaining,
  autoDerived,
  setAutoDerived,
  srdItems,
  srdSpells,
  formError,
  canSave,
  isSaving,
  isEdit,
  onSave,
  onCancel
}: Props) {
  const handleAbilityChange = (ability: AbilityScore, value: number) => {
    setFormState((current) => ({
      ...current,
      baseAbilities: { ...current.baseAbilities, [ability]: value }
    }));
  };

  const handleInventoryChange = (entryId: string, patch: Partial<InventoryEntryForm>) => {
    setFormState((current) => ({
      ...current,
      inventory: current.inventory.map((e) => (e.entryId === entryId ? { ...e, ...patch } : e))
    }));
  };

  const handleAddInventory = () => {
    setFormState((current) => ({
      ...current,
      inventory: [
        ...current.inventory,
        { entryId: crypto.randomUUID(), itemId: srdItems[0]?.id ?? "", quantity: 1, attuned: false }
      ]
    }));
  };

  const handleRemoveInventory = (entryId: string) => {
    setFormState((current) => ({
      ...current,
      inventory: current.inventory.filter((e) => e.entryId !== entryId)
    }));
  };

  const handleSpellChange = (entryId: string, patch: Partial<SpellEntryForm>) => {
    setFormState((current) => ({
      ...current,
      spells: current.spells.map((e) => (e.entryId === entryId ? { ...e, ...patch } : e))
    }));
  };

  const handleAddSpell = () => {
    setFormState((current) => ({
      ...current,
      spells: [
        ...current.spells,
        {
          entryId: crypto.randomUUID(),
          spellId: srdSpells[0]?.id ?? "",
          prepared: true,
          slotsUsed: 0
        }
      ]
    }));
  };

  const handleRemoveSpell = (entryId: string) => {
    setFormState((current) => ({
      ...current,
      spells: current.spells.filter((e) => e.entryId !== entryId)
    }));
  };

  return (
    <>
      <div className="panel-header">
        <div className="panel-title">{isEdit ? "Edit Character" : "New Character"}</div>
      </div>
      <div className="panel-body">
        <div className="party-form">
          {/* Core Identity */}
          <div className="party-form-section">
            <div className="party-form-title">Core Identity</div>
            <div className="form-grid">
              <label className="form-field">
                <span className="form-label">Name</span>
                <input
                  className="form-input"
                  value={formState.name}
                  onChange={(e) => setFormState((c) => ({ ...c, name: e.target.value }))}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Controller</span>
                <select
                  className="form-input"
                  value={formState.controlMode}
                  onChange={(e) =>
                    setFormState((c) => ({ ...c, controlMode: e.target.value as CharacterControl }))
                  }
                  data-tutorial-id="party-control-mode"
                >
                  <option value="player">Player</option>
                  <option value="ai">AI</option>
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Role</span>
                <select
                  className="form-input"
                  value={formState.role}
                  onChange={(e) =>
                    setFormState((c) => ({ ...c, role: e.target.value as CharacterRole }))
                  }
                >
                  <option value="player">Player</option>
                  <option value="ally">Ally</option>
                  <option value="npc">NPC</option>
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Class</span>
                <select
                  className="form-input"
                  value={formState.className}
                  onChange={(e) => setFormState((c) => ({ ...c, className: e.target.value }))}
                >
                  {srdClasses.map((entry) => (
                    <option key={entry.name} value={entry.name}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Level</span>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  max={20}
                  value={formState.level}
                  onChange={(e) =>
                    setFormState((c) => ({
                      ...c,
                      level: clampNumber(Number(e.target.value), 1, 20)
                    }))
                  }
                />
              </label>
              <label className="form-field">
                <span className="form-label">Ancestry</span>
                <select
                  className="form-input"
                  value={formState.ancestry}
                  onChange={(e) => setFormState((c) => ({ ...c, ancestry: e.target.value }))}
                >
                  {srdAncestries.map((entry) => (
                    <option key={entry.name} value={entry.name}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Background</span>
                <select
                  className="form-input"
                  value={formState.background}
                  onChange={(e) => setFormState((c) => ({ ...c, background: e.target.value }))}
                >
                  {srdBackgrounds.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Alignment</span>
                <select
                  className="form-input"
                  value={formState.alignment}
                  onChange={(e) => setFormState((c) => ({ ...c, alignment: e.target.value }))}
                >
                  {srdAlignments.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Ability Scores */}
          <div className="party-form-section">
            <div className="party-form-header">
              <div className="party-form-title">Ability Scores (Point Buy)</div>
              <span className={`status-chip ${pointBuyRemaining < 0 ? "status-error" : ""}`}>
                Points Remaining {pointBuyRemaining}
              </span>
            </div>
            <div className="ability-grid">
              {abilityOrder.map((ability) => (
                <div key={ability} className="ability-card">
                  <div className="ability-label">{ability.toUpperCase()}</div>
                  <select
                    className="form-input"
                    value={formState.baseAbilities[ability]}
                    onChange={(e) => handleAbilityChange(ability, Number(e.target.value))}
                  >
                    {pointBuyScores.map((score) => (
                      <option key={score} value={score}>
                        {score} ({getAbilityScoreCost(score)} pts)
                      </option>
                    ))}
                  </select>
                  <div className="ability-mod">
                    Final {derivedAbilities[ability]} ({formatModifier(derivedAbilities[ability])})
                  </div>
                </div>
              ))}
            </div>
            {selectedAncestry?.bonusChoices ? (
              <div className="form-grid" style={{ marginTop: "1rem" }}>
                {Array.from({ length: selectedAncestry.bonusChoices.count }).map((_, index) => (
                  <label className="form-field" key={`bonus-${index}`}>
                    <span className="form-label">Bonus Choice {index + 1}</span>
                    <select
                      className="form-input"
                      value={normalizedBonusSelections[index] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value as AbilityScore;
                        setFormState((current) => {
                          const next = [...current.ancestryBonusSelections];
                          next[index] = value;
                          return { ...current, ancestryBonusSelections: next };
                        });
                      }}
                    >
                      {selectedAncestry.bonusChoices.options.map((option) => (
                        <option
                          key={option}
                          value={option}
                          disabled={
                            normalizedBonusSelections.includes(option) &&
                            normalizedBonusSelections[index] !== option
                          }
                        >
                          {option.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          {/* Derived Stats */}
          <div className="party-form-section">
            <div className="party-form-header">
              <div className="party-form-title">Derived Stats</div>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={autoDerived}
                  onChange={(e) => setAutoDerived(e.target.checked)}
                />
                <span className="form-hint">Auto-calc from SRD defaults</span>
              </label>
            </div>
            <div className="form-grid">
              <label className="form-field">
                <span className="form-label">Hit Points</span>
                <input
                  className="form-input"
                  type="number"
                  value={formState.hitPoints}
                  onChange={(e) =>
                    setFormState((c) => ({ ...c, hitPoints: Number(e.target.value) }))
                  }
                  disabled={autoDerived}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Max HP</span>
                <input
                  className="form-input"
                  type="number"
                  value={formState.hitPointMax}
                  onChange={(e) =>
                    setFormState((c) => ({ ...c, hitPointMax: Number(e.target.value) }))
                  }
                  disabled={autoDerived}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Armor Class</span>
                <input
                  className="form-input"
                  type="number"
                  value={formState.armorClass}
                  onChange={(e) =>
                    setFormState((c) => ({ ...c, armorClass: Number(e.target.value) }))
                  }
                  disabled={autoDerived}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Initiative Bonus</span>
                <input
                  className="form-input"
                  type="number"
                  value={formState.initiativeBonus}
                  onChange={(e) =>
                    setFormState((c) => ({ ...c, initiativeBonus: Number(e.target.value) }))
                  }
                  disabled={autoDerived}
                />
              </label>
              <label className="form-field">
                <span className="form-label">Speed</span>
                <input
                  className="form-input"
                  type="number"
                  value={formState.speed}
                  onChange={(e) => setFormState((c) => ({ ...c, speed: Number(e.target.value) }))}
                  disabled={autoDerived}
                />
              </label>
            </div>
          </div>

          {/* Inventory */}
          <div className="party-form-section">
            <div className="party-form-header">
              <div className="party-form-title">Inventory</div>
              <button
                className="secondary-button"
                onClick={handleAddInventory}
                disabled={srdItems.length === 0}
              >
                Add Item
              </button>
            </div>
            {srdItems.length === 0 ? (
              <div className="panel-copy">No SRD items loaded yet.</div>
            ) : formState.inventory.length === 0 ? (
              <div className="panel-copy">No items selected.</div>
            ) : (
              <div className="party-line-list">
                {formState.inventory.map((entry) => (
                  <div className="party-line-item" key={entry.entryId}>
                    <label className="form-field">
                      <span className="form-label">Item</span>
                      <select
                        className="form-input"
                        value={entry.itemId}
                        onChange={(e) =>
                          handleInventoryChange(entry.entryId, { itemId: e.target.value })
                        }
                      >
                        {srdItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <span className="form-label">Qty</span>
                      <input
                        className="form-input"
                        type="number"
                        min={1}
                        value={entry.quantity}
                        onChange={(e) =>
                          handleInventoryChange(entry.entryId, {
                            quantity: Math.max(1, Number(e.target.value))
                          })
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span className="form-label">Attuned</span>
                      <input
                        type="checkbox"
                        checked={entry.attuned}
                        onChange={(e) =>
                          handleInventoryChange(entry.entryId, { attuned: e.target.checked })
                        }
                      />
                    </label>
                    <button
                      className="ghost-button"
                      onClick={() => handleRemoveInventory(entry.entryId)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Spells */}
          <div className="party-form-section">
            <div className="party-form-header">
              <div className="party-form-title">Spells</div>
              <button
                className="secondary-button"
                onClick={handleAddSpell}
                disabled={srdSpells.length === 0}
              >
                Add Spell
              </button>
            </div>
            {srdSpells.length === 0 ? (
              <div className="panel-copy">No SRD spells loaded yet.</div>
            ) : formState.spells.length === 0 ? (
              <div className="panel-copy">No spells selected.</div>
            ) : (
              <div className="party-line-list">
                {formState.spells.map((entry) => (
                  <div className="party-line-item" key={entry.entryId}>
                    <label className="form-field">
                      <span className="form-label">Spell</span>
                      <select
                        className="form-input"
                        value={entry.spellId}
                        onChange={(e) =>
                          handleSpellChange(entry.entryId, { spellId: e.target.value })
                        }
                      >
                        {srdSpells.map((spell) => (
                          <option key={spell.id} value={spell.id}>
                            {formatSpellOption(spell)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <span className="form-label">Prepared</span>
                      <input
                        type="checkbox"
                        checked={entry.prepared}
                        onChange={(e) =>
                          handleSpellChange(entry.entryId, { prepared: e.target.checked })
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span className="form-label">Slots Used</span>
                      <input
                        className="form-input"
                        type="number"
                        min={0}
                        value={entry.slotsUsed}
                        onChange={(e) =>
                          handleSpellChange(entry.entryId, {
                            slotsUsed: Math.max(0, Number(e.target.value))
                          })
                        }
                      />
                    </label>
                    <button
                      className="ghost-button"
                      onClick={() => handleRemoveSpell(entry.entryId)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Proficiencies */}
          <div className="party-form-section">
            <div className="party-form-title">Proficiencies</div>
            <label className="form-field">
              <span className="form-label">Comma-separated</span>
              <textarea
                className="form-textarea"
                rows={2}
                value={formState.proficienciesText}
                onChange={(e) => setFormState((c) => ({ ...c, proficienciesText: e.target.value }))}
              />
            </label>
          </div>

          {formError ? <span className="status-chip status-error">{formError}</span> : null}

          <div className="button-row">
            <button className="ghost-button" onClick={onCancel} disabled={isSaving}>
              Cancel
            </button>
            <div className="button-row right" style={{ marginTop: 0 }}>
              <button
                className="secondary-button"
                onClick={() => setAutoDerived(true)}
                disabled={isSaving}
              >
                Recalculate Stats
              </button>
              <button className="primary-button" onClick={onSave} disabled={!canSave || isSaving}>
                {isSaving ? "Saving..." : "Save Character"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
