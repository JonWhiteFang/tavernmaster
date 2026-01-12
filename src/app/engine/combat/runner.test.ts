import { describe, expect, it } from "vitest";
import {
  applyCombatPatch,
  createInitialCombatState,
  getCurrentCombatant,
  isPlayerTurn,
  validateCombatPatch
} from "./runner";
import type { CombatState, Combatant } from "./types";

const goblin: Combatant = {
  id: "goblin-1",
  name: "Goblin",
  initiative: 15,
  hp: 7,
  maxHp: 7,
  ac: 13,
  isPlayer: false,
  isAlly: false,
  conditions: []
};

const player: Combatant = {
  id: "player-1",
  name: "Hero",
  initiative: 18,
  hp: 25,
  maxHp: 25,
  ac: 16,
  isPlayer: true,
  isAlly: false,
  conditions: []
};

describe("combat runner", () => {
  describe("validateCombatPatch", () => {
    it("validates correct patch", () => {
      const result = validateCombatPatch({ startCombat: true });
      expect(result.valid).toBe(true);
    });

    it("rejects invalid patch", () => {
      const result = validateCombatPatch({ hpChanges: "invalid" });
      expect(result.valid).toBe(false);
    });
  });

  describe("applyCombatPatch", () => {
    it("starts combat", () => {
      const state = createInitialCombatState();
      const newState = applyCombatPatch(state, { startCombat: true });
      expect(newState.active).toBe(true);
      expect(newState.round).toBe(1);
    });

    it("ends combat", () => {
      const state: CombatState = { active: true, round: 3, turnIndex: 1, combatants: [player] };
      const newState = applyCombatPatch(state, { endCombat: true });
      expect(newState.active).toBe(false);
    });

    it("adds combatants sorted by initiative", () => {
      const state = createInitialCombatState();
      const newState = applyCombatPatch(state, { addCombatants: [goblin, player] });
      expect(newState.combatants).toHaveLength(2);
      expect(newState.combatants[0].id).toBe("player-1"); // Higher initiative
    });

    it("removes combatants", () => {
      const state: CombatState = {
        active: true,
        round: 1,
        turnIndex: 0,
        combatants: [player, goblin]
      };
      const newState = applyCombatPatch(state, { removeCombatantIds: ["goblin-1"] });
      expect(newState.combatants).toHaveLength(1);
    });

    it("applies HP changes with bounds", () => {
      const state: CombatState = {
        active: true,
        round: 1,
        turnIndex: 0,
        combatants: [{ ...player, hp: 10 }]
      };
      const newState = applyCombatPatch(state, { hpChanges: [{ id: "player-1", delta: -15 }] });
      expect(newState.combatants[0].hp).toBe(0); // Clamped to 0

      const healState = applyCombatPatch(newState, { hpChanges: [{ id: "player-1", delta: 100 }] });
      expect(healState.combatants[0].hp).toBe(25); // Clamped to maxHp
    });

    it("modifies conditions", () => {
      const state: CombatState = {
        active: true,
        round: 1,
        turnIndex: 0,
        combatants: [{ ...player, conditions: ["poisoned"] }]
      };
      const newState = applyCombatPatch(state, {
        conditionChanges: [{ id: "player-1", add: ["stunned"], remove: ["poisoned"] }]
      });
      expect(newState.combatants[0].conditions).toEqual(["stunned"]);
    });

    it("advances turn and round", () => {
      const state: CombatState = {
        active: true,
        round: 1,
        turnIndex: 0,
        combatants: [player, goblin]
      };
      let newState = applyCombatPatch(state, { advanceTurn: true });
      expect(newState.turnIndex).toBe(1);
      expect(newState.round).toBe(1);

      newState = applyCombatPatch(newState, { advanceTurn: true });
      expect(newState.turnIndex).toBe(0);
      expect(newState.round).toBe(2);
    });
  });

  describe("getCurrentCombatant", () => {
    it("returns current combatant", () => {
      const state: CombatState = {
        active: true,
        round: 1,
        turnIndex: 1,
        combatants: [player, goblin]
      };
      expect(getCurrentCombatant(state)?.id).toBe("goblin-1");
    });

    it("returns null when not in combat", () => {
      const state = createInitialCombatState();
      expect(getCurrentCombatant(state)).toBeNull();
    });
  });

  describe("isPlayerTurn", () => {
    it("returns true on player turn", () => {
      const state: CombatState = {
        active: true,
        round: 1,
        turnIndex: 0,
        combatants: [player, goblin]
      };
      expect(isPlayerTurn(state)).toBe(true);
    });

    it("returns false on enemy turn", () => {
      const state: CombatState = {
        active: true,
        round: 1,
        turnIndex: 1,
        combatants: [player, goblin]
      };
      expect(isPlayerTurn(state)).toBe(false);
    });
  });
});
