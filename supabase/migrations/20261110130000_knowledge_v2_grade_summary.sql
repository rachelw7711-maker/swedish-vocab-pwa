-- Knowledge v2, part B (S3, R1; 2026-11-10 — NOT APPLIED until approved): an entry is "verified"
-- only when its sense was confirmed by something other than an AI answer. Requires part A
-- (20261110120000: resource_field_status.grade).
--   A sense row counts as verified when its grade is "verified"; a row without a grade counts as
--   before, except the content audit of 2026-11-02 (source audit-2026-11-02), whose "verified" was an
--   AI check alone: ai_consistent (data/reports/round-f/regrade-legacy-dry-2026-11-09.json: of 7,811
--   such senses 33 have a Korp sense check and stay verified once graded; 7,463 entries go from
--   verified to partial, shown in the app as "Ej verifierad ännu").
-- Only verification_status / completeness / missing_fields change (as in 20261103130000); access_tier,
-- status, the content and every user table are untouched. Nothing is removed.
-- Backup: verification_status_backup_20261110 keeps every entry's previous values.
-- Rollback: supabase/rollback/20261110130000_knowledge_v2_grade_summary_rollback.sql

begin;

create table if not exists public.verification_status_backup_20261110 as
  select id, verification_status, completeness, missing_fields, now() as saved_at from public.learning_objects;
alter table public.verification_status_backup_20261110 enable row level security;

create or replace function public.refresh_resource_summary(p_ids uuid[])
returns integer
language sql
security definer
set search_path = public
as $$
  with s as (
    select learning_object_id,
           array_agg(field order by field) filter (where status = 'missing') as missing,
           count(*) filter (where status = 'mismatch') as mismatches,
           count(*) filter (where status = 'verified') as verified,
           count(*) filter (where status = 'missing' and source = 'saldo-morphology-2017') as saldo_missing,
           count(*) filter (where field like 'form:%' and status = 'present') as forms_unchecked,
           count(*) filter (where field like 'form:%' and status = 'verified') as forms_verified,
           bool_or(field = 'pos' and status = 'verified') as pos_checked,
           bool_or(field = 'sense' and status = 'verified'
                   and coalesce(grade, case when source = 'audit-2026-11-02' then 'ai_consistent' else 'verified' end) = 'verified') as sense_checked
      from public.resource_field_status
     where learning_object_id = any (p_ids)
     group by learning_object_id
  ), u as (
    update public.learning_objects o
       set missing_fields = coalesce(s.missing, '{}'),
           completeness = case when s.missing is null then 'complete' else 'incomplete' end,
           verification_status = case
             when s.mismatches > 0 then 'needs_review'
             when s.verified = 0 then 'unverified'
             when s.saldo_missing > 0 or s.forms_unchecked > 0
               or (o.object_type = 'word' and s.forms_verified = 0
                   and o.part_of_speech not in ('adverb', 'preposition', 'conjunction', 'interjection', 'numeral', 'pronoun', 'abbreviation', 'other', 'phrase'))
               or not coalesce(s.pos_checked, false) or not coalesce(s.sense_checked, false) then 'partial'
             else 'verified' end
      from s
     where o.id = s.learning_object_id
    returning 1
  )
  select count(*)::integer from u;
$$;
revoke all on function public.refresh_resource_summary(uuid[]) from public;
grant execute on function public.refresh_resource_summary(uuid[]) to service_role;

select public.refresh_resource_summary(array_agg(id)) from public.learning_objects;

commit;
