import { describe, expect, it } from "vitest";
import {
  reducer,
  initialState,
  canProceed,
  canGoBack,
  finalAbilityScores,
  remainingPointBuyPoints,
  unassignedScores,
  allScoresAssigned,
  type CharacterCreationState
} from "./state";
import { STANDARD_ARRAY, POINT_BUY_BUDGET } from "../rules/characterCreation";

describe("character creation state", () => {
  describe("initial state", () => {
    it("starts on ability step with standard method", () => {
      expect(initialState.step).toBe("ability");
      expect(initialState.abilityMethod).toBe("standard");
      expect(initialState.rolledScores).toEqual([...STANDARD_ARRAY]);
    });
  });

  describe("ability method switching", () => {
    it("resets assignments when switching to standard", () => {
      const state: CharacterCreationState = {
        ...initialState,
        abilityMethod: "rolling",
        assignments: { str: 0, dex: 1, con: 2, int: 3, wis: 4, cha: 5 }
      };
      const next = reducer(state, { type: "SET_ABILITY_METHOD", method: "standard" });
      expect(next.abilityMethod).toBe("standard");
      expect(next.rolledScores).toEqual([...STANDARD_ARRAY]);
      expect(next.assignments.str).toBe(-1);
    });

    it("preserves rolled scores when switching to rolling", () => {
      const state: CharacterCreationState = {
        ...initialState,
        rolledScores: [16, 14, 13, 12, 11, 9]
      };
      const next = reducer(state, { type: "SET_ABILITY_METHOD", method: "rolling" });
      expect(next.rolledScores).toEqual([16, 14, 13, 12, 11, 9]);
    });
  });

  describe("score assignment", () => {
    it("assigns a score to an ability", () => {
      const next = reducer(initialState, { type: "ASSIGN_SCORE", ability: "str", scoreIndex: 0 });
      expect(next.assignments.str).toBe(0);
    });

    it("clears previous assignment when reassigning same score", () => {
      let state = reducer(initialState, { type: "ASSIGN_SCORE", ability: "str", scoreIndex: 0 });
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "dex", scoreIndex: 0 });
      expect(state.assignments.str).toBe(-1);
      expect(state.assignments.dex).toBe(0);
    });

    it("tracks unassigned scores", () => {
      let state = reducer(initialState, { type: "ASSIGN_SCORE", ability: "str", scoreIndex: 0 });
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "dex", scoreIndex: 1 });
      const unassigned = unassignedScores(state);
      expect(unassigned).toHaveLength(4);
      expect(unassigned).not.toContain(15); // index 0
      expect(unassigned).not.toContain(14); // index 1
    });

    it("reports all scores assigned correctly", () => {
      let state = initialState;
      expect(allScoresAssigned(state)).toBe(false);
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "str", scoreIndex: 0 });
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "dex", scoreIndex: 1 });
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "con", scoreIndex: 2 });
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "int", scoreIndex: 3 });
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "wis", scoreIndex: 4 });
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "cha", scoreIndex: 5 });
      expect(allScoresAssigned(state)).toBe(true);
    });
  });

  describe("point buy", () => {
    it("clamps scores to 8-15 range", () => {
      let state = reducer(initialState, { type: "SET_ABILITY_METHOD", method: "pointBuy" });
      state = reducer(state, { type: "SET_POINT_BUY_SCORE", ability: "str", value: 20 });
      expect(state.pointBuyScores.str).toBe(15);
      state = reducer(state, { type: "SET_POINT_BUY_SCORE", ability: "str", value: 5 });
      expect(state.pointBuyScores.str).toBe(8);
    });

    it("calculates remaining points", () => {
      const state: CharacterCreationState = {
        ...initialState,
        abilityMethod: "pointBuy",
        pointBuyScores: { str: 15, dex: 15, con: 8, int: 8, wis: 8, cha: 8 }
      };
      // 15 costs 9, so 9+9 = 18 spent, 27-18 = 9 remaining
      expect(remainingPointBuyPoints(state)).toBe(POINT_BUY_BUDGET - 18);
    });
  });

  describe("finalAbilityScores", () => {
    it("returns assigned scores for standard/rolling", () => {
      let state = initialState;
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "str", scoreIndex: 0 });
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "dex", scoreIndex: 1 });
      const scores = finalAbilityScores(state);
      expect(scores.str).toBe(15);
      expect(scores.dex).toBe(14);
      expect(scores.con).toBe(8); // unassigned defaults to 8
    });

    it("returns point buy scores directly", () => {
      const state: CharacterCreationState = {
        ...initialState,
        abilityMethod: "pointBuy",
        pointBuyScores: { str: 10, dex: 12, con: 14, int: 8, wis: 10, cha: 8 }
      };
      const scores = finalAbilityScores(state);
      expect(scores).toEqual({ str: 10, dex: 12, con: 14, int: 8, wis: 10, cha: 8 });
    });
  });

  describe("step navigation", () => {
    it("cannot proceed from ability step without all scores assigned", () => {
      expect(canProceed(initialState)).toBe(false);
    });

    it("can proceed from ability step when all scores assigned", () => {
      let state = initialState;
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "str", scoreIndex: 0 });
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "dex", scoreIndex: 1 });
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "con", scoreIndex: 2 });
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "int", scoreIndex: 3 });
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "wis", scoreIndex: 4 });
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "cha", scoreIndex: 5 });
      expect(canProceed(state)).toBe(true);
    });

    it("can proceed from ability step with valid point buy", () => {
      const state: CharacterCreationState = {
        ...initialState,
        abilityMethod: "pointBuy"
      };
      expect(canProceed(state)).toBe(true); // all 8s = 0 points spent
    });

    it("cannot proceed from class step without selection", () => {
      const state: CharacterCreationState = { ...initialState, step: "class" };
      expect(canProceed(state)).toBe(false);
    });

    it("can proceed from class step with selection", () => {
      const state: CharacterCreationState = {
        ...initialState,
        step: "class",
        selectedClass: { id: "class-fighter", name: "Fighter", hitDie: 10 }
      };
      expect(canProceed(state)).toBe(true);
    });

    it("cannot proceed from confirm step without name", () => {
      const state: CharacterCreationState = {
        ...initialState,
        step: "confirm",
        selectedClass: { id: "class-fighter", name: "Fighter", hitDie: 10 },
        selectedRace: { id: "race-human", name: "Human", speed: 30, abilityBonuses: {} },
        selectedBackground: { id: "bg-soldier", name: "Soldier", skillProficiencies: [] }
      };
      expect(canProceed(state)).toBe(false);
    });

    it("can proceed from confirm step with name", () => {
      const state: CharacterCreationState = {
        ...initialState,
        step: "confirm",
        name: "Thorin",
        selectedClass: { id: "class-fighter", name: "Fighter", hitDie: 10 },
        selectedRace: { id: "race-human", name: "Human", speed: 30, abilityBonuses: {} },
        selectedBackground: { id: "bg-soldier", name: "Soldier", skillProficiencies: [] }
      };
      expect(canProceed(state)).toBe(true);
    });

    it("advances step on NEXT_STEP when canProceed", () => {
      let state: CharacterCreationState = {
        ...initialState,
        step: "class",
        selectedClass: { id: "class-fighter", name: "Fighter", hitDie: 10 }
      };
      state = reducer(state, { type: "NEXT_STEP" });
      expect(state.step).toBe("race");
    });

    it("does not advance step on NEXT_STEP when cannot proceed", () => {
      const state = reducer(initialState, { type: "NEXT_STEP" });
      expect(state.step).toBe("ability");
    });

    it("goes back on PREV_STEP", () => {
      let state: CharacterCreationState = { ...initialState, step: "class" };
      state = reducer(state, { type: "PREV_STEP" });
      expect(state.step).toBe("ability");
    });

    it("cannot go back from first step", () => {
      expect(canGoBack(initialState)).toBe(false);
      const state = reducer(initialState, { type: "PREV_STEP" });
      expect(state.step).toBe("ability");
    });

    it("can go back from later steps", () => {
      const state: CharacterCreationState = { ...initialState, step: "race" };
      expect(canGoBack(state)).toBe(true);
    });
  });

  describe("data preservation", () => {
    it("preserves selections across step navigation", () => {
      let state: CharacterCreationState = {
        ...initialState,
        step: "class",
        selectedClass: { id: "class-fighter", name: "Fighter", hitDie: 10 }
      };
      state = reducer(state, { type: "NEXT_STEP" });
      state = reducer(state, { type: "PREV_STEP" });
      expect(state.selectedClass?.name).toBe("Fighter");
    });

    it("preserves ability assignments across method switch back", () => {
      let state = initialState;
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "str", scoreIndex: 0 });
      state = reducer(state, { type: "SET_ABILITY_METHOD", method: "pointBuy" });
      state = reducer(state, { type: "SET_ABILITY_METHOD", method: "standard" });
      // Assignments reset on method switch
      expect(state.assignments.str).toBe(-1);
    });
  });

  describe("rolled scores", () => {
    it("accepts new rolled scores and resets assignments", () => {
      let state = initialState;
      state = reducer(state, { type: "ASSIGN_SCORE", ability: "str", scoreIndex: 0 });
      state = reducer(state, { type: "SET_ROLLED_SCORES", scores: [18, 16, 14, 12, 10, 8] });
      expect(state.rolledScores).toEqual([18, 16, 14, 12, 10, 8]);
      expect(state.assignments.str).toBe(-1);
    });
  });
});
