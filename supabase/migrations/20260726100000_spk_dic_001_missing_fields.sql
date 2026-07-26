-- SPK-DIC-001 full-standard audit (Reviews/SPK-DIC-001-完整标准核对与任务清单-2026-07-26.md)
-- adds the remaining fields the standard requires that had no column at all yet.

alter table public.learning_objects
  add column if not exists memory_tip text,
  add column if not exists grammar_note text,
  add column if not exists adverb_form text,
  add column if not exists comparison_type text,
  add column if not exists passiv_s text,
  add column if not exists function_tags jsonb not null default '[]'::jsonb,
  add column if not exists meaning_note text;

alter table public.learning_objects
  drop constraint if exists learning_objects_comparison_type_check;
alter table public.learning_objects
  add constraint learning_objects_comparison_type_check
    check (comparison_type is null or comparison_type in ('regular', 'irregular', 'non-comparable'));

-- Word Family / Partikelverb / Reflexivt (§2, §4) had no relationship_type to
-- express them — 'related' was the only fallback, indistinguishable from a
-- loose association.
alter table public.learning_object_relationships
  drop constraint if exists learning_object_relationships_type_check;
alter table public.learning_object_relationships
  add constraint learning_object_relationships_type_check
    check (relationship_type in ('related', 'synonym', 'antonym', 'derived_from', 'word_family', 'particle_verb', 'reflexive'));

-- Fix a data typo found while auditing form_type coverage: 4 rows were
-- written as "_defefinite" instead of "_definite" and silently failed to
-- render on those 4 words' grammar sections.
update public.word_forms set form_type = 'plural_definite' where form_type = 'plural_defefinite';
update public.word_forms set form_type = 'singular_definite' where form_type = 'singular_defefinite';
