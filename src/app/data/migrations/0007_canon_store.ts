import type { Migration } from "../migrate";

const migration: Migration = {
  version: 7,
  name: "canon_store",
  async up(db) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS canon_facts (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        key TEXT NOT NULL,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        source_turn_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (source_turn_id) REFERENCES turns(id),
        UNIQUE(campaign_id, key)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS canon_summaries (
        campaign_id TEXT PRIMARY KEY,
        long_summary TEXT NOT NULL DEFAULT '',
        recent_summary TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS quest_threads (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        objectives_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      );
    `);

    await db.execute(
      "CREATE INDEX IF NOT EXISTS idx_canon_facts_campaign ON canon_facts(campaign_id, type);"
    );
    await db.execute(
      "CREATE INDEX IF NOT EXISTS idx_quest_threads_campaign ON quest_threads(campaign_id, status);"
    );
  }
};

export default migration;
