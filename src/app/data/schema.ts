export const schemaStatements: string[] = [
  "PRAGMA foreign_keys = ON;",
  `CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    summary TEXT,
    active_scene_id TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    title TEXT NOT NULL,
    started_at TEXT,
    ended_at TEXT,
    recap TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
  );`,
  `CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
  );`,
  `CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    control_mode TEXT NOT NULL DEFAULT 'player',
    level INTEGER NOT NULL,
    class_name TEXT NOT NULL,
    ancestry TEXT NOT NULL,
    background TEXT NOT NULL,
    alignment TEXT NOT NULL,
    proficiencies_json TEXT NOT NULL DEFAULT '[]',
    ancestry_bonus_json TEXT NOT NULL DEFAULT '[]',
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS character_stats (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL,
    hp INTEGER NOT NULL,
    hp_max INTEGER NOT NULL,
    ac INTEGER NOT NULL,
    initiative_bonus INTEGER NOT NULL,
    speed INTEGER NOT NULL,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (character_id) REFERENCES characters(id)
  );`,
  `CREATE TABLE IF NOT EXISTS character_abilities (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL,
    ability TEXT NOT NULL,
    score INTEGER NOT NULL,
    save_bonus INTEGER NOT NULL,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (character_id) REFERENCES characters(id)
  );`,
  `CREATE TABLE IF NOT EXISTS character_inventory (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    attuned INTEGER NOT NULL,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (character_id) REFERENCES characters(id)
  );`,
  `CREATE TABLE IF NOT EXISTS character_spells (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL,
    spell_id TEXT NOT NULL,
    prepared INTEGER NOT NULL,
    slots_used INTEGER NOT NULL,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (character_id) REFERENCES characters(id)
  );`,
  `CREATE TABLE IF NOT EXISTS encounters (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    environment TEXT,
    difficulty TEXT NOT NULL,
    round INTEGER NOT NULL,
    active_turn_id TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
  );`,
  `CREATE TABLE IF NOT EXISTS initiative_entries (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (encounter_id) REFERENCES encounters(id),
    FOREIGN KEY (character_id) REFERENCES characters(id)
  );`,
  `CREATE TABLE IF NOT EXISTS conditions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rules_ref TEXT,
    duration_rounds INTEGER,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS encounter_conditions (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (encounter_id) REFERENCES encounters(id),
    FOREIGN KEY (condition_id) REFERENCES conditions(id)
  );`,
  `CREATE TABLE IF NOT EXISTS action_proposals (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    rules_refs TEXT NOT NULL,
    status TEXT NOT NULL,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (encounter_id) REFERENCES encounters(id),
    FOREIGN KEY (character_id) REFERENCES characters(id)
  );`,
  `CREATE TABLE IF NOT EXISTS combat_log (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    entry_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (encounter_id) REFERENCES encounters(id)
  );`,
  `CREATE TABLE IF NOT EXISTS srd_spells (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS srd_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS srd_monsters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS srd_conditions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS srd_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS sync_state (
    id TEXT PRIMARY KEY,
    last_pulled_at TEXT,
    last_pushed_at TEXT,
    conflict_count INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    op_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS sync_conflicts (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    local_payload_json TEXT NOT NULL,
    remote_payload_json TEXT NOT NULL,
    local_updated_at TEXT,
    remote_updated_at TEXT,
    resolved_at TEXT,
    resolution TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS ai_logs (
    id TEXT PRIMARY KEY,
    campaign_id TEXT,
    session_id TEXT,
    kind TEXT NOT NULL,
    content TEXT NOT NULL,
    payload_json TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );`,
  "CREATE INDEX IF NOT EXISTS idx_campaigns_updated_at ON campaigns(updated_at);",
  "CREATE INDEX IF NOT EXISTS idx_characters_updated_at ON characters(updated_at);",
  "CREATE INDEX IF NOT EXISTS idx_encounters_updated_at ON encounters(updated_at);"
];
