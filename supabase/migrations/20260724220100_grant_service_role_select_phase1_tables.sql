-- Follow-up to 20260724220000: that migration granted service_role
-- insert/update/delete on the 5 Phase 1 tables but missed select, which a
-- backfill script immediately needed (to check which rows already have a
-- 'zh' translation before inserting, so it doesn't collide with pre-existing
-- content on a shared Swedish spelling). Same parity rationale as before.

grant select on public.word_forms to service_role;
grant select on public.learning_object_translations to service_role;
grant select on public.learning_object_examples to service_role;
grant select on public.learning_object_collocations to service_role;
grant select on public.learning_object_relationships to service_role;
