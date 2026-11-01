-- Batch-1 follow-up (2026-11-01): the four points left uncertain, checked against Språkbanken's Korp corpora.
-- Archived and idempotent like the batch itself. The duplicate questions (-Själv då? / Själv då?, Nähä! No! / nähä)
-- are not merged here.
begin;
-- 7904aaff-9923-4485-86fc-86ec459f413b: chinese
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7904aaff-9923-4485-86fc-86ec459f413b', 'learning_objects', 'chinese', chinese, $q$性格偏向于；天生有某种倾向。常说 vara lagd åt det … hållet，或 vara lagd åt att + 动词。$q$, $q$batch1 follow-up 2026-11-01: Korp: 'lagd åt det … hållet' 215 hits, 'lagd åt att' 57; not 'noun or adjective'$q$ from public.learning_objects where id = '7904aaff-9923-4485-86fc-86ec459f413b' and chinese is distinct from $q$性格偏向于；天生有某种倾向。常说 vara lagd åt det … hållet，或 vara lagd åt att + 动词。$q$ and chinese = $q$性格偏向于；天生有某种倾向。常接名词或形容词，表示一个人的倾向、性格或天赋。$q$;
update public.learning_objects set chinese = $q$性格偏向于；天生有某种倾向。常说 vara lagd åt det … hållet，或 vara lagd åt att + 动词。$q$, updated_at = now() where id = '7904aaff-9923-4485-86fc-86ec459f413b' and chinese is distinct from $q$性格偏向于；天生有某种倾向。常说 vara lagd åt det … hållet，或 vara lagd åt att + 动词。$q$ and chinese = $q$性格偏向于；天生有某种倾向。常接名词或形容词，表示一个人的倾向、性格或天赋。$q$;

-- 7904aaff-9923-4485-86fc-86ec459f413b: zh.meaning
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7904aaff-9923-4485-86fc-86ec459f413b', 'learning_object_translations', 'zh.meaning', meaning, $q$性格偏向于；天生有某种倾向。常说 vara lagd åt det … hållet，或 vara lagd åt att + 动词。$q$, $q$batch1 follow-up 2026-11-01: Korp: 'lagd åt det … hållet' 215 hits, 'lagd åt att' 57; not 'noun or adjective'$q$ from public.learning_object_translations where learning_object_id = '7904aaff-9923-4485-86fc-86ec459f413b' and native_language = 'zh' and meaning is distinct from $q$性格偏向于；天生有某种倾向。常说 vara lagd åt det … hållet，或 vara lagd åt att + 动词。$q$ and true;
update public.learning_object_translations set meaning = $q$性格偏向于；天生有某种倾向。常说 vara lagd åt det … hållet，或 vara lagd åt att + 动词。$q$, updated_at = now() where learning_object_id = '7904aaff-9923-4485-86fc-86ec459f413b' and native_language = 'zh' and meaning is distinct from $q$性格偏向于；天生有某种倾向。常说 vara lagd åt det … hållet，或 vara lagd åt att + 动词。$q$ and true;

-- Det är fint?: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687', 'learning_objects', 'swedish', swedish, $q$Allt fint?$q$, $q$batch1 follow-up 2026-11-01: 'Det är fint?' is not used as a greeting (0 Korp hits); 'Allt fint?' is$q$ from public.learning_objects where id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and swedish is distinct from $q$Allt fint?$q$;
update public.learning_objects set swedish = $q$Allt fint?$q$, updated_at = now() where id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and swedish is distinct from $q$Allt fint?$q$;

-- Det är fint?: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687', 'learning_objects', 'match_key', match_key, $q$allt fint ?$q$, $q$batch1 follow-up 2026-11-01: 'Det är fint?' is not used as a greeting (0 Korp hits); 'Allt fint?' is$q$ from public.learning_objects where id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and match_key is distinct from $q$allt fint ?$q$;
update public.learning_objects set match_key = $q$allt fint ?$q$, updated_at = now() where id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and match_key is distinct from $q$allt fint ?$q$;

