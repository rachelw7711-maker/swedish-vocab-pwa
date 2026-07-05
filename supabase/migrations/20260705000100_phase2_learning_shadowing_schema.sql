create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  color text not null default '',
  icon text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  scope text not null default 'all',
  target_new_count integer not null default 0,
  target_review_count integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_plans_target_new_count_check check (target_new_count >= 0),
  constraint study_plans_target_review_count_check check (target_review_count >= 0),
  constraint study_plans_status_check check (status in ('active', 'completed', 'abandoned'))
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  study_plan_id uuid references public.study_plans (id) on delete set null,
  mode text not null,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_mode_check check (mode in ('new', 'review')),
  constraint study_sessions_status_check check (status in ('active', 'completed', 'abandoned'))
);

create table if not exists public.study_session_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  study_session_id uuid not null references public.study_sessions (id) on delete cascade,
  word_id uuid not null references public.words (id) on delete cascade,
  position integer not null,
  status text not null default 'pending',
  shown_at timestamptz,
  answered_at timestamptz,
  completed_at timestamptz,
  spelling_passed boolean not null default false,
  is_correct boolean,
  answer text not null default '',
  collocation_answer text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_session_items_position_check check (position >= 0),
  constraint study_session_items_status_check check (status in ('pending', 'shown', 'answered', 'completed', 'skipped')),
  unique (study_session_id, word_id),
  unique (study_session_id, position)
);

create table if not exists public.study_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  word_id uuid references public.words (id) on delete set null,
  study_session_id uuid references public.study_sessions (id) on delete set null,
  study_session_item_id uuid references public.study_session_items (id) on delete set null,
  action text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.shadowing_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  swedish text not null,
  chinese text not null default '',
  category text not null default 'Ungrouped',
  level integer not null default 1,
  standard_audio_bucket text not null default 'shadowing-standard-audio',
  standard_audio_path text not null default '',
  standard_audio_mime_type text not null default '',
  standard_audio_size_bytes bigint,
  standard_audio_duration_ms integer,
  tts_provider text not null default 'elevenlabs',
  tts_voice_id text not null default '',
  tts_voice_name text not null default '',
  tts_model_id text not null default '',
  tts_settings jsonb not null default '{}'::jsonb,
  tts_status text not null default 'pending',
  tts_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint shadowing_items_level_check check (level between 1 and 5),
  constraint shadowing_items_tts_status_check check (tts_status in ('pending', 'generating', 'ready', 'failed'))
);

create table if not exists public.shadowing_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shadowing_item_id uuid not null references public.shadowing_items (id) on delete cascade,
  audio_bucket text not null default 'shadowing-recordings',
  audio_path text not null,
  audio_mime_type text not null default '',
  audio_size_bytes bigint,
  audio_duration_ms integer,
  attempt_no integer not null default 1,
  level integer,
  notes text not null default '',
  comparison_status text not null default 'none',
  comparison_result jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint shadowing_recordings_attempt_no_check check (attempt_no >= 1),
  constraint shadowing_recordings_level_check check (level is null or level between 1 and 5),
  constraint shadowing_recordings_comparison_status_check check (comparison_status in ('none', 'pending', 'ready', 'failed'))
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  study_scope text not null default 'all',
  selected_notebook_id uuid references public.notebooks (id) on delete set null,
  selected_notebook_name text not null default '',
  shadowing_show_subtitles boolean not null default true,
  shadowing_continuous boolean not null default false,
  shadowing_auto_pause boolean not null default false,
  shadowing_level text not null default '1',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists notebooks_user_name_active_uidx
  on public.notebooks (user_id, lower(name))
  where deleted_at is null;
create index if not exists notebooks_user_id_idx on public.notebooks (user_id);
create index if not exists notebooks_user_sort_idx on public.notebooks (user_id, sort_order);
create index if not exists notebooks_user_updated_idx on public.notebooks (user_id, updated_at);
create index if not exists notebooks_user_deleted_idx on public.notebooks (user_id, deleted_at);

create unique index if not exists study_plans_user_date_scope_uidx on public.study_plans (user_id, plan_date, scope);
create index if not exists study_plans_user_date_idx on public.study_plans (user_id, plan_date);
create index if not exists study_plans_user_status_idx on public.study_plans (user_id, status);
create index if not exists study_plans_user_updated_idx on public.study_plans (user_id, updated_at);

create index if not exists study_sessions_user_id_idx on public.study_sessions (user_id);
create index if not exists study_sessions_plan_idx on public.study_sessions (study_plan_id);
create index if not exists study_sessions_user_mode_started_idx on public.study_sessions (user_id, mode, started_at desc);
create index if not exists study_sessions_user_status_idx on public.study_sessions (user_id, status);
create index if not exists study_sessions_user_updated_idx on public.study_sessions (user_id, updated_at);

