import type { Migration } from "../migrate";

const migration: Migration = {
  version: 6,
  name: "turns_and_snapshots",
  async up(db) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS turns (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        session_id TEXT,
        turn_number INTEGER NOT NULL,
        player_input TEXT NOT NULL,
        ai_output TEXT NOT NULL,
        mode TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS turn_state_snapshots (
        id TEXT PRIMARY KEY,
        turn_id TEXT NOT NULL,
        state_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (turn_id) REFERENCES turns(id)
      );
    `);

    await db.execute(
      "CREATE INDEX IF NOT EXISTS idx_turns_campaign_created ON turns(campaign_id, created_at);"
    );
    await db.execute(
      "CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id, turn_number);"
    );
  }
};

export default migration;
