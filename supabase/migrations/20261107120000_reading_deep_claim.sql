-- One deep reading analysis per row (2026-11-07). Two deep requests for the same
-- text_analysis row (a double tap, a retry while the first still runs) each ran — and paid
-- for — the whole AI selection. A request now claims the row with one conditional update:
--
--   update text_analysis set deep_started_at = now()
--    where id = $1 and status <> 'ready' and deep_started_at < now() - interval '5 minutes'
--
-- Postgres re-checks the condition of the second of two concurrent updates after the first
-- commits, so only one of them gets the row; the other waits for its result. A failed run
-- sets it back to the epoch; a claim older than five minutes (the function's time limit)
-- counts as abandoned. The server runs unclaimed, as before, until this column exists.
alter table public.text_analysis
  add column if not exists deep_started_at timestamptz not null default '1970-01-01T00:00:00Z';
