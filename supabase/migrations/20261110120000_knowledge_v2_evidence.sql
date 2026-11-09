-- Knowledge v2, part A (2026-11-10; data/reports/round-f/knowledge-implementation-plan-2026-11-09.md
-- §3.7, §5.1, §6.2, §13). Additive only: new tables and nullable columns, no existing row changes.
--   1. content_evidence — every piece of evidence for one item of an entry (a sense, an example, a
--      collocation, the part of speech, a multi-word classification), with its kind, result
--      (supports / refutes / not_found / lookup_failed / disputed), strength, source and the rule
--      version that recorded it. The grade of an item is computed from these rows
--      (server-evidence.mjs gradeItem); nothing is removed for lack of evidence.
--   2. resource_field_status.grade / rule_version — the evidence grade next to the old status
--      (verified / ai_consistent / unverified / disputed / refuted), so old readers keep working.
--   3. learning_object_senses — an entry's senses one by one, with the Lexin sense (VariantID)
--      each is tied to: sense coverage and per-sense evidence.
--   4. expression_surface_forms — the inflected or punctuated spellings a text used for a fixed
--      phrase / expression ("stannar hemma" → stanna hemma), checked before a new entry is made.
--   5. korp_cache — Korp answers shared by the server (the file cache is not writable on Vercel).
--   6. learning_objects.lexeme_key — which word of a spelling and part of speech an entry is
--      (SALDO lemgram or Lexin entry), for homographs (en lag / ett lag); null = not decided.
-- Server only (service role) for 1, 4, 5; 3 is readable like the entries themselves.
-- Rollback: supabase/rollback/20261110120000_knowledge_v2_evidence_rollback.sql

begin;

create table if not exists public.content_evidence (
  id bigint generated always as identity primary key,
  learning_object_id uuid not null references public.learning_objects (id) on delete cascade,
  item_type text not null check (item_type in ('entry', 'pos', 'forms', 'sense', 'translation', 'example', 'collocation', 'related', 'classification')),
  item_ref text not null default '',          -- the item: sense id, example text hash, phrase …
  kind text not null check (kind in ('human', 'dictionary_sense_link', 'dictionary_listing', 'dictionary_original', 'saldo_morphology', 'program',
    'korp_sense', 'korp_attestation', 'korp_association', 'candidate_dictionary_overlap', 'wiktionary', 'ai_two_agree', 'ai_one', 'legacy_ai')),
  result text not null check (result in ('supports', 'refutes', 'not_found', 'lookup_failed', 'disputed')),
  strength smallint not null check (strength between 0 and 5),
  source_id text references public.resource_sources (id),
  source_ref jsonb not null default '{}',     -- Lexin VariantID / entry, SALDO lemgram, Korp CQP + counts, AI check version
  rule_version text not null,
  note text not null default '',
  recorded_at timestamptz not null default now(),
  unique (learning_object_id, item_type, item_ref, kind, rule_version)
);
create index if not exists content_evidence_object_idx on public.content_evidence (learning_object_id);
alter table public.content_evidence enable row level security;

alter table public.resource_field_status
  add column if not exists grade text check (grade is null or grade in ('verified', 'ai_consistent', 'unverified', 'disputed', 'refuted')),
  add column if not exists rule_version text;

create table if not exists public.learning_object_senses (
  id uuid primary key default gen_random_uuid(),
  learning_object_id uuid not null references public.learning_objects (id) on delete cascade,
  sense_order smallint not null default 0,
  lexin_variant text,                         -- Lexin VariantID the sense is tied to, null when none
  meaning_zh text not null default '',
  meaning_en text not null default '',
  meaning_sv text not null default '',
  grade text check (grade is null or grade in ('verified', 'ai_consistent', 'unverified', 'disputed', 'refuted')),
  rule_version text,
  updated_at timestamptz not null default now(),
  unique (learning_object_id, sense_order)
);
alter table public.learning_object_senses enable row level security;
drop policy if exists "learning_object_senses read" on public.learning_object_senses;
create policy "learning_object_senses read" on public.learning_object_senses for select to authenticated, anon using (true);

create table if not exists public.expression_surface_forms (
  surface_key text not null,                  -- normalizeText of the spelling met
  learning_object_id uuid not null references public.learning_objects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (surface_key, learning_object_id)
);
alter table public.expression_surface_forms enable row level security;

create table if not exists public.korp_cache (
  key text primary key,                       -- sha1 of the request URL
  response jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.korp_cache enable row level security;

alter table public.learning_objects add column if not exists lexeme_key text;

-- The datasets' own terms, so that what may be shown, sent to a model or only used as evidence
-- is recorded per dataset, not inferred from a licence name (§13.3).
alter table public.resource_sources
  add column if not exists display_allowed boolean,
  add column if not exists prompt_allowed boolean,
  add column if not exists terms_url text not null default '',
  add column if not exists dataset_version text not null default '';

commit;
