-- "Rapportera fel" on a reading analysis list (Nyckelord / Fasta fraser / Idiomatiska uttryck):
-- the term the reader thinks is wrong and an optional note, linked to the analysis, its text and
-- the list. Stored as pending for a later check; nothing runs on insert (no AI, no entry change).
-- New table only; no existing table changes.
create table public.analysis_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text_analysis_id uuid not null references public.text_analysis(id) on delete cascade,
  text_resource_id uuid not null references public.text_resources(id) on delete cascade,
  section text not null check (section in ('keywords', 'phrases', 'idioms')),
  term text not null check (length(btrim(term)) between 1 and 200),
  note text not null default '' check (length(note) <= 1000),
  native_language text not null default 'zh' check (native_language in ('zh', 'en')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index analysis_feedback_status_idx on public.analysis_feedback (status, created_at desc);
create index analysis_feedback_analysis_idx on public.analysis_feedback (text_analysis_id);

alter table public.analysis_feedback enable row level security;

-- Readers add their own feedback, always pending, and only on an analysis they can see whose
-- text it really is.
create policy analysis_feedback_insert_own on public.analysis_feedback
  for insert to authenticated
  with check (
    auth.uid() = user_id and status = 'pending' and reviewed_at is null
    and exists (select 1 from public.text_analysis a
                where a.id = text_analysis_id and a.text_resource_id = analysis_feedback.text_resource_id)
  );
create policy analysis_feedback_select_own_or_admin on public.analysis_feedback
  for select to authenticated using (auth.uid() = user_id or is_admin());
-- Only an admin settles feedback; readers can't change or delete it.
create policy analysis_feedback_update_admin on public.analysis_feedback
  for update to authenticated using (is_admin()) with check (is_admin());

revoke all on public.analysis_feedback from anon;
