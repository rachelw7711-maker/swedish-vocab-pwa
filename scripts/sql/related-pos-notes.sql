-- POS notes for related words of the AI-generated entries made before the generator stored
-- them (2026-11-01, checked against SALDO). Archived; rollback restores old_value.
begin;
create temp table m (word text, note text) on commit drop;
insert into m values ('kräfta','名词'),('skiva','名词'),('fest','名词'),('augusti','名词'),('kräm','名词'),('gräddig','形容词'),('mjuk','形容词'),('len','形容词'),
  ('åta sig','动词'),('ansvara för','动词'),('uppgift','名词'),('ansvar','名词'),('skotta','动词'),('snö','名词'),('skottkärra','名词'),('snöskyffel','名词'),('snöplog','名词');
create temp table upd on commit drop as
select t.id, t.learning_object_id, t.related_words old, string_agg(case when m.note is null or line ~ '（(名词|动词|形容词|副词)）\s*$' then line else line || '（' || m.note || '）' end, E'\n' order by n) new
from public.learning_object_translations t join public.learning_objects lo on lo.id = t.learning_object_id
cross join lateral regexp_split_to_table(t.related_words, E'\n') with ordinality s(line, n)
left join m on m.word = trim(split_part(line, '|', 1))
where lo.id in ('407e42e6-e70a-49d1-9c19-0e115a47ef99','5491eb4f-b579-499c-8b7f-7da27d01e445','6f276ea3-91ff-4e1e-96cc-1a2ffb980de6','9be10cc2-10c8-4f1a-a39e-e34499725c8f') and t.native_language = 'zh'
group by t.id, t.learning_object_id, t.related_words;
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', learning_object_id, 'learning_object_translations', 'related_words', old, new, 'related_pos_note:saldo' from upd where new <> old;
update public.learning_object_translations t set related_words = u.new, updated_at = now() from upd u where t.id = u.id and t.related_words = u.old and u.new <> u.old;
commit;
