-- ============================================================================
-- Native iOS v1 — security hardening + personal-data model
-- (SprakLab_Native_iOS_Readiness_Review_v3.md §4 / §8, product-owner decisions
-- 2026-10-16). Backup taken and restore-verified before applying:
-- ~/Desktop/Mina projekt/Backups/supabase-2026-10-16-pre-native-hardening/.
-- Tested first on an isolated local restore of that backup.
--
-- Additive / permission-only: no table or column is dropped, no row is deleted.
-- The web app keeps working for the owner account because catalog writes stay
-- allowed for admins (the owner is registered as admin below).
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Server-verified admin registry. Not visible or writable by clients
--    (no RLS policies); is_admin() is the only read path.
-- ---------------------------------------------------------------------------
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;
grant select, insert, delete on public.app_admins to service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- The project owner (the first account, created long before any other user
-- could exist) becomes the admin. user_preferences.is_admin is left in place
-- but is no longer trusted for anything.
insert into public.app_admins (user_id)
select id from auth.users order by created_at asc limit 1
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. Public catalog: everyone reads, only admins write from a client.
--    AI generation / reports / promotions go through server APIs
--    (service role) after their own checks.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'learning_objects', 'word_forms', 'learning_object_translations', 'learning_object_examples',
    'learning_object_example_translations', 'learning_object_collocations', 'learning_object_relationships'
  ]
  loop
    execute format('drop policy if exists "%s_all_authenticated" on public.%I;', t, t);
    execute format('drop policy if exists "%s_read_authenticated" on public.%I;', t, t);
    execute format('create policy "%s_read_authenticated" on public.%I for select to authenticated using (true);', t, t);
    execute format('drop policy if exists "%s_admin_write" on public.%I;', t, t);
    execute format(
      'create policy "%s_admin_write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Content status: needs_correction / retired. Public entries are retired,
--    never hard-deleted (a delete would cascade into everyone's user_words).
-- ---------------------------------------------------------------------------
alter table public.learning_objects drop constraint if exists learning_objects_status_check;
alter table public.learning_objects
  add constraint learning_objects_status_check
  check (status in ('draft', 'ai_generated', 'human_reviewed', 'published', 'needs_correction', 'retired'));

-- ---------------------------------------------------------------------------
-- 4. user_preferences: clients may no longer write the server-owned columns
--    (is_admin, account_plan, daily/monthly AI credit limits).
-- ---------------------------------------------------------------------------
revoke insert, update on public.user_preferences from authenticated;
grant insert (user_id, study_scope, selected_notebook_id, selected_notebook_name, shadowing_show_subtitles,
              shadowing_continuous, shadowing_auto_pause, shadowing_level, preferences, created_at, updated_at)
  on public.user_preferences to authenticated;
grant update (study_scope, selected_notebook_id, selected_notebook_name, shadowing_show_subtitles,
              shadowing_continuous, shadowing_auto_pause, shadowing_level, preferences, updated_at)
  on public.user_preferences to authenticated;

-- ---------------------------------------------------------------------------
-- 5. content_reports: reporters see their own reports; only admins resolve.
-- ---------------------------------------------------------------------------
drop policy if exists "content_reports_select_authenticated" on public.content_reports;
drop policy if exists "content_reports_select_own_or_admin" on public.content_reports;
create policy "content_reports_select_own_or_admin" on public.content_reports
  for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "content_reports_update_authenticated" on public.content_reports;
drop policy if exists "content_reports_update_admin" on public.content_reports;
create policy "content_reports_update_admin" on public.content_reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. user_words v2: real columns for learning state (previously only inside the
--    personal_note JSON "spraklab-user-word-v1"). personal_note stays and keeps
--    being written by both clients so the frozen web app sees the same state.
-- ---------------------------------------------------------------------------
alter table public.user_words
  add column if not exists favorited_at timestamptz,
  add column if not exists review_stage smallint not null default 0,
  add column if not exists last_rating text,
  add column if not exists lapse_count integer not null default 0,
  add column if not exists wrong_count integer not null default 0,
  add column if not exists first_studied_at timestamptz,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists mastered_at timestamptz;

alter table public.user_words drop constraint if exists user_words_last_rating_check;
alter table public.user_words
  add constraint user_words_last_rating_check check (last_rating is null or last_rating in ('again', 'hard', 'good'));
alter table public.user_words drop constraint if exists user_words_review_stage_check;
alter table public.user_words
  add constraint user_words_review_stage_check check (review_stage between 0 and 6);

create or replace function public.try_jsonb(value text)
returns jsonb
language plpgsql
immutable
as $$
begin
  return value::jsonb;
exception when others then
  return null;
end;
$$;

create or replace function public.ms_to_timestamptz(value jsonb)
returns timestamptz
language sql
immutable
as $$
  select case
    when value is null or jsonb_typeof(value) <> 'number' or (value::text)::numeric <= 0 then null
    else to_timestamp((value::text)::numeric / 1000.0)
  end;
$$;

with meta as (
  select id, public.try_jsonb(personal_note) as j
  from public.user_words
  where personal_note like '%spraklab-user-word-v1%'
)
update public.user_words w
set
  review_stage = least(greatest(coalesce((m.j ->> 'review_stage')::int, least(w.review_count, 6)), 0), 6),
  last_rating = case when m.j ->> 'last_rating' in ('again', 'hard', 'good') then m.j ->> 'last_rating' end,
  lapse_count = coalesce((m.j ->> 'lapse_count')::int, 0),
  wrong_count = coalesce((m.j ->> 'wrong_count')::int, 0),
  first_studied_at = coalesce(public.ms_to_timestamptz(m.j -> 'first_studied_at'), w.last_studied_at),
  last_reviewed_at = public.ms_to_timestamptz(m.j -> 'last_reviewed'),
  mastered_at = public.ms_to_timestamptz(m.j -> 'mastered_at')
from meta m
where w.id = m.id and m.j is not null;

update public.user_words set favorited_at = coalesce(favorited_at, updated_at) where is_favorite;

create index if not exists user_words_user_favorite_at_idx on public.user_words (user_id, favorited_at desc) where is_favorite;
create index if not exists user_words_user_next_review_idx on public.user_words (user_id, next_review_at);

-- ---------------------------------------------------------------------------
-- 7. Mina anteckningar (N6): free-text personal notes, owner-only.
--    source_type/source_id are reserved for a later "note from article/word"
--    link and unused in v1.
-- ---------------------------------------------------------------------------
create table if not exists public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint user_notes_title_length check (char_length(title) <= 300),
  constraint user_notes_body_length check (char_length(body) <= 50000)
);
create index if not exists user_notes_user_updated_idx on public.user_notes (user_id, updated_at desc) where deleted_at is null;

drop trigger if exists user_notes_set_updated_at on public.user_notes;
create trigger user_notes_set_updated_at
  before update on public.user_notes
  for each row execute function public.set_updated_at();

alter table public.user_notes enable row level security;
drop policy if exists "user_notes_select_own" on public.user_notes;
create policy "user_notes_select_own" on public.user_notes for select using (auth.uid() = user_id);
drop policy if exists "user_notes_insert_own" on public.user_notes;
create policy "user_notes_insert_own" on public.user_notes for insert with check (auth.uid() = user_id);
drop policy if exists "user_notes_update_own" on public.user_notes;
create policy "user_notes_update_own" on public.user_notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "user_notes_delete_own" on public.user_notes;
create policy "user_notes_delete_own" on public.user_notes for delete using (auth.uid() = user_id);
revoke all on public.user_notes from anon;
grant select, insert, update, delete on public.user_notes to authenticated;
grant select, insert, update, delete on public.user_notes to service_role;

-- ---------------------------------------------------------------------------
-- 8. AI generation de-duplication: one row per (normalised text, language)
--    request so concurrent searches for the same new word pay for one call.
--    Service role only.
-- ---------------------------------------------------------------------------
create table if not exists public.generation_requests (
  key text primary key,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  entry_id uuid references public.learning_objects (id) on delete set null,
  requested_by uuid references auth.users (id) on delete set null,
  error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.generation_requests enable row level security;
revoke all on public.generation_requests from anon, authenticated;
grant select, insert, update, delete on public.generation_requests to service_role;

-- ---------------------------------------------------------------------------
-- 9. Shared pronunciation audio cache (generate once, reuse): public read,
--    written only by the server.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('tts-cache', 'tts-cache', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 10. Every account gets a profiles row at sign-up. user_words.user_id
--     references profiles(id), so a new native-app user without one could not
--     save or learn anything (the web app created it client-side).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, email)
select id, coalesce(email, '') from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 11. Hygiene: TRUNCATE bypasses RLS; clients never need it.
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('revoke truncate on public.%I from anon, authenticated;', t.tablename);
  end loop;
end $$;

commit;
