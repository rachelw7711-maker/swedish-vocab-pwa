-- Reading analysis: keep the scored candidates, not only the final picks
-- (product decision 2026-10-30).
--
-- candidate_vocabulary  — every keyword the analysis picked, best first:
--   { word_id|null, swedish, pos, chinese (short meaning in this text, in the
--     analysis language), cefr_level (the dictionary's own, else null),
--     occurrences }
--   The shown keywords always get a full entry (word_id); the other candidates
--   keep word_id null until a reader asks for one.
-- candidate_expressions — every collocation / idiom the analysis picked, best
--   first, with the same fields as selected_expressions.
-- text_cefr             — the text's overall CEFR level (A1–C2), judged in the
--   fast layer; kept for the future curated reading library.
--
-- selected_vocabulary / selected_expressions keep their meaning (the shared
-- default picks, same counts as before). Older analyses keep NULL here and are
-- only re-ordered within their selected items.
--
-- Rollback:
--   alter table public.text_analysis
--     drop column if exists candidate_vocabulary,
--     drop column if exists candidate_expressions,
--     drop column if exists text_cefr;

alter table public.text_analysis
  add column if not exists candidate_vocabulary jsonb,
  add column if not exists candidate_expressions jsonb,
  add column if not exists text_cefr text;
