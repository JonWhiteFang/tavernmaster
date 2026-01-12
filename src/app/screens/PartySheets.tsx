import { useCallback, useEffect, useMemo, useState } from "react";
import type { AbilityScore, Character } from "../data/types";
import type { NewCharacterInput } from "../data/characters";
import {
  createCharacter,
  deleteCharacter,
  listCharacters,
  updateCharacter
} from "../data/characters";
import { getPlayerCharacterId, setPlayerCharacter } from "../data/campaign_player";
import type { SrdRecord } from "../data/srd_queries";
import { querySrd } from "../data/srd_queries";
import {
  applyAncestryBonuses,
  calculateDerivedStats,
  getAncestryByName,
  getPointBuyTotal
} from "../rules/characterCreation";
import { useAppContext } from "../state/AppContext";
import { logger } from "../utils/logger";
import CharacterCreationModal from "../ui/characterCreation/CharacterCreationModal";
import type { CharacterCreationState } from "../characterCreation/state";
import { buildNewCharacterInput } from "../characterCreation/builder";
import CharacterList from "./party/CharacterList";
import CharacterDetail from "./party/CharacterDetail";
import CharacterForm from "./party/CharacterForm";
import type { CharacterFormState } from "../hooks/useCharacterForm";

type FormMode = "view" | "create" | "edit";

const POINT_BUY_BUDGET = 27;

const defaultBaseAbilities: Record<AbilityScore, number> = {
  str: 15,
  dex: 14,
  con: 13,
  int: 12,
  wis: 10,
  cha: 8
};

