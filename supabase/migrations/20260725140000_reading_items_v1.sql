-- Läsning V1: paste-text reading items only (no OCR/photo/PDF import,
-- no Project/Session/Sentence structure — that's the full architecture
-- doc's vision, out of scope for V1 per 2026-07-25 approval). Each row is
-- one user-pasted text with its AI analysis. User-owned/private, same
-- pattern as shadowing_items (this is personal content, not the shared
-- public learning_objects catalog) — mirrors its RLS/grant shape exactly.
create table if not exists public.reading_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  source_text text not null,
  cefr_level text,
  summary_sv text not null default '',
  summary_zh text not null default '',
  key_words jsonb not null default '[]'::jsonb,
  key_phrases jsonb not null default '[]'::jsonb,
  analyzed_at timestamptz,
  shadowing_item_id uuid references public.shadowing_items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists reading_items_user_id_idx on public.reading_items (user_id);
create index if not exists reading_items_user_updated_idx on public.reading_items (user_id, updated_at desc);
create index if not exists reading_items_user_deleted_idx on public.reading_items (user_id, deleted_at);

drop trigger if exists reading_items_set_updated_at on public.reading_items;
create trigger reading_items_set_updated_at
  before update on public.reading_items
  for each row execute function public.set_updated_at();

alter table public.reading_items enable row level security;

drop policy if exists "reading_items_select_own" on public.reading_items;
create policy "reading_items_select_own" on public.reading_items
  for select using (auth.uid() = user_id);
drop policy if exists "reading_items_insert_own" on public.reading_items;
create policy "reading_items_insert_own" on public.reading_items
  for insert with check (auth.uid() = user_id);
drop policy if exists "reading_items_update_own" on public.reading_items;
create policy "reading_items_update_own" on public.reading_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "reading_items_delete_own" on public.reading_items;
create policy "reading_items_delete_own" on public.reading_items
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.reading_items to authenticated;
