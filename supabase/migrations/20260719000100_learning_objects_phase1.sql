-- ============================================================================
-- Learning Object Model — Phase 1 (corrected against the real live schema)
--
-- The first draft of this migration was written against
-- supabase/schema.sql, which turned out to be stale and does not reflect
-- the actual production table. Confirmed live schema (queried directly via
-- `supabase db query --linked` on 2026-07-19) for public.words:
--   id uuid pk default gen_random_uuid(), swedish text not null, lemma text,
--   chinese text, part_of_speech text, level text, example_sv text,
--   example_zh text, note text, source text, created_by uuid,
--   created_at timestamptz, updated_at timestamptz
-- Several fields the app already relies on (pos_detail, forms, collocations,
-- related_words, tags) are NOT separate columns today — they are packed as
-- labeled sections inside the single `note` text column and parsed out at
-- read time (see src/lib/db.js normalizeWord's readNoteSection calls).
-- words.id is ALREADY uuid in production (unlike schema.sql's `text`), so
-- no id type conversion is needed, and renaming the table does not disturb
-- any existing foreign keys — Postgres foreign keys track the referenced
-- table by OID, not by name.
--
-- Real RLS policies confirmed on public.words: words_all_authenticated
-- (ALL, authenticated, true/true), words_read_anon (SELECT, anon, true),
-- words_read_authenticated (SELECT, authenticated, true),
-- words_select_authenticated (SELECT, authenticated, true — a redundant
-- duplicate of words_read_authenticated, left alone here, not this
-- migration's concern to clean up).
--
-- Production data present at the time of writing: 5,819 rows in words,
-- 26 rows in user_words. This migration is additive only — no existing
-- column is renamed or dropped, no existing row is deleted.
--
-- Design reference: Reviews/词条数据结构设计草案（母语支持+词形结构化+Fraser-Uttryck）.md
--                    Reviews/Ordbok-词条字段规范（按词性）.md
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Rename words -> learning_objects. Existing foreign keys from
--    user_words, study_session_items, study_history automatically continue
--    to work (Postgres tracks FKs by table OID, not name).
-- ---------------------------------------------------------------------------
alter table public.words rename to learning_objects;

-- ---------------------------------------------------------------------------
-- 2. New columns. All additive — existing columns (swedish, lemma, chinese,
--    part_of_speech, level, example_sv, example_zh, note, source,
--    created_by) are untouched.
-- ---------------------------------------------------------------------------
alter table public.learning_objects
  add column if not exists object_type text not null default 'word',
  add column if not exists category text,
  add column if not exists cefr_level text,
  add column if not exists ipa text not null default '',
  add column if not exists pos_detail text not null default '',
  add column if not exists swedish_explanation text not null default '',
  add column if not exists forms text not null default '',
  add column if not exists collocations text not null default '',
  add column if not exists related_words text not null default '',
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists notebook text not null default '',
  add column if not exists status text not null default 'published';

alter table public.learning_objects
  drop constraint if exists learning_objects_object_type_check;
alter table public.learning_objects
  add constraint learning_objects_object_type_check
    check (object_type in ('word', 'phrase', 'expression', 'sentence'));

alter table public.learning_objects
  drop constraint if exists learning_objects_status_check;
alter table public.learning_objects
  add constraint learning_objects_status_check
    check (status in ('draft', 'ai_generated', 'human_reviewed', 'published'));

alter table public.learning_objects
  drop constraint if exists learning_objects_category_check;
alter table public.learning_objects
  add constraint learning_objects_category_check
    check (
      category is null or category in (
        'fixed_phrase', 'verb_phrase', 'prepositional_phrase', 'common_collocation', 'common_phrase',
        'idiom', 'everyday_expression', 'colloquial_expression', 'sentence_pattern', 'native_expression'
      )
    );

create index if not exists learning_objects_object_type_idx on public.learning_objects (object_type);
create index if not exists learning_objects_category_idx on public.learning_objects (category);

-- Note: pos_detail/forms/collocations/related_words/tags are intentionally
-- NOT backfilled from the `note` column here. `note` packs them as labeled
-- text sections in a format that's safer to parse with the existing
-- JavaScript readNoteSection() regex (already in src/lib/db.js) than to
-- reimplement in raw SQL against 5,819 live rows. The application read
-- path keeps falling back to parsing `note` for any row where the new
-- columns are still empty, so existing data keeps working unchanged;
-- newly saved/edited words start populating the real columns instead.
-- A dedicated backfill script can migrate the rest later once reviewed.

-- ---------------------------------------------------------------------------
-- 3. word_forms — structured grammatical forms (comparative, participle, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.word_forms (
  id uuid primary key default gen_random_uuid(),
  learning_object_id uuid not null references public.learning_objects (id) on delete cascade,
  form_type text not null,
  form_value text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (learning_object_id, form_type)
);

create index if not exists word_forms_learning_object_idx on public.word_forms (learning_object_id);

-- ---------------------------------------------------------------------------
-- 4. learning_object_translations — native-language content (母语支持层)
-- ---------------------------------------------------------------------------
create table if not exists public.learning_object_translations (
  id uuid primary key default gen_random_uuid(),
  learning_object_id uuid not null references public.learning_objects (id) on delete cascade,
  native_language text not null,
  meaning text not null default '',
  explanation text not null default '',
  grammar_note text not null default '',
  learning_tip text not null default '',
  example_translation text not null default '',
  cultural_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (learning_object_id, native_language)
);

create index if not exists learning_object_translations_object_idx on public.learning_object_translations (learning_object_id);
create index if not exists learning_object_translations_lang_idx on public.learning_object_translations (native_language);

-- Backfill: one 'zh' translation row per existing word, carrying over the
-- existing `chinese` column (confirmed present on the live table). Lossless
-- 1:1 copy; `chinese` column is kept, not dropped.
insert into public.learning_object_translations (learning_object_id, native_language, meaning)
select id, 'zh', coalesce(chinese, '')
from public.learning_objects
on conflict (learning_object_id, native_language) do nothing;

-- ---------------------------------------------------------------------------
-- 5. learning_object_examples — Swedish example sentences. Created empty;
--    example_sv/example_zh stay in place on learning_objects for now (see
--    scope note above re: not auto-parsing free text in this migration).
-- ---------------------------------------------------------------------------
create table if not exists public.learning_object_examples (
  id uuid primary key default gen_random_uuid(),
  learning_object_id uuid not null references public.learning_objects (id) on delete cascade,
  example_swedish text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists learning_object_examples_object_idx on public.learning_object_examples (learning_object_id);

-- ---------------------------------------------------------------------------
-- 6. learning_object_collocations — fixed phrases attached to a word, with
--    a pointer to the Fraser/Uttryck entry they were promoted to.
-- ---------------------------------------------------------------------------
create table if not exists public.learning_object_collocations (
  id uuid primary key default gen_random_uuid(),
  learning_object_id uuid not null references public.learning_objects (id) on delete cascade,
  phrase_text text not null,
  category text,
  promoted_object_id uuid references public.learning_objects (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_object_collocations_object_idx on public.learning_object_collocations (learning_object_id);
create index if not exists learning_object_collocations_promoted_idx on public.learning_object_collocations (promoted_object_id);

-- ---------------------------------------------------------------------------
-- 7. learning_object_relationships — generic relationship graph
--    (synonym / antonym / related / derived_from)
-- ---------------------------------------------------------------------------
create table if not exists public.learning_object_relationships (
  id uuid primary key default gen_random_uuid(),
  from_object_id uuid not null references public.learning_objects (id) on delete cascade,
  to_object_id uuid not null references public.learning_objects (id) on delete cascade,
  relationship_type text not null,
  created_at timestamptz not null default now(),
  unique (from_object_id, to_object_id, relationship_type)
);

alter table public.learning_object_relationships
  drop constraint if exists learning_object_relationships_type_check;
alter table public.learning_object_relationships
  add constraint learning_object_relationships_type_check
    check (relationship_type in ('related', 'synonym', 'antonym', 'derived_from'));

create index if not exists learning_object_relationships_from_idx on public.learning_object_relationships (from_object_id);
create index if not exists learning_object_relationships_to_idx on public.learning_object_relationships (to_object_id);

-- ---------------------------------------------------------------------------
-- 8. RLS — replace the confirmed real policies on learning_objects
--    (words_all_authenticated / words_read_anon / words_read_authenticated /
--    words_select_authenticated) with an equivalent, non-duplicated set on
--    the renamed table, and enable the same "shared dictionary" model
--    (read: anon + authenticated, write: any authenticated user) on every
--    new supporting table.
-- ---------------------------------------------------------------------------
drop policy if exists "words_all_authenticated" on public.learning_objects;
drop policy if exists "words_read_anon" on public.learning_objects;
drop policy if exists "words_read_authenticated" on public.learning_objects;
drop policy if exists "words_select_authenticated" on public.learning_objects;
drop policy if exists "words_insert_authenticated" on public.learning_objects;
drop policy if exists "words_update_authenticated" on public.learning_objects;

drop policy if exists "learning_objects_read_anon" on public.learning_objects;
create policy "learning_objects_read_anon"
  on public.learning_objects for select
  to anon
  using (true);

drop policy if exists "learning_objects_all_authenticated" on public.learning_objects;
create policy "learning_objects_all_authenticated"
  on public.learning_objects for all
  to authenticated
  using (true)
  with check (true);

grant select on public.learning_objects to anon, authenticated;
grant insert, update, delete on public.learning_objects to authenticated;

do $$
declare
  supporting_table text;
begin
  foreach supporting_table in array array[
    'word_forms', 'learning_object_translations', 'learning_object_examples',
    'learning_object_collocations', 'learning_object_relationships'
  ]
  loop
    execute format('alter table public.%I enable row level security;', supporting_table);

    execute format('drop policy if exists "%s_read_anon" on public.%I;', supporting_table, supporting_table);
    execute format(
      'create policy "%s_read_anon" on public.%I for select to anon using (true);',
      supporting_table, supporting_table
    );

    execute format('drop policy if exists "%s_all_authenticated" on public.%I;', supporting_table, supporting_table);
    execute format(
      'create policy "%s_all_authenticated" on public.%I for all to authenticated using (true) with check (true);',
      supporting_table, supporting_table
    );

    execute format('grant select on public.%I to anon, authenticated;', supporting_table);
    execute format('grant insert, update, delete on public.%I to authenticated;', supporting_table);
  end loop;
end $$;

commit;