function buildDefaultFormState(): CharacterFormState {
  return {
    name: "",
    role: "player",
    controlMode: "player",
    level: 1,
    className: "Fighter",
    ancestry: "Human",
    background: "Acolyte",
    alignment: "Neutral",
    baseAbilities: { ...defaultBaseAbilities },
    ancestryBonusSelections: [],
    hitPoints: 10,
    hitPointMax: 10,
    armorClass: 10,
    initiativeBonus: 0,
    speed: 30,
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

function normalizeBonusSelections(
  selections: AbilityScore[],
  ancestry: ReturnType<typeof getAncestryByName>
): AbilityScore[] {
  if (!ancestry?.bonusChoices) return [];
  const next = [...selections.filter((e) => ancestry.bonusChoices?.options.includes(e))];
  while (next.length < ancestry.bonusChoices.count) {
    const fallback = ancestry.bonusChoices.options.find((o) => !next.includes(o));
    if (!fallback) break;
    next.push(fallback);
  }
  return next.slice(0, ancestry.bonusChoices.count);
}

function areBonusSelectionsValid(
  selections: AbilityScore[],
  ancestry: ReturnType<typeof getAncestryByName>
): boolean {
  if (!ancestry?.bonusChoices) return true;
  const unique = new Set(selections);
  return (
    selections.length === ancestry.bonusChoices.count &&
    unique.size === ancestry.bonusChoices.count &&
    selections.every((e) => ancestry.bonusChoices?.options.includes(e))
  );
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
      .map((e) => e.trim())
      .filter(Boolean),
    inventory: formState.inventory
      .filter((e) => e.itemId)
      .map((e) => ({
        itemId: e.itemId,
        quantity: Math.max(1, Math.floor(e.quantity)),
        attuned: e.attuned
      })),
    spells: formState.spells
      .filter((e) => e.spellId)
      .map((e) => ({
        spellId: e.spellId,
        prepared: e.prepared,
        slotsUsed: Math.max(0, Math.floor(e.slotsUsed))
      }))
  };
}

export default function PartySheets() {
  const { activeCampaign } = useAppContext();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playerCharacterId, setPlayerCharacterId] = useState<string | null>(null);
  const [mode, setMode] = useState<FormMode>("view");
  const [formState, setFormState] = useState<CharacterFormState>(buildDefaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoDerived, setAutoDerived] = useState(true);
  const [srdItems, setSrdItems] = useState<SrdRecord[]>([]);
  const [srdSpells, setSrdSpells] = useState<SrdRecord[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  const loadCharacters = useCallback(async (preferredId?: string) => {
    const data = await listCharacters();
    setCharacters(data);
    if (!data.length) {
      setActiveId(null);
      return;
    }
    const resolvedId =
      preferredId && data.some((c) => c.id === preferredId) ? preferredId : data[0].id;
    setActiveId(resolvedId);
  }, []);

  useEffect(() => {
    void loadCharacters();
  }, [loadCharacters]);

  useEffect(() => {
    if (!activeCampaign?.id) {
      setPlayerCharacterId(null);
      return;
    }
    void getPlayerCharacterId(activeCampaign.id).then(setPlayerCharacterId);
  }, [activeCampaign?.id]);

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
    () => characters.find((c) => c.id === activeId) ?? null,
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
  const pointBuyRemaining = POINT_BUY_BUDGET - pointBuyUsed;

  const canSave =
    formState.name.trim().length > 0 &&
    formState.className.trim().length > 0 &&
    formState.ancestry.trim().length > 0 &&
    formState.background.trim().length > 0 &&
    formState.alignment.trim().length > 0 &&
    pointBuyUsed <= POINT_BUY_BUDGET &&
    areBonusSelectionsValid(normalizedBonusSelections, selectedAncestry);

  useEffect(() => {
    if (!autoDerived) return;
    setFormState((c) => ({
      ...c,
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
      !normalizedBonusSelections.every((v, i) => v === formState.ancestryBonusSelections[i])
    ) {
      setFormState((c) => ({ ...c, ancestryBonusSelections: normalizedBonusSelections }));
    }
  }, [normalizedBonusSelections, formState.ancestryBonusSelections]);

  const handleStartCreate = () => {
    setMode("create");
    setFormState(buildDefaultFormState());
    setFormError(null);
    setAutoDerived(true);
  };

  const handleStartEdit = () => {
    if (!activeCharacter) return;
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
    if (!canSave || isSaving) return;
    const isNew = mode === "create";
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
      if (isNew) {
        window.dispatchEvent(new globalThis.CustomEvent("tm.tutorial.character-created"));
      }
      setMode("view");
    } catch (error) {
      logger.error("Failed to save character", error, "PartySheets");
      setFormError("Failed to save character. Check the console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeCharacter) return;
    if (!window.confirm(`Delete ${activeCharacter.name}? This cannot be undone.`)) return;
    try {
      await deleteCharacter(activeCharacter.id);
      await loadCharacters();
      setMode("view");
    } catch (error) {
      logger.error("Failed to delete character", error, "PartySheets");
      setFormError("Failed to delete character. Check the console for details.");
    }
  };

  const handleWizardComplete = async (wizardState: CharacterCreationState) => {
    try {
      const input = buildNewCharacterInput(wizardState);
      const saved = await createCharacter(input);
      await loadCharacters(saved.id);
      setWizardOpen(false);
      window.dispatchEvent(new globalThis.CustomEvent("tm.tutorial.character-created"));
    } catch (error) {
      logger.error("Failed to create character", error, "PartySheets");
      console.error("Character creation failed:", error);
    }
  };

  const handleSetAsPlayer = async () => {
    if (!activeCampaign?.id || !activeId) return;
    try {
      await setPlayerCharacter(activeCampaign.id, activeId);
      setPlayerCharacterId(activeId);
    } catch (error) {
      logger.error("Failed to set player character", error, "PartySheets");
    }
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
        <CharacterList
          characters={characters}
          activeId={activeId}
          onSelect={setActiveId}
          onWizard={() => setWizardOpen(true)}
          onManual={handleStartCreate}
          disabled={mode !== "view"}
        />

        <section className="panel party-detail">
          {mode === "view" ? (
            activeCharacter ? (
              <CharacterDetail
                character={activeCharacter}
                isPlayerCharacter={activeCharacter.id === playerCharacterId}
                onEdit={handleStartEdit}
                onDelete={handleDelete}
                onSetAsPlayer={activeCampaign?.id ? handleSetAsPlayer : undefined}
              />
            ) : (
              <>
                <div className="panel-header">
                  <div className="panel-title">Character Detail</div>
                </div>
                <div className="panel-body">
                  <div className="panel-copy">Select a party member to view their sheet.</div>
                </div>
              </>
            )
          ) : (
            <CharacterForm
              formState={formState}
              setFormState={setFormState}
              derivedAbilities={derivedAbilities}
              normalizedBonusSelections={normalizedBonusSelections}
              selectedAncestry={selectedAncestry}
              pointBuyRemaining={pointBuyRemaining}
              autoDerived={autoDerived}
              setAutoDerived={setAutoDerived}
              srdItems={srdItems}
              srdSpells={srdSpells}
              formError={formError}
              canSave={canSave}
              isSaving={isSaving}
              isEdit={mode === "edit"}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}
        </section>
      </div>

      <CharacterCreationModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
        rulesetVersion={activeCampaign?.rulesetVersion}
      />
    </div>
  );
}
