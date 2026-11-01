-- taget → tagen (2026-11-01): the perfect participle of ta is listed under its base form
-- (SALDO tagen..av.1; 115 of 116 participle entries here use the base form). The entry's
-- own forms (base_form tagen, ett_form taget) and examples ("Boken är redan tagen") already
-- treat tagen as the headword; taget stays as its neuter form. No user data on the entry.
-- :'batch' is the archive batch id; rollback: set swedish/match_key back to old_value.
begin;
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', id, 'learning_objects', f, o, 'tagen', 'participle_headword_base_form:saldo_tagen..av.1'
from public.learning_objects, lateral (values ('swedish', swedish), ('match_key', match_key)) v(f, o)
where id = 'e44f455c-3c97-4861-906e-07bc90e2b4a5' and swedish = 'taget';
update public.learning_objects set swedish = 'tagen', match_key = 'tagen', updated_at = now()
where id = 'e44f455c-3c97-4861-906e-07bc90e2b4a5' and swedish = 'taget'
  and not exists (select 1 from public.learning_objects where swedish = 'tagen' and status <> 'retired');
commit;
