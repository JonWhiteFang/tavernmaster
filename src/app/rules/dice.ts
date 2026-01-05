export type DiceExpression = {
  count: number;
  sides: number;
  modifier: number;
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
