-- Two confirmed example errors (2026-11-01). Archived; :'batch' is the archive batch id.
-- vrist (SALDO vrist..nn.1; the joint between foot and leg): the example put the swelling on
--   "handleden vid vristen" (the wrist at the ankle); the translations followed that error.
-- slita ut: "han nästan sliten ut sig" — the past tense of slita ut sig is slet ut sig.
begin;
create temp table fix (example_id uuid, old_sv text, new_sv text, zh text, en text) on commit drop;
insert into fix values
  ('0d51e584-4981-4d4d-a06a-31638b907ad1',
   'Efter fallet från cykeln svullnade handleden vid vristen upp, så läkaren ville utesluta en fraktur.',
   'Efter fallet från cykeln svullnade vristen upp, så läkaren ville utesluta en fraktur.',
   '从自行车上摔下来后，脚踝肿了起来，所以医生想排除骨折的可能。',
   'After the fall from the bicycle, the ankle swelled up, so the doctor wanted to rule out a fracture.'),
  ('d670d7c3-f587-438c-b268-46370f5414bc',
   'Han arbetade så mycket att han nästan sliten ut sig.',
   'Han arbetade så mycket att han nästan slet ut sig.',
   null, null);
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, e.learning_object_id, 'learning_object_examples', e.id::text, e.example_swedish, f.new_sv, 'example_error'
from fix f join public.learning_object_examples e on e.id = f.example_id and e.example_swedish = f.old_sv;
update public.learning_object_examples e set example_swedish = f.new_sv from fix f where e.id = f.example_id and e.example_swedish = f.old_sv;
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, e.learning_object_id, 'learning_object_example_translations', t.native_language || ':' || e.id, t.translation, case t.native_language when 'zh' then f.zh else f.en end, 'example_error'
from fix f join public.learning_object_examples e on e.id = f.example_id join public.learning_object_example_translations t on t.example_id = e.id
where f.zh is not null;
update public.learning_object_example_translations t set translation = case t.native_language when 'zh' then f.zh else f.en end
from fix f where t.example_id = f.example_id and f.zh is not null and t.native_language in ('zh', 'en');
-- The same slita ut sentence in the entry's legacy example text.
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, id, 'learning_objects', 'example_sv', example_sv, replace(example_sv, 'nästan sliten ut sig', 'nästan slet ut sig'), 'example_error'
from public.learning_objects where id = 'd8fddd3e-f1da-46e0-82a4-f99fd51d4b0e' and example_sv like '%nästan sliten ut sig%';
update public.learning_objects set example_sv = replace(example_sv, 'nästan sliten ut sig', 'nästan slet ut sig'), updated_at = now()
where id = 'd8fddd3e-f1da-46e0-82a4-f99fd51d4b0e' and example_sv like '%nästan sliten ut sig%';
commit;
