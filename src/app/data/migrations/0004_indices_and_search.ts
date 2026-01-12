import type { Migration } from "../migrate";

const migration: Migration = {
  version: 4,
  name: "indices_and_search",
  async up(db) {
    // Performance indices
    await db.execute(
      "CREATE INDEX IF NOT EXISTS idx_ai_logs_campaign_session_created ON ai_logs(campaign_id, session_id, created_at);"
    );
    await db.execute(
      "CREATE INDEX IF NOT EXISTS idx_sessions_campaign_started ON sessions(campaign_id, started_at, created_at);"
    );
    await db.execute(
      "CREATE INDEX IF NOT EXISTS idx_combat_log_encounter_created ON combat_log(encounter_id, created_at);"
    );

    // FTS5 search index
    await db.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
        entity_type,
        entity_id,
        campaign_id,
        content,
        tokenize='porter'
      );
    `);
  }
};

export default migration;