-- b2bdc79f-28f5-4b13-a3ab-3e74e33b9687: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687', 'learning_objects', 'example_sv', example_sv, $q$Hej! Allt fint? – Ja tack, allt är bra.$q$, $q$batch1 follow-up 2026-11-01: 'Det är fint?' is not used as a greeting (0 Korp hits); 'Allt fint?' is$q$ from public.learning_objects where id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and example_sv is distinct from $q$Hej! Allt fint? – Ja tack, allt är bra.$q$ and true;
update public.learning_objects set example_sv = $q$Hej! Allt fint? – Ja tack, allt är bra.$q$, updated_at = now() where id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and example_sv is distinct from $q$Hej! Allt fint? – Ja tack, allt är bra.$q$ and true;

-- b2bdc79f-28f5-4b13-a3ab-3e74e33b9687: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687', 'learning_objects', 'example_zh', example_zh, $q$嗨！一切都好吗？——好，谢谢，一切都好。$q$, $q$batch1 follow-up 2026-11-01: 'Det är fint?' is not used as a greeting (0 Korp hits); 'Allt fint?' is$q$ from public.learning_objects where id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and example_zh is distinct from $q$嗨！一切都好吗？——好，谢谢，一切都好。$q$ and true;
update public.learning_objects set example_zh = $q$嗨！一切都好吗？——好，谢谢，一切都好。$q$, updated_at = now() where id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and example_zh is distinct from $q$嗨！一切都好吗？——好，谢谢，一切都好。$q$ and true;

-- b2bdc79f-28f5-4b13-a3ab-3e74e33b9687: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687', 'learning_object_translations', 'zh.example_translation', example_translation, $q$嗨！一切都好吗？——好，谢谢，一切都好。$q$, $q$batch1 follow-up 2026-11-01: 'Det är fint?' is not used as a greeting (0 Korp hits); 'Allt fint?' is$q$ from public.learning_object_translations where learning_object_id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and native_language = 'zh' and example_translation is distinct from $q$嗨！一切都好吗？——好，谢谢，一切都好。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$嗨！一切都好吗？——好，谢谢，一切都好。$q$, updated_at = now() where learning_object_id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and native_language = 'zh' and example_translation is distinct from $q$嗨！一切都好吗？——好，谢谢，一切都好。$q$ and coalesce(example_translation, '') <> '';

-- b2bdc79f-28f5-4b13-a3ab-3e74e33b9687: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687', 'learning_object_translations', 'en.example_translation', example_translation, $q$Hi! All good? – Yes, thanks, everything's fine.$q$, $q$batch1 follow-up 2026-11-01: 'Det är fint?' is not used as a greeting (0 Korp hits); 'Allt fint?' is$q$ from public.learning_object_translations where learning_object_id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and native_language = 'en' and example_translation is distinct from $q$Hi! All good? – Yes, thanks, everything's fine.$q$ and true;
update public.learning_object_translations set example_translation = $q$Hi! All good? – Yes, thanks, everything's fine.$q$, updated_at = now() where learning_object_id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and native_language = 'en' and example_translation is distinct from $q$Hi! All good? – Yes, thanks, everything's fine.$q$ and true;

-- b2bdc79f-28f5-4b13-a3ab-3e74e33b9687: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687', 'learning_object_translations', 'zh.example_translation', example_translation, $q$嗨！一切都好吗？——好，谢谢，一切都好。$q$, $q$batch1 follow-up 2026-11-01: 'Det är fint?' is not used as a greeting (0 Korp hits); 'Allt fint?' is$q$ from public.learning_object_translations where learning_object_id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and native_language = 'zh' and example_translation is distinct from $q$嗨！一切都好吗？——好，谢谢，一切都好。$q$ and true;
update public.learning_object_translations set example_translation = $q$嗨！一切都好吗？——好，谢谢，一切都好。$q$, updated_at = now() where learning_object_id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and native_language = 'zh' and example_translation is distinct from $q$嗨！一切都好吗？——好，谢谢，一切都好。$q$ and true;

