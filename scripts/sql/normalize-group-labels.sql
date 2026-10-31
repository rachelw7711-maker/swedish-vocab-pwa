-- One spelling per kind of declension group (2026-11-01), so the card can show it:
-- "grupp 2" / "group 2" / "declension 4" → the number; Chinese, Swedish and English
-- descriptions → irregular | uncountable | indeclinable | plurale_tantum. Plural-only
-- nouns get genus "plural". Free text that is not one of these (info, cd, gisslan, the
-- dashes on längtan / oktober / juni / tandhälsa) is left for review. Archived; :'batch'
-- is the archive batch id and the rollback restores old_value.
begin;
create temp table relabel on commit drop as
select f.id, f.learning_object_id, f.form_type, f.form_value old, case
    when f.form_value ~* '^(grupp|group|declension)\s*([1-5]|2[ab])$' then regexp_replace(f.form_value, '^\D*', '')
    when f.form_value in ('不规则复数', 'oregelbunden', '7', 'man-gruppen', 'man-typen') then 'irregular'
    when f.form_value in ('无复数', 'oräknebart', 'oräkneligt', 'ingen vanlig plural') then 'uncountable'
    when f.form_value in ('pluralia tantum', 'plural-only') then 'plurale_tantum'
  end new
from public.word_forms f join public.learning_objects lo on lo.id = f.learning_object_id and lo.status <> 'retired'
where f.form_type = 'declension_group'
union all
select f.id, f.learning_object_id, f.form_type, f.form_value, 'plural'
from public.word_forms f join public.learning_objects lo on lo.id = f.learning_object_id and lo.status <> 'retired' and lo.part_of_speech = 'noun'
where f.form_type = 'genus' and f.form_value in ('plurale tantum', 'n') and exists (
  select 1 from public.word_forms p where p.learning_object_id = f.learning_object_id and p.form_type = 'plural_indefinite' and p.form_value = lo.swedish)
  and not exists (select 1 from public.word_forms d where d.learning_object_id = f.learning_object_id and d.form_type = 'singular_definite' and d.form_value ~ '(en|et|n|t)$' and d.form_value not like '%na');
delete from relabel where new is null or new = old;
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', learning_object_id, 'word_forms', form_type, old, new, 'label_spelling' from relabel;
update public.word_forms f set form_value = r.new, updated_at = now() from relabel r where f.id = r.id and f.form_value = r.old;
commit;
