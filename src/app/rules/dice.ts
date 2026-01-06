import type { AdvantageState } from "./types";
import type { RandomSource } from "./rng";

export type DiceExpression = {
  count: number;
  sides: number;
  modifier: number;
};

export type DiceRollResult = {
  expression: DiceExpression;
  rolls: number[];
  modifier: number;
  total: number;
};

export type D20RollResult = {
  rolls: [number, number] | [number];
  chosen: number;
  advantage: AdvantageState;
  isCritical: boolean;
};

const dicePattern = /^(\d*)d(\d+)([+-]\d+)?$/i;

export function parseDiceExpression(input: string): DiceExpression {
  const trimmed = input.trim();
  const match = dicePattern.exec(trimmed);

  if (!match) {
    throw new Error(`Invalid dice expression: ${input}`);
  }

  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  const modifier = match[3] ? Number(match[3]) : 0;

  if (!Number.isFinite(count) || count < 1) {
    throw new Error(`Dice count must be >= 1: ${input}`);
  }
  if (!Number.isFinite(sides) || sides < 2) {
    throw new Error(`Dice sides must be >= 2: ${input}`);
  }
  if (!Number.isFinite(modifier)) {
    throw new Error(`Modifier must be a number: ${input}`);
  }

  return { count, sides, modifier };
}

export function rollDie(sides: number, rng: RandomSource): number {
  return Math.floor(rng() * sides) + 1;
}

export function rollDice(expression: DiceExpression, rng: RandomSource): DiceRollResult {
  const rolls = Array.from({ length: expression.count }, () => rollDie(expression.sides, rng));
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + expression.modifier;
  return {
    expression,
    rolls,
    modifier: expression.modifier,
    total
  };
}

export function rollD20(rng: RandomSource): number {
  return rollDie(20, rng);
}

export function rollD20WithAdvantage(rng: RandomSource, advantage: AdvantageState): D20RollResult {
  if (advantage === "normal") {
    const roll = rollD20(rng);
    return {
      rolls: [roll],
      chosen: roll,
      advantage,
      isCritical: roll === 20
    };
  }

  const first = rollD20(rng);
  const second = rollD20(rng);
  const chosen = advantage === "advantage" ? Math.max(first, second) : Math.min(first, second);

  return {
    rolls: [first, second],
    chosen,
    advantage,
    isCritical: chosen === 20
  };
}

export function normalizeAdvantage(states: AdvantageState[]): AdvantageState {
  const hasAdvantage = states.includes("advantage");
  const hasDisadvantage = states.includes("disadvantage");

  if (hasAdvantage && hasDisadvantage) {
    return "normal";
  }
  if (hasAdvantage) {
    return "advantage";
  }
  if (hasDisadvantage) {
    return "disadvantage";
  }
  return "normal";
}

export function parseOrReturnDice(expression: DiceExpression | string): DiceExpression {
  if (typeof expression === "string") {
    return parseDiceExpression(expression);
  }
  return expression;
}
