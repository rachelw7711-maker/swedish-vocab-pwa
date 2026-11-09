-- Rollback of 20261110120000_knowledge_v2_evidence.sql: drops only what it added.
begin;
alter table public.resource_sources drop column if exists display_allowed, drop column if exists prompt_allowed, drop column if exists terms_url, drop column if exists dataset_version;
alter table public.learning_objects drop column if exists lexeme_key;
drop table if exists public.korp_cache;
drop table if exists public.expression_surface_forms;
drop table if exists public.learning_object_senses;
alter table public.resource_field_status drop column if exists rule_version, drop column if exists grade;
drop table if exists public.content_evidence;
commit;