create index if not exists study_session_items_user_id_idx on public.study_session_items (user_id);
create index if not exists study_session_items_session_idx on public.study_session_items (study_session_id);
create index if not exists study_session_items_session_position_idx on public.study_session_items (study_session_id, position);
create index if not exists study_session_items_user_word_idx on public.study_session_items (user_id, word_id);
create index if not exists study_session_items_user_status_idx on public.study_session_items (user_id, status);
create index if not exists study_session_items_user_updated_idx on public.study_session_items (user_id, updated_at);

create index if not exists study_history_user_created_idx on public.study_history (user_id, created_at desc);
create index if not exists study_history_user_action_idx on public.study_history (user_id, action);
create index if not exists study_history_user_word_idx on public.study_history (user_id, word_id);
create index if not exists study_history_session_idx on public.study_history (study_session_id);

create index if not exists shadowing_items_user_id_idx on public.shadowing_items (user_id);
create index if not exists shadowing_items_user_updated_idx on public.shadowing_items (user_id, updated_at desc);
create index if not exists shadowing_items_user_category_idx on public.shadowing_items (user_id, category);
create index if not exists shadowing_items_user_level_idx on public.shadowing_items (user_id, level);
create index if not exists shadowing_items_user_deleted_idx on public.shadowing_items (user_id, deleted_at);

create unique index if not exists shadowing_recordings_item_attempt_active_uidx
  on public.shadowing_recordings (shadowing_item_id, attempt_no)
  where deleted_at is null;
create index if not exists shadowing_recordings_user_id_idx on public.shadowing_recordings (user_id);
create index if not exists shadowing_recordings_item_idx on public.shadowing_recordings (shadowing_item_id);
create index if not exists shadowing_recordings_user_item_idx on public.shadowing_recordings (user_id, shadowing_item_id);
create index if not exists shadowing_recordings_item_attempt_idx on public.shadowing_recordings (shadowing_item_id, attempt_no);
create index if not exists shadowing_recordings_user_recorded_idx on public.shadowing_recordings (user_id, recorded_at desc);
create index if not exists shadowing_recordings_user_deleted_idx on public.shadowing_recordings (user_id, deleted_at);

create index if not exists user_preferences_updated_idx on public.user_preferences (updated_at);

drop trigger if exists notebooks_set_updated_at on public.notebooks;
create trigger notebooks_set_updated_at
  before update on public.notebooks
  for each row execute function public.set_updated_at();

drop trigger if exists study_plans_set_updated_at on public.study_plans;
create trigger study_plans_set_updated_at
  before update on public.study_plans
  for each row execute function public.set_updated_at();

drop trigger if exists study_sessions_set_updated_at on public.study_sessions;
create trigger study_sessions_set_updated_at
  before update on public.study_sessions
  for each row execute function public.set_updated_at();

drop trigger if exists study_session_items_set_updated_at on public.study_session_items;
create trigger study_session_items_set_updated_at
  before update on public.study_session_items
  for each row execute function public.set_updated_at();

drop trigger if exists shadowing_items_set_updated_at on public.shadowing_items;
create trigger shadowing_items_set_updated_at
  before update on public.shadowing_items
  for each row execute function public.set_updated_at();

drop trigger if exists shadowing_recordings_set_updated_at on public.shadowing_recordings;
create trigger shadowing_recordings_set_updated_at
  before update on public.shadowing_recordings
  for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

alter table public.notebooks enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_session_items enable row level security;
alter table public.study_history enable row level security;
alter table public.shadowing_items enable row level security;
alter table public.shadowing_recordings enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "notebooks_select_own" on public.notebooks;
create policy "notebooks_select_own" on public.notebooks
  for select using (auth.uid() = user_id);
drop policy if exists "notebooks_insert_own" on public.notebooks;
create policy "notebooks_insert_own" on public.notebooks
  for insert with check (auth.uid() = user_id);
drop policy if exists "notebooks_update_own" on public.notebooks;
create policy "notebooks_update_own" on public.notebooks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "notebooks_delete_own" on public.notebooks;
create policy "notebooks_delete_own" on public.notebooks
  for delete using (auth.uid() = user_id);

drop policy if exists "study_plans_select_own" on public.study_plans;
create policy "study_plans_select_own" on public.study_plans
  for select using (auth.uid() = user_id);
drop policy if exists "study_plans_insert_own" on public.study_plans;
create policy "study_plans_insert_own" on public.study_plans
  for insert with check (auth.uid() = user_id);
drop policy if exists "study_plans_update_own" on public.study_plans;
create policy "study_plans_update_own" on public.study_plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "study_plans_delete_own" on public.study_plans;
create policy "study_plans_delete_own" on public.study_plans
  for delete using (auth.uid() = user_id);

drop policy if exists "study_sessions_select_own" on public.study_sessions;
create policy "study_sessions_select_own" on public.study_sessions
  for select using (auth.uid() = user_id);
