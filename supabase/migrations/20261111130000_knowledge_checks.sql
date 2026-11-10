-- Round G (2026-11-11): every paid knowledge check, kept whole and keyed so the same check is never
-- paid for twice (the 2026-11-02 audit's raw results lived in a temp file and were lost; 2,527 of its
-- 3,785 calls were retries). task_key = hash(entry, field, target, input version, check version):
-- a done row is reused; a running row younger than its lease is skipped (another worker has it); a
-- failed row may be retried, counted in attempts. Additive only: no existing table is changed.
create table if not exists public.knowledge_checks (
  id uuid primary key default gen_random_uuid(),
  task_key text not null unique,
  learning_object_id uuid not null references public.learning_objects(id) on delete cascade,
  headword text not null,
  part_of_speech text,
  field text not null,                    -- 'sense', 'pos', …
  sense_ref text,                         -- which sense / meaning part the check is about
  target text not null,                   -- e.g. 'korp_sense_parts'
  input_hash text not null,               -- hash of the checked content (meaning, sentences)
  input jsonb not null,                   -- what was checked: meaning, Korp query and sentences
  references_used jsonb,                  -- dictionary and other evidence the check had
  check_version text not null,
  rule_version text,
  model text,
  batch_id uuid,
  status text not null check (status in ('running', 'done', 'failed')),
  attempts int not null default 1,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  result jsonb,                           -- the AI's readings, verdict, reasons, unconfirmed parts
  conflicts jsonb,
  cost_usd numeric(10,6) not null default 0,
  calls int not null default 0,
  usage jsonb,                            -- tokens per call
  error text,
  adopted boolean,                        -- did the result change the card's status
  written_fields text[],
  recheck_reason text                     -- why a check that existed was run again
);
create index if not exists knowledge_checks_object_idx on public.knowledge_checks (learning_object_id, field);
alter table public.knowledge_checks enable row level security;   -- service role only, no policies
grant select, insert, update, delete on public.knowledge_checks to service_role;
revoke all on public.knowledge_checks from anon, authenticated;
