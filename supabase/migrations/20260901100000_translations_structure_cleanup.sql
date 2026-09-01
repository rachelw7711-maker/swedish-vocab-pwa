-- Multi-native-language readiness, structural cleanup phase (Rachel's
-- 2026-09-01 decision: fix the structure and stabilize it before adding
-- any new language). learning_object_translations has existed since Phase 1
-- (20260719000100) as the intended "native-language content" home, but only
-- its `meaning` column was ever actually kept in sync — everything else
-- native-language-dependent (example translation, memory tip, grammar
-- note, collocation/related-word glosses) ended up living directly on
-- learning_objects as Chinese-only columns instead, added by later,
-- independent work that didn't route through this table. Result: those
-- fields would show Chinese regardless of a user's selected native
-- language. This migration gives them all a real per-language home.
--
-- learning_objects.chinese/example_zh/memory_tip/grammar_note/meaning_note/
-- collocations/related_words are NOT dropped here — they stay as the
-- zh-only legacy fallback (same role `chinese` already plays), removed in a
-- later cleanup once the new read path has been live a while.

alter table public.learning_object_translations
  add column if not exists meaning_note text not null default '',
  add column if not exists collocations text not null default '',
  add column if not exists related_words text not null default '';

-- explanation/cultural_note: part of the original Phase 1 design, never
-- populated for any language (including zh) and never read anywhere in the
-- app — confirmed via grep before this migration. No current Chinese
-- content to preserve; dropping rather than carrying two more permanently
-- empty columns forward.
alter table public.learning_object_translations
  drop column if exists explanation,
  drop column if exists cultural_note;

-- One-time backfill: copy the real existing Chinese content into its
-- correct per-language home for the zh rows that already exist (one row
-- per learning_object, created by the original Phase 1 backfill). Pure
-- data move, zero AI cost — the source columns are left in place.
update public.learning_object_translations t
set
  example_translation = coalesce(lo.example_zh, ''),
  learning_tip = coalesce(lo.memory_tip, ''),
  grammar_note = coalesce(lo.grammar_note, ''),
  meaning_note = coalesce(lo.meaning_note, ''),
  collocations = coalesce(lo.collocations, ''),
  related_words = coalesce(lo.related_words, ''),
  updated_at = now()
from public.learning_objects lo
where t.learning_object_id = lo.id
  and t.native_language = 'zh'
  and (
    coalesce(lo.example_zh, '') <> ''
    or coalesce(lo.memory_tip, '') <> ''
    or coalesce(lo.grammar_note, '') <> ''
    or coalesce(lo.meaning_note, '') <> ''
    or coalesce(lo.collocations, '') <> ''
    or coalesce(lo.related_words, '') <> ''
  );

-- Any learning_objects row created after the Phase 1 backfill but before
-- this migration (unlikely given the timeline, but cheap to cover) that
-- has no zh translation row at all yet.
insert into public.learning_object_translations
  (learning_object_id, native_language, meaning, example_translation, learning_tip, grammar_note, meaning_note, collocations, related_words)
select id, 'zh', coalesce(chinese, ''), coalesce(example_zh, ''), coalesce(memory_tip, ''), coalesce(grammar_note, ''), coalesce(meaning_note, ''), coalesce(collocations, ''), coalesce(related_words, '')
from public.learning_objects lo
where not exists (
  select 1 from public.learning_object_translations t
  where t.learning_object_id = lo.id and t.native_language = 'zh'
);
