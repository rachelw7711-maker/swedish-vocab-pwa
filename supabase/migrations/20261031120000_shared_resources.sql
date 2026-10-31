-- Shared learning resources: tiers, provenance, field status, batch enrichment
-- and permission structure (product decision 2026-10-31).
--
-- Words, fixed phrases (Fraser) and idiomatic expressions (Uttryck) stay in the
-- one shared table, public.learning_objects, with the ids every learning record,
-- favourite and article link already uses. This migration only adds columns and
-- side tables; no existing row is rewritten except the new columns' backfill.
--
--  1. Tier: access_tier basic | extended.
--     * Rows that exist today keep a tier decided by where they came from:
--       course lists, the Kelly bulk work and hand-made rows are basic; rows made
--       on demand (AI search, reading analyses, collected expressions, AI
--       candidates, promotions from word cards) are extended.
--     * Every new row is extended (column default) — from now on, regardless of
--       the commercial switch. A basic import has to say so explicitly.
--     * The tier never changes by itself: an update that changes access_tier is
--       rejected unless it comes through promote_to_basic() / revert_tier_batch(),
--       which log every change in tier_changes (rollback by batch).
--  2. Provenance: content_origin (how the row was made), resource_sources (one
--     row per dataset / generator, with licence and attribution text) and
--     learning_object_sources (which source supplied what for each row).
--  3. Completeness: resource_field_status (per row and field: present /
--     verified / mismatch / missing, with the source that decided it) and the
--     summary columns verification_status, completeness, missing_fields kept by
--     refresh_resource_summary().
--  4. Dedup support: match_key (normalised headword; the server's
--     normaliser writes it for phrases and expressions) and
--     learning_object_modules (a row can belong to the phrase and the
--     expression module at once without being duplicated).
--  5. Batch enrichment: enrichment_jobs / enrichment_tasks (queue, status,
--     attempts, tokens, cost, budget).
--  6. Permissions (structure only, nothing is restricted): app_settings with the
--     commercial switch, has_extended_access(), plan_limits. The switch decides
--     only whether permissions apply, never which tier new content gets.
--
-- Rollback: supabase/rollback/20261031120000_shared_resources_rollback.sql

begin;

-- ---------------------------------------------------------------------------
-- 1. Tier and origin
-- ---------------------------------------------------------------------------
alter table public.learning_objects
  add column if not exists access_tier text,
  add column if not exists content_origin text,
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists completeness text not null default 'unknown',
  add column if not exists missing_fields text[] not null default '{}',
  add column if not exists match_key text,
  add column if not exists tier_changed_at timestamptz;

alter table public.learning_objects drop constraint if exists learning_objects_content_origin_check;
alter table public.learning_objects
  add constraint learning_objects_content_origin_check check (content_origin is null or content_origin in (
    'curated',            -- course / textbook word lists (Rivstart, SFI, SVA …)
    'ai_bulk',            -- AI-written entries from bulk work on a headword list (Kelly)
    'ai_search',          -- "Skapa med AI" from search or a tapped word
    'ai_reading',         -- full entries for keywords chosen by a reading analysis
    'reading_expression', -- collocations / idioms collected by reading analyses
    'promoted',           -- promoted from a word card's collocations
    'ai_candidate',       -- AI candidate drafts
    'admin',              -- added by hand by the owner
    'other'
  ));

-- The structured origin, from the free-text `source` the code already writes.
create or replace function public.content_origin_for(source text)
returns text
language sql
immutable
as $$
  select case
    when source is null or source = '' then 'other'
    when source = 'ai search' then 'ai_search'
    when source = 'ai reading' then 'ai_reading'
    when source = 'discovered from reading' then 'reading_expression'
    when source = 'promoted from word card' then 'promoted'
    when source like 'AI candidate%' then 'ai_candidate'
    when source like 'Kelly /%' then 'ai_bulk'
    when source like 'document-vocab-data.js%' or source like 'vocab-data.js%' then 'curated'
    when source = 'admin' then 'admin'
    else 'other'
  end;
$$;

update public.learning_objects set content_origin = public.content_origin_for(source) where content_origin is null;
update public.learning_objects
   set access_tier = case when content_origin in ('ai_search', 'ai_reading', 'reading_expression', 'promoted', 'ai_candidate') then 'extended' else 'basic' end
 where access_tier is null;
update public.learning_objects set match_key = lower(btrim(regexp_replace(swedish, '\s+', ' ', 'g'))) where match_key is null;

