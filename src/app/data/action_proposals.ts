import { getDatabase } from "./db";
import { enqueueUpsertAndSchedule } from "../sync/ops";

export type ProposalStatus = "pending" | "approved" | "rejected";

export type ActionProposal = {
  id: string;
  encounterId: string;
  characterId: string;
  summary: string;
  rulesRefs: string[];
  status: ProposalStatus;
  payload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CreateProposalInput = {
  characterId: string;
  summary: string;
  rulesRefs: string[];
  payload?: Record<string, unknown>;
};

export async function createActionProposals(
  encounterId: string,
  proposals: CreateProposalInput[]
): Promise<ActionProposal[]> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const results: ActionProposal[] = [];

  for (const p of proposals) {
    const id = crypto.randomUUID();
    const rulesRefs = JSON.stringify(p.rulesRefs);
    const payload = p.payload ? JSON.stringify(p.payload) : null;

    await db.execute(
      `INSERT INTO action_proposals (id, encounter_id, character_id, summary, rules_refs, status, payload_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, encounterId, p.characterId, p.summary, rulesRefs, "pending", payload, now, now]
    );

    await enqueueUpsertAndSchedule("action_proposals", id, {
      id,
      encounter_id: encounterId,
      character_id: p.characterId,
      summary: p.summary,
      rules_refs: rulesRefs,
      status: "pending",
      payload_json: payload,
      deleted_at: null,
      created_at: now,
      updated_at: now
    });

    results.push({
      id,
      encounterId,
      characterId: p.characterId,
      summary: p.summary,
      rulesRefs: p.rulesRefs,
      status: "pending",
      payload: p.payload,
      createdAt: now,
      updatedAt: now
    });
  }

  return results;
}

export async function updateProposalStatus(id: string, status: ProposalStatus): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(`UPDATE action_proposals SET status = ?, updated_at = ? WHERE id = ?`, [
    status,
    now,
    id
  ]);

  const rows = await db.select<
    {
      encounter_id: string;
      character_id: string;
      summary: string;
      rules_refs: string;
      payload_json: string | null;
      created_at: string;
    }[]
  >(
    `SELECT encounter_id, character_id, summary, rules_refs, payload_json, created_at FROM action_proposals WHERE id = ?`,
    [id]
  );

  if (rows.length) {
    const row = rows[0];
    await enqueueUpsertAndSchedule("action_proposals", id, {
      id,
      encounter_id: row.encounter_id,
      character_id: row.character_id,
      summary: row.summary,
      rules_refs: row.rules_refs,
      status,
      payload_json: row.payload_json,
      deleted_at: null,
      created_at: row.created_at,
      updated_at: now
    });
  }
}

export async function listPendingProposals(encounterId: string): Promise<ActionProposal[]> {
  const db = await getDatabase();
  const rows = await db.select<
    {
      id: string;
      encounter_id: string;
      character_id: string;
      summary: string;
      rules_refs: string;
      status: ProposalStatus;
      payload_json: string | null;
      created_at: string;
      updated_at: string;
    }[]
  >(
    `SELECT id, encounter_id, character_id, summary, rules_refs, status, payload_json, created_at, updated_at
     FROM action_proposals
     WHERE encounter_id = ? AND status = 'pending' AND deleted_at IS NULL
     ORDER BY created_at ASC`,
    [encounterId]
  );

  return rows.map((row) => ({
    id: row.id,
    encounterId: row.encounter_id,
    characterId: row.character_id,
    summary: row.summary,
    rulesRefs: JSON.parse(row.rules_refs) as string[],
    status: row.status,
    payload: row.payload_json
      ? (JSON.parse(row.payload_json) as Record<string, unknown>)
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function listProposalsByEncounter(encounterId: string): Promise<ActionProposal[]> {
  const db = await getDatabase();
  const rows = await db.select<
    {
      id: string;
      encounter_id: string;
      character_id: string;
      summary: string;
      rules_refs: string;
      status: ProposalStatus;
      payload_json: string | null;
      created_at: string;
      updated_at: string;
    }[]
  >(
    `SELECT id, encounter_id, character_id, summary, rules_refs, status, payload_json, created_at, updated_at
     FROM action_proposals
     WHERE encounter_id = ? AND deleted_at IS NULL
     ORDER BY created_at ASC`,
    [encounterId]
  );

  return rows.map((row) => ({
    id: row.id,
    encounterId: row.encounter_id,
    characterId: row.character_id,
    summary: row.summary,
    rulesRefs: JSON.parse(row.rules_refs) as string[],
    status: row.status,
    payload: row.payload_json
      ? (JSON.parse(row.payload_json) as Record<string, unknown>)
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
