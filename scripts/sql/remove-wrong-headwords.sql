-- Entries whose headword is wrong and whose whole content belongs to another entry that
-- already exists (2026-11-01): lord holds lördag, pose holds påse, forkning is forskning
-- misspelled … None has user data (favourites, reviews, history, sessions, reports, notes,
-- reading items). Before the delete:
--   * every row of the entry and of the tables that cascade from it is archived whole in
--     content_audit_archive (table_name 'deleted:<table>'), so restore-wrong-headwords.sql
--     puts them back exactly;
--   * links from the entry to other words move to the correct entry when it lacks them
--     (they were made from the content); links to the entry are about its spelling
--     (klunga → hop "crowd") and are not moved.
-- Also: svullen was stored as a noun; SALDO and its own meaning make it an adjective.
-- Run inside one transaction; :'batch' is the archive batch id.
begin;
create temp table wrong (head text, pos text, target text, id uuid, target_id uuid) on commit drop;
insert into wrong (head, pos, target) values
  ('forkning', 'noun', 'forskning'), ('kommuism', 'noun', 'kommunism'), ('prepostion', 'noun', 'preposition'),
  ('värktabett', 'noun', 'värktablett'), ('lord', 'noun', 'lördag'), ('pose', 'noun', 'påse'), ('rakning', 'noun', 'räkning'),
  ('hop', 'noun', 'hopp'), ('spänn', 'noun', 'spänning'), ('snar', 'adjective', 'snål'), ('list', 'noun', 'lista'),
  ('itu', 'adverb', 'ut'), ('skrap', 'verb', 'skrapa');
update wrong w set id = lo.id from public.learning_objects lo where lo.swedish = w.head and lo.part_of_speech = w.pos and lo.status <> 'retired';
update wrong w set target_id = lo.id from public.learning_objects lo where lo.swedish = w.target and lo.part_of_speech = w.pos and lo.status <> 'retired';
-- Guard: every entry and target found once, and still without user data.
do $$ begin
  if (select count(*) from wrong where id is not null and target_id is not null) <> 13 then raise exception 'entries or targets not found'; end if;
  if exists (select 1 from wrong w where exists (select 1 from public.user_words where word_id = w.id) or exists (select 1 from public.review_events where word_id = w.id)
    or exists (select 1 from public.study_history where word_id = w.id) or exists (select 1 from public.study_session_items where word_id = w.id)
    or exists (select 1 from public.content_reports where word_id = w.id) or exists (select 1 from public.user_notes where source_id = w.id)
    or exists (select 1 from public.reading_analysis_items where ref_id = w.id)) then raise exception 'an entry has user data'; end if;
end $$;

-- Archive whole rows.
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', w.id, 'deleted:' || t.tbl, t.key, t.row, w.target, 'wrong_headword_content_of:' || w.target
from wrong w cross join lateral (
  select 'learning_objects' tbl, lo.id::text key, row_to_json(lo)::text row from public.learning_objects lo where lo.id = w.id
  union all select 'learning_object_translations', x.id::text, row_to_json(x)::text from public.learning_object_translations x where x.learning_object_id = w.id
  union all select 'word_forms', x.id::text, row_to_json(x)::text from public.word_forms x where x.learning_object_id = w.id
  union all select 'learning_object_examples', x.id::text, row_to_json(x)::text from public.learning_object_examples x where x.learning_object_id = w.id
  union all select 'learning_object_example_translations', x.id::text, row_to_json(x)::text from public.learning_object_example_translations x join public.learning_object_examples e on e.id = x.example_id where e.learning_object_id = w.id
  union all select 'learning_object_collocations', x.id::text, row_to_json(x)::text from public.learning_object_collocations x where x.learning_object_id = w.id
  union all select 'learning_object_modules', x.module, row_to_json(x)::text from public.learning_object_modules x where x.learning_object_id = w.id
  union all select 'learning_object_relationships', x.id::text, row_to_json(x)::text from public.learning_object_relationships x where x.from_object_id = w.id or x.to_object_id = w.id
  union all select 'learning_object_sources', x.source_id::text, row_to_json(x)::text from public.learning_object_sources x where x.learning_object_id = w.id
  union all select 'resource_field_status', x.field, row_to_json(x)::text from public.resource_field_status x where x.learning_object_id = w.id
  union all select 'content_suggestions', x.id::text, row_to_json(x)::text from public.content_suggestions x where x.learning_object_id = w.id
  union all select 'enrichment_tasks', x.id::text, row_to_json(x)::text from public.enrichment_tasks x where x.learning_object_id = w.id
  union all select 'tier_changes', x.id::text, row_to_json(x)::text from public.tier_changes x where x.learning_object_id = w.id
  union all select 'generation_requests', x.key, row_to_json(x)::text from public.generation_requests x where x.entry_id = w.id
) t;

