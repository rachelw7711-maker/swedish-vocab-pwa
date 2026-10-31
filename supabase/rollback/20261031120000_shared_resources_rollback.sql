-- Rollback for 20261031120000_shared_resources.sql (and 20261031130000_saldo_reference.sql).
-- Removes only what those migrations added; learning_objects rows, ids and all
-- learning data are untouched. Content added after the migration stays (its new
-- columns are dropped with the rest).
begin;
revoke select on public.user_preferences from service_role;
drop table if exists public.saldo_wordforms;
drop table if exists public.saldo_lemmas;
drop trigger if exists learning_objects_resource_defaults on public.learning_objects;
drop trigger if exists learning_objects_add_module on public.learning_objects;
drop function if exists public.learning_objects_resource_defaults();
drop function if exists public.learning_objects_add_module();
drop function if exists public.promote_to_basic(uuid[], text, boolean);
drop function if exists public.revert_tier_batch(uuid);
drop function if exists public.preview_tier_promotion(uuid[], boolean);
drop function if exists public.refresh_resource_summary(uuid[]);
drop function if exists public.has_extended_access(uuid);
drop function if exists public.start_commercial_mode();
drop function if exists public.content_origin_for(text);
drop table if exists public.enrichment_tasks;
drop table if exists public.enrichment_jobs;
drop table if exists public.tier_changes;
drop table if exists public.resource_field_status;
drop table if exists public.learning_object_sources;
drop table if exists public.resource_sources;
drop table if exists public.learning_object_modules;
drop table if exists public.plan_limits;
drop table if exists public.app_settings;
drop index if exists public.learning_objects_access_tier_idx;
drop index if exists public.learning_objects_match_key_idx;
alter table public.learning_objects
  drop column if exists access_tier, drop column if exists content_origin, drop column if exists verification_status,
  drop column if exists completeness, drop column if exists missing_fields, drop column if exists match_key,
  drop column if exists tier_changed_at;
do $$ begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    delete from supabase_migrations.schema_migrations where version in ('20261031120000', '20261031130000');
  end if;
end $$;
commit;
