create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.words (
  id text primary key,
  swedish text not null,
  pos text not null default 'other',
  pos_detail text not null default '',
  chinese text not null default '',
  english text not null default '',
  forms text not null default '',
  example text not null default '',
  collocations text not null default '',
  related_words text not null default '',
  tags jsonb not null default '[]'::jsonb,
  notebook text not null default 'Mina böcker',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists words_swedish_idx on public.words (swedish);
create index if not exists words_pos_idx on public.words (pos);

create table if not exists public.user_words (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  word_id text not null references public.words (id) on delete cascade,
  favorite boolean not null default false,
  learned boolean not null default false,
  notebook text not null default '',
  book_names jsonb not null default '[]'::jsonb,
  review_count integer not null default 0,
  wrong_count integer not null default 0,
  spelling_correct_count integer not null default 0,
  first_studied_at bigint,
  last_studied_at bigint,
  last_reviewed bigint,
  last_study_date text not null default '',
  last_review_date text not null default '',
  mastered_at bigint,
  next_review_at bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, word_id)
);

create index if not exists user_words_user_id_idx on public.user_words (user_id);
create index if not exists user_words_word_id_idx on public.user_words (word_id);
create index if not exists user_words_user_learned_idx on public.user_words (user_id, learned);
create index if not exists user_words_user_favorite_idx on public.user_words (user_id, favorite);

alter table public.profiles enable row level security;
alter table public.words enable row level security;
alter table public.user_words enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "words_read_authenticated" on public.words;
create policy "words_read_authenticated"
  on public.words for select
  to authenticated
  using (true);

drop policy if exists "words_read_anon" on public.words;
create policy "words_read_anon"
  on public.words for select
  to anon
  using (true);

drop policy if exists "words_insert_authenticated" on public.words;
create policy "words_insert_authenticated"
  on public.words for insert
  to authenticated
  with check (true);

drop policy if exists "words_update_authenticated" on public.words;
create policy "words_update_authenticated"
  on public.words for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "user_words_select_own" on public.user_words;
create policy "user_words_select_own"
  on public.user_words for select
  using (auth.uid() = user_id);

drop policy if exists "user_words_insert_own" on public.user_words;
create policy "user_words_insert_own"
  on public.user_words for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_words_update_own" on public.user_words;
create policy "user_words_update_own"
  on public.user_words for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_words_delete_own" on public.user_words;
create policy "user_words_delete_own"
  on public.user_words for delete
  using (auth.uid() = user_id);

grant select on public.words to anon, authenticated;
grant insert, update on public.words to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_words to authenticated;
