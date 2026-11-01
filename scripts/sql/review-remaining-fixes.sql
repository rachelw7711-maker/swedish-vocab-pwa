-- Remaining confirmed errors of the 2026-11-01 review (checked against SALDO; SAOL/SO noted
-- where they decide). Everything archived; :'batch' is the archive batch id.
begin;

-- 1. Form values.
create temp table fix (head text, pos text, form_type text, new text) on commit drop;
insert into fix values
  -- datum "date": data is another noun; SAOL datum, pl. datum, best. pl. datumen (SALDO lists it first).
  ('datum','noun','plural_indefinite','datum'), ('datum','noun','plural_definite','datumen'), ('datum','noun','declension_group','5'),
  -- färgteve: SALDO nn_vu_teve gives both plurals; färgteveapparater is another word.
  ('färgteve','noun','plural_indefinite','färgteve / färgtevear'), ('färgteve','noun','plural_definite','färgtevena / färgtevearna'),
  -- överräcka now has 2b forms (överräckte, överräckt); SALDO vb_2m.
  ('överräcka','verb','verb_group','2b'),
  -- meter: plural_definite held the indefinite metrar; pairs with the stored plural meter (SALDO meter, meterna).
  ('meter','noun','plural_definite','meterna'),
  -- juli: SALDO utrum (nn_0u); the other months here store en and the bare form.
  ('juli','noun','genus','en'), ('juli','noun','singular_definite','juli'),
  -- ban → bana below: its singular forms.
  ('ban','noun','singular_indefinite','bana'), ('ban','noun','singular_definite','banan');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, f.learning_object_id, 'word_forms', f.form_type, f.form_value, x.new, 'review_confirmed_2:saldo'
from fix x join public.learning_objects lo on lo.swedish = x.head and lo.part_of_speech = x.pos and lo.status <> 'retired'
join public.word_forms f on f.learning_object_id = lo.id and f.form_type = x.form_type where f.form_value <> x.new;
update public.word_forms f set form_value = x.new, updated_at = now() from fix x, public.learning_objects lo
where lo.swedish = x.head and lo.part_of_speech = x.pos and lo.status <> 'retired' and f.learning_object_id = lo.id and f.form_type = x.form_type and f.form_value <> x.new;

-- 2. Forms the word does not have. urdålig / urgammal: elative ur- adjectives are not compared
--    (sämre is dålig's, uräldre is not a word; SALDO's av_1/av_2 paradigms are generated, not
--    attested). damm "dust" (ett, SALDO nn_0n) has no plural; dammarna is damm "pond".
create temp table drop_forms (head text, pos text, form_type text) on commit drop;
insert into drop_forms values
  ('urdålig','adjective','comparative'), ('urdålig','adjective','superlative_indefinite'), ('urdålig','adjective','superlative_definite'),
  ('urgammal','adjective','comparative'), ('urgammal','adjective','superlative_indefinite'), ('urgammal','adjective','superlative_definite'),
  ('damm','noun','plural_indefinite'), ('damm','noun','plural_definite');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, f.learning_object_id, 'deleted:word_forms', f.form_type, row_to_json(f)::text, null, 'review_confirmed_2:form_does_not_exist'
from drop_forms d join public.learning_objects lo on lo.swedish = d.head and lo.part_of_speech = d.pos and lo.status <> 'retired'
join public.word_forms f on f.learning_object_id = lo.id and f.form_type = d.form_type;
delete from public.word_forms f using drop_forms d, public.learning_objects lo
where lo.swedish = d.head and lo.part_of_speech = d.pos and lo.status <> 'retired' and f.learning_object_id = lo.id and f.form_type = d.form_type;

