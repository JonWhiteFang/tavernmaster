import type { AdvantageState, ConditionInstance, RulesParticipant } from "./types";
import { normalizeAdvantage } from "./dice";

const attackerAdvantageConditions = new Set(["hidden", "invisible", "helped"]);

const attackerDisadvantageConditions = new Set(["blinded", "poisoned", "restrained"]);

const targetGrantAdvantageConditions = new Set(["paralyzed", "stunned", "unconscious"]);

export function hasCondition(participant: RulesParticipant, name: string): boolean {
  const normalized = name.toLowerCase();
  return participant.conditions.some((condition) => condition.name.toLowerCase() === normalized);
}

export function removeCondition(participant: RulesParticipant, name: string): RulesParticipant {
  const normalized = name.toLowerCase();
  return {
    ...participant,
    conditions: participant.conditions.filter(
      (condition) => condition.name.toLowerCase() !== normalized
    )
  };
}

export function tickEndOfTurn(participant: RulesParticipant): RulesParticipant {
  const updated = participant.conditions
    .map((condition) => {
      if (condition.remainingRounds === null) {
        return condition;
      }
      const remaining = condition.remainingRounds - 1;
      return {
        ...condition,
        remainingRounds: remaining
      };
    })
    .filter((condition) => condition.remainingRounds === null || condition.remainingRounds > 0);

  return {
    ...participant,
    conditions: updated
  };
}

export function deriveAttackAdvantage(
  attacker: RulesParticipant,
  target: RulesParticipant,
  base: AdvantageState,
  isMelee: boolean
): AdvantageState {
  const modifiers: AdvantageState[] = [base];

  if (
    attacker.conditions.some((condition) =>
      attackerAdvantageConditions.has(condition.name.toLowerCase())
    )
  ) {
    modifiers.push("advantage");
  }

  if (
    attacker.conditions.some((condition) =>
      attackerDisadvantageConditions.has(condition.name.toLowerCase())
    )
  ) {
    modifiers.push("disadvantage");
  }

  if (
    target.conditions.some((condition) =>
      targetGrantAdvantageConditions.has(condition.name.toLowerCase())
    )
  ) {
    modifiers.push("advantage");
  }

  if (target.conditions.some((condition) => condition.name.toLowerCase() === "dodging")) {
    modifiers.push("disadvantage");
  }

  if (target.conditions.some((condition) => condition.name.toLowerCase() === "prone")) {
    modifiers.push(isMelee ? "advantage" : "disadvantage");
  }

  return normalizeAdvantage(modifiers);
}

export function buildCondition(
  name: string,
  remainingRounds: number | null,
  sourceId?: string
): ConditionInstance {
  return {
    id: crypto.randomUUID(),
    name: name.toLowerCase(),
    remainingRounds,
    sourceId
  };
}
