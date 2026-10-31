-- Rollback of migration 20261101140000_learning_object_senses: drops the sense columns and
-- tables. Entries, their meanings, examples and collocations are not touched.
begin;
alter table public.learning_object_examples drop column if exists sense_id;
alter table public.learning_object_collocations drop column if exists sense_id;
drop table if exists public.learning_object_sense_translations;
drop table if exists public.learning_object_senses;
commit;