-- 3. ytterlig (SAOL/SO: extrem, i högsta grad). Its example used yttersta (superlative of yttre):
--    the example moves to yttre; ytterlig gets its own; the "outermost" sense (yttre's) leaves its meaning.
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
values (:'batch'::uuid, 'c45b5282-bd2f-4176-a821-d02b10c386a1', 'moved:learning_object_examples', 'b116e8dc-a3b4-44b0-8ab0-d7ee1986b0e1',
  'c45b5282-bd2f-4176-a821-d02b10c386a1', '8dca131c-34c0-45c0-9fde-b9827112b1e9', 'example_uses_yttre');
update public.learning_object_examples set learning_object_id = '8dca131c-34c0-45c0-9fde-b9827112b1e9', sort_order = 100
where id = 'b116e8dc-a3b4-44b0-8ab0-d7ee1986b0e1' and learning_object_id = 'c45b5282-bd2f-4176-a821-d02b10c386a1';
with e as (
  insert into public.learning_object_examples (learning_object_id, example_swedish, example_chinese, sort_order)
  values ('c45b5282-bd2f-4176-a821-d02b10c386a1', 'Familjen levde i ytterlig fattigdom under krigsåren.', '战争年间，这家人生活在极度贫困之中。', 0)
  returning id
), t as (
  insert into public.learning_object_example_translations (example_id, native_language, translation)
  select e.id, v.l, v.t from e, (values ('zh', '战争年间，这家人生活在极度贫困之中。'), ('en', 'During the war years, the family lived in extreme poverty.')) v(l, t)
)
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, 'c45b5282-bd2f-4176-a821-d02b10c386a1', 'inserted:learning_object_examples', e.id::text, null, 'Familjen levde i ytterlig fattigdom under krigsåren.', 'example_for_ytterlig' from e;
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, lo.id, 'learning_object_translations', t.native_language || ':meaning', t.meaning, v.m, 'ytterlig_sense'
from public.learning_objects lo join public.learning_object_translations t on t.learning_object_id = lo.id
join (values ('zh', '极端的；极度的'), ('en', 'extreme; utmost')) v(l, m) on v.l = t.native_language
where lo.id = 'c45b5282-bd2f-4176-a821-d02b10c386a1'
union all select :'batch'::uuid, id, 'learning_objects', 'chinese', chinese, '极端的；极度的', 'ytterlig_sense' from public.learning_objects where id = 'c45b5282-bd2f-4176-a821-d02b10c386a1'
union all select :'batch'::uuid, id, 'learning_objects', 'swedish_explanation', swedish_explanation, 'ytterlig betyder extrem, i högsta grad.', 'ytterlig_sense' from public.learning_objects where id = 'c45b5282-bd2f-4176-a821-d02b10c386a1';
update public.learning_object_translations t set meaning = v.m, updated_at = now()
from (values ('zh', '极端的；极度的'), ('en', 'extreme; utmost')) v(l, m)
where t.learning_object_id = 'c45b5282-bd2f-4176-a821-d02b10c386a1' and t.native_language = v.l;
update public.learning_objects set chinese = '极端的；极度的', swedish_explanation = 'ytterlig betyder extrem, i högsta grad.', updated_at = now()
where id = 'c45b5282-bd2f-4176-a821-d02b10c386a1';

-- 4. ban → bana: the entry is bana (meaning, plural banor, collocations "fri bana", "på rätt bana";
--    SALDO bana..nn.1); "ban" is not a form of bana, and no bana entry exists. No user data.
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, id, 'learning_objects', f, o, n, 'headword_is_bana:saldo_bana..nn.1'
from public.learning_objects, lateral (values ('swedish', swedish, 'bana'), ('match_key', match_key, 'bana'), ('chinese', chinese, '轨道；路径；赛道。')) v(f, o, n)
where id = 'd38d1a1a-c0f5-417d-b5c3-3c4c0f05f03e' and swedish = 'ban'
union all
select :'batch'::uuid, t.learning_object_id, 'learning_object_translations', t.native_language || ':' || v.f, v.o, v.n, 'headword_is_bana:saldo_bana..nn.1'
from public.learning_object_translations t, lateral (values
  ('meaning', t.meaning, case t.native_language when 'zh' then '轨道；路径；赛道。' else t.meaning end),
  ('grammar_note', t.grammar_note, replace(replace(t.grammar_note, 'ban, banen, banor, banorna', 'bana, banan, banor, banorna'), '单数不定式 ban，单数定式 banen', '单数不定式 bana，单数定式 banan'))) v(f, o, n)
where t.learning_object_id = 'd38d1a1a-c0f5-417d-b5c3-3c4c0f05f03e' and v.o is distinct from v.n
union all
select :'batch'::uuid, learning_object_id, 'learning_object_examples', id::text, example_swedish, replace(example_swedish, 'startban ', 'startbanan '), 'headword_is_bana:saldo_bana..nn.1'
from public.learning_object_examples where learning_object_id = 'd38d1a1a-c0f5-417d-b5c3-3c4c0f05f03e' and example_swedish like '%startban %';
update public.learning_objects set swedish = 'bana', match_key = 'bana', chinese = '轨道；路径；赛道。', updated_at = now()
where id = 'd38d1a1a-c0f5-417d-b5c3-3c4c0f05f03e' and swedish = 'ban'
  and not exists (select 1 from public.learning_objects where swedish = 'bana' and status <> 'retired');
update public.learning_object_translations set meaning = case native_language when 'zh' then '轨道；路径；赛道。' else meaning end,
  grammar_note = replace(replace(grammar_note, 'ban, banen, banor, banorna', 'bana, banan, banor, banorna'), '单数不定式 ban，单数定式 banen', '单数不定式 bana，单数定式 banan'), updated_at = now()
where learning_object_id = 'd38d1a1a-c0f5-417d-b5c3-3c4c0f05f03e';
update public.learning_object_examples set example_swedish = replace(example_swedish, 'startban ', 'startbanan ')
where learning_object_id = 'd38d1a1a-c0f5-417d-b5c3-3c4c0f05f03e' and example_swedish like '%startban %';
commit;
