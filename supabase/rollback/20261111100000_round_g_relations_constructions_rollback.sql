begin;
-- Rows the round-G relation pass added (evidence.batch) go with the columns.
delete from public.learning_object_relationships where evidence ? 'added_by';
alter table public.learning_object_relationships drop column if exists grade, drop column if exists evidence;
alter table public.learning_objects drop column if exists constructions;
commit;
