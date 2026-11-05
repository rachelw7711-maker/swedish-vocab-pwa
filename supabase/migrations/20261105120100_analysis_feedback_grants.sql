-- Table grants for analysis_feedback, as content_reports has them. Row-level security still
-- decides: readers insert and read their own rows; only an admin updates; nobody deletes.
grant select, insert, update on public.analysis_feedback to authenticated;
grant all on public.analysis_feedback to service_role;
