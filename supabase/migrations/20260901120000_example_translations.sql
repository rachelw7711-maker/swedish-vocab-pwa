-- Multi-native-language support, continued structure cleanup (found while
-- auditing full AI-generation scope before the English batch run, per
-- Rachel's 2026-09-01 instruction to find everything up front rather than
-- run this in repeated passes). learning_object_examples (the 2nd+ example
-- sentence per word, 10,096 rows from the 2026-07-25 enrichment pass) has
-- the exact same "hardcoded to Chinese" problem learning_object_translations
-- just had: example_chinese is a single column, not per-language. Same fix,
-- same shape as that migration.

create table if not exists public.learning_object_example_translations (
  id uuid primary key default gen_random_uuid(),
  example_id uuid not null references public.learning_object_examples (id) on delete cascade,
  native_language text not null,
  translation text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (example_id, native_language)
);

create index if not exists learning_object_example_translations_example_idx
  on public.learning_object_example_translations (example_id);

-- Backfill: copy existing example_chinese into 'zh' rows. example_chinese
-- itself is left in place as the zh-only legacy fallback, same posture as
-- learning_objects.chinese.
insert into public.learning_object_example_translations (example_id, native_language, translation)
select id, 'zh', example_chinese
from public.learning_object_examples
where coalesce(example_chinese, '') <> ''
on conflict (example_id, native_language) do nothing;

alter table public.learning_object_example_translations enable row level security;

drop policy if exists "learning_object_example_translations_read_anon" on public.learning_object_example_translations;
create policy "learning_object_example_translations_read_anon"
  on public.learning_object_example_translations for select
  to anon
  using (true);

drop policy if exists "learning_object_example_translations_all_authenticated" on public.learning_object_example_translations;
create policy "learning_object_example_translations_all_authenticated"
  on public.learning_object_example_translations for all
  to authenticated
  using (true)
  with check (true);

grant select on public.learning_object_example_translations to anon, authenticated, service_role;
grant insert, update, delete on public.learning_object_example_translations to authenticated, service_role;
