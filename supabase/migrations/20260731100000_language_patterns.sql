-- Language Patterns (语言模式) — 2026-07-31, per Desktop AI语义评分.pages §5
-- (语法观察). Not a grammar lesson (generic AI chatbots already do that);
-- sentence-level constructions worth noticing, max 4, bundled into the
-- same key_expressions_and_sentences AI call as collocations/idioms/key
-- sentences (no extra API cost).
alter table public.text_analysis
  add column if not exists language_patterns jsonb not null default '[]'::jsonb;

-- reading_analysis_items (2026-07-30) needs a matching item_type so
-- language patterns get the same per-user state tracking as vocabulary/
-- expressions/sentences.
alter table public.reading_analysis_items
  drop constraint if exists reading_analysis_items_item_type_check;
alter table public.reading_analysis_items
  add constraint reading_analysis_items_item_type_check
    check (item_type in ('vocabulary', 'expression', 'sentence', 'pattern'));