-- Links from the entry move to the correct entry (never to itself, never twice).
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', w.target_id, 'moved:learning_object_relationships', r.relationship_type, r.to_object_id::text, w.target_id::text, 'link_moved_from:' || w.head
from wrong w join public.learning_object_relationships r on r.from_object_id = w.id
where r.to_object_id <> w.target_id
  and not exists (select 1 from public.learning_object_relationships x where x.from_object_id = w.target_id and x.to_object_id = r.to_object_id);
insert into public.learning_object_relationships (from_object_id, to_object_id, relationship_type)
select a.learning_object_id, a.old_value::uuid, a.field from public.content_audit_archive a
where a.batch_id = :'batch' and a.table_name = 'moved:learning_object_relationships'
on conflict do nothing;

delete from public.learning_objects lo using wrong w where lo.id = w.id;

-- svullen: adjective (SALDO svullen..av.1), not a noun.
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', lo.id, 'learning_objects', v.f, v.old, v.new, 'adjective_stored_as_noun:saldo_svullen..av.1'
from public.learning_objects lo, lateral (values ('part_of_speech', lo.part_of_speech, 'adjective'), ('pos_detail', lo.pos_detail, ''), ('countability', lo.countability, null), ('updated_at', lo.updated_at::text, null)) v(f, old, new)
where lo.swedish = 'svullen' and lo.part_of_speech = 'noun' and lo.status <> 'retired';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', f.learning_object_id, 'deleted:word_forms', f.id::text, row_to_json(f)::text, null, 'noun_slots_on_adjective'
from public.word_forms f join public.learning_objects lo on lo.id = f.learning_object_id
where lo.swedish = 'svullen' and lo.part_of_speech = 'noun' and f.form_type in ('singular_indefinite', 'singular_definite', 'plural_indefinite', 'plural_definite', 'genus', 'declension_group');
delete from public.word_forms f using public.content_audit_archive a
where a.batch_id = :'batch' and a.reason = 'noun_slots_on_adjective' and f.id = a.field::uuid;
insert into public.word_forms (learning_object_id, form_type, form_value, sort_order)
select lo.id, v.t, v.v, 0 from public.learning_objects lo, (values ('base_form', 'svullen'), ('neuter_form', 'svullet'), ('plural_form', 'svullna'), ('definite_form', 'svullna'),
  ('comparative', 'svullnare'), ('superlative_indefinite', 'svullnast'), ('superlative_definite', 'svullnaste')) v(t, v)
where lo.swedish = 'svullen' and lo.part_of_speech = 'noun' and lo.status <> 'retired'
on conflict (learning_object_id, form_type) do nothing;
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', f.learning_object_id, 'inserted:word_forms', f.form_type, null, f.form_value, 'adjective_forms:saldo_svullen..av.1'
from public.word_forms f join public.learning_objects lo on lo.id = f.learning_object_id
where lo.swedish = 'svullen' and lo.part_of_speech = 'noun' and f.form_type in ('base_form', 'neuter_form', 'plural_form', 'definite_form', 'comparative', 'superlative_indefinite', 'superlative_definite');
update public.learning_objects set part_of_speech = 'adjective', pos_detail = '', countability = null, updated_at = now()
where swedish = 'svullen' and part_of_speech = 'noun' and status <> 'retired';
commit;
