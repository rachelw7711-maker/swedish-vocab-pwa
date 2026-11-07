-- Rollback of 20261107120000_reading_deep_claim.sql. The server falls back to unclaimed deep
-- runs when the column is missing, so this can be applied while it runs.
alter table public.text_analysis drop column if exists deep_started_at;