alter table public.learning_objects alter column access_tier set default 'extended';
alter table public.learning_objects alter column access_tier set not null;
alter table public.learning_objects drop constraint if exists learning_objects_access_tier_check;
alter table public.learning_objects add constraint learning_objects_access_tier_check check (access_tier in ('basic', 'extended'));
alter table public.learning_objects drop constraint if exists learning_objects_verification_status_check;
alter table public.learning_objects add constraint learning_objects_verification_status_check
  check (verification_status in ('unverified', 'partial', 'verified', 'needs_review'));
alter table public.learning_objects drop constraint if exists learning_objects_completeness_check;
alter table public.learning_objects add constraint learning_objects_completeness_check
  check (completeness in ('unknown', 'complete', 'incomplete'));

create index if not exists learning_objects_access_tier_idx on public.learning_objects (access_tier);
create index if not exists learning_objects_match_key_idx on public.learning_objects (match_key);

create or replace function public.learning_objects_resource_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.content_origin is null then
      new.content_origin := public.content_origin_for(new.source);
    end if;
    if new.match_key is null then
      new.match_key := lower(btrim(regexp_replace(new.swedish, '\s+', ' ', 'g')));
    end if;
    return new;
  end if;
  -- UPDATE: the tier only moves through promote_to_basic() / revert_tier_batch().
  if new.access_tier is distinct from old.access_tier
     and coalesce(current_setting('spraklab.tier_change', true), '') <> 'on' then
    raise exception 'access_tier changes go through promote_to_basic() / revert_tier_batch()';
  end if;
  return new;
end;
$$;

drop trigger if exists learning_objects_resource_defaults on public.learning_objects;
create trigger learning_objects_resource_defaults
  before insert or update on public.learning_objects
  for each row execute function public.learning_objects_resource_defaults();

-- ---------------------------------------------------------------------------
-- Modules: the same row can be studied as a phrase and as an expression.
-- ---------------------------------------------------------------------------
create table if not exists public.learning_object_modules (
  learning_object_id uuid not null references public.learning_objects (id) on delete cascade,
  module text not null check (module in ('word', 'phrase', 'expression')),
  created_at timestamptz not null default now(),
  primary key (learning_object_id, module)
);
insert into public.learning_object_modules (learning_object_id, module)
select id, object_type from public.learning_objects where object_type in ('word', 'phrase', 'expression')
on conflict do nothing;

create or replace function public.learning_objects_add_module()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.object_type in ('word', 'phrase', 'expression') then
    insert into public.learning_object_modules (learning_object_id, module) values (new.id, new.object_type) on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists learning_objects_add_module on public.learning_objects;
create trigger learning_objects_add_module
  after insert on public.learning_objects
  for each row execute function public.learning_objects_add_module();