-- b2bdc79f-28f5-4b13-a3ab-3e74e33b9687: chinese
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687', 'learning_objects', 'chinese', chinese, $q$一切都好吗？口语寒暄，用来问对方近况。$q$, $q$batch1 follow-up 2026-11-01: 'Det är fint?' is not used as a greeting (0 Korp hits); 'Allt fint?' is$q$ from public.learning_objects where id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and chinese is distinct from $q$一切都好吗？口语寒暄，用来问对方近况。$q$ and chinese = $q$一切都好吗？过得好吗？口语里可用于寒暄，语气常带上扬。$q$;
update public.learning_objects set chinese = $q$一切都好吗？口语寒暄，用来问对方近况。$q$, updated_at = now() where id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and chinese is distinct from $q$一切都好吗？口语寒暄，用来问对方近况。$q$ and chinese = $q$一切都好吗？过得好吗？口语里可用于寒暄，语气常带上扬。$q$;

-- b2bdc79f-28f5-4b13-a3ab-3e74e33b9687: zh.meaning
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687', 'learning_object_translations', 'zh.meaning', meaning, $q$一切都好吗？口语寒暄，用来问对方近况。$q$, $q$batch1 follow-up 2026-11-01: 'Det är fint?' is not used as a greeting (0 Korp hits); 'Allt fint?' is$q$ from public.learning_object_translations where learning_object_id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and native_language = 'zh' and meaning is distinct from $q$一切都好吗？口语寒暄，用来问对方近况。$q$ and true;
update public.learning_object_translations set meaning = $q$一切都好吗？口语寒暄，用来问对方近况。$q$, updated_at = now() where learning_object_id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and native_language = 'zh' and meaning is distinct from $q$一切都好吗？口语寒暄，用来问对方近况。$q$ and true;

-- b2bdc79f-28f5-4b13-a3ab-3e74e33b9687: en.meaning
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687', 'learning_object_translations', 'en.meaning', meaning, $q$All good?; Everything OK?$q$, $q$batch1 follow-up 2026-11-01: 'Det är fint?' is not used as a greeting (0 Korp hits); 'Allt fint?' is$q$ from public.learning_object_translations where learning_object_id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and native_language = 'en' and meaning is distinct from $q$All good?; Everything OK?$q$ and true;
update public.learning_object_translations set meaning = $q$All good?; Everything OK?$q$, updated_at = now() where learning_object_id = 'b2bdc79f-28f5-4b13-a3ab-3e74e33b9687' and native_language = 'en' and meaning is distinct from $q$All good?; Everything OK?$q$ and true;

-- 76ecef7d-e4fa-4c83-8208-8482c1562281: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '76ecef7d-e4fa-4c83-8208-8482c1562281', 'learning_objects', 'example_zh', example_zh, $q$挺好的，谢谢。$q$, $q$batch1 follow-up 2026-11-01: example translation was a gloss$q$ from public.learning_objects where id = '76ecef7d-e4fa-4c83-8208-8482c1562281' and example_zh is distinct from $q$挺好的，谢谢。$q$ and true;
update public.learning_objects set example_zh = $q$挺好的，谢谢。$q$, updated_at = now() where id = '76ecef7d-e4fa-4c83-8208-8482c1562281' and example_zh is distinct from $q$挺好的，谢谢。$q$ and true;

