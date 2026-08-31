-- Phase 5 (Product Owner Implementation Authorization, 2026-08-31):
-- FSRS was evaluated and explicitly rejected for now (see
-- Reviews/FSRS-评估文档.md) — the current fixed-ladder review scheduler in
-- app.js (STAGE_INTERVAL_DAYS/computeNextReview) is left completely
-- unchanged by this migration. This table only begins collecting the real
-- per-review history FSRS would eventually need, so a future evaluation
-- has real data instead of starting from zero. Append-only: a review
-- event is a historical fact, not editable state, so there are no
-- update/delete policies or grants.
create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  word_id uuid not null references public.learning_objects (id) on delete cascade,
  rating text not null check (rating in ('again', 'hard', 'good')),
  session_mode text not null check (session_mode in ('new', 'review')),
  review_stage_before smallint not null default 0,
  review_stage_after smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists review_events_user_id_idx on public.review_events (user_id);
create index if not exists review_events_user_created_idx on public.review_events (user_id, created_at desc);
create index if not exists review_events_word_id_idx on public.review_events (word_id);

alter table public.review_events enable row level security;

drop policy if exists "review_events_select_own" on public.review_events;
create policy "review_events_select_own" on public.review_events
  for select using (auth.uid() = user_id);
drop policy if exists "review_events_insert_own" on public.review_events;
create policy "review_events_insert_own" on public.review_events
  for insert with check (auth.uid() = user_id);

grant select, insert on public.review_events to authenticated;
grant select, insert on public.review_events to service_role;
