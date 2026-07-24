-- Adds the two SPK-DIC-001 fields prioritized for this vocab-expansion pass
-- (Reviews/SPK-DIC-001-标准对照评估与实施建议.md §6, item 1): frequency rank/
-- band (Kelly's source data already carries frequency info, worth capturing
-- while importing rather than backfilling later) and usage registers.
-- Additive only; both nullable/defaulted so existing rows are unaffected.

alter table public.learning_objects
  add column if not exists frequency_rank integer,
  add column if not exists frequency_band text,
  add column if not exists usage_registers jsonb not null default '[]'::jsonb;

create index if not exists learning_objects_frequency_rank_idx on public.learning_objects (frequency_rank);
