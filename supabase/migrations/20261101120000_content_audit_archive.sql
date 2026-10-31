-- Copyright clean-up support (2026-11-01).
--
-- content_audit_archive keeps the original value of every field a clean-up or
-- correction changes (course-list chapter tags, glossary text, corrected forms), so
-- the change can be audited and rolled back. Internal only: service role and admins.
--
-- Per-entry provenance (learning_object_sources) and the source catalogue become
-- internal as well: the app shows attribution as static text and reads neither table,
-- and the rows name the textbook lists entries were first taken from.

create table if not exists public.content_audit_archive (
  id bigserial primary key,
  batch_id uuid not null,
  learning_object_id uuid not null,
  table_name text not null default 'learning_objects',
  field text not null,
  old_value text,
  new_value text,
  reason text not null,
  archived_at timestamptz not null default now()
);
create index if not exists content_audit_archive_batch on public.content_audit_archive (batch_id);
create index if not exists content_audit_archive_object on public.content_audit_archive (learning_object_id);

alter table public.content_audit_archive enable row level security;
revoke all on public.content_audit_archive from anon, authenticated;
grant select, insert, update, delete on public.content_audit_archive to service_role;
grant usage, select on sequence public.content_audit_archive_id_seq to service_role;
drop policy if exists "content_audit_archive_admin_read" on public.content_audit_archive;
create policy "content_audit_archive_admin_read" on public.content_audit_archive for select to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));
grant select on public.content_audit_archive to authenticated;

drop policy if exists "learning_object_sources_read" on public.learning_object_sources;
create policy "learning_object_sources_read" on public.learning_object_sources for select to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));
revoke select on public.learning_object_sources from anon;

drop policy if exists "resource_sources_read" on public.resource_sources;
create policy "resource_sources_read" on public.resource_sources for select to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = auth.uid()));
revoke select on public.resource_sources from anon;
