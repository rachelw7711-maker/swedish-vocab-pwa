-- Local copy of SALDO's morphology (Språkbanken Text, CC BY 4.0, version
-- 2017-09-19) as reference data for lemma / part-of-speech lookup and form
-- checks (2026-10-31). Loaded by scripts/load-saldo.mjs from the files
-- scripts/build-saldo-index.mjs builds; proper names (pm*) are left out.
-- Source and attribution: public.resource_sources 'saldo-morphology-2017'.
--
-- Rollback: drop table if exists public.saldo_wordforms; drop table if exists public.saldo_lemmas;

begin;

create table if not exists public.saldo_lemmas (
  id integer primary key,                   -- line number in the index build, keeps saldo_wordforms small
  lemgram text not null unique,             -- e.g. "utveckla..vb.1"
  baseform text not null,
  baseform_key text generated always as (lower(baseform)) stored,
  pos text not null,                        -- SALDO part of speech (nn, vb, av, ab, vbm …)
  paradigm text not null,
  forms jsonb not null default '{}'         -- { msd: [written forms] } for the forms a word card uses
);
create index if not exists saldo_lemmas_baseform_key_idx on public.saldo_lemmas (baseform_key);

create table if not exists public.saldo_wordforms (
  form text not null,                       -- lower-cased written form
  lemma_id integer not null references public.saldo_lemmas (id) on delete cascade,
  primary key (form, lemma_id)
);

alter table public.saldo_lemmas enable row level security;
alter table public.saldo_wordforms enable row level security;
revoke all on public.saldo_lemmas, public.saldo_wordforms from anon, authenticated;
grant select, insert, update, delete on public.saldo_lemmas, public.saldo_wordforms to service_role;

commit;
