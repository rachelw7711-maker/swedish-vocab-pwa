-- tidsskrift → tidskrift (2026-11-01): misspelt duplicate (its forms tidsskriftet / ett are wrong too;
-- SALDO tidskrift..nn.1, en). Same procedure as merge-duplicate-headwords.sql. :'batch' is the archive batch id.
-- whole ('deleted:<table>') before the delete. Stops if a source has any user data.
-- :'batch' is the archive batch id.
begin;
create temp table pair (src_head text, src_pos text, dst_head text, src uuid, dst uuid) on commit drop;
insert into pair (src_head, src_pos, dst_head) values ('tidsskrift','noun','tidskrift');
update pair p set src = lo.id from public.learning_objects lo where lo.swedish = p.src_head and lo.part_of_speech = p.src_pos and lo.status <> 'retired';
update pair p set dst = lo.id from public.learning_objects lo where lo.swedish = p.dst_head and lo.part_of_speech = p.src_pos and lo.status <> 'retired';
do $$ begin
  if (select count(*) from pair where src is not null and dst is not null) <> 1 then raise exception 'entries not found'; end if;
  if exists (select 1 from pair p where exists (select 1 from public.user_words where word_id = p.src) or exists (select 1 from public.review_events where word_id = p.src)
    or exists (select 1 from public.study_history where word_id = p.src) or exists (select 1 from public.study_session_items where word_id = p.src)
    or exists (select 1 from public.content_reports where word_id = p.src) or exists (select 1 from public.user_notes where source_id = p.src)
    or exists (select 1 from public.reading_analysis_items where ref_id = p.src)) then raise exception 'a source entry has user data'; end if;
end $$;

-- Archive whole rows of the source (before anything moves).
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', p.src, 'deleted:' || t.tbl, t.key, t.row, p.dst::text, 'duplicate_headword_merged_into:' || p.dst_head
from pair p cross join lateral (
  select 'learning_objects' tbl, lo.id::text key, row_to_json(lo)::text row from public.learning_objects lo where lo.id = p.src
  union all select 'learning_object_translations', x.id::text, row_to_json(x)::text from public.learning_object_translations x where x.learning_object_id = p.src
  union all select 'word_forms', x.id::text, row_to_json(x)::text from public.word_forms x where x.learning_object_id = p.src
  union all select 'learning_object_examples', x.id::text, row_to_json(x)::text from public.learning_object_examples x where x.learning_object_id = p.src
  union all select 'learning_object_example_translations', x.id::text, row_to_json(x)::text from public.learning_object_example_translations x join public.learning_object_examples e on e.id = x.example_id where e.learning_object_id = p.src
  union all select 'learning_object_collocations', x.id::text, row_to_json(x)::text from public.learning_object_collocations x where x.learning_object_id = p.src
  union all select 'learning_object_modules', x.module, row_to_json(x)::text from public.learning_object_modules x where x.learning_object_id = p.src
  union all select 'learning_object_relationships', x.id::text, row_to_json(x)::text from public.learning_object_relationships x where x.from_object_id = p.src or x.to_object_id = p.src
  union all select 'learning_object_sources', x.source_id::text, row_to_json(x)::text from public.learning_object_sources x where x.learning_object_id = p.src
  union all select 'resource_field_status', x.field, row_to_json(x)::text from public.resource_field_status x where x.learning_object_id = p.src
  union all select 'content_suggestions', x.id::text, row_to_json(x)::text from public.content_suggestions x where x.learning_object_id = p.src
  union all select 'enrichment_tasks', x.id::text, row_to_json(x)::text from public.enrichment_tasks x where x.learning_object_id = p.src
  union all select 'tier_changes', x.id::text, row_to_json(x)::text from public.tier_changes x where x.learning_object_id = p.src
  union all select 'generation_requests', x.key, row_to_json(x)::text from public.generation_requests x where x.entry_id = p.src
) t;

-- Collocations the target lacks move (row kept, so its id and any promoted link stay).
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', p.dst, 'moved:learning_object_collocations', c.id::text, p.src::text, p.dst::text, 'collocation_moved_from:' || p.src_head
from pair p join public.learning_object_collocations c on c.learning_object_id = p.src
where not exists (select 1 from public.learning_object_collocations d where d.learning_object_id = p.dst and lower(d.phrase_text) = lower(c.phrase_text));
update public.learning_object_collocations c set learning_object_id = a.new_value::uuid, sort_order = 100 + coalesce(c.sort_order, 0)
from public.content_audit_archive a where a.batch_id = :'batch' and a.table_name = 'moved:learning_object_collocations' and c.id = a.field::uuid;

-- Examples (with their translations) the target lacks move.
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', p.dst, 'moved:learning_object_examples', e.id::text, p.src::text, p.dst::text, 'example_moved_from:' || p.src_head
from pair p join public.learning_object_examples e on e.learning_object_id = p.src
where not exists (select 1 from public.learning_object_examples d where d.learning_object_id = p.dst and d.example_swedish = e.example_swedish);
update public.learning_object_examples e set learning_object_id = a.new_value::uuid, sort_order = 100 + coalesce(e.sort_order, 0)
from public.content_audit_archive a where a.batch_id = :'batch' and a.table_name = 'moved:learning_object_examples' and e.id = a.field::uuid;

-- Links: outgoing ones the target lacks move; incoming ones are redirected to the target.
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', p.dst, 'moved:learning_object_relationships', r.relationship_type,
  case when r.from_object_id = p.src then 'from:' || r.to_object_id else 'to:' || r.from_object_id end, p.dst::text, 'link_moved_from:' || p.src_head
from pair p join public.learning_object_relationships r on r.from_object_id = p.src or r.to_object_id = p.src
where (r.from_object_id = p.src and r.to_object_id <> p.dst and not exists (select 1 from public.learning_object_relationships x where x.from_object_id = p.dst and x.to_object_id = r.to_object_id))
   or (r.to_object_id = p.src and r.from_object_id <> p.dst and not exists (select 1 from public.learning_object_relationships x where x.to_object_id = p.dst and x.from_object_id = r.from_object_id));
insert into public.learning_object_relationships (from_object_id, to_object_id, relationship_type)
select case when a.old_value like 'from:%' then a.learning_object_id else substr(a.old_value, 4)::uuid end,
       case when a.old_value like 'from:%' then substr(a.old_value, 6)::uuid else a.learning_object_id end, a.field
from public.content_audit_archive a where a.batch_id = :'batch' and a.table_name = 'moved:learning_object_relationships'
on conflict do nothing;

delete from public.learning_objects lo using pair p where lo.id = p.src;
commit;
