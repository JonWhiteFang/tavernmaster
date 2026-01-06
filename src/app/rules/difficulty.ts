const xpByCr: Record<string, number> = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000
};

const thresholdsByLevel: Record<
  number,
  { easy: number; medium: number; hard: number; deadly: number }
> = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 }
};

const multipliers = [
  { count: 1, value: 1 },
  { count: 2, value: 1.5 },
  { count: 3, value: 2 },
  { count: 7, value: 2.5 },
  { count: 11, value: 3 },
  { count: 15, value: 4 }
];

export type EncounterDifficulty = "easy" | "medium" | "hard" | "deadly";

export type DifficultySummary = {
  adjustedXp: number;
  baseXp: number;
  thresholds: { easy: number; medium: number; hard: number; deadly: number };
  difficulty: EncounterDifficulty;
};

export function crToXp(cr: string): number {
  return xpByCr[cr] ?? 0;
}

export function getThresholdsForParty(levels: number[]): {
  easy: number;
  medium: number;
  hard: number;
  deadly: number;
} {
  return levels.reduce(
    (acc, level) => {
      const thresholds = thresholdsByLevel[level];
      if (!thresholds) {
        return acc;
      }
      return {
        easy: acc.easy + thresholds.easy,
        medium: acc.medium + thresholds.medium,
        hard: acc.hard + thresholds.hard,
        deadly: acc.deadly + thresholds.deadly
      };
    },
    { easy: 0, medium: 0, hard: 0, deadly: 0 }
  );
}

export function getEncounterMultiplier(monsterCount: number, partySize: number): number {
  if (monsterCount <= 0) {
    return 1;
  }

  const base = [...multipliers].reverse().find((entry) => monsterCount >= entry.count)?.value ?? 1;
  const adjustment = partySize < 3 ? 1 : partySize > 5 ? -1 : 0;
  const baseIndex = multipliers.findIndex((entry) => entry.value === base);
  const adjustedIndex = Math.min(multipliers.length - 1, Math.max(0, baseIndex + adjustment));

  return multipliers[adjustedIndex].value;
}

export function calculateEncounterDifficulty(
  partyLevels: number[],
  monsterXps: number[]
): DifficultySummary {
  const thresholds = getThresholdsForParty(partyLevels);
  const baseXp = monsterXps.reduce((sum, xp) => sum + xp, 0);
  const multiplier = getEncounterMultiplier(monsterXps.length, partyLevels.length);
  const adjustedXp = Math.floor(baseXp * multiplier);

  let difficulty: EncounterDifficulty = "easy";
  if (adjustedXp >= thresholds.deadly) {
    difficulty = "deadly";
  } else if (adjustedXp >= thresholds.hard) {
    difficulty = "hard";
  } else if (adjustedXp >= thresholds.medium) {
    difficulty = "medium";
  }

  return {
    adjustedXp,
    baseXp,
    thresholds,
    difficulty
  };
}
