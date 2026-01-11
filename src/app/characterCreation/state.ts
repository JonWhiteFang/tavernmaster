import type { AbilityKey, SrdClass, SrdRace, SrdBackground } from "./types";
import {
  STANDARD_ARRAY,
  POINT_BUY_BUDGET,
  getPointBuyTotal,
  abilityOrder
} from "../rules/characterCreation";

export type AbilityMethod = "standard" | "pointBuy" | "rolling";

export type CreationStep = "ability" | "class" | "race" | "background" | "equipment" | "confirm";

export type AbilityScores = Record<AbilityKey, number>;

export interface CharacterCreationState {
  step: CreationStep;
  abilityMethod: AbilityMethod;
  // For standard/rolling: pool of scores to assign
  rolledScores: number[];
  // Assignments: which score goes to which ability (index into rolledScores, or -1 if unassigned)
  assignments: Record<AbilityKey, number>;
  // For point buy: direct scores
  pointBuyScores: AbilityScores;
  selectedClass: SrdClass | null;
  selectedRace: SrdRace | null;
  selectedBackground: SrdBackground | null;
  name: string;
  alignment: string;
}

export const initialState: CharacterCreationState = {
  step: "ability",
  abilityMethod: "standard",
  rolledScores: [...STANDARD_ARRAY],
  assignments: { str: -1, dex: -1, con: -1, int: -1, wis: -1, cha: -1 },
  pointBuyScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 },
  selectedClass: null,
  selectedRace: null,
  selectedBackground: null,
  name: "",
  alignment: "Neutral"
};

export type CharacterCreationAction =
  | { type: "SET_ABILITY_METHOD"; method: AbilityMethod }
  | { type: "SET_ROLLED_SCORES"; scores: number[] }
  | { type: "ASSIGN_SCORE"; ability: AbilityKey; scoreIndex: number }
  | { type: "SET_POINT_BUY_SCORE"; ability: AbilityKey; value: number }
  | { type: "SELECT_CLASS"; srdClass: SrdClass }
  | { type: "SELECT_RACE"; race: SrdRace }
  | { type: "SELECT_BACKGROUND"; background: SrdBackground }
  | { type: "SET_NAME"; name: string }
  | { type: "SET_ALIGNMENT"; alignment: string }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" };

const stepOrder: CreationStep[] = [
  "ability",
  "class",
  "race",
  "background",
  "equipment",
  "confirm"
];

export function reducer(
  state: CharacterCreationState,
  action: CharacterCreationAction
): CharacterCreationState {
  switch (action.type) {
    case "SET_ABILITY_METHOD": {
      const newScores = action.method === "standard" ? [...STANDARD_ARRAY] : state.rolledScores;
      return {
        ...state,
        abilityMethod: action.method,
        rolledScores: newScores,
        assignments: { str: -1, dex: -1, con: -1, int: -1, wis: -1, cha: -1 }
      };
    }
    case "SET_ROLLED_SCORES":
      return {
        ...state,
        rolledScores: action.scores,
        assignments: { str: -1, dex: -1, con: -1, int: -1, wis: -1, cha: -1 }
      };
    case "ASSIGN_SCORE": {
      const newAssignments = { ...state.assignments };
      // Clear any existing assignment of this score index
      for (const key of abilityOrder) {
        if (newAssignments[key] === action.scoreIndex) {
          newAssignments[key] = -1;
        }
      }
      newAssignments[action.ability] = action.scoreIndex;
      return { ...state, assignments: newAssignments };
    }
    case "SET_POINT_BUY_SCORE": {
      const clamped = Math.max(8, Math.min(15, action.value));
      return {
        ...state,
        pointBuyScores: { ...state.pointBuyScores, [action.ability]: clamped }
      };
    }
    case "SELECT_CLASS":
      return { ...state, selectedClass: action.srdClass };
    case "SELECT_RACE":
      return { ...state, selectedRace: action.race };
    case "SELECT_BACKGROUND":
      return { ...state, selectedBackground: action.background };
    case "SET_NAME":
      return { ...state, name: action.name };
    case "SET_ALIGNMENT":
      return { ...state, alignment: action.alignment };
    case "NEXT_STEP": {
      const idx = stepOrder.indexOf(state.step);
      if (idx < stepOrder.length - 1 && canProceed(state)) {
        return { ...state, step: stepOrder[idx + 1] };
      }
      return state;
    }
    case "PREV_STEP": {
      const idx = stepOrder.indexOf(state.step);
      if (idx > 0) {
        return { ...state, step: stepOrder[idx - 1] };
      }
      return state;
    }
  }
}

// Selectors

export function finalAbilityScores(state: CharacterCreationState): AbilityScores {
  if (state.abilityMethod === "pointBuy") {
    return { ...state.pointBuyScores };
  }
  const scores: AbilityScores = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
  for (const ability of abilityOrder) {
    const idx = state.assignments[ability];
    if (idx >= 0 && idx < state.rolledScores.length) {
      scores[ability] = state.rolledScores[idx];
    }
  }
  return scores;
}

export function remainingPointBuyPoints(state: CharacterCreationState): number {
  return POINT_BUY_BUDGET - getPointBuyTotal(state.pointBuyScores);
}

export function unassignedScores(state: CharacterCreationState): number[] {
  const usedIndices = new Set(Object.values(state.assignments).filter((i) => i >= 0));
  return state.rolledScores.filter((_, i) => !usedIndices.has(i));
}

export function allScoresAssigned(state: CharacterCreationState): boolean {
  return abilityOrder.every((a) => state.assignments[a] >= 0);
}

export function canProceed(state: CharacterCreationState): boolean {
  switch (state.step) {
    case "ability":
      if (state.abilityMethod === "pointBuy") {
        return remainingPointBuyPoints(state) >= 0;
      }
      return allScoresAssigned(state);
    case "class":
      return state.selectedClass !== null;
    case "race":
      return state.selectedRace !== null;
    case "background":
      return state.selectedBackground !== null;
    case "equipment":
      return true;
    case "confirm":
      return state.name.trim().length > 0;
  }
}

export function canGoBack(state: CharacterCreationState): boolean {
  return stepOrder.indexOf(state.step) > 0;
}
