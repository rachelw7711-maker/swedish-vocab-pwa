-- SprakLab_AI成本控制与阅读模块实施规范 §11/§15 — translation feature.
-- Cache key is text_hash + scope_type + target_language (§15's
-- "sentence_id"/"paragraph_id" become just "the hash of that exact
-- substring" here, since the reading editor doesn't segment sentences/
-- paragraphs with stable IDs — a selection-based UI instead). Reusable
-- across different articles that happen to share the same sentence/
-- paragraph text, same "Generate Once, Reuse Forever" principle as
-- reading analysis. text_resource_id is kept only for provenance/traceability
-- (first place this translation was requested from), not for cache scoping.
create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  text_resource_id uuid references public.text_resources (id) on delete set null,
  scope_type text not null,
  source_text_hash text not null,
  target_language text not null default 'zh',
  translated_text text not null,
  translation_version integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.translations
  drop constraint if exists translations_scope_type_check;
alter table public.translations
  add constraint translations_scope_type_check
    check (scope_type in ('selection', 'full'));

create index if not exists translations_cache_idx
  on public.translations (source_text_hash, scope_type, target_language, translation_version);

grant select, insert, update, delete on public.translations to service_role;
-- No authenticated grants — translations are only ever read/written by the
-- server (service role), same as ai_usage_logs; the client never talks to
-- this table directly.
