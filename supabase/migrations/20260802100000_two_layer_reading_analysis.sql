-- Two-layer fast/deep reading analysis (Rachel's 2026-08-01 confirmed decision,
-- from 关于阅读模块的调整.pages 两层生成方案): the fast layer writes headline_zh +
-- key_points (content-highlight bullets, not grammar points — grammar-level
-- observations stay in the deep layer's existing language_patterns) right
-- away; the deep layer (vocabulary/expressions/sentences/patterns) fills in
-- the rest of the same row afterward.

alter table text_analysis
  add column if not exists headline_zh text,
  add column if not exists key_points jsonb not null default '[]'::jsonb;

alter table text_resources
  drop constraint if exists text_resources_analysis_status_check;

alter table text_resources
  add constraint text_resources_analysis_status_check
    check (analysis_status in ('pending', 'summary_ready', 'ready', 'failed'));
