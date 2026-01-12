import type { Migration } from "../migrate";

const migration: Migration = {
  version: 5,
  name: "campaign_state_json",
  async up(db) {
    // Add state_json column to campaign_state
    await db.execute("ALTER TABLE campaign_state ADD COLUMN state_json TEXT;");
  }
};

export default migration;
