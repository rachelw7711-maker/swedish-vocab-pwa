-- Final review 2026-11-01, entry-level decisions (evidence inline). Archived; :'batch' is the archive batch id.
begin;
-- 1. välfärdststat → välfärdsstat (misspelt headword; its forms already read välfärdsstaten, välfärdsstater). No user data.
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, id, 'learning_objects', f, o, 'välfärdsstat', 'final_review:headword_typo'
from public.learning_objects, lateral (values ('swedish', swedish), ('match_key', match_key)) v(f, o)
where swedish = 'välfärdststat' and status <> 'retired' and not exists (select 1 from public.learning_objects where swedish = 'välfärdsstat' and status <> 'retired');
update public.learning_objects set swedish = 'välfärdsstat', match_key = 'välfärdsstat', updated_at = now()
where swedish = 'välfärdststat' and status <> 'retired' and not exists (select 1 from public.learning_objects where swedish = 'välfärdsstat' and status <> 'retired');

-- 2. sned (noun): SALDO has sned only as adjective (sned..av.1), SAOL only the phrase "på sned"; the entry
--    carried adjective forms. Retired (reversible: status back), no user data; the adjective entry stays.
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, id, 'learning_objects', 'status', status, 'retired', 'final_review:no_noun_sned'
from public.learning_objects lo where swedish = 'sned' and part_of_speech = 'noun' and status <> 'retired'
  and not exists (select 1 from public.user_words where word_id = lo.id);
update public.learning_objects lo set status = 'retired', updated_at = now()
where swedish = 'sned' and part_of_speech = 'noun' and status <> 'retired' and not exists (select 1 from public.user_words where word_id = lo.id);

-- 3. Dash placeholders in plural fields of nouns now labelled uncountable.
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, f.learning_object_id, 'deleted:word_forms', f.form_type, row_to_json(f)::text, null, 'final_review:dash_placeholder'
from public.word_forms f join public.learning_objects lo on lo.id = f.learning_object_id and lo.swedish in ('längtan', 'oktober', 'juni') and lo.status <> 'retired'
where f.form_type in ('plural_indefinite', 'plural_definite') and f.form_value in ('-', '—');
delete from public.word_forms f using public.learning_objects lo
where lo.id = f.learning_object_id and lo.swedish in ('längtan', 'oktober', 'juni') and lo.status <> 'retired'
  and f.form_type in ('plural_indefinite', 'plural_definite') and f.form_value in ('-', '—');

-- 4. Participles whose stored base verb does not exist (not in SALDO; judged not an established verb):
--    the verb SALDO has where there is one, otherwise cleared (the participle stands as an adjective).
create temp table bv (participle text, verb text, new text) on commit drop;
insert into bv values ('bortplockad','bortplocka','plocka bort'), ('hitflyttad','hitflytta','flytta hit'), ('rabies-smittad','rabies-smitta','smitta'), ('tätbefolkad','täta befolka','befolka'),
  ('drogpåverkad','drogpåverka',null), ('glesbefolkad','glesbefolka',null), ('högutbildad','högutbilda',null), ('kvinnodominerad','kvinnodominera',null), ('mansdominerad','mansdominera',null),
  ('nuvarande','nuvara',null), ('objuden','objuda',null), ('ovanstående','ovanstå',null), ('oväntad','ovänta',null), ('påföljande','påfölja',null), ('rådgivande','rådge',null),
  ('rödklädd','rödkläda',null), ('superkoncentrerad','superkoncentrera',null), ('svullna','svulla',null), ('traditionsbunden','traditionsbinda',null), ('utåtriktad','utåtrikta',null),
  ('vitklädd','vitkläda',null), ('välstrukturerad','välstrukturera',null), ('välutbildad','välutbilda',null);
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, f.learning_object_id, case when bv.new is null then 'deleted:word_forms' else 'word_forms' end, 'base_verb',
  case when bv.new is null then row_to_json(f)::text else f.form_value end, bv.new, 'final_review:base_verb_does_not_exist'
from bv join public.learning_objects lo on lo.swedish = bv.participle and lo.status <> 'retired'
join public.word_forms f on f.learning_object_id = lo.id and f.form_type = 'base_verb' and f.form_value = bv.verb;
update public.word_forms f set form_value = bv.new, updated_at = now() from bv, public.learning_objects lo
where lo.swedish = bv.participle and lo.status <> 'retired' and f.learning_object_id = lo.id and f.form_type = 'base_verb' and f.form_value = bv.verb and bv.new is not null;
delete from public.word_forms f using bv, public.learning_objects lo
where lo.swedish = bv.participle and lo.status <> 'retired' and f.learning_object_id = lo.id and f.form_type = 'base_verb' and f.form_value = bv.verb and bv.new is null;

-- 5. ta sig an något: the example did not agree ("fick vi ta sig an"); English translation added.
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, id, 'learning_objects', v.f, v.o, v.n, 'final_review:example_agreement'
from public.learning_objects, lateral (values ('example_sv', example_sv, 'Till slut fick vi ta oss an disken tillsammans.'), ('example_zh', example_zh, '最后我们只好一起收拾碗碟。')) v(f, o, n)
where id = 'aa36b7f1-def6-4503-8666-bad30dbe350d';
update public.learning_objects set example_sv = 'Till slut fick vi ta oss an disken tillsammans.', example_zh = '最后我们只好一起收拾碗碟。', updated_at = now()
where id = 'aa36b7f1-def6-4503-8666-bad30dbe350d';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', native_language || ':example_translation', example_translation, v.t, 'final_review:example_agreement'
from public.learning_object_translations t join (values ('zh', '最后我们只好一起收拾碗碟。'), ('en', 'In the end we had to tackle the dishes together.')) v(l, t) on v.l = t.native_language
where t.learning_object_id = 'aa36b7f1-def6-4503-8666-bad30dbe350d';
update public.learning_object_translations t set example_translation = v.t, updated_at = now()
from (values ('zh', '最后我们只好一起收拾碗碟。'), ('en', 'In the end we had to tackle the dishes together.')) v(l, t)
where t.learning_object_id = 'aa36b7f1-def6-4503-8666-bad30dbe350d' and t.native_language = v.l;
commit;