-- ---------------------------------------------------------------------------
-- 2. Provenance and attribution
-- ---------------------------------------------------------------------------
create table if not exists public.resource_sources (
  id text primary key,
  name text not null,
  publisher text not null default '',
  version text not null default '',
  licence text not null default '',
  url text not null default '',
  attribution text not null default '',     -- text to show where attribution is required
  attribution_required boolean not null default false,
  commercial_use text not null default 'unclear'
    check (commercial_use in ('allowed', 'allowed_with_attribution', 'share_alike', 'not_allowed', 'unclear')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.resource_sources (id, name, publisher, version, licence, url, attribution, attribution_required, commercial_use, notes) values
  ('saldo-morphology-2017', 'SALDO''s morphology', 'Språkbanken Text, University of Gothenburg', '2017-09-19', 'CC BY 4.0',
   'https://doi.org/10.23695/agcm-ny22', 'Inflection data: SALDO''s morphology, Språkbanken Text, University of Gothenburg (CC BY 4.0).', true,
   'allowed_with_attribution', 'Local index built by scripts/build-saldo-index.mjs; reference for lemma, part of speech and forms.'),
  ('kelly-swedish', 'Swedish Kelly-list', 'Språkbanken Text, University of Gothenburg', 'M3 CEFR', 'CC BY 4.0 (resource page; older documentation mentions CC BY-SA 3.0 / LGPL)',
   'https://spraakbanken.gu.se/en/resources/kelly', 'Word list: Swedish Kelly-list (Kilgarriff et al. 2014; Volodina & Johansson Kokkinakis), Språkbanken Text.', true,
   'allowed_with_attribution', 'Headword selection and CEFR level only; definitions and examples were written by AI. Licence wording to confirm with Språkbanken.'),
  ('rivstart-wordlists', 'Rivstart A1/A2, B1/B2 word lists', 'Natur & Kultur (textbook)', '', 'none known',
   '', '', false, 'unclear',
   'Copyright risk under review: single words are not protected, but the list''s selection/arrangement and any copied glosses or examples may be.'),
  ('course-lists-misc', 'SFI / SVA / Vardag och samhälle / Samhälle & Medborgare lists', 'unknown', '', 'none known',
   '', '', false, 'unclear', 'Origin to be documented.'),
  ('openai-generated', 'AI-generated text (OpenAI)', 'OpenAI API', 'gpt-5.4 / gpt-5.4-mini', 'output owned by the customer under OpenAI terms',
   '', '', false, 'allowed', 'Meanings, explanations, examples and tips written by the model.'),
  ('spraklab-editorial', 'SpråkLab editorial', 'SpråkLab', '', 'own work', '', '', false, 'allowed', 'Hand edits and reviews.')
on conflict (id) do nothing;

create table if not exists public.learning_object_sources (
  learning_object_id uuid not null references public.learning_objects (id) on delete cascade,
  source_id text not null references public.resource_sources (id),
  role text not null check (role in ('headword_list', 'forms', 'generated_text', 'verification', 'editorial')),
  fields text[] not null default '{}',
  detail jsonb not null default '{}',
  recorded_at timestamptz not null default now(),
  primary key (learning_object_id, source_id, role)
);
create index if not exists learning_object_sources_source_idx on public.learning_object_sources (source_id);

insert into public.learning_object_sources (learning_object_id, source_id, role)
select id, case when source like 'document-vocab-data.js / Rivstart%' then 'rivstart-wordlists' else 'course-lists-misc' end, 'headword_list'
  from public.learning_objects where content_origin = 'curated'
union all
select id, 'kelly-swedish', 'headword_list' from public.learning_objects where content_origin = 'ai_bulk'
union all
select id, 'openai-generated', 'generated_text' from public.learning_objects
 where content_origin in ('ai_bulk', 'ai_search', 'ai_reading', 'reading_expression', 'promoted', 'ai_candidate')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3. Field status and summary
-- ---------------------------------------------------------------------------
create table if not exists public.resource_field_status (
  learning_object_id uuid not null references public.learning_objects (id) on delete cascade,
  field text not null,
  status text not null check (status in ('present', 'verified', 'mismatch', 'missing', 'not_applicable')),
  source text,                      -- resource_sources.id or 'existing'
  detail jsonb,
  updated_at timestamptz not null default now(),
  primary key (learning_object_id, field)
);
create index if not exists resource_field_status_missing_idx on public.resource_field_status (field) where status = 'missing';

-- Recomputes the summary columns of the given rows from resource_field_status.
-- Only fields SALDO can check count towards "verified"; text fields are content.
create or replace function public.refresh_resource_summary(p_ids uuid[])
returns integer
language sql
security definer
set search_path = public
as $$
  with s as (
    select learning_object_id,
           array_agg(field order by field) filter (where status = 'missing') as missing,
           count(*) filter (where status = 'mismatch') as mismatches,
           count(*) filter (where status = 'verified') as verified,
           count(*) filter (where status = 'missing' and source = 'saldo-morphology-2017') as saldo_missing
      from public.resource_field_status
     where learning_object_id = any (p_ids)
     group by learning_object_id
  ), u as (
    update public.learning_objects o
       set missing_fields = coalesce(s.missing, '{}'),
           completeness = case when s.missing is null then 'complete' else 'incomplete' end,
           verification_status = case
             when s.mismatches > 0 then 'needs_review'
             when s.verified = 0 then 'unverified'
             when s.saldo_missing > 0 then 'partial'
             else 'verified' end
      from s
     where o.id = s.learning_object_id
    returning 1
  )
  select count(*)::integer from u;
$$;
revoke all on function public.refresh_resource_summary(uuid[]) from public;
grant execute on function public.refresh_resource_summary(uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Tier changes (admin promotion, logged, reversible by batch)
-- ---------------------------------------------------------------------------
create table if not exists public.tier_changes (
  id bigint generated always as identity primary key,
  batch_id uuid not null,
  learning_object_id uuid not null references public.learning_objects (id) on delete cascade,
  from_tier text not null,
  to_tier text not null,
  note text not null default '',
  changed_by uuid,
  changed_at timestamptz not null default now(),
  reverted_at timestamptz
);
create index if not exists tier_changes_batch_idx on public.tier_changes (batch_id);

create or replace function public.preview_tier_promotion(p_ids uuid[], p_require_complete boolean default true)
returns table (id uuid, swedish text, object_type text, access_tier text, status text, verification_status text,
               completeness text, missing_fields text[], eligible boolean, reason text)
language sql
stable
security definer
set search_path = public
as $$
  select w.id, o.swedish, o.object_type, o.access_tier, o.status, o.verification_status, o.completeness, o.missing_fields,
         r.reason = 'ok', r.reason
    from unnest(p_ids) as w(id)
    left join public.learning_objects o on o.id = w.id
    cross join lateral (select case
      when o.id is null then 'not found'
      when o.access_tier = 'basic' then 'already basic'
      when o.status in ('retired', 'draft') then 'status ' || o.status
      when o.verification_status = 'needs_review' then 'fields disagree with reference data'
      when p_require_complete and o.completeness <> 'complete' then 'incomplete: ' || coalesce(nullif(array_to_string(o.missing_fields, ', '), ''), o.completeness)
      else 'ok' end as reason) r;
$$;

create or replace function public.promote_to_basic(p_ids uuid[], p_note text default '', p_require_complete boolean default true)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch uuid := gen_random_uuid();
begin
  if not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'only the owner can change tiers';
  end if;
  perform set_config('spraklab.tier_change', 'on', true);
  with ok as (
    select p.id from public.preview_tier_promotion(p_ids, p_require_complete) p where p.eligible
  ), changed as (
    update public.learning_objects o set access_tier = 'basic', tier_changed_at = now()
      from ok where o.id = ok.id
    returning o.id
  )
  insert into public.tier_changes (batch_id, learning_object_id, from_tier, to_tier, note, changed_by)
  select v_batch, id, 'extended', 'basic', p_note, auth.uid() from changed;
  perform set_config('spraklab.tier_change', '', true);
  return v_batch;
end;
$$;

create or replace function public.revert_tier_batch(p_batch uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'only the owner can change tiers';
  end if;
  perform set_config('spraklab.tier_change', 'on', true);
  with t as (
    update public.tier_changes c set reverted_at = now()
     where c.batch_id = p_batch and c.reverted_at is null
    returning c.learning_object_id, c.from_tier, c.to_tier
  ), r as (
    update public.learning_objects o set access_tier = t.from_tier, tier_changed_at = now()
      from t where o.id = t.learning_object_id and o.access_tier = t.to_tier
    returning 1
  )
  select count(*) into v_count from r;
  perform set_config('spraklab.tier_change', '', true);
  return v_count;
end;
$$;

revoke all on function public.preview_tier_promotion(uuid[], boolean) from public;
revoke all on function public.promote_to_basic(uuid[], text, boolean) from public;
revoke all on function public.revert_tier_batch(uuid) from public;
grant execute on function public.preview_tier_promotion(uuid[], boolean) to service_role;
grant execute on function public.promote_to_basic(uuid[], text, boolean) to service_role;
grant execute on function public.revert_tier_batch(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Batch enrichment queue
-- ---------------------------------------------------------------------------
create table if not exists public.enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('local_fill', 'ai_fill')),
  name text not null default '',
  status text not null default 'draft' check (status in ('draft', 'running', 'paused', 'done', 'failed', 'cancelled')),
  model text,
  use_batch_api boolean not null default false,
  budget_usd numeric(10, 4),
  spent_usd numeric(10, 4) not null default 0,
  params jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.enrichment_tasks (
  id bigint generated always as identity primary key,
  job_id uuid references public.enrichment_jobs (id) on delete set null,
  learning_object_id uuid not null references public.learning_objects (id) on delete cascade,
  fields text[] not null,
  group_key text not null default '',           -- e.g. "word|example,cefr_level" for batching
  status text not null default 'pending' check (status in ('pending', 'queued', 'running', 'done', 'failed', 'skipped')),
  attempts integer not null default 0,
  last_error text,
  result jsonb,                                  -- validated model output, kept even if not applied
  applied_fields text[] not null default '{}',
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10, 6),
  external_batch_id text,                        -- OpenAI Batch API id when used
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists enrichment_tasks_one_open_idx on public.enrichment_tasks (learning_object_id)
  where status in ('pending', 'queued', 'running');
create index if not exists enrichment_tasks_job_status_idx on public.enrichment_tasks (job_id, status);
create index if not exists enrichment_tasks_group_idx on public.enrichment_tasks (group_key) where status = 'pending';

-- ---------------------------------------------------------------------------
-- 6. Permissions (structure only)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  commercial_mode boolean not null default false,
  commercial_started_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (true) on conflict do nothing;

create or replace function public.start_commercial_mode()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'only the owner can start commercial mode';
  end if;
  update public.app_settings
     set commercial_mode = true, commercial_started_at = coalesce(commercial_started_at, now()), updated_at = now();
end;
$$;
revoke all on function public.start_commercial_mode() from public;
grant execute on function public.start_commercial_mode() to authenticated, service_role;

-- "May this user study extended rows" — true for everyone while commercial mode
-- is off. Nothing calls this to restrict access yet.
create or replace function public.has_extended_access(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not coalesce((select commercial_mode from public.app_settings where id), false)
      or exists (select 1 from public.app_admins where user_id = uid)
      or exists (select 1 from public.user_preferences where user_id = uid and account_plan in ('standard', 'premium', 'admin'));
$$;
revoke all on function public.has_extended_access(uuid) from public;
grant execute on function public.has_extended_access(uuid) to authenticated, service_role;

create table if not exists public.plan_limits (
  plan text not null check (plan in ('free', 'standard', 'premium')),
  feature text not null,
  period text not null check (period in ('day', 'week', 'month', 'per_text')),
  max_count integer,          -- null = no limit
  note text not null default '',
  primary key (plan, feature, period)
);
insert into public.plan_limits (plan, feature, period, max_count, note) values
  ('free', 'reading_analysis', 'week', 1, 'new texts; reopening an analysed text is free'),
  ('free', 'shadowing_new_text', 'week', 1, 'new practice texts; replaying and re-recording are free'),
  ('free', 'shadowing_evaluation', 'per_text', 1, 'one full Talanalys per text; earlier results stay')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
alter table public.learning_object_modules enable row level security;
alter table public.resource_sources enable row level security;
alter table public.learning_object_sources enable row level security;
alter table public.resource_field_status enable row level security;
alter table public.tier_changes enable row level security;
alter table public.enrichment_jobs enable row level security;
alter table public.enrichment_tasks enable row level security;
alter table public.app_settings enable row level security;
alter table public.plan_limits enable row level security;

-- Readable by the apps: module membership, sources (attribution), settings, limits.
drop policy if exists "learning_object_modules_read" on public.learning_object_modules;
create policy "learning_object_modules_read" on public.learning_object_modules for select to anon, authenticated using (true);
drop policy if exists "resource_sources_read" on public.resource_sources;
create policy "resource_sources_read" on public.resource_sources for select to anon, authenticated using (true);
drop policy if exists "learning_object_sources_read" on public.learning_object_sources;
create policy "learning_object_sources_read" on public.learning_object_sources for select to anon, authenticated using (true);
drop policy if exists "app_settings_read_authenticated" on public.app_settings;
create policy "app_settings_read_authenticated" on public.app_settings for select to authenticated using (true);
drop policy if exists "plan_limits_read_authenticated" on public.plan_limits;
create policy "plan_limits_read_authenticated" on public.plan_limits for select to authenticated using (true);
-- Admin-only reads: field status, tier log, enrichment queue.
drop policy if exists "resource_field_status_admin_read" on public.resource_field_status;
create policy "resource_field_status_admin_read" on public.resource_field_status for select to authenticated using (public.is_admin());
drop policy if exists "tier_changes_admin_read" on public.tier_changes;
create policy "tier_changes_admin_read" on public.tier_changes for select to authenticated using (public.is_admin());
drop policy if exists "enrichment_jobs_admin_read" on public.enrichment_jobs;
create policy "enrichment_jobs_admin_read" on public.enrichment_jobs for select to authenticated using (public.is_admin());
drop policy if exists "enrichment_tasks_admin_read" on public.enrichment_tasks;
create policy "enrichment_tasks_admin_read" on public.enrichment_tasks for select to authenticated using (public.is_admin());

revoke insert, update, delete on public.learning_object_modules, public.resource_sources, public.learning_object_sources,
  public.resource_field_status, public.tier_changes, public.enrichment_jobs, public.enrichment_tasks,
  public.app_settings, public.plan_limits from anon, authenticated;
grant select on public.learning_object_modules, public.resource_sources, public.learning_object_sources to anon, authenticated;
grant select on public.resource_field_status, public.tier_changes, public.enrichment_jobs, public.enrichment_tasks,
  public.app_settings, public.plan_limits to authenticated;
grant select, insert, update, delete on public.learning_object_modules, public.resource_sources, public.learning_object_sources,
  public.resource_field_status, public.enrichment_jobs, public.enrichment_tasks, public.plan_limits to service_role;
grant select on public.tier_changes to service_role;
grant select, update on public.app_settings to service_role;
-- The server reads plans and per-user AI limits (enforceQuota, plan allowances);
-- until now the service role could not select user_preferences at all, so every
-- quota check silently fell back to the default limit.
grant select on public.user_preferences to service_role;

commit;
