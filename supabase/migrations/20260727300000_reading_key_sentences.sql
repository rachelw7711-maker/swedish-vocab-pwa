-- 阅读模块设计想法-专业review-2026-07-27.md §6 — key sentences are a third,
-- independent analysis output (distinct from the source_sentence attached
-- to a vocabulary/expression item): the most Shadowing-worthy/representative
-- sentences in the article.
alter table public.text_analysis
  add column if not exists key_sentences jsonb not null default '[]'::jsonb;
