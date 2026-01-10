import type { NewCharacterInput } from "../data/characters";
import type { SrdClass, SrdRace, AbilityKey } from "./types";
import type { CharacterCreationState, AbilityScores } from "./state";
import { finalAbilityScores } from "./state";
import { abilityModifier } from "../rules/characterCreation";

export function applyRacialBonuses(scores: AbilityScores, race: SrdRace | null): AbilityScores {
  if (!race) return { ...scores };
  const result = { ...scores };
  for (const [key, bonus] of Object.entries(race.abilityBonuses)) {
    result[key as AbilityKey] += bonus ?? 0;
  }
  return result;
}

export function deriveVitals(input: {
  level: number;
  srdClass: SrdClass | null;
  race: SrdRace | null;
  scores: AbilityScores;
}): {
  hitPoints: number;
  hitPointMax: number;
  armorClass: number;
  initiativeBonus: number;
  speed: number;
} {
  const { level, srdClass, race, scores } = input;
  const hitDie = srdClass?.hitDie ?? 8;
  const conMod = abilityModifier(scores.con);
  const dexMod = abilityModifier(scores.dex);
  const averageHit = Math.floor(hitDie / 2) + 1;
  const hitPointMax = Math.max(1, hitDie + conMod + (level - 1) * (averageHit + conMod));

  return {
    hitPoints: hitPointMax,
    hitPointMax,
    armorClass: 10 + dexMod,
    initiativeBonus: dexMod,
    speed: race?.speed ?? 30
  };
}

export function buildNewCharacterInput(state: CharacterCreationState): NewCharacterInput {
  const baseScores = finalAbilityScores(state);
  const abilities = applyRacialBonuses(baseScores, state.selectedRace);
  const vitals = deriveVitals({
    level: 1,
    srdClass: state.selectedClass,
    race: state.selectedRace,
    scores: abilities
  });

  return {
    name: state.name,
    role: "player",
    controlMode: "player",
    level: 1,
    className: state.selectedClass?.name ?? "",
    ancestry: state.selectedRace?.name ?? "",
    background: state.selectedBackground?.name ?? "",
    alignment: state.alignment,
    ancestryBonusSelections: [],
    ...vitals,
    abilities,
    proficiencies: state.selectedBackground?.skillProficiencies ?? [],
    inventory: [],
    spells: []
  };
}
