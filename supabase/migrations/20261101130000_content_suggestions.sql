-- Correction suggestions for stored values that look wrong (2026-11-01). An AI check
-- or a script writes here instead of overwriting the value; a person accepts or
-- rejects each one. Internal only: service role and admins.

create table if not exists public.content_suggestions (
  id bigserial primary key,
  learning_object_id uuid not null references public.learning_objects(id) on delete cascade,
  field text not null,
  current_value text,
  suggested_value text,
  verdict text not null check (verdict in ('ok', 'wrong', 'unsure')),
  note text,
  issue text,
  source text not null,
  job_id text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'applied')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists content_suggestions_object on public.content_suggestions (learning_object_id);
create index if not exists content_suggestions_open on public.content_suggestions (status, verdict);

alter table public.content_suggestions enable row level security;
revoke all on public.content_suggestions from anon, authenticated;
grant select, insert, update, delete on public.content_suggestions to service_role;
grant usage, select on sequence public.content_suggestions_id_seq to service_role;
drop policy if exists "content_suggestions_admin_read" on public.content_suggestions;
create policy "content_suggestions_admin_read" on public.content_suggestions for select to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));
grant select on public.content_suggestions to authenticated;
