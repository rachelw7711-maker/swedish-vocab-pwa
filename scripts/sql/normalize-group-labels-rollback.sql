-- Rollback of normalize-group-labels.sql for batch :'batch'.
begin;
update public.word_forms f set form_value = a.old_value, updated_at = now() from public.content_audit_archive a
where a.batch_id = :'batch' and a.reason = 'label_spelling' and f.learning_object_id = a.learning_object_id and f.form_type = a.field and f.form_value = a.new_value;
delete from public.content_audit_archive where batch_id = :'batch';
commit;
