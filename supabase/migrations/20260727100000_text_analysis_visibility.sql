-- SPK-ADR-001 / SPK-SPEC-003 upgrade (Reading is Knowledge Discovery;
-- Generate Once, Reuse Forever). Rachel's 2026-07-27 decision: the
-- reusable asset is the structured knowledge (text_analysis — key
-- vocabulary/expressions/summary), never the raw article
-- (text_resources.original_text/cleaned_text stays private to its owner
-- forever, regardless of whether the analysis derived from it becomes
-- public). V1 scope: only an admin action can mark an analysis public —
-- no user-facing "share" button, no community browsing/moderation queue
-- (those are an explicitly future version per her instruction).
alter table public.text_analysis
  add column if not exists visibility text not null default 'private';

alter table public.text_analysis
  drop constraint if exists text_analysis_visibility_check;
alter table public.text_analysis
  add constraint text_analysis_visibility_check
    check (visibility in ('private', 'public'));

create index if not exists text_analysis_visibility_idx on public.text_analysis (visibility);
