-- SprakLab Implementation Report / Phase 5: begin collecting real review
-- history for future spaced-repetition evaluation (FSRS-评估文档.md §10
-- recommendation — do NOT implement FSRS itself, just start logging).
--
-- This is a pure append-only observation table: it records the rating the
-- existing fixed-interval algorithm already derives in app.js
-- (deriveStudyRating -> "again" | "hard" | "good", completeCurrentStudy-
-- WordFromSpelling) alongside the schedule it produced. It does not feed
-- back into that algorithm and does not change it.
create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  word_id uuid not null references public.learning_objects (id) on delete cascade,
  study_session_id uuid references public.study_sessions (id) on delete set null,
  mode text not null,
  rating text not null,
  is_correct boolean not null,
  attempts integer not null default 1,
  review_stage integer,
  interval_days integer,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint review_events_mode_check check (mode in ('new', 'review')),
  constraint review_events_rating_check check (rating in ('again', 'hard', 'good')),
  constraint review_events_attempts_check check (attempts >= 1)
);

create index if not exists review_events_user_id_idx on public.review_events (user_id);
create index if not exists review_events_word_id_idx on public.review_events (word_id);
create index if not exists review_events_user_reviewed_idx on public.review_events (user_id, reviewed_at);

alter table public.review_events enable row level security;

drop policy if exists "review_events_select_own" on public.review_events;
create policy "review_events_select_own" on public.review_events
  for select using (auth.uid() = user_id);

drop policy if exists "review_events_insert_own" on public.review_events;
create policy "review_events_insert_own" on public.review_events
  for insert with check (auth.uid() = user_id);

grant select, insert on public.review_events to authenticated;
