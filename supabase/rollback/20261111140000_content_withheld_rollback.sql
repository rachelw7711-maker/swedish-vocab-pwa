-- Rollback of 20261111140000_content_withheld. First restore any withheld glosses to their cards
-- (scripts/rule-ab.mjs --rollback <batch>), then:
drop table if exists public.content_withheld;
delete from supabase_migrations.schema_migrations where version = '20261111140000';
