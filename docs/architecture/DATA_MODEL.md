# Data Model

The local database is the source of truth. All tables include `id`, `created_at`, and `updated_at` fields unless noted.
User-authored tables also include nullable `deleted_at` for soft deletes (used by sync).

## Campaign & Session

- `campaigns`: name, active_scene_id, summary.
- `sessions`: campaign_id, title, started_at, ended_at, recap.
- `journal_entries`: campaign_id, title, content, tags.

## Characters & Party

- `characters`: campaign_id (optional), name, role (player/ally/npc), control_mode (player/ai), level, class, ancestry,
  background, alignment, proficiencies_json, ancestry_bonus_json.
  - `campaign_id`: Optional foreign key to campaigns. Characters with NULL campaign_id are visible to all campaigns.
  - `proficiencies_json`: JSON array of proficiencies (skills, tools, languages).
  - `ancestry_bonus_json`: JSON array of flexible ancestry bonus selections (ex: Half-Elf).
- `character_stats`: character_id, hp, hp_max, ac, initiative_bonus, speed.
- `character_abilities`: character_id, ability, score, save_bonus.
- `character_inventory`: character_id, item_id (SRD id), quantity, attuned.
- `character_spells`: character_id, spell_id (SRD id), prepared, slots_used.

## Encounters & Combat

- `encounters`: campaign_id, name, environment, difficulty, round, active_turn_id, created_at, updated_at.
- `initiative_entries`: encounter_id, character_id, order_index.
- `conditions`: name, rules_ref, duration_rounds.
- `encounter_conditions`: encounter_id, condition_id, target_id.
- `action_proposals`: encounter_id, character_id, summary, rules_refs, status, payload_json.
- `combat_log`: encounter_id, entry_type, payload_json.

## SRD Content (Read-Only)

- `srd_spells`, `srd_items`, `srd_monsters`, `srd_conditions`, `srd_rules`: Core SRD reference data.
- `srd_classes`: 12 SRD classes with hitDie and startingItemIds.
- `srd_races`: 13 SRD races with speed, abilityBonuses, and optional bonusChoices.
- `srd_backgrounds`: 13 SRD backgrounds with skillProficiencies.
- Store the SRD JSON in `assets/srd/srd.json` and import into these tables on first launch.

## Sync Metadata

- `sync_state`: last_pulled_at, last_pushed_at, conflict_count.
- `sync_queue`: entity_type, entity_id, op_type, payload_json.

## App Settings & AI Logs

- `app_settings`: key, value_json (stores LLM config, app preferences, and `encounter_recovery` snapshots).
- `ai_logs`: campaign_id, session_id, kind (dm/party/summary/user), content, payload_json.
