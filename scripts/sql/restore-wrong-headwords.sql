-- Puts back what remove-wrong-headwords.sql removed or changed, from the archive rows of
-- batch :'batch' (parents first, then the rows that cascade from them).
begin;
create temp table arch on commit drop as select * from public.content_audit_archive where batch_id = :'batch';
insert into public.learning_objects overriding system value select (json_populate_record(null::public.learning_objects, old_value::json)).* from arch where table_name = 'deleted:learning_objects';
insert into public.learning_object_translations overriding system value select (json_populate_record(null::public.learning_object_translations, old_value::json)).* from arch where table_name = 'deleted:learning_object_translations';
insert into public.learning_object_examples overriding system value select (json_populate_record(null::public.learning_object_examples, old_value::json)).* from arch where table_name = 'deleted:learning_object_examples';
insert into public.learning_object_example_translations overriding system value select (json_populate_record(null::public.learning_object_example_translations, old_value::json)).* from arch where table_name = 'deleted:learning_object_example_translations';
insert into public.learning_object_collocations overriding system value select (json_populate_record(null::public.learning_object_collocations, old_value::json)).* from arch where table_name = 'deleted:learning_object_collocations';
insert into public.learning_object_modules overriding system value select (json_populate_record(null::public.learning_object_modules, old_value::json)).* from arch where table_name = 'deleted:learning_object_modules' on conflict do nothing;   -- the insert trigger re-adds the module row
insert into public.learning_object_sources overriding system value select (json_populate_record(null::public.learning_object_sources, old_value::json)).* from arch where table_name = 'deleted:learning_object_sources';
insert into public.resource_field_status overriding system value select (json_populate_record(null::public.resource_field_status, old_value::json)).* from arch where table_name = 'deleted:resource_field_status';
insert into public.content_suggestions overriding system value select (json_populate_record(null::public.content_suggestions, old_value::json)).* from arch where table_name = 'deleted:content_suggestions';
insert into public.enrichment_tasks overriding system value select (json_populate_record(null::public.enrichment_tasks, old_value::json)).* from arch where table_name = 'deleted:enrichment_tasks';
insert into public.tier_changes overriding system value select (json_populate_record(null::public.tier_changes, old_value::json)).* from arch where table_name = 'deleted:tier_changes';
update public.generation_requests g set entry_id = (json_populate_record(null::public.generation_requests, a.old_value::json)).entry_id from arch a where a.table_name = 'deleted:generation_requests' and g.key = a.field;
-- svullen: forms and part of speech back; the moved links removed again.
delete from public.word_forms f using arch a where a.table_name = 'inserted:word_forms' and f.learning_object_id = a.learning_object_id and f.form_type = a.field and f.form_value = a.new_value;
insert into public.word_forms overriding system value select (json_populate_record(null::public.word_forms, old_value::json)).* from arch where table_name = 'deleted:word_forms';
update public.learning_objects lo set part_of_speech = a.old_value from arch a where a.table_name = 'learning_objects' and a.field = 'part_of_speech' and lo.id = a.learning_object_id;
update public.learning_objects lo set pos_detail = a.old_value from arch a where a.table_name = 'learning_objects' and a.field = 'pos_detail' and lo.id = a.learning_object_id;
update public.learning_objects lo set countability = a.old_value from arch a where a.table_name = 'learning_objects' and a.field = 'countability' and lo.id = a.learning_object_id;
update public.learning_objects lo set updated_at = a.old_value::timestamptz from arch a where a.table_name = 'learning_objects' and a.field = 'updated_at' and lo.id = a.learning_object_id;
delete from public.learning_object_relationships r using arch a where a.table_name = 'moved:learning_object_relationships' and r.from_object_id = a.learning_object_id and r.to_object_id = a.old_value::uuid and r.relationship_type = a.field;
insert into public.learning_object_relationships overriding system value select (json_populate_record(null::public.learning_object_relationships, old_value::json)).* from arch where table_name = 'deleted:learning_object_relationships' on conflict do nothing;
delete from public.content_audit_archive where batch_id = :'batch';
commit;
