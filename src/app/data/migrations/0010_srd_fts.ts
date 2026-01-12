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

    // Populate from existing SRD tables (description is inside data_json, no deleted_at column)
    await db.execute(`
      INSERT INTO srd_fts(rowid, entry_type, name, content)
      SELECT rowid, 'spell', name, COALESCE(json_extract(data_json, '$.description'), '')
      FROM srd_spells;
    `);

    await db.execute(`
      INSERT INTO srd_fts(rowid, entry_type, name, content)
      SELECT rowid + 10000, 'monster', name, COALESCE(json_extract(data_json, '$.description'), '')
      FROM srd_monsters;
    `);

    await db.execute(`
      INSERT INTO srd_fts(rowid, entry_type, name, content)
      SELECT rowid + 20000, 'item', name, COALESCE(json_extract(data_json, '$.description'), '')
      FROM srd_items;
    `);
  }
};

export default migration;
