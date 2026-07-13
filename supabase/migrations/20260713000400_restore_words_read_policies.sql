alter table public.words enable row level security;

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
