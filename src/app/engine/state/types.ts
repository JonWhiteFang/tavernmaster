import { z } from "zod";

export const QuestStatusSchema = z.enum(["active", "completed", "failed", "abandoned"]);
export type QuestStatus = z.infer<typeof QuestStatusSchema>;

export const QuestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: QuestStatusSchema,
  objectives: z.array(z.string()).default([])
});
export type Quest = z.infer<typeof QuestSchema>;

export const NpcSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().optional(),
  disposition: z.string().optional(),
  notes: z.string().optional()
});
export type Npc = z.infer<typeof NpcSchema>;

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  visited: z.boolean().default(false)
});
export type Location = z.infer<typeof LocationSchema>;

export const GameModeSchema = z.enum(["exploration", "combat", "dialogue", "rest"]);
export type GameMode = z.infer<typeof GameModeSchema>;

export const CampaignStateDocSchema = z.object({
  version: z.number().default(1),
  scene: z.string().default(""),
  playerSummary: z.string().default(""),
  companionsSummary: z.string().default(""),
  quests: z.array(QuestSchema).default([]),
  npcs: z.array(NpcSchema).default([]),
  locations: z.array(LocationSchema).default([]),
  inventoryNotes: z.string().default(""),
  flags: z.record(z.string(), z.unknown()).default({}),
  mode: GameModeSchema.default("exploration"),
  turnCount: z.number().default(0)
});

export type CampaignStateDoc = z.infer<typeof CampaignStateDocSchema>;

export function createDefaultStateDoc(): CampaignStateDoc {
  return CampaignStateDocSchema.parse({});
}
