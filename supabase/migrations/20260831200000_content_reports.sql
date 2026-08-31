-- In-product "report a problem" entry point (2026-08-31) — per Rachel's
-- decision after the AI content-review pass: the AI review is a one-time
-- cost that improves quality but isn't a guarantee; a permanent,
-- near-zero-cost user-reporting loop is how real dictionaries/language
-- apps actually converge on accuracy over time (real corpora + expert
-- review + continuous user feedback — see the discussion in this
-- session). This table is that feedback loop's storage.
--
-- No real admin/role system exists anywhere in this app yet (confirmed
-- across this session — promote-collocation etc. all use "logged in" as
-- the bar, not a role check), so this follows the same established
-- single-admin-stage convention: any authenticated user can insert their
-- own report and can read/resolve any report, rather than inventing a
-- role system this app doesn't otherwise have.
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  word_id uuid not null references public.learning_objects (id) on delete cascade,
  swedish text not null default '',
  category text not null default 'other',
  note text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists content_reports_status_idx on public.content_reports (status, created_at desc);
create index if not exists content_reports_word_id_idx on public.content_reports (word_id);

alter table public.content_reports enable row level security;

drop policy if exists "content_reports_select_authenticated" on public.content_reports;
create policy "content_reports_select_authenticated" on public.content_reports
  for select using (auth.role() = 'authenticated');
drop policy if exists "content_reports_insert_own" on public.content_reports;
create policy "content_reports_insert_own" on public.content_reports
  for insert with check (auth.uid() = user_id);
drop policy if exists "content_reports_update_authenticated" on public.content_reports;
create policy "content_reports_update_authenticated" on public.content_reports
  for update using (auth.role() = 'authenticated');

grant select, insert, update on public.content_reports to authenticated;
grant select, insert, update, delete on public.content_reports to service_role;