drop policy if exists "study_sessions_insert_own" on public.study_sessions;
create policy "study_sessions_insert_own" on public.study_sessions
  for insert with check (auth.uid() = user_id);
drop policy if exists "study_sessions_update_own" on public.study_sessions;
create policy "study_sessions_update_own" on public.study_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "study_sessions_delete_own" on public.study_sessions;
create policy "study_sessions_delete_own" on public.study_sessions
  for delete using (auth.uid() = user_id);

drop policy if exists "study_session_items_select_own" on public.study_session_items;
create policy "study_session_items_select_own" on public.study_session_items
  for select using (auth.uid() = user_id);
drop policy if exists "study_session_items_insert_own" on public.study_session_items;
create policy "study_session_items_insert_own" on public.study_session_items
  for insert with check (auth.uid() = user_id);
drop policy if exists "study_session_items_update_own" on public.study_session_items;
create policy "study_session_items_update_own" on public.study_session_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "study_session_items_delete_own" on public.study_session_items;
create policy "study_session_items_delete_own" on public.study_session_items
  for delete using (auth.uid() = user_id);

drop policy if exists "study_history_select_own" on public.study_history;
create policy "study_history_select_own" on public.study_history
  for select using (auth.uid() = user_id);
drop policy if exists "study_history_insert_own" on public.study_history;
create policy "study_history_insert_own" on public.study_history
  for insert with check (auth.uid() = user_id);

drop policy if exists "shadowing_items_select_own" on public.shadowing_items;
create policy "shadowing_items_select_own" on public.shadowing_items
  for select using (auth.uid() = user_id);
drop policy if exists "shadowing_items_insert_own" on public.shadowing_items;
create policy "shadowing_items_insert_own" on public.shadowing_items
  for insert with check (auth.uid() = user_id);
drop policy if exists "shadowing_items_update_own" on public.shadowing_items;
create policy "shadowing_items_update_own" on public.shadowing_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "shadowing_items_delete_own" on public.shadowing_items;
create policy "shadowing_items_delete_own" on public.shadowing_items
  for delete using (auth.uid() = user_id);

drop policy if exists "shadowing_recordings_select_own" on public.shadowing_recordings;
create policy "shadowing_recordings_select_own" on public.shadowing_recordings
  for select using (auth.uid() = user_id);
drop policy if exists "shadowing_recordings_insert_own" on public.shadowing_recordings;
create policy "shadowing_recordings_insert_own" on public.shadowing_recordings
  for insert with check (auth.uid() = user_id);
drop policy if exists "shadowing_recordings_update_own" on public.shadowing_recordings;
create policy "shadowing_recordings_update_own" on public.shadowing_recordings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "shadowing_recordings_delete_own" on public.shadowing_recordings;
create policy "shadowing_recordings_delete_own" on public.shadowing_recordings
  for delete using (auth.uid() = user_id);

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own" on public.user_preferences
  for select using (auth.uid() = user_id);
drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own" on public.user_preferences
  for insert with check (auth.uid() = user_id);
drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own" on public.user_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "user_preferences_delete_own" on public.user_preferences;
create policy "user_preferences_delete_own" on public.user_preferences
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.notebooks to authenticated;
grant select, insert, update, delete on public.study_plans to authenticated;
grant select, insert, update, delete on public.study_sessions to authenticated;
grant select, insert, update, delete on public.study_session_items to authenticated;
grant select, insert on public.study_history to authenticated;
grant select, insert, update, delete on public.shadowing_items to authenticated;
grant select, insert, update, delete on public.shadowing_recordings to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

insert into storage.buckets (id, name, public)
values
  ('shadowing-standard-audio', 'shadowing-standard-audio', false),
  ('shadowing-recordings', 'shadowing-recordings', false)
on conflict (id) do update set
  public = excluded.public;

drop policy if exists "shadowing_standard_audio_select_own" on storage.objects;
create policy "shadowing_standard_audio_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shadowing-standard-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shadowing_standard_audio_insert_own" on storage.objects;
create policy "shadowing_standard_audio_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shadowing-standard-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shadowing_standard_audio_update_own" on storage.objects;
create policy "shadowing_standard_audio_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shadowing-standard-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'shadowing-standard-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shadowing_standard_audio_delete_own" on storage.objects;
create policy "shadowing_standard_audio_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shadowing-standard-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shadowing_recordings_select_own" on storage.objects;
create policy "shadowing_recordings_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shadowing-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shadowing_recordings_insert_own" on storage.objects;
create policy "shadowing_recordings_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shadowing-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shadowing_recordings_update_own" on storage.objects;
create policy "shadowing_recordings_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shadowing-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'shadowing-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shadowing_recordings_delete_own" on storage.objects;
create policy "shadowing_recordings_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shadowing-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
