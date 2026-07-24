-- ============================================================================
-- Replace the undocumented UNIQUE(swedish) constraint (name: words_swedish_key,
-- a leftover from before the words -> learning_objects rename, never declared
-- in schema.sql or any tracked migration) with UNIQUE(swedish, part_of_speech).
--
-- Discovered 2026-07-24 committing a pilot word batch: inserting "vara" as a
-- verb ("to be") failed because "vara" already existed as a noun ("goods").
-- That's a legitimate homograph, not a duplicate — Reviews/SPK-DIC-001_
-- SprakLab_Word_Card_Content_Standard_v1.0.docx §11 explicitly requires
-- supporting multiple entries/senses per lemma ("一个 lemma 可能具有多个词性
-- 或多个主要义项"), which the swedish-alone constraint made impossible.
--
-- Safe to add without a pre-check: every existing row's `swedish` value was
-- already confirmed unique on its own (5,819 rows, 5,819 distinct spellings,
-- per scripts/build-vocab-expansion-candidates.mjs's 2026-07-24 run), so
-- uniqueness on the coarser (swedish, part_of_speech) pair holds trivially.
-- ============================================================================

alter table public.learning_objects
  drop constraint if exists words_swedish_key;
drop index if exists public.words_swedish_key;

alter table public.learning_objects
  drop constraint if exists learning_objects_swedish_pos_key;
alter table public.learning_objects
  add constraint learning_objects_swedish_pos_key unique (swedish, part_of_speech);
