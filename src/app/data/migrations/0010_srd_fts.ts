import type { Migration } from "../migrate";

const migration: Migration = {
  version: 10,
  name: "srd_fts",
  async up(db) {
    // FTS5 virtual table for SRD content
    await db.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS srd_fts USING fts5(
        entry_type,
        name,
        content,
        content='',
        tokenize='porter'
      );
    `);

    // Populate from existing SRD tables
    await db.execute(`
      INSERT INTO srd_fts(rowid, entry_type, name, content)
      SELECT rowid, 'spell', name, COALESCE(description, '')
      FROM srd_spells WHERE deleted_at IS NULL;
    `);

    await db.execute(`
      INSERT INTO srd_fts(rowid + 10000, entry_type, name, content)
      SELECT rowid, 'monster', name, COALESCE(description, '')
      FROM srd_monsters WHERE deleted_at IS NULL;
    `);

    await db.execute(`
      INSERT INTO srd_fts(rowid + 20000, entry_type, name, content)
      SELECT rowid, 'item', name, COALESCE(description, '')
      FROM srd_items WHERE deleted_at IS NULL;
    `);
  }
};

export default migration;
