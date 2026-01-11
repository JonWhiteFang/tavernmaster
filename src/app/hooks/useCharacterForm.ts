import { useCallback, useEffect, useMemo, useState } from "react";
import type { AbilityScore, Character, CharacterControl, CharacterRole } from "../data/types";
import type { NewCharacterInput } from "../data/characters";
import {
  applyAncestryBonuses,
  calculateDerivedStats,
  getAncestryByName,
  getPointBuyTotal
} from "../rules/characterCreation";

export type InventoryEntryForm = {
  entryId: string;
  itemId: string;
  quantity: number;
  attuned: boolean;
};

export type SpellEntryForm = {
  entryId: string;
  spellId: string;
  prepared: boolean;
  slotsUsed: number;
};

export type CharacterFormState = {
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

export type FormMode = "view" | "create" | "edit";

const POINT_BUY_BUDGET = 27;

const DEFAULT_BASE_ABILITIES: Record<AbilityScore, number> = {
  str: 15,
  dex: 14,
  con: 13,
  int: 12,
  wis: 10,
  cha: 8
};

export function buildDefaultFormState(): CharacterFormState {
  return {
    name: "",
    role: "player",
    controlMode: "player",
    level: 1,
    className: "Fighter",
    ancestry: "Human",
    background: "Acolyte",
    alignment: "Neutral",
    baseAbilities: { ...DEFAULT_BASE_ABILITIES },
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

export function buildFormStateFromCharacter(character: Character): CharacterFormState {
  return {
    name: character.name,
    role: character.role,
    controlMode: character.controlMode,
    level: character.level,
    className: character.className,
    ancestry: character.ancestry,
    background: character.background,
    alignment: character.alignment,
    baseAbilities: { ...character.abilities },
    ancestryBonusSelections: [...character.ancestryBonusSelections],
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
  const count = ancestry.bonusChoices.count;
  if (selections.length === count) return selections;
  if (selections.length > count) return selections.slice(0, count);
  const defaults: AbilityScore[] = ["str", "dex", "con", "int", "wis", "cha"];
  const result = [...selections];
  for (const ability of defaults) {
    if (result.length >= count) break;
    if (!result.includes(ability)) result.push(ability);
  }
  return result;
}

export function areBonusSelectionsValid(
  selections: AbilityScore[],
  ancestry: ReturnType<typeof getAncestryByName>
): boolean {
  if (!ancestry?.bonusChoices) return true;
  return selections.length === ancestry.bonusChoices.count;
}

export function buildInputFromForm(
  form: CharacterFormState,
  derivedAbilities: Record<AbilityScore, number>,
  bonusSelections: AbilityScore[]
): NewCharacterInput {
  return {
    name: form.name.trim(),
    role: form.role,
    controlMode: form.controlMode,
    level: form.level,
    className: form.className,
    ancestry: form.ancestry,
    background: form.background,
    alignment: form.alignment,
    abilities: derivedAbilities,
    ancestryBonusSelections: bonusSelections,
    hitPoints: form.hitPoints,
    hitPointMax: form.hitPointMax,
    armorClass: form.armorClass,
    initiativeBonus: form.initiativeBonus,
    speed: form.speed,
    proficiencies: form.proficienciesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    inventory: form.inventory.map((entry) => ({
      itemId: entry.itemId,
      quantity: entry.quantity,
      attuned: entry.attuned
    })),
    spells: form.spells.map((entry) => ({
      spellId: entry.spellId,
      prepared: entry.prepared,
      slotsUsed: entry.slotsUsed
    }))
  };
}

export function useCharacterForm(_activeCharacter: Character | null) {
  const [formState, setFormState] = useState<CharacterFormState>(buildDefaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [autoDerived, setAutoDerived] = useState(true);

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

  // Auto-derive stats when enabled
  useEffect(() => {
    if (!autoDerived) return;
    setFormState((current) => ({
      ...current,
      hitPoints: derivedStats.hitPoints,
      hitPointMax: derivedStats.hitPointMax,
      armorClass: derivedStats.armorClass,
      initiativeBonus: derivedStats.initiativeBonus,
      speed: derivedStats.speed
    }));
  }, [autoDerived, derivedStats]);

  // Sync bonus selections
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

  const resetToDefault = useCallback(() => {
    setFormState(buildDefaultFormState());
    setFormError(null);
    setAutoDerived(true);
  }, []);

  const resetToCharacter = useCallback((character: Character) => {
    setFormState(buildFormStateFromCharacter(character));
    setFormError(null);
    setAutoDerived(false);
  }, []);

  const setField = useCallback(
    <K extends keyof CharacterFormState>(key: K, value: CharacterFormState[K]) => {
      setFormState((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const setAbility = useCallback((ability: AbilityScore, value: number) => {
    setFormState((current) => ({
      ...current,
      baseAbilities: { ...current.baseAbilities, [ability]: value }
    }));
  }, []);

  return {
    formState,
    setFormState,
    formError,
    setFormError,
    autoDerived,
    setAutoDerived,
    selectedAncestry,
    normalizedBonusSelections,
    derivedAbilities,
    derivedStats,
    pointBuyUsed,
    pointBuyRemaining,
    canSave,
    resetToDefault,
    resetToCharacter,
    setField,
    setAbility
  };
}
