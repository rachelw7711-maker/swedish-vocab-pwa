-- Round G (2026-11-12, owner's item E): a present participle (nuvarande, påföljande, uppdykande) does
-- not inflect — every form is the base form — so it has no form to verify, and the rule "an
-- inflecting word needs at least one verified form" kept it partial for good. It joins the classes
-- without inflection; nothing else in the rule changes (a perfect participle still needs its
-- verified forms). Only verification_status of present participles can change.
-- Rollback: supabase/rollback/20261112120000_status_presens_particip_rollback.sql

begin;

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
                   and o.part_of_speech not in ('adverb', 'preposition', 'conjunction', 'interjection', 'numeral', 'pronoun', 'abbreviation', 'other', 'phrase', 'presens_particip'))
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

select public.refresh_resource_summary(array_agg(id)) from public.learning_objects where part_of_speech = 'presens_particip';

commit;
