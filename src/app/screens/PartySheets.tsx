import { useCallback, useEffect, useMemo, useState } from "react";
import type { AbilityScore, Character, CharacterControl, CharacterRole } from "../data/types";
import type { NewCharacterInput } from "../data/characters";
import {
  createCharacter,
  deleteCharacter,
  listCharacters,
  updateCharacter
} from "../data/characters";
import type { SrdRecord } from "../data/srd_queries";
import { querySrd } from "../data/srd_queries";
import {
  abilityModifier,
  abilityOrder,
  applyAncestryBonuses,
  calculateDerivedStats,
  getAbilityScoreCost,
  getAncestryByName,
  getPointBuyTotal,
  srdAlignments,
  srdAncestries,
  srdBackgrounds,
  srdClasses
} from "../rules/characterCreation";

type InventoryEntryForm = {
  entryId: string;
  itemId: string;
  quantity: number;
  attuned: boolean;
};

type SpellEntryForm = {
  entryId: string;
  spellId: string;
  prepared: boolean;
  slotsUsed: number;
};

type CharacterFormState = {
  name: string;
  role: CharacterRole;
  controlMode: CharacterControl;
  level: number;
  className: string;
  ancestry: string;
  background: string;
  alignment: string;
  baseAbilities: Record<AbilityScore, number>;
  ancestryBonusSelections: AbilityScore[];
  hitPoints: number;
  hitPointMax: number;
  armorClass: number;
  initiativeBonus: number;
  speed: number;
  proficienciesText: string;
  inventory: InventoryEntryForm[];
  spells: SpellEntryForm[];
};

type FormMode = "view" | "create" | "edit";

const pointBuyBudget = 27;
const pointBuyScores = [8, 9, 10, 11, 12, 13, 14, 15];

const defaultBaseAbilities: Record<AbilityScore, number> = {
  str: 15,
  dex: 14,
  con: 13,
  int: 12,
  wis: 10,
  cha: 8
};

const controlLabels: Record<CharacterControl, string> = {
  player: "Player",
  ai: "AI"
};

