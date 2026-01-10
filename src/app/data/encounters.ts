import type { Encounter } from "./types";
import { getDatabase } from "./db";
import { enqueueUpsertAndSchedule } from "../sync/ops";

type EncounterRow = {
  id: string;
  campaign_id: string;
  name: string;
  environment: string | null;
  difficulty: "easy" | "medium" | "hard" | "deadly";
  round: number;
  active_turn_id: string | null;
};

type InitiativeRow = {
  character_id: string;
  order_index: number;
};

type ConditionRow = {
  name: string;
};

export type NewEncounterInput = {
  campaignId: string;
  name: string;
  environment?: string;
  difficulty: Encounter["difficulty"];
  round?: number;
};

function mapEncounter(
  row: EncounterRow,
  initiative: InitiativeRow[],
  conditions: ConditionRow[]
): Encounter {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    environment: row.environment ?? "",
    difficulty: row.difficulty,
    round: row.round,
    activeTurnId: row.active_turn_id ?? undefined,
    initiativeOrder: initiative
      .sort((a, b) => a.order_index - b.order_index)
      .map((entry) => entry.character_id),
    conditions: conditions.map((condition) => condition.name)
  };
}

export async function listEncounters(campaignId: string): Promise<Encounter[]> {
  const db = await getDatabase();
  const rows = await db.select<EncounterRow[]>(
    `SELECT id, campaign_id, name, environment, difficulty, round, active_turn_id
     FROM encounters
     WHERE campaign_id = ?
     ORDER BY updated_at DESC`,
    [campaignId]
  );

  const encounters = await Promise.all(
    rows.map(async (row) => {
      const initiative = await db.select<InitiativeRow[]>(
        "SELECT character_id, order_index FROM initiative_entries WHERE encounter_id = ?",
        [row.id]
      );
      const conditions = await db.select<ConditionRow[]>(
        `SELECT c.name
         FROM encounter_conditions ec
         JOIN conditions c ON c.id = ec.condition_id
         WHERE ec.encounter_id = ?`,
        [row.id]
      );
      return mapEncounter(row, initiative, conditions);
    })
  );

  return encounters;
}

export async function createEncounter(input: NewEncounterInput): Promise<Encounter> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const round = input.round ?? 1;

  await db.execute(
    `INSERT INTO encounters
      (id, campaign_id, name, environment, difficulty, round, active_turn_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.campaignId,
      input.name,
      input.environment ?? null,
      input.difficulty,
      round,
      null,
      now,
      now
    ]
  );

  await enqueueUpsertAndSchedule("encounters", id, {
    id,
    campaign_id: input.campaignId,
    name: input.name,
    environment: input.environment ?? null,
    difficulty: input.difficulty,
    round,
    active_turn_id: null,
    deleted_at: null,
    created_at: now,
    updated_at: now
  });

  return {
    id,
    campaignId: input.campaignId,
    name: input.name,
    environment: input.environment ?? "",
    difficulty: input.difficulty,
    round,
    initiativeOrder: [],
    conditions: []
  };
}

export async function saveInitiativeOrder(
  encounterId: string,
  characterIds: string[]
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Clear existing entries
  await db.execute("DELETE FROM initiative_entries WHERE encounter_id = ?", [encounterId]);

  // Insert new order
  for (let i = 0; i < characterIds.length; i++) {
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO initiative_entries (id, encounter_id, character_id, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, encounterId, characterIds[i], i, now, now]
    );
    await enqueueUpsertAndSchedule("initiative_entries", id, {
      id,
      encounter_id: encounterId,
      character_id: characterIds[i],
      order_index: i,
      deleted_at: null,
      created_at: now,
      updated_at: now
    });
  }
}

export async function updateEncounterTurn(
  encounterId: string,
  round: number,
  activeTurnId: string | null
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE encounters SET round = ?, active_turn_id = ?, updated_at = ? WHERE id = ?`,
    [round, activeTurnId, now, encounterId]
  );

  // Get full row for sync
  const rows = await db.select<EncounterRow[]>(
    `SELECT id, campaign_id, name, environment, difficulty, round, active_turn_id FROM encounters WHERE id = ?`,
    [encounterId]
  );
  if (rows.length) {
    const row = rows[0];
    await enqueueUpsertAndSchedule("encounters", encounterId, {
      id: row.id,
      campaign_id: row.campaign_id,
      name: row.name,
      environment: row.environment,
      difficulty: row.difficulty,
      round,
      active_turn_id: activeTurnId,
      deleted_at: null,
      created_at: now,
      updated_at: now
    });
  }
}

export async function getEncounter(encounterId: string): Promise<Encounter | null> {
  const db = await getDatabase();
  const rows = await db.select<EncounterRow[]>(
    `SELECT id, campaign_id, name, environment, difficulty, round, active_turn_id
     FROM encounters WHERE id = ?`,
    [encounterId]
  );
  if (!rows.length) return null;

  const row = rows[0];
  const initiative = await db.select<InitiativeRow[]>(
    "SELECT character_id, order_index FROM initiative_entries WHERE encounter_id = ?",
    [encounterId]
  );
  const conditions = await db.select<ConditionRow[]>(
    `SELECT c.name FROM encounter_conditions ec
     JOIN conditions c ON c.id = ec.condition_id
     WHERE ec.encounter_id = ?`,
    [encounterId]
  );
  return mapEncounter(row, initiative, conditions);
}
