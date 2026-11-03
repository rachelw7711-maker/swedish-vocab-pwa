-- "verified" = forms, part of speech and senses all reliably checked (2026-11-03; approved
-- definition). Completes 20261102120000:
--   needs_review  any field disagrees with a reference (a "mismatch")
--   unverified    nothing verified
--   partial       something verified, but not all three: a form only the AI gave ("present") or
--                 SALDO lacks, a word with no verified form (words that don't inflect need
--                 none), or no verified "pos" / "sense" row
--   verified      otherwise
-- The pos and sense rows come from the references (SALDO, Lexin, Wiktionary, Korp attestation
-- of expressions) and the content audit (scripts/reference-check.mjs and the audit batches,
-- archived in content_audit_archive). Only verification_status / completeness / missing_fields
-- change: access_tier is never touched (tiers change only through promote_to_basic).
--
-- Backup: verification_status_backup_20261103 keeps every entry's previous values.
-- Rollback:
--   update public.learning_objects o set verification_status = b.verification_status,
--          completeness = b.completeness, missing_fields = b.missing_fields
--     from public.verification_status_backup_20261103 b where b.id = o.id;
--   then restore refresh_resource_summary from 20261031120000_shared_resources.sql.

begin;

create table if not exists public.verification_status_backup_20261103 as
  select id, verification_status, completeness, missing_fields, now() as saved_at from public.learning_objects;
alter table public.verification_status_backup_20261103 enable row level security;
-- Server only (service role): no policies for app users.

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
           bool_or(field = 'sense' and status = 'verified') as sense_checked
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
