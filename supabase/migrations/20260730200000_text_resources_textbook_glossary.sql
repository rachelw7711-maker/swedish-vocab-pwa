-- 缺口2 (2026-07-30, Reviews/阅读模块理念升级与ChatGPT实验-综合review与执行
-- 计划-2026-07-30.md, approved by Rachel same day): photo-imported textbook
-- pages often already print a margin glossary (word + the book's own
-- definition) next to the main text — e.g. Rösten i natten. Captured once
-- at OCR time (the only moment the left/right page layout is still known;
-- once flattened to plain text it can't be recovered), stored alongside the
-- text it belongs to so the reading-analysis prompts can skip re-selecting
-- these words/phrases as key vocabulary or collocations.
alter table public.text_resources
  add column if not exists textbook_glossary jsonb not null default '[]'::jsonb;
