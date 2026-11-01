-- Confirmed errors from the 2026-11-01 review list (data/reports/review-2026-11-01/review-512-status.tsv),
-- each checked against SALDO (data/reference/saldo/saldo-lemmas.tsv): only rows where the
-- stored value is demonstrably another word's form (or a form the part of speech cannot have)
-- and SALDO gives the correct one. Group numbers follow the plural ending (-or 1, -ar 2,
-- -er/-r 3, -n 4, none 5). Everything is archived; :'batch' is the archive batch id.
begin;

-- 1. Wrong values → SALDO values.
create temp table fix (head text, pos text, form_type text, new text) on commit drop;
insert into fix values
  ('bilradio','noun','plural_indefinite','bilradior'), ('bilradio','noun','plural_definite','bilradiorna'), ('bilradio','noun','declension_group','3'),
  ('radio','noun','plural_indefinite','radior'), ('radio','noun','plural_definite','radiorna'), ('radio','noun','declension_group','3'),
  ('hindu','noun','plural_indefinite','hinduer'), ('hindu','noun','plural_definite','hinduerna'), ('hindu','noun','declension_group','3'),
  ('uppmuntran','noun','genus','en'), ('uppmuntran','noun','singular_definite','uppmuntran'),
  ('uppmuntran','noun','plural_indefinite','uppmuntringar'), ('uppmuntran','noun','plural_definite','uppmuntringarna'), ('uppmuntran','noun','declension_group','2'),
  ('innevånare','noun','singular_indefinite','innevånare'), ('innevånare','noun','singular_definite','innevånaren'),
  ('innevånare','noun','plural_indefinite','innevånare'), ('innevånare','noun','plural_definite','innevånarna'), ('innevånare','noun','declension_group','5'),
  ('sankt','adjective','base_form','sankt'), ('sankt','adjective','en_form','sankt'), ('sankt','adjective','ett_form','sankt'),
  ('sankt','adjective','plural_form','sankta'), ('sankt','adjective','definite_form','sankta'),
  ('trofast','adjective','plural_form','trofasta'), ('trofast','adjective','definite_form','trofasta'), ('trofast','adjective','comparative','trofastare'),
  ('trofast','adjective','superlative_indefinite','trofastast'), ('trofast','adjective','superlative_definite','trofastaste'),
  ('yttre','adjective','superlative_indefinite','yttersta'),
  ('lutheransk','adjective','definite_form','lutheranska'),
  ('ljum','adjective','neuter_form','ljumt'),
  ('överräcka','verb','present','överräcker'), ('överräcka','verb','preteritum','överräckte'),
  ('överräcka','verb','supinum','överräckt'), ('överräcka','verb','imperative','överräck'),
  ('ryktas','verb','infinitive','ryktas'), ('ryktas','verb','present','ryktas'), ('ryktas','verb','preteritum','ryktades'),
  ('ryktas','verb','supinum','ryktats'), ('ryktas','verb','imperative','ryktas'),
  ('brännas','verb','imperative','bränns'),
  ('tyckas','verb','imperative','tycks / tyckes');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', f.learning_object_id, 'word_forms', f.form_type, f.form_value, x.new, 'review_confirmed:saldo'
from fix x join public.learning_objects lo on lo.swedish = x.head and lo.part_of_speech = x.pos and lo.status <> 'retired'
join public.word_forms f on f.learning_object_id = lo.id and f.form_type = x.form_type
where f.form_value <> x.new;
update public.word_forms f set form_value = x.new, updated_at = now()
from fix x, public.learning_objects lo
where lo.swedish = x.head and lo.part_of_speech = x.pos and lo.status <> 'retired' and f.learning_object_id = lo.id and f.form_type = x.form_type and f.form_value <> x.new;

-- 2. Forms the part of speech cannot have (the same word's entry with the right part of speech
--    keeps them, or SALDO has no such forms: kl. is an abbreviation, farväl an interjection,
--    norr/sydöst adverbs). Archived whole, then deleted.
create temp table drop_forms (head text, pos text, form_type text) on commit drop;
insert into drop_forms
select h.head, h.pos, t.form_type
from (values ('ådra','verb'), ('avresa','verb'), ('brådska','verb'), ('kl.','other'), ('farväl','interjection'), ('norr','adverb'), ('sydöst','adverb'), ('begränsad','adjective')) h(head, pos)
cross join (values ('genus'), ('singular_indefinite'), ('singular_definite'), ('plural_indefinite'), ('plural_definite'), ('declension_group')) t(form_type)
union all
select 'skrynkla', 'noun', t from unnest(array['infinitive','present','preteritum','supinum','imperative','verb_group']) t;
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', f.learning_object_id, 'deleted:word_forms', f.form_type, row_to_json(f)::text, null, 'review_confirmed:forms_of_another_part_of_speech'
from drop_forms d join public.learning_objects lo on lo.swedish = d.head and lo.part_of_speech = d.pos and lo.status <> 'retired'
join public.word_forms f on f.learning_object_id = lo.id and f.form_type = d.form_type;
delete from public.word_forms f using drop_forms d, public.learning_objects lo
where lo.swedish = d.head and lo.part_of_speech = d.pos and lo.status <> 'retired' and f.learning_object_id = lo.id and f.form_type = d.form_type;

-- 3. rykte, sinne, straffarbete: nouns stored as adjectives (SALDO: noun only, nn_4n; no noun
--    entry of their own exists). Part of speech → noun, adjective forms → SALDO noun forms.
create temp table renoun (head text, sg_def text, pl_ind text, pl_def text) on commit drop;
insert into renoun values ('rykte','ryktet','rykten','ryktena'), ('sinne','sinnet','sinnen','sinnena'), ('straffarbete','straffarbetet','straffarbeten','straffarbetena');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', lo.id, 'learning_objects', 'part_of_speech', lo.part_of_speech, 'noun', 'review_confirmed:saldo_noun_only'
from renoun r join public.learning_objects lo on lo.swedish = r.head and lo.part_of_speech = 'adjective' and lo.status <> 'retired'
where not exists (select 1 from public.learning_objects n where n.swedish = r.head and n.part_of_speech = 'noun' and n.status <> 'retired');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', f.learning_object_id, 'deleted:word_forms', f.form_type, row_to_json(f)::text, null, 'review_confirmed:saldo_noun_only'
from public.word_forms f join public.content_audit_archive a on a.learning_object_id = f.learning_object_id
  and a.batch_id = :'batch' and a.field = 'part_of_speech';
delete from public.word_forms f using public.content_audit_archive a
where a.learning_object_id = f.learning_object_id and a.batch_id = :'batch' and a.field = 'part_of_speech';
insert into public.word_forms (learning_object_id, form_type, form_value, sort_order)
select a.learning_object_id, v.t, v.val, v.ord
from public.content_audit_archive a join public.learning_objects lo on lo.id = a.learning_object_id
join renoun r on r.head = lo.swedish
cross join lateral (values ('genus','ett',0), ('singular_indefinite',r.head,1), ('singular_definite',r.sg_def,2),
  ('plural_indefinite',r.pl_ind,3), ('plural_definite',r.pl_def,4), ('declension_group','4',5)) v(t, val, ord)
where a.batch_id = :'batch' and a.field = 'part_of_speech';
update public.learning_objects lo set part_of_speech = 'noun', updated_at = now()
from public.content_audit_archive a where a.batch_id = :'batch' and a.field = 'part_of_speech' and lo.id = a.learning_object_id;
commit;
