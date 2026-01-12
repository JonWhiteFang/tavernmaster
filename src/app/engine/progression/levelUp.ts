import { z } from "zod";

export const InventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().default(1),
  equipped: z.boolean().default(false)
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const InventoryPatchSchema = z.object({
  add: z.array(InventoryItemSchema).optional(),
  remove: z.array(z.string()).optional(), // item ids
  update: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number().optional(),
        equipped: z.boolean().optional()
      })
    )
    .optional()
});
export type InventoryPatch = z.infer<typeof InventoryPatchSchema>;

export const LevelUpChoiceSchema = z.object({
  type: z.enum(["ability_score", "feat", "spell", "skill"]),
  options: z.array(z.string()),
  selected: z.string().optional()
});
export type LevelUpChoice = z.infer<typeof LevelUpChoiceSchema>;

export const LevelUpProposalSchema = z.object({
  characterId: z.string(),
  fromLevel: z.number(),
  toLevel: z.number(),
  hpIncrease: z.number(),
  choices: z.array(LevelUpChoiceSchema)
});
export type LevelUpProposal = z.infer<typeof LevelUpProposalSchema>;

export function applyInventoryPatch(
  inventory: InventoryItem[],
  patch: InventoryPatch
): InventoryItem[] {
  let result = [...inventory];

  if (patch.remove) {
    const toRemove = new Set(patch.remove);
    result = result.filter((item) => !toRemove.has(item.id));
  }

  if (patch.update) {
    for (const update of patch.update) {
      const idx = result.findIndex((item) => item.id === update.id);
      if (idx !== -1) {
        result[idx] = {
          ...result[idx],
          quantity: update.quantity ?? result[idx].quantity,
          equipped: update.equipped ?? result[idx].equipped
        };
      }
    }
  }

  if (patch.add) {
    for (const item of patch.add) {
      const existing = result.find((i) => i.id === item.id);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        result.push({ ...item });
      }
    }
  }

  return result.filter((item) => item.quantity > 0);
}

export function validateLevelUpChoices(proposal: LevelUpProposal): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  for (const choice of proposal.choices) {
    if (!choice.selected) {
      missing.push(choice.type);
    } else if (!choice.options.includes(choice.selected)) {
      missing.push(`${choice.type} (invalid selection)`);
    }
  }
  return { valid: missing.length === 0, missing };
}

export function applyLevelUp(
  character: { level: number; hp: number; maxHp: number },
  proposal: LevelUpProposal
): { level: number; hp: number; maxHp: number } {
  const validation = validateLevelUpChoices(proposal);
  if (!validation.valid) {
    throw new Error(`Missing choices: ${validation.missing.join(", ")}`);
  }

  return {
    level: proposal.toLevel,
    hp: character.hp + proposal.hpIncrease,
    maxHp: character.maxHp + proposal.hpIncrease
  };
}
