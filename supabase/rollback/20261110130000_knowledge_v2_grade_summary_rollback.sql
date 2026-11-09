-- Rollback of 20261110130000_knowledge_v2_grade_summary.sql: the previous statuses back from the
-- backup, and refresh_resource_summary as 20261103130000_verified_definition.sql defined it.
begin;
update public.learning_objects o
   set verification_status = b.verification_status, completeness = b.completeness, missing_fields = b.missing_fields
  from public.verification_status_backup_20261110 b
 where b.id = o.id;
commit;
-- Then restore the function only (rerunning the whole 20261103130000 migration would refresh every
-- entry again): run its "create or replace function public.refresh_resource_summary … $$;" block and
-- the revoke / grant lines after it, printed by
--   sed -n '/^create or replace function public.refresh_resource_summary/,/^grant execute/p' supabase/migrations/20261103130000_verified_definition.sql
-- (tested locally 2026-11-09: statuses and function back as before).
