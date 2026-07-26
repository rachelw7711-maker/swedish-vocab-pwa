-- Shared Text Resource model per SprakLab_AI成本控制与阅读模块实施规范_V1.1
-- §4/§17 (see Reviews/AI成本控制与阅读模块-实施计划-2026-07-26.md, Phase A).
-- Läsning and Shadowing both reference the same text_resources row instead
-- of each keeping their own private copy of the text — switching modules
-- must never trigger a re-analysis or re-generation.

create table if not exists public.text_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null default 'paste',
  original_text text not null,
  cleaned_text text not null,
  text_hash text not null,
  language text not null default 'sv',
  word_count integer not null default 0,
  analysis_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.text_resources
  drop constraint if exists text_resources_source_type_check;
alter table public.text_resources
  add constraint text_resources_source_type_check
    check (source_type in ('paste', 'upload', 'camera'));
alter table public.text_resources
  drop constraint if exists text_resources_analysis_status_check;
alter table public.text_resources
  add constraint text_resources_analysis_status_check
    check (analysis_status in ('pending', 'ready', 'failed'));

create index if not exists text_resources_user_id_idx on public.text_resources (user_id);
create index if not exists text_resources_user_hash_idx on public.text_resources (user_id, text_hash);

drop trigger if exists text_resources_set_updated_at on public.text_resources;
create trigger text_resources_set_updated_at
  before update on public.text_resources
  for each row execute function public.set_updated_at();

alter table public.text_resources enable row level security;
drop policy if exists "text_resources_select_own" on public.text_resources;
create policy "text_resources_select_own" on public.text_resources
  for select using (auth.uid() = user_id);
drop policy if exists "text_resources_insert_own" on public.text_resources;
create policy "text_resources_insert_own" on public.text_resources
  for insert with check (auth.uid() = user_id);
drop policy if exists "text_resources_update_own" on public.text_resources;
create policy "text_resources_update_own" on public.text_resources
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "text_resources_delete_own" on public.text_resources;
create policy "text_resources_delete_own" on public.text_resources
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.text_resources to authenticated;

-- ---------------------------------------------------------------------------
-- text_analysis — the three-layer result (规范§9): key vocabulary and key
-- expressions are references into learning_objects (word_id) / Fraser-
-- Uttryck (expression_id), never a second copy of their content. Summary is
-- separate and only ever populated on demand (规范§9.3/§10 — never
-- auto-generated at import time).
-- ---------------------------------------------------------------------------
create table if not exists public.text_analysis (
  id uuid primary key default gen_random_uuid(),
  text_resource_id uuid not null references public.text_resources (id) on delete cascade,
  analysis_version integer not null default 1,
  selected_vocabulary jsonb not null default '[]'::jsonb,
  selected_expressions jsonb not null default '[]'::jsonb,
  summary_sv text,
  summary_zh text,
  summary_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (text_resource_id, analysis_version)
);

create index if not exists text_analysis_resource_idx on public.text_analysis (text_resource_id);

drop trigger if exists text_analysis_set_updated_at on public.text_analysis;
create trigger text_analysis_set_updated_at
  before update on public.text_analysis
  for each row execute function public.set_updated_at();

alter table public.text_analysis enable row level security;
drop policy if exists "text_analysis_select_own" on public.text_analysis;
create policy "text_analysis_select_own" on public.text_analysis
  for select using (exists (select 1 from public.text_resources r where r.id = text_resource_id and r.user_id = auth.uid()));
drop policy if exists "text_analysis_insert_own" on public.text_analysis;
create policy "text_analysis_insert_own" on public.text_analysis
  for insert with check (exists (select 1 from public.text_resources r where r.id = text_resource_id and r.user_id = auth.uid()));
drop policy if exists "text_analysis_update_own" on public.text_analysis;
create policy "text_analysis_update_own" on public.text_analysis
  for update using (exists (select 1 from public.text_resources r where r.id = text_resource_id and r.user_id = auth.uid()));
drop policy if exists "text_analysis_delete_own" on public.text_analysis;
create policy "text_analysis_delete_own" on public.text_analysis
  for delete using (exists (select 1 from public.text_resources r where r.id = text_resource_id and r.user_id = auth.uid()));

grant select, insert, update, delete on public.text_analysis to authenticated;
-- service_role writes analysis results (the /api/reading/analyze endpoint
-- uses the service-role key, same pattern as /api/reading/analyze already
-- did for the old reading_items.summary_sv etc columns).

-- ---------------------------------------------------------------------------
-- ai_usage_logs — cost/token audit trail (规范§14/§17/§21). Populated from
-- the start regardless of whether credit limits are enforced (决策1,
-- 2026-07-26: record now, enforce later).
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  text_resource_id uuid references public.text_resources (id) on delete set null,
  feature text not null,
  model text not null default '',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  credits_used integer not null default 0,
  actual_cost numeric(10, 5) not null default 0,
  cache_hit boolean not null default false,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_logs_user_idx on public.ai_usage_logs (user_id, created_at desc);
create index if not exists ai_usage_logs_feature_idx on public.ai_usage_logs (feature, created_at desc);

alter table public.ai_usage_logs enable row level security;
drop policy if exists "ai_usage_logs_select_own" on public.ai_usage_logs;
create policy "ai_usage_logs_select_own" on public.ai_usage_logs
  for select using (auth.uid() = user_id);
grant select on public.ai_usage_logs to authenticated;
-- inserts are service-role only (server-side logging), no authenticated
-- insert/update/delete grant — matches ai_usage_logs being a system audit
-- trail, not user-editable data.

-- ---------------------------------------------------------------------------
-- reading_items / shadowing_items: point at the shared resource instead of
-- each keeping a private text copy. The old per-item summary_sv/summary_zh/
-- key_words/key_phrases columns on reading_items are dropped — that content
-- now lives in text_analysis, keyed by real word_id/expression_id rather
-- than freestanding AI-generated text (规范核心原则: 一个词条只有一份权威数据).
-- ---------------------------------------------------------------------------
alter table public.reading_items
  add column if not exists text_resource_id uuid references public.text_resources (id) on delete set null;
alter table public.reading_items drop column if exists summary_sv;
alter table public.reading_items drop column if exists summary_zh;
alter table public.reading_items drop column if exists key_words;
alter table public.reading_items drop column if exists key_phrases;
alter table public.reading_items drop column if exists analyzed_at;
alter table public.reading_items drop column if exists cefr_level;
-- source_text stays for now as a fallback/display convenience during the
-- migration window; new rows always also populate text_resource_id.

alter table public.shadowing_items
  add column if not exists text_resource_id uuid references public.text_resources (id) on delete set null;
create index if not exists shadowing_items_text_resource_idx on public.shadowing_items (text_resource_id);
