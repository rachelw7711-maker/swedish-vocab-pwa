-- Sentence highlight/notes (2026-07-30, tier-3 item 10 of Reviews/阅读模块
-- 设计想法-专业review-2026-07-27.md §十三) — a small JSON blob on the owning
-- reading_items row, same pattern as user_words.personal_note, rather than
-- a whole new table: this is purely the user's own private annotation of
-- their own saved text, no cross-user/shared-knowledge concerns apply.
-- Shape: [{ sentenceIndex: number, text: string (sentence, for display even
-- if the source is later edited), note: string }].
alter table public.reading_items
  add column if not exists notes jsonb not null default '[]'::jsonb;