-- 76ecef7d-e4fa-4c83-8208-8482c1562281: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '76ecef7d-e4fa-4c83-8208-8482c1562281', 'learning_object_translations', 'zh.example_translation', example_translation, $q$挺好的，谢谢。$q$, $q$batch1 follow-up 2026-11-01: example translation was a gloss$q$ from public.learning_object_translations where learning_object_id = '76ecef7d-e4fa-4c83-8208-8482c1562281' and native_language = 'zh' and example_translation is distinct from $q$挺好的，谢谢。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$挺好的，谢谢。$q$, updated_at = now() where learning_object_id = '76ecef7d-e4fa-4c83-8208-8482c1562281' and native_language = 'zh' and example_translation is distinct from $q$挺好的，谢谢。$q$ and coalesce(example_translation, '') <> '';

-- 5488c00c-966b-4089-b707-ef04f0b80aaa: chinese
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5488c00c-966b-4089-b707-ef04f0b80aaa', 'learning_objects', 'chinese', chinese, $q$哦？是吗？；哦，原来不是啊。听到出乎意料（常是否定的）消息时的反应，可表示惊讶、怀疑，也可表示无奈地接受。$q$, $q$batch1 follow-up 2026-11-01: nähä is a reaction to unexpected (often negative) news, not 'no' / 'no way'$q$ from public.learning_objects where id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and chinese is distinct from $q$哦？是吗？；哦，原来不是啊。听到出乎意料（常是否定的）消息时的反应，可表示惊讶、怀疑，也可表示无奈地接受。$q$ and chinese = $q$不会吧！真的吗！表示惊讶、怀疑或不敢相信。口语中很常见。$q$;
update public.learning_objects set chinese = $q$哦？是吗？；哦，原来不是啊。听到出乎意料（常是否定的）消息时的反应，可表示惊讶、怀疑，也可表示无奈地接受。$q$, updated_at = now() where id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and chinese is distinct from $q$哦？是吗？；哦，原来不是啊。听到出乎意料（常是否定的）消息时的反应，可表示惊讶、怀疑，也可表示无奈地接受。$q$ and chinese = $q$不会吧！真的吗！表示惊讶、怀疑或不敢相信。口语中很常见。$q$;

-- 5488c00c-966b-4089-b707-ef04f0b80aaa: zh.meaning
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5488c00c-966b-4089-b707-ef04f0b80aaa', 'learning_object_translations', 'zh.meaning', meaning, $q$哦？是吗？；哦，原来不是啊。听到出乎意料（常是否定的）消息时的反应，可表示惊讶、怀疑，也可表示无奈地接受。$q$, $q$batch1 follow-up 2026-11-01: nähä is a reaction to unexpected (often negative) news, not 'no' / 'no way'$q$ from public.learning_object_translations where learning_object_id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and native_language = 'zh' and meaning is distinct from $q$哦？是吗？；哦，原来不是啊。听到出乎意料（常是否定的）消息时的反应，可表示惊讶、怀疑，也可表示无奈地接受。$q$ and true;
update public.learning_object_translations set meaning = $q$哦？是吗？；哦，原来不是啊。听到出乎意料（常是否定的）消息时的反应，可表示惊讶、怀疑，也可表示无奈地接受。$q$, updated_at = now() where learning_object_id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and native_language = 'zh' and meaning is distinct from $q$哦？是吗？；哦，原来不是啊。听到出乎意料（常是否定的）消息时的反应，可表示惊讶、怀疑，也可表示无奈地接受。$q$ and true;

