-- Round G (2026-11-11). Additive only: nullable columns, no existing value changes.
--   1. learning_object_relationships.grade / evidence — whether a relation's type (synonym,
--      antonym, a derivation) is backed by a dictionary or a structured etymology (verified), and by
--      what; null = the type as written (AI, July 2026), shown as a related word only.
--   2. learning_objects.constructions — the Lexin constructions (valency: "ngn lovar ngn ngt") of the
--      senses a card teaches: [{ pattern, source, variant }]; null = none recorded. Shown under
--      Fördjupning with Lexin's attribution (CC BY 4.0), never as a collocation.
-- Rollback: supabase/rollback/20261111100000_round_g_relations_constructions_rollback.sql
begin;
alter table public.learning_object_relationships
  add column if not exists grade text check (grade is null or grade in ('verified')),
  add column if not exists evidence jsonb;
alter table public.learning_objects add column if not exists constructions jsonb;
commit;
