-- Per-item discovery-state tracking for reading analysis results
-- (Reviews/阅读模块设计想法-专业review-2026-07-27.md §3, revisited and
-- approved 2026-07-30 per Reviews/阅读模块理念升级与ChatGPT实验-综合review与
-- 执行计划-2026-07-30.md decision #3). Replaces "one JSON array in
-- text_analysis, no per-item state" with one row per discovered
-- vocabulary/expression/sentence, each independently trackable
-- (new/viewed/saved/added_to_learning/ignored).
--
-- Deliberately scoped down per Rachel's 2026-07-30 decision: this migration
-- only builds the state-tracking mechanism for whatever text_analysis
-- already surfaces today (selected_vocabulary/selected_expressions/
-- key_sentences) — it does NOT change which words get surfaced, and does
-- NOT auto-add anything to user_words. That's an explicitly separate,
-- not-yet-decided next step.
--
-- Rows are per-(text_analysis, user) rather than per-text_analysis alone
-- because a text_analysis row can be shared/reused across users (规范§15
-- "Generate Once, Reuse Forever" — see findPublicAnalysisByHash in
-- server-reading.mjs): two different users reading the same cached public
-- analysis must each get their own independent "have I looked at/saved
-- this word" state, not share one.
create table if not exists public.reading_analysis_items (
  id uuid primary key default gen_random_uuid(),
  text_analysis_id uuid not null references public.text_analysis (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null,
  ref_id uuid,
  item_data jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reading_analysis_items
  drop constraint if exists reading_analysis_items_item_type_check;
alter table public.reading_analysis_items
  add constraint reading_analysis_items_item_type_check
    check (item_type in ('vocabulary', 'expression', 'sentence'));

alter table public.reading_analysis_items
  drop constraint if exists reading_analysis_items_status_check;
alter table public.reading_analysis_items
  add constraint reading_analysis_items_status_check
    check (status in ('new', 'viewed', 'saved', 'added_to_learning', 'ignored'));

-- One state row per user per surfaced item. sort_order is part of the key
-- (not just ref_id) because key_sentences have no ref_id at all, and
-- because the same word/expression could in principle appear as more than
-- one distinct surfaced item within one analysis in the future.
create unique index if not exists reading_analysis_items_unique_idx
  on public.reading_analysis_items (text_analysis_id, user_id, item_type, sort_order);

create index if not exists reading_analysis_items_user_idx
  on public.reading_analysis_items (user_id, status);
create index if not exists reading_analysis_items_analysis_idx
  on public.reading_analysis_items (text_analysis_id);

drop trigger if exists reading_analysis_items_set_updated_at on public.reading_analysis_items;
create trigger reading_analysis_items_set_updated_at
  before update on public.reading_analysis_items
  for each row execute function public.set_updated_at();

alter table public.reading_analysis_items enable row level security;

drop policy if exists "reading_analysis_items_select_own" on public.reading_analysis_items;
create policy "reading_analysis_items_select_own" on public.reading_analysis_items
  for select using (auth.uid() = user_id);

-- Users may only ever change status (viewed/saved/ignored/etc) on their own
-- rows — row creation itself is service-role only (materialized server-side
-- the first time a user's own reading resolves to a given text_analysis,
-- see analyzeReadingResource in server-reading.mjs), same reasoning as
-- promoteCollocationToPhrase needing service role: the item catalog itself
-- (which words/expressions/sentences an analysis surfaced) is derived from
-- shared AI output, not something the client freely inserts.
drop policy if exists "reading_analysis_items_update_own" on public.reading_analysis_items;
create policy "reading_analysis_items_update_own" on public.reading_analysis_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, update on public.reading_analysis_items to authenticated;
grant select, insert, update, delete on public.reading_analysis_items to service_role;
