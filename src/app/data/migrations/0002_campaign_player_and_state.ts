import type { Migration } from "../migrate";

const migration: Migration = {
  version: 2,
  name: "campaign_player_and_state",
  async up(db) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS campaign_player (
        campaign_id TEXT PRIMARY KEY,
        player_character_id TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (player_character_id) REFERENCES characters(id)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS campaign_state (
        campaign_id TEXT PRIMARY KEY,
        current_scene TEXT,
        turn_count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      );
    `);
  }
};

export default migration;
