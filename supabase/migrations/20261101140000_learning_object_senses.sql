-- Senses (2026-11-01): one entry, several independent meanings. Each sense has its own
-- Swedish explanation, usage note and, per native language, its own meaning; examples
-- and collocations can point at the sense they illustrate. The entry stays the unit of
-- learning: ids, part of speech, forms, CEFR, tier, favourites, queue and review history
-- are untouched, and senses have no tier of their own (they follow the entry). The
-- entry-level meaning, explanation and examples stay as the summary and as the fallback
-- for entries without senses. Additive and re-runnable; the rollback drops what this adds.

create table if not exists public.learning_object_senses (
  id uuid primary key default gen_random_uuid(),
  learning_object_id uuid not null references public.learning_objects(id) on delete cascade,
  sense_order integer not null check (sense_order > 0),
  definition_sv text not null default '',
  usage_note text not null default '',
  register text,
  transitivity text check (transitivity is null or transitivity in ('transitive', 'intransitive', 'both')),
  source text not null default 'manual',
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified', 'needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (learning_object_id, sense_order)
);
create index if not exists learning_object_senses_object on public.learning_object_senses (learning_object_id);

-- Near-synonymous translations of one sense stay together in one meaning ("ready; finished").
create table if not exists public.learning_object_sense_translations (
  sense_id uuid not null references public.learning_object_senses(id) on delete cascade,
  native_language text not null,
  meaning text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (sense_id, native_language)
);

-- An example or collocation may illustrate one sense; null = not assigned (shown with the entry).
alter table public.learning_object_examples add column if not exists sense_id uuid references public.learning_object_senses(id) on delete set null;
alter table public.learning_object_collocations add column if not exists sense_id uuid references public.learning_object_senses(id) on delete set null;
create index if not exists learning_object_examples_sense on public.learning_object_examples (sense_id) where sense_id is not null;
create index if not exists learning_object_collocations_sense on public.learning_object_collocations (sense_id) where sense_id is not null;

-- Same access as the rest of the catalogue: everyone reads, admins and the service role write.
alter table public.learning_object_senses enable row level security;
alter table public.learning_object_sense_translations enable row level security;
grant select on public.learning_object_senses, public.learning_object_sense_translations to anon, authenticated;
grant select, insert, update, delete on public.learning_object_senses, public.learning_object_sense_translations to service_role;
drop policy if exists learning_object_senses_read on public.learning_object_senses;
create policy learning_object_senses_read on public.learning_object_senses for select to anon, authenticated using (true);
drop policy if exists learning_object_senses_admin_write on public.learning_object_senses;
create policy learning_object_senses_admin_write on public.learning_object_senses for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists learning_object_sense_translations_read on public.learning_object_sense_translations;
create policy learning_object_sense_translations_read on public.learning_object_sense_translations for select to anon, authenticated using (true);
drop policy if exists learning_object_sense_translations_admin_write on public.learning_object_sense_translations;
create policy learning_object_sense_translations_admin_write on public.learning_object_sense_translations for all to authenticated using (public.is_admin()) with check (public.is_admin());
