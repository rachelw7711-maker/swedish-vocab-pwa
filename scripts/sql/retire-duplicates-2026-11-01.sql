-- Two duplicate questions retired (2026-11-01, user decision): '-Själv då?' duplicates 'Själv då?' and
-- 'Nähä! No!' duplicates 'nähä'. No rows are deleted; both had no learning records and nothing links to them.
begin;
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', id, 'learning_objects', 'status', status, 'retired', $q$duplicate of $q$ || case id when '76f0fb71-b54e-4189-851a-7da0ff511204' then 'Själv då? (71c72fac-3e5b-4efe-9cda-8580a8053e4d)' else 'nähä (2a522e2e-dece-4199-9cf6-c20e4a467cd9)' end
from public.learning_objects where id in ('76f0fb71-b54e-4189-851a-7da0ff511204', '5488c00c-966b-4089-b707-ef04f0b80aaa') and status <> 'retired';
update public.learning_objects set status = 'retired', updated_at = now()
where id in ('76f0fb71-b54e-4189-851a-7da0ff511204', '5488c00c-966b-4089-b707-ef04f0b80aaa') and status <> 'retired';
commit;
