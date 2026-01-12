import type { Migration } from "../migrate";

const migration: Migration = {
  version: 3,
  name: "crypto_meta",
  async up(db) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS crypto_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }
};

export default migration;
