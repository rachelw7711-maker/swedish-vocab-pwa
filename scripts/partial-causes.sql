-- Round G (2026-11-12), READ-ONLY: why public cards are "partial" (Delvis verifierad), per the
-- conditions of refresh_resource_summary, with overlaps. One row per combination of causes.
with pub as (
  select o.id, o.object_type, o.part_of_speech, o.access_tier, o.content_origin,
         exists (select 1 from public.user_words u where u.word_id = o.id) as has_learner
    from public.learning_objects o
   where o.status in ('published', 'human_reviewed', 'ai_generated') and o.verification_status = 'partial'
), s as (
  select r.learning_object_id id,
         bool_or(r.field = 'pos' and r.status = 'verified') pos_ok,
         bool_or(r.field = 'pos') pos_row,
         bool_or(r.field = 'sense' and r.status = 'verified' and r.grade = 'verified') sense_ok,
         bool_or(r.field = 'sense' and r.status = 'verified' and r.grade = 'ai_consistent') sense_ai,
         count(*) filter (where r.field like 'form:%' and r.status = 'present') forms_unchecked,
         count(*) filter (where r.field like 'form:%' and r.status = 'verified') forms_verified,
         count(*) filter (where r.status = 'missing' and r.source = 'saldo-morphology-2017') saldo_missing
    from public.resource_field_status r join pub on pub.id = r.learning_object_id
   group by r.learning_object_id
)
select pub.object_type,
       case when not coalesce(s.pos_ok, false) then (case when coalesce(s.pos_row, false) then 'pos_unverified' else 'pos_no_row' end) else 'pos_ok' end as pos,
       case when coalesce(s.sense_ok, false) then 'sense_ok' when coalesce(s.sense_ai, false) then 'sense_ai_only' else 'sense_open' end as sense,
       case when s.forms_unchecked > 0 then 'forms_unchecked'
            when s.saldo_missing > 0 then 'saldo_missing'
            when pub.object_type = 'word' and s.forms_verified = 0 and pub.part_of_speech not in ('adverb','preposition','conjunction','interjection','numeral','pronoun','abbreviation','other','phrase') then 'no_form_verified'
            else 'forms_ok' end as forms,
       count(*) cards, count(*) filter (where pub.has_learner) with_learners
  from pub left join s on s.id = pub.id
 group by 1, 2, 3, 4
 order by cards desc;
