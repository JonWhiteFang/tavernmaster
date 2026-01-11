-- PR 10.1: Add user_id ownership and proper RLS policies
-- PR 11.1: Add campaign_id to characters for campaign-scoped parties
-- This migration adds user_id columns to user-authored tables and updates RLS
-- to enforce per-user data isolation.

-- Add campaign_id to characters for campaign-scoped parties
alter table public.characters add column if not exists campaign_id text references public.campaigns (id);
create index if not exists idx_characters_campaign_id on public.characters (campaign_id);

-- Add user_id columns to user-authored tables (nullable for migration, then default)
alter table public.campaigns add column if not exists user_id uuid;
alter table public.sessions add column if not exists user_id uuid;
alter table public.journal_entries add column if not exists user_id uuid;
alter table public.characters add column if not exists user_id uuid;
alter table public.character_stats add column if not exists user_id uuid;
alter table public.character_abilities add column if not exists user_id uuid;
alter table public.character_inventory add column if not exists user_id uuid;
alter table public.character_spells add column if not exists user_id uuid;
alter table public.encounters add column if not exists user_id uuid;
alter table public.initiative_entries add column if not exists user_id uuid;
alter table public.conditions add column if not exists user_id uuid;
alter table public.encounter_conditions add column if not exists user_id uuid;
alter table public.action_proposals add column if not exists user_id uuid;
alter table public.combat_log add column if not exists user_id uuid;
alter table public.sync_state add column if not exists user_id uuid;
alter table public.sync_queue add column if not exists user_id uuid;
alter table public.app_settings add column if not exists user_id uuid;
alter table public.ai_logs add column if not exists user_id uuid;

-- Create indexes for user_id lookups
create index if not exists idx_campaigns_user_id on public.campaigns (user_id);
create index if not exists idx_sessions_user_id on public.sessions (user_id);
create index if not exists idx_journal_entries_user_id on public.journal_entries (user_id);
create index if not exists idx_characters_user_id on public.characters (user_id);
create index if not exists idx_character_stats_user_id on public.character_stats (user_id);
create index if not exists idx_character_abilities_user_id on public.character_abilities (user_id);
create index if not exists idx_character_inventory_user_id on public.character_inventory (user_id);
create index if not exists idx_character_spells_user_id on public.character_spells (user_id);
create index if not exists idx_encounters_user_id on public.encounters (user_id);
create index if not exists idx_initiative_entries_user_id on public.initiative_entries (user_id);
create index if not exists idx_conditions_user_id on public.conditions (user_id);
create index if not exists idx_encounter_conditions_user_id on public.encounter_conditions (user_id);
create index if not exists idx_action_proposals_user_id on public.action_proposals (user_id);
create index if not exists idx_combat_log_user_id on public.combat_log (user_id);
create index if not exists idx_sync_state_user_id on public.sync_state (user_id);
create index if not exists idx_sync_queue_user_id on public.sync_queue (user_id);
create index if not exists idx_app_settings_user_id on public.app_settings (user_id);
create index if not exists idx_ai_logs_user_id on public.ai_logs (user_id);

-- Drop old permissive policies
drop policy if exists "authenticated_full_access_campaigns" on public.campaigns;
drop policy if exists "authenticated_full_access_sessions" on public.sessions;
drop policy if exists "authenticated_full_access_journal_entries" on public.journal_entries;
drop policy if exists "authenticated_full_access_characters" on public.characters;
drop policy if exists "authenticated_full_access_character_stats" on public.character_stats;
drop policy if exists "authenticated_full_access_character_abilities" on public.character_abilities;
drop policy if exists "authenticated_full_access_character_inventory" on public.character_inventory;
drop policy if exists "authenticated_full_access_character_spells" on public.character_spells;
drop policy if exists "authenticated_full_access_encounters" on public.encounters;
drop policy if exists "authenticated_full_access_initiative_entries" on public.initiative_entries;
drop policy if exists "authenticated_full_access_conditions" on public.conditions;
drop policy if exists "authenticated_full_access_encounter_conditions" on public.encounter_conditions;
drop policy if exists "authenticated_full_access_action_proposals" on public.action_proposals;
drop policy if exists "authenticated_full_access_combat_log" on public.combat_log;
drop policy if exists "authenticated_full_access_sync_state" on public.sync_state;
drop policy if exists "authenticated_full_access_sync_queue" on public.sync_queue;
drop policy if exists "authenticated_full_access_app_settings" on public.app_settings;
drop policy if exists "authenticated_full_access_ai_logs" on public.ai_logs;

-- Create new user-scoped RLS policies
-- Policy pattern: user can only access their own rows (user_id = auth.uid())
-- NULL user_id rows are accessible during migration period

create policy "user_owns_campaigns"
on public.campaigns for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_sessions"
on public.sessions for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_journal_entries"
on public.journal_entries for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_characters"
on public.characters for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_character_stats"
on public.character_stats for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_character_abilities"
on public.character_abilities for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_character_inventory"
on public.character_inventory for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_character_spells"
on public.character_spells for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_encounters"
on public.encounters for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_initiative_entries"
on public.initiative_entries for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_conditions"
on public.conditions for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_encounter_conditions"
on public.encounter_conditions for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_action_proposals"
on public.action_proposals for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_combat_log"
on public.combat_log for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_sync_state"
on public.sync_state for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_sync_queue"
on public.sync_queue for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_app_settings"
on public.app_settings for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());

create policy "user_owns_ai_logs"
on public.ai_logs for all to authenticated
using (user_id = auth.uid() or user_id is null)
with check (user_id = auth.uid());
