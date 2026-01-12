import type { Migration } from "../migrate";

const migration: Migration = {
  version: 8,
  name: "turn_status",
  async up(db) {
    const cols = await db.select<{ name: string }[]>(
      "SELECT name FROM pragma_table_info('turns') WHERE name = 'status';"
    );
    if (cols.length === 0) {
      await db.execute(`ALTER TABLE turns ADD COLUMN status TEXT NOT NULL DEFAULT 'applied';`);
    }
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_turns_status ON turns(campaign_id, status);`);
  }
};

export default migration;
