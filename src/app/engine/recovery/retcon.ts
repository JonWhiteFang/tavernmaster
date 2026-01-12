import { upsertCanonFact, listCanonFacts } from "../memory/canonStore";

export async function addRetcon(campaignId: string, note: string): Promise<string> {
  const key = `retcon:${Date.now()}`;
  await upsertCanonFact({
    campaignId,
    key,
    value: note,
    source: "player_retcon"
  });
  return key;
}

export async function listRetcons(campaignId: string): Promise<{ key: string; note: string }[]> {
  const facts = await listCanonFacts(campaignId);
  return facts
    .filter((f) => f.key.startsWith("retcon:"))
    .map((f) => ({ key: f.key, note: f.value }));
}
