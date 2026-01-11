-- Tavern Master: mirror local SQLite schema into Supabase Postgres.
-- Notes:
-- - Primary keys stay TEXT to match local IDs.
-- - Timestamps are stored as ISO-8601 TEXT to match local ordering semantics.
-- - `deleted_at` is present on user-authored tables for soft deletes.

create or replace function public.utc_now_iso()
returns text
language sql
as $$
  select to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;

create or replace function public.tavernmaster_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.updated_at is null or new.updated_at = old.updated_at then
    new.updated_at := public.utc_now_iso();
  end if;
  return new;
end;
$$;

create table if not exists public.campaigns (
  id text primary key,
  name text not null,
  summary text,
  active_scene_id text,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.sessions (
  id text primary key,
  campaign_id text not null references public.campaigns (id),
  title text not null,
  started_at text,
  ended_at text,
  recap text,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.journal_entries (
  id text primary key,
  campaign_id text not null references public.campaigns (id),
  title text not null,
  content text not null,
  tags text,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.characters (
  id text primary key,
  name text not null,
  role text not null,
  control_mode text not null default 'player',
  level integer not null,
  class_name text not null,
  ancestry text not null,
  background text not null,
  alignment text not null,
  proficiencies_json text not null default '[]',
  ancestry_bonus_json text not null default '[]',
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.character_stats (
  id text primary key,
  character_id text not null references public.characters (id),
  hp integer not null,
  hp_max integer not null,
  ac integer not null,
  initiative_bonus integer not null,
  speed integer not null,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.character_abilities (
  id text primary key,
  character_id text not null references public.characters (id),
  ability text not null,
  score integer not null,
  save_bonus integer not null,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.character_inventory (
  id text primary key,
  character_id text not null references public.characters (id),
  item_id text not null,
  quantity integer not null,
  attuned integer not null,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.character_spells (
  id text primary key,
  character_id text not null references public.characters (id),
  spell_id text not null,
  prepared integer not null,
  slots_used integer not null,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.encounters (
  id text primary key,
  campaign_id text not null references public.campaigns (id),
  name text not null,
  environment text,
  difficulty text not null,
  round integer not null,
  active_turn_id text,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.initiative_entries (
  id text primary key,
  encounter_id text not null references public.encounters (id),
  character_id text not null references public.characters (id),
  order_index integer not null,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.conditions (
  id text primary key,
  name text not null,
  rules_ref text,
  duration_rounds integer,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.encounter_conditions (
  id text primary key,
  encounter_id text not null references public.encounters (id),
  condition_id text not null references public.conditions (id),
  target_id text not null,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.action_proposals (
  id text primary key,
  encounter_id text not null references public.encounters (id),
  character_id text not null references public.characters (id),
  summary text not null,
  rules_refs text not null,
  status text not null,
  payload_json text,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.combat_log (
  id text primary key,
  encounter_id text not null references public.encounters (id),
  entry_type text not null,
  payload_json text not null,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.srd_spells (
  id text primary key,
  name text not null,
  data_json text not null,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.srd_items (
  id text primary key,
  name text not null,
  data_json text not null,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.srd_monsters (
  id text primary key,
  name text not null,
  data_json text not null,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.srd_conditions (
  id text primary key,
  name text not null,
  data_json text not null,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.srd_rules (
  id text primary key,
  name text not null,
  data_json text not null,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.sync_state (
  id text primary key,
  last_pulled_at text,
  last_pushed_at text,
  conflict_count integer not null,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.sync_queue (
  id text primary key,
  entity_type text not null,
  entity_id text not null,
  op_type text not null,
  payload_json text not null,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.app_settings (
  key text primary key,
  value_json text not null,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create table if not exists public.ai_logs (
  id text primary key,
  campaign_id text references public.campaigns (id),
  session_id text references public.sessions (id),
  kind text not null,
  content text not null,
  payload_json text,
  deleted_at text,
  created_at text not null default public.utc_now_iso(),
  updated_at text not null default public.utc_now_iso()
);

create trigger set_updated_at_campaigns
before update on public.campaigns
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_sessions
before update on public.sessions
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_journal_entries
before update on public.journal_entries
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_characters
before update on public.characters
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_character_stats
before update on public.character_stats
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_character_abilities
before update on public.character_abilities
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_character_inventory
before update on public.character_inventory
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_character_spells
before update on public.character_spells
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_encounters
before update on public.encounters
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_initiative_entries
before update on public.initiative_entries
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_conditions
before update on public.conditions
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_encounter_conditions
before update on public.encounter_conditions
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_action_proposals
before update on public.action_proposals
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_combat_log
before update on public.combat_log
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_srd_spells
before update on public.srd_spells
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_srd_items
before update on public.srd_items
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_srd_monsters
before update on public.srd_monsters
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_srd_conditions
before update on public.srd_conditions
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_srd_rules
before update on public.srd_rules
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_sync_state
before update on public.sync_state
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_sync_queue
before update on public.sync_queue
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_app_settings
before update on public.app_settings
for each row execute function public.tavernmaster_set_updated_at();

create trigger set_updated_at_ai_logs
before update on public.ai_logs
for each row execute function public.tavernmaster_set_updated_at();

create index if not exists idx_campaigns_updated_at on public.campaigns (updated_at);
create index if not exists idx_sessions_campaign_id on public.sessions (campaign_id);
create index if not exists idx_sessions_updated_at on public.sessions (updated_at);
create index if not exists idx_journal_entries_campaign_id on public.journal_entries (campaign_id);
create index if not exists idx_journal_entries_updated_at on public.journal_entries (updated_at);
create index if not exists idx_characters_updated_at on public.characters (updated_at);
create index if not exists idx_character_stats_character_id on public.character_stats (character_id);
create index if not exists idx_character_stats_updated_at on public.character_stats (updated_at);
create index if not exists idx_character_abilities_character_id on public.character_abilities (character_id);
create index if not exists idx_character_abilities_updated_at on public.character_abilities (updated_at);
create index if not exists idx_character_inventory_character_id on public.character_inventory (character_id);
create index if not exists idx_character_inventory_updated_at on public.character_inventory (updated_at);
create index if not exists idx_character_spells_character_id on public.character_spells (character_id);
create index if not exists idx_character_spells_updated_at on public.character_spells (updated_at);
create index if not exists idx_encounters_campaign_id on public.encounters (campaign_id);
create index if not exists idx_encounters_updated_at on public.encounters (updated_at);
create index if not exists idx_initiative_entries_encounter_id on public.initiative_entries (encounter_id);
create index if not exists idx_initiative_entries_character_id on public.initiative_entries (character_id);
create index if not exists idx_initiative_entries_updated_at on public.initiative_entries (updated_at);
create index if not exists idx_conditions_updated_at on public.conditions (updated_at);
create index if not exists idx_encounter_conditions_encounter_id on public.encounter_conditions (encounter_id);
create index if not exists idx_encounter_conditions_condition_id on public.encounter_conditions (condition_id);
create index if not exists idx_encounter_conditions_updated_at on public.encounter_conditions (updated_at);
create index if not exists idx_action_proposals_encounter_id on public.action_proposals (encounter_id);
create index if not exists idx_action_proposals_character_id on public.action_proposals (character_id);
create index if not exists idx_action_proposals_updated_at on public.action_proposals (updated_at);
create index if not exists idx_combat_log_encounter_id on public.combat_log (encounter_id);
create index if not exists idx_combat_log_updated_at on public.combat_log (updated_at);
create index if not exists idx_srd_spells_updated_at on public.srd_spells (updated_at);
create index if not exists idx_srd_items_updated_at on public.srd_items (updated_at);
create index if not exists idx_srd_monsters_updated_at on public.srd_monsters (updated_at);
create index if not exists idx_srd_conditions_updated_at on public.srd_conditions (updated_at);
create index if not exists idx_srd_rules_updated_at on public.srd_rules (updated_at);
create index if not exists idx_sync_state_updated_at on public.sync_state (updated_at);
create index if not exists idx_sync_queue_updated_at on public.sync_queue (updated_at);
create index if not exists idx_sync_queue_entity_type_entity_id on public.sync_queue (entity_type, entity_id);
create index if not exists idx_app_settings_updated_at on public.app_settings (updated_at);
create index if not exists idx_ai_logs_campaign_id on public.ai_logs (campaign_id);
create index if not exists idx_ai_logs_session_id on public.ai_logs (session_id);
create index if not exists idx_ai_logs_updated_at on public.ai_logs (updated_at);

alter table public.campaigns enable row level security;
alter table public.sessions enable row level security;
alter table public.journal_entries enable row level security;
alter table public.characters enable row level security;
alter table public.character_stats enable row level security;
alter table public.character_abilities enable row level security;
alter table public.character_inventory enable row level security;
alter table public.character_spells enable row level security;
alter table public.encounters enable row level security;
alter table public.initiative_entries enable row level security;
alter table public.conditions enable row level security;
alter table public.encounter_conditions enable row level security;
alter table public.action_proposals enable row level security;
alter table public.combat_log enable row level security;
alter table public.srd_spells enable row level security;
alter table public.srd_items enable row level security;
alter table public.srd_monsters enable row level security;
alter table public.srd_conditions enable row level security;
alter table public.srd_rules enable row level security;
alter table public.sync_state enable row level security;
alter table public.sync_queue enable row level security;
alter table public.app_settings enable row level security;
alter table public.ai_logs enable row level security;

create policy "authenticated_full_access_campaigns"
on public.campaigns
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_sessions"
on public.sessions
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_journal_entries"
on public.journal_entries
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_characters"
on public.characters
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_character_stats"
on public.character_stats
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_character_abilities"
on public.character_abilities
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_character_inventory"
on public.character_inventory
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_character_spells"
on public.character_spells
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_encounters"
on public.encounters
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_initiative_entries"
on public.initiative_entries
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_conditions"
on public.conditions
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_encounter_conditions"
on public.encounter_conditions
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_action_proposals"
on public.action_proposals
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_combat_log"
on public.combat_log
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_read_srd_spells"
on public.srd_spells
for select
to authenticated
using (true);

create policy "authenticated_read_srd_items"
on public.srd_items
for select
to authenticated
using (true);

create policy "authenticated_read_srd_monsters"
on public.srd_monsters
for select
to authenticated
using (true);

create policy "authenticated_read_srd_conditions"
on public.srd_conditions
for select
to authenticated
using (true);

create policy "authenticated_read_srd_rules"
on public.srd_rules
for select
to authenticated
using (true);

create policy "authenticated_full_access_sync_state"
on public.sync_state
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_sync_queue"
on public.sync_queue
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_app_settings"
on public.app_settings
for all
to authenticated
using (true)
with check (true);

create policy "authenticated_full_access_ai_logs"
on public.ai_logs
for all
to authenticated
using (true)
with check (true);
