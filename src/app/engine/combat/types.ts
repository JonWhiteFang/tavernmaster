import { z } from "zod";

export const CombatantSchema = z.object({
  id: z.string(),
  name: z.string(),
  initiative: z.number(),
  hp: z.number(),
  maxHp: z.number(),
  ac: z.number(),
  isPlayer: z.boolean().default(false),
  isAlly: z.boolean().default(false),
  conditions: z.array(z.string()).default([])
});
export type Combatant = z.infer<typeof CombatantSchema>;

export const CombatStateSchema = z.object({
  active: z.boolean().default(false),
  round: z.number().default(1),
  turnIndex: z.number().default(0),
  combatants: z.array(CombatantSchema).default([])
});
export type CombatState = z.infer<typeof CombatStateSchema>;

export const CombatPatchSchema = z.object({
  startCombat: z.boolean().optional(),
  endCombat: z.boolean().optional(),
  addCombatants: z.array(CombatantSchema).optional(),
  removeCombatantIds: z.array(z.string()).optional(),
  hpChanges: z.array(z.object({ id: z.string(), delta: z.number() })).optional(),
  conditionChanges: z
    .array(
      z.object({
        id: z.string(),
        add: z.array(z.string()).optional(),
        remove: z.array(z.string()).optional()
      })
    )
    .optional(),
  advanceTurn: z.boolean().optional()
});
export type CombatPatch = z.infer<typeof CombatPatchSchema>;
