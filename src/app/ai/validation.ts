import { z } from "zod";

const actionSchema = z.object({
  type: z.string()
});

export const dmPayloadSchema = z.object({
  narrative: z.string(),
  sceneUpdates: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([])
});

export const partyProposalSchema = z.object({
  characterId: z.string().min(1),
  summary: z.string(),
  action: actionSchema,
  rulesRefs: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  alternatives: z.array(z.string()).default([])
});

export const partyPayloadSchema = z.object({
  proposals: z.array(partyProposalSchema)
});

export type DmPayloadValidated = z.infer<typeof dmPayloadSchema>;
export type PartyPayloadValidated = z.infer<typeof partyPayloadSchema>;
