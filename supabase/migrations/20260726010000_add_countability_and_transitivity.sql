-- SPK-DIC-001 flagged these two as missing fields (§3 nouns, §4 verbs).
-- Populated for the first time by scripts/backfill-legacy-word-forms.mjs.
alter table public.learning_objects
  add column if not exists countability text,
  add column if not exists transitivity text;

alter table public.learning_objects
  drop constraint if exists learning_objects_countability_check;
alter table public.learning_objects
  add constraint learning_objects_countability_check
    check (countability is null or countability in ('countable', 'uncountable', 'both'));

alter table public.learning_objects
  drop constraint if exists learning_objects_transitivity_check;
alter table public.learning_objects
  add constraint learning_objects_transitivity_check
    check (transitivity is null or transitivity in ('transitive', 'intransitive', 'both'));
