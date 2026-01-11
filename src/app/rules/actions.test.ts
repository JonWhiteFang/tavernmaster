import { describe, expect, it } from "vitest";
import { resolveAction, validateAction } from "./actions";
import type { RulesState } from "./types";

function sequenceRng(values: number[]) {
  let index = 0;
  return () => {
    const value = values[index] ?? 0;
    index += 1;
    return value;
  };
}

const baseState: RulesState = {
  round: 1,
  turnOrder: ["attacker", "target"],
  activeTurnIndex: 0,
  log: [],
  participants: {
    attacker: {
      id: "attacker",
      name: "Blade",
      maxHp: 20,
      hp: 20,
      armorClass: 14,
      initiativeBonus: 2,
      speed: 30,
      abilities: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 8 },
      savingThrows: {},
      proficiencyBonus: 2,
      conditions: []
    },
    target: {
      id: "target",
      name: "Goblin",
      maxHp: 7,
      hp: 7,
      armorClass: 13,
      initiativeBonus: 2,
      speed: 30,
      abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
      savingThrows: {},
      proficiencyBonus: 2,
      conditions: []
    }
  }
};

describe("action resolution", () => {
  it("resolves a critical hit attack", () => {
    const rng = sequenceRng([0.99, 0.0, 0.0]);
    const result = resolveAction(
      {
        type: "attack",
        attackerId: "attacker",
        targetId: "target",
        attackBonus: 5,
        damage: "1d6+2",
        damageType: "slashing",
        isMelee: true
      },
      baseState,
      rng
    );

    expect(result.ok).toBe(true);
    const damage = result.effects.find((effect) => effect.type === "damage");
    expect(damage && "amount" in damage ? damage.amount : 0).toBe(4);
  });

  it("validates missing targets", () => {
    const result = validateAction(
      {
        type: "attack",
        attackerId: "attacker",
        targetId: "missing",
        attackBonus: 5,
        damage: "1d6+2",
        damageType: "slashing"
      },
      baseState
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("Target not found");
  });

  it("adds a dodging condition for the dodge action", () => {
    const rng = sequenceRng([]);
    const result = resolveAction({ type: "dodge", actorId: "attacker" }, baseState, rng);
    expect(result.ok).toBe(true);
    const effect = result.effects.find((entry) => entry.type === "addCondition");
    expect(effect && "condition" in effect ? effect.condition.name : "").toBe("dodging");
  });

  it("removes helped and hidden conditions after an attack", () => {
    const rng = sequenceRng([0.0]);
    const state: RulesState = {
      ...baseState,
      participants: {
        ...baseState.participants,
        attacker: {
          ...baseState.participants.attacker,
          conditions: [
            { id: "c1", name: "helped", remainingRounds: 1 },
            { id: "c2", name: "hidden", remainingRounds: 1 }
          ]
        },
        target: {
          ...baseState.participants.target,
          armorClass: 30
        }
      }
    };

    const result = resolveAction(
      {
        type: "attack",
        attackerId: "attacker",
        targetId: "target",
        attackBonus: 0,
        damage: "1d6",
        damageType: "slashing"
      },
      state,
      rng
    );

    const removed = result.effects.filter((effect) => effect.type === "removeCondition");
    expect(removed).toHaveLength(2);
    expect(result.log.join(" ")).toContain("misses");
  });

  it("handles cast actions with saves, damage, and concentration", () => {
    const rng = sequenceRng([0.99, 0.0, 0.0]);
    const state: RulesState = {
      round: 1,
      turnOrder: ["caster", "target"],
      activeTurnIndex: 0,
      log: [],
      participants: {
        caster: {
          id: "caster",
          name: "Lyra",
          maxHp: 18,
          hp: 18,
          armorClass: 12,
          initiativeBonus: 2,
          speed: 30,
          abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
          savingThrows: { dex: 2 },
          proficiencyBonus: 2,
          conditions: [],
          spellcasting: {
            spellSaveDc: 12,
            spellAttackBonus: 5,
            slots: { 1: { max: 1, used: 0 } }
          },
          concentration: { spellId: "old", startedRound: 1 }
        },
        target: {
          id: "target",
          name: "Bandit",
          maxHp: 11,
          hp: 11,
          armorClass: 12,
          initiativeBonus: 1,
          speed: 30,
          abilities: { str: 12, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
          savingThrows: { dex: 5 },
          proficiencyBonus: 2,
          conditions: []
        }
      }
    };

    const result = resolveAction(
      {
        type: "cast",
        casterId: "caster",
        spellId: "fireball",
        slotLevel: 1,
        targetIds: ["target"],
        damage: { dice: "2d6", type: "fire" },
        save: { ability: "dex", dc: 12, halfOnSave: true },
        concentration: true
      },
      state,
      rng
    );

    const effects = result.effects.map((effect) => effect.type);
    expect(effects).toContain("consumeSpellSlot");
    expect(effects).toContain("clearConcentration");
    expect(effects).toContain("setConcentration");
    expect(result.log.join(" ")).toContain("resists part");
  });

  it("applies conditions from spell attacks", () => {
    const rng = sequenceRng([0.99, 0.0]);
    const state: RulesState = {
      round: 1,
      turnOrder: ["caster", "target"],
      activeTurnIndex: 0,
      log: [],
      participants: {
        caster: {
          id: "caster",
          name: "Lyra",
          maxHp: 18,
          hp: 18,
          armorClass: 12,
          initiativeBonus: 2,
          speed: 30,
          abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
          savingThrows: {},
          proficiencyBonus: 2,
          conditions: [],
          spellcasting: {
            spellSaveDc: 12,
            spellAttackBonus: 5,
            slots: {}
          }
        },
        target: {
          id: "target",
          name: "Bandit",
          maxHp: 11,
          hp: 11,
          armorClass: 10,
          initiativeBonus: 1,
          speed: 30,
          abilities: { str: 12, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
          savingThrows: {},
          proficiencyBonus: 2,
          conditions: []
        }
      }
    };

    const result = resolveAction(
      {
        type: "cast",
        casterId: "caster",
        spellId: "ray",
        slotLevel: 0,
        targetIds: ["target"],
        attack: { bonus: 5, isMelee: false },
        damage: { dice: "1d4", type: "force" },
        condition: { name: "blinded", durationRounds: 2 }
      },
      state,
      rng
    );

    const condition = result.effects.find((effect) => effect.type === "addCondition");
    expect(condition && "condition" in condition ? condition.condition.name : "").toBe("blinded");
    expect(result.log.join(" ")).toContain("hits");
  });

  it("validates cast actions with missing targets and slots", () => {
    const state: RulesState = {
      ...baseState,
      participants: {
        ...baseState.participants,
        attacker: {
          ...baseState.participants.attacker,
          spellcasting: { spellSaveDc: 12, spellAttackBonus: 4, slots: { 1: { max: 1, used: 1 } } }
        }
      }
    };

    const result = validateAction(
      {
        type: "cast",
        casterId: "attacker",
        spellId: "test",
        slotLevel: 1,
        targetIds: []
      },
      state
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("No remaining spell slots");
    expect(result.errors.join(" ")).toContain("requires at least one target");
  });

  it("resolves use-object and help actions", () => {
    const rng = sequenceRng([]);
    const useObject = resolveAction(
      { type: "use-object", actorId: "attacker", description: "Throw a torch" },
      baseState,
      rng
    );
    expect(useObject.log.join(" ")).toContain("Use object");

    const help = resolveAction(
      { type: "help", helperId: "attacker", targetId: "target" },
      baseState,
      rng
    );
    const helped = help.effects.find((effect) => effect.type === "addCondition");
    expect(helped && "condition" in helped ? helped.condition.name : "").toBe("helped");
  });

  it("resolves dash action", () => {
    const rng = sequenceRng([]);
    const result = resolveAction({ type: "dash", actorId: "attacker" }, baseState, rng);
    expect(result.ok).toBe(true);
    const effect = result.effects.find((e) => e.type === "addCondition");
    expect(effect && "condition" in effect ? effect.condition.name : "").toBe("dashing");
    expect(result.log.join(" ")).toContain("speed doubled");
  });

  it("resolves disengage action", () => {
    const rng = sequenceRng([]);
    const result = resolveAction({ type: "disengage", actorId: "attacker" }, baseState, rng);
    expect(result.ok).toBe(true);
    const effect = result.effects.find((e) => e.type === "addCondition");
    expect(effect && "condition" in effect ? effect.condition.name : "").toBe("disengaged");
    expect(result.log.join(" ")).toContain("no opportunity attacks");
  });

  it("resolves hide action", () => {
    const rng = sequenceRng([]);
    const result = resolveAction({ type: "hide", actorId: "attacker" }, baseState, rng);
    expect(result.ok).toBe(true);
    const effect = result.effects.find((e) => e.type === "addCondition");
    expect(effect && "condition" in effect ? effect.condition.name : "").toBe("hidden");
  });

  it("resolves ready action", () => {
    const rng = sequenceRng([]);
    const result = resolveAction(
      { type: "ready", actorId: "attacker", trigger: "enemy approaches" },
      baseState,
      rng
    );
    expect(result.ok).toBe(true);
    const effect = result.effects.find((e) => e.type === "addCondition");
    expect(effect && "condition" in effect ? effect.condition.name : "").toBe("readying");
    expect(result.log.join(" ")).toContain("enemy approaches");
  });

  it("validates incapacitated actors cannot act", () => {
    const state: RulesState = {
      ...baseState,
      participants: {
        ...baseState.participants,
        attacker: {
          ...baseState.participants.attacker,
          conditions: [{ id: "c1", name: "stunned", remainingRounds: 1 }]
        }
      }
    };
    const result = validateAction({ type: "dash", actorId: "attacker" }, state);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("cannot act");
  });

  it("validates actors at 0 HP cannot act", () => {
    const state: RulesState = {
      ...baseState,
      participants: {
        ...baseState.participants,
        attacker: { ...baseState.participants.attacker, hp: 0 }
      }
    };
    const result = validateAction({ type: "dodge", actorId: "attacker" }, state);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("cannot act");
  });

  it("handles spell miss logging", () => {
    const rng = sequenceRng([0.0]); // roll 1, miss
    const state: RulesState = {
      ...baseState,
      participants: {
        caster: {
          id: "caster",
          name: "Mage",
          maxHp: 10,
          hp: 10,
          armorClass: 10,
          initiativeBonus: 0,
          speed: 30,
          abilities: { str: 8, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
          savingThrows: {},
          proficiencyBonus: 2,
          conditions: [],
          spellcasting: { spellSaveDc: 13, spellAttackBonus: 5, slots: {} }
        },
        target: { ...baseState.participants.target, armorClass: 20 }
      }
    };
    const result = resolveAction(
      {
        type: "cast",
        casterId: "caster",
        spellId: "ray",
        slotLevel: 0,
        targetIds: ["target"],
        attack: { bonus: 5, isMelee: false }
      },
      state,
      rng
    );
    expect(result.log.join(" ")).toContain("misses");
  });
});
