import type { Migration } from "../migrate";

const migration: Migration = {
  version: 9,
  name: "branches_and_retcons",
  async up(db) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS campaign_branches (
        id TEXT PRIMARY KEY,
        source_campaign_id TEXT NOT NULL,
        target_campaign_id TEXT NOT NULL,
        parent_turn_id TEXT NOT NULL,
        label TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (source_campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (target_campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (parent_turn_id) REFERENCES turns(id)
      );
    `);
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_branches_source ON campaign_branches(source_campaign_id);`
    );
  }
};

export default migration;
