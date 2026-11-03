-- Language checks (2026-11-02).
--
-- 1. wiktionary_cache: what sv.wiktionary.org said about a spelling (parts of speech,
--    senses, forms), so a page is fetched once a month at most (a missing page once a
--    week). Evidence for checks only; Wiktionary text is CC BY-SA 4.0 and is never
--    copied into learning_objects.
-- 2. "verified" means the whole entry was checked, not only its forms: resource_field_status
--    gets two more fields, "pos" (part of speech confirmed by SALDO / Wiktionary) and
--    "sense" (meanings, examples and their translations checked against the part of speech
--    and the references). An entry whose forms match SALDO but whose senses were never
--    checked is "partial"; a "mismatch" in either makes it "needs_review" as before.

create table if not exists public.wiktionary_cache (
  word text primary key,
  status text not null check (status in ('found', 'missing')),
  data jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);
alter table public.wiktionary_cache enable row level security;
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
             when s.saldo_missing > 0 or not coalesce(s.sense_checked, false) then 'partial'
             else 'verified' end
      from s
     where o.id = s.learning_object_id
    returning 1
  )
  select count(*)::integer from u;
$$;
revoke all on function public.refresh_resource_summary(uuid[]) from public;
grant execute on function public.refresh_resource_summary(uuid[]) to service_role;

-- Every entry's summary is recomputed by 20261103130000_verified_definition.sql, which
-- completes this definition (part of speech too) and keeps a backup of the old values.
