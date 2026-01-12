import { z } from "zod";
import { GameModeSchema, QuestStatusSchema } from "../state/types";

export const ChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(["action", "dialogue", "move", "rest", "combat"]).default("action")
});
export type Choice = z.infer<typeof ChoiceSchema>;

export const MechanicsSchema = z.object({
  rolls: z.array(z.object({ type: z.string(), result: z.number().optional() })).default([]),
  damage: z.number().optional(),
  healing: z.number().optional(),
  conditions: z.array(z.string()).default([])
});
export type Mechanics = z.infer<typeof MechanicsSchema>;

export const StatePatchSchema = z.object({
  scene: z.string().optional(),
  mode: GameModeSchema.optional(),
  playerHpDelta: z.number().optional(),
  companionUpdates: z
    .array(z.object({ id: z.string(), hpDelta: z.number().optional() }))
    .default([])
});
export type StatePatch = z.infer<typeof StatePatchSchema>;

export const CanonUpdateSchema = z.object({
  facts: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
  quests: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        status: QuestStatusSchema.optional()
      })
    )
    .default([])
});
export type CanonUpdate = z.infer<typeof CanonUpdateSchema>;

export const TurnResponseSchema = z.object({
  narrative: z.string(),
  choices: z.array(ChoiceSchema).min(1).max(7),
  mechanics: MechanicsSchema.default({}),
  statePatch: StatePatchSchema.default({}),
  canonUpdates: CanonUpdateSchema.default({})
});
export type TurnResponse = z.infer<typeof TurnResponseSchema>;
