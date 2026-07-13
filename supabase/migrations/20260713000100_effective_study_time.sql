create table if not exists public.effective_study_time (
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null,
  study_date date not null,
  timezone text not null default 'UTC',
  active_ms bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id, study_date),
  constraint effective_study_time_device_id_check check (char_length(device_id) between 1 and 128),
  constraint effective_study_time_active_ms_check check (active_ms between 0 and 86400000)
);

create index if not exists effective_study_time_user_date_idx
  on public.effective_study_time (user_id, study_date);

alter table public.effective_study_time enable row level security;

drop policy if exists "effective_study_time_select_own" on public.effective_study_time;
create policy "effective_study_time_select_own" on public.effective_study_time
  for select using (auth.uid() = user_id);

drop policy if exists "effective_study_time_insert_own" on public.effective_study_time;
create policy "effective_study_time_insert_own" on public.effective_study_time
  for insert with check (auth.uid() = user_id);

drop policy if exists "effective_study_time_update_own" on public.effective_study_time;
create policy "effective_study_time_update_own" on public.effective_study_time
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.effective_study_time to authenticated;

create or replace function public.merge_effective_study_time(
  p_device_id text,
  p_study_date date,
  p_active_ms bigint,
  p_timezone text default 'UTC'
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  merged_active_ms bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_device_id is null or char_length(trim(p_device_id)) not between 1 and 128 then
    raise exception 'Invalid device id';
  end if;
  if p_study_date is null then
    raise exception 'Study date is required';
  end if;
  if p_active_ms is null or p_active_ms < 0 or p_active_ms > 86400000 then
    raise exception 'Invalid active study time';
  end if;

  insert into public.effective_study_time (
    user_id,
    device_id,
    study_date,
    timezone,
    active_ms
  ) values (
    auth.uid(),
    trim(p_device_id),
    p_study_date,
    left(coalesce(nullif(trim(p_timezone), ''), 'UTC'), 128),
    p_active_ms
  )
  on conflict (user_id, device_id, study_date) do update
    set active_ms = greatest(public.effective_study_time.active_ms, excluded.active_ms),
        timezone = excluded.timezone,
        updated_at = now()
  returning active_ms into merged_active_ms;

  return merged_active_ms;
end;
$$;

revoke all on function public.merge_effective_study_time(text, date, bigint, text) from public;
revoke all on function public.merge_effective_study_time(text, date, bigint, text) from anon;
grant execute on function public.merge_effective_study_time(text, date, bigint, text) to authenticated;
