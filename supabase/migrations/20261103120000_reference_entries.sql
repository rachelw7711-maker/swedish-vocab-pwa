-- Dictionaries next to SALDO (2026-11-03): Lexin svenska (4th version, 2020) and Lexin
-- swe–eng, Isof, both CC BY 4.0, as reference data for parts of speech, senses, English
-- equivalents, forms, plurals, constructions and idioms (server-references.mjs). One table
-- for every such source, so another dictionary or explanation language needs rows, not a
-- new table. Loaded by scripts/load-references.mjs; idioms are extra rows ("<source>:idiom")
-- keyed by their expression match key. Additive only: nothing else reads or changes it.
--
-- Rollback: drop table if exists public.reference_entries; and delete the resource_sources rows below.

begin;

create table if not exists public.reference_entries (
  id bigint generated always as identity primary key,
  source text not null,                  -- resource_sources.id, or "<id>:idiom"
  headword text not null,                -- lower-cased headword (verbs: the infinitive), or an idiom's match key
  pos text not null default '',          -- SpråkLab part of speech
  data jsonb not null default '{}'
);
create index if not exists reference_entries_headword_idx on public.reference_entries (headword, source);

alter table public.reference_entries enable row level security;
revoke all on public.reference_entries from anon, authenticated;
grant select, insert, update, delete on public.reference_entries to service_role;

insert into public.resource_sources (id, name, publisher, version, licence, url, attribution, attribution_required, commercial_use, notes) values
  ('lexin-sv-2020', 'Lexin: Svenska ord, svenskt lexikon', 'Institutet för språk och folkminnen (Isof)', '4 (2020-03-09)', 'CC BY 4.0',
   'https://sprakresurser.isof.se/lexin/svenska/', 'Lexin: Svenska ord, Institutet för språk och folkminnen (CC BY 4.0).', true, 'allowed_with_attribution',
   'Senses, forms, plurals, constructions, idioms: checks and generation references (public.reference_entries).'),
  ('lexin-sv-en', 'Lexin: Svensk-engelskt lexikon', 'Institutet för språk och folkminnen (Isof)', '2010-04-04 (published 2020-03-09)', 'CC BY 4.0',
   'https://sprakresurser.isof.se/lexin/engelska/', 'Lexin: Svensk-engelskt lexikon, Institutet för språk och folkminnen (CC BY 4.0).', true, 'allowed_with_attribution',
   'English equivalents per sense: independent check of English meanings (public.reference_entries).'),
  ('folkets-lexikon', 'Folkets lexikon (sv–en)', 'KTH', '1.0.4488 (2024-12-14)', 'CC BY-SA 2.5',
   'https://folkets-lexikon.csc.kth.se/folkets/', 'Folkets lexikon, KTH (CC BY-SA 2.5).', true, 'evidence_only',
   'Built on Lexin (same evidence family). Local files in scripts only; text never copied.'),
  ('en-wiktionary', 'English Wiktionary, Swedish entries (wiktextract / kaikki.org)', 'Wiktionary contributors', 'dump 2026-10-01', 'CC BY-SA 4.0',
   'https://kaikki.org/dictionary/Swedish/', 'Wiktionary (CC BY-SA 4.0).', true, 'evidence_only',
   'Parts of speech and English glosses as evidence in scripts; text never copied.'),
  ('sv-wiktionary', 'Svenska Wiktionary', 'Wiktionary contributors', 'live', 'CC BY-SA 4.0',
   'https://sv.wiktionary.org/', 'Wiktionary (CC BY-SA 4.0).', true, 'evidence_only',
   'Parts of speech, senses and forms via the MediaWiki API (server-wiktionary.mjs); text never copied.'),
  ('korp', 'Korp corpora', 'Språkbanken Text, University of Gothenburg', 'live', 'query results; corpus licences vary',
   'https://spraakbanken.gu.se/korp/', 'Korp, Språkbanken Text.', false, 'evidence_only',
   'Frequencies (plural share, attestation) and word-picture relations as evidence; no corpus text stored.')
on conflict (id) do nothing;

commit;
