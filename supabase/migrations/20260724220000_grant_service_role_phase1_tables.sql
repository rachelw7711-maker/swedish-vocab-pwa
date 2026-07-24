-- ============================================================================
-- Fix: service_role is missing INSERT/UPDATE/DELETE on the 5 tables added
-- by 20260719000100_learning_objects_phase1.sql.
--
-- That migration only granted insert/update/delete to `authenticated` (real
-- logged-in users, via the app) and select to `anon, authenticated`. It
-- never granted anything to `service_role`, which server-side/admin scripts
-- (e.g. scripts/upsert-learning-objects.mjs) authenticate as. The older
-- `learning_objects` table (renamed from `words`) wasn't affected because it
-- predates this migration and already had working service_role access
-- through Supabase's standard project-level default privileges; those
-- defaults evidently didn't carry over to these 5 newly created tables.
--
-- Discovered 2026-07-24 committing a 12-word pilot batch: the
-- learning_objects insert succeeded, the learning_object_translations
-- insert immediately after failed with "permission denied for table
-- learning_object_translations" (Postgres error 42501). This grants the
-- same insert/update/delete access service_role needs, mirroring exactly
-- what `authenticated` already has — no new capability beyond that parity.
-- ============================================================================

grant insert, update, delete on public.word_forms to service_role;
grant insert, update, delete on public.learning_object_translations to service_role;
grant insert, update, delete on public.learning_object_examples to service_role;
grant insert, update, delete on public.learning_object_collocations to service_role;
grant insert, update, delete on public.learning_object_relationships to service_role;
