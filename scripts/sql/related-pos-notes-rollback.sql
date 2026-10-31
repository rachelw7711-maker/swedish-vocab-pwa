-- Rollback of related-pos-notes.sql: :'batch' is its archive batch id.
update public.learning_object_translations t set related_words = a.old_value, updated_at = now()
from public.content_audit_archive a
where a.batch_id = :'batch' and a.table_name = 'learning_object_translations' and a.field = 'related_words'
  and t.learning_object_id = a.learning_object_id and t.native_language = 'zh' and t.related_words = a.new_value;
