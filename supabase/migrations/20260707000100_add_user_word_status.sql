alter table public.user_words
  add column if not exists status text not null default 'new';