export default function PartySheets() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<FormMode>("view");
  const [formState, setFormState] = useState<CharacterFormState>(() => buildDefaultFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoDerived, setAutoDerived] = useState(true);
  const [srdItems, setSrdItems] = useState<SrdRecord[]>([]);
  const [srdSpells, setSrdSpells] = useState<SrdRecord[]>([]);

  const loadCharacters = useCallback(async (preferredId?: string) => {
    const data = await listCharacters();
    setCharacters(data);
    if (!data.length) {
      setActiveId(null);
      return;
    }
    const resolvedId =
      preferredId && data.some((character) => character.id === preferredId)
        ? preferredId
        : data[0].id;
    setActiveId(resolvedId);
  }, []);

  useEffect(() => {
    void loadCharacters();
  }, [loadCharacters]);

  useEffect(() => {
    void (async () => {
      const [items, spells] = await Promise.all([
        querySrd({ type: "items", limit: 250 }),
        querySrd({ type: "spells", limit: 250 })
      ]);
      setSrdItems(items);
      setSrdSpells(spells);
    })();
  }, []);

  const activeCharacter = useMemo(
    () => characters.find((character) => character.id === activeId) ?? null,
    [characters, activeId]
  );

  const selectedAncestry = useMemo(
    () => getAncestryByName(formState.ancestry),
    [formState.ancestry]
  );

  const normalizedBonusSelections = useMemo(
    () => normalizeBonusSelections(formState.ancestryBonusSelections, selectedAncestry),
    [formState.ancestryBonusSelections, selectedAncestry]
  );

  const derivedAbilities = useMemo(
    () =>
      applyAncestryBonuses(formState.baseAbilities, selectedAncestry, normalizedBonusSelections),
    [formState.baseAbilities, selectedAncestry, normalizedBonusSelections]
  );

  const derivedStats = useMemo(
    () =>
      calculateDerivedStats({
        abilities: derivedAbilities,
        level: formState.level,
        className: formState.className,
        ancestryName: formState.ancestry
      }),
    [derivedAbilities, formState.level, formState.className, formState.ancestry]
  );

  const pointBuyUsed = useMemo(
    () => getPointBuyTotal(formState.baseAbilities),
    [formState.baseAbilities]
  );
  const pointBuyRemaining = pointBuyBudget - pointBuyUsed;

  const canSave =
    formState.name.trim().length > 0 &&
    formState.className.trim().length > 0 &&
    formState.ancestry.trim().length > 0 &&
    formState.background.trim().length > 0 &&
    formState.alignment.trim().length > 0 &&
    pointBuyUsed <= pointBuyBudget &&
    areBonusSelectionsValid(normalizedBonusSelections, selectedAncestry);

  useEffect(() => {
    if (!autoDerived) {
      return;
    }
    setFormState((current) => ({
      ...current,
      hitPoints: derivedStats.hitPoints,
      hitPointMax: derivedStats.hitPointMax,
      armorClass: derivedStats.armorClass,
      initiativeBonus: derivedStats.initiativeBonus,
      speed: derivedStats.speed
    }));
  }, [autoDerived, derivedStats]);

  useEffect(() => {
    if (
      normalizedBonusSelections.length !== formState.ancestryBonusSelections.length ||
      !normalizedBonusSelections.every(
        (value, index) => value === formState.ancestryBonusSelections[index]
      )
    ) {
      setFormState((current) => ({
        ...current,
        ancestryBonusSelections: normalizedBonusSelections
      }));
    }
  }, [normalizedBonusSelections, formState.ancestryBonusSelections]);

  const handleStartCreate = () => {
    setMode("create");
    setFormState(buildDefaultFormState());
    setFormError(null);
    setAutoDerived(true);
  };

  const handleStartEdit = () => {
    if (!activeCharacter) {
      return;
    }
    setMode("edit");
    setFormState(buildFormStateFromCharacter(activeCharacter));
    setFormError(null);
    setAutoDerived(false);
  };

  const handleCancel = () => {
    setMode("view");
    setFormError(null);
    if (activeCharacter) {
      setFormState(buildFormStateFromCharacter(activeCharacter));
    } else {
      setFormState(buildDefaultFormState());
    }
  };

  const handleSave = async () => {
    if (!canSave || isSaving) {
      return;
    }
    const isNewCharacter = mode === "create";
    setIsSaving(true);
    setFormError(null);

    try {
      const payload = buildInputFromForm(formState, derivedAbilities, normalizedBonusSelections);
      let saved: Character;
      if (mode === "edit" && activeCharacter) {
        saved = await updateCharacter(activeCharacter.id, payload);
      } else {
        saved = await createCharacter(payload);
      }
      await loadCharacters(saved.id);
      if (isNewCharacter) {
        window.dispatchEvent(new globalThis.CustomEvent("tm.tutorial.character-created"));
      }
      setMode("view");
    } catch (error) {
      console.error(error);
      setFormError("Failed to save character. Check the console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeCharacter) {
      return;
    }
    if (!window.confirm(`Delete ${activeCharacter.name}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteCharacter(activeCharacter.id);
      await loadCharacters();
      setMode("view");
    } catch (error) {
      console.error(error);
      setFormError("Failed to delete character. Check the console for details.");
    }
  };

  const handleAbilityChange = (ability: AbilityScore, value: number) => {
    setFormState((current) => ({
      ...current,
      baseAbilities: {
        ...current.baseAbilities,
        [ability]: value
      }
    }));
  };

  const handleInventoryChange = (entryId: string, patch: Partial<InventoryEntryForm>) => {
    setFormState((current) => ({
      ...current,
      inventory: current.inventory.map((entry) =>
        entry.entryId === entryId ? { ...entry, ...patch } : entry
      )
    }));
  };

  const handleAddInventory = () => {
    setFormState((current) => ({
      ...current,
      inventory: [
        ...current.inventory,
        {
          entryId: crypto.randomUUID(),
          itemId: srdItems[0]?.id ?? "",
          quantity: 1,
          attuned: false
        }
      ]
    }));
  };

  const handleRemoveInventory = (entryId: string) => {
    setFormState((current) => ({
      ...current,
      inventory: current.inventory.filter((entry) => entry.entryId !== entryId)
    }));
  };

  const handleSpellChange = (entryId: string, patch: Partial<SpellEntryForm>) => {
    setFormState((current) => ({
      ...current,
      spells: current.spells.map((entry) =>
        entry.entryId === entryId ? { ...entry, ...patch } : entry
      )
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
      spells: current.spells.filter((entry) => entry.entryId !== entryId)
    }));
  };

  return (
    <div className="party">
      <section className="panel" style={{ marginBottom: "1.4rem" }}>
        <div className="panel-title">Party Sheets</div>
        <div className="panel-subtitle">
          Create SRD-compliant party members, track stats, and assign who controls each hero.
        </div>
      </section>

      <div className="party-grid">
        <section className="panel party-list" data-tutorial-id="party-roster">
          <div className="panel-header">
            <div>
              <div className="panel-title">Roster</div>
              <div className="panel-subtitle">{characters.length} party members</div>
            </div>
            <button
              className="secondary-button"
              onClick={handleStartCreate}
              disabled={mode !== "view"}
              data-tutorial-id="party-create-character"
            >
              Create Character
            </button>
          </div>
          <div className="panel-body">
            {characters.length === 0 ? (
              <div className="panel-copy">No characters yet. Create a party member to begin.</div>
            ) : (
              characters.map((character) => (
                <button
                  key={character.id}
                  className={`party-card ${activeId === character.id ? "is-active" : ""}`}
                  onClick={() => setActiveId(character.id)}
                  disabled={mode !== "view"}
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

        <section className="panel party-detail">
          <div className="panel-header">
            <div className="panel-title">
              {mode === "view"
                ? "Character Detail"
                : mode === "edit"
                  ? "Edit Character"
                  : "New Character"}
            </div>
            {mode === "view" && activeCharacter ? (
              <div className="button-row" style={{ marginTop: 0 }}>
                <button className="secondary-button" onClick={handleStartEdit}>
                  Edit
                </button>
                <button className="ghost-button" onClick={handleDelete}>
                  Delete
                </button>
              </div>
            ) : null}
          </div>
          <div className="panel-body">
            {mode === "view" ? (
              activeCharacter ? (
                <>
                  <div className="detail-header">
                    <div>
                      <div className="detail-name">{activeCharacter.name}</div>
                      <div className="detail-meta">
                        {activeCharacter.className} {activeCharacter.level} ·{" "}
                        {activeCharacter.background}
                      </div>
                    </div>
                  </div>

                  <div className="detail-group">
                    <div className="detail-group-title">Vitals</div>
                    <div className="detail-badges">
                      <span className="status-chip">AC {activeCharacter.armorClass}</span>
                      <span className="status-chip">
                        {activeCharacter.hitPoints}/{activeCharacter.hitPointMax} HP
                      </span>
                      <span className="status-chip">Speed {activeCharacter.speed}</span>
                      <span className="status-chip">
                        {controlLabels[activeCharacter.controlMode]} Control
                      </span>
                    </div>
                  </div>

                  <div className="detail-group">
                    <div className="detail-group-title">Ability Scores</div>
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
                  </div>

                  <div className="detail-group">
                    <div className="detail-group-title">Profile</div>
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
                  </div>

                  <div className="detail-group">
                    <div className="detail-group-title">Equipment</div>
                    <div className="detail-grid">
                      <div className="detail-section">
                        <div className="detail-title">Inventory</div>
                        <div className="detail-value">
                          {activeCharacter.inventory.length
                            ? activeCharacter.inventory
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
                          {activeCharacter.spells.length
                            ? activeCharacter.spells
                                .map((spell) => formatSpellSummary(spell))
                                .join(", ")
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
                          {activeCharacter.proficiencies.length
                            ? activeCharacter.proficiencies.join(", ")
                            : "No proficiencies recorded."}
                        </div>
                      </div>
                      <div className="detail-section">
                        <div className="detail-title">Ancestry Bonuses</div>
                        <div className="detail-value">
                          {activeCharacter.ancestryBonusSelections.length
                            ? activeCharacter.ancestryBonusSelections
                                .map((ability) => ability.toUpperCase())
                                .join(", ")
                            : "None"}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="panel-copy">Select a party member to view their sheet.</div>
              )
            ) : (
              <div className="party-form">
                <div className="party-form-section">
                  <div className="party-form-title">Core Identity</div>
                  <div className="form-grid">
                    <label className="form-field">
                      <span className="form-label">Name</span>
                      <input
                        className="form-input"
                        value={formState.name}
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span className="form-label">Controller</span>
                      <select
                        className="form-input"
                        value={formState.controlMode}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            controlMode: event.target.value as CharacterControl
                          }))
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
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            role: event.target.value as CharacterRole
                          }))
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
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            className: event.target.value
                          }))
                        }
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
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            level: clampNumber(Number(event.target.value), 1, 20)
                          }))
                        }
                      />
                    </label>
                    <label className="form-field">
                      <span className="form-label">Ancestry</span>
                      <select
                        className="form-input"
                        value={formState.ancestry}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            ancestry: event.target.value
                          }))
                        }
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
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            background: event.target.value
                          }))
                        }
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
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            alignment: event.target.value
                          }))
                        }
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
                          onChange={(event) =>
                            handleAbilityChange(ability, Number(event.target.value))
                          }
                        >
                          {pointBuyScores.map((score) => (
                            <option key={score} value={score}>
                              {score} ({getAbilityScoreCost(score)} pts)
                            </option>
                          ))}
                        </select>
                        <div className="ability-mod">
                          Final {derivedAbilities[ability]} (
                          {formatModifier(derivedAbilities[ability])})
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedAncestry?.bonusChoices ? (
                    <div className="form-grid" style={{ marginTop: "1rem" }}>
                      {Array.from({ length: selectedAncestry.bonusChoices.count }).map(
                        (_, index) => (
                          <label className="form-field" key={`bonus-${index}`}>
                            <span className="form-label">Bonus Choice {index + 1}</span>
                            <select
                              className="form-input"
                              value={normalizedBonusSelections[index] ?? ""}
                              onChange={(event) => {
                                const value = event.target.value as AbilityScore;
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
                        )
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="party-form-section">
                  <div className="party-form-header">
                    <div className="party-form-title">Derived Stats</div>
                    <label className="toggle-row">
                      <input
                        type="checkbox"
                        checked={autoDerived}
                        onChange={(event) => setAutoDerived(event.target.checked)}
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
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            hitPoints: Number(event.target.value)
                          }))
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
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            hitPointMax: Number(event.target.value)
                          }))
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
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            armorClass: Number(event.target.value)
                          }))
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
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            initiativeBonus: Number(event.target.value)
                          }))
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
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            speed: Number(event.target.value)
                          }))
                        }
                        disabled={autoDerived}
                      />
                    </label>
                  </div>
                </div>

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
                              onChange={(event) =>
                                handleInventoryChange(entry.entryId, {
                                  itemId: event.target.value
                                })
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
                              onChange={(event) =>
                                handleInventoryChange(entry.entryId, {
                                  quantity: Math.max(1, Number(event.target.value))
                                })
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span className="form-label">Attuned</span>
                            <input
                              type="checkbox"
                              checked={entry.attuned}
                              onChange={(event) =>
                                handleInventoryChange(entry.entryId, {
                                  attuned: event.target.checked
                                })
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
                              onChange={(event) =>
                                handleSpellChange(entry.entryId, {
                                  spellId: event.target.value
                                })
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
                              onChange={(event) =>
                                handleSpellChange(entry.entryId, {
                                  prepared: event.target.checked
                                })
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
                              onChange={(event) =>
                                handleSpellChange(entry.entryId, {
                                  slotsUsed: Math.max(0, Number(event.target.value))
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

                <div className="party-form-section">
                  <div className="party-form-title">Proficiencies</div>
                  <label className="form-field">
                    <span className="form-label">Comma-separated</span>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={formState.proficienciesText}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          proficienciesText: event.target.value
                        }))
                      }
                    />
                  </label>
                </div>

                {formError ? <span className="status-chip status-error">{formError}</span> : null}

                <div className="button-row">
                  <button className="ghost-button" onClick={handleCancel} disabled={isSaving}>
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
                    <button
                      className="primary-button"
                      onClick={handleSave}
                      disabled={!canSave || isSaving}
                    >
                      {isSaving ? "Saving..." : "Save Character"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function buildDefaultFormState(): CharacterFormState {
  const defaultAncestry = srdAncestries[0]?.name ?? "Human";
  const defaultClass = srdClasses[0]?.name ?? "Fighter";
  const defaultBackground = srdBackgrounds[0] ?? "Acolyte";
  const defaultAlignment = srdAlignments[0] ?? "Neutral";

  const derived = calculateDerivedStats({
    abilities: applyAncestryBonuses(defaultBaseAbilities, getAncestryByName(defaultAncestry), []),
    level: 1,
    className: defaultClass,
    ancestryName: defaultAncestry
  });

  return {
    name: "",
    role: "player",
    controlMode: "player",
    level: 1,
    className: defaultClass,
    ancestry: defaultAncestry,
    background: defaultBackground,
    alignment: defaultAlignment,
    baseAbilities: { ...defaultBaseAbilities },
    ancestryBonusSelections: [],
    hitPoints: derived.hitPoints,
    hitPointMax: derived.hitPointMax,
    armorClass: derived.armorClass,
    initiativeBonus: derived.initiativeBonus,
    speed: derived.speed,
    proficienciesText: "",
    inventory: [],
    spells: []
  };
}

function buildFormStateFromCharacter(character: Character): CharacterFormState {
  const ancestry = getAncestryByName(character.ancestry);
  const bonusSelections = character.ancestryBonusSelections ?? [];
  const baseAbilities = { ...character.abilities };
  if (ancestry) {
    for (const [ability, bonus] of Object.entries(ancestry.bonuses)) {
      const key = ability as AbilityScore;
      baseAbilities[key] = (baseAbilities[key] ?? 0) - (bonus ?? 0);
    }
    if (ancestry.bonusChoices) {
      for (const ability of bonusSelections) {
        baseAbilities[ability] = (baseAbilities[ability] ?? 0) - ancestry.bonusChoices.value;
      }
    }
  }

  return {
    name: character.name,
    role: character.role,
    controlMode: character.controlMode,
    level: character.level,
    className: character.className,
    ancestry: character.ancestry,
    background: character.background,
    alignment: character.alignment,
    baseAbilities,
    ancestryBonusSelections: [...bonusSelections],
    hitPoints: character.hitPoints,
    hitPointMax: character.hitPointMax,
    armorClass: character.armorClass,
    initiativeBonus: character.initiativeBonus,
    speed: character.speed,
    proficienciesText: character.proficiencies.join(", "),
    inventory: character.inventory.map((item) => ({
      entryId: item.id,
      itemId: item.itemId,
      quantity: item.quantity,
      attuned: item.attuned
    })),
    spells: character.spells.map((spell) => ({
      entryId: spell.id,
      spellId: spell.spellId,
      prepared: spell.prepared,
      slotsUsed: spell.slotsUsed
    }))
  };
}

function buildInputFromForm(
  formState: CharacterFormState,
  finalAbilities: Record<AbilityScore, number>,
  bonusSelections: AbilityScore[]
): NewCharacterInput {
  return {
    name: formState.name.trim(),
    role: formState.role,
    controlMode: formState.controlMode,
    level: formState.level,
    className: formState.className,
    ancestry: formState.ancestry,
    background: formState.background,
    alignment: formState.alignment,
    ancestryBonusSelections: [...bonusSelections],
    hitPoints: Math.min(formState.hitPoints, formState.hitPointMax),
    hitPointMax: formState.hitPointMax,
    armorClass: formState.armorClass,
    initiativeBonus: formState.initiativeBonus,
    speed: formState.speed,
    abilities: finalAbilities,
    proficiencies: formState.proficienciesText
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    inventory: formState.inventory
      .filter((entry) => entry.itemId)
      .map((entry) => ({
        itemId: entry.itemId,
        quantity: Math.max(1, Math.floor(entry.quantity)),
        attuned: entry.attuned
      })),
    spells: formState.spells
      .filter((entry) => entry.spellId)
      .map((entry) => ({
        spellId: entry.spellId,
        prepared: entry.prepared,
        slotsUsed: Math.max(0, Math.floor(entry.slotsUsed))
      }))
  };
}

function normalizeBonusSelections(
  selections: AbilityScore[],
  ancestry: ReturnType<typeof getAncestryByName>
): AbilityScore[] {
  if (!ancestry?.bonusChoices) {
    return [];
  }
  const next = [...selections.filter((entry) => ancestry.bonusChoices?.options.includes(entry))];
  while (next.length < ancestry.bonusChoices.count) {
    const fallback = ancestry.bonusChoices.options.find((option) => !next.includes(option));
    if (!fallback) {
      break;
    }
    next.push(fallback);
  }
  return next.slice(0, ancestry.bonusChoices.count);
}

function areBonusSelectionsValid(
  selections: AbilityScore[],
  ancestry: ReturnType<typeof getAncestryByName>
): boolean {
  if (!ancestry?.bonusChoices) {
    return true;
  }
  const unique = new Set(selections);
  return (
    selections.length === ancestry.bonusChoices.count &&
    unique.size === ancestry.bonusChoices.count &&
    selections.every((entry) => ancestry.bonusChoices?.options.includes(entry))
  );
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

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

function formatSpellSummary(spell: Character["spells"][number]): string {
  const levelLabel =
    typeof spell.level === "number" ? (spell.level === 0 ? "Cantrip" : `Lv ${spell.level}`) : "";
  const detail = [levelLabel, spell.school].filter(Boolean).join(" ");
  const prepared = spell.prepared ? "prepared" : "unprepared";
  return detail ? `${spell.name} (${detail}, ${prepared})` : `${spell.name} (${prepared})`;
}