-- 5488c00c-966b-4089-b707-ef04f0b80aaa: en.meaning
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5488c00c-966b-4089-b707-ef04f0b80aaa', 'learning_object_translations', 'en.meaning', meaning, $q$Oh? Really?; oh, I see (it isn't); a reaction to unexpected, often negative news: surprise, doubt or resigned acceptance$q$, $q$batch1 follow-up 2026-11-01: nähä is a reaction to unexpected (often negative) news, not 'no' / 'no way'$q$ from public.learning_object_translations where learning_object_id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and native_language = 'en' and meaning is distinct from $q$Oh? Really?; oh, I see (it isn't); a reaction to unexpected, often negative news: surprise, doubt or resigned acceptance$q$ and true;
update public.learning_object_translations set meaning = $q$Oh? Really?; oh, I see (it isn't); a reaction to unexpected, often negative news: surprise, doubt or resigned acceptance$q$, updated_at = now() where learning_object_id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and native_language = 'en' and meaning is distinct from $q$Oh? Really?; oh, I see (it isn't); a reaction to unexpected, often negative news: surprise, doubt or resigned acceptance$q$ and true;

-- 5488c00c-966b-4089-b707-ef04f0b80aaa: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5488c00c-966b-4089-b707-ef04f0b80aaa', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$reaktion när man får höra att något inte är som man trodde: förvåning, misstro eller att man motvilligt godtar det$q$, $q$batch1 follow-up 2026-11-01: nähä is a reaction to unexpected (often negative) news, not 'no' / 'no way'$q$ from public.learning_objects where id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and swedish_explanation is distinct from $q$reaktion när man får höra att något inte är som man trodde: förvåning, misstro eller att man motvilligt godtar det$q$ and true;
update public.learning_objects set swedish_explanation = $q$reaktion när man får höra att något inte är som man trodde: förvåning, misstro eller att man motvilligt godtar det$q$, updated_at = now() where id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and swedish_explanation is distinct from $q$reaktion när man får höra att något inte är som man trodde: förvåning, misstro eller att man motvilligt godtar det$q$ and true;

-- 5488c00c-966b-4089-b707-ef04f0b80aaa: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5488c00c-966b-4089-b707-ef04f0b80aaa', 'learning_objects', 'example_zh', example_zh, $q$是吗？真的吗？哦！这我完全不知道。$q$, $q$batch1 follow-up 2026-11-01: nähä is a reaction to unexpected (often negative) news, not 'no' / 'no way'$q$ from public.learning_objects where id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and example_zh is distinct from $q$是吗？真的吗？哦！这我完全不知道。$q$ and true;
update public.learning_objects set example_zh = $q$是吗？真的吗？哦！这我完全不知道。$q$, updated_at = now() where id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and example_zh is distinct from $q$是吗？真的吗？哦！这我完全不知道。$q$ and true;

-- 5488c00c-966b-4089-b707-ef04f0b80aaa: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5488c00c-966b-4089-b707-ef04f0b80aaa', 'learning_object_translations', 'zh.example_translation', example_translation, $q$是吗？真的吗？哦！这我完全不知道。$q$, $q$batch1 follow-up 2026-11-01: nähä is a reaction to unexpected (often negative) news, not 'no' / 'no way'$q$ from public.learning_object_translations where learning_object_id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and native_language = 'zh' and example_translation is distinct from $q$是吗？真的吗？哦！这我完全不知道。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$是吗？真的吗？哦！这我完全不知道。$q$, updated_at = now() where learning_object_id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and native_language = 'zh' and example_translation is distinct from $q$是吗？真的吗？哦！这我完全不知道。$q$ and coalesce(example_translation, '') <> '';

-- 5488c00c-966b-4089-b707-ef04f0b80aaa: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5488c00c-966b-4089-b707-ef04f0b80aaa', 'learning_object_translations', 'en.example_translation', example_translation, $q$Oh? Is that true? Oh! I had no idea.$q$, $q$batch1 follow-up 2026-11-01: nähä is a reaction to unexpected (often negative) news, not 'no' / 'no way'$q$ from public.learning_object_translations where learning_object_id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and native_language = 'en' and example_translation is distinct from $q$Oh? Is that true? Oh! I had no idea.$q$ and true;
update public.learning_object_translations set example_translation = $q$Oh? Is that true? Oh! I had no idea.$q$, updated_at = now() where learning_object_id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and native_language = 'en' and example_translation is distinct from $q$Oh? Is that true? Oh! I had no idea.$q$ and true;
commit;
