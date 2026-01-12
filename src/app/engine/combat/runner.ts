import type { CombatState, CombatPatch, Combatant } from "./types";
import { CombatPatchSchema } from "./types";

export function createInitialCombatState(): CombatState {
  return { active: false, round: 1, turnIndex: 0, combatants: [] };
}

export function validateCombatPatch(patch: unknown): { valid: boolean; error?: string } {
  const result = CombatPatchSchema.safeParse(patch);
  if (!result.success) {
    return { valid: false, error: result.error.message };
  }
  return { valid: true };
}

export function applyCombatPatch(state: CombatState, patch: CombatPatch): CombatState {
  let newState = { ...state, combatants: [...state.combatants] };

  if (patch.startCombat) {
    newState.active = true;
    newState.round = 1;
    newState.turnIndex = 0;
  }

  if (patch.endCombat) {
    newState.active = false;
  }

  if (patch.addCombatants) {
    const existing = new Set(newState.combatants.map((c) => c.id));
    const toAdd = patch.addCombatants.filter((c) => !existing.has(c.id));
    newState.combatants = [...newState.combatants, ...toAdd].sort(
      (a, b) => b.initiative - a.initiative
    );
  }

  if (patch.removeCombatantIds) {
    const toRemove = new Set(patch.removeCombatantIds);
    newState.combatants = newState.combatants.filter((c) => !toRemove.has(c.id));
  }

  if (patch.hpChanges) {
    for (const change of patch.hpChanges) {
      const idx = newState.combatants.findIndex((c) => c.id === change.id);
      if (idx !== -1) {
        const combatant = newState.combatants[idx];
        const newHp = Math.max(0, Math.min(combatant.maxHp, combatant.hp + change.delta));
        newState.combatants[idx] = { ...combatant, hp: newHp };
      }
    }
  }

  if (patch.conditionChanges) {
    for (const change of patch.conditionChanges) {
      const idx = newState.combatants.findIndex((c) => c.id === change.id);
      if (idx !== -1) {
        const combatant = newState.combatants[idx];
        let conditions = [...combatant.conditions];
        if (change.remove) {
          conditions = conditions.filter((c) => !change.remove!.includes(c));
        }
        if (change.add) {
          conditions = [...conditions, ...change.add.filter((c) => !conditions.includes(c))];
        }
        newState.combatants[idx] = { ...combatant, conditions };
      }
    }
  }

  if (patch.advanceTurn && newState.active && newState.combatants.length > 0) {
    newState.turnIndex = (newState.turnIndex + 1) % newState.combatants.length;
    if (newState.turnIndex === 0) {
      newState.round += 1;
    }
  }

  return newState;
}

export function getCurrentCombatant(state: CombatState): Combatant | null {
  if (!state.active || state.combatants.length === 0) return null;
  return state.combatants[state.turnIndex] || null;
}

export function isPlayerTurn(state: CombatState): boolean {
  const current = getCurrentCombatant(state);
  return current?.isPlayer || false;
}
