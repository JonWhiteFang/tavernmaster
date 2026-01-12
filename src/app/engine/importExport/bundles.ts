import { z } from "zod";

export const BundleMetaSchema = z.object({
  version: z.number(),
  appVersion: z.string(),
  schemaVersion: z.number(),
  exportedAt: z.string(),
  campaignId: z.string(),
  campaignName: z.string()
});
export type BundleMeta = z.infer<typeof BundleMetaSchema>;

export const CampaignBundleSchema = z.object({
  meta: BundleMetaSchema,
  campaign: z.record(z.unknown()),
  state: z.record(z.unknown()).optional(),
  turns: z.array(z.record(z.unknown())).optional(),
  canonFacts: z.array(z.record(z.unknown())).optional(),
  characters: z.array(z.record(z.unknown())).optional()
});
export type CampaignBundle = z.infer<typeof CampaignBundleSchema>;

const BUNDLE_VERSION = 1;
const APP_VERSION = "0.1.0";

export function createBundleMeta(
  campaignId: string,
  campaignName: string,
  schemaVersion: number
): BundleMeta {
  return {
    version: BUNDLE_VERSION,
    appVersion: APP_VERSION,
    schemaVersion,
    exportedAt: new Date().toISOString(),
    campaignId,
    campaignName
  };
}

export function validateBundle(data: unknown): {
  valid: boolean;
  error?: string;
  bundle?: CampaignBundle;
} {
  const result = CampaignBundleSchema.safeParse(data);
  if (!result.success) {
    return { valid: false, error: result.error.message };
  }
  return { valid: true, bundle: result.data };
}

export function serializeBundle(bundle: CampaignBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function deserializeBundle(json: string): {
  valid: boolean;
  error?: string;
  bundle?: CampaignBundle;
} {
  try {
    const data = JSON.parse(json);
    return validateBundle(data);
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Invalid JSON" };
  }
}

export function generateNewCampaignId(): string {
  return crypto.randomUUID();
}

export function remapBundleIds(bundle: CampaignBundle): CampaignBundle {
  const newCampaignId = generateNewCampaignId();
  const oldCampaignId = bundle.meta.campaignId;

  return {
    ...bundle,
    meta: { ...bundle.meta, campaignId: newCampaignId },
    campaign: { ...bundle.campaign, id: newCampaignId },
    state: bundle.state ? { ...bundle.state, campaign_id: newCampaignId } : undefined,
    turns: bundle.turns?.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      campaign_id: newCampaignId
    })),
    canonFacts: bundle.canonFacts?.map((f) => ({
      ...f,
      id: crypto.randomUUID(),
      campaign_id: newCampaignId
    })),
    characters: bundle.characters?.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      campaign_id: c.campaign_id === oldCampaignId ? newCampaignId : c.campaign_id
    }))
  };
}
