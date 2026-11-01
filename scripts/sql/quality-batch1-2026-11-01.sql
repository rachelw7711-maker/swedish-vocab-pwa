-- Batch-1 language review of basic expressions (2026-11-01), the six copyright-risk examples and the
-- 'lägga något på burk' headword. Source: data/reports/quality-batch1-2026-11-01 (screened.json with the manual
-- verdict per finding, final.json). Only confirmed findings are applied; false positives and uncertain points
-- keep their data. Every change is archived with its old value and is a no-op when already applied.
begin;
-- fd1cff06-0360-499f-b956-bce585da4e0a: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fd1cff06-0360-499f-b956-bce585da4e0a', 'learning_objects', 'example_sv', example_sv, $q$Efter flera timmars vandring kom vi äntligen över floden på en smal bro.$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_objects where id = 'fd1cff06-0360-499f-b956-bce585da4e0a' and example_sv is distinct from $q$Efter flera timmars vandring kom vi äntligen över floden på en smal bro.$q$ and true;
update public.learning_objects set example_sv = $q$Efter flera timmars vandring kom vi äntligen över floden på en smal bro.$q$, updated_at = now() where id = 'fd1cff06-0360-499f-b956-bce585da4e0a' and example_sv is distinct from $q$Efter flera timmars vandring kom vi äntligen över floden på en smal bro.$q$ and true;

-- fd1cff06-0360-499f-b956-bce585da4e0a: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fd1cff06-0360-499f-b956-bce585da4e0a', 'learning_objects', 'example_zh', example_zh, $q$走了好几个小时后，我们终于从一座窄桥上过了河。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_objects where id = 'fd1cff06-0360-499f-b956-bce585da4e0a' and example_zh is distinct from $q$走了好几个小时后，我们终于从一座窄桥上过了河。$q$ and true;
update public.learning_objects set example_zh = $q$走了好几个小时后，我们终于从一座窄桥上过了河。$q$, updated_at = now() where id = 'fd1cff06-0360-499f-b956-bce585da4e0a' and example_zh is distinct from $q$走了好几个小时后，我们终于从一座窄桥上过了河。$q$ and true;

-- fd1cff06-0360-499f-b956-bce585da4e0a: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fd1cff06-0360-499f-b956-bce585da4e0a', 'learning_object_translations', 'zh.example_translation', example_translation, $q$走了好几个小时后，我们终于从一座窄桥上过了河。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = 'fd1cff06-0360-499f-b956-bce585da4e0a' and native_language = 'zh' and example_translation is distinct from $q$走了好几个小时后，我们终于从一座窄桥上过了河。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$走了好几个小时后，我们终于从一座窄桥上过了河。$q$, updated_at = now() where learning_object_id = 'fd1cff06-0360-499f-b956-bce585da4e0a' and native_language = 'zh' and example_translation is distinct from $q$走了好几个小时后，我们终于从一座窄桥上过了河。$q$ and coalesce(example_translation, '') <> '';

-- fd1cff06-0360-499f-b956-bce585da4e0a: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fd1cff06-0360-499f-b956-bce585da4e0a', 'learning_object_translations', 'en.example_translation', example_translation, $q$After hours of walking, we finally got across the river on a narrow bridge.$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = 'fd1cff06-0360-499f-b956-bce585da4e0a' and native_language = 'en' and example_translation is distinct from $q$After hours of walking, we finally got across the river on a narrow bridge.$q$ and true;
update public.learning_object_translations set example_translation = $q$After hours of walking, we finally got across the river on a narrow bridge.$q$, updated_at = now() where learning_object_id = 'fd1cff06-0360-499f-b956-bce585da4e0a' and native_language = 'en' and example_translation is distinct from $q$After hours of walking, we finally got across the river on a narrow bridge.$q$ and true;

-- fd1cff06-0360-499f-b956-bce585da4e0a: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fd1cff06-0360-499f-b956-bce585da4e0a', 'learning_object_translations', 'zh.example_translation', example_translation, $q$走了好几个小时后，我们终于从一座窄桥上过了河。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = 'fd1cff06-0360-499f-b956-bce585da4e0a' and native_language = 'zh' and example_translation is distinct from $q$走了好几个小时后，我们终于从一座窄桥上过了河。$q$ and true;
update public.learning_object_translations set example_translation = $q$走了好几个小时后，我们终于从一座窄桥上过了河。$q$, updated_at = now() where learning_object_id = 'fd1cff06-0360-499f-b956-bce585da4e0a' and native_language = 'zh' and example_translation is distinct from $q$走了好几个小时后，我们终于从一座窄桥上过了河。$q$ and true;

-- 04ab04e5-8333-4341-b06e-33ddecd984e3: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '04ab04e5-8333-4341-b06e-33ddecd984e3', 'learning_objects', 'example_sv', example_sv, $q$Stormen satte skräck i hela byn.$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_objects where id = '04ab04e5-8333-4341-b06e-33ddecd984e3' and example_sv is distinct from $q$Stormen satte skräck i hela byn.$q$ and true;
update public.learning_objects set example_sv = $q$Stormen satte skräck i hela byn.$q$, updated_at = now() where id = '04ab04e5-8333-4341-b06e-33ddecd984e3' and example_sv is distinct from $q$Stormen satte skräck i hela byn.$q$ and true;

-- 04ab04e5-8333-4341-b06e-33ddecd984e3: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '04ab04e5-8333-4341-b06e-33ddecd984e3', 'learning_objects', 'example_zh', example_zh, $q$这场暴风雨让整个村子陷入恐慌。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_objects where id = '04ab04e5-8333-4341-b06e-33ddecd984e3' and example_zh is distinct from $q$这场暴风雨让整个村子陷入恐慌。$q$ and true;
update public.learning_objects set example_zh = $q$这场暴风雨让整个村子陷入恐慌。$q$, updated_at = now() where id = '04ab04e5-8333-4341-b06e-33ddecd984e3' and example_zh is distinct from $q$这场暴风雨让整个村子陷入恐慌。$q$ and true;

-- 04ab04e5-8333-4341-b06e-33ddecd984e3: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '04ab04e5-8333-4341-b06e-33ddecd984e3', 'learning_object_translations', 'zh.example_translation', example_translation, $q$这场暴风雨让整个村子陷入恐慌。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = '04ab04e5-8333-4341-b06e-33ddecd984e3' and native_language = 'zh' and example_translation is distinct from $q$这场暴风雨让整个村子陷入恐慌。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$这场暴风雨让整个村子陷入恐慌。$q$, updated_at = now() where learning_object_id = '04ab04e5-8333-4341-b06e-33ddecd984e3' and native_language = 'zh' and example_translation is distinct from $q$这场暴风雨让整个村子陷入恐慌。$q$ and coalesce(example_translation, '') <> '';

-- 04ab04e5-8333-4341-b06e-33ddecd984e3: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '04ab04e5-8333-4341-b06e-33ddecd984e3', 'learning_object_translations', 'en.example_translation', example_translation, $q$The storm struck fear into the whole village.$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = '04ab04e5-8333-4341-b06e-33ddecd984e3' and native_language = 'en' and example_translation is distinct from $q$The storm struck fear into the whole village.$q$ and true;
update public.learning_object_translations set example_translation = $q$The storm struck fear into the whole village.$q$, updated_at = now() where learning_object_id = '04ab04e5-8333-4341-b06e-33ddecd984e3' and native_language = 'en' and example_translation is distinct from $q$The storm struck fear into the whole village.$q$ and true;

-- 04ab04e5-8333-4341-b06e-33ddecd984e3: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '04ab04e5-8333-4341-b06e-33ddecd984e3', 'learning_object_translations', 'zh.example_translation', example_translation, $q$这场暴风雨让整个村子陷入恐慌。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = '04ab04e5-8333-4341-b06e-33ddecd984e3' and native_language = 'zh' and example_translation is distinct from $q$这场暴风雨让整个村子陷入恐慌。$q$ and true;
update public.learning_object_translations set example_translation = $q$这场暴风雨让整个村子陷入恐慌。$q$, updated_at = now() where learning_object_id = '04ab04e5-8333-4341-b06e-33ddecd984e3' and native_language = 'zh' and example_translation is distinct from $q$这场暴风雨让整个村子陷入恐慌。$q$ and true;

-- 57c3e205-dcf3-4037-8c81-f00ece6432d9: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '57c3e205-dcf3-4037-8c81-f00ece6432d9', 'learning_objects', 'example_sv', example_sv, $q$På vintern går han alltid klädd i en tjock ullrock.$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_objects where id = '57c3e205-dcf3-4037-8c81-f00ece6432d9' and example_sv is distinct from $q$På vintern går han alltid klädd i en tjock ullrock.$q$ and true;
update public.learning_objects set example_sv = $q$På vintern går han alltid klädd i en tjock ullrock.$q$, updated_at = now() where id = '57c3e205-dcf3-4037-8c81-f00ece6432d9' and example_sv is distinct from $q$På vintern går han alltid klädd i en tjock ullrock.$q$ and true;

-- 57c3e205-dcf3-4037-8c81-f00ece6432d9: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '57c3e205-dcf3-4037-8c81-f00ece6432d9', 'learning_objects', 'example_zh', example_zh, $q$冬天他总是穿着一件厚厚的羊毛大衣。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_objects where id = '57c3e205-dcf3-4037-8c81-f00ece6432d9' and example_zh is distinct from $q$冬天他总是穿着一件厚厚的羊毛大衣。$q$ and true;
update public.learning_objects set example_zh = $q$冬天他总是穿着一件厚厚的羊毛大衣。$q$, updated_at = now() where id = '57c3e205-dcf3-4037-8c81-f00ece6432d9' and example_zh is distinct from $q$冬天他总是穿着一件厚厚的羊毛大衣。$q$ and true;

-- 57c3e205-dcf3-4037-8c81-f00ece6432d9: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '57c3e205-dcf3-4037-8c81-f00ece6432d9', 'learning_object_translations', 'zh.example_translation', example_translation, $q$冬天他总是穿着一件厚厚的羊毛大衣。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = '57c3e205-dcf3-4037-8c81-f00ece6432d9' and native_language = 'zh' and example_translation is distinct from $q$冬天他总是穿着一件厚厚的羊毛大衣。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$冬天他总是穿着一件厚厚的羊毛大衣。$q$, updated_at = now() where learning_object_id = '57c3e205-dcf3-4037-8c81-f00ece6432d9' and native_language = 'zh' and example_translation is distinct from $q$冬天他总是穿着一件厚厚的羊毛大衣。$q$ and coalesce(example_translation, '') <> '';

-- 57c3e205-dcf3-4037-8c81-f00ece6432d9: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '57c3e205-dcf3-4037-8c81-f00ece6432d9', 'learning_object_translations', 'en.example_translation', example_translation, $q$In winter he always wears a thick wool coat.$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = '57c3e205-dcf3-4037-8c81-f00ece6432d9' and native_language = 'en' and example_translation is distinct from $q$In winter he always wears a thick wool coat.$q$ and true;
update public.learning_object_translations set example_translation = $q$In winter he always wears a thick wool coat.$q$, updated_at = now() where learning_object_id = '57c3e205-dcf3-4037-8c81-f00ece6432d9' and native_language = 'en' and example_translation is distinct from $q$In winter he always wears a thick wool coat.$q$ and true;

-- 57c3e205-dcf3-4037-8c81-f00ece6432d9: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '57c3e205-dcf3-4037-8c81-f00ece6432d9', 'learning_object_translations', 'zh.example_translation', example_translation, $q$冬天他总是穿着一件厚厚的羊毛大衣。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = '57c3e205-dcf3-4037-8c81-f00ece6432d9' and native_language = 'zh' and example_translation is distinct from $q$冬天他总是穿着一件厚厚的羊毛大衣。$q$ and true;
update public.learning_object_translations set example_translation = $q$冬天他总是穿着一件厚厚的羊毛大衣。$q$, updated_at = now() where learning_object_id = '57c3e205-dcf3-4037-8c81-f00ece6432d9' and native_language = 'zh' and example_translation is distinct from $q$冬天他总是穿着一件厚厚的羊毛大衣。$q$ and true;

-- c5a6f4fe-d7ab-4a43-a568-a6167a960f6d: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d', 'learning_objects', 'example_sv', example_sv, $q$Han satte fast kroken i väggen med två skruvar.$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_objects where id = 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d' and example_sv is distinct from $q$Han satte fast kroken i väggen med två skruvar.$q$ and true;
update public.learning_objects set example_sv = $q$Han satte fast kroken i väggen med två skruvar.$q$, updated_at = now() where id = 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d' and example_sv is distinct from $q$Han satte fast kroken i väggen med två skruvar.$q$ and true;

-- c5a6f4fe-d7ab-4a43-a568-a6167a960f6d: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d', 'learning_objects', 'example_zh', example_zh, $q$他用两颗螺丝把挂钩固定在墙上。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_objects where id = 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d' and example_zh is distinct from $q$他用两颗螺丝把挂钩固定在墙上。$q$ and true;
update public.learning_objects set example_zh = $q$他用两颗螺丝把挂钩固定在墙上。$q$, updated_at = now() where id = 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d' and example_zh is distinct from $q$他用两颗螺丝把挂钩固定在墙上。$q$ and true;

-- c5a6f4fe-d7ab-4a43-a568-a6167a960f6d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$他用两颗螺丝把挂钩固定在墙上。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d' and native_language = 'zh' and example_translation is distinct from $q$他用两颗螺丝把挂钩固定在墙上。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$他用两颗螺丝把挂钩固定在墙上。$q$, updated_at = now() where learning_object_id = 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d' and native_language = 'zh' and example_translation is distinct from $q$他用两颗螺丝把挂钩固定在墙上。$q$ and coalesce(example_translation, '') <> '';

-- c5a6f4fe-d7ab-4a43-a568-a6167a960f6d: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d', 'learning_object_translations', 'en.example_translation', example_translation, $q$He fixed the hook to the wall with two screws.$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d' and native_language = 'en' and example_translation is distinct from $q$He fixed the hook to the wall with two screws.$q$ and true;
update public.learning_object_translations set example_translation = $q$He fixed the hook to the wall with two screws.$q$, updated_at = now() where learning_object_id = 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d' and native_language = 'en' and example_translation is distinct from $q$He fixed the hook to the wall with two screws.$q$ and true;

-- c5a6f4fe-d7ab-4a43-a568-a6167a960f6d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$他用两颗螺丝把挂钩固定在墙上。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d' and native_language = 'zh' and example_translation is distinct from $q$他用两颗螺丝把挂钩固定在墙上。$q$ and true;
update public.learning_object_translations set example_translation = $q$他用两颗螺丝把挂钩固定在墙上。$q$, updated_at = now() where learning_object_id = 'c5a6f4fe-d7ab-4a43-a568-a6167a960f6d' and native_language = 'zh' and example_translation is distinct from $q$他用两颗螺丝把挂钩固定在墙上。$q$ and true;

-- e40376c2-0356-41c4-9bce-53c1574cbb83: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e40376c2-0356-41c4-9bce-53c1574cbb83', 'learning_objects', 'example_sv', example_sv, $q$Barnen plockade ringblommor i trädgården till mormors födelsedag.$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_objects where id = 'e40376c2-0356-41c4-9bce-53c1574cbb83' and example_sv is distinct from $q$Barnen plockade ringblommor i trädgården till mormors födelsedag.$q$ and true;
update public.learning_objects set example_sv = $q$Barnen plockade ringblommor i trädgården till mormors födelsedag.$q$, updated_at = now() where id = 'e40376c2-0356-41c4-9bce-53c1574cbb83' and example_sv is distinct from $q$Barnen plockade ringblommor i trädgården till mormors födelsedag.$q$ and true;

-- e40376c2-0356-41c4-9bce-53c1574cbb83: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e40376c2-0356-41c4-9bce-53c1574cbb83', 'learning_objects', 'example_zh', example_zh, $q$孩子们在花园里采金盏花，准备送给外婆过生日。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_objects where id = 'e40376c2-0356-41c4-9bce-53c1574cbb83' and example_zh is distinct from $q$孩子们在花园里采金盏花，准备送给外婆过生日。$q$ and true;
update public.learning_objects set example_zh = $q$孩子们在花园里采金盏花，准备送给外婆过生日。$q$, updated_at = now() where id = 'e40376c2-0356-41c4-9bce-53c1574cbb83' and example_zh is distinct from $q$孩子们在花园里采金盏花，准备送给外婆过生日。$q$ and true;

-- e40376c2-0356-41c4-9bce-53c1574cbb83: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e40376c2-0356-41c4-9bce-53c1574cbb83', 'learning_object_translations', 'zh.example_translation', example_translation, $q$孩子们在花园里采金盏花，准备送给外婆过生日。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = 'e40376c2-0356-41c4-9bce-53c1574cbb83' and native_language = 'zh' and example_translation is distinct from $q$孩子们在花园里采金盏花，准备送给外婆过生日。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$孩子们在花园里采金盏花，准备送给外婆过生日。$q$, updated_at = now() where learning_object_id = 'e40376c2-0356-41c4-9bce-53c1574cbb83' and native_language = 'zh' and example_translation is distinct from $q$孩子们在花园里采金盏花，准备送给外婆过生日。$q$ and coalesce(example_translation, '') <> '';

-- e40376c2-0356-41c4-9bce-53c1574cbb83: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e40376c2-0356-41c4-9bce-53c1574cbb83', 'learning_object_translations', 'en.example_translation', example_translation, $q$The children picked marigolds in the garden for their grandmother's birthday.$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = 'e40376c2-0356-41c4-9bce-53c1574cbb83' and native_language = 'en' and example_translation is distinct from $q$The children picked marigolds in the garden for their grandmother's birthday.$q$ and true;
update public.learning_object_translations set example_translation = $q$The children picked marigolds in the garden for their grandmother's birthday.$q$, updated_at = now() where learning_object_id = 'e40376c2-0356-41c4-9bce-53c1574cbb83' and native_language = 'en' and example_translation is distinct from $q$The children picked marigolds in the garden for their grandmother's birthday.$q$ and true;

-- e40376c2-0356-41c4-9bce-53c1574cbb83: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e40376c2-0356-41c4-9bce-53c1574cbb83', 'learning_object_translations', 'zh.example_translation', example_translation, $q$孩子们在花园里采金盏花，准备送给外婆过生日。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = 'e40376c2-0356-41c4-9bce-53c1574cbb83' and native_language = 'zh' and example_translation is distinct from $q$孩子们在花园里采金盏花，准备送给外婆过生日。$q$ and true;
update public.learning_object_translations set example_translation = $q$孩子们在花园里采金盏花，准备送给外婆过生日。$q$, updated_at = now() where learning_object_id = 'e40376c2-0356-41c4-9bce-53c1574cbb83' and native_language = 'zh' and example_translation is distinct from $q$孩子们在花园里采金盏花，准备送给外婆过生日。$q$ and true;

-- f818278f-2b99-4cc1-a099-b73d53983fb4: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f818278f-2b99-4cc1-a099-b73d53983fb4', 'learning_objects', 'example_sv', example_sv, $q$Barnen sprang i kapp ner till stranden.$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_objects where id = 'f818278f-2b99-4cc1-a099-b73d53983fb4' and example_sv is distinct from $q$Barnen sprang i kapp ner till stranden.$q$ and true;
update public.learning_objects set example_sv = $q$Barnen sprang i kapp ner till stranden.$q$, updated_at = now() where id = 'f818278f-2b99-4cc1-a099-b73d53983fb4' and example_sv is distinct from $q$Barnen sprang i kapp ner till stranden.$q$ and true;

-- f818278f-2b99-4cc1-a099-b73d53983fb4: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f818278f-2b99-4cc1-a099-b73d53983fb4', 'learning_objects', 'example_zh', example_zh, $q$孩子们赛跑着冲向海滩。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_objects where id = 'f818278f-2b99-4cc1-a099-b73d53983fb4' and example_zh is distinct from $q$孩子们赛跑着冲向海滩。$q$ and true;
update public.learning_objects set example_zh = $q$孩子们赛跑着冲向海滩。$q$, updated_at = now() where id = 'f818278f-2b99-4cc1-a099-b73d53983fb4' and example_zh is distinct from $q$孩子们赛跑着冲向海滩。$q$ and true;

-- f818278f-2b99-4cc1-a099-b73d53983fb4: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f818278f-2b99-4cc1-a099-b73d53983fb4', 'learning_object_translations', 'zh.example_translation', example_translation, $q$孩子们赛跑着冲向海滩。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = 'f818278f-2b99-4cc1-a099-b73d53983fb4' and native_language = 'zh' and example_translation is distinct from $q$孩子们赛跑着冲向海滩。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$孩子们赛跑着冲向海滩。$q$, updated_at = now() where learning_object_id = 'f818278f-2b99-4cc1-a099-b73d53983fb4' and native_language = 'zh' and example_translation is distinct from $q$孩子们赛跑着冲向海滩。$q$ and coalesce(example_translation, '') <> '';

-- f818278f-2b99-4cc1-a099-b73d53983fb4: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f818278f-2b99-4cc1-a099-b73d53983fb4', 'learning_object_translations', 'en.example_translation', example_translation, $q$The children raced each other down to the beach.$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = 'f818278f-2b99-4cc1-a099-b73d53983fb4' and native_language = 'en' and example_translation is distinct from $q$The children raced each other down to the beach.$q$ and true;
update public.learning_object_translations set example_translation = $q$The children raced each other down to the beach.$q$, updated_at = now() where learning_object_id = 'f818278f-2b99-4cc1-a099-b73d53983fb4' and native_language = 'en' and example_translation is distinct from $q$The children raced each other down to the beach.$q$ and true;

-- f818278f-2b99-4cc1-a099-b73d53983fb4: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f818278f-2b99-4cc1-a099-b73d53983fb4', 'learning_object_translations', 'zh.example_translation', example_translation, $q$孩子们赛跑着冲向海滩。$q$, $q$2026-11-01 copyright: example taken from an imported reading text, replaced with an original sentence$q$ from public.learning_object_translations where learning_object_id = 'f818278f-2b99-4cc1-a099-b73d53983fb4' and native_language = 'zh' and example_translation is distinct from $q$孩子们赛跑着冲向海滩。$q$ and true;
update public.learning_object_translations set example_translation = $q$孩子们赛跑着冲向海滩。$q$, updated_at = now() where learning_object_id = 'f818278f-2b99-4cc1-a099-b73d53983fb4' and native_language = 'zh' and example_translation is distinct from $q$孩子们赛跑着冲向海滩。$q$ and true;

-- lägga något på konservburkar: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '74bef913-4d95-4ac2-8a6a-8b6709d2a489', 'learning_objects', 'swedish', swedish, $q$lägga något på burk$q$, $q$2026-11-01 headword: the fixed phrase is 'lägga på burk'$q$ from public.learning_objects where id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and swedish is distinct from $q$lägga något på burk$q$;
update public.learning_objects set swedish = $q$lägga något på burk$q$, updated_at = now() where id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and swedish is distinct from $q$lägga något på burk$q$;

-- lägga något på konservburkar: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '74bef913-4d95-4ac2-8a6a-8b6709d2a489', 'learning_objects', 'match_key', match_key, $q$lägga ngt på burk$q$, $q$2026-11-01 headword: the fixed phrase is 'lägga på burk'$q$ from public.learning_objects where id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and match_key is distinct from $q$lägga ngt på burk$q$;
update public.learning_objects set match_key = $q$lägga ngt på burk$q$, updated_at = now() where id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and match_key is distinct from $q$lägga ngt på burk$q$;

-- 74bef913-4d95-4ac2-8a6a-8b6709d2a489: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '74bef913-4d95-4ac2-8a6a-8b6709d2a489', 'learning_objects', 'example_sv', example_sv, $q$Strömmingen läggs sedan på burk för att efterjäsa.$q$, $q$2026-11-01 headword: the fixed phrase is 'lägga på burk'$q$ from public.learning_objects where id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and example_sv is distinct from $q$Strömmingen läggs sedan på burk för att efterjäsa.$q$ and true;
update public.learning_objects set example_sv = $q$Strömmingen läggs sedan på burk för att efterjäsa.$q$, updated_at = now() where id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and example_sv is distinct from $q$Strömmingen läggs sedan på burk för att efterjäsa.$q$ and true;

-- 74bef913-4d95-4ac2-8a6a-8b6709d2a489: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '74bef913-4d95-4ac2-8a6a-8b6709d2a489', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$lägga något i burk, t.ex. för att konservera det$q$, $q$2026-11-01 headword: the fixed phrase is 'lägga på burk'$q$ from public.learning_objects where id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and swedish_explanation is distinct from $q$lägga något i burk, t.ex. för att konservera det$q$ and true;
update public.learning_objects set swedish_explanation = $q$lägga något i burk, t.ex. för att konservera det$q$, updated_at = now() where id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and swedish_explanation is distinct from $q$lägga något i burk, t.ex. för att konservera det$q$ and true;

-- 74bef913-4d95-4ac2-8a6a-8b6709d2a489: chinese
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '74bef913-4d95-4ac2-8a6a-8b6709d2a489', 'learning_objects', 'chinese', chinese, $q$把某物装罐；装进罐头里$q$, $q$2026-11-01 headword: the fixed phrase is 'lägga på burk'; 装到罐头盒上 was wrong$q$ from public.learning_objects where id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and chinese is distinct from $q$把某物装罐；装进罐头里$q$ and chinese = $q$把某物装到罐头盒上$q$;
update public.learning_objects set chinese = $q$把某物装罐；装进罐头里$q$, updated_at = now() where id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and chinese is distinct from $q$把某物装罐；装进罐头里$q$ and chinese = $q$把某物装到罐头盒上$q$;

-- 74bef913-4d95-4ac2-8a6a-8b6709d2a489: zh.meaning
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '74bef913-4d95-4ac2-8a6a-8b6709d2a489', 'learning_object_translations', 'zh.meaning', meaning, $q$把某物装罐；装进罐头里$q$, $q$2026-11-01 headword: the fixed phrase is 'lägga på burk'; 装到罐头盒上 was wrong$q$ from public.learning_object_translations where learning_object_id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and native_language = 'zh' and meaning is distinct from $q$把某物装罐；装进罐头里$q$ and true;
update public.learning_object_translations set meaning = $q$把某物装罐；装进罐头里$q$, updated_at = now() where learning_object_id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and native_language = 'zh' and meaning is distinct from $q$把某物装罐；装进罐头里$q$ and true;

-- 303b76ff-be55-487c-a76d-87b570a1a4dc: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '303b76ff-be55-487c-a76d-87b570a1a4dc', 'learning_objects', 'example_zh', example_zh, $q$你在想什么？你看起来有点安静。你听到这个词的时候会想到什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '303b76ff-be55-487c-a76d-87b570a1a4dc' and example_zh is distinct from $q$你在想什么？你看起来有点安静。你听到这个词的时候会想到什么？$q$ and true;
update public.learning_objects set example_zh = $q$你在想什么？你看起来有点安静。你听到这个词的时候会想到什么？$q$, updated_at = now() where id = '303b76ff-be55-487c-a76d-87b570a1a4dc' and example_zh is distinct from $q$你在想什么？你看起来有点安静。你听到这个词的时候会想到什么？$q$ and true;

-- 303b76ff-be55-487c-a76d-87b570a1a4dc: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '303b76ff-be55-487c-a76d-87b570a1a4dc', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你在想什么？你看起来有点安静。你听到这个词的时候会想到什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '303b76ff-be55-487c-a76d-87b570a1a4dc' and native_language = 'zh' and example_translation is distinct from $q$你在想什么？你看起来有点安静。你听到这个词的时候会想到什么？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你在想什么？你看起来有点安静。你听到这个词的时候会想到什么？$q$, updated_at = now() where learning_object_id = '303b76ff-be55-487c-a76d-87b570a1a4dc' and native_language = 'zh' and example_translation is distinct from $q$你在想什么？你看起来有点安静。你听到这个词的时候会想到什么？$q$ and coalesce(example_translation, '') <> '';

-- 3f9e16a3-e3ec-45fa-8dfc-aa0ff2258cf9: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3f9e16a3-e3ec-45fa-8dfc-aa0ff2258cf9', 'learning_objects', 'example_zh', example_zh, $q$读者请老师对这篇文章给出反馈。我们需要尽快给出反馈。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '3f9e16a3-e3ec-45fa-8dfc-aa0ff2258cf9' and example_zh is distinct from $q$读者请老师对这篇文章给出反馈。我们需要尽快给出反馈。$q$ and true;
update public.learning_objects set example_zh = $q$读者请老师对这篇文章给出反馈。我们需要尽快给出反馈。$q$, updated_at = now() where id = '3f9e16a3-e3ec-45fa-8dfc-aa0ff2258cf9' and example_zh is distinct from $q$读者请老师对这篇文章给出反馈。我们需要尽快给出反馈。$q$ and true;

-- 3f9e16a3-e3ec-45fa-8dfc-aa0ff2258cf9: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3f9e16a3-e3ec-45fa-8dfc-aa0ff2258cf9', 'learning_object_translations', 'zh.example_translation', example_translation, $q$读者请老师对这篇文章给出反馈。我们需要尽快给出反馈。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '3f9e16a3-e3ec-45fa-8dfc-aa0ff2258cf9' and native_language = 'zh' and example_translation is distinct from $q$读者请老师对这篇文章给出反馈。我们需要尽快给出反馈。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$读者请老师对这篇文章给出反馈。我们需要尽快给出反馈。$q$, updated_at = now() where learning_object_id = '3f9e16a3-e3ec-45fa-8dfc-aa0ff2258cf9' and native_language = 'zh' and example_translation is distinct from $q$读者请老师对这篇文章给出反馈。我们需要尽快给出反馈。$q$ and coalesce(example_translation, '') <> '';

-- 3f9e16a3-e3ec-45fa-8dfc-aa0ff2258cf9: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3f9e16a3-e3ec-45fa-8dfc-aa0ff2258cf9', 'learning_object_translations', 'en.example_translation', example_translation, $q$The reader asked the teacher to give feedback on the text. We need to give feedback quickly.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '3f9e16a3-e3ec-45fa-8dfc-aa0ff2258cf9' and native_language = 'en' and example_translation is distinct from $q$The reader asked the teacher to give feedback on the text. We need to give feedback quickly.$q$ and true;
update public.learning_object_translations set example_translation = $q$The reader asked the teacher to give feedback on the text. We need to give feedback quickly.$q$, updated_at = now() where learning_object_id = '3f9e16a3-e3ec-45fa-8dfc-aa0ff2258cf9' and native_language = 'en' and example_translation is distinct from $q$The reader asked the teacher to give feedback on the text. We need to give feedback quickly.$q$ and true;

-- 088962bf-5b14-490e-aca7-855d8196d7c8: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '088962bf-5b14-490e-aca7-855d8196d7c8', 'learning_objects', 'example_zh', example_zh, $q$我不明白这个说明。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '088962bf-5b14-490e-aca7-855d8196d7c8' and example_zh is distinct from $q$我不明白这个说明。$q$ and true;
update public.learning_objects set example_zh = $q$我不明白这个说明。$q$, updated_at = now() where id = '088962bf-5b14-490e-aca7-855d8196d7c8' and example_zh is distinct from $q$我不明白这个说明。$q$ and true;

-- 088962bf-5b14-490e-aca7-855d8196d7c8: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '088962bf-5b14-490e-aca7-855d8196d7c8', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我不明白这个说明。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '088962bf-5b14-490e-aca7-855d8196d7c8' and native_language = 'zh' and example_translation is distinct from $q$我不明白这个说明。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我不明白这个说明。$q$, updated_at = now() where learning_object_id = '088962bf-5b14-490e-aca7-855d8196d7c8' and native_language = 'zh' and example_translation is distinct from $q$我不明白这个说明。$q$ and coalesce(example_translation, '') <> '';

-- 25522abd-fa0c-4fb0-a0a3-6fe62b8acb04: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '25522abd-fa0c-4fb0-a0a3-6fe62b8acb04', 'learning_objects', 'example_zh', example_zh, $q$我可以帮点什么吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '25522abd-fa0c-4fb0-a0a3-6fe62b8acb04' and example_zh is distinct from $q$我可以帮点什么吗？$q$ and true;
update public.learning_objects set example_zh = $q$我可以帮点什么吗？$q$, updated_at = now() where id = '25522abd-fa0c-4fb0-a0a3-6fe62b8acb04' and example_zh is distinct from $q$我可以帮点什么吗？$q$ and true;

-- 25522abd-fa0c-4fb0-a0a3-6fe62b8acb04: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '25522abd-fa0c-4fb0-a0a3-6fe62b8acb04', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我可以帮点什么吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '25522abd-fa0c-4fb0-a0a3-6fe62b8acb04' and native_language = 'zh' and example_translation is distinct from $q$我可以帮点什么吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我可以帮点什么吗？$q$, updated_at = now() where learning_object_id = '25522abd-fa0c-4fb0-a0a3-6fe62b8acb04' and native_language = 'zh' and example_translation is distinct from $q$我可以帮点什么吗？$q$ and coalesce(example_translation, '') <> '';

-- 3dfaa098-779f-42fd-a017-763d9377e188: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3dfaa098-779f-42fd-a017-763d9377e188', 'learning_objects', 'example_zh', example_zh, $q$六点对我来说可以。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '3dfaa098-779f-42fd-a017-763d9377e188' and example_zh is distinct from $q$六点对我来说可以。$q$ and true;
update public.learning_objects set example_zh = $q$六点对我来说可以。$q$, updated_at = now() where id = '3dfaa098-779f-42fd-a017-763d9377e188' and example_zh is distinct from $q$六点对我来说可以。$q$ and true;

-- 3dfaa098-779f-42fd-a017-763d9377e188: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3dfaa098-779f-42fd-a017-763d9377e188', 'learning_object_translations', 'zh.example_translation', example_translation, $q$六点对我来说可以。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '3dfaa098-779f-42fd-a017-763d9377e188' and native_language = 'zh' and example_translation is distinct from $q$六点对我来说可以。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$六点对我来说可以。$q$, updated_at = now() where learning_object_id = '3dfaa098-779f-42fd-a017-763d9377e188' and native_language = 'zh' and example_translation is distinct from $q$六点对我来说可以。$q$ and coalesce(example_translation, '') <> '';

-- 6ad125b4-f420-44d5-be04-d622ad1a801e: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6ad125b4-f420-44d5-be04-d622ad1a801e', 'learning_objects', 'example_zh', example_zh, $q$哦，你要关窗啊？那这里面穿堂风就会小一点。我们可以稍后再谈。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '6ad125b4-f420-44d5-be04-d622ad1a801e' and example_zh is distinct from $q$哦，你要关窗啊？那这里面穿堂风就会小一点。我们可以稍后再谈。$q$ and true;
update public.learning_objects set example_zh = $q$哦，你要关窗啊？那这里面穿堂风就会小一点。我们可以稍后再谈。$q$, updated_at = now() where id = '6ad125b4-f420-44d5-be04-d622ad1a801e' and example_zh is distinct from $q$哦，你要关窗啊？那这里面穿堂风就会小一点。我们可以稍后再谈。$q$ and true;

-- 6ad125b4-f420-44d5-be04-d622ad1a801e: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6ad125b4-f420-44d5-be04-d622ad1a801e', 'learning_object_translations', 'zh.example_translation', example_translation, $q$哦，你要关窗啊？那这里面穿堂风就会小一点。我们可以稍后再谈。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '6ad125b4-f420-44d5-be04-d622ad1a801e' and native_language = 'zh' and example_translation is distinct from $q$哦，你要关窗啊？那这里面穿堂风就会小一点。我们可以稍后再谈。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$哦，你要关窗啊？那这里面穿堂风就会小一点。我们可以稍后再谈。$q$, updated_at = now() where learning_object_id = '6ad125b4-f420-44d5-be04-d622ad1a801e' and native_language = 'zh' and example_translation is distinct from $q$哦，你要关窗啊？那这里面穿堂风就会小一点。我们可以稍后再谈。$q$ and coalesce(example_translation, '') <> '';

-- 002d6f7b-5ef2-49ec-a0a1-442842ba4ec9: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '002d6f7b-5ef2-49ec-a0a1-442842ba4ec9', 'learning_objects', 'example_zh', example_zh, $q$你在开玩笑吗？这听起来也太离谱了。你是在开玩笑还是认真的？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '002d6f7b-5ef2-49ec-a0a1-442842ba4ec9' and example_zh is distinct from $q$你在开玩笑吗？这听起来也太离谱了。你是在开玩笑还是认真的？$q$ and true;
update public.learning_objects set example_zh = $q$你在开玩笑吗？这听起来也太离谱了。你是在开玩笑还是认真的？$q$, updated_at = now() where id = '002d6f7b-5ef2-49ec-a0a1-442842ba4ec9' and example_zh is distinct from $q$你在开玩笑吗？这听起来也太离谱了。你是在开玩笑还是认真的？$q$ and true;

-- 002d6f7b-5ef2-49ec-a0a1-442842ba4ec9: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '002d6f7b-5ef2-49ec-a0a1-442842ba4ec9', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你在开玩笑吗？这听起来也太离谱了。你是在开玩笑还是认真的？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '002d6f7b-5ef2-49ec-a0a1-442842ba4ec9' and native_language = 'zh' and example_translation is distinct from $q$你在开玩笑吗？这听起来也太离谱了。你是在开玩笑还是认真的？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你在开玩笑吗？这听起来也太离谱了。你是在开玩笑还是认真的？$q$, updated_at = now() where learning_object_id = '002d6f7b-5ef2-49ec-a0a1-442842ba4ec9' and native_language = 'zh' and example_translation is distinct from $q$你在开玩笑吗？这听起来也太离谱了。你是在开玩笑还是认真的？$q$ and coalesce(example_translation, '') <> '';

-- 0f29bcad-a9ec-437c-93bc-35f9342c8d8c: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0f29bcad-a9ec-437c-93bc-35f9342c8d8c', 'learning_objects', 'example_zh', example_zh, $q$你们这房子花了多少钱？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '0f29bcad-a9ec-437c-93bc-35f9342c8d8c' and example_zh is distinct from $q$你们这房子花了多少钱？$q$ and true;
update public.learning_objects set example_zh = $q$你们这房子花了多少钱？$q$, updated_at = now() where id = '0f29bcad-a9ec-437c-93bc-35f9342c8d8c' and example_zh is distinct from $q$你们这房子花了多少钱？$q$ and true;

-- 0f29bcad-a9ec-437c-93bc-35f9342c8d8c: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0f29bcad-a9ec-437c-93bc-35f9342c8d8c', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你们这房子花了多少钱？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '0f29bcad-a9ec-437c-93bc-35f9342c8d8c' and native_language = 'zh' and example_translation is distinct from $q$你们这房子花了多少钱？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你们这房子花了多少钱？$q$, updated_at = now() where learning_object_id = '0f29bcad-a9ec-437c-93bc-35f9342c8d8c' and native_language = 'zh' and example_translation is distinct from $q$你们这房子花了多少钱？$q$ and coalesce(example_translation, '') <> '';

-- 4812d24d-0164-4c5c-bf76-a8b6a7409e7f: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4812d24d-0164-4c5c-bf76-a8b6a7409e7f', 'learning_objects', 'example_sv', example_sv, $q$Har du hört vad Anna gjort? Det är verkligen överraskande. Alla på jobbet pratar om det.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '4812d24d-0164-4c5c-bf76-a8b6a7409e7f' and example_sv is distinct from $q$Har du hört vad Anna gjort? Det är verkligen överraskande. Alla på jobbet pratar om det.$q$ and true;
update public.learning_objects set example_sv = $q$Har du hört vad Anna gjort? Det är verkligen överraskande. Alla på jobbet pratar om det.$q$, updated_at = now() where id = '4812d24d-0164-4c5c-bf76-a8b6a7409e7f' and example_sv is distinct from $q$Har du hört vad Anna gjort? Det är verkligen överraskande. Alla på jobbet pratar om det.$q$ and true;

-- 4812d24d-0164-4c5c-bf76-a8b6a7409e7f: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4812d24d-0164-4c5c-bf76-a8b6a7409e7f', 'learning_objects', 'example_zh', example_zh, $q$你听说安娜做了什么吗？这真的很让人惊讶。单位里所有人都在谈这件事。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '4812d24d-0164-4c5c-bf76-a8b6a7409e7f' and example_zh is distinct from $q$你听说安娜做了什么吗？这真的很让人惊讶。单位里所有人都在谈这件事。$q$ and true;
update public.learning_objects set example_zh = $q$你听说安娜做了什么吗？这真的很让人惊讶。单位里所有人都在谈这件事。$q$, updated_at = now() where id = '4812d24d-0164-4c5c-bf76-a8b6a7409e7f' and example_zh is distinct from $q$你听说安娜做了什么吗？这真的很让人惊讶。单位里所有人都在谈这件事。$q$ and true;

-- 4812d24d-0164-4c5c-bf76-a8b6a7409e7f: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4812d24d-0164-4c5c-bf76-a8b6a7409e7f', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你听说安娜做了什么吗？这真的很让人惊讶。单位里所有人都在谈这件事。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '4812d24d-0164-4c5c-bf76-a8b6a7409e7f' and native_language = 'zh' and example_translation is distinct from $q$你听说安娜做了什么吗？这真的很让人惊讶。单位里所有人都在谈这件事。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你听说安娜做了什么吗？这真的很让人惊讶。单位里所有人都在谈这件事。$q$, updated_at = now() where learning_object_id = '4812d24d-0164-4c5c-bf76-a8b6a7409e7f' and native_language = 'zh' and example_translation is distinct from $q$你听说安娜做了什么吗？这真的很让人惊讶。单位里所有人都在谈这件事。$q$ and coalesce(example_translation, '') <> '';

-- 4812d24d-0164-4c5c-bf76-a8b6a7409e7f: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4812d24d-0164-4c5c-bf76-a8b6a7409e7f', 'learning_object_translations', 'en.example_translation', example_translation, $q$Have you heard what Anna has done? It's really surprising. Everyone at work is talking about it.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '4812d24d-0164-4c5c-bf76-a8b6a7409e7f' and native_language = 'en' and example_translation is distinct from $q$Have you heard what Anna has done? It's really surprising. Everyone at work is talking about it.$q$ and true;
update public.learning_object_translations set example_translation = $q$Have you heard what Anna has done? It's really surprising. Everyone at work is talking about it.$q$, updated_at = now() where learning_object_id = '4812d24d-0164-4c5c-bf76-a8b6a7409e7f' and native_language = 'en' and example_translation is distinct from $q$Have you heard what Anna has done? It's really surprising. Everyone at work is talking about it.$q$ and true;

-- 4f24a4bb-c500-4b2a-b59c-d832413b53fb: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4f24a4bb-c500-4b2a-b59c-d832413b53fb', 'learning_objects', 'example_zh', example_zh, $q$我很累。工作上事情很多。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '4f24a4bb-c500-4b2a-b59c-d832413b53fb' and example_zh is distinct from $q$我很累。工作上事情很多。$q$ and true;
update public.learning_objects set example_zh = $q$我很累。工作上事情很多。$q$, updated_at = now() where id = '4f24a4bb-c500-4b2a-b59c-d832413b53fb' and example_zh is distinct from $q$我很累。工作上事情很多。$q$ and true;

-- 4f24a4bb-c500-4b2a-b59c-d832413b53fb: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4f24a4bb-c500-4b2a-b59c-d832413b53fb', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我很累。工作上事情很多。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '4f24a4bb-c500-4b2a-b59c-d832413b53fb' and native_language = 'zh' and example_translation is distinct from $q$我很累。工作上事情很多。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我很累。工作上事情很多。$q$, updated_at = now() where learning_object_id = '4f24a4bb-c500-4b2a-b59c-d832413b53fb' and native_language = 'zh' and example_translation is distinct from $q$我很累。工作上事情很多。$q$ and coalesce(example_translation, '') <> '';

-- 5aac48be-5bf0-4bf5-b20c-c9d4020242e0: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5aac48be-5bf0-4bf5-b20c-c9d4020242e0', 'learning_objects', 'example_zh', example_zh, $q$气温降到了零下十度。销售额已经降到了一个很低的水平。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '5aac48be-5bf0-4bf5-b20c-c9d4020242e0' and example_zh is distinct from $q$气温降到了零下十度。销售额已经降到了一个很低的水平。$q$ and true;
update public.learning_objects set example_zh = $q$气温降到了零下十度。销售额已经降到了一个很低的水平。$q$, updated_at = now() where id = '5aac48be-5bf0-4bf5-b20c-c9d4020242e0' and example_zh is distinct from $q$气温降到了零下十度。销售额已经降到了一个很低的水平。$q$ and true;

-- 5aac48be-5bf0-4bf5-b20c-c9d4020242e0: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5aac48be-5bf0-4bf5-b20c-c9d4020242e0', 'learning_object_translations', 'zh.example_translation', example_translation, $q$气温降到了零下十度。销售额已经降到了一个很低的水平。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '5aac48be-5bf0-4bf5-b20c-c9d4020242e0' and native_language = 'zh' and example_translation is distinct from $q$气温降到了零下十度。销售额已经降到了一个很低的水平。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$气温降到了零下十度。销售额已经降到了一个很低的水平。$q$, updated_at = now() where learning_object_id = '5aac48be-5bf0-4bf5-b20c-c9d4020242e0' and native_language = 'zh' and example_translation is distinct from $q$气温降到了零下十度。销售额已经降到了一个很低的水平。$q$ and coalesce(example_translation, '') <> '';

-- 61bd603d-b8d8-4497-8fc7-b66553152631: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '61bd603d-b8d8-4497-8fc7-b66553152631', 'learning_objects', 'example_zh', example_zh, $q$你有时间的时候尽快联系我。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '61bd603d-b8d8-4497-8fc7-b66553152631' and example_zh is distinct from $q$你有时间的时候尽快联系我。$q$ and true;
update public.learning_objects set example_zh = $q$你有时间的时候尽快联系我。$q$, updated_at = now() where id = '61bd603d-b8d8-4497-8fc7-b66553152631' and example_zh is distinct from $q$你有时间的时候尽快联系我。$q$ and true;

-- 61bd603d-b8d8-4497-8fc7-b66553152631: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '61bd603d-b8d8-4497-8fc7-b66553152631', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你有时间的时候尽快联系我。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '61bd603d-b8d8-4497-8fc7-b66553152631' and native_language = 'zh' and example_translation is distinct from $q$你有时间的时候尽快联系我。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你有时间的时候尽快联系我。$q$, updated_at = now() where learning_object_id = '61bd603d-b8d8-4497-8fc7-b66553152631' and native_language = 'zh' and example_translation is distinct from $q$你有时间的时候尽快联系我。$q$ and coalesce(example_translation, '') <> '';

-- 61bd603d-b8d8-4497-8fc7-b66553152631: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '61bd603d-b8d8-4497-8fc7-b66553152631', 'learning_object_translations', 'en.example_translation', example_translation, $q$Get in touch soon when you have time.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '61bd603d-b8d8-4497-8fc7-b66553152631' and native_language = 'en' and example_translation is distinct from $q$Get in touch soon when you have time.$q$ and true;
update public.learning_object_translations set example_translation = $q$Get in touch soon when you have time.$q$, updated_at = now() where learning_object_id = '61bd603d-b8d8-4497-8fc7-b66553152631' and native_language = 'en' and example_translation is distinct from $q$Get in touch soon when you have time.$q$ and true;

-- 64345025-b81b-4f51-8c91-1ea1409dca49: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '64345025-b81b-4f51-8c91-1ea1409dca49', 'learning_objects', 'example_zh', example_zh, $q$谢谢今天的一切。希望我们很快再见！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '64345025-b81b-4f51-8c91-1ea1409dca49' and example_zh is distinct from $q$谢谢今天的一切。希望我们很快再见！$q$ and true;
update public.learning_objects set example_zh = $q$谢谢今天的一切。希望我们很快再见！$q$, updated_at = now() where id = '64345025-b81b-4f51-8c91-1ea1409dca49' and example_zh is distinct from $q$谢谢今天的一切。希望我们很快再见！$q$ and true;

-- 64345025-b81b-4f51-8c91-1ea1409dca49: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '64345025-b81b-4f51-8c91-1ea1409dca49', 'learning_object_translations', 'zh.example_translation', example_translation, $q$谢谢今天的一切。希望我们很快再见！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '64345025-b81b-4f51-8c91-1ea1409dca49' and native_language = 'zh' and example_translation is distinct from $q$谢谢今天的一切。希望我们很快再见！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$谢谢今天的一切。希望我们很快再见！$q$, updated_at = now() where learning_object_id = '64345025-b81b-4f51-8c91-1ea1409dca49' and native_language = 'zh' and example_translation is distinct from $q$谢谢今天的一切。希望我们很快再见！$q$ and coalesce(example_translation, '') <> '';

-- 82f18256-cbe0-4b58-96d8-df1ceff002f6: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '82f18256-cbe0-4b58-96d8-df1ceff002f6', 'learning_object_examples', 'insert', null, $q$Du kommer inte att tro dina öron när du hör nyheten.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '82f18256-cbe0-4b58-96d8-df1ceff002f6' and example_swedish = $q$Du kommer inte att tro dina öron när du hör nyheten.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '82f18256-cbe0-4b58-96d8-df1ceff002f6', $q$Du kommer inte att tro dina öron när du hör nyheten.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '82f18256-cbe0-4b58-96d8-df1ceff002f6' and example_swedish = $q$Du kommer inte att tro dina öron när du hör nyheten.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$当你听到这个消息时，你会不敢相信自己的耳朵。$q$ from x union all select id, 'en', $q$You won’t believe your ears when you hear the news.$q$ from x;

-- 82f18256-cbe0-4b58-96d8-df1ceff002f6: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '82f18256-cbe0-4b58-96d8-df1ceff002f6', 'learning_object_examples', 'insert', null, $q$Jag berättade allt och du kommer inte att tro dina öron!$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '82f18256-cbe0-4b58-96d8-df1ceff002f6' and example_swedish = $q$Jag berättade allt och du kommer inte att tro dina öron!$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '82f18256-cbe0-4b58-96d8-df1ceff002f6', $q$Jag berättade allt och du kommer inte att tro dina öron!$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '82f18256-cbe0-4b58-96d8-df1ceff002f6' and example_swedish = $q$Jag berättade allt och du kommer inte att tro dina öron!$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$我把一切都说了，你绝对不敢相信自己的耳朵！$q$ from x union all select id, 'en', $q$I told everything, and you won't believe your ears!$q$ from x;

-- 97a1593c-952b-4367-905f-e2f7d1211d35: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '97a1593c-952b-4367-905f-e2f7d1211d35', 'learning_objects', 'example_zh', example_zh, $q$是不是跟老师谈一谈会更好？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '97a1593c-952b-4367-905f-e2f7d1211d35' and example_zh is distinct from $q$是不是跟老师谈一谈会更好？$q$ and true;
update public.learning_objects set example_zh = $q$是不是跟老师谈一谈会更好？$q$, updated_at = now() where id = '97a1593c-952b-4367-905f-e2f7d1211d35' and example_zh is distinct from $q$是不是跟老师谈一谈会更好？$q$ and true;

-- 97a1593c-952b-4367-905f-e2f7d1211d35: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '97a1593c-952b-4367-905f-e2f7d1211d35', 'learning_object_translations', 'zh.example_translation', example_translation, $q$是不是跟老师谈一谈会更好？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '97a1593c-952b-4367-905f-e2f7d1211d35' and native_language = 'zh' and example_translation is distinct from $q$是不是跟老师谈一谈会更好？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$是不是跟老师谈一谈会更好？$q$, updated_at = now() where learning_object_id = '97a1593c-952b-4367-905f-e2f7d1211d35' and native_language = 'zh' and example_translation is distinct from $q$是不是跟老师谈一谈会更好？$q$ and coalesce(example_translation, '') <> '';

-- be2c8ffb-376b-4827-b09a-189be47a2cf3: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'be2c8ffb-376b-4827-b09a-189be47a2cf3', 'learning_objects', 'example_zh', example_zh, $q$你能帮我吗？当然可以！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'be2c8ffb-376b-4827-b09a-189be47a2cf3' and example_zh is distinct from $q$你能帮我吗？当然可以！$q$ and true;
update public.learning_objects set example_zh = $q$你能帮我吗？当然可以！$q$, updated_at = now() where id = 'be2c8ffb-376b-4827-b09a-189be47a2cf3' and example_zh is distinct from $q$你能帮我吗？当然可以！$q$ and true;

-- be2c8ffb-376b-4827-b09a-189be47a2cf3: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'be2c8ffb-376b-4827-b09a-189be47a2cf3', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你能帮我吗？当然可以！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'be2c8ffb-376b-4827-b09a-189be47a2cf3' and native_language = 'zh' and example_translation is distinct from $q$你能帮我吗？当然可以！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你能帮我吗？当然可以！$q$, updated_at = now() where learning_object_id = 'be2c8ffb-376b-4827-b09a-189be47a2cf3' and native_language = 'zh' and example_translation is distinct from $q$你能帮我吗？当然可以！$q$ and coalesce(example_translation, '') <> '';

-- 1418bae7-4e8a-45d8-8f00-2dcc68e68e87: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1418bae7-4e8a-45d8-8f00-2dcc68e68e87', 'learning_objects', 'example_zh', example_zh, $q$教育能帮助人们获得工作。因此，很多人寻找不同的课程来增强自己在就业市场上的机会。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '1418bae7-4e8a-45d8-8f00-2dcc68e68e87' and example_zh is distinct from $q$教育能帮助人们获得工作。因此，很多人寻找不同的课程来增强自己在就业市场上的机会。$q$ and true;
update public.learning_objects set example_zh = $q$教育能帮助人们获得工作。因此，很多人寻找不同的课程来增强自己在就业市场上的机会。$q$, updated_at = now() where id = '1418bae7-4e8a-45d8-8f00-2dcc68e68e87' and example_zh is distinct from $q$教育能帮助人们获得工作。因此，很多人寻找不同的课程来增强自己在就业市场上的机会。$q$ and true;

-- 1418bae7-4e8a-45d8-8f00-2dcc68e68e87: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1418bae7-4e8a-45d8-8f00-2dcc68e68e87', 'learning_object_translations', 'zh.example_translation', example_translation, $q$教育能帮助人们获得工作。因此，很多人寻找不同的课程来增强自己在就业市场上的机会。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '1418bae7-4e8a-45d8-8f00-2dcc68e68e87' and native_language = 'zh' and example_translation is distinct from $q$教育能帮助人们获得工作。因此，很多人寻找不同的课程来增强自己在就业市场上的机会。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$教育能帮助人们获得工作。因此，很多人寻找不同的课程来增强自己在就业市场上的机会。$q$, updated_at = now() where learning_object_id = '1418bae7-4e8a-45d8-8f00-2dcc68e68e87' and native_language = 'zh' and example_translation is distinct from $q$教育能帮助人们获得工作。因此，很多人寻找不同的课程来增强自己在就业市场上的机会。$q$ and coalesce(example_translation, '') <> '';

-- 0a3b6502-a262-40aa-b685-53485e6b0607: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0a3b6502-a262-40aa-b685-53485e6b0607', 'learning_object_examples', 'insert', null, $q$Jo, det är sant! Jag såg det själv.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '0a3b6502-a262-40aa-b685-53485e6b0607' and example_swedish = $q$Jo, det är sant! Jag såg det själv.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '0a3b6502-a262-40aa-b685-53485e6b0607', $q$Jo, det är sant! Jag såg det själv.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '0a3b6502-a262-40aa-b685-53485e6b0607' and example_swedish = $q$Jo, det är sant! Jag såg det själv.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$对，是真的！我亲眼看见了。$q$ from x union all select id, 'en', $q$Yes, it’s true! I saw it myself.$q$ from x;

-- 0a3b6502-a262-40aa-b685-53485e6b0607: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0a3b6502-a262-40aa-b685-53485e6b0607', 'learning_object_examples', 'insert', null, $q$Du tror mig inte, men jo, det är sant!$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '0a3b6502-a262-40aa-b685-53485e6b0607' and example_swedish = $q$Du tror mig inte, men jo, det är sant!$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '0a3b6502-a262-40aa-b685-53485e6b0607', $q$Du tror mig inte, men jo, det är sant!$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '0a3b6502-a262-40aa-b685-53485e6b0607' and example_swedish = $q$Du tror mig inte, men jo, det är sant!$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$你不相信我，可这是真的！$q$ from x union all select id, 'en', $q$You don't believe me, but yes, it's true!$q$ from x;

-- 0c804dff-ae6e-4337-adb3-c3502828fce8: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0c804dff-ae6e-4337-adb3-c3502828fce8', 'learning_objects', 'example_zh', example_zh, $q$听起来不错。我们就要这个。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '0c804dff-ae6e-4337-adb3-c3502828fce8' and example_zh is distinct from $q$听起来不错。我们就要这个。$q$ and true;
update public.learning_objects set example_zh = $q$听起来不错。我们就要这个。$q$, updated_at = now() where id = '0c804dff-ae6e-4337-adb3-c3502828fce8' and example_zh is distinct from $q$听起来不错。我们就要这个。$q$ and true;

-- 0c804dff-ae6e-4337-adb3-c3502828fce8: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0c804dff-ae6e-4337-adb3-c3502828fce8', 'learning_object_translations', 'zh.example_translation', example_translation, $q$听起来不错。我们就要这个。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '0c804dff-ae6e-4337-adb3-c3502828fce8' and native_language = 'zh' and example_translation is distinct from $q$听起来不错。我们就要这个。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$听起来不错。我们就要这个。$q$, updated_at = now() where learning_object_id = '0c804dff-ae6e-4337-adb3-c3502828fce8' and native_language = 'zh' and example_translation is distinct from $q$听起来不错。我们就要这个。$q$ and coalesce(example_translation, '') <> '';

-- 0e0b6b20-f886-49a6-aff9-c9d20fb47342: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0e0b6b20-f886-49a6-aff9-c9d20fb47342', 'learning_objects', 'example_sv', example_sv, $q$Vad hände igår på mötet? Jag glömde allt och undrar vad som hände igår.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '0e0b6b20-f886-49a6-aff9-c9d20fb47342' and example_sv is distinct from $q$Vad hände igår på mötet? Jag glömde allt och undrar vad som hände igår.$q$ and true;
update public.learning_objects set example_sv = $q$Vad hände igår på mötet? Jag glömde allt och undrar vad som hände igår.$q$, updated_at = now() where id = '0e0b6b20-f886-49a6-aff9-c9d20fb47342' and example_sv is distinct from $q$Vad hände igår på mötet? Jag glömde allt och undrar vad som hände igår.$q$ and true;

-- 0e0b6b20-f886-49a6-aff9-c9d20fb47342: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0e0b6b20-f886-49a6-aff9-c9d20fb47342', 'learning_objects', 'example_zh', example_zh, $q$昨天会议上发生了什么？我全忘了，想知道昨天发生了什么。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '0e0b6b20-f886-49a6-aff9-c9d20fb47342' and example_zh is distinct from $q$昨天会议上发生了什么？我全忘了，想知道昨天发生了什么。$q$ and true;
update public.learning_objects set example_zh = $q$昨天会议上发生了什么？我全忘了，想知道昨天发生了什么。$q$, updated_at = now() where id = '0e0b6b20-f886-49a6-aff9-c9d20fb47342' and example_zh is distinct from $q$昨天会议上发生了什么？我全忘了，想知道昨天发生了什么。$q$ and true;

-- 0e0b6b20-f886-49a6-aff9-c9d20fb47342: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0e0b6b20-f886-49a6-aff9-c9d20fb47342', 'learning_object_translations', 'zh.example_translation', example_translation, $q$昨天会议上发生了什么？我全忘了，想知道昨天发生了什么。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '0e0b6b20-f886-49a6-aff9-c9d20fb47342' and native_language = 'zh' and example_translation is distinct from $q$昨天会议上发生了什么？我全忘了，想知道昨天发生了什么。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$昨天会议上发生了什么？我全忘了，想知道昨天发生了什么。$q$, updated_at = now() where learning_object_id = '0e0b6b20-f886-49a6-aff9-c9d20fb47342' and native_language = 'zh' and example_translation is distinct from $q$昨天会议上发生了什么？我全忘了，想知道昨天发生了什么。$q$ and coalesce(example_translation, '') <> '';

-- 0e0b6b20-f886-49a6-aff9-c9d20fb47342: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0e0b6b20-f886-49a6-aff9-c9d20fb47342', 'learning_object_translations', 'en.example_translation', example_translation, $q$What happened yesterday at the meeting? I forgot everything and wonder what happened yesterday.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '0e0b6b20-f886-49a6-aff9-c9d20fb47342' and native_language = 'en' and example_translation is distinct from $q$What happened yesterday at the meeting? I forgot everything and wonder what happened yesterday.$q$ and true;
update public.learning_object_translations set example_translation = $q$What happened yesterday at the meeting? I forgot everything and wonder what happened yesterday.$q$, updated_at = now() where learning_object_id = '0e0b6b20-f886-49a6-aff9-c9d20fb47342' and native_language = 'en' and example_translation is distinct from $q$What happened yesterday at the meeting? I forgot everything and wonder what happened yesterday.$q$ and true;

-- Menar du det? You mean it?: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0e8a39c3-0cd4-434f-99f8-de0091a12498', 'learning_objects', 'swedish', swedish, $q$Menar du det?$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '0e8a39c3-0cd4-434f-99f8-de0091a12498' and swedish is distinct from $q$Menar du det?$q$;
update public.learning_objects set swedish = $q$Menar du det?$q$, updated_at = now() where id = '0e8a39c3-0cd4-434f-99f8-de0091a12498' and swedish is distinct from $q$Menar du det?$q$;

-- Menar du det? You mean it?: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0e8a39c3-0cd4-434f-99f8-de0091a12498', 'learning_objects', 'match_key', match_key, $q$menar du det ?$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '0e8a39c3-0cd4-434f-99f8-de0091a12498' and match_key is distinct from $q$menar du det ?$q$;
update public.learning_objects set match_key = $q$menar du det ?$q$, updated_at = now() where id = '0e8a39c3-0cd4-434f-99f8-de0091a12498' and match_key is distinct from $q$menar du det ?$q$;

-- 0e8a39c3-0cd4-434f-99f8-de0091a12498: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0e8a39c3-0cd4-434f-99f8-de0091a12498', 'learning_objects', 'example_zh', example_zh, $q$你是说真的吗？这听起来太棒了。你是认真的吗，还是在开玩笑？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '0e8a39c3-0cd4-434f-99f8-de0091a12498' and example_zh is distinct from $q$你是说真的吗？这听起来太棒了。你是认真的吗，还是在开玩笑？$q$ and true;
update public.learning_objects set example_zh = $q$你是说真的吗？这听起来太棒了。你是认真的吗，还是在开玩笑？$q$, updated_at = now() where id = '0e8a39c3-0cd4-434f-99f8-de0091a12498' and example_zh is distinct from $q$你是说真的吗？这听起来太棒了。你是认真的吗，还是在开玩笑？$q$ and true;

-- 0e8a39c3-0cd4-434f-99f8-de0091a12498: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0e8a39c3-0cd4-434f-99f8-de0091a12498', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你是说真的吗？这听起来太棒了。你是认真的吗，还是在开玩笑？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '0e8a39c3-0cd4-434f-99f8-de0091a12498' and native_language = 'zh' and example_translation is distinct from $q$你是说真的吗？这听起来太棒了。你是认真的吗，还是在开玩笑？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你是说真的吗？这听起来太棒了。你是认真的吗，还是在开玩笑？$q$, updated_at = now() where learning_object_id = '0e8a39c3-0cd4-434f-99f8-de0091a12498' and native_language = 'zh' and example_translation is distinct from $q$你是说真的吗？这听起来太棒了。你是认真的吗，还是在开玩笑？$q$ and coalesce(example_translation, '') <> '';

-- 0f3f783f-06b5-4df1-b0ae-19323ccb3445: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0f3f783f-06b5-4df1-b0ae-19323ccb3445', 'learning_objects', 'example_zh', example_zh, $q$你平时周五会放松享受一下吗？你通常是在家里舒服地待着，还是出去？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '0f3f783f-06b5-4df1-b0ae-19323ccb3445' and example_zh is distinct from $q$你平时周五会放松享受一下吗？你通常是在家里舒服地待着，还是出去？$q$ and true;
update public.learning_objects set example_zh = $q$你平时周五会放松享受一下吗？你通常是在家里舒服地待着，还是出去？$q$, updated_at = now() where id = '0f3f783f-06b5-4df1-b0ae-19323ccb3445' and example_zh is distinct from $q$你平时周五会放松享受一下吗？你通常是在家里舒服地待着，还是出去？$q$ and true;

-- 0f3f783f-06b5-4df1-b0ae-19323ccb3445: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0f3f783f-06b5-4df1-b0ae-19323ccb3445', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你平时周五会放松享受一下吗？你通常是在家里舒服地待着，还是出去？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '0f3f783f-06b5-4df1-b0ae-19323ccb3445' and native_language = 'zh' and example_translation is distinct from $q$你平时周五会放松享受一下吗？你通常是在家里舒服地待着，还是出去？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你平时周五会放松享受一下吗？你通常是在家里舒服地待着，还是出去？$q$, updated_at = now() where learning_object_id = '0f3f783f-06b5-4df1-b0ae-19323ccb3445' and native_language = 'zh' and example_translation is distinct from $q$你平时周五会放松享受一下吗？你通常是在家里舒服地待着，还是出去？$q$ and coalesce(example_translation, '') <> '';

-- 0fd468be-241b-4773-a5bd-fa3bc3e17da0: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0fd468be-241b-4773-a5bd-fa3bc3e17da0', 'learning_object_examples', 'insert', null, $q$Aj då, det låter inte bra.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '0fd468be-241b-4773-a5bd-fa3bc3e17da0' and example_swedish = $q$Aj då, det låter inte bra.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '0fd468be-241b-4773-a5bd-fa3bc3e17da0', $q$Aj då, det låter inte bra.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '0fd468be-241b-4773-a5bd-fa3bc3e17da0' and example_swedish = $q$Aj då, det låter inte bra.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$哎呀，听起来不太好。$q$ from x union all select id, 'en', $q$Oh no, that doesn’t sound good.$q$ from x;

-- 0fd468be-241b-4773-a5bd-fa3bc3e17da0: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0fd468be-241b-4773-a5bd-fa3bc3e17da0', 'learning_object_examples', 'insert', null, $q$Aj då, jag tappade nycklarna.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '0fd468be-241b-4773-a5bd-fa3bc3e17da0' and example_swedish = $q$Aj då, jag tappade nycklarna.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '0fd468be-241b-4773-a5bd-fa3bc3e17da0', $q$Aj då, jag tappade nycklarna.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '0fd468be-241b-4773-a5bd-fa3bc3e17da0' and example_swedish = $q$Aj då, jag tappade nycklarna.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$哎呀，我把钥匙掉了。$q$ from x union all select id, 'en', $q$Oops, I dropped my keys.$q$ from x;

-- 12fb0e22-4018-40f6-9350-5f5a3a301bf4: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '12fb0e22-4018-40f6-9350-5f5a3a301bf4', 'learning_objects', 'example_zh', example_zh, $q$它讲什么？我还没看过这部电影。这本书很好，但它到底讲什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '12fb0e22-4018-40f6-9350-5f5a3a301bf4' and example_zh is distinct from $q$它讲什么？我还没看过这部电影。这本书很好，但它到底讲什么？$q$ and true;
update public.learning_objects set example_zh = $q$它讲什么？我还没看过这部电影。这本书很好，但它到底讲什么？$q$, updated_at = now() where id = '12fb0e22-4018-40f6-9350-5f5a3a301bf4' and example_zh is distinct from $q$它讲什么？我还没看过这部电影。这本书很好，但它到底讲什么？$q$ and true;

-- 12fb0e22-4018-40f6-9350-5f5a3a301bf4: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '12fb0e22-4018-40f6-9350-5f5a3a301bf4', 'learning_object_translations', 'zh.example_translation', example_translation, $q$它讲什么？我还没看过这部电影。这本书很好，但它到底讲什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '12fb0e22-4018-40f6-9350-5f5a3a301bf4' and native_language = 'zh' and example_translation is distinct from $q$它讲什么？我还没看过这部电影。这本书很好，但它到底讲什么？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$它讲什么？我还没看过这部电影。这本书很好，但它到底讲什么？$q$, updated_at = now() where learning_object_id = '12fb0e22-4018-40f6-9350-5f5a3a301bf4' and native_language = 'zh' and example_translation is distinct from $q$它讲什么？我还没看过这部电影。这本书很好，但它到底讲什么？$q$ and coalesce(example_translation, '') <> '';

-- 131d7cd1-a25a-4d57-ab38-29e5ad62bd9f: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '131d7cd1-a25a-4d57-ab38-29e5ad62bd9f', 'learning_objects', 'example_zh', example_zh, $q$下班后我们去喝杯咖啡/吃点点心吧？打个招呼，去 fika 一下会很不错。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '131d7cd1-a25a-4d57-ab38-29e5ad62bd9f' and example_zh is distinct from $q$下班后我们去喝杯咖啡/吃点点心吧？打个招呼，去 fika 一下会很不错。$q$ and true;
update public.learning_objects set example_zh = $q$下班后我们去喝杯咖啡/吃点点心吧？打个招呼，去 fika 一下会很不错。$q$, updated_at = now() where id = '131d7cd1-a25a-4d57-ab38-29e5ad62bd9f' and example_zh is distinct from $q$下班后我们去喝杯咖啡/吃点点心吧？打个招呼，去 fika 一下会很不错。$q$ and true;

-- 131d7cd1-a25a-4d57-ab38-29e5ad62bd9f: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '131d7cd1-a25a-4d57-ab38-29e5ad62bd9f', 'learning_object_translations', 'zh.example_translation', example_translation, $q$下班后我们去喝杯咖啡/吃点点心吧？打个招呼，去 fika 一下会很不错。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '131d7cd1-a25a-4d57-ab38-29e5ad62bd9f' and native_language = 'zh' and example_translation is distinct from $q$下班后我们去喝杯咖啡/吃点点心吧？打个招呼，去 fika 一下会很不错。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$下班后我们去喝杯咖啡/吃点点心吧？打个招呼，去 fika 一下会很不错。$q$, updated_at = now() where learning_object_id = '131d7cd1-a25a-4d57-ab38-29e5ad62bd9f' and native_language = 'zh' and example_translation is distinct from $q$下班后我们去喝杯咖啡/吃点点心吧？打个招呼，去 fika 一下会很不错。$q$ and coalesce(example_translation, '') <> '';

-- 12b0b50d-ec13-402f-ab79-b260dbeaa68f: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '12b0b50d-ec13-402f-ab79-b260dbeaa68f', 'learning_objects', 'example_zh', example_zh, $q$现在几点？六点半。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '12b0b50d-ec13-402f-ab79-b260dbeaa68f' and example_zh is distinct from $q$现在几点？六点半。$q$ and true;
update public.learning_objects set example_zh = $q$现在几点？六点半。$q$, updated_at = now() where id = '12b0b50d-ec13-402f-ab79-b260dbeaa68f' and example_zh is distinct from $q$现在几点？六点半。$q$ and true;

-- 12b0b50d-ec13-402f-ab79-b260dbeaa68f: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '12b0b50d-ec13-402f-ab79-b260dbeaa68f', 'learning_object_translations', 'zh.example_translation', example_translation, $q$现在几点？六点半。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '12b0b50d-ec13-402f-ab79-b260dbeaa68f' and native_language = 'zh' and example_translation is distinct from $q$现在几点？六点半。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$现在几点？六点半。$q$, updated_at = now() where learning_object_id = '12b0b50d-ec13-402f-ab79-b260dbeaa68f' and native_language = 'zh' and example_translation is distinct from $q$现在几点？六点半。$q$ and coalesce(example_translation, '') <> '';

-- 12b0b50d-ec13-402f-ab79-b260dbeaa68f: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '12b0b50d-ec13-402f-ab79-b260dbeaa68f', 'learning_object_translations', 'en.example_translation', example_translation, $q$What time is it? It’s half past six.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '12b0b50d-ec13-402f-ab79-b260dbeaa68f' and native_language = 'en' and example_translation is distinct from $q$What time is it? It’s half past six.$q$ and true;
update public.learning_object_translations set example_translation = $q$What time is it? It’s half past six.$q$, updated_at = now() where learning_object_id = '12b0b50d-ec13-402f-ab79-b260dbeaa68f' and native_language = 'en' and example_translation is distinct from $q$What time is it? It’s half past six.$q$ and true;

-- 341f7809-5bf4-4f54-b02d-c13f5a953fbb: en.meaning
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '341f7809-5bf4-4f54-b02d-c13f5a953fbb', 'learning_object_translations', 'en.meaning', meaning, $q$although; even though$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '341f7809-5bf4-4f54-b02d-c13f5a953fbb' and native_language = 'en' and meaning is distinct from $q$although; even though$q$ and true;
update public.learning_object_translations set meaning = $q$although; even though$q$, updated_at = now() where learning_object_id = '341f7809-5bf4-4f54-b02d-c13f5a953fbb' and native_language = 'en' and meaning is distinct from $q$although; even though$q$ and true;

-- 341f7809-5bf4-4f54-b02d-c13f5a953fbb: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '341f7809-5bf4-4f54-b02d-c13f5a953fbb', 'learning_objects', 'example_zh', example_zh, $q$尽管她很累，她还是去上班了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '341f7809-5bf4-4f54-b02d-c13f5a953fbb' and example_zh is distinct from $q$尽管她很累，她还是去上班了。$q$ and true;
update public.learning_objects set example_zh = $q$尽管她很累，她还是去上班了。$q$, updated_at = now() where id = '341f7809-5bf4-4f54-b02d-c13f5a953fbb' and example_zh is distinct from $q$尽管她很累，她还是去上班了。$q$ and true;

-- 341f7809-5bf4-4f54-b02d-c13f5a953fbb: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '341f7809-5bf4-4f54-b02d-c13f5a953fbb', 'learning_object_translations', 'zh.example_translation', example_translation, $q$尽管她很累，她还是去上班了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '341f7809-5bf4-4f54-b02d-c13f5a953fbb' and native_language = 'zh' and example_translation is distinct from $q$尽管她很累，她还是去上班了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$尽管她很累，她还是去上班了。$q$, updated_at = now() where learning_object_id = '341f7809-5bf4-4f54-b02d-c13f5a953fbb' and native_language = 'zh' and example_translation is distinct from $q$尽管她很累，她还是去上班了。$q$ and coalesce(example_translation, '') <> '';

-- 16ddec18-b304-4f6b-ac10-30a0cf403170: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '16ddec18-b304-4f6b-ac10-30a0cf403170', 'learning_objects', 'example_zh', example_zh, $q$你以前吃过那个吗？没有，我从来没试过。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '16ddec18-b304-4f6b-ac10-30a0cf403170' and example_zh is distinct from $q$你以前吃过那个吗？没有，我从来没试过。$q$ and true;
update public.learning_objects set example_zh = $q$你以前吃过那个吗？没有，我从来没试过。$q$, updated_at = now() where id = '16ddec18-b304-4f6b-ac10-30a0cf403170' and example_zh is distinct from $q$你以前吃过那个吗？没有，我从来没试过。$q$ and true;

-- 16ddec18-b304-4f6b-ac10-30a0cf403170: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '16ddec18-b304-4f6b-ac10-30a0cf403170', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你以前吃过那个吗？没有，我从来没试过。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '16ddec18-b304-4f6b-ac10-30a0cf403170' and native_language = 'zh' and example_translation is distinct from $q$你以前吃过那个吗？没有，我从来没试过。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你以前吃过那个吗？没有，我从来没试过。$q$, updated_at = now() where learning_object_id = '16ddec18-b304-4f6b-ac10-30a0cf403170' and native_language = 'zh' and example_translation is distinct from $q$你以前吃过那个吗？没有，我从来没试过。$q$ and coalesce(example_translation, '') <> '';

-- 1801490b-2128-45da-a51a-29be84571ae8: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1801490b-2128-45da-a51a-29be84571ae8', 'learning_objects', 'example_zh', example_zh, $q$我晚上上移民瑞典语课程（SFI）。SFI 帮助很多人融入社会。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '1801490b-2128-45da-a51a-29be84571ae8' and example_zh is distinct from $q$我晚上上移民瑞典语课程（SFI）。SFI 帮助很多人融入社会。$q$ and true;
update public.learning_objects set example_zh = $q$我晚上上移民瑞典语课程（SFI）。SFI 帮助很多人融入社会。$q$, updated_at = now() where id = '1801490b-2128-45da-a51a-29be84571ae8' and example_zh is distinct from $q$我晚上上移民瑞典语课程（SFI）。SFI 帮助很多人融入社会。$q$ and true;

-- 1801490b-2128-45da-a51a-29be84571ae8: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1801490b-2128-45da-a51a-29be84571ae8', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我晚上上移民瑞典语课程（SFI）。SFI 帮助很多人融入社会。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '1801490b-2128-45da-a51a-29be84571ae8' and native_language = 'zh' and example_translation is distinct from $q$我晚上上移民瑞典语课程（SFI）。SFI 帮助很多人融入社会。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我晚上上移民瑞典语课程（SFI）。SFI 帮助很多人融入社会。$q$, updated_at = now() where learning_object_id = '1801490b-2128-45da-a51a-29be84571ae8' and native_language = 'zh' and example_translation is distinct from $q$我晚上上移民瑞典语课程（SFI）。SFI 帮助很多人融入社会。$q$ and coalesce(example_translation, '') <> '';

-- 197710e2-4d51-4b82-b8a6-87b8c5a863c8: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '197710e2-4d51-4b82-b8a6-87b8c5a863c8', 'learning_objects', 'example_zh', example_zh, $q$你听说他们要搬家了吗？你们听说老师生病了吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '197710e2-4d51-4b82-b8a6-87b8c5a863c8' and example_zh is distinct from $q$你听说他们要搬家了吗？你们听说老师生病了吗？$q$ and true;
update public.learning_objects set example_zh = $q$你听说他们要搬家了吗？你们听说老师生病了吗？$q$, updated_at = now() where id = '197710e2-4d51-4b82-b8a6-87b8c5a863c8' and example_zh is distinct from $q$你听说他们要搬家了吗？你们听说老师生病了吗？$q$ and true;

-- 197710e2-4d51-4b82-b8a6-87b8c5a863c8: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '197710e2-4d51-4b82-b8a6-87b8c5a863c8', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你听说他们要搬家了吗？你们听说老师生病了吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '197710e2-4d51-4b82-b8a6-87b8c5a863c8' and native_language = 'zh' and example_translation is distinct from $q$你听说他们要搬家了吗？你们听说老师生病了吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你听说他们要搬家了吗？你们听说老师生病了吗？$q$, updated_at = now() where learning_object_id = '197710e2-4d51-4b82-b8a6-87b8c5a863c8' and native_language = 'zh' and example_translation is distinct from $q$你听说他们要搬家了吗？你们听说老师生病了吗？$q$ and coalesce(example_translation, '') <> '';

-- 1d6e9b00-9520-4e61-9250-dfc398a939d5: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1d6e9b00-9520-4e61-9250-dfc398a939d5', 'learning_object_examples', 'insert', null, $q$Helt otroligt! Du klarade provet utan att plugga särskilt mycket.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '1d6e9b00-9520-4e61-9250-dfc398a939d5' and example_swedish = $q$Helt otroligt! Du klarade provet utan att plugga särskilt mycket.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '1d6e9b00-9520-4e61-9250-dfc398a939d5', $q$Helt otroligt! Du klarade provet utan att plugga särskilt mycket.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '1d6e9b00-9520-4e61-9250-dfc398a939d5' and example_swedish = $q$Helt otroligt! Du klarade provet utan att plugga särskilt mycket.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$太不可思议了！你没怎么复习就通过了考试。$q$ from x union all select id, 'en', $q$Absolutely incredible! You passed the exam without studying very much.$q$ from x;

-- 1d6e9b00-9520-4e61-9250-dfc398a939d5: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1d6e9b00-9520-4e61-9250-dfc398a939d5', 'learning_object_examples', 'insert', null, $q$Det är helt otroligt att han sprang tio kilometer på så kort tid.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '1d6e9b00-9520-4e61-9250-dfc398a939d5' and example_swedish = $q$Det är helt otroligt att han sprang tio kilometer på så kort tid.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '1d6e9b00-9520-4e61-9250-dfc398a939d5', $q$Det är helt otroligt att han sprang tio kilometer på så kort tid.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '1d6e9b00-9520-4e61-9250-dfc398a939d5' and example_swedish = $q$Det är helt otroligt att han sprang tio kilometer på så kort tid.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$他竟然在这么短的时间内跑了十公里，真是太不可思议了。$q$ from x union all select id, 'en', $q$It’s absolutely incredible that he ran ten kilometers in such a short time.$q$ from x;

-- 20bac7e9-ed0c-4807-a6b2-c51dfca7e8cc: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '20bac7e9-ed0c-4807-a6b2-c51dfca7e8cc', 'learning_objects', 'example_zh', example_zh, $q$你觉得她会准时来吗？你觉得这会很难吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '20bac7e9-ed0c-4807-a6b2-c51dfca7e8cc' and example_zh is distinct from $q$你觉得她会准时来吗？你觉得这会很难吗？$q$ and true;
update public.learning_objects set example_zh = $q$你觉得她会准时来吗？你觉得这会很难吗？$q$, updated_at = now() where id = '20bac7e9-ed0c-4807-a6b2-c51dfca7e8cc' and example_zh is distinct from $q$你觉得她会准时来吗？你觉得这会很难吗？$q$ and true;

-- 20bac7e9-ed0c-4807-a6b2-c51dfca7e8cc: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '20bac7e9-ed0c-4807-a6b2-c51dfca7e8cc', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你觉得她会准时来吗？你觉得这会很难吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '20bac7e9-ed0c-4807-a6b2-c51dfca7e8cc' and native_language = 'zh' and example_translation is distinct from $q$你觉得她会准时来吗？你觉得这会很难吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你觉得她会准时来吗？你觉得这会很难吗？$q$, updated_at = now() where learning_object_id = '20bac7e9-ed0c-4807-a6b2-c51dfca7e8cc' and native_language = 'zh' and example_translation is distinct from $q$你觉得她会准时来吗？你觉得这会很难吗？$q$ and coalesce(example_translation, '') <> '';

-- 220fc4b7-a6a6-4fea-9fb8-0935d8fe8cb8: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '220fc4b7-a6a6-4fea-9fb8-0935d8fe8cb8', 'learning_objects', 'example_zh', example_zh, $q$突然砰的一声，屏幕变黑了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '220fc4b7-a6a6-4fea-9fb8-0935d8fe8cb8' and example_zh is distinct from $q$突然砰的一声，屏幕变黑了。$q$ and true;
update public.learning_objects set example_zh = $q$突然砰的一声，屏幕变黑了。$q$, updated_at = now() where id = '220fc4b7-a6a6-4fea-9fb8-0935d8fe8cb8' and example_zh is distinct from $q$突然砰的一声，屏幕变黑了。$q$ and true;

-- 220fc4b7-a6a6-4fea-9fb8-0935d8fe8cb8: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '220fc4b7-a6a6-4fea-9fb8-0935d8fe8cb8', 'learning_object_translations', 'zh.example_translation', example_translation, $q$突然砰的一声，屏幕变黑了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '220fc4b7-a6a6-4fea-9fb8-0935d8fe8cb8' and native_language = 'zh' and example_translation is distinct from $q$突然砰的一声，屏幕变黑了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$突然砰的一声，屏幕变黑了。$q$, updated_at = now() where learning_object_id = '220fc4b7-a6a6-4fea-9fb8-0935d8fe8cb8' and native_language = 'zh' and example_translation is distinct from $q$突然砰的一声，屏幕变黑了。$q$ and coalesce(example_translation, '') <> '';

-- 595bc0bc-4c91-4154-b354-57d5627bae9a: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '595bc0bc-4c91-4154-b354-57d5627bae9a', 'learning_objects', 'example_zh', example_zh, $q$所有人都有权利和义务。这在民主社会中也是如此。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '595bc0bc-4c91-4154-b354-57d5627bae9a' and example_zh is distinct from $q$所有人都有权利和义务。这在民主社会中也是如此。$q$ and true;
update public.learning_objects set example_zh = $q$所有人都有权利和义务。这在民主社会中也是如此。$q$, updated_at = now() where id = '595bc0bc-4c91-4154-b354-57d5627bae9a' and example_zh is distinct from $q$所有人都有权利和义务。这在民主社会中也是如此。$q$ and true;

-- 595bc0bc-4c91-4154-b354-57d5627bae9a: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '595bc0bc-4c91-4154-b354-57d5627bae9a', 'learning_object_translations', 'zh.example_translation', example_translation, $q$所有人都有权利和义务。这在民主社会中也是如此。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '595bc0bc-4c91-4154-b354-57d5627bae9a' and native_language = 'zh' and example_translation is distinct from $q$所有人都有权利和义务。这在民主社会中也是如此。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$所有人都有权利和义务。这在民主社会中也是如此。$q$, updated_at = now() where learning_object_id = '595bc0bc-4c91-4154-b354-57d5627bae9a' and native_language = 'zh' and example_translation is distinct from $q$所有人都有权利和义务。这在民主社会中也是如此。$q$ and coalesce(example_translation, '') <> '';

-- 23b511da-2aa7-4301-9d39-421ebe54773b: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '23b511da-2aa7-4301-9d39-421ebe54773b', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$fråga efter någon; söka någon$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '23b511da-2aa7-4301-9d39-421ebe54773b' and swedish_explanation is distinct from $q$fråga efter någon; söka någon$q$ and true;
update public.learning_objects set swedish_explanation = $q$fråga efter någon; söka någon$q$, updated_at = now() where id = '23b511da-2aa7-4301-9d39-421ebe54773b' and swedish_explanation is distinct from $q$fråga efter någon; söka någon$q$ and true;

-- 23b511da-2aa7-4301-9d39-421ebe54773b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '23b511da-2aa7-4301-9d39-421ebe54773b', 'learning_objects', 'example_zh', example_zh, $q$刚才有人打电话来。是谁找你？今天早上办公室里有人找你。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '23b511da-2aa7-4301-9d39-421ebe54773b' and example_zh is distinct from $q$刚才有人打电话来。是谁找你？今天早上办公室里有人找你。$q$ and true;
update public.learning_objects set example_zh = $q$刚才有人打电话来。是谁找你？今天早上办公室里有人找你。$q$, updated_at = now() where id = '23b511da-2aa7-4301-9d39-421ebe54773b' and example_zh is distinct from $q$刚才有人打电话来。是谁找你？今天早上办公室里有人找你。$q$ and true;

-- 23b511da-2aa7-4301-9d39-421ebe54773b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '23b511da-2aa7-4301-9d39-421ebe54773b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$刚才有人打电话来。是谁找你？今天早上办公室里有人找你。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '23b511da-2aa7-4301-9d39-421ebe54773b' and native_language = 'zh' and example_translation is distinct from $q$刚才有人打电话来。是谁找你？今天早上办公室里有人找你。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$刚才有人打电话来。是谁找你？今天早上办公室里有人找你。$q$, updated_at = now() where learning_object_id = '23b511da-2aa7-4301-9d39-421ebe54773b' and native_language = 'zh' and example_translation is distinct from $q$刚才有人打电话来。是谁找你？今天早上办公室里有人找你。$q$ and coalesce(example_translation, '') <> '';

-- 259bde50-0658-4ac6-a518-62acc5382954: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '259bde50-0658-4ac6-a518-62acc5382954', 'learning_object_examples', 'insert', null, $q$Hur är det möjligt att han vann igen?$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '259bde50-0658-4ac6-a518-62acc5382954' and example_swedish = $q$Hur är det möjligt att han vann igen?$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '259bde50-0658-4ac6-a518-62acc5382954', $q$Hur är det möjligt att han vann igen?$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '259bde50-0658-4ac6-a518-62acc5382954' and example_swedish = $q$Hur är det möjligt att han vann igen?$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$他竟然又赢了，这怎么可能？$q$ from x union all select id, 'en', $q$How is it possible that he won again?$q$ from x;

-- 259bde50-0658-4ac6-a518-62acc5382954: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '259bde50-0658-4ac6-a518-62acc5382954', 'learning_object_examples', 'insert', null, $q$Hur är detta möjligt när reglerna är så tydliga?$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '259bde50-0658-4ac6-a518-62acc5382954' and example_swedish = $q$Hur är detta möjligt när reglerna är så tydliga?$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '259bde50-0658-4ac6-a518-62acc5382954', $q$Hur är detta möjligt när reglerna är så tydliga?$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '259bde50-0658-4ac6-a518-62acc5382954' and example_swedish = $q$Hur är detta möjligt när reglerna är så tydliga?$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$规则这么明确，这怎么可能呢？$q$ from x union all select id, 'en', $q$How is this possible when the rules are so clear?$q$ from x;

-- Hej. Kan jag hjälpa dig med något? Hello.: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2721384b-b989-41ab-928f-32d253faf4a8', 'learning_objects', 'swedish', swedish, $q$Hej. Kan jag hjälpa dig med något?$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '2721384b-b989-41ab-928f-32d253faf4a8' and swedish is distinct from $q$Hej. Kan jag hjälpa dig med något?$q$;
update public.learning_objects set swedish = $q$Hej. Kan jag hjälpa dig med något?$q$, updated_at = now() where id = '2721384b-b989-41ab-928f-32d253faf4a8' and swedish is distinct from $q$Hej. Kan jag hjälpa dig med något?$q$;

-- Hej. Kan jag hjälpa dig med något? Hello.: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2721384b-b989-41ab-928f-32d253faf4a8', 'learning_objects', 'match_key', match_key, $q$hej kan jag hjälpa sig med ngt ?$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '2721384b-b989-41ab-928f-32d253faf4a8' and match_key is distinct from $q$hej kan jag hjälpa sig med ngt ?$q$;
update public.learning_objects set match_key = $q$hej kan jag hjälpa sig med ngt ?$q$, updated_at = now() where id = '2721384b-b989-41ab-928f-32d253faf4a8' and match_key is distinct from $q$hej kan jag hjälpa sig med ngt ?$q$;

-- 2721384b-b989-41ab-928f-32d253faf4a8: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2721384b-b989-41ab-928f-32d253faf4a8', 'learning_object_examples', 'insert', null, $q$Hej. Kan jag hjälpa dig med något?$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '2721384b-b989-41ab-928f-32d253faf4a8' and example_swedish = $q$Hej. Kan jag hjälpa dig med något?$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '2721384b-b989-41ab-928f-32d253faf4a8', $q$Hej. Kan jag hjälpa dig med något?$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '2721384b-b989-41ab-928f-32d253faf4a8' and example_swedish = $q$Hej. Kan jag hjälpa dig med något?$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$你好。我可以帮你做点什么吗？$q$ from x union all select id, 'en', $q$Hello. Can I help you with anything?$q$ from x;

-- 2721384b-b989-41ab-928f-32d253faf4a8: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2721384b-b989-41ab-928f-32d253faf4a8', 'learning_object_examples', 'insert', null, $q$Kan jag hjälpa dig med något mer?$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '2721384b-b989-41ab-928f-32d253faf4a8' and example_swedish = $q$Kan jag hjälpa dig med något mer?$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '2721384b-b989-41ab-928f-32d253faf4a8', $q$Kan jag hjälpa dig med något mer?$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '2721384b-b989-41ab-928f-32d253faf4a8' and example_swedish = $q$Kan jag hjälpa dig med något mer?$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$我还能帮你点什么吗？$q$ from x union all select id, 'en', $q$Can I help you with anything else?$q$ from x;

-- 2721384b-b989-41ab-928f-32d253faf4a8: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2721384b-b989-41ab-928f-32d253faf4a8', 'learning_objects', 'example_sv', example_sv, $q$Hej. Kan jag hjälpa dig med något?
Kan jag hjälpa dig med något mer?$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '2721384b-b989-41ab-928f-32d253faf4a8' and example_sv is distinct from $q$Hej. Kan jag hjälpa dig med något?
Kan jag hjälpa dig med något mer?$q$ and true;
update public.learning_objects set example_sv = $q$Hej. Kan jag hjälpa dig med något?
Kan jag hjälpa dig med något mer?$q$, updated_at = now() where id = '2721384b-b989-41ab-928f-32d253faf4a8' and example_sv is distinct from $q$Hej. Kan jag hjälpa dig med något?
Kan jag hjälpa dig med något mer?$q$ and true;

-- 27c2032c-3dd3-4644-98fd-462e53d6c11d: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '27c2032c-3dd3-4644-98fd-462e53d6c11d', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$Jag är upptagen och kan inte nu.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '27c2032c-3dd3-4644-98fd-462e53d6c11d' and swedish_explanation is distinct from $q$Jag är upptagen och kan inte nu.$q$ and true;
update public.learning_objects set swedish_explanation = $q$Jag är upptagen och kan inte nu.$q$, updated_at = now() where id = '27c2032c-3dd3-4644-98fd-462e53d6c11d' and swedish_explanation is distinct from $q$Jag är upptagen och kan inte nu.$q$ and true;

-- 27c2032c-3dd3-4644-98fd-462e53d6c11d: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '27c2032c-3dd3-4644-98fd-462e53d6c11d', 'learning_objects', 'example_zh', example_zh, $q$我今天没有时间锻炼。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '27c2032c-3dd3-4644-98fd-462e53d6c11d' and example_zh is distinct from $q$我今天没有时间锻炼。$q$ and true;
update public.learning_objects set example_zh = $q$我今天没有时间锻炼。$q$, updated_at = now() where id = '27c2032c-3dd3-4644-98fd-462e53d6c11d' and example_zh is distinct from $q$我今天没有时间锻炼。$q$ and true;

-- 27c2032c-3dd3-4644-98fd-462e53d6c11d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '27c2032c-3dd3-4644-98fd-462e53d6c11d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我今天没有时间锻炼。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '27c2032c-3dd3-4644-98fd-462e53d6c11d' and native_language = 'zh' and example_translation is distinct from $q$我今天没有时间锻炼。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我今天没有时间锻炼。$q$, updated_at = now() where learning_object_id = '27c2032c-3dd3-4644-98fd-462e53d6c11d' and native_language = 'zh' and example_translation is distinct from $q$我今天没有时间锻炼。$q$ and coalesce(example_translation, '') <> '';

-- 27c2032c-3dd3-4644-98fd-462e53d6c11d: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '27c2032c-3dd3-4644-98fd-462e53d6c11d', 'learning_object_translations', 'en.example_translation', example_translation, $q$I don't have time to work out today.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '27c2032c-3dd3-4644-98fd-462e53d6c11d' and native_language = 'en' and example_translation is distinct from $q$I don't have time to work out today.$q$ and true;
update public.learning_object_translations set example_translation = $q$I don't have time to work out today.$q$, updated_at = now() where learning_object_id = '27c2032c-3dd3-4644-98fd-462e53d6c11d' and native_language = 'en' and example_translation is distinct from $q$I don't have time to work out today.$q$ and true;

-- 28623852-562f-4ecb-8f15-c5af1e946f6e: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '28623852-562f-4ecb-8f15-c5af1e946f6e', 'learning_objects', 'example_zh', example_zh, $q$你知道我读到了什么吗？今天早上报纸上写的。你知道我读到了什么吗？这非常出人意料。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '28623852-562f-4ecb-8f15-c5af1e946f6e' and example_zh is distinct from $q$你知道我读到了什么吗？今天早上报纸上写的。你知道我读到了什么吗？这非常出人意料。$q$ and true;
update public.learning_objects set example_zh = $q$你知道我读到了什么吗？今天早上报纸上写的。你知道我读到了什么吗？这非常出人意料。$q$, updated_at = now() where id = '28623852-562f-4ecb-8f15-c5af1e946f6e' and example_zh is distinct from $q$你知道我读到了什么吗？今天早上报纸上写的。你知道我读到了什么吗？这非常出人意料。$q$ and true;

-- 28623852-562f-4ecb-8f15-c5af1e946f6e: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '28623852-562f-4ecb-8f15-c5af1e946f6e', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你知道我读到了什么吗？今天早上报纸上写的。你知道我读到了什么吗？这非常出人意料。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '28623852-562f-4ecb-8f15-c5af1e946f6e' and native_language = 'zh' and example_translation is distinct from $q$你知道我读到了什么吗？今天早上报纸上写的。你知道我读到了什么吗？这非常出人意料。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你知道我读到了什么吗？今天早上报纸上写的。你知道我读到了什么吗？这非常出人意料。$q$, updated_at = now() where learning_object_id = '28623852-562f-4ecb-8f15-c5af1e946f6e' and native_language = 'zh' and example_translation is distinct from $q$你知道我读到了什么吗？今天早上报纸上写的。你知道我读到了什么吗？这非常出人意料。$q$ and coalesce(example_translation, '') <> '';

-- 295dc548-6aa3-491d-997f-7c891721e6df: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '295dc548-6aa3-491d-997f-7c891721e6df', 'learning_objects', 'example_zh', example_zh, $q$今天早上很冷。是啊，绝对如此。这部电影很好看——是啊，确实如此。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '295dc548-6aa3-491d-997f-7c891721e6df' and example_zh is distinct from $q$今天早上很冷。是啊，绝对如此。这部电影很好看——是啊，确实如此。$q$ and true;
update public.learning_objects set example_zh = $q$今天早上很冷。是啊，绝对如此。这部电影很好看——是啊，确实如此。$q$, updated_at = now() where id = '295dc548-6aa3-491d-997f-7c891721e6df' and example_zh is distinct from $q$今天早上很冷。是啊，绝对如此。这部电影很好看——是啊，确实如此。$q$ and true;

-- 295dc548-6aa3-491d-997f-7c891721e6df: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '295dc548-6aa3-491d-997f-7c891721e6df', 'learning_object_translations', 'zh.example_translation', example_translation, $q$今天早上很冷。是啊，绝对如此。这部电影很好看——是啊，确实如此。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '295dc548-6aa3-491d-997f-7c891721e6df' and native_language = 'zh' and example_translation is distinct from $q$今天早上很冷。是啊，绝对如此。这部电影很好看——是啊，确实如此。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$今天早上很冷。是啊，绝对如此。这部电影很好看——是啊，确实如此。$q$, updated_at = now() where learning_object_id = '295dc548-6aa3-491d-997f-7c891721e6df' and native_language = 'zh' and example_translation is distinct from $q$今天早上很冷。是啊，绝对如此。这部电影很好看——是啊，确实如此。$q$ and coalesce(example_translation, '') <> '';

-- 2c2292d2-6a3a-4628-853a-326981caa45e: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2c2292d2-6a3a-4628-853a-326981caa45e', 'learning_objects', 'example_zh', example_zh, $q$两人一组练习，并互相提问。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '2c2292d2-6a3a-4628-853a-326981caa45e' and example_zh is distinct from $q$两人一组练习，并互相提问。$q$ and true;
update public.learning_objects set example_zh = $q$两人一组练习，并互相提问。$q$, updated_at = now() where id = '2c2292d2-6a3a-4628-853a-326981caa45e' and example_zh is distinct from $q$两人一组练习，并互相提问。$q$ and true;

-- 2c2292d2-6a3a-4628-853a-326981caa45e: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2c2292d2-6a3a-4628-853a-326981caa45e', 'learning_object_translations', 'zh.example_translation', example_translation, $q$两人一组练习，并互相提问。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '2c2292d2-6a3a-4628-853a-326981caa45e' and native_language = 'zh' and example_translation is distinct from $q$两人一组练习，并互相提问。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$两人一组练习，并互相提问。$q$, updated_at = now() where learning_object_id = '2c2292d2-6a3a-4628-853a-326981caa45e' and native_language = 'zh' and example_translation is distinct from $q$两人一组练习，并互相提问。$q$ and coalesce(example_translation, '') <> '';

-- 2ce9ac85-83bf-4cde-be4d-664060aa510f: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2ce9ac85-83bf-4cde-be4d-664060aa510f', 'learning_objects', 'example_zh', example_zh, $q$旅馆就在市中心。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '2ce9ac85-83bf-4cde-be4d-664060aa510f' and example_zh is distinct from $q$旅馆就在市中心。$q$ and true;
update public.learning_objects set example_zh = $q$旅馆就在市中心。$q$, updated_at = now() where id = '2ce9ac85-83bf-4cde-be4d-664060aa510f' and example_zh is distinct from $q$旅馆就在市中心。$q$ and true;

-- 2ce9ac85-83bf-4cde-be4d-664060aa510f: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2ce9ac85-83bf-4cde-be4d-664060aa510f', 'learning_object_translations', 'zh.example_translation', example_translation, $q$旅馆就在市中心。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '2ce9ac85-83bf-4cde-be4d-664060aa510f' and native_language = 'zh' and example_translation is distinct from $q$旅馆就在市中心。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$旅馆就在市中心。$q$, updated_at = now() where learning_object_id = '2ce9ac85-83bf-4cde-be4d-664060aa510f' and native_language = 'zh' and example_translation is distinct from $q$旅馆就在市中心。$q$ and coalesce(example_translation, '') <> '';

-- f.kr. Före Kristus B.C.: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2df860c3-7fdf-4335-93bd-1bcb5b10787f', 'learning_objects', 'swedish', swedish, $q$f.Kr.$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '2df860c3-7fdf-4335-93bd-1bcb5b10787f' and swedish is distinct from $q$f.Kr.$q$;
update public.learning_objects set swedish = $q$f.Kr.$q$, updated_at = now() where id = '2df860c3-7fdf-4335-93bd-1bcb5b10787f' and swedish is distinct from $q$f.Kr.$q$;

-- f.kr. Före Kristus B.C.: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2df860c3-7fdf-4335-93bd-1bcb5b10787f', 'learning_objects', 'match_key', match_key, $q$f kr$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '2df860c3-7fdf-4335-93bd-1bcb5b10787f' and match_key is distinct from $q$f kr$q$;
update public.learning_objects set match_key = $q$f kr$q$, updated_at = now() where id = '2df860c3-7fdf-4335-93bd-1bcb5b10787f' and match_key is distinct from $q$f kr$q$;

-- 2df860c3-7fdf-4335-93bd-1bcb5b10787f: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2df860c3-7fdf-4335-93bd-1bcb5b10787f', 'learning_objects', 'example_zh', example_zh, $q$金字塔建于公元前几百年。这件事发生在大约公元前500年。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '2df860c3-7fdf-4335-93bd-1bcb5b10787f' and example_zh is distinct from $q$金字塔建于公元前几百年。这件事发生在大约公元前500年。$q$ and true;
update public.learning_objects set example_zh = $q$金字塔建于公元前几百年。这件事发生在大约公元前500年。$q$, updated_at = now() where id = '2df860c3-7fdf-4335-93bd-1bcb5b10787f' and example_zh is distinct from $q$金字塔建于公元前几百年。这件事发生在大约公元前500年。$q$ and true;

-- 2df860c3-7fdf-4335-93bd-1bcb5b10787f: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2df860c3-7fdf-4335-93bd-1bcb5b10787f', 'learning_object_translations', 'zh.example_translation', example_translation, $q$金字塔建于公元前几百年。这件事发生在大约公元前500年。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '2df860c3-7fdf-4335-93bd-1bcb5b10787f' and native_language = 'zh' and example_translation is distinct from $q$金字塔建于公元前几百年。这件事发生在大约公元前500年。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$金字塔建于公元前几百年。这件事发生在大约公元前500年。$q$, updated_at = now() where learning_object_id = '2df860c3-7fdf-4335-93bd-1bcb5b10787f' and native_language = 'zh' and example_translation is distinct from $q$金字塔建于公元前几百年。这件事发生在大约公元前500年。$q$ and coalesce(example_translation, '') <> '';

-- 2df860c3-7fdf-4335-93bd-1bcb5b10787f: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2df860c3-7fdf-4335-93bd-1bcb5b10787f', 'learning_object_translations', 'en.example_translation', example_translation, $q$The pyramids were built several hundred years B.C. It happened around 500 B.C.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '2df860c3-7fdf-4335-93bd-1bcb5b10787f' and native_language = 'en' and example_translation is distinct from $q$The pyramids were built several hundred years B.C. It happened around 500 B.C.$q$ and true;
update public.learning_object_translations set example_translation = $q$The pyramids were built several hundred years B.C. It happened around 500 B.C.$q$, updated_at = now() where learning_object_id = '2df860c3-7fdf-4335-93bd-1bcb5b10787f' and native_language = 'en' and example_translation is distinct from $q$The pyramids were built several hundred years B.C. It happened around 500 B.C.$q$ and true;

-- 2e1e173a-3240-4bb3-b8a4-248411000894: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2e1e173a-3240-4bb3-b8a4-248411000894', 'learning_objects', 'example_zh', example_zh, $q$你今天怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '2e1e173a-3240-4bb3-b8a4-248411000894' and example_zh is distinct from $q$你今天怎么样？$q$ and true;
update public.learning_objects set example_zh = $q$你今天怎么样？$q$, updated_at = now() where id = '2e1e173a-3240-4bb3-b8a4-248411000894' and example_zh is distinct from $q$你今天怎么样？$q$ and true;

-- 2e1e173a-3240-4bb3-b8a4-248411000894: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2e1e173a-3240-4bb3-b8a4-248411000894', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你今天怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '2e1e173a-3240-4bb3-b8a4-248411000894' and native_language = 'zh' and example_translation is distinct from $q$你今天怎么样？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你今天怎么样？$q$, updated_at = now() where learning_object_id = '2e1e173a-3240-4bb3-b8a4-248411000894' and native_language = 'zh' and example_translation is distinct from $q$你今天怎么样？$q$ and coalesce(example_translation, '') <> '';

-- 2e1e173a-3240-4bb3-b8a4-248411000894: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2e1e173a-3240-4bb3-b8a4-248411000894', 'learning_object_translations', 'en.example_translation', example_translation, $q$How are you today?$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '2e1e173a-3240-4bb3-b8a4-248411000894' and native_language = 'en' and example_translation is distinct from $q$How are you today?$q$ and true;
update public.learning_object_translations set example_translation = $q$How are you today?$q$, updated_at = now() where learning_object_id = '2e1e173a-3240-4bb3-b8a4-248411000894' and native_language = 'en' and example_translation is distinct from $q$How are you today?$q$ and true;

-- 3348a90f-5a28-4738-9ed6-9875d6b589d1: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3348a90f-5a28-4738-9ed6-9875d6b589d1', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$uttryck för att få medhåll eller bekräftelse och göra ett förslag mer lockande$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '3348a90f-5a28-4738-9ed6-9875d6b589d1' and swedish_explanation is distinct from $q$uttryck för att få medhåll eller bekräftelse och göra ett förslag mer lockande$q$ and true;
update public.learning_objects set swedish_explanation = $q$uttryck för att få medhåll eller bekräftelse och göra ett förslag mer lockande$q$, updated_at = now() where id = '3348a90f-5a28-4738-9ed6-9875d6b589d1' and swedish_explanation is distinct from $q$uttryck för att få medhåll eller bekräftelse och göra ett förslag mer lockande$q$ and true;

-- 33bd577b-a913-412e-919c-7709e00ac842: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '33bd577b-a913-412e-919c-7709e00ac842', 'learning_objects', 'example_zh', example_zh, $q$最多能花多少钱？最多800克朗。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '33bd577b-a913-412e-919c-7709e00ac842' and example_zh is distinct from $q$最多能花多少钱？最多800克朗。$q$ and true;
update public.learning_objects set example_zh = $q$最多能花多少钱？最多800克朗。$q$, updated_at = now() where id = '33bd577b-a913-412e-919c-7709e00ac842' and example_zh is distinct from $q$最多能花多少钱？最多800克朗。$q$ and true;

-- 33bd577b-a913-412e-919c-7709e00ac842: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '33bd577b-a913-412e-919c-7709e00ac842', 'learning_object_translations', 'zh.example_translation', example_translation, $q$最多能花多少钱？最多800克朗。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '33bd577b-a913-412e-919c-7709e00ac842' and native_language = 'zh' and example_translation is distinct from $q$最多能花多少钱？最多800克朗。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$最多能花多少钱？最多800克朗。$q$, updated_at = now() where learning_object_id = '33bd577b-a913-412e-919c-7709e00ac842' and native_language = 'zh' and example_translation is distinct from $q$最多能花多少钱？最多800克朗。$q$ and coalesce(example_translation, '') <> '';

-- 368b5da3-490f-49cb-8138-57d6e4664053: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '368b5da3-490f-49cb-8138-57d6e4664053', 'learning_objects', 'example_zh', example_zh, $q$今天是几号？今天是5月18日。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '368b5da3-490f-49cb-8138-57d6e4664053' and example_zh is distinct from $q$今天是几号？今天是5月18日。$q$ and true;
update public.learning_objects set example_zh = $q$今天是几号？今天是5月18日。$q$, updated_at = now() where id = '368b5da3-490f-49cb-8138-57d6e4664053' and example_zh is distinct from $q$今天是几号？今天是5月18日。$q$ and true;

-- 368b5da3-490f-49cb-8138-57d6e4664053: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '368b5da3-490f-49cb-8138-57d6e4664053', 'learning_object_translations', 'zh.example_translation', example_translation, $q$今天是几号？今天是5月18日。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '368b5da3-490f-49cb-8138-57d6e4664053' and native_language = 'zh' and example_translation is distinct from $q$今天是几号？今天是5月18日。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$今天是几号？今天是5月18日。$q$, updated_at = now() where learning_object_id = '368b5da3-490f-49cb-8138-57d6e4664053' and native_language = 'zh' and example_translation is distinct from $q$今天是几号？今天是5月18日。$q$ and coalesce(example_translation, '') <> '';

-- 368b5da3-490f-49cb-8138-57d6e4664053: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '368b5da3-490f-49cb-8138-57d6e4664053', 'learning_object_translations', 'en.example_translation', example_translation, $q$What date is it today? It’s the eighteenth of May.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '368b5da3-490f-49cb-8138-57d6e4664053' and native_language = 'en' and example_translation is distinct from $q$What date is it today? It’s the eighteenth of May.$q$ and true;
update public.learning_object_translations set example_translation = $q$What date is it today? It’s the eighteenth of May.$q$, updated_at = now() where learning_object_id = '368b5da3-490f-49cb-8138-57d6e4664053' and native_language = 'en' and example_translation is distinct from $q$What date is it today? It’s the eighteenth of May.$q$ and true;

-- 3856a808-6722-43e7-a804-e124faf7cb3c: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3856a808-6722-43e7-a804-e124faf7cb3c', 'learning_objects', 'example_zh', example_zh, $q$她赢得了奖，这是真的吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '3856a808-6722-43e7-a804-e124faf7cb3c' and example_zh is distinct from $q$她赢得了奖，这是真的吗？$q$ and true;
update public.learning_objects set example_zh = $q$她赢得了奖，这是真的吗？$q$, updated_at = now() where id = '3856a808-6722-43e7-a804-e124faf7cb3c' and example_zh is distinct from $q$她赢得了奖，这是真的吗？$q$ and true;

-- 3856a808-6722-43e7-a804-e124faf7cb3c: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3856a808-6722-43e7-a804-e124faf7cb3c', 'learning_object_translations', 'zh.example_translation', example_translation, $q$她赢得了奖，这是真的吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '3856a808-6722-43e7-a804-e124faf7cb3c' and native_language = 'zh' and example_translation is distinct from $q$她赢得了奖，这是真的吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$她赢得了奖，这是真的吗？$q$, updated_at = now() where learning_object_id = '3856a808-6722-43e7-a804-e124faf7cb3c' and native_language = 'zh' and example_translation is distinct from $q$她赢得了奖，这是真的吗？$q$ and coalesce(example_translation, '') <> '';

-- 3a55d01e-51be-47b4-8c9f-741774f1f10e: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3a55d01e-51be-47b4-8c9f-741774f1f10e', 'learning_objects', 'example_zh', example_zh, $q$你今天穿了什么？我穿着牛仔裤和毛衣。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '3a55d01e-51be-47b4-8c9f-741774f1f10e' and example_zh is distinct from $q$你今天穿了什么？我穿着牛仔裤和毛衣。$q$ and true;
update public.learning_objects set example_zh = $q$你今天穿了什么？我穿着牛仔裤和毛衣。$q$, updated_at = now() where id = '3a55d01e-51be-47b4-8c9f-741774f1f10e' and example_zh is distinct from $q$你今天穿了什么？我穿着牛仔裤和毛衣。$q$ and true;

-- 3a55d01e-51be-47b4-8c9f-741774f1f10e: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3a55d01e-51be-47b4-8c9f-741774f1f10e', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你今天穿了什么？我穿着牛仔裤和毛衣。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '3a55d01e-51be-47b4-8c9f-741774f1f10e' and native_language = 'zh' and example_translation is distinct from $q$你今天穿了什么？我穿着牛仔裤和毛衣。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你今天穿了什么？我穿着牛仔裤和毛衣。$q$, updated_at = now() where learning_object_id = '3a55d01e-51be-47b4-8c9f-741774f1f10e' and native_language = 'zh' and example_translation is distinct from $q$你今天穿了什么？我穿着牛仔裤和毛衣。$q$ and coalesce(example_translation, '') <> '';

-- a256895e-7116-4c34-a825-0cb04b55098e: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a256895e-7116-4c34-a825-0cb04b55098e', 'learning_objects', 'example_zh', example_zh, $q$遵守规则和法律很重要。这样社会会更安全。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a256895e-7116-4c34-a825-0cb04b55098e' and example_zh is distinct from $q$遵守规则和法律很重要。这样社会会更安全。$q$ and true;
update public.learning_objects set example_zh = $q$遵守规则和法律很重要。这样社会会更安全。$q$, updated_at = now() where id = 'a256895e-7116-4c34-a825-0cb04b55098e' and example_zh is distinct from $q$遵守规则和法律很重要。这样社会会更安全。$q$ and true;

-- a256895e-7116-4c34-a825-0cb04b55098e: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a256895e-7116-4c34-a825-0cb04b55098e', 'learning_object_translations', 'zh.example_translation', example_translation, $q$遵守规则和法律很重要。这样社会会更安全。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'a256895e-7116-4c34-a825-0cb04b55098e' and native_language = 'zh' and example_translation is distinct from $q$遵守规则和法律很重要。这样社会会更安全。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$遵守规则和法律很重要。这样社会会更安全。$q$, updated_at = now() where learning_object_id = 'a256895e-7116-4c34-a825-0cb04b55098e' and native_language = 'zh' and example_translation is distinct from $q$遵守规则和法律很重要。这样社会会更安全。$q$ and coalesce(example_translation, '') <> '';

-- 3c196344-31d3-4b20-97d5-ab3ad10976d1: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3c196344-31d3-4b20-97d5-ab3ad10976d1', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$En vänlig fras man säger när man träffar någon för första gången.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '3c196344-31d3-4b20-97d5-ab3ad10976d1' and swedish_explanation is distinct from $q$En vänlig fras man säger när man träffar någon för första gången.$q$ and true;
update public.learning_objects set swedish_explanation = $q$En vänlig fras man säger när man träffar någon för första gången.$q$, updated_at = now() where id = '3c196344-31d3-4b20-97d5-ab3ad10976d1' and swedish_explanation is distinct from $q$En vänlig fras man säger när man träffar någon för första gången.$q$ and true;

-- 41b81077-0073-4a34-9998-baf25983e30e: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '41b81077-0073-4a34-9998-baf25983e30e', 'learning_objects', 'example_zh', example_zh, $q$你现在住在哪里来着？我忘了你的地址。我们很快会见面，不过你现在住在哪里来着？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '41b81077-0073-4a34-9998-baf25983e30e' and example_zh is distinct from $q$你现在住在哪里来着？我忘了你的地址。我们很快会见面，不过你现在住在哪里来着？$q$ and true;
update public.learning_objects set example_zh = $q$你现在住在哪里来着？我忘了你的地址。我们很快会见面，不过你现在住在哪里来着？$q$, updated_at = now() where id = '41b81077-0073-4a34-9998-baf25983e30e' and example_zh is distinct from $q$你现在住在哪里来着？我忘了你的地址。我们很快会见面，不过你现在住在哪里来着？$q$ and true;

-- 41b81077-0073-4a34-9998-baf25983e30e: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '41b81077-0073-4a34-9998-baf25983e30e', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你现在住在哪里来着？我忘了你的地址。我们很快会见面，不过你现在住在哪里来着？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '41b81077-0073-4a34-9998-baf25983e30e' and native_language = 'zh' and example_translation is distinct from $q$你现在住在哪里来着？我忘了你的地址。我们很快会见面，不过你现在住在哪里来着？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你现在住在哪里来着？我忘了你的地址。我们很快会见面，不过你现在住在哪里来着？$q$, updated_at = now() where learning_object_id = '41b81077-0073-4a34-9998-baf25983e30e' and native_language = 'zh' and example_translation is distinct from $q$你现在住在哪里来着？我忘了你的地址。我们很快会见面，不过你现在住在哪里来着？$q$ and coalesce(example_translation, '') <> '';

-- b7dd7f5e-0430-4285-b35e-18e0263a9595: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b7dd7f5e-0430-4285-b35e-18e0263a9595', 'learning_objects', 'example_zh', example_zh, $q$火车因为下雪晚点了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b7dd7f5e-0430-4285-b35e-18e0263a9595' and example_zh is distinct from $q$火车因为下雪晚点了。$q$ and true;
update public.learning_objects set example_zh = $q$火车因为下雪晚点了。$q$, updated_at = now() where id = 'b7dd7f5e-0430-4285-b35e-18e0263a9595' and example_zh is distinct from $q$火车因为下雪晚点了。$q$ and true;

-- b7dd7f5e-0430-4285-b35e-18e0263a9595: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b7dd7f5e-0430-4285-b35e-18e0263a9595', 'learning_object_translations', 'zh.example_translation', example_translation, $q$火车因为下雪晚点了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b7dd7f5e-0430-4285-b35e-18e0263a9595' and native_language = 'zh' and example_translation is distinct from $q$火车因为下雪晚点了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$火车因为下雪晚点了。$q$, updated_at = now() where learning_object_id = 'b7dd7f5e-0430-4285-b35e-18e0263a9595' and native_language = 'zh' and example_translation is distinct from $q$火车因为下雪晚点了。$q$ and coalesce(example_translation, '') <> '';

-- 46669ba2-2a54-482f-bf12-4f5476dc2e1c: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '46669ba2-2a54-482f-bf12-4f5476dc2e1c', 'learning_object_examples', 'insert', null, $q$Vad är det som har hänt här?$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '46669ba2-2a54-482f-bf12-4f5476dc2e1c' and example_swedish = $q$Vad är det som har hänt här?$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '46669ba2-2a54-482f-bf12-4f5476dc2e1c', $q$Vad är det som har hänt här?$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '46669ba2-2a54-482f-bf12-4f5476dc2e1c' and example_swedish = $q$Vad är det som har hänt här?$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$发生了什么？$q$ from x union all select id, 'en', $q$What happened here?$q$ from x;

-- 46669ba2-2a54-482f-bf12-4f5476dc2e1c: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '46669ba2-2a54-482f-bf12-4f5476dc2e1c', 'learning_object_examples', 'insert', null, $q$Vad är det som har hänt med bilen?$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '46669ba2-2a54-482f-bf12-4f5476dc2e1c' and example_swedish = $q$Vad är det som har hänt med bilen?$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '46669ba2-2a54-482f-bf12-4f5476dc2e1c', $q$Vad är det som har hänt med bilen?$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '46669ba2-2a54-482f-bf12-4f5476dc2e1c' and example_swedish = $q$Vad är det som har hänt med bilen?$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$这辆车怎么了？$q$ from x union all select id, 'en', $q$What happened to the car?$q$ from x;

-- 46fa0768-dcc4-4fe4-8c08-bb2d5bb8f90f: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '46fa0768-dcc4-4fe4-8c08-bb2d5bb8f90f', 'learning_objects', 'example_zh', example_zh, $q$多云，但很暖和。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '46fa0768-dcc4-4fe4-8c08-bb2d5bb8f90f' and example_zh is distinct from $q$多云，但很暖和。$q$ and true;
update public.learning_objects set example_zh = $q$多云，但很暖和。$q$, updated_at = now() where id = '46fa0768-dcc4-4fe4-8c08-bb2d5bb8f90f' and example_zh is distinct from $q$多云，但很暖和。$q$ and true;

-- 46fa0768-dcc4-4fe4-8c08-bb2d5bb8f90f: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '46fa0768-dcc4-4fe4-8c08-bb2d5bb8f90f', 'learning_object_translations', 'zh.example_translation', example_translation, $q$多云，但很暖和。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '46fa0768-dcc4-4fe4-8c08-bb2d5bb8f90f' and native_language = 'zh' and example_translation is distinct from $q$多云，但很暖和。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$多云，但很暖和。$q$, updated_at = now() where learning_object_id = '46fa0768-dcc4-4fe4-8c08-bb2d5bb8f90f' and native_language = 'zh' and example_translation is distinct from $q$多云，但很暖和。$q$ and coalesce(example_translation, '') <> '';

-- 48784b54-ccba-4189-a050-2cc64693d226: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '48784b54-ccba-4189-a050-2cc64693d226', 'learning_objects', 'example_zh', example_zh, $q$你知道她打过电话了吗？我想知道你是否知道今天是不是开门。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '48784b54-ccba-4189-a050-2cc64693d226' and example_zh is distinct from $q$你知道她打过电话了吗？我想知道你是否知道今天是不是开门。$q$ and true;
update public.learning_objects set example_zh = $q$你知道她打过电话了吗？我想知道你是否知道今天是不是开门。$q$, updated_at = now() where id = '48784b54-ccba-4189-a050-2cc64693d226' and example_zh is distinct from $q$你知道她打过电话了吗？我想知道你是否知道今天是不是开门。$q$ and true;

-- 48784b54-ccba-4189-a050-2cc64693d226: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '48784b54-ccba-4189-a050-2cc64693d226', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你知道她打过电话了吗？我想知道你是否知道今天是不是开门。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '48784b54-ccba-4189-a050-2cc64693d226' and native_language = 'zh' and example_translation is distinct from $q$你知道她打过电话了吗？我想知道你是否知道今天是不是开门。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你知道她打过电话了吗？我想知道你是否知道今天是不是开门。$q$, updated_at = now() where learning_object_id = '48784b54-ccba-4189-a050-2cc64693d226' and native_language = 'zh' and example_translation is distinct from $q$你知道她打过电话了吗？我想知道你是否知道今天是不是开门。$q$ and coalesce(example_translation, '') <> '';

-- 4a24879e-898e-4e92-9c3f-74eb63119e32: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4a24879e-898e-4e92-9c3f-74eb63119e32', 'learning_objects', 'example_zh', example_zh, $q$希望你们大家在家都好！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '4a24879e-898e-4e92-9c3f-74eb63119e32' and example_zh is distinct from $q$希望你们大家在家都好！$q$ and true;
update public.learning_objects set example_zh = $q$希望你们大家在家都好！$q$, updated_at = now() where id = '4a24879e-898e-4e92-9c3f-74eb63119e32' and example_zh is distinct from $q$希望你们大家在家都好！$q$ and true;

-- 4a24879e-898e-4e92-9c3f-74eb63119e32: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4a24879e-898e-4e92-9c3f-74eb63119e32', 'learning_object_translations', 'zh.example_translation', example_translation, $q$希望你们大家在家都好！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '4a24879e-898e-4e92-9c3f-74eb63119e32' and native_language = 'zh' and example_translation is distinct from $q$希望你们大家在家都好！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$希望你们大家在家都好！$q$, updated_at = now() where learning_object_id = '4a24879e-898e-4e92-9c3f-74eb63119e32' and native_language = 'zh' and example_translation is distinct from $q$希望你们大家在家都好！$q$ and coalesce(example_translation, '') <> '';

-- 4a2c2c23-b497-4d68-bbf7-de7319d72369: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4a2c2c23-b497-4d68-bbf7-de7319d72369', 'learning_objects', 'example_zh', example_zh, $q$早上很冷。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '4a2c2c23-b497-4d68-bbf7-de7319d72369' and example_zh is distinct from $q$早上很冷。$q$ and true;
update public.learning_objects set example_zh = $q$早上很冷。$q$, updated_at = now() where id = '4a2c2c23-b497-4d68-bbf7-de7319d72369' and example_zh is distinct from $q$早上很冷。$q$ and true;

-- 4a2c2c23-b497-4d68-bbf7-de7319d72369: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4a2c2c23-b497-4d68-bbf7-de7319d72369', 'learning_object_translations', 'zh.example_translation', example_translation, $q$早上很冷。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '4a2c2c23-b497-4d68-bbf7-de7319d72369' and native_language = 'zh' and example_translation is distinct from $q$早上很冷。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$早上很冷。$q$, updated_at = now() where learning_object_id = '4a2c2c23-b497-4d68-bbf7-de7319d72369' and native_language = 'zh' and example_translation is distinct from $q$早上很冷。$q$ and coalesce(example_translation, '') <> '';

-- 4a41d302-c6d0-4f41-bdef-fd36a4dbba91: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4a41d302-c6d0-4f41-bdef-fd36a4dbba91', 'learning_objects', 'example_zh', example_zh, $q$你跟上了吗，还是要我再解释一遍？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '4a41d302-c6d0-4f41-bdef-fd36a4dbba91' and example_zh is distinct from $q$你跟上了吗，还是要我再解释一遍？$q$ and true;
update public.learning_objects set example_zh = $q$你跟上了吗，还是要我再解释一遍？$q$, updated_at = now() where id = '4a41d302-c6d0-4f41-bdef-fd36a4dbba91' and example_zh is distinct from $q$你跟上了吗，还是要我再解释一遍？$q$ and true;

-- 4a41d302-c6d0-4f41-bdef-fd36a4dbba91: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4a41d302-c6d0-4f41-bdef-fd36a4dbba91', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你跟上了吗，还是要我再解释一遍？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '4a41d302-c6d0-4f41-bdef-fd36a4dbba91' and native_language = 'zh' and example_translation is distinct from $q$你跟上了吗，还是要我再解释一遍？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你跟上了吗，还是要我再解释一遍？$q$, updated_at = now() where learning_object_id = '4a41d302-c6d0-4f41-bdef-fd36a4dbba91' and native_language = 'zh' and example_translation is distinct from $q$你跟上了吗，还是要我再解释一遍？$q$ and coalesce(example_translation, '') <> '';

-- 4e6bab69-037e-4e52-aa58-fca4235bde7b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4e6bab69-037e-4e52-aa58-fca4235bde7b', 'learning_objects', 'example_zh', example_zh, $q$不，这不可能！一定是弄错了。不，她不可能已经到了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '4e6bab69-037e-4e52-aa58-fca4235bde7b' and example_zh is distinct from $q$不，这不可能！一定是弄错了。不，她不可能已经到了。$q$ and true;
update public.learning_objects set example_zh = $q$不，这不可能！一定是弄错了。不，她不可能已经到了。$q$, updated_at = now() where id = '4e6bab69-037e-4e52-aa58-fca4235bde7b' and example_zh is distinct from $q$不，这不可能！一定是弄错了。不，她不可能已经到了。$q$ and true;

-- 4e6bab69-037e-4e52-aa58-fca4235bde7b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4e6bab69-037e-4e52-aa58-fca4235bde7b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$不，这不可能！一定是弄错了。不，她不可能已经到了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '4e6bab69-037e-4e52-aa58-fca4235bde7b' and native_language = 'zh' and example_translation is distinct from $q$不，这不可能！一定是弄错了。不，她不可能已经到了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$不，这不可能！一定是弄错了。不，她不可能已经到了。$q$, updated_at = now() where learning_object_id = '4e6bab69-037e-4e52-aa58-fca4235bde7b' and native_language = 'zh' and example_translation is distinct from $q$不，这不可能！一定是弄错了。不，她不可能已经到了。$q$ and coalesce(example_translation, '') <> '';

-- -Jo, det är bara bra.: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '50731363-ba55-44ca-8079-0530a271dd51', 'learning_objects', 'swedish', swedish, $q$Jo, det är bara bra.$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '50731363-ba55-44ca-8079-0530a271dd51' and swedish is distinct from $q$Jo, det är bara bra.$q$;
update public.learning_objects set swedish = $q$Jo, det är bara bra.$q$, updated_at = now() where id = '50731363-ba55-44ca-8079-0530a271dd51' and swedish is distinct from $q$Jo, det är bara bra.$q$;

-- -Jo, det är bara bra.: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '50731363-ba55-44ca-8079-0530a271dd51', 'learning_objects', 'match_key', match_key, $q$jo det är bara bra$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '50731363-ba55-44ca-8079-0530a271dd51' and match_key is distinct from $q$jo det är bara bra$q$;
update public.learning_objects set match_key = $q$jo det är bara bra$q$, updated_at = now() where id = '50731363-ba55-44ca-8079-0530a271dd51' and match_key is distinct from $q$jo det är bara bra$q$;

-- 50731363-ba55-44ca-8079-0530a271dd51: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '50731363-ba55-44ca-8079-0530a271dd51', 'learning_objects', 'example_zh', example_zh, $q$你怎么样？我很好。谢谢，我们家里这边一切都很好。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '50731363-ba55-44ca-8079-0530a271dd51' and example_zh is distinct from $q$你怎么样？我很好。谢谢，我们家里这边一切都很好。$q$ and true;
update public.learning_objects set example_zh = $q$你怎么样？我很好。谢谢，我们家里这边一切都很好。$q$, updated_at = now() where id = '50731363-ba55-44ca-8079-0530a271dd51' and example_zh is distinct from $q$你怎么样？我很好。谢谢，我们家里这边一切都很好。$q$ and true;

-- 50731363-ba55-44ca-8079-0530a271dd51: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '50731363-ba55-44ca-8079-0530a271dd51', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你怎么样？我很好。谢谢，我们家里这边一切都很好。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '50731363-ba55-44ca-8079-0530a271dd51' and native_language = 'zh' and example_translation is distinct from $q$你怎么样？我很好。谢谢，我们家里这边一切都很好。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你怎么样？我很好。谢谢，我们家里这边一切都很好。$q$, updated_at = now() where learning_object_id = '50731363-ba55-44ca-8079-0530a271dd51' and native_language = 'zh' and example_translation is distinct from $q$你怎么样？我很好。谢谢，我们家里这边一切都很好。$q$ and coalesce(example_translation, '') <> '';

-- 51102329-724b-41f4-81aa-42c35e8a2ff7: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '51102329-724b-41f4-81aa-42c35e8a2ff7', 'learning_objects', 'example_zh', example_zh, $q$是的，这也许是真的，但我不确定。是啊，不过这也许还是对的。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '51102329-724b-41f4-81aa-42c35e8a2ff7' and example_zh is distinct from $q$是的，这也许是真的，但我不确定。是啊，不过这也许还是对的。$q$ and true;
update public.learning_objects set example_zh = $q$是的，这也许是真的，但我不确定。是啊，不过这也许还是对的。$q$, updated_at = now() where id = '51102329-724b-41f4-81aa-42c35e8a2ff7' and example_zh is distinct from $q$是的，这也许是真的，但我不确定。是啊，不过这也许还是对的。$q$ and true;

-- 51102329-724b-41f4-81aa-42c35e8a2ff7: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '51102329-724b-41f4-81aa-42c35e8a2ff7', 'learning_object_translations', 'zh.example_translation', example_translation, $q$是的，这也许是真的，但我不确定。是啊，不过这也许还是对的。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '51102329-724b-41f4-81aa-42c35e8a2ff7' and native_language = 'zh' and example_translation is distinct from $q$是的，这也许是真的，但我不确定。是啊，不过这也许还是对的。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$是的，这也许是真的，但我不确定。是啊，不过这也许还是对的。$q$, updated_at = now() where learning_object_id = '51102329-724b-41f4-81aa-42c35e8a2ff7' and native_language = 'zh' and example_translation is distinct from $q$是的，这也许是真的，但我不确定。是啊，不过这也许还是对的。$q$ and coalesce(example_translation, '') <> '';

-- 53fd1590-810b-4595-a9c2-20abb1234b72: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '53fd1590-810b-4595-a9c2-20abb1234b72', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$ett motvilligt medgivande$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '53fd1590-810b-4595-a9c2-20abb1234b72' and swedish_explanation is distinct from $q$ett motvilligt medgivande$q$ and true;
update public.learning_objects set swedish_explanation = $q$ett motvilligt medgivande$q$, updated_at = now() where id = '53fd1590-810b-4595-a9c2-20abb1234b72' and swedish_explanation is distinct from $q$ett motvilligt medgivande$q$ and true;

-- 53fd1590-810b-4595-a9c2-20abb1234b72: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '53fd1590-810b-4595-a9c2-20abb1234b72', 'learning_objects', 'example_zh', example_zh, $q$我们现在回家吧。好吧。那我一起去。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '53fd1590-810b-4595-a9c2-20abb1234b72' and example_zh is distinct from $q$我们现在回家吧。好吧。那我一起去。$q$ and true;
update public.learning_objects set example_zh = $q$我们现在回家吧。好吧。那我一起去。$q$, updated_at = now() where id = '53fd1590-810b-4595-a9c2-20abb1234b72' and example_zh is distinct from $q$我们现在回家吧。好吧。那我一起去。$q$ and true;

-- 53fd1590-810b-4595-a9c2-20abb1234b72: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '53fd1590-810b-4595-a9c2-20abb1234b72', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我们现在回家吧。好吧。那我一起去。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '53fd1590-810b-4595-a9c2-20abb1234b72' and native_language = 'zh' and example_translation is distinct from $q$我们现在回家吧。好吧。那我一起去。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我们现在回家吧。好吧。那我一起去。$q$, updated_at = now() where learning_object_id = '53fd1590-810b-4595-a9c2-20abb1234b72' and native_language = 'zh' and example_translation is distinct from $q$我们现在回家吧。好吧。那我一起去。$q$ and coalesce(example_translation, '') <> '';

-- 5488c00c-966b-4089-b707-ef04f0b80aaa: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5488c00c-966b-4089-b707-ef04f0b80aaa', 'learning_objects', 'example_zh', example_zh, $q$不会吧，真的吗？不会吧！我完全不知道这件事。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and example_zh is distinct from $q$不会吧，真的吗？不会吧！我完全不知道这件事。$q$ and true;
update public.learning_objects set example_zh = $q$不会吧，真的吗？不会吧！我完全不知道这件事。$q$, updated_at = now() where id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and example_zh is distinct from $q$不会吧，真的吗？不会吧！我完全不知道这件事。$q$ and true;

-- 5488c00c-966b-4089-b707-ef04f0b80aaa: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5488c00c-966b-4089-b707-ef04f0b80aaa', 'learning_object_translations', 'zh.example_translation', example_translation, $q$不会吧，真的吗？不会吧！我完全不知道这件事。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and native_language = 'zh' and example_translation is distinct from $q$不会吧，真的吗？不会吧！我完全不知道这件事。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$不会吧，真的吗？不会吧！我完全不知道这件事。$q$, updated_at = now() where learning_object_id = '5488c00c-966b-4089-b707-ef04f0b80aaa' and native_language = 'zh' and example_translation is distinct from $q$不会吧，真的吗？不会吧！我完全不知道这件事。$q$ and coalesce(example_translation, '') <> '';

-- 50970826-d7e1-495e-85c0-43040f55f68b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '50970826-d7e1-495e-85c0-43040f55f68b', 'learning_objects', 'example_zh', example_zh, $q$你叫什么名字？我叫安娜。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '50970826-d7e1-495e-85c0-43040f55f68b' and example_zh is distinct from $q$你叫什么名字？我叫安娜。$q$ and true;
update public.learning_objects set example_zh = $q$你叫什么名字？我叫安娜。$q$, updated_at = now() where id = '50970826-d7e1-495e-85c0-43040f55f68b' and example_zh is distinct from $q$你叫什么名字？我叫安娜。$q$ and true;

-- 50970826-d7e1-495e-85c0-43040f55f68b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '50970826-d7e1-495e-85c0-43040f55f68b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你叫什么名字？我叫安娜。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '50970826-d7e1-495e-85c0-43040f55f68b' and native_language = 'zh' and example_translation is distinct from $q$你叫什么名字？我叫安娜。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你叫什么名字？我叫安娜。$q$, updated_at = now() where learning_object_id = '50970826-d7e1-495e-85c0-43040f55f68b' and native_language = 'zh' and example_translation is distinct from $q$你叫什么名字？我叫安娜。$q$ and coalesce(example_translation, '') <> '';

-- 50970826-d7e1-495e-85c0-43040f55f68b: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '50970826-d7e1-495e-85c0-43040f55f68b', 'learning_object_translations', 'en.example_translation', example_translation, $q$What is your name? My name is Anna.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '50970826-d7e1-495e-85c0-43040f55f68b' and native_language = 'en' and example_translation is distinct from $q$What is your name? My name is Anna.$q$ and true;
update public.learning_object_translations set example_translation = $q$What is your name? My name is Anna.$q$, updated_at = now() where learning_object_id = '50970826-d7e1-495e-85c0-43040f55f68b' and native_language = 'en' and example_translation is distinct from $q$What is your name? My name is Anna.$q$ and true;

-- 5899bb27-f543-47b0-b26b-168b61aca81a: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5899bb27-f543-47b0-b26b-168b61aca81a', 'learning_objects', 'example_zh', example_zh, $q$你愿意把窗户关上吗？这里很冷。你出去的时候愿意把窗户关上吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '5899bb27-f543-47b0-b26b-168b61aca81a' and example_zh is distinct from $q$你愿意把窗户关上吗？这里很冷。你出去的时候愿意把窗户关上吗？$q$ and true;
update public.learning_objects set example_zh = $q$你愿意把窗户关上吗？这里很冷。你出去的时候愿意把窗户关上吗？$q$, updated_at = now() where id = '5899bb27-f543-47b0-b26b-168b61aca81a' and example_zh is distinct from $q$你愿意把窗户关上吗？这里很冷。你出去的时候愿意把窗户关上吗？$q$ and true;

-- 5899bb27-f543-47b0-b26b-168b61aca81a: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5899bb27-f543-47b0-b26b-168b61aca81a', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你愿意把窗户关上吗？这里很冷。你出去的时候愿意把窗户关上吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '5899bb27-f543-47b0-b26b-168b61aca81a' and native_language = 'zh' and example_translation is distinct from $q$你愿意把窗户关上吗？这里很冷。你出去的时候愿意把窗户关上吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你愿意把窗户关上吗？这里很冷。你出去的时候愿意把窗户关上吗？$q$, updated_at = now() where learning_object_id = '5899bb27-f543-47b0-b26b-168b61aca81a' and native_language = 'zh' and example_translation is distinct from $q$你愿意把窗户关上吗？这里很冷。你出去的时候愿意把窗户关上吗？$q$ and coalesce(example_translation, '') <> '';

-- 5899bb27-f543-47b0-b26b-168b61aca81a: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5899bb27-f543-47b0-b26b-168b61aca81a', 'learning_object_translations', 'en.example_translation', example_translation, $q$Would you mind closing the window? It's cold in here. Would you mind closing the window when you go out?$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '5899bb27-f543-47b0-b26b-168b61aca81a' and native_language = 'en' and example_translation is distinct from $q$Would you mind closing the window? It's cold in here. Would you mind closing the window when you go out?$q$ and true;
update public.learning_object_translations set example_translation = $q$Would you mind closing the window? It's cold in here. Would you mind closing the window when you go out?$q$, updated_at = now() where learning_object_id = '5899bb27-f543-47b0-b26b-168b61aca81a' and native_language = 'en' and example_translation is distinct from $q$Would you mind closing the window? It's cold in here. Would you mind closing the window when you go out?$q$ and true;

-- 597df7f8-fec0-4f1a-b5b3-592cb70758ae: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '597df7f8-fec0-4f1a-b5b3-592cb70758ae', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$fråga om någon vet vad jag gjorde i går; ofta för att inleda att man berättar det$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '597df7f8-fec0-4f1a-b5b3-592cb70758ae' and swedish_explanation is distinct from $q$fråga om någon vet vad jag gjorde i går; ofta för att inleda att man berättar det$q$ and true;
update public.learning_objects set swedish_explanation = $q$fråga om någon vet vad jag gjorde i går; ofta för att inleda att man berättar det$q$, updated_at = now() where id = '597df7f8-fec0-4f1a-b5b3-592cb70758ae' and swedish_explanation is distinct from $q$fråga om någon vet vad jag gjorde i går; ofta för att inleda att man berättar det$q$ and true;

-- 597df7f8-fec0-4f1a-b5b3-592cb70758ae: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '597df7f8-fec0-4f1a-b5b3-592cb70758ae', 'learning_objects', 'example_zh', example_zh, $q$你知道我昨天做了什么吗？我见到了一位老朋友。你不会相信我昨天做了什么。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '597df7f8-fec0-4f1a-b5b3-592cb70758ae' and example_zh is distinct from $q$你知道我昨天做了什么吗？我见到了一位老朋友。你不会相信我昨天做了什么。$q$ and true;
update public.learning_objects set example_zh = $q$你知道我昨天做了什么吗？我见到了一位老朋友。你不会相信我昨天做了什么。$q$, updated_at = now() where id = '597df7f8-fec0-4f1a-b5b3-592cb70758ae' and example_zh is distinct from $q$你知道我昨天做了什么吗？我见到了一位老朋友。你不会相信我昨天做了什么。$q$ and true;

-- 597df7f8-fec0-4f1a-b5b3-592cb70758ae: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '597df7f8-fec0-4f1a-b5b3-592cb70758ae', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你知道我昨天做了什么吗？我见到了一位老朋友。你不会相信我昨天做了什么。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '597df7f8-fec0-4f1a-b5b3-592cb70758ae' and native_language = 'zh' and example_translation is distinct from $q$你知道我昨天做了什么吗？我见到了一位老朋友。你不会相信我昨天做了什么。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你知道我昨天做了什么吗？我见到了一位老朋友。你不会相信我昨天做了什么。$q$, updated_at = now() where learning_object_id = '597df7f8-fec0-4f1a-b5b3-592cb70758ae' and native_language = 'zh' and example_translation is distinct from $q$你知道我昨天做了什么吗？我见到了一位老朋友。你不会相信我昨天做了什么。$q$ and coalesce(example_translation, '') <> '';

-- 59be7d59-fe82-499e-a3a1-f76f7e506c07: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '59be7d59-fe82-499e-a3a1-f76f7e506c07', 'learning_objects', 'example_zh', example_zh, $q$你在这里工作了多少年？我在这里工作了八年。她在这里工作了多少年？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '59be7d59-fe82-499e-a3a1-f76f7e506c07' and example_zh is distinct from $q$你在这里工作了多少年？我在这里工作了八年。她在这里工作了多少年？$q$ and true;
update public.learning_objects set example_zh = $q$你在这里工作了多少年？我在这里工作了八年。她在这里工作了多少年？$q$, updated_at = now() where id = '59be7d59-fe82-499e-a3a1-f76f7e506c07' and example_zh is distinct from $q$你在这里工作了多少年？我在这里工作了八年。她在这里工作了多少年？$q$ and true;

-- 59be7d59-fe82-499e-a3a1-f76f7e506c07: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '59be7d59-fe82-499e-a3a1-f76f7e506c07', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你在这里工作了多少年？我在这里工作了八年。她在这里工作了多少年？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '59be7d59-fe82-499e-a3a1-f76f7e506c07' and native_language = 'zh' and example_translation is distinct from $q$你在这里工作了多少年？我在这里工作了八年。她在这里工作了多少年？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你在这里工作了多少年？我在这里工作了八年。她在这里工作了多少年？$q$, updated_at = now() where learning_object_id = '59be7d59-fe82-499e-a3a1-f76f7e506c07' and native_language = 'zh' and example_translation is distinct from $q$你在这里工作了多少年？我在这里工作了八年。她在这里工作了多少年？$q$ and coalesce(example_translation, '') <> '';

-- Har du hört talas om …? Have you heard: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5ae8293b-db3e-4f5b-9422-8236f89c70c3', 'learning_objects', 'swedish', swedish, $q$Har du hört talas om …?$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '5ae8293b-db3e-4f5b-9422-8236f89c70c3' and swedish is distinct from $q$Har du hört talas om …?$q$;
update public.learning_objects set swedish = $q$Har du hört talas om …?$q$, updated_at = now() where id = '5ae8293b-db3e-4f5b-9422-8236f89c70c3' and swedish is distinct from $q$Har du hört talas om …?$q$;

-- Har du hört talas om …? Have you heard: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5ae8293b-db3e-4f5b-9422-8236f89c70c3', 'learning_objects', 'match_key', match_key, $q$har du hört talas om ?$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '5ae8293b-db3e-4f5b-9422-8236f89c70c3' and match_key is distinct from $q$har du hört talas om ?$q$;
update public.learning_objects set match_key = $q$har du hört talas om ?$q$, updated_at = now() where id = '5ae8293b-db3e-4f5b-9422-8236f89c70c3' and match_key is distinct from $q$har du hört talas om ?$q$;

-- 5ae8293b-db3e-4f5b-9422-8236f89c70c3: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5ae8293b-db3e-4f5b-9422-8236f89c70c3', 'learning_objects', 'example_zh', example_zh, $q$你听说过这部新电影吗？你听说过这位作家吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '5ae8293b-db3e-4f5b-9422-8236f89c70c3' and example_zh is distinct from $q$你听说过这部新电影吗？你听说过这位作家吗？$q$ and true;
update public.learning_objects set example_zh = $q$你听说过这部新电影吗？你听说过这位作家吗？$q$, updated_at = now() where id = '5ae8293b-db3e-4f5b-9422-8236f89c70c3' and example_zh is distinct from $q$你听说过这部新电影吗？你听说过这位作家吗？$q$ and true;

-- 5ae8293b-db3e-4f5b-9422-8236f89c70c3: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5ae8293b-db3e-4f5b-9422-8236f89c70c3', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你听说过这部新电影吗？你听说过这位作家吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '5ae8293b-db3e-4f5b-9422-8236f89c70c3' and native_language = 'zh' and example_translation is distinct from $q$你听说过这部新电影吗？你听说过这位作家吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你听说过这部新电影吗？你听说过这位作家吗？$q$, updated_at = now() where learning_object_id = '5ae8293b-db3e-4f5b-9422-8236f89c70c3' and native_language = 'zh' and example_translation is distinct from $q$你听说过这部新电影吗？你听说过这位作家吗？$q$ and coalesce(example_translation, '') <> '';

-- 63d7fc52-2527-4a05-96d6-0aa232707762: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '63d7fc52-2527-4a05-96d6-0aa232707762', 'learning_objects', 'example_zh', example_zh, $q$代我向家人问好！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '63d7fc52-2527-4a05-96d6-0aa232707762' and example_zh is distinct from $q$代我向家人问好！$q$ and true;
update public.learning_objects set example_zh = $q$代我向家人问好！$q$, updated_at = now() where id = '63d7fc52-2527-4a05-96d6-0aa232707762' and example_zh is distinct from $q$代我向家人问好！$q$ and true;

-- 63d7fc52-2527-4a05-96d6-0aa232707762: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '63d7fc52-2527-4a05-96d6-0aa232707762', 'learning_object_translations', 'zh.example_translation', example_translation, $q$代我向家人问好！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '63d7fc52-2527-4a05-96d6-0aa232707762' and native_language = 'zh' and example_translation is distinct from $q$代我向家人问好！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$代我向家人问好！$q$, updated_at = now() where learning_object_id = '63d7fc52-2527-4a05-96d6-0aa232707762' and native_language = 'zh' and example_translation is distinct from $q$代我向家人问好！$q$ and coalesce(example_translation, '') <> '';

-- 661af8e2-794b-4111-a268-c73af7f36fda: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '661af8e2-794b-4111-a268-c73af7f36fda', 'learning_objects', 'example_zh', example_zh, $q$你总该能帮我吧？你也许可以把窗户关上。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '661af8e2-794b-4111-a268-c73af7f36fda' and example_zh is distinct from $q$你总该能帮我吧？你也许可以把窗户关上。$q$ and true;
update public.learning_objects set example_zh = $q$你总该能帮我吧？你也许可以把窗户关上。$q$, updated_at = now() where id = '661af8e2-794b-4111-a268-c73af7f36fda' and example_zh is distinct from $q$你总该能帮我吧？你也许可以把窗户关上。$q$ and true;

-- 661af8e2-794b-4111-a268-c73af7f36fda: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '661af8e2-794b-4111-a268-c73af7f36fda', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你总该能帮我吧？你也许可以把窗户关上。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '661af8e2-794b-4111-a268-c73af7f36fda' and native_language = 'zh' and example_translation is distinct from $q$你总该能帮我吧？你也许可以把窗户关上。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你总该能帮我吧？你也许可以把窗户关上。$q$, updated_at = now() where learning_object_id = '661af8e2-794b-4111-a268-c73af7f36fda' and native_language = 'zh' and example_translation is distinct from $q$你总该能帮我吧？你也许可以把窗户关上。$q$ and coalesce(example_translation, '') <> '';

-- 684b9ac2-8888-41b9-b941-719533f0d6c3: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '684b9ac2-8888-41b9-b941-719533f0d6c3', 'learning_object_examples', 'insert', null, $q$Hur dum får man vara, tänkte hon.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '684b9ac2-8888-41b9-b941-719533f0d6c3' and example_swedish = $q$Hur dum får man vara, tänkte hon.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '684b9ac2-8888-41b9-b941-719533f0d6c3', $q$Hur dum får man vara, tänkte hon.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '684b9ac2-8888-41b9-b941-719533f0d6c3' and example_swedish = $q$Hur dum får man vara, tänkte hon.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$怎么能这么笨$q$ from x union all select id, 'en', $q$"How stupid can someone be?" she thought.$q$ from x;

-- 684b9ac2-8888-41b9-b941-719533f0d6c3: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '684b9ac2-8888-41b9-b941-719533f0d6c3', 'learning_object_examples', 'insert', null, $q$Du glömde nycklarna igen? Hur dum får man vara?$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '684b9ac2-8888-41b9-b941-719533f0d6c3' and example_swedish = $q$Du glömde nycklarna igen? Hur dum får man vara?$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '684b9ac2-8888-41b9-b941-719533f0d6c3', $q$Du glömde nycklarna igen? Hur dum får man vara?$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '684b9ac2-8888-41b9-b941-719533f0d6c3' and example_swedish = $q$Du glömde nycklarna igen? Hur dum får man vara?$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$你又忘带钥匙了？怎么能笨成这样？$q$ from x union all select id, 'en', $q$You forgot the keys again? How stupid can you be?$q$ from x;

-- Nej, vadå berätta? Berätta! No, what, tell me?: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '68a6b735-95e9-4ab5-af68-a9fcba85797e', 'learning_objects', 'swedish', swedish, $q$Nej, vadå berätta? Berätta!$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '68a6b735-95e9-4ab5-af68-a9fcba85797e' and swedish is distinct from $q$Nej, vadå berätta? Berätta!$q$;
update public.learning_objects set swedish = $q$Nej, vadå berätta? Berätta!$q$, updated_at = now() where id = '68a6b735-95e9-4ab5-af68-a9fcba85797e' and swedish is distinct from $q$Nej, vadå berätta? Berätta!$q$;

-- Nej, vadå berätta? Berätta! No, what, tell me?: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '68a6b735-95e9-4ab5-af68-a9fcba85797e', 'learning_objects', 'match_key', match_key, $q$nej vadå berätta berätta$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '68a6b735-95e9-4ab5-af68-a9fcba85797e' and match_key is distinct from $q$nej vadå berätta berätta$q$;
update public.learning_objects set match_key = $q$nej vadå berätta berätta$q$, updated_at = now() where id = '68a6b735-95e9-4ab5-af68-a9fcba85797e' and match_key is distinct from $q$nej vadå berätta berätta$q$;

-- f5d7d85d-f211-41e8-bc17-458c935aac34: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f5d7d85d-f211-41e8-bc17-458c935aac34', 'learning_objects', 'example_zh', example_zh, $q$一个好公民会帮助他人。在日常生活中要体谅别人。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'f5d7d85d-f211-41e8-bc17-458c935aac34' and example_zh is distinct from $q$一个好公民会帮助他人。在日常生活中要体谅别人。$q$ and true;
update public.learning_objects set example_zh = $q$一个好公民会帮助他人。在日常生活中要体谅别人。$q$, updated_at = now() where id = 'f5d7d85d-f211-41e8-bc17-458c935aac34' and example_zh is distinct from $q$一个好公民会帮助他人。在日常生活中要体谅别人。$q$ and true;

-- f5d7d85d-f211-41e8-bc17-458c935aac34: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f5d7d85d-f211-41e8-bc17-458c935aac34', 'learning_object_translations', 'zh.example_translation', example_translation, $q$一个好公民会帮助他人。在日常生活中要体谅别人。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'f5d7d85d-f211-41e8-bc17-458c935aac34' and native_language = 'zh' and example_translation is distinct from $q$一个好公民会帮助他人。在日常生活中要体谅别人。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$一个好公民会帮助他人。在日常生活中要体谅别人。$q$, updated_at = now() where learning_object_id = 'f5d7d85d-f211-41e8-bc17-458c935aac34' and native_language = 'zh' and example_translation is distinct from $q$一个好公民会帮助他人。在日常生活中要体谅别人。$q$ and coalesce(example_translation, '') <> '';

-- -Hej! Det var länge sedan! Hi!: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6b93ad2c-8c91-4e3e-94f6-0d25212ada2e', 'learning_objects', 'swedish', swedish, $q$Hej! Det var länge sedan!$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '6b93ad2c-8c91-4e3e-94f6-0d25212ada2e' and swedish is distinct from $q$Hej! Det var länge sedan!$q$;
update public.learning_objects set swedish = $q$Hej! Det var länge sedan!$q$, updated_at = now() where id = '6b93ad2c-8c91-4e3e-94f6-0d25212ada2e' and swedish is distinct from $q$Hej! Det var länge sedan!$q$;

-- -Hej! Det var länge sedan! Hi!: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6b93ad2c-8c91-4e3e-94f6-0d25212ada2e', 'learning_objects', 'match_key', match_key, $q$hej det var länge sedan$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '6b93ad2c-8c91-4e3e-94f6-0d25212ada2e' and match_key is distinct from $q$hej det var länge sedan$q$;
update public.learning_objects set match_key = $q$hej det var länge sedan$q$, updated_at = now() where id = '6b93ad2c-8c91-4e3e-94f6-0d25212ada2e' and match_key is distinct from $q$hej det var länge sedan$q$;

-- 6b93ad2c-8c91-4e3e-94f6-0d25212ada2e: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6b93ad2c-8c91-4e3e-94f6-0d25212ada2e', 'learning_object_translations', 'en.example_translation', example_translation, $q$Hi! Long time no see! How are you? Yes, really, it’s been a long time.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '6b93ad2c-8c91-4e3e-94f6-0d25212ada2e' and native_language = 'en' and example_translation is distinct from $q$Hi! Long time no see! How are you? Yes, really, it’s been a long time.$q$ and true;
update public.learning_object_translations set example_translation = $q$Hi! Long time no see! How are you? Yes, really, it’s been a long time.$q$, updated_at = now() where learning_object_id = '6b93ad2c-8c91-4e3e-94f6-0d25212ada2e' and native_language = 'en' and example_translation is distinct from $q$Hi! Long time no see! How are you? Yes, really, it’s been a long time.$q$ and true;

-- 67e02a0f-776e-4dc5-a83e-7102a0d30093: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '67e02a0f-776e-4dc5-a83e-7102a0d30093', 'learning_objects', 'example_zh', example_zh, $q$一共是85克朗。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '67e02a0f-776e-4dc5-a83e-7102a0d30093' and example_zh is distinct from $q$一共是85克朗。$q$ and true;
update public.learning_objects set example_zh = $q$一共是85克朗。$q$, updated_at = now() where id = '67e02a0f-776e-4dc5-a83e-7102a0d30093' and example_zh is distinct from $q$一共是85克朗。$q$ and true;

-- 67e02a0f-776e-4dc5-a83e-7102a0d30093: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '67e02a0f-776e-4dc5-a83e-7102a0d30093', 'learning_object_translations', 'zh.example_translation', example_translation, $q$一共是85克朗。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '67e02a0f-776e-4dc5-a83e-7102a0d30093' and native_language = 'zh' and example_translation is distinct from $q$一共是85克朗。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$一共是85克朗。$q$, updated_at = now() where learning_object_id = '67e02a0f-776e-4dc5-a83e-7102a0d30093' and native_language = 'zh' and example_translation is distinct from $q$一共是85克朗。$q$ and coalesce(example_translation, '') <> '';

-- Va?! Du skojar! What?!: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '71f5a2a3-56a4-444c-9a87-82a396313165', 'learning_objects', 'swedish', swedish, $q$Va?! Du skojar!$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '71f5a2a3-56a4-444c-9a87-82a396313165' and swedish is distinct from $q$Va?! Du skojar!$q$;
update public.learning_objects set swedish = $q$Va?! Du skojar!$q$, updated_at = now() where id = '71f5a2a3-56a4-444c-9a87-82a396313165' and swedish is distinct from $q$Va?! Du skojar!$q$;

-- Va?! Du skojar! What?!: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '71f5a2a3-56a4-444c-9a87-82a396313165', 'learning_objects', 'match_key', match_key, $q$va du skojar$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '71f5a2a3-56a4-444c-9a87-82a396313165' and match_key is distinct from $q$va du skojar$q$;
update public.learning_objects set match_key = $q$va du skojar$q$, updated_at = now() where id = '71f5a2a3-56a4-444c-9a87-82a396313165' and match_key is distinct from $q$va du skojar$q$;

-- 71f5a2a3-56a4-444c-9a87-82a396313165: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '71f5a2a3-56a4-444c-9a87-82a396313165', 'learning_objects', 'example_zh', example_zh, $q$什么？！你在开玩笑吧，你已经到了？什么？！你在开玩笑吧，你要搬去挪威？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '71f5a2a3-56a4-444c-9a87-82a396313165' and example_zh is distinct from $q$什么？！你在开玩笑吧，你已经到了？什么？！你在开玩笑吧，你要搬去挪威？$q$ and true;
update public.learning_objects set example_zh = $q$什么？！你在开玩笑吧，你已经到了？什么？！你在开玩笑吧，你要搬去挪威？$q$, updated_at = now() where id = '71f5a2a3-56a4-444c-9a87-82a396313165' and example_zh is distinct from $q$什么？！你在开玩笑吧，你已经到了？什么？！你在开玩笑吧，你要搬去挪威？$q$ and true;

-- 71f5a2a3-56a4-444c-9a87-82a396313165: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '71f5a2a3-56a4-444c-9a87-82a396313165', 'learning_object_translations', 'zh.example_translation', example_translation, $q$什么？！你在开玩笑吧，你已经到了？什么？！你在开玩笑吧，你要搬去挪威？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '71f5a2a3-56a4-444c-9a87-82a396313165' and native_language = 'zh' and example_translation is distinct from $q$什么？！你在开玩笑吧，你已经到了？什么？！你在开玩笑吧，你要搬去挪威？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$什么？！你在开玩笑吧，你已经到了？什么？！你在开玩笑吧，你要搬去挪威？$q$, updated_at = now() where learning_object_id = '71f5a2a3-56a4-444c-9a87-82a396313165' and native_language = 'zh' and example_translation is distinct from $q$什么？！你在开玩笑吧，你已经到了？什么？！你在开玩笑吧，你要搬去挪威？$q$ and coalesce(example_translation, '') <> '';

-- 7379cf11-5589-475c-be39-00afcfface29: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7379cf11-5589-475c-be39-00afcfface29', 'learning_object_examples', 'insert', null, $q$Om jag kan komma beror på situationen.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '7379cf11-5589-475c-be39-00afcfface29' and example_swedish = $q$Om jag kan komma beror på situationen.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '7379cf11-5589-475c-be39-00afcfface29', $q$Om jag kan komma beror på situationen.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '7379cf11-5589-475c-be39-00afcfface29' and example_swedish = $q$Om jag kan komma beror på situationen.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$我能不能来，要看情况。$q$ from x union all select id, 'en', $q$Whether I can come depends on the situation.$q$ from x;

-- 7379cf11-5589-475c-be39-00afcfface29: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7379cf11-5589-475c-be39-00afcfface29', 'learning_object_examples', 'insert', null, $q$Det beror på situationen, men oftast säger vi ja.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '7379cf11-5589-475c-be39-00afcfface29' and example_swedish = $q$Det beror på situationen, men oftast säger vi ja.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '7379cf11-5589-475c-be39-00afcfface29', $q$Det beror på situationen, men oftast säger vi ja.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '7379cf11-5589-475c-be39-00afcfface29' and example_swedish = $q$Det beror på situationen, men oftast säger vi ja.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$要看情况，不过我们通常会说可以。$q$ from x union all select id, 'en', $q$It depends on the situation, but we usually say yes.$q$ from x;

-- 76f0fb71-b54e-4189-851a-7da0ff511204: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '76f0fb71-b54e-4189-851a-7da0ff511204', 'learning_objects', 'example_zh', example_zh, $q$我最近工作很忙。你呢？我很好，谢谢。你呢？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '76f0fb71-b54e-4189-851a-7da0ff511204' and example_zh is distinct from $q$我最近工作很忙。你呢？我很好，谢谢。你呢？$q$ and true;
update public.learning_objects set example_zh = $q$我最近工作很忙。你呢？我很好，谢谢。你呢？$q$, updated_at = now() where id = '76f0fb71-b54e-4189-851a-7da0ff511204' and example_zh is distinct from $q$我最近工作很忙。你呢？我很好，谢谢。你呢？$q$ and true;

-- 76f0fb71-b54e-4189-851a-7da0ff511204: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '76f0fb71-b54e-4189-851a-7da0ff511204', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我最近工作很忙。你呢？我很好，谢谢。你呢？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '76f0fb71-b54e-4189-851a-7da0ff511204' and native_language = 'zh' and example_translation is distinct from $q$我最近工作很忙。你呢？我很好，谢谢。你呢？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我最近工作很忙。你呢？我很好，谢谢。你呢？$q$, updated_at = now() where learning_object_id = '76f0fb71-b54e-4189-851a-7da0ff511204' and native_language = 'zh' and example_translation is distinct from $q$我最近工作很忙。你呢？我很好，谢谢。你呢？$q$ and coalesce(example_translation, '') <> '';

-- 76f0fb71-b54e-4189-851a-7da0ff511204: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '76f0fb71-b54e-4189-851a-7da0ff511204', 'learning_object_translations', 'en.example_translation', example_translation, $q$I’m working a lot right now. And you? I’m fine, thanks. And you?$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '76f0fb71-b54e-4189-851a-7da0ff511204' and native_language = 'en' and example_translation is distinct from $q$I’m working a lot right now. And you? I’m fine, thanks. And you?$q$ and true;
update public.learning_object_translations set example_translation = $q$I’m working a lot right now. And you? I’m fine, thanks. And you?$q$, updated_at = now() where learning_object_id = '76f0fb71-b54e-4189-851a-7da0ff511204' and native_language = 'en' and example_translation is distinct from $q$I’m working a lot right now. And you? I’m fine, thanks. And you?$q$ and true;

-- 7904aaff-9923-4485-86fc-86ec459f413b: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7904aaff-9923-4485-86fc-86ec459f413b', 'learning_object_examples', 'insert', null, $q$Han är lagd åt det försiktiga hållet.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '7904aaff-9923-4485-86fc-86ec459f413b' and example_swedish = $q$Han är lagd åt det försiktiga hållet.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '7904aaff-9923-4485-86fc-86ec459f413b', $q$Han är lagd åt det försiktiga hållet.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '7904aaff-9923-4485-86fc-86ec459f413b' and example_swedish = $q$Han är lagd åt det försiktiga hållet.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$他性格偏谨慎。$q$ from x union all select id, 'en', $q$He tends to be on the cautious side.$q$ from x;

-- 7904aaff-9923-4485-86fc-86ec459f413b: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7904aaff-9923-4485-86fc-86ec459f413b', 'learning_object_examples', 'insert', null, $q$Hon är lagd åt att oroa sig mycket.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '7904aaff-9923-4485-86fc-86ec459f413b' and example_swedish = $q$Hon är lagd åt att oroa sig mycket.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '7904aaff-9923-4485-86fc-86ec459f413b', $q$Hon är lagd åt att oroa sig mycket.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '7904aaff-9923-4485-86fc-86ec459f413b' and example_swedish = $q$Hon är lagd åt att oroa sig mycket.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$她天生爱操心。$q$ from x union all select id, 'en', $q$She is inclined to worry a lot.$q$ from x;

-- 7b20e1ac-900c-4f00-82ef-9129c945185a: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7b20e1ac-900c-4f00-82ef-9129c945185a', 'learning_object_examples', 'insert', null, $q$Jaså, ni flyttar redan nästa vecka? Det hade jag ingen aning om.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '7b20e1ac-900c-4f00-82ef-9129c945185a' and example_swedish = $q$Jaså, ni flyttar redan nästa vecka? Det hade jag ingen aning om.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '7b20e1ac-900c-4f00-82ef-9129c945185a', $q$Jaså, ni flyttar redan nästa vecka? Det hade jag ingen aning om.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '7b20e1ac-900c-4f00-82ef-9129c945185a' and example_swedish = $q$Jaså, ni flyttar redan nästa vecka? Det hade jag ingen aning om.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$哦，真的吗？你们下周就要搬家了？这我一点都不知道。$q$ from x union all select id, 'en', $q$Oh, really? You're moving as early as next week? I had no idea.$q$ from x;

-- 7b20e1ac-900c-4f00-82ef-9129c945185a: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7b20e1ac-900c-4f00-82ef-9129c945185a', 'learning_object_examples', 'insert', null, $q$Hon berättade det först i går, så det hade jag ingen aning om.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '7b20e1ac-900c-4f00-82ef-9129c945185a' and example_swedish = $q$Hon berättade det först i går, så det hade jag ingen aning om.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '7b20e1ac-900c-4f00-82ef-9129c945185a', $q$Hon berättade det först i går, så det hade jag ingen aning om.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '7b20e1ac-900c-4f00-82ef-9129c945185a' and example_swedish = $q$Hon berättade det först i går, så det hade jag ingen aning om.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$她直到昨天才告诉我，所以这我一点都不知道。$q$ from x union all select id, 'en', $q$She only told me yesterday, so I had no idea.$q$ from x;

-- 7bb44832-282e-484a-8580-ab57e108e833: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7bb44832-282e-484a-8580-ab57e108e833', 'learning_object_examples', 'insert', null, $q$- Jag har förlorat min plånbok. - Det var tråkigt att höra.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '7bb44832-282e-484a-8580-ab57e108e833' and example_swedish = $q$- Jag har förlorat min plånbok. - Det var tråkigt att höra.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '7bb44832-282e-484a-8580-ab57e108e833', $q$- Jag har förlorat min plånbok. - Det var tråkigt att höra.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '7bb44832-282e-484a-8580-ab57e108e833' and example_swedish = $q$- Jag har förlorat min plånbok. - Det var tråkigt att höra.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$—我的钱包丢了。—听到这个真遗憾。$q$ from x union all select id, 'en', $q$- I’ve lost my wallet. - I’m sorry to hear that.$q$ from x;

-- 7bb44832-282e-484a-8580-ab57e108e833: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7bb44832-282e-484a-8580-ab57e108e833', 'learning_object_examples', 'insert', null, $q$Det var tråkigt att höra att du är sjuk.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '7bb44832-282e-484a-8580-ab57e108e833' and example_swedish = $q$Det var tråkigt att höra att du är sjuk.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '7bb44832-282e-484a-8580-ab57e108e833', $q$Det var tråkigt att höra att du är sjuk.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '7bb44832-282e-484a-8580-ab57e108e833' and example_swedish = $q$Det var tråkigt att höra att du är sjuk.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$听说你病了，真遗憾。$q$ from x union all select id, 'en', $q$I’m sorry to hear that you’re ill.$q$ from x;

-- 7dc90c34-0b63-403d-b4f9-0976c956b923: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7dc90c34-0b63-403d-b4f9-0976c956b923', 'learning_object_examples', 'insert', null, $q$Gott nytt år!$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '7dc90c34-0b63-403d-b4f9-0976c956b923' and example_swedish = $q$Gott nytt år!$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '7dc90c34-0b63-403d-b4f9-0976c956b923', $q$Gott nytt år!$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '7dc90c34-0b63-403d-b4f9-0976c956b923' and example_swedish = $q$Gott nytt år!$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$新年快乐！$q$ from x union all select id, 'en', $q$Happy New Year!$q$ from x;

-- 7dc90c34-0b63-403d-b4f9-0976c956b923: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7dc90c34-0b63-403d-b4f9-0976c956b923', 'learning_object_examples', 'insert', null, $q$Vi önskar er ett gott nytt år.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '7dc90c34-0b63-403d-b4f9-0976c956b923' and example_swedish = $q$Vi önskar er ett gott nytt år.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '7dc90c34-0b63-403d-b4f9-0976c956b923', $q$Vi önskar er ett gott nytt år.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '7dc90c34-0b63-403d-b4f9-0976c956b923' and example_swedish = $q$Vi önskar er ett gott nytt år.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$我们祝你们新年快乐。$q$ from x union all select id, 'en', $q$We wish you a happy new year.$q$ from x;

-- 7ed0f34e-2546-4931-b0b8-5dc56e37d27f: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7ed0f34e-2546-4931-b0b8-5dc56e37d27f', 'learning_objects', 'example_zh', example_zh, $q$去柏林的航班什么时候起飞？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '7ed0f34e-2546-4931-b0b8-5dc56e37d27f' and example_zh is distinct from $q$去柏林的航班什么时候起飞？$q$ and true;
update public.learning_objects set example_zh = $q$去柏林的航班什么时候起飞？$q$, updated_at = now() where id = '7ed0f34e-2546-4931-b0b8-5dc56e37d27f' and example_zh is distinct from $q$去柏林的航班什么时候起飞？$q$ and true;

-- 7ed0f34e-2546-4931-b0b8-5dc56e37d27f: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7ed0f34e-2546-4931-b0b8-5dc56e37d27f', 'learning_object_translations', 'zh.example_translation', example_translation, $q$去柏林的航班什么时候起飞？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '7ed0f34e-2546-4931-b0b8-5dc56e37d27f' and native_language = 'zh' and example_translation is distinct from $q$去柏林的航班什么时候起飞？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$去柏林的航班什么时候起飞？$q$, updated_at = now() where learning_object_id = '7ed0f34e-2546-4931-b0b8-5dc56e37d27f' and native_language = 'zh' and example_translation is distinct from $q$去柏林的航班什么时候起飞？$q$ and coalesce(example_translation, '') <> '';

-- 7f35077c-abd3-4b8a-b394-14cf754d9af2: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7f35077c-abd3-4b8a-b394-14cf754d9af2', 'learning_objects', 'example_zh', example_zh, $q$那辆车后来怎么样了？他出事故以后怎么样了？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '7f35077c-abd3-4b8a-b394-14cf754d9af2' and example_zh is distinct from $q$那辆车后来怎么样了？他出事故以后怎么样了？$q$ and true;
update public.learning_objects set example_zh = $q$那辆车后来怎么样了？他出事故以后怎么样了？$q$, updated_at = now() where id = '7f35077c-abd3-4b8a-b394-14cf754d9af2' and example_zh is distinct from $q$那辆车后来怎么样了？他出事故以后怎么样了？$q$ and true;

-- 7f35077c-abd3-4b8a-b394-14cf754d9af2: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7f35077c-abd3-4b8a-b394-14cf754d9af2', 'learning_object_translations', 'zh.example_translation', example_translation, $q$那辆车后来怎么样了？他出事故以后怎么样了？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '7f35077c-abd3-4b8a-b394-14cf754d9af2' and native_language = 'zh' and example_translation is distinct from $q$那辆车后来怎么样了？他出事故以后怎么样了？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$那辆车后来怎么样了？他出事故以后怎么样了？$q$, updated_at = now() where learning_object_id = '7f35077c-abd3-4b8a-b394-14cf754d9af2' and native_language = 'zh' and example_translation is distinct from $q$那辆车后来怎么样了？他出事故以后怎么样了？$q$ and coalesce(example_translation, '') <> '';

-- 829f53f0-c4a0-4329-94c0-8f02cb1b675c: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '829f53f0-c4a0-4329-94c0-8f02cb1b675c', 'learning_objects', 'example_zh', example_zh, $q$今天很暖和。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '829f53f0-c4a0-4329-94c0-8f02cb1b675c' and example_zh is distinct from $q$今天很暖和。$q$ and true;
update public.learning_objects set example_zh = $q$今天很暖和。$q$, updated_at = now() where id = '829f53f0-c4a0-4329-94c0-8f02cb1b675c' and example_zh is distinct from $q$今天很暖和。$q$ and true;

-- 829f53f0-c4a0-4329-94c0-8f02cb1b675c: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '829f53f0-c4a0-4329-94c0-8f02cb1b675c', 'learning_object_translations', 'zh.example_translation', example_translation, $q$今天很暖和。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '829f53f0-c4a0-4329-94c0-8f02cb1b675c' and native_language = 'zh' and example_translation is distinct from $q$今天很暖和。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$今天很暖和。$q$, updated_at = now() where learning_object_id = '829f53f0-c4a0-4329-94c0-8f02cb1b675c' and native_language = 'zh' and example_translation is distinct from $q$今天很暖和。$q$ and coalesce(example_translation, '') <> '';

-- 829f53f0-c4a0-4329-94c0-8f02cb1b675c: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '829f53f0-c4a0-4329-94c0-8f02cb1b675c', 'learning_object_translations', 'en.example_translation', example_translation, $q$It’s warm today.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '829f53f0-c4a0-4329-94c0-8f02cb1b675c' and native_language = 'en' and example_translation is distinct from $q$It’s warm today.$q$ and true;
update public.learning_object_translations set example_translation = $q$It’s warm today.$q$, updated_at = now() where learning_object_id = '829f53f0-c4a0-4329-94c0-8f02cb1b675c' and native_language = 'en' and example_translation is distinct from $q$It’s warm today.$q$ and true;

-- e.kr. Efter Kristus A.D.: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8ba692e2-aa19-460c-88a0-0fce7ce8d882', 'learning_objects', 'swedish', swedish, $q$e.Kr.$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '8ba692e2-aa19-460c-88a0-0fce7ce8d882' and swedish is distinct from $q$e.Kr.$q$;
update public.learning_objects set swedish = $q$e.Kr.$q$, updated_at = now() where id = '8ba692e2-aa19-460c-88a0-0fce7ce8d882' and swedish is distinct from $q$e.Kr.$q$;

-- e.kr. Efter Kristus A.D.: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8ba692e2-aa19-460c-88a0-0fce7ce8d882', 'learning_objects', 'match_key', match_key, $q$e kr$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '8ba692e2-aa19-460c-88a0-0fce7ce8d882' and match_key is distinct from $q$e kr$q$;
update public.learning_objects set match_key = $q$e kr$q$, updated_at = now() where id = '8ba692e2-aa19-460c-88a0-0fce7ce8d882' and match_key is distinct from $q$e kr$q$;

-- 8ba692e2-aa19-460c-88a0-0fce7ce8d882: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8ba692e2-aa19-460c-88a0-0fce7ce8d882', 'learning_objects', 'example_zh', example_zh, $q$这座城市建于公元120年。这里曾在公元900年写下一篇文本。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8ba692e2-aa19-460c-88a0-0fce7ce8d882' and example_zh is distinct from $q$这座城市建于公元120年。这里曾在公元900年写下一篇文本。$q$ and true;
update public.learning_objects set example_zh = $q$这座城市建于公元120年。这里曾在公元900年写下一篇文本。$q$, updated_at = now() where id = '8ba692e2-aa19-460c-88a0-0fce7ce8d882' and example_zh is distinct from $q$这座城市建于公元120年。这里曾在公元900年写下一篇文本。$q$ and true;

-- 8ba692e2-aa19-460c-88a0-0fce7ce8d882: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8ba692e2-aa19-460c-88a0-0fce7ce8d882', 'learning_object_translations', 'zh.example_translation', example_translation, $q$这座城市建于公元120年。这里曾在公元900年写下一篇文本。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8ba692e2-aa19-460c-88a0-0fce7ce8d882' and native_language = 'zh' and example_translation is distinct from $q$这座城市建于公元120年。这里曾在公元900年写下一篇文本。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$这座城市建于公元120年。这里曾在公元900年写下一篇文本。$q$, updated_at = now() where learning_object_id = '8ba692e2-aa19-460c-88a0-0fce7ce8d882' and native_language = 'zh' and example_translation is distinct from $q$这座城市建于公元120年。这里曾在公元900年写下一篇文本。$q$ and coalesce(example_translation, '') <> '';

-- 8d00771a-b457-468a-96e7-bc0262d70136: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8d00771a-b457-468a-96e7-bc0262d70136', 'learning_objects', 'example_zh', example_zh, $q$“thank you” 用瑞典语怎么说？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8d00771a-b457-468a-96e7-bc0262d70136' and example_zh is distinct from $q$“thank you” 用瑞典语怎么说？$q$ and true;
update public.learning_objects set example_zh = $q$“thank you” 用瑞典语怎么说？$q$, updated_at = now() where id = '8d00771a-b457-468a-96e7-bc0262d70136' and example_zh is distinct from $q$“thank you” 用瑞典语怎么说？$q$ and true;

-- 8d00771a-b457-468a-96e7-bc0262d70136: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8d00771a-b457-468a-96e7-bc0262d70136', 'learning_object_translations', 'zh.example_translation', example_translation, $q$“thank you” 用瑞典语怎么说？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8d00771a-b457-468a-96e7-bc0262d70136' and native_language = 'zh' and example_translation is distinct from $q$“thank you” 用瑞典语怎么说？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$“thank you” 用瑞典语怎么说？$q$, updated_at = now() where learning_object_id = '8d00771a-b457-468a-96e7-bc0262d70136' and native_language = 'zh' and example_translation is distinct from $q$“thank you” 用瑞典语怎么说？$q$ and coalesce(example_translation, '') <> '';

-- 8d47a88a-48cf-4d04-a631-1fefe6e3926d: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8d47a88a-48cf-4d04-a631-1fefe6e3926d', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$en fråga man ställer när man vill betala på restaurang$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8d47a88a-48cf-4d04-a631-1fefe6e3926d' and swedish_explanation is distinct from $q$en fråga man ställer när man vill betala på restaurang$q$ and true;
update public.learning_objects set swedish_explanation = $q$en fråga man ställer när man vill betala på restaurang$q$, updated_at = now() where id = '8d47a88a-48cf-4d04-a631-1fefe6e3926d' and swedish_explanation is distinct from $q$en fråga man ställer när man vill betala på restaurang$q$ and true;

-- 8d47a88a-48cf-4d04-a631-1fefe6e3926d: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8d47a88a-48cf-4d04-a631-1fefe6e3926d', 'learning_objects', 'example_zh', example_zh, $q$不好意思，我们可以结账吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8d47a88a-48cf-4d04-a631-1fefe6e3926d' and example_zh is distinct from $q$不好意思，我们可以结账吗？$q$ and true;
update public.learning_objects set example_zh = $q$不好意思，我们可以结账吗？$q$, updated_at = now() where id = '8d47a88a-48cf-4d04-a631-1fefe6e3926d' and example_zh is distinct from $q$不好意思，我们可以结账吗？$q$ and true;

-- 8d47a88a-48cf-4d04-a631-1fefe6e3926d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8d47a88a-48cf-4d04-a631-1fefe6e3926d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$不好意思，我们可以结账吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8d47a88a-48cf-4d04-a631-1fefe6e3926d' and native_language = 'zh' and example_translation is distinct from $q$不好意思，我们可以结账吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$不好意思，我们可以结账吗？$q$, updated_at = now() where learning_object_id = '8d47a88a-48cf-4d04-a631-1fefe6e3926d' and native_language = 'zh' and example_translation is distinct from $q$不好意思，我们可以结账吗？$q$ and coalesce(example_translation, '') <> '';

-- 8ebd2300-11ba-44ff-8caa-eb934d97ee07: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8ebd2300-11ba-44ff-8caa-eb934d97ee07', 'learning_objects', 'example_zh', example_zh, $q$瑞典在这个地区是第二大的。这是这个国家第二大的城市。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8ebd2300-11ba-44ff-8caa-eb934d97ee07' and example_zh is distinct from $q$瑞典在这个地区是第二大的。这是这个国家第二大的城市。$q$ and true;
update public.learning_objects set example_zh = $q$瑞典在这个地区是第二大的。这是这个国家第二大的城市。$q$, updated_at = now() where id = '8ebd2300-11ba-44ff-8caa-eb934d97ee07' and example_zh is distinct from $q$瑞典在这个地区是第二大的。这是这个国家第二大的城市。$q$ and true;

-- 8ebd2300-11ba-44ff-8caa-eb934d97ee07: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8ebd2300-11ba-44ff-8caa-eb934d97ee07', 'learning_object_translations', 'zh.example_translation', example_translation, $q$瑞典在这个地区是第二大的。这是这个国家第二大的城市。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8ebd2300-11ba-44ff-8caa-eb934d97ee07' and native_language = 'zh' and example_translation is distinct from $q$瑞典在这个地区是第二大的。这是这个国家第二大的城市。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$瑞典在这个地区是第二大的。这是这个国家第二大的城市。$q$, updated_at = now() where learning_object_id = '8ebd2300-11ba-44ff-8caa-eb934d97ee07' and native_language = 'zh' and example_translation is distinct from $q$瑞典在这个地区是第二大的。这是这个国家第二大的城市。$q$ and coalesce(example_translation, '') <> '';

-- 8fa7ace7-9348-44d3-a0fa-8aab4cebb15b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8fa7ace7-9348-44d3-a0fa-8aab4cebb15b', 'learning_objects', 'example_zh', example_zh, $q$这件黑色夹克多少钱？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8fa7ace7-9348-44d3-a0fa-8aab4cebb15b' and example_zh is distinct from $q$这件黑色夹克多少钱？$q$ and true;
update public.learning_objects set example_zh = $q$这件黑色夹克多少钱？$q$, updated_at = now() where id = '8fa7ace7-9348-44d3-a0fa-8aab4cebb15b' and example_zh is distinct from $q$这件黑色夹克多少钱？$q$ and true;

-- 8fa7ace7-9348-44d3-a0fa-8aab4cebb15b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8fa7ace7-9348-44d3-a0fa-8aab4cebb15b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$这件黑色夹克多少钱？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8fa7ace7-9348-44d3-a0fa-8aab4cebb15b' and native_language = 'zh' and example_translation is distinct from $q$这件黑色夹克多少钱？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$这件黑色夹克多少钱？$q$, updated_at = now() where learning_object_id = '8fa7ace7-9348-44d3-a0fa-8aab4cebb15b' and native_language = 'zh' and example_translation is distinct from $q$这件黑色夹克多少钱？$q$ and coalesce(example_translation, '') <> '';

-- 96e2eb96-83c2-4053-93af-2325cdfd376c: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '96e2eb96-83c2-4053-93af-2325cdfd376c', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$hälsning i slutet av ett meddelande eller brev$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '96e2eb96-83c2-4053-93af-2325cdfd376c' and swedish_explanation is distinct from $q$hälsning i slutet av ett meddelande eller brev$q$ and true;
update public.learning_objects set swedish_explanation = $q$hälsning i slutet av ett meddelande eller brev$q$, updated_at = now() where id = '96e2eb96-83c2-4053-93af-2325cdfd376c' and swedish_explanation is distinct from $q$hälsning i slutet av ett meddelande eller brev$q$ and true;

-- 96e2eb96-83c2-4053-93af-2325cdfd376c: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '96e2eb96-83c2-4053-93af-2325cdfd376c', 'learning_objects', 'example_zh', example_zh, $q$很快见。抱抱！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '96e2eb96-83c2-4053-93af-2325cdfd376c' and example_zh is distinct from $q$很快见。抱抱！$q$ and true;
update public.learning_objects set example_zh = $q$很快见。抱抱！$q$, updated_at = now() where id = '96e2eb96-83c2-4053-93af-2325cdfd376c' and example_zh is distinct from $q$很快见。抱抱！$q$ and true;

-- 96e2eb96-83c2-4053-93af-2325cdfd376c: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '96e2eb96-83c2-4053-93af-2325cdfd376c', 'learning_object_translations', 'zh.example_translation', example_translation, $q$很快见。抱抱！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '96e2eb96-83c2-4053-93af-2325cdfd376c' and native_language = 'zh' and example_translation is distinct from $q$很快见。抱抱！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$很快见。抱抱！$q$, updated_at = now() where learning_object_id = '96e2eb96-83c2-4053-93af-2325cdfd376c' and native_language = 'zh' and example_translation is distinct from $q$很快见。抱抱！$q$ and coalesce(example_translation, '') <> '';

-- 987e01d1-601d-4352-898a-cedb4ab82883: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '987e01d1-601d-4352-898a-cedb4ab82883', 'learning_objects', 'example_zh', example_zh, $q$去机场要一个小时。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '987e01d1-601d-4352-898a-cedb4ab82883' and example_zh is distinct from $q$去机场要一个小时。$q$ and true;
update public.learning_objects set example_zh = $q$去机场要一个小时。$q$, updated_at = now() where id = '987e01d1-601d-4352-898a-cedb4ab82883' and example_zh is distinct from $q$去机场要一个小时。$q$ and true;

-- 987e01d1-601d-4352-898a-cedb4ab82883: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '987e01d1-601d-4352-898a-cedb4ab82883', 'learning_object_translations', 'zh.example_translation', example_translation, $q$去机场要一个小时。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '987e01d1-601d-4352-898a-cedb4ab82883' and native_language = 'zh' and example_translation is distinct from $q$去机场要一个小时。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$去机场要一个小时。$q$, updated_at = now() where learning_object_id = '987e01d1-601d-4352-898a-cedb4ab82883' and native_language = 'zh' and example_translation is distinct from $q$去机场要一个小时。$q$ and coalesce(example_translation, '') <> '';

-- 98df27f3-bd24-4ef1-b6a3-e8215fb4da99: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '98df27f3-bd24-4ef1-b6a3-e8215fb4da99', 'learning_objects', 'example_zh', example_zh, $q$她做什么工作？她是老师。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '98df27f3-bd24-4ef1-b6a3-e8215fb4da99' and example_zh is distinct from $q$她做什么工作？她是老师。$q$ and true;
update public.learning_objects set example_zh = $q$她做什么工作？她是老师。$q$, updated_at = now() where id = '98df27f3-bd24-4ef1-b6a3-e8215fb4da99' and example_zh is distinct from $q$她做什么工作？她是老师。$q$ and true;

-- 98df27f3-bd24-4ef1-b6a3-e8215fb4da99: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '98df27f3-bd24-4ef1-b6a3-e8215fb4da99', 'learning_object_translations', 'zh.example_translation', example_translation, $q$她做什么工作？她是老师。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '98df27f3-bd24-4ef1-b6a3-e8215fb4da99' and native_language = 'zh' and example_translation is distinct from $q$她做什么工作？她是老师。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$她做什么工作？她是老师。$q$, updated_at = now() where learning_object_id = '98df27f3-bd24-4ef1-b6a3-e8215fb4da99' and native_language = 'zh' and example_translation is distinct from $q$她做什么工作？她是老师。$q$ and coalesce(example_translation, '') <> '';

-- 9be64600-847f-425d-9c88-4703141f1ddd: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9be64600-847f-425d-9c88-4703141f1ddd', 'learning_object_examples', 'insert', null, $q$Jo, jag lovar att jag kommer i tid.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '9be64600-847f-425d-9c88-4703141f1ddd' and example_swedish = $q$Jo, jag lovar att jag kommer i tid.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '9be64600-847f-425d-9c88-4703141f1ddd', $q$Jo, jag lovar att jag kommer i tid.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '9be64600-847f-425d-9c88-4703141f1ddd' and example_swedish = $q$Jo, jag lovar att jag kommer i tid.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$我保证我会准时到。$q$ from x union all select id, 'en', $q$I promise I'll be on time.$q$ from x;

-- 9be64600-847f-425d-9c88-4703141f1ddd: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9be64600-847f-425d-9c88-4703141f1ddd', 'learning_object_examples', 'insert', null, $q$Det var inte jag, jo, jag lovar!$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '9be64600-847f-425d-9c88-4703141f1ddd' and example_swedish = $q$Det var inte jag, jo, jag lovar!$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '9be64600-847f-425d-9c88-4703141f1ddd', $q$Det var inte jag, jo, jag lovar!$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '9be64600-847f-425d-9c88-4703141f1ddd' and example_swedish = $q$Det var inte jag, jo, jag lovar!$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$不是我，真的，我发誓！$q$ from x union all select id, 'en', $q$It wasn't me, honestly, I swear!$q$ from x;

-- 9d677241-b7b1-4bc8-a5ed-ec9e69537fcc: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9d677241-b7b1-4bc8-a5ed-ec9e69537fcc', 'learning_objects', 'example_zh', example_zh, $q$我不知道这是否属实，但这听起来有可能。她说她不知道这是否属实。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '9d677241-b7b1-4bc8-a5ed-ec9e69537fcc' and example_zh is distinct from $q$我不知道这是否属实，但这听起来有可能。她说她不知道这是否属实。$q$ and true;
update public.learning_objects set example_zh = $q$我不知道这是否属实，但这听起来有可能。她说她不知道这是否属实。$q$, updated_at = now() where id = '9d677241-b7b1-4bc8-a5ed-ec9e69537fcc' and example_zh is distinct from $q$我不知道这是否属实，但这听起来有可能。她说她不知道这是否属实。$q$ and true;

-- 9d677241-b7b1-4bc8-a5ed-ec9e69537fcc: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9d677241-b7b1-4bc8-a5ed-ec9e69537fcc', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我不知道这是否属实，但这听起来有可能。她说她不知道这是否属实。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '9d677241-b7b1-4bc8-a5ed-ec9e69537fcc' and native_language = 'zh' and example_translation is distinct from $q$我不知道这是否属实，但这听起来有可能。她说她不知道这是否属实。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我不知道这是否属实，但这听起来有可能。她说她不知道这是否属实。$q$, updated_at = now() where learning_object_id = '9d677241-b7b1-4bc8-a5ed-ec9e69537fcc' and native_language = 'zh' and example_translation is distinct from $q$我不知道这是否属实，但这听起来有可能。她说她不知道这是否属实。$q$ and coalesce(example_translation, '') <> '';

-- a05661c7-2362-4bca-9d59-bc6d72e49268: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a05661c7-2362-4bca-9d59-bc6d72e49268', 'learning_objects', 'example_zh', example_zh, $q$我看看能为这件事做些什么。我一知道更多情况就尽快回复你。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a05661c7-2362-4bca-9d59-bc6d72e49268' and example_zh is distinct from $q$我看看能为这件事做些什么。我一知道更多情况就尽快回复你。$q$ and true;
update public.learning_objects set example_zh = $q$我看看能为这件事做些什么。我一知道更多情况就尽快回复你。$q$, updated_at = now() where id = 'a05661c7-2362-4bca-9d59-bc6d72e49268' and example_zh is distinct from $q$我看看能为这件事做些什么。我一知道更多情况就尽快回复你。$q$ and true;

-- a05661c7-2362-4bca-9d59-bc6d72e49268: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a05661c7-2362-4bca-9d59-bc6d72e49268', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我看看能为这件事做些什么。我一知道更多情况就尽快回复你。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'a05661c7-2362-4bca-9d59-bc6d72e49268' and native_language = 'zh' and example_translation is distinct from $q$我看看能为这件事做些什么。我一知道更多情况就尽快回复你。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我看看能为这件事做些什么。我一知道更多情况就尽快回复你。$q$, updated_at = now() where learning_object_id = 'a05661c7-2362-4bca-9d59-bc6d72e49268' and native_language = 'zh' and example_translation is distinct from $q$我看看能为这件事做些什么。我一知道更多情况就尽快回复你。$q$ and coalesce(example_translation, '') <> '';

-- a01b9c71-f25f-420c-b163-148eb4c0214a: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a01b9c71-f25f-420c-b163-148eb4c0214a', 'learning_objects', 'example_zh', example_zh, $q$别怪我！我不是早就说过这是个坏主意吗？如果出了问题，别怪我！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a01b9c71-f25f-420c-b163-148eb4c0214a' and example_zh is distinct from $q$别怪我！我不是早就说过这是个坏主意吗？如果出了问题，别怪我！$q$ and true;
update public.learning_objects set example_zh = $q$别怪我！我不是早就说过这是个坏主意吗？如果出了问题，别怪我！$q$, updated_at = now() where id = 'a01b9c71-f25f-420c-b163-148eb4c0214a' and example_zh is distinct from $q$别怪我！我不是早就说过这是个坏主意吗？如果出了问题，别怪我！$q$ and true;

-- a01b9c71-f25f-420c-b163-148eb4c0214a: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a01b9c71-f25f-420c-b163-148eb4c0214a', 'learning_object_translations', 'zh.example_translation', example_translation, $q$别怪我！我不是早就说过这是个坏主意吗？如果出了问题，别怪我！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'a01b9c71-f25f-420c-b163-148eb4c0214a' and native_language = 'zh' and example_translation is distinct from $q$别怪我！我不是早就说过这是个坏主意吗？如果出了问题，别怪我！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$别怪我！我不是早就说过这是个坏主意吗？如果出了问题，别怪我！$q$, updated_at = now() where learning_object_id = 'a01b9c71-f25f-420c-b163-148eb4c0214a' and native_language = 'zh' and example_translation is distinct from $q$别怪我！我不是早就说过这是个坏主意吗？如果出了问题，别怪我！$q$ and coalesce(example_translation, '') <> '';

-- a4e89c01-ac22-488f-84c1-ec5f8233106b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a4e89c01-ac22-488f-84c1-ec5f8233106b', 'learning_objects', 'example_zh', example_zh, $q$你听说学校里发生了什么吗？没有，快告诉我！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a4e89c01-ac22-488f-84c1-ec5f8233106b' and example_zh is distinct from $q$你听说学校里发生了什么吗？没有，快告诉我！$q$ and true;
update public.learning_objects set example_zh = $q$你听说学校里发生了什么吗？没有，快告诉我！$q$, updated_at = now() where id = 'a4e89c01-ac22-488f-84c1-ec5f8233106b' and example_zh is distinct from $q$你听说学校里发生了什么吗？没有，快告诉我！$q$ and true;

-- a4e89c01-ac22-488f-84c1-ec5f8233106b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a4e89c01-ac22-488f-84c1-ec5f8233106b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你听说学校里发生了什么吗？没有，快告诉我！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'a4e89c01-ac22-488f-84c1-ec5f8233106b' and native_language = 'zh' and example_translation is distinct from $q$你听说学校里发生了什么吗？没有，快告诉我！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你听说学校里发生了什么吗？没有，快告诉我！$q$, updated_at = now() where learning_object_id = 'a4e89c01-ac22-488f-84c1-ec5f8233106b' and native_language = 'zh' and example_translation is distinct from $q$你听说学校里发生了什么吗？没有，快告诉我！$q$ and coalesce(example_translation, '') <> '';

-- 9d18d3be-b312-4d5d-85a1-b6973ea6de89: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9d18d3be-b312-4d5d-85a1-b6973ea6de89', 'learning_objects', 'example_zh', example_zh, $q$真是的！公交车又晚点了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '9d18d3be-b312-4d5d-85a1-b6973ea6de89' and example_zh is distinct from $q$真是的！公交车又晚点了。$q$ and true;
update public.learning_objects set example_zh = $q$真是的！公交车又晚点了。$q$, updated_at = now() where id = '9d18d3be-b312-4d5d-85a1-b6973ea6de89' and example_zh is distinct from $q$真是的！公交车又晚点了。$q$ and true;

-- 9d18d3be-b312-4d5d-85a1-b6973ea6de89: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9d18d3be-b312-4d5d-85a1-b6973ea6de89', 'learning_object_translations', 'zh.example_translation', example_translation, $q$真是的！公交车又晚点了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '9d18d3be-b312-4d5d-85a1-b6973ea6de89' and native_language = 'zh' and example_translation is distinct from $q$真是的！公交车又晚点了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$真是的！公交车又晚点了。$q$, updated_at = now() where learning_object_id = '9d18d3be-b312-4d5d-85a1-b6973ea6de89' and native_language = 'zh' and example_translation is distinct from $q$真是的！公交车又晚点了。$q$ and coalesce(example_translation, '') <> '';

-- a77d3a9b-a30d-4c67-a4ad-f84f05e199ca: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a77d3a9b-a30d-4c67-a4ad-f84f05e199ca', 'learning_objects', 'example_zh', example_zh, $q$你想喝咖啡吗？你今晚想跟我们一起去吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a77d3a9b-a30d-4c67-a4ad-f84f05e199ca' and example_zh is distinct from $q$你想喝咖啡吗？你今晚想跟我们一起去吗？$q$ and true;
update public.learning_objects set example_zh = $q$你想喝咖啡吗？你今晚想跟我们一起去吗？$q$, updated_at = now() where id = 'a77d3a9b-a30d-4c67-a4ad-f84f05e199ca' and example_zh is distinct from $q$你想喝咖啡吗？你今晚想跟我们一起去吗？$q$ and true;

-- a77d3a9b-a30d-4c67-a4ad-f84f05e199ca: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a77d3a9b-a30d-4c67-a4ad-f84f05e199ca', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你想喝咖啡吗？你今晚想跟我们一起去吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'a77d3a9b-a30d-4c67-a4ad-f84f05e199ca' and native_language = 'zh' and example_translation is distinct from $q$你想喝咖啡吗？你今晚想跟我们一起去吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你想喝咖啡吗？你今晚想跟我们一起去吗？$q$, updated_at = now() where learning_object_id = 'a77d3a9b-a30d-4c67-a4ad-f84f05e199ca' and native_language = 'zh' and example_translation is distinct from $q$你想喝咖啡吗？你今晚想跟我们一起去吗？$q$ and coalesce(example_translation, '') <> '';

-- a8a54027-b8be-4baa-a437-70283495e8b4: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a8a54027-b8be-4baa-a437-70283495e8b4', 'learning_objects', 'example_zh', example_zh, $q$我不能跟你们一起去餐馆。我现在一分钱都没有。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a8a54027-b8be-4baa-a437-70283495e8b4' and example_zh is distinct from $q$我不能跟你们一起去餐馆。我现在一分钱都没有。$q$ and true;
update public.learning_objects set example_zh = $q$我不能跟你们一起去餐馆。我现在一分钱都没有。$q$, updated_at = now() where id = 'a8a54027-b8be-4baa-a437-70283495e8b4' and example_zh is distinct from $q$我不能跟你们一起去餐馆。我现在一分钱都没有。$q$ and true;

-- a8a54027-b8be-4baa-a437-70283495e8b4: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a8a54027-b8be-4baa-a437-70283495e8b4', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我不能跟你们一起去餐馆。我现在一分钱都没有。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'a8a54027-b8be-4baa-a437-70283495e8b4' and native_language = 'zh' and example_translation is distinct from $q$我不能跟你们一起去餐馆。我现在一分钱都没有。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我不能跟你们一起去餐馆。我现在一分钱都没有。$q$, updated_at = now() where learning_object_id = 'a8a54027-b8be-4baa-a437-70283495e8b4' and native_language = 'zh' and example_translation is distinct from $q$我不能跟你们一起去餐馆。我现在一分钱都没有。$q$ and coalesce(example_translation, '') <> '';

-- a9ef1957-62b8-4b4e-b240-d5be6dc432a6: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a9ef1957-62b8-4b4e-b240-d5be6dc432a6', 'learning_objects', 'example_zh', example_zh, $q$你知道是谁打电话找过你吗？我想知道你是否知道是谁找过你。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a9ef1957-62b8-4b4e-b240-d5be6dc432a6' and example_zh is distinct from $q$你知道是谁打电话找过你吗？我想知道你是否知道是谁找过你。$q$ and true;
update public.learning_objects set example_zh = $q$你知道是谁打电话找过你吗？我想知道你是否知道是谁找过你。$q$, updated_at = now() where id = 'a9ef1957-62b8-4b4e-b240-d5be6dc432a6' and example_zh is distinct from $q$你知道是谁打电话找过你吗？我想知道你是否知道是谁找过你。$q$ and true;

-- a9ef1957-62b8-4b4e-b240-d5be6dc432a6: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a9ef1957-62b8-4b4e-b240-d5be6dc432a6', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你知道是谁打电话找过你吗？我想知道你是否知道是谁找过你。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'a9ef1957-62b8-4b4e-b240-d5be6dc432a6' and native_language = 'zh' and example_translation is distinct from $q$你知道是谁打电话找过你吗？我想知道你是否知道是谁找过你。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你知道是谁打电话找过你吗？我想知道你是否知道是谁找过你。$q$, updated_at = now() where learning_object_id = 'a9ef1957-62b8-4b4e-b240-d5be6dc432a6' and native_language = 'zh' and example_translation is distinct from $q$你知道是谁打电话找过你吗？我想知道你是否知道是谁找过你。$q$ and coalesce(example_translation, '') <> '';

-- Va, är det sant? Helt otroligt! What, is it true?: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'abb647fa-effa-4088-9466-8b328a77d99b', 'learning_objects', 'swedish', swedish, $q$Va, är det sant? Helt otroligt!$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = 'abb647fa-effa-4088-9466-8b328a77d99b' and swedish is distinct from $q$Va, är det sant? Helt otroligt!$q$;
update public.learning_objects set swedish = $q$Va, är det sant? Helt otroligt!$q$, updated_at = now() where id = 'abb647fa-effa-4088-9466-8b328a77d99b' and swedish is distinct from $q$Va, är det sant? Helt otroligt!$q$;

-- Va, är det sant? Helt otroligt! What, is it true?: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'abb647fa-effa-4088-9466-8b328a77d99b', 'learning_objects', 'match_key', match_key, $q$va är det sant helt otroligt$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = 'abb647fa-effa-4088-9466-8b328a77d99b' and match_key is distinct from $q$va är det sant helt otroligt$q$;
update public.learning_objects set match_key = $q$va är det sant helt otroligt$q$, updated_at = now() where id = 'abb647fa-effa-4088-9466-8b328a77d99b' and match_key is distinct from $q$va är det sant helt otroligt$q$;

-- abb647fa-effa-4088-9466-8b328a77d99b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'abb647fa-effa-4088-9466-8b328a77d99b', 'learning_objects', 'example_zh', example_zh, $q$什么，真的吗？太不可思议了！我简直不敢相信。什么，你说你赢了，是真的吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'abb647fa-effa-4088-9466-8b328a77d99b' and example_zh is distinct from $q$什么，真的吗？太不可思议了！我简直不敢相信。什么，你说你赢了，是真的吗？$q$ and true;
update public.learning_objects set example_zh = $q$什么，真的吗？太不可思议了！我简直不敢相信。什么，你说你赢了，是真的吗？$q$, updated_at = now() where id = 'abb647fa-effa-4088-9466-8b328a77d99b' and example_zh is distinct from $q$什么，真的吗？太不可思议了！我简直不敢相信。什么，你说你赢了，是真的吗？$q$ and true;

-- abb647fa-effa-4088-9466-8b328a77d99b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'abb647fa-effa-4088-9466-8b328a77d99b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$什么，真的吗？太不可思议了！我简直不敢相信。什么，你说你赢了，是真的吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'abb647fa-effa-4088-9466-8b328a77d99b' and native_language = 'zh' and example_translation is distinct from $q$什么，真的吗？太不可思议了！我简直不敢相信。什么，你说你赢了，是真的吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$什么，真的吗？太不可思议了！我简直不敢相信。什么，你说你赢了，是真的吗？$q$, updated_at = now() where learning_object_id = 'abb647fa-effa-4088-9466-8b328a77d99b' and native_language = 'zh' and example_translation is distinct from $q$什么，真的吗？太不可思议了！我简直不敢相信。什么，你说你赢了，是真的吗？$q$ and coalesce(example_translation, '') <> '';

-- abb647fa-effa-4088-9466-8b328a77d99b: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'abb647fa-effa-4088-9466-8b328a77d99b', 'learning_object_translations', 'en.example_translation', example_translation, $q$What, is it true? Unbelievable! I can hardly believe it. What, is it true that you won?$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'abb647fa-effa-4088-9466-8b328a77d99b' and native_language = 'en' and example_translation is distinct from $q$What, is it true? Unbelievable! I can hardly believe it. What, is it true that you won?$q$ and true;
update public.learning_object_translations set example_translation = $q$What, is it true? Unbelievable! I can hardly believe it. What, is it true that you won?$q$, updated_at = now() where learning_object_id = 'abb647fa-effa-4088-9466-8b328a77d99b' and native_language = 'en' and example_translation is distinct from $q$What, is it true? Unbelievable! I can hardly believe it. What, is it true that you won?$q$ and true;

-- aceadaba-fde1-435e-aed5-06f2e1837831: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'aceadaba-fde1-435e-aed5-06f2e1837831', 'learning_objects', 'example_zh', example_zh, $q$她有可能晚一点来。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'aceadaba-fde1-435e-aed5-06f2e1837831' and example_zh is distinct from $q$她有可能晚一点来。$q$ and true;
update public.learning_objects set example_zh = $q$她有可能晚一点来。$q$, updated_at = now() where id = 'aceadaba-fde1-435e-aed5-06f2e1837831' and example_zh is distinct from $q$她有可能晚一点来。$q$ and true;

-- aceadaba-fde1-435e-aed5-06f2e1837831: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'aceadaba-fde1-435e-aed5-06f2e1837831', 'learning_object_translations', 'zh.example_translation', example_translation, $q$她有可能晚一点来。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'aceadaba-fde1-435e-aed5-06f2e1837831' and native_language = 'zh' and example_translation is distinct from $q$她有可能晚一点来。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$她有可能晚一点来。$q$, updated_at = now() where learning_object_id = 'aceadaba-fde1-435e-aed5-06f2e1837831' and native_language = 'zh' and example_translation is distinct from $q$她有可能晚一点来。$q$ and coalesce(example_translation, '') <> '';

-- adb2a308-1cde-4cb9-9e3a-d589bce6c02d: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'adb2a308-1cde-4cb9-9e3a-d589bce6c02d', 'learning_objects', 'example_zh', example_zh, $q$那大概该回家了。那大概该开始开会了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'adb2a308-1cde-4cb9-9e3a-d589bce6c02d' and example_zh is distinct from $q$那大概该回家了。那大概该开始开会了。$q$ and true;
update public.learning_objects set example_zh = $q$那大概该回家了。那大概该开始开会了。$q$, updated_at = now() where id = 'adb2a308-1cde-4cb9-9e3a-d589bce6c02d' and example_zh is distinct from $q$那大概该回家了。那大概该开始开会了。$q$ and true;

-- adb2a308-1cde-4cb9-9e3a-d589bce6c02d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'adb2a308-1cde-4cb9-9e3a-d589bce6c02d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$那大概该回家了。那大概该开始开会了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'adb2a308-1cde-4cb9-9e3a-d589bce6c02d' and native_language = 'zh' and example_translation is distinct from $q$那大概该回家了。那大概该开始开会了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$那大概该回家了。那大概该开始开会了。$q$, updated_at = now() where learning_object_id = 'adb2a308-1cde-4cb9-9e3a-d589bce6c02d' and native_language = 'zh' and example_translation is distinct from $q$那大概该回家了。那大概该开始开会了。$q$ and coalesce(example_translation, '') <> '';

-- a3800a7b-7f70-470d-bd9f-a959b5581e1e: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a3800a7b-7f70-470d-bd9f-a959b5581e1e', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$ljudhärmande ord för en plötslig smäll$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a3800a7b-7f70-470d-bd9f-a959b5581e1e' and swedish_explanation is distinct from $q$ljudhärmande ord för en plötslig smäll$q$ and true;
update public.learning_objects set swedish_explanation = $q$ljudhärmande ord för en plötslig smäll$q$, updated_at = now() where id = 'a3800a7b-7f70-470d-bd9f-a959b5581e1e' and swedish_explanation is distinct from $q$ljudhärmande ord för en plötslig smäll$q$ and true;

-- a3800a7b-7f70-470d-bd9f-a959b5581e1e: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a3800a7b-7f70-470d-bd9f-a959b5581e1e', 'learning_objects', 'example_zh', example_zh, $q$砰！电脑突然黑屏了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a3800a7b-7f70-470d-bd9f-a959b5581e1e' and example_zh is distinct from $q$砰！电脑突然黑屏了。$q$ and true;
update public.learning_objects set example_zh = $q$砰！电脑突然黑屏了。$q$, updated_at = now() where id = 'a3800a7b-7f70-470d-bd9f-a959b5581e1e' and example_zh is distinct from $q$砰！电脑突然黑屏了。$q$ and true;

-- a3800a7b-7f70-470d-bd9f-a959b5581e1e: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a3800a7b-7f70-470d-bd9f-a959b5581e1e', 'learning_object_translations', 'zh.example_translation', example_translation, $q$砰！电脑突然黑屏了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'a3800a7b-7f70-470d-bd9f-a959b5581e1e' and native_language = 'zh' and example_translation is distinct from $q$砰！电脑突然黑屏了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$砰！电脑突然黑屏了。$q$, updated_at = now() where learning_object_id = 'a3800a7b-7f70-470d-bd9f-a959b5581e1e' and native_language = 'zh' and example_translation is distinct from $q$砰！电脑突然黑屏了。$q$ and coalesce(example_translation, '') <> '';

-- a5752739-02dc-4149-a8d9-07ec9ffc6f70: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a5752739-02dc-4149-a8d9-07ec9ffc6f70', 'learning_objects', 'example_zh', example_zh, $q$我因为生病而待在家里。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a5752739-02dc-4149-a8d9-07ec9ffc6f70' and example_zh is distinct from $q$我因为生病而待在家里。$q$ and true;
update public.learning_objects set example_zh = $q$我因为生病而待在家里。$q$, updated_at = now() where id = 'a5752739-02dc-4149-a8d9-07ec9ffc6f70' and example_zh is distinct from $q$我因为生病而待在家里。$q$ and true;

-- a5752739-02dc-4149-a8d9-07ec9ffc6f70: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a5752739-02dc-4149-a8d9-07ec9ffc6f70', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我因为生病而待在家里。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'a5752739-02dc-4149-a8d9-07ec9ffc6f70' and native_language = 'zh' and example_translation is distinct from $q$我因为生病而待在家里。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我因为生病而待在家里。$q$, updated_at = now() where learning_object_id = 'a5752739-02dc-4149-a8d9-07ec9ffc6f70' and native_language = 'zh' and example_translation is distinct from $q$我因为生病而待在家里。$q$ and coalesce(example_translation, '') <> '';

-- b0ad76da-6cd0-464e-b433-016f688fdf9a: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b0ad76da-6cd0-464e-b433-016f688fdf9a', 'learning_objects', 'example_zh', example_zh, $q$那是一次所谓的“家庭主妇假期”。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b0ad76da-6cd0-464e-b433-016f688fdf9a' and example_zh is distinct from $q$那是一次所谓的“家庭主妇假期”。$q$ and true;
update public.learning_objects set example_zh = $q$那是一次所谓的“家庭主妇假期”。$q$, updated_at = now() where id = 'b0ad76da-6cd0-464e-b433-016f688fdf9a' and example_zh is distinct from $q$那是一次所谓的“家庭主妇假期”。$q$ and true;

-- b0ad76da-6cd0-464e-b433-016f688fdf9a: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b0ad76da-6cd0-464e-b433-016f688fdf9a', 'learning_object_translations', 'zh.example_translation', example_translation, $q$那是一次所谓的“家庭主妇假期”。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b0ad76da-6cd0-464e-b433-016f688fdf9a' and native_language = 'zh' and example_translation is distinct from $q$那是一次所谓的“家庭主妇假期”。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$那是一次所谓的“家庭主妇假期”。$q$, updated_at = now() where learning_object_id = 'b0ad76da-6cd0-464e-b433-016f688fdf9a' and native_language = 'zh' and example_translation is distinct from $q$那是一次所谓的“家庭主妇假期”。$q$ and coalesce(example_translation, '') <> '';

-- b1cc2942-6b48-4dc7-a89f-3605e18a7e40: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b1cc2942-6b48-4dc7-a89f-3605e18a7e40', 'learning_objects', 'example_sv', example_sv, $q$Vet du inte varför hon är ledsen? Vet du inte varför vi väntar?$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b1cc2942-6b48-4dc7-a89f-3605e18a7e40' and example_sv is distinct from $q$Vet du inte varför hon är ledsen? Vet du inte varför vi väntar?$q$ and true;
update public.learning_objects set example_sv = $q$Vet du inte varför hon är ledsen? Vet du inte varför vi väntar?$q$, updated_at = now() where id = 'b1cc2942-6b48-4dc7-a89f-3605e18a7e40' and example_sv is distinct from $q$Vet du inte varför hon är ledsen? Vet du inte varför vi väntar?$q$ and true;

-- b1cc2942-6b48-4dc7-a89f-3605e18a7e40: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b1cc2942-6b48-4dc7-a89f-3605e18a7e40', 'learning_objects', 'example_zh', example_zh, $q$你不知道她为什么难过吗？你不知道我们为什么在等吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b1cc2942-6b48-4dc7-a89f-3605e18a7e40' and example_zh is distinct from $q$你不知道她为什么难过吗？你不知道我们为什么在等吗？$q$ and true;
update public.learning_objects set example_zh = $q$你不知道她为什么难过吗？你不知道我们为什么在等吗？$q$, updated_at = now() where id = 'b1cc2942-6b48-4dc7-a89f-3605e18a7e40' and example_zh is distinct from $q$你不知道她为什么难过吗？你不知道我们为什么在等吗？$q$ and true;

-- b1cc2942-6b48-4dc7-a89f-3605e18a7e40: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b1cc2942-6b48-4dc7-a89f-3605e18a7e40', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你不知道她为什么难过吗？你不知道我们为什么在等吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b1cc2942-6b48-4dc7-a89f-3605e18a7e40' and native_language = 'zh' and example_translation is distinct from $q$你不知道她为什么难过吗？你不知道我们为什么在等吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你不知道她为什么难过吗？你不知道我们为什么在等吗？$q$, updated_at = now() where learning_object_id = 'b1cc2942-6b48-4dc7-a89f-3605e18a7e40' and native_language = 'zh' and example_translation is distinct from $q$你不知道她为什么难过吗？你不知道我们为什么在等吗？$q$ and coalesce(example_translation, '') <> '';

-- b1cc2942-6b48-4dc7-a89f-3605e18a7e40: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b1cc2942-6b48-4dc7-a89f-3605e18a7e40', 'learning_object_translations', 'en.example_translation', example_translation, $q$Don't you know why she is sad? Don't you know why we're waiting?$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b1cc2942-6b48-4dc7-a89f-3605e18a7e40' and native_language = 'en' and example_translation is distinct from $q$Don't you know why she is sad? Don't you know why we're waiting?$q$ and true;
update public.learning_object_translations set example_translation = $q$Don't you know why she is sad? Don't you know why we're waiting?$q$, updated_at = now() where learning_object_id = 'b1cc2942-6b48-4dc7-a89f-3605e18a7e40' and native_language = 'en' and example_translation is distinct from $q$Don't you know why she is sad? Don't you know why we're waiting?$q$ and true;

-- b37e33a2-506c-47f3-b450-8bc92ca0f6c8: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b37e33a2-506c-47f3-b450-8bc92ca0f6c8', 'learning_objects', 'example_zh', example_zh, $q$我也不这么认为，这听起来不公平。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b37e33a2-506c-47f3-b450-8bc92ca0f6c8' and example_zh is distinct from $q$我也不这么认为，这听起来不公平。$q$ and true;
update public.learning_objects set example_zh = $q$我也不这么认为，这听起来不公平。$q$, updated_at = now() where id = 'b37e33a2-506c-47f3-b450-8bc92ca0f6c8' and example_zh is distinct from $q$我也不这么认为，这听起来不公平。$q$ and true;

-- b37e33a2-506c-47f3-b450-8bc92ca0f6c8: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b37e33a2-506c-47f3-b450-8bc92ca0f6c8', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我也不这么认为，这听起来不公平。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b37e33a2-506c-47f3-b450-8bc92ca0f6c8' and native_language = 'zh' and example_translation is distinct from $q$我也不这么认为，这听起来不公平。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我也不这么认为，这听起来不公平。$q$, updated_at = now() where learning_object_id = 'b37e33a2-506c-47f3-b450-8bc92ca0f6c8' and native_language = 'zh' and example_translation is distinct from $q$我也不这么认为，这听起来不公平。$q$ and coalesce(example_translation, '') <> '';

-- b4cd5c10-49cd-4d8d-8928-e518b67e83cb: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b4cd5c10-49cd-4d8d-8928-e518b67e83cb', 'learning_object_examples', 'insert', null, $q$Hon upptäckte att han träffade en annan.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'b4cd5c10-49cd-4d8d-8928-e518b67e83cb' and example_swedish = $q$Hon upptäckte att han träffade en annan.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'b4cd5c10-49cd-4d8d-8928-e518b67e83cb', $q$Hon upptäckte att han träffade en annan.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'b4cd5c10-49cd-4d8d-8928-e518b67e83cb' and example_swedish = $q$Hon upptäckte att han träffade en annan.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$和另一个人交往；出轨$q$ from x union all select id, 'en', $q$She discovered that he was seeing someone else.$q$ from x;

-- b4cd5c10-49cd-4d8d-8928-e518b67e83cb: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b4cd5c10-49cd-4d8d-8928-e518b67e83cb', 'learning_object_examples', 'insert', null, $q$Det är svårt när någon träffar en annan i ett förhållande.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'b4cd5c10-49cd-4d8d-8928-e518b67e83cb' and example_swedish = $q$Det är svårt när någon träffar en annan i ett förhållande.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'b4cd5c10-49cd-4d8d-8928-e518b67e83cb', $q$Det är svårt när någon träffar en annan i ett förhållande.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'b4cd5c10-49cd-4d8d-8928-e518b67e83cb' and example_swedish = $q$Det är svårt när någon träffar en annan i ett förhållande.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$在一段感情里，如果有人和别人好上了，那会很难受。$q$ from x union all select id, 'en', $q$It's hard when someone in a relationship meets someone else.$q$ from x;

-- b574e603-ac83-45fe-b78a-90c587bd3962: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b574e603-ac83-45fe-b78a-90c587bd3962', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$det låter bra; det ordnar sig$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b574e603-ac83-45fe-b78a-90c587bd3962' and swedish_explanation is distinct from $q$det låter bra; det ordnar sig$q$ and true;
update public.learning_objects set swedish_explanation = $q$det låter bra; det ordnar sig$q$, updated_at = now() where id = 'b574e603-ac83-45fe-b78a-90c587bd3962' and swedish_explanation is distinct from $q$det låter bra; det ordnar sig$q$ and true;

-- b6b02e2c-017c-416e-afa2-a00241135f2d: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b6b02e2c-017c-416e-afa2-a00241135f2d', 'learning_objects', 'example_zh', example_zh, $q$谢谢这顿饭，特别好吃。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b6b02e2c-017c-416e-afa2-a00241135f2d' and example_zh is distinct from $q$谢谢这顿饭，特别好吃。$q$ and true;
update public.learning_objects set example_zh = $q$谢谢这顿饭，特别好吃。$q$, updated_at = now() where id = 'b6b02e2c-017c-416e-afa2-a00241135f2d' and example_zh is distinct from $q$谢谢这顿饭，特别好吃。$q$ and true;

-- b6b02e2c-017c-416e-afa2-a00241135f2d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b6b02e2c-017c-416e-afa2-a00241135f2d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$谢谢这顿饭，特别好吃。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b6b02e2c-017c-416e-afa2-a00241135f2d' and native_language = 'zh' and example_translation is distinct from $q$谢谢这顿饭，特别好吃。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$谢谢这顿饭，特别好吃。$q$, updated_at = now() where learning_object_id = 'b6b02e2c-017c-416e-afa2-a00241135f2d' and native_language = 'zh' and example_translation is distinct from $q$谢谢这顿饭，特别好吃。$q$ and coalesce(example_translation, '') <> '';

-- b6b02e2c-017c-416e-afa2-a00241135f2d: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b6b02e2c-017c-416e-afa2-a00241135f2d', 'learning_object_translations', 'en.example_translation', example_translation, $q$Thanks for the meal, it was really delicious.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b6b02e2c-017c-416e-afa2-a00241135f2d' and native_language = 'en' and example_translation is distinct from $q$Thanks for the meal, it was really delicious.$q$ and true;
update public.learning_object_translations set example_translation = $q$Thanks for the meal, it was really delicious.$q$, updated_at = now() where learning_object_id = 'b6b02e2c-017c-416e-afa2-a00241135f2d' and native_language = 'en' and example_translation is distinct from $q$Thanks for the meal, it was really delicious.$q$ and true;

-- b7382716-445b-43d7-a76c-88ea7eb934f5: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b7382716-445b-43d7-a76c-88ea7eb934f5', 'learning_objects', 'example_zh', example_zh, $q$天气晴朗，但很冷。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b7382716-445b-43d7-a76c-88ea7eb934f5' and example_zh is distinct from $q$天气晴朗，但很冷。$q$ and true;
update public.learning_objects set example_zh = $q$天气晴朗，但很冷。$q$, updated_at = now() where id = 'b7382716-445b-43d7-a76c-88ea7eb934f5' and example_zh is distinct from $q$天气晴朗，但很冷。$q$ and true;

-- b7382716-445b-43d7-a76c-88ea7eb934f5: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b7382716-445b-43d7-a76c-88ea7eb934f5', 'learning_object_translations', 'zh.example_translation', example_translation, $q$天气晴朗，但很冷。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b7382716-445b-43d7-a76c-88ea7eb934f5' and native_language = 'zh' and example_translation is distinct from $q$天气晴朗，但很冷。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$天气晴朗，但很冷。$q$, updated_at = now() where learning_object_id = 'b7382716-445b-43d7-a76c-88ea7eb934f5' and native_language = 'zh' and example_translation is distinct from $q$天气晴朗，但很冷。$q$ and coalesce(example_translation, '') <> '';

-- aea33530-9414-42c0-89ba-6eab4508962a: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'aea33530-9414-42c0-89ba-6eab4508962a', 'learning_objects', 'example_zh', example_zh, $q$嗨，Sara，你好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'aea33530-9414-42c0-89ba-6eab4508962a' and example_zh is distinct from $q$嗨，Sara，你好吗？$q$ and true;
update public.learning_objects set example_zh = $q$嗨，Sara，你好吗？$q$, updated_at = now() where id = 'aea33530-9414-42c0-89ba-6eab4508962a' and example_zh is distinct from $q$嗨，Sara，你好吗？$q$ and true;

-- aea33530-9414-42c0-89ba-6eab4508962a: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'aea33530-9414-42c0-89ba-6eab4508962a', 'learning_object_translations', 'zh.example_translation', example_translation, $q$嗨，Sara，你好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'aea33530-9414-42c0-89ba-6eab4508962a' and native_language = 'zh' and example_translation is distinct from $q$嗨，Sara，你好吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$嗨，Sara，你好吗？$q$, updated_at = now() where learning_object_id = 'aea33530-9414-42c0-89ba-6eab4508962a' and native_language = 'zh' and example_translation is distinct from $q$嗨，Sara，你好吗？$q$ and coalesce(example_translation, '') <> '';

-- bd5ff9cb-2bb9-4081-b816-a7a2da6ed3b5: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'bd5ff9cb-2bb9-4081-b816-a7a2da6ed3b5', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$Vinden blåser; det är blåsigt.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'bd5ff9cb-2bb9-4081-b816-a7a2da6ed3b5' and swedish_explanation is distinct from $q$Vinden blåser; det är blåsigt.$q$ and true;
update public.learning_objects set swedish_explanation = $q$Vinden blåser; det är blåsigt.$q$, updated_at = now() where id = 'bd5ff9cb-2bb9-4081-b816-a7a2da6ed3b5' and swedish_explanation is distinct from $q$Vinden blåser; det är blåsigt.$q$ and true;

-- bd5ff9cb-2bb9-4081-b816-a7a2da6ed3b5: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'bd5ff9cb-2bb9-4081-b816-a7a2da6ed3b5', 'learning_objects', 'example_zh', example_zh, $q$海边风很大。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'bd5ff9cb-2bb9-4081-b816-a7a2da6ed3b5' and example_zh is distinct from $q$海边风很大。$q$ and true;
update public.learning_objects set example_zh = $q$海边风很大。$q$, updated_at = now() where id = 'bd5ff9cb-2bb9-4081-b816-a7a2da6ed3b5' and example_zh is distinct from $q$海边风很大。$q$ and true;

-- bd5ff9cb-2bb9-4081-b816-a7a2da6ed3b5: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'bd5ff9cb-2bb9-4081-b816-a7a2da6ed3b5', 'learning_object_translations', 'zh.example_translation', example_translation, $q$海边风很大。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'bd5ff9cb-2bb9-4081-b816-a7a2da6ed3b5' and native_language = 'zh' and example_translation is distinct from $q$海边风很大。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$海边风很大。$q$, updated_at = now() where learning_object_id = 'bd5ff9cb-2bb9-4081-b816-a7a2da6ed3b5' and native_language = 'zh' and example_translation is distinct from $q$海边风很大。$q$ and coalesce(example_translation, '') <> '';

-- bfbd8a25-00e1-456d-af7e-bd7aac732467: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'bfbd8a25-00e1-456d-af7e-bd7aac732467', 'learning_objects', 'example_zh', example_zh, $q$很抱歉，我今天不行，但明天可以。谢谢你的邀请，不过我今天实在不行。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'bfbd8a25-00e1-456d-af7e-bd7aac732467' and example_zh is distinct from $q$很抱歉，我今天不行，但明天可以。谢谢你的邀请，不过我今天实在不行。$q$ and true;
update public.learning_objects set example_zh = $q$很抱歉，我今天不行，但明天可以。谢谢你的邀请，不过我今天实在不行。$q$, updated_at = now() where id = 'bfbd8a25-00e1-456d-af7e-bd7aac732467' and example_zh is distinct from $q$很抱歉，我今天不行，但明天可以。谢谢你的邀请，不过我今天实在不行。$q$ and true;

-- bfbd8a25-00e1-456d-af7e-bd7aac732467: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'bfbd8a25-00e1-456d-af7e-bd7aac732467', 'learning_object_translations', 'zh.example_translation', example_translation, $q$很抱歉，我今天不行，但明天可以。谢谢你的邀请，不过我今天实在不行。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'bfbd8a25-00e1-456d-af7e-bd7aac732467' and native_language = 'zh' and example_translation is distinct from $q$很抱歉，我今天不行，但明天可以。谢谢你的邀请，不过我今天实在不行。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$很抱歉，我今天不行，但明天可以。谢谢你的邀请，不过我今天实在不行。$q$, updated_at = now() where learning_object_id = 'bfbd8a25-00e1-456d-af7e-bd7aac732467' and native_language = 'zh' and example_translation is distinct from $q$很抱歉，我今天不行，但明天可以。谢谢你的邀请，不过我今天实在不行。$q$ and coalesce(example_translation, '') <> '';

-- bf9aa116-e6b3-4e43-a8ce-155f3e88b9cb: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'bf9aa116-e6b3-4e43-a8ce-155f3e88b9cb', 'learning_objects', 'example_zh', example_zh, $q$去海滩怎么样？下班后见面怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'bf9aa116-e6b3-4e43-a8ce-155f3e88b9cb' and example_zh is distinct from $q$去海滩怎么样？下班后见面怎么样？$q$ and true;
update public.learning_objects set example_zh = $q$去海滩怎么样？下班后见面怎么样？$q$, updated_at = now() where id = 'bf9aa116-e6b3-4e43-a8ce-155f3e88b9cb' and example_zh is distinct from $q$去海滩怎么样？下班后见面怎么样？$q$ and true;

-- bf9aa116-e6b3-4e43-a8ce-155f3e88b9cb: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'bf9aa116-e6b3-4e43-a8ce-155f3e88b9cb', 'learning_object_translations', 'zh.example_translation', example_translation, $q$去海滩怎么样？下班后见面怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'bf9aa116-e6b3-4e43-a8ce-155f3e88b9cb' and native_language = 'zh' and example_translation is distinct from $q$去海滩怎么样？下班后见面怎么样？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$去海滩怎么样？下班后见面怎么样？$q$, updated_at = now() where learning_object_id = 'bf9aa116-e6b3-4e43-a8ce-155f3e88b9cb' and native_language = 'zh' and example_translation is distinct from $q$去海滩怎么样？下班后见面怎么样？$q$ and coalesce(example_translation, '') <> '';

-- c00eb11a-d112-49ec-bab0-d502fcfb88d5: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c00eb11a-d112-49ec-bab0-d502fcfb88d5', 'learning_objects', 'example_zh', example_zh, $q$你穿多大码的鞋？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c00eb11a-d112-49ec-bab0-d502fcfb88d5' and example_zh is distinct from $q$你穿多大码的鞋？$q$ and true;
update public.learning_objects set example_zh = $q$你穿多大码的鞋？$q$, updated_at = now() where id = 'c00eb11a-d112-49ec-bab0-d502fcfb88d5' and example_zh is distinct from $q$你穿多大码的鞋？$q$ and true;

-- c00eb11a-d112-49ec-bab0-d502fcfb88d5: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c00eb11a-d112-49ec-bab0-d502fcfb88d5', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你穿多大码的鞋？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c00eb11a-d112-49ec-bab0-d502fcfb88d5' and native_language = 'zh' and example_translation is distinct from $q$你穿多大码的鞋？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你穿多大码的鞋？$q$, updated_at = now() where learning_object_id = 'c00eb11a-d112-49ec-bab0-d502fcfb88d5' and native_language = 'zh' and example_translation is distinct from $q$你穿多大码的鞋？$q$ and coalesce(example_translation, '') <> '';

-- c250d7f7-586a-4e74-b413-d07a9e134b09: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c250d7f7-586a-4e74-b413-d07a9e134b09', 'learning_objects', 'example_zh', example_zh, $q$上网再了解更多。我们必须在决定之前了解更多。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c250d7f7-586a-4e74-b413-d07a9e134b09' and example_zh is distinct from $q$上网再了解更多。我们必须在决定之前了解更多。$q$ and true;
update public.learning_objects set example_zh = $q$上网再了解更多。我们必须在决定之前了解更多。$q$, updated_at = now() where id = 'c250d7f7-586a-4e74-b413-d07a9e134b09' and example_zh is distinct from $q$上网再了解更多。我们必须在决定之前了解更多。$q$ and true;

-- c250d7f7-586a-4e74-b413-d07a9e134b09: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c250d7f7-586a-4e74-b413-d07a9e134b09', 'learning_object_translations', 'zh.example_translation', example_translation, $q$上网再了解更多。我们必须在决定之前了解更多。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c250d7f7-586a-4e74-b413-d07a9e134b09' and native_language = 'zh' and example_translation is distinct from $q$上网再了解更多。我们必须在决定之前了解更多。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$上网再了解更多。我们必须在决定之前了解更多。$q$, updated_at = now() where learning_object_id = 'c250d7f7-586a-4e74-b413-d07a9e134b09' and native_language = 'zh' and example_translation is distinct from $q$上网再了解更多。我们必须在决定之前了解更多。$q$ and coalesce(example_translation, '') <> '';

-- c30baa0d-db23-415e-8cac-c341960fed49: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c30baa0d-db23-415e-8cac-c341960fed49', 'learning_objects', 'example_zh', example_zh, $q$一整天都是阴天。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c30baa0d-db23-415e-8cac-c341960fed49' and example_zh is distinct from $q$一整天都是阴天。$q$ and true;
update public.learning_objects set example_zh = $q$一整天都是阴天。$q$, updated_at = now() where id = 'c30baa0d-db23-415e-8cac-c341960fed49' and example_zh is distinct from $q$一整天都是阴天。$q$ and true;

-- c30baa0d-db23-415e-8cac-c341960fed49: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c30baa0d-db23-415e-8cac-c341960fed49', 'learning_object_translations', 'zh.example_translation', example_translation, $q$一整天都是阴天。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c30baa0d-db23-415e-8cac-c341960fed49' and native_language = 'zh' and example_translation is distinct from $q$一整天都是阴天。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$一整天都是阴天。$q$, updated_at = now() where learning_object_id = 'c30baa0d-db23-415e-8cac-c341960fed49' and native_language = 'zh' and example_translation is distinct from $q$一整天都是阴天。$q$ and coalesce(example_translation, '') <> '';

-- c49987bf-0dfe-4854-8b16-363fd23b0906: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c49987bf-0dfe-4854-8b16-363fd23b0906', 'learning_object_translations', 'en.example_translation', example_translation, $q$It was really lovely meeting you. It was really lovely at your place.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c49987bf-0dfe-4854-8b16-363fd23b0906' and native_language = 'en' and example_translation is distinct from $q$It was really lovely meeting you. It was really lovely at your place.$q$ and true;
update public.learning_object_translations set example_translation = $q$It was really lovely meeting you. It was really lovely at your place.$q$, updated_at = now() where learning_object_id = 'c49987bf-0dfe-4854-8b16-363fd23b0906' and native_language = 'en' and example_translation is distinct from $q$It was really lovely meeting you. It was really lovely at your place.$q$ and true;

-- c4dc3755-2722-45ae-ace9-25a351050f17: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c4dc3755-2722-45ae-ace9-25a351050f17', 'learning_objects', 'example_zh', example_zh, $q$早上有雾。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c4dc3755-2722-45ae-ace9-25a351050f17' and example_zh is distinct from $q$早上有雾。$q$ and true;
update public.learning_objects set example_zh = $q$早上有雾。$q$, updated_at = now() where id = 'c4dc3755-2722-45ae-ace9-25a351050f17' and example_zh is distinct from $q$早上有雾。$q$ and true;

-- c4dc3755-2722-45ae-ace9-25a351050f17: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c4dc3755-2722-45ae-ace9-25a351050f17', 'learning_object_translations', 'zh.example_translation', example_translation, $q$早上有雾。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c4dc3755-2722-45ae-ace9-25a351050f17' and native_language = 'zh' and example_translation is distinct from $q$早上有雾。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$早上有雾。$q$, updated_at = now() where learning_object_id = 'c4dc3755-2722-45ae-ace9-25a351050f17' and native_language = 'zh' and example_translation is distinct from $q$早上有雾。$q$ and coalesce(example_translation, '') <> '';

-- c4eafc50-6d74-4ae5-9a7a-b754aa3fb369: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c4eafc50-6d74-4ae5-9a7a-b754aa3fb369', 'learning_objects', 'example_zh', example_zh, $q$这个我完全不知道！我刚刚才知道。我完全不知道她会说瑞典语。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c4eafc50-6d74-4ae5-9a7a-b754aa3fb369' and example_zh is distinct from $q$这个我完全不知道！我刚刚才知道。我完全不知道她会说瑞典语。$q$ and true;
update public.learning_objects set example_zh = $q$这个我完全不知道！我刚刚才知道。我完全不知道她会说瑞典语。$q$, updated_at = now() where id = 'c4eafc50-6d74-4ae5-9a7a-b754aa3fb369' and example_zh is distinct from $q$这个我完全不知道！我刚刚才知道。我完全不知道她会说瑞典语。$q$ and true;

-- c4eafc50-6d74-4ae5-9a7a-b754aa3fb369: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c4eafc50-6d74-4ae5-9a7a-b754aa3fb369', 'learning_object_translations', 'zh.example_translation', example_translation, $q$这个我完全不知道！我刚刚才知道。我完全不知道她会说瑞典语。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c4eafc50-6d74-4ae5-9a7a-b754aa3fb369' and native_language = 'zh' and example_translation is distinct from $q$这个我完全不知道！我刚刚才知道。我完全不知道她会说瑞典语。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$这个我完全不知道！我刚刚才知道。我完全不知道她会说瑞典语。$q$, updated_at = now() where learning_object_id = 'c4eafc50-6d74-4ae5-9a7a-b754aa3fb369' and native_language = 'zh' and example_translation is distinct from $q$这个我完全不知道！我刚刚才知道。我完全不知道她会说瑞典语。$q$ and coalesce(example_translation, '') <> '';

-- c5dc0c64-680e-4ae3-9b9e-4afdbbf15e08: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c5dc0c64-680e-4ae3-9b9e-4afdbbf15e08', 'learning_objects', 'example_zh', example_zh, $q$哥德堡天气怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c5dc0c64-680e-4ae3-9b9e-4afdbbf15e08' and example_zh is distinct from $q$哥德堡天气怎么样？$q$ and true;
update public.learning_objects set example_zh = $q$哥德堡天气怎么样？$q$, updated_at = now() where id = 'c5dc0c64-680e-4ae3-9b9e-4afdbbf15e08' and example_zh is distinct from $q$哥德堡天气怎么样？$q$ and true;

-- c5dc0c64-680e-4ae3-9b9e-4afdbbf15e08: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c5dc0c64-680e-4ae3-9b9e-4afdbbf15e08', 'learning_object_translations', 'zh.example_translation', example_translation, $q$哥德堡天气怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c5dc0c64-680e-4ae3-9b9e-4afdbbf15e08' and native_language = 'zh' and example_translation is distinct from $q$哥德堡天气怎么样？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$哥德堡天气怎么样？$q$, updated_at = now() where learning_object_id = 'c5dc0c64-680e-4ae3-9b9e-4afdbbf15e08' and native_language = 'zh' and example_translation is distinct from $q$哥德堡天气怎么样？$q$ and coalesce(example_translation, '') <> '';

-- c5dc0c64-680e-4ae3-9b9e-4afdbbf15e08: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c5dc0c64-680e-4ae3-9b9e-4afdbbf15e08', 'learning_object_translations', 'en.example_translation', example_translation, $q$What’s the weather like in Gothenburg?$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c5dc0c64-680e-4ae3-9b9e-4afdbbf15e08' and native_language = 'en' and example_translation is distinct from $q$What’s the weather like in Gothenburg?$q$ and true;
update public.learning_object_translations set example_translation = $q$What’s the weather like in Gothenburg?$q$, updated_at = now() where learning_object_id = 'c5dc0c64-680e-4ae3-9b9e-4afdbbf15e08' and native_language = 'en' and example_translation is distinct from $q$What’s the weather like in Gothenburg?$q$ and true;

-- c635296d-accc-4794-83f7-2652d1337aab: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c635296d-accc-4794-83f7-2652d1337aab', 'learning_object_examples', 'insert', null, $q$Kanske blir det bra, men vi får väl se.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'c635296d-accc-4794-83f7-2652d1337aab' and example_swedish = $q$Kanske blir det bra, men vi får väl se.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'c635296d-accc-4794-83f7-2652d1337aab', $q$Kanske blir det bra, men vi får väl se.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'c635296d-accc-4794-83f7-2652d1337aab' and example_swedish = $q$Kanske blir det bra, men vi får väl se.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$也许会变好，不过我们再看看吧。$q$ from x union all select id, 'en', $q$Maybe it’ll turn out well, but we’ll see.$q$ from x;

-- c635296d-accc-4794-83f7-2652d1337aab: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c635296d-accc-4794-83f7-2652d1337aab', 'learning_object_examples', 'insert', null, $q$Kommer han i tid? Vi får väl se.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'c635296d-accc-4794-83f7-2652d1337aab' and example_swedish = $q$Kommer han i tid? Vi får väl se.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'c635296d-accc-4794-83f7-2652d1337aab', $q$Kommer han i tid? Vi får väl se.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'c635296d-accc-4794-83f7-2652d1337aab' and example_swedish = $q$Kommer han i tid? Vi får väl se.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$他会准时来吗？我们到时看看吧。$q$ from x union all select id, 'en', $q$Will he be on time? We’ll see.$q$ from x;

-- b93719e9-3dd4-49c7-ab6a-b20ed29f7273: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b93719e9-3dd4-49c7-ab6a-b20ed29f7273', 'learning_objects', 'example_zh', example_zh, $q$我们下班后在市中心见。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b93719e9-3dd4-49c7-ab6a-b20ed29f7273' and example_zh is distinct from $q$我们下班后在市中心见。$q$ and true;
update public.learning_objects set example_zh = $q$我们下班后在市中心见。$q$, updated_at = now() where id = 'b93719e9-3dd4-49c7-ab6a-b20ed29f7273' and example_zh is distinct from $q$我们下班后在市中心见。$q$ and true;

-- b93719e9-3dd4-49c7-ab6a-b20ed29f7273: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b93719e9-3dd4-49c7-ab6a-b20ed29f7273', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我们下班后在市中心见。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b93719e9-3dd4-49c7-ab6a-b20ed29f7273' and native_language = 'zh' and example_translation is distinct from $q$我们下班后在市中心见。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我们下班后在市中心见。$q$, updated_at = now() where learning_object_id = 'b93719e9-3dd4-49c7-ab6a-b20ed29f7273' and native_language = 'zh' and example_translation is distinct from $q$我们下班后在市中心见。$q$ and coalesce(example_translation, '') <> '';

-- c79c9c12-90b6-457a-9028-a12bd93fd2ef: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c79c9c12-90b6-457a-9028-a12bd93fd2ef', 'learning_objects', 'example_zh', example_zh, $q$我不太确定，不过那也许是真的。我不太明白她是什么意思。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c79c9c12-90b6-457a-9028-a12bd93fd2ef' and example_zh is distinct from $q$我不太确定，不过那也许是真的。我不太明白她是什么意思。$q$ and true;
update public.learning_objects set example_zh = $q$我不太确定，不过那也许是真的。我不太明白她是什么意思。$q$, updated_at = now() where id = 'c79c9c12-90b6-457a-9028-a12bd93fd2ef' and example_zh is distinct from $q$我不太确定，不过那也许是真的。我不太明白她是什么意思。$q$ and true;

-- c79c9c12-90b6-457a-9028-a12bd93fd2ef: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c79c9c12-90b6-457a-9028-a12bd93fd2ef', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我不太确定，不过那也许是真的。我不太明白她是什么意思。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c79c9c12-90b6-457a-9028-a12bd93fd2ef' and native_language = 'zh' and example_translation is distinct from $q$我不太确定，不过那也许是真的。我不太明白她是什么意思。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我不太确定，不过那也许是真的。我不太明白她是什么意思。$q$, updated_at = now() where learning_object_id = 'c79c9c12-90b6-457a-9028-a12bd93fd2ef' and native_language = 'zh' and example_translation is distinct from $q$我不太确定，不过那也许是真的。我不太明白她是什么意思。$q$ and coalesce(example_translation, '') <> '';

-- c8e9cbc6-47fd-44f4-bb63-582a0a7b0e1a: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c8e9cbc6-47fd-44f4-bb63-582a0a7b0e1a', 'learning_objects', 'example_zh', example_zh, $q$你空闲时间做什么？我踢足球。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c8e9cbc6-47fd-44f4-bb63-582a0a7b0e1a' and example_zh is distinct from $q$你空闲时间做什么？我踢足球。$q$ and true;
update public.learning_objects set example_zh = $q$你空闲时间做什么？我踢足球。$q$, updated_at = now() where id = 'c8e9cbc6-47fd-44f4-bb63-582a0a7b0e1a' and example_zh is distinct from $q$你空闲时间做什么？我踢足球。$q$ and true;

-- c8e9cbc6-47fd-44f4-bb63-582a0a7b0e1a: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c8e9cbc6-47fd-44f4-bb63-582a0a7b0e1a', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你空闲时间做什么？我踢足球。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c8e9cbc6-47fd-44f4-bb63-582a0a7b0e1a' and native_language = 'zh' and example_translation is distinct from $q$你空闲时间做什么？我踢足球。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你空闲时间做什么？我踢足球。$q$, updated_at = now() where learning_object_id = 'c8e9cbc6-47fd-44f4-bb63-582a0a7b0e1a' and native_language = 'zh' and example_translation is distinct from $q$你空闲时间做什么？我踢足球。$q$ and coalesce(example_translation, '') <> '';

-- c98d5a51-82bc-4f19-9141-1c21c21c712f: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c98d5a51-82bc-4f19-9141-1c21c21c712f', 'learning_objects', 'example_zh', example_zh, $q$你以前住在哪里来着？我不记得你说的是哪个城市了。你上高中的时候住在哪里来着？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c98d5a51-82bc-4f19-9141-1c21c21c712f' and example_zh is distinct from $q$你以前住在哪里来着？我不记得你说的是哪个城市了。你上高中的时候住在哪里来着？$q$ and true;
update public.learning_objects set example_zh = $q$你以前住在哪里来着？我不记得你说的是哪个城市了。你上高中的时候住在哪里来着？$q$, updated_at = now() where id = 'c98d5a51-82bc-4f19-9141-1c21c21c712f' and example_zh is distinct from $q$你以前住在哪里来着？我不记得你说的是哪个城市了。你上高中的时候住在哪里来着？$q$ and true;

-- c98d5a51-82bc-4f19-9141-1c21c21c712f: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c98d5a51-82bc-4f19-9141-1c21c21c712f', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你以前住在哪里来着？我不记得你说的是哪个城市了。你上高中的时候住在哪里来着？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c98d5a51-82bc-4f19-9141-1c21c21c712f' and native_language = 'zh' and example_translation is distinct from $q$你以前住在哪里来着？我不记得你说的是哪个城市了。你上高中的时候住在哪里来着？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你以前住在哪里来着？我不记得你说的是哪个城市了。你上高中的时候住在哪里来着？$q$, updated_at = now() where learning_object_id = 'c98d5a51-82bc-4f19-9141-1c21c21c712f' and native_language = 'zh' and example_translation is distinct from $q$你以前住在哪里来着？我不记得你说的是哪个城市了。你上高中的时候住在哪里来着？$q$ and coalesce(example_translation, '') <> '';

-- cdb514e9-f92c-479c-bfae-7ad400dbc03a: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'cdb514e9-f92c-479c-bfae-7ad400dbc03a', 'learning_object_examples', 'insert', null, $q$Du kom i tid igen. Hur gick det till?$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'cdb514e9-f92c-479c-bfae-7ad400dbc03a' and example_swedish = $q$Du kom i tid igen. Hur gick det till?$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'cdb514e9-f92c-479c-bfae-7ad400dbc03a', $q$Du kom i tid igen. Hur gick det till?$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'cdb514e9-f92c-479c-bfae-7ad400dbc03a' and example_swedish = $q$Du kom i tid igen. Hur gick det till?$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$你这次又准时到了。这是怎么做到的？$q$ from x union all select id, 'en', $q$You made it on time again. How did that happen?$q$ from x;

-- cdb514e9-f92c-479c-bfae-7ad400dbc03a: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'cdb514e9-f92c-479c-bfae-7ad400dbc03a', 'learning_object_examples', 'insert', null, $q$Jag hörde att hon vann. Hur gick det till?$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'cdb514e9-f92c-479c-bfae-7ad400dbc03a' and example_swedish = $q$Jag hörde att hon vann. Hur gick det till?$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'cdb514e9-f92c-479c-bfae-7ad400dbc03a', $q$Jag hörde att hon vann. Hur gick det till?$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'cdb514e9-f92c-479c-bfae-7ad400dbc03a' and example_swedish = $q$Jag hörde att hon vann. Hur gick det till?$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$我听说她赢了。这是怎么回事？$q$ from x union all select id, 'en', $q$I heard that she won. How did that happen?$q$ from x;

-- ce092b9b-3006-4c25-8118-05ce8e1ea7b7: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'ce092b9b-3006-4c25-8118-05ce8e1ea7b7', 'learning_objects', 'example_zh', example_zh, $q$很多上了年纪的人说以前更好。我不同意以前更好这种说法。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'ce092b9b-3006-4c25-8118-05ce8e1ea7b7' and example_zh is distinct from $q$很多上了年纪的人说以前更好。我不同意以前更好这种说法。$q$ and true;
update public.learning_objects set example_zh = $q$很多上了年纪的人说以前更好。我不同意以前更好这种说法。$q$, updated_at = now() where id = 'ce092b9b-3006-4c25-8118-05ce8e1ea7b7' and example_zh is distinct from $q$很多上了年纪的人说以前更好。我不同意以前更好这种说法。$q$ and true;

-- ce092b9b-3006-4c25-8118-05ce8e1ea7b7: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'ce092b9b-3006-4c25-8118-05ce8e1ea7b7', 'learning_object_translations', 'zh.example_translation', example_translation, $q$很多上了年纪的人说以前更好。我不同意以前更好这种说法。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'ce092b9b-3006-4c25-8118-05ce8e1ea7b7' and native_language = 'zh' and example_translation is distinct from $q$很多上了年纪的人说以前更好。我不同意以前更好这种说法。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$很多上了年纪的人说以前更好。我不同意以前更好这种说法。$q$, updated_at = now() where learning_object_id = 'ce092b9b-3006-4c25-8118-05ce8e1ea7b7' and native_language = 'zh' and example_translation is distinct from $q$很多上了年纪的人说以前更好。我不同意以前更好这种说法。$q$ and coalesce(example_translation, '') <> '';

-- cef63132-5bf7-493d-ba12-79f8580898ee: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'cef63132-5bf7-493d-ba12-79f8580898ee', 'learning_objects', 'example_zh', example_zh, $q$好吧，那就这么说定了。我们星期五见。好吧，那就这么说定了，我们继续吧。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'cef63132-5bf7-493d-ba12-79f8580898ee' and example_zh is distinct from $q$好吧，那就这么说定了。我们星期五见。好吧，那就这么说定了，我们继续吧。$q$ and true;
update public.learning_objects set example_zh = $q$好吧，那就这么说定了。我们星期五见。好吧，那就这么说定了，我们继续吧。$q$, updated_at = now() where id = 'cef63132-5bf7-493d-ba12-79f8580898ee' and example_zh is distinct from $q$好吧，那就这么说定了。我们星期五见。好吧，那就这么说定了，我们继续吧。$q$ and true;

-- cef63132-5bf7-493d-ba12-79f8580898ee: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'cef63132-5bf7-493d-ba12-79f8580898ee', 'learning_object_translations', 'zh.example_translation', example_translation, $q$好吧，那就这么说定了。我们星期五见。好吧，那就这么说定了，我们继续吧。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'cef63132-5bf7-493d-ba12-79f8580898ee' and native_language = 'zh' and example_translation is distinct from $q$好吧，那就这么说定了。我们星期五见。好吧，那就这么说定了，我们继续吧。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$好吧，那就这么说定了。我们星期五见。好吧，那就这么说定了，我们继续吧。$q$, updated_at = now() where learning_object_id = 'cef63132-5bf7-493d-ba12-79f8580898ee' and native_language = 'zh' and example_translation is distinct from $q$好吧，那就这么说定了。我们星期五见。好吧，那就这么说定了，我们继续吧。$q$ and coalesce(example_translation, '') <> '';

-- cef63132-5bf7-493d-ba12-79f8580898ee: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'cef63132-5bf7-493d-ba12-79f8580898ee', 'learning_object_translations', 'en.example_translation', example_translation, $q$Okay, let's say that, then. See you on Friday. Okay, let's say that and move on.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'cef63132-5bf7-493d-ba12-79f8580898ee' and native_language = 'en' and example_translation is distinct from $q$Okay, let's say that, then. See you on Friday. Okay, let's say that and move on.$q$ and true;
update public.learning_object_translations set example_translation = $q$Okay, let's say that, then. See you on Friday. Okay, let's say that and move on.$q$, updated_at = now() where learning_object_id = 'cef63132-5bf7-493d-ba12-79f8580898ee' and native_language = 'en' and example_translation is distinct from $q$Okay, let's say that, then. See you on Friday. Okay, let's say that and move on.$q$ and true;

-- Tjaaa… jag vet inte rikitigt.: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd031c789-d42b-46ce-bd6d-5b256a6be57f', 'learning_objects', 'swedish', swedish, $q$Tjaaa… jag vet inte riktigt.$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = 'd031c789-d42b-46ce-bd6d-5b256a6be57f' and swedish is distinct from $q$Tjaaa… jag vet inte riktigt.$q$;
update public.learning_objects set swedish = $q$Tjaaa… jag vet inte riktigt.$q$, updated_at = now() where id = 'd031c789-d42b-46ce-bd6d-5b256a6be57f' and swedish is distinct from $q$Tjaaa… jag vet inte riktigt.$q$;

-- Tjaaa… jag vet inte rikitigt.: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd031c789-d42b-46ce-bd6d-5b256a6be57f', 'learning_objects', 'match_key', match_key, $q$tjaaa jag vet inte riktigt$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = 'd031c789-d42b-46ce-bd6d-5b256a6be57f' and match_key is distinct from $q$tjaaa jag vet inte riktigt$q$;
update public.learning_objects set match_key = $q$tjaaa jag vet inte riktigt$q$, updated_at = now() where id = 'd031c789-d42b-46ce-bd6d-5b256a6be57f' and match_key is distinct from $q$tjaaa jag vet inte riktigt$q$;

-- d031c789-d42b-46ce-bd6d-5b256a6be57f: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd031c789-d42b-46ce-bd6d-5b256a6be57f', 'learning_objects', 'example_zh', example_zh, $q$嗯……我不太确定。也许吧，但我得先想一想。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'd031c789-d42b-46ce-bd6d-5b256a6be57f' and example_zh is distinct from $q$嗯……我不太确定。也许吧，但我得先想一想。$q$ and true;
update public.learning_objects set example_zh = $q$嗯……我不太确定。也许吧，但我得先想一想。$q$, updated_at = now() where id = 'd031c789-d42b-46ce-bd6d-5b256a6be57f' and example_zh is distinct from $q$嗯……我不太确定。也许吧，但我得先想一想。$q$ and true;

-- d031c789-d42b-46ce-bd6d-5b256a6be57f: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd031c789-d42b-46ce-bd6d-5b256a6be57f', 'learning_object_translations', 'zh.example_translation', example_translation, $q$嗯……我不太确定。也许吧，但我得先想一想。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'd031c789-d42b-46ce-bd6d-5b256a6be57f' and native_language = 'zh' and example_translation is distinct from $q$嗯……我不太确定。也许吧，但我得先想一想。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$嗯……我不太确定。也许吧，但我得先想一想。$q$, updated_at = now() where learning_object_id = 'd031c789-d42b-46ce-bd6d-5b256a6be57f' and native_language = 'zh' and example_translation is distinct from $q$嗯……我不太确定。也许吧，但我得先想一想。$q$ and coalesce(example_translation, '') <> '';

-- d0cfbde8-a0c4-416f-9d4a-a3480eb2da09: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd0cfbde8-a0c4-416f-9d4a-a3480eb2da09', 'learning_objects', 'example_zh', example_zh, $q$老师发出信号，表示课结束了。他通过举手来示意。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'd0cfbde8-a0c4-416f-9d4a-a3480eb2da09' and example_zh is distinct from $q$老师发出信号，表示课结束了。他通过举手来示意。$q$ and true;
update public.learning_objects set example_zh = $q$老师发出信号，表示课结束了。他通过举手来示意。$q$, updated_at = now() where id = 'd0cfbde8-a0c4-416f-9d4a-a3480eb2da09' and example_zh is distinct from $q$老师发出信号，表示课结束了。他通过举手来示意。$q$ and true;

-- d0cfbde8-a0c4-416f-9d4a-a3480eb2da09: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd0cfbde8-a0c4-416f-9d4a-a3480eb2da09', 'learning_object_translations', 'zh.example_translation', example_translation, $q$老师发出信号，表示课结束了。他通过举手来示意。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'd0cfbde8-a0c4-416f-9d4a-a3480eb2da09' and native_language = 'zh' and example_translation is distinct from $q$老师发出信号，表示课结束了。他通过举手来示意。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$老师发出信号，表示课结束了。他通过举手来示意。$q$, updated_at = now() where learning_object_id = 'd0cfbde8-a0c4-416f-9d4a-a3480eb2da09' and native_language = 'zh' and example_translation is distinct from $q$老师发出信号，表示课结束了。他通过举手来示意。$q$ and coalesce(example_translation, '') <> '';

-- c3a0b0f0-44ee-432e-808d-890e82550754: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c3a0b0f0-44ee-432e-808d-890e82550754', 'learning_objects', 'example_zh', example_zh, $q$一个社会由许多人组成。他们有不同的角色和需求。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c3a0b0f0-44ee-432e-808d-890e82550754' and example_zh is distinct from $q$一个社会由许多人组成。他们有不同的角色和需求。$q$ and true;
update public.learning_objects set example_zh = $q$一个社会由许多人组成。他们有不同的角色和需求。$q$, updated_at = now() where id = 'c3a0b0f0-44ee-432e-808d-890e82550754' and example_zh is distinct from $q$一个社会由许多人组成。他们有不同的角色和需求。$q$ and true;

-- c3a0b0f0-44ee-432e-808d-890e82550754: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c3a0b0f0-44ee-432e-808d-890e82550754', 'learning_object_translations', 'zh.example_translation', example_translation, $q$一个社会由许多人组成。他们有不同的角色和需求。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c3a0b0f0-44ee-432e-808d-890e82550754' and native_language = 'zh' and example_translation is distinct from $q$一个社会由许多人组成。他们有不同的角色和需求。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$一个社会由许多人组成。他们有不同的角色和需求。$q$, updated_at = now() where learning_object_id = 'c3a0b0f0-44ee-432e-808d-890e82550754' and native_language = 'zh' and example_translation is distinct from $q$一个社会由许多人组成。他们有不同的角色和需求。$q$ and coalesce(example_translation, '') <> '';

-- Det låter ju helt vannsinigt.: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd4b85b4d-f880-4c0a-859d-fc014bcbfcd4', 'learning_objects', 'swedish', swedish, $q$Det låter ju helt vansinnigt.$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = 'd4b85b4d-f880-4c0a-859d-fc014bcbfcd4' and swedish is distinct from $q$Det låter ju helt vansinnigt.$q$;
update public.learning_objects set swedish = $q$Det låter ju helt vansinnigt.$q$, updated_at = now() where id = 'd4b85b4d-f880-4c0a-859d-fc014bcbfcd4' and swedish is distinct from $q$Det låter ju helt vansinnigt.$q$;

-- Det låter ju helt vannsinigt.: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd4b85b4d-f880-4c0a-859d-fc014bcbfcd4', 'learning_objects', 'match_key', match_key, $q$det låter ju helt vansinnigt$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = 'd4b85b4d-f880-4c0a-859d-fc014bcbfcd4' and match_key is distinct from $q$det låter ju helt vansinnigt$q$;
update public.learning_objects set match_key = $q$det låter ju helt vansinnigt$q$, updated_at = now() where id = 'd4b85b4d-f880-4c0a-859d-fc014bcbfcd4' and match_key is distinct from $q$det låter ju helt vansinnigt$q$;

-- d5bfaf9c-9c3e-49b7-a9c4-bd744e156137: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd5bfaf9c-9c3e-49b7-a9c4-bd744e156137', 'learning_object_examples', 'insert', null, $q$Va?! Sa du verkligen det?$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'd5bfaf9c-9c3e-49b7-a9c4-bd744e156137' and example_swedish = $q$Va?! Sa du verkligen det?$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'd5bfaf9c-9c3e-49b7-a9c4-bd744e156137', $q$Va?! Sa du verkligen det?$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'd5bfaf9c-9c3e-49b7-a9c4-bd744e156137' and example_swedish = $q$Va?! Sa du verkligen det?$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$什么？！你真的那样说了吗？$q$ from x union all select id, 'en', $q$What?! Did you really say that?$q$ from x;

-- d5bfaf9c-9c3e-49b7-a9c4-bd744e156137: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd5bfaf9c-9c3e-49b7-a9c4-bd744e156137', 'learning_object_examples', 'insert', null, $q$Va?! Jag hörde inte vad du sa.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'd5bfaf9c-9c3e-49b7-a9c4-bd744e156137' and example_swedish = $q$Va?! Jag hörde inte vad du sa.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'd5bfaf9c-9c3e-49b7-a9c4-bd744e156137', $q$Va?! Jag hörde inte vad du sa.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'd5bfaf9c-9c3e-49b7-a9c4-bd744e156137' and example_swedish = $q$Va?! Jag hörde inte vad du sa.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$啊？！我没听清你说什么。$q$ from x union all select id, 'en', $q$Huh?! I didn't hear what you said.$q$ from x;

-- Sankta Lucia St.: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'da91e5bb-914c-44b1-9807-ede4465fe357', 'learning_objects', 'swedish', swedish, $q$Sankta Lucia$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = 'da91e5bb-914c-44b1-9807-ede4465fe357' and swedish is distinct from $q$Sankta Lucia$q$;
update public.learning_objects set swedish = $q$Sankta Lucia$q$, updated_at = now() where id = 'da91e5bb-914c-44b1-9807-ede4465fe357' and swedish is distinct from $q$Sankta Lucia$q$;

-- Sankta Lucia St.: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'da91e5bb-914c-44b1-9807-ede4465fe357', 'learning_objects', 'match_key', match_key, $q$sankta lucia$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = 'da91e5bb-914c-44b1-9807-ede4465fe357' and match_key is distinct from $q$sankta lucia$q$;
update public.learning_objects set match_key = $q$sankta lucia$q$, updated_at = now() where id = 'da91e5bb-914c-44b1-9807-ede4465fe357' and match_key is distinct from $q$sankta lucia$q$;

-- da91e5bb-914c-44b1-9807-ede4465fe357: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'da91e5bb-914c-44b1-9807-ede4465fe357', 'learning_object_examples', 'insert', null, $q$Vi firar Sankta Lucia den 13 december.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'da91e5bb-914c-44b1-9807-ede4465fe357' and example_swedish = $q$Vi firar Sankta Lucia den 13 december.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'da91e5bb-914c-44b1-9807-ede4465fe357', $q$Vi firar Sankta Lucia den 13 december.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'da91e5bb-914c-44b1-9807-ede4465fe357' and example_swedish = $q$Vi firar Sankta Lucia den 13 december.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$我们在12月13日庆祝圣露西亚节。$q$ from x union all select id, 'en', $q$We celebrate Saint Lucia on December 13.$q$ from x;

-- da91e5bb-914c-44b1-9807-ede4465fe357: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'da91e5bb-914c-44b1-9807-ede4465fe357', 'learning_object_examples', 'insert', null, $q$Sankta Lucia är viktig i svensk tradition.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'da91e5bb-914c-44b1-9807-ede4465fe357' and example_swedish = $q$Sankta Lucia är viktig i svensk tradition.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'da91e5bb-914c-44b1-9807-ede4465fe357', $q$Sankta Lucia är viktig i svensk tradition.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'da91e5bb-914c-44b1-9807-ede4465fe357' and example_swedish = $q$Sankta Lucia är viktig i svensk tradition.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$圣露西亚在瑞典传统中很重要。$q$ from x union all select id, 'en', $q$Saint Lucia is important in Swedish tradition.$q$ from x;

-- de686954-3120-49c3-8278-e4ed9e8dc57f: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'de686954-3120-49c3-8278-e4ed9e8dc57f', 'learning_object_examples', 'insert', null, $q$Tyvärr är det ingenting vi kan göra. Vi har redan följt våra regler.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'de686954-3120-49c3-8278-e4ed9e8dc57f' and example_swedish = $q$Tyvärr är det ingenting vi kan göra. Vi har redan följt våra regler.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'de686954-3120-49c3-8278-e4ed9e8dc57f', $q$Tyvärr är det ingenting vi kan göra. Vi har redan följt våra regler.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'de686954-3120-49c3-8278-e4ed9e8dc57f' and example_swedish = $q$Tyvärr är det ingenting vi kan göra. Vi har redan följt våra regler.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$很遗憾，我们无能为力。我们已经遵守了我们的规定。$q$ from x union all select id, 'en', $q$Unfortunately, there’s nothing we can do. We have already followed our rules.$q$ from x;

-- de686954-3120-49c3-8278-e4ed9e8dc57f: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'de686954-3120-49c3-8278-e4ed9e8dc57f', 'learning_object_examples', 'insert', null, $q$Tyvärr är det ingenting vi kan göra just nu.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'de686954-3120-49c3-8278-e4ed9e8dc57f' and example_swedish = $q$Tyvärr är det ingenting vi kan göra just nu.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'de686954-3120-49c3-8278-e4ed9e8dc57f', $q$Tyvärr är det ingenting vi kan göra just nu.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'de686954-3120-49c3-8278-e4ed9e8dc57f' and example_swedish = $q$Tyvärr är det ingenting vi kan göra just nu.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$很遗憾，我们现在无能为力。$q$ from x union all select id, 'en', $q$Unfortunately, there’s nothing we can do right now.$q$ from x;

-- de9f4a3c-d489-4ccd-9ed9-4a9fbf7dbd38: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'de9f4a3c-d489-4ccd-9ed9-4a9fbf7dbd38', 'learning_object_examples', 'insert', null, $q$Javisst, det går bra.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'de9f4a3c-d489-4ccd-9ed9-4a9fbf7dbd38' and example_swedish = $q$Javisst, det går bra.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'de9f4a3c-d489-4ccd-9ed9-4a9fbf7dbd38', $q$Javisst, det går bra.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'de9f4a3c-d489-4ccd-9ed9-4a9fbf7dbd38' and example_swedish = $q$Javisst, det går bra.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$当然，可以。$q$ from x union all select id, 'en', $q$Of course, that’s fine.$q$ from x;

-- de9f4a3c-d489-4ccd-9ed9-4a9fbf7dbd38: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'de9f4a3c-d489-4ccd-9ed9-4a9fbf7dbd38', 'learning_object_examples', 'insert', null, $q$Javisst, jag hjälper dig gärna.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'de9f4a3c-d489-4ccd-9ed9-4a9fbf7dbd38' and example_swedish = $q$Javisst, jag hjälper dig gärna.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'de9f4a3c-d489-4ccd-9ed9-4a9fbf7dbd38', $q$Javisst, jag hjälper dig gärna.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'de9f4a3c-d489-4ccd-9ed9-4a9fbf7dbd38' and example_swedish = $q$Javisst, jag hjälper dig gärna.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$当然，我很乐意帮你。$q$ from x union all select id, 'en', $q$Of course, I’d be happy to help you.$q$ from x;

-- dfa54761-506c-4325-92df-3cd1ee4f4b5b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'dfa54761-506c-4325-92df-3cd1ee4f4b5b', 'learning_objects', 'example_zh', example_zh, $q$是，这很贵，不过另一方面它非常好。是，不过另一方面这能节省时间。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'dfa54761-506c-4325-92df-3cd1ee4f4b5b' and example_zh is distinct from $q$是，这很贵，不过另一方面它非常好。是，不过另一方面这能节省时间。$q$ and true;
update public.learning_objects set example_zh = $q$是，这很贵，不过另一方面它非常好。是，不过另一方面这能节省时间。$q$, updated_at = now() where id = 'dfa54761-506c-4325-92df-3cd1ee4f4b5b' and example_zh is distinct from $q$是，这很贵，不过另一方面它非常好。是，不过另一方面这能节省时间。$q$ and true;

-- dfa54761-506c-4325-92df-3cd1ee4f4b5b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'dfa54761-506c-4325-92df-3cd1ee4f4b5b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$是，这很贵，不过另一方面它非常好。是，不过另一方面这能节省时间。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'dfa54761-506c-4325-92df-3cd1ee4f4b5b' and native_language = 'zh' and example_translation is distinct from $q$是，这很贵，不过另一方面它非常好。是，不过另一方面这能节省时间。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$是，这很贵，不过另一方面它非常好。是，不过另一方面这能节省时间。$q$, updated_at = now() where learning_object_id = 'dfa54761-506c-4325-92df-3cd1ee4f4b5b' and native_language = 'zh' and example_translation is distinct from $q$是，这很贵，不过另一方面它非常好。是，不过另一方面这能节省时间。$q$ and coalesce(example_translation, '') <> '';

-- e04a5803-1dd2-4b22-a562-acc717cd0192: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e04a5803-1dd2-4b22-a562-acc717cd0192', 'learning_objects', 'example_zh', example_zh, $q$嗨！最近怎么样？挺好的，一切都不错。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'e04a5803-1dd2-4b22-a562-acc717cd0192' and example_zh is distinct from $q$嗨！最近怎么样？挺好的，一切都不错。$q$ and true;
update public.learning_objects set example_zh = $q$嗨！最近怎么样？挺好的，一切都不错。$q$, updated_at = now() where id = 'e04a5803-1dd2-4b22-a562-acc717cd0192' and example_zh is distinct from $q$嗨！最近怎么样？挺好的，一切都不错。$q$ and true;

-- e04a5803-1dd2-4b22-a562-acc717cd0192: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e04a5803-1dd2-4b22-a562-acc717cd0192', 'learning_object_translations', 'zh.example_translation', example_translation, $q$嗨！最近怎么样？挺好的，一切都不错。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'e04a5803-1dd2-4b22-a562-acc717cd0192' and native_language = 'zh' and example_translation is distinct from $q$嗨！最近怎么样？挺好的，一切都不错。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$嗨！最近怎么样？挺好的，一切都不错。$q$, updated_at = now() where learning_object_id = 'e04a5803-1dd2-4b22-a562-acc717cd0192' and native_language = 'zh' and example_translation is distinct from $q$嗨！最近怎么样？挺好的，一切都不错。$q$ and coalesce(example_translation, '') <> '';

-- e11c52fb-91a3-4fbd-b01f-cef6f266af5e: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e11c52fb-91a3-4fbd-b01f-cef6f266af5e', 'learning_objects', 'example_zh', example_zh, $q$该提案在议会通过了。经过长时间辩论后，预算获得通过。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'e11c52fb-91a3-4fbd-b01f-cef6f266af5e' and example_zh is distinct from $q$该提案在议会通过了。经过长时间辩论后，预算获得通过。$q$ and true;
update public.learning_objects set example_zh = $q$该提案在议会通过了。经过长时间辩论后，预算获得通过。$q$, updated_at = now() where id = 'e11c52fb-91a3-4fbd-b01f-cef6f266af5e' and example_zh is distinct from $q$该提案在议会通过了。经过长时间辩论后，预算获得通过。$q$ and true;

-- e11c52fb-91a3-4fbd-b01f-cef6f266af5e: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e11c52fb-91a3-4fbd-b01f-cef6f266af5e', 'learning_object_translations', 'zh.example_translation', example_translation, $q$该提案在议会通过了。经过长时间辩论后，预算获得通过。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'e11c52fb-91a3-4fbd-b01f-cef6f266af5e' and native_language = 'zh' and example_translation is distinct from $q$该提案在议会通过了。经过长时间辩论后，预算获得通过。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$该提案在议会通过了。经过长时间辩论后，预算获得通过。$q$, updated_at = now() where learning_object_id = 'e11c52fb-91a3-4fbd-b01f-cef6f266af5e' and native_language = 'zh' and example_translation is distinct from $q$该提案在议会通过了。经过长时间辩论后，预算获得通过。$q$ and coalesce(example_translation, '') <> '';

-- d4399ebb-3fcd-4300-b543-c568f2aac5b9: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd4399ebb-3fcd-4300-b543-c568f2aac5b9', 'learning_objects', 'example_zh', example_zh, $q$去乌普萨拉的火车什么时候开？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'd4399ebb-3fcd-4300-b543-c568f2aac5b9' and example_zh is distinct from $q$去乌普萨拉的火车什么时候开？$q$ and true;
update public.learning_objects set example_zh = $q$去乌普萨拉的火车什么时候开？$q$, updated_at = now() where id = 'd4399ebb-3fcd-4300-b543-c568f2aac5b9' and example_zh is distinct from $q$去乌普萨拉的火车什么时候开？$q$ and true;

-- d4399ebb-3fcd-4300-b543-c568f2aac5b9: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd4399ebb-3fcd-4300-b543-c568f2aac5b9', 'learning_object_translations', 'zh.example_translation', example_translation, $q$去乌普萨拉的火车什么时候开？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'd4399ebb-3fcd-4300-b543-c568f2aac5b9' and native_language = 'zh' and example_translation is distinct from $q$去乌普萨拉的火车什么时候开？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$去乌普萨拉的火车什么时候开？$q$, updated_at = now() where learning_object_id = 'd4399ebb-3fcd-4300-b543-c568f2aac5b9' and native_language = 'zh' and example_translation is distinct from $q$去乌普萨拉的火车什么时候开？$q$ and coalesce(example_translation, '') <> '';

-- e3f19d9f-f5ca-4cf8-b0ad-7d0d551ec228: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e3f19d9f-f5ca-4cf8-b0ad-7d0d551ec228', 'learning_objects', 'example_zh', example_zh, $q$我们现在回家吗？我们要不要订周五的桌位？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'e3f19d9f-f5ca-4cf8-b0ad-7d0d551ec228' and example_zh is distinct from $q$我们现在回家吗？我们要不要订周五的桌位？$q$ and true;
update public.learning_objects set example_zh = $q$我们现在回家吗？我们要不要订周五的桌位？$q$, updated_at = now() where id = 'e3f19d9f-f5ca-4cf8-b0ad-7d0d551ec228' and example_zh is distinct from $q$我们现在回家吗？我们要不要订周五的桌位？$q$ and true;

-- e3f19d9f-f5ca-4cf8-b0ad-7d0d551ec228: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e3f19d9f-f5ca-4cf8-b0ad-7d0d551ec228', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我们现在回家吗？我们要不要订周五的桌位？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'e3f19d9f-f5ca-4cf8-b0ad-7d0d551ec228' and native_language = 'zh' and example_translation is distinct from $q$我们现在回家吗？我们要不要订周五的桌位？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我们现在回家吗？我们要不要订周五的桌位？$q$, updated_at = now() where learning_object_id = 'e3f19d9f-f5ca-4cf8-b0ad-7d0d551ec228' and native_language = 'zh' and example_translation is distinct from $q$我们现在回家吗？我们要不要订周五的桌位？$q$ and coalesce(example_translation, '') <> '';

-- e4f299fc-5722-4ca6-8bb0-f974b5297a06: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e4f299fc-5722-4ca6-8bb0-f974b5297a06', 'learning_objects', 'example_zh', example_zh, $q$这部电影根据真实事件改编。这本书也以真实人物和环境为基础。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'e4f299fc-5722-4ca6-8bb0-f974b5297a06' and example_zh is distinct from $q$这部电影根据真实事件改编。这本书也以真实人物和环境为基础。$q$ and true;
update public.learning_objects set example_zh = $q$这部电影根据真实事件改编。这本书也以真实人物和环境为基础。$q$, updated_at = now() where id = 'e4f299fc-5722-4ca6-8bb0-f974b5297a06' and example_zh is distinct from $q$这部电影根据真实事件改编。这本书也以真实人物和环境为基础。$q$ and true;

-- e4f299fc-5722-4ca6-8bb0-f974b5297a06: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e4f299fc-5722-4ca6-8bb0-f974b5297a06', 'learning_object_translations', 'zh.example_translation', example_translation, $q$这部电影根据真实事件改编。这本书也以真实人物和环境为基础。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'e4f299fc-5722-4ca6-8bb0-f974b5297a06' and native_language = 'zh' and example_translation is distinct from $q$这部电影根据真实事件改编。这本书也以真实人物和环境为基础。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$这部电影根据真实事件改编。这本书也以真实人物和环境为基础。$q$, updated_at = now() where learning_object_id = 'e4f299fc-5722-4ca6-8bb0-f974b5297a06' and native_language = 'zh' and example_translation is distinct from $q$这部电影根据真实事件改编。这本书也以真实人物和环境为基础。$q$ and coalesce(example_translation, '') <> '';

-- e4f299fc-5722-4ca6-8bb0-f974b5297a06: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e4f299fc-5722-4ca6-8bb0-f974b5297a06', 'learning_object_translations', 'en.example_translation', example_translation, $q$The film is based on a real event. The book is also based on real people and settings.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'e4f299fc-5722-4ca6-8bb0-f974b5297a06' and native_language = 'en' and example_translation is distinct from $q$The film is based on a real event. The book is also based on real people and settings.$q$ and true;
update public.learning_object_translations set example_translation = $q$The film is based on a real event. The book is also based on real people and settings.$q$, updated_at = now() where learning_object_id = 'e4f299fc-5722-4ca6-8bb0-f974b5297a06' and native_language = 'en' and example_translation is distinct from $q$The film is based on a real event. The book is also based on real people and settings.$q$ and true;

-- e57cf733-6e8c-4075-9925-cd5abaf4f3f4: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e57cf733-6e8c-4075-9925-cd5abaf4f3f4', 'learning_objects', 'example_zh', example_zh, $q$这个东西用瑞典语叫什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'e57cf733-6e8c-4075-9925-cd5abaf4f3f4' and example_zh is distinct from $q$这个东西用瑞典语叫什么？$q$ and true;
update public.learning_objects set example_zh = $q$这个东西用瑞典语叫什么？$q$, updated_at = now() where id = 'e57cf733-6e8c-4075-9925-cd5abaf4f3f4' and example_zh is distinct from $q$这个东西用瑞典语叫什么？$q$ and true;

-- e57cf733-6e8c-4075-9925-cd5abaf4f3f4: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e57cf733-6e8c-4075-9925-cd5abaf4f3f4', 'learning_object_translations', 'zh.example_translation', example_translation, $q$这个东西用瑞典语叫什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'e57cf733-6e8c-4075-9925-cd5abaf4f3f4' and native_language = 'zh' and example_translation is distinct from $q$这个东西用瑞典语叫什么？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$这个东西用瑞典语叫什么？$q$, updated_at = now() where learning_object_id = 'e57cf733-6e8c-4075-9925-cd5abaf4f3f4' and native_language = 'zh' and example_translation is distinct from $q$这个东西用瑞典语叫什么？$q$ and coalesce(example_translation, '') <> '';

-- e7750e88-a4a3-46c0-b8aa-f63319492027: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e7750e88-a4a3-46c0-b8aa-f63319492027', 'learning_objects', 'example_zh', example_zh, $q$你连续工作了十二个小时？这听起来太可怕了！这听起来很糟，不过我很高兴结果还不错。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'e7750e88-a4a3-46c0-b8aa-f63319492027' and example_zh is distinct from $q$你连续工作了十二个小时？这听起来太可怕了！这听起来很糟，不过我很高兴结果还不错。$q$ and true;
update public.learning_objects set example_zh = $q$你连续工作了十二个小时？这听起来太可怕了！这听起来很糟，不过我很高兴结果还不错。$q$, updated_at = now() where id = 'e7750e88-a4a3-46c0-b8aa-f63319492027' and example_zh is distinct from $q$你连续工作了十二个小时？这听起来太可怕了！这听起来很糟，不过我很高兴结果还不错。$q$ and true;

-- e7750e88-a4a3-46c0-b8aa-f63319492027: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e7750e88-a4a3-46c0-b8aa-f63319492027', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你连续工作了十二个小时？这听起来太可怕了！这听起来很糟，不过我很高兴结果还不错。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'e7750e88-a4a3-46c0-b8aa-f63319492027' and native_language = 'zh' and example_translation is distinct from $q$你连续工作了十二个小时？这听起来太可怕了！这听起来很糟，不过我很高兴结果还不错。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你连续工作了十二个小时？这听起来太可怕了！这听起来很糟，不过我很高兴结果还不错。$q$, updated_at = now() where learning_object_id = 'e7750e88-a4a3-46c0-b8aa-f63319492027' and native_language = 'zh' and example_translation is distinct from $q$你连续工作了十二个小时？这听起来太可怕了！这听起来很糟，不过我很高兴结果还不错。$q$ and coalesce(example_translation, '') <> '';

-- e7c2bb5a-5963-433c-b488-9501d9fb0bc9: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e7c2bb5a-5963-433c-b488-9501d9fb0bc9', 'learning_objects', 'example_sv', example_sv, $q$Jag minns inte allt. Vad gjorde jag igår efter jobbet? Vi försöker komma ihåg vad jag gjorde igår.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'e7c2bb5a-5963-433c-b488-9501d9fb0bc9' and example_sv is distinct from $q$Jag minns inte allt. Vad gjorde jag igår efter jobbet? Vi försöker komma ihåg vad jag gjorde igår.$q$ and true;
update public.learning_objects set example_sv = $q$Jag minns inte allt. Vad gjorde jag igår efter jobbet? Vi försöker komma ihåg vad jag gjorde igår.$q$, updated_at = now() where id = 'e7c2bb5a-5963-433c-b488-9501d9fb0bc9' and example_sv is distinct from $q$Jag minns inte allt. Vad gjorde jag igår efter jobbet? Vi försöker komma ihåg vad jag gjorde igår.$q$ and true;

-- e7c2bb5a-5963-433c-b488-9501d9fb0bc9: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e7c2bb5a-5963-433c-b488-9501d9fb0bc9', 'learning_objects', 'example_zh', example_zh, $q$我记不清所有事情了。我昨天下班后做了什么？我们试着回想我昨天做了什么。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'e7c2bb5a-5963-433c-b488-9501d9fb0bc9' and example_zh is distinct from $q$我记不清所有事情了。我昨天下班后做了什么？我们试着回想我昨天做了什么。$q$ and true;
update public.learning_objects set example_zh = $q$我记不清所有事情了。我昨天下班后做了什么？我们试着回想我昨天做了什么。$q$, updated_at = now() where id = 'e7c2bb5a-5963-433c-b488-9501d9fb0bc9' and example_zh is distinct from $q$我记不清所有事情了。我昨天下班后做了什么？我们试着回想我昨天做了什么。$q$ and true;

-- e7c2bb5a-5963-433c-b488-9501d9fb0bc9: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e7c2bb5a-5963-433c-b488-9501d9fb0bc9', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我记不清所有事情了。我昨天下班后做了什么？我们试着回想我昨天做了什么。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'e7c2bb5a-5963-433c-b488-9501d9fb0bc9' and native_language = 'zh' and example_translation is distinct from $q$我记不清所有事情了。我昨天下班后做了什么？我们试着回想我昨天做了什么。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我记不清所有事情了。我昨天下班后做了什么？我们试着回想我昨天做了什么。$q$, updated_at = now() where learning_object_id = 'e7c2bb5a-5963-433c-b488-9501d9fb0bc9' and native_language = 'zh' and example_translation is distinct from $q$我记不清所有事情了。我昨天下班后做了什么？我们试着回想我昨天做了什么。$q$ and coalesce(example_translation, '') <> '';

-- e9c0cc3f-4568-48ef-848e-04c838326afd: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e9c0cc3f-4568-48ef-848e-04c838326afd', 'learning_objects', 'example_zh', example_zh, $q$我会晚一点到。希望这样没问题。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'e9c0cc3f-4568-48ef-848e-04c838326afd' and example_zh is distinct from $q$我会晚一点到。希望这样没问题。$q$ and true;
update public.learning_objects set example_zh = $q$我会晚一点到。希望这样没问题。$q$, updated_at = now() where id = 'e9c0cc3f-4568-48ef-848e-04c838326afd' and example_zh is distinct from $q$我会晚一点到。希望这样没问题。$q$ and true;

-- e9c0cc3f-4568-48ef-848e-04c838326afd: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e9c0cc3f-4568-48ef-848e-04c838326afd', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我会晚一点到。希望这样没问题。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'e9c0cc3f-4568-48ef-848e-04c838326afd' and native_language = 'zh' and example_translation is distinct from $q$我会晚一点到。希望这样没问题。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我会晚一点到。希望这样没问题。$q$, updated_at = now() where learning_object_id = 'e9c0cc3f-4568-48ef-848e-04c838326afd' and native_language = 'zh' and example_translation is distinct from $q$我会晚一点到。希望这样没问题。$q$ and coalesce(example_translation, '') <> '';

-- f0dae4f4-5a0c-40a0-949f-d61c7cd4b8da: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f0dae4f4-5a0c-40a0-949f-d61c7cd4b8da', 'learning_objects', 'example_zh', example_zh, $q$这不可能吧，我竟然真的赢了！他已经辞职了，这不是真的。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'f0dae4f4-5a0c-40a0-949f-d61c7cd4b8da' and example_zh is distinct from $q$这不可能吧，我竟然真的赢了！他已经辞职了，这不是真的。$q$ and true;
update public.learning_objects set example_zh = $q$这不可能吧，我竟然真的赢了！他已经辞职了，这不是真的。$q$, updated_at = now() where id = 'f0dae4f4-5a0c-40a0-949f-d61c7cd4b8da' and example_zh is distinct from $q$这不可能吧，我竟然真的赢了！他已经辞职了，这不是真的。$q$ and true;

-- f0dae4f4-5a0c-40a0-949f-d61c7cd4b8da: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f0dae4f4-5a0c-40a0-949f-d61c7cd4b8da', 'learning_object_translations', 'zh.example_translation', example_translation, $q$这不可能吧，我竟然真的赢了！他已经辞职了，这不是真的。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'f0dae4f4-5a0c-40a0-949f-d61c7cd4b8da' and native_language = 'zh' and example_translation is distinct from $q$这不可能吧，我竟然真的赢了！他已经辞职了，这不是真的。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$这不可能吧，我竟然真的赢了！他已经辞职了，这不是真的。$q$, updated_at = now() where learning_object_id = 'f0dae4f4-5a0c-40a0-949f-d61c7cd4b8da' and native_language = 'zh' and example_translation is distinct from $q$这不可能吧，我竟然真的赢了！他已经辞职了，这不是真的。$q$ and coalesce(example_translation, '') <> '';

-- f0dae4f4-5a0c-40a0-949f-d61c7cd4b8da: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f0dae4f4-5a0c-40a0-949f-d61c7cd4b8da', 'learning_object_translations', 'en.example_translation', example_translation, $q$No way, I actually won! It’s not true that he has quit.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'f0dae4f4-5a0c-40a0-949f-d61c7cd4b8da' and native_language = 'en' and example_translation is distinct from $q$No way, I actually won! It’s not true that he has quit.$q$ and true;
update public.learning_object_translations set example_translation = $q$No way, I actually won! It’s not true that he has quit.$q$, updated_at = now() where learning_object_id = 'f0dae4f4-5a0c-40a0-949f-d61c7cd4b8da' and native_language = 'en' and example_translation is distinct from $q$No way, I actually won! It’s not true that he has quit.$q$ and true;

-- f190b10b-59d6-42d9-97ff-3bebe66afc29: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f190b10b-59d6-42d9-97ff-3bebe66afc29', 'learning_objects', 'example_zh', example_zh, $q$当他又一次迟到时，那就成了压垮骆驼的最后一根稻草。那个小错误成了最后一根稻草。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'f190b10b-59d6-42d9-97ff-3bebe66afc29' and example_zh is distinct from $q$当他又一次迟到时，那就成了压垮骆驼的最后一根稻草。那个小错误成了最后一根稻草。$q$ and true;
update public.learning_objects set example_zh = $q$当他又一次迟到时，那就成了压垮骆驼的最后一根稻草。那个小错误成了最后一根稻草。$q$, updated_at = now() where id = 'f190b10b-59d6-42d9-97ff-3bebe66afc29' and example_zh is distinct from $q$当他又一次迟到时，那就成了压垮骆驼的最后一根稻草。那个小错误成了最后一根稻草。$q$ and true;

-- f190b10b-59d6-42d9-97ff-3bebe66afc29: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f190b10b-59d6-42d9-97ff-3bebe66afc29', 'learning_object_translations', 'zh.example_translation', example_translation, $q$当他又一次迟到时，那就成了压垮骆驼的最后一根稻草。那个小错误成了最后一根稻草。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'f190b10b-59d6-42d9-97ff-3bebe66afc29' and native_language = 'zh' and example_translation is distinct from $q$当他又一次迟到时，那就成了压垮骆驼的最后一根稻草。那个小错误成了最后一根稻草。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$当他又一次迟到时，那就成了压垮骆驼的最后一根稻草。那个小错误成了最后一根稻草。$q$, updated_at = now() where learning_object_id = 'f190b10b-59d6-42d9-97ff-3bebe66afc29' and native_language = 'zh' and example_translation is distinct from $q$当他又一次迟到时，那就成了压垮骆驼的最后一根稻草。那个小错误成了最后一根稻草。$q$ and coalesce(example_translation, '') <> '';

-- f21b54c5-846f-4051-84a3-aa6bebd7d227: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f21b54c5-846f-4051-84a3-aa6bebd7d227', 'learning_objects', 'example_zh', example_zh, $q$我感冒了，今天待在家里。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'f21b54c5-846f-4051-84a3-aa6bebd7d227' and example_zh is distinct from $q$我感冒了，今天待在家里。$q$ and true;
update public.learning_objects set example_zh = $q$我感冒了，今天待在家里。$q$, updated_at = now() where id = 'f21b54c5-846f-4051-84a3-aa6bebd7d227' and example_zh is distinct from $q$我感冒了，今天待在家里。$q$ and true;

-- f21b54c5-846f-4051-84a3-aa6bebd7d227: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f21b54c5-846f-4051-84a3-aa6bebd7d227', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我感冒了，今天待在家里。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'f21b54c5-846f-4051-84a3-aa6bebd7d227' and native_language = 'zh' and example_translation is distinct from $q$我感冒了，今天待在家里。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我感冒了，今天待在家里。$q$, updated_at = now() where learning_object_id = 'f21b54c5-846f-4051-84a3-aa6bebd7d227' and native_language = 'zh' and example_translation is distinct from $q$我感冒了，今天待在家里。$q$ and coalesce(example_translation, '') <> '';

-- f23b6c41-83d6-42cc-8411-9b1bff3549f1: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f23b6c41-83d6-42cc-8411-9b1bff3549f1', 'learning_objects', 'example_zh', example_zh, $q$你知道瑞典有很多湖吗？你知道他也会说法语吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'f23b6c41-83d6-42cc-8411-9b1bff3549f1' and example_zh is distinct from $q$你知道瑞典有很多湖吗？你知道他也会说法语吗？$q$ and true;
update public.learning_objects set example_zh = $q$你知道瑞典有很多湖吗？你知道他也会说法语吗？$q$, updated_at = now() where id = 'f23b6c41-83d6-42cc-8411-9b1bff3549f1' and example_zh is distinct from $q$你知道瑞典有很多湖吗？你知道他也会说法语吗？$q$ and true;

-- f23b6c41-83d6-42cc-8411-9b1bff3549f1: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f23b6c41-83d6-42cc-8411-9b1bff3549f1', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你知道瑞典有很多湖吗？你知道他也会说法语吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'f23b6c41-83d6-42cc-8411-9b1bff3549f1' and native_language = 'zh' and example_translation is distinct from $q$你知道瑞典有很多湖吗？你知道他也会说法语吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你知道瑞典有很多湖吗？你知道他也会说法语吗？$q$, updated_at = now() where learning_object_id = 'f23b6c41-83d6-42cc-8411-9b1bff3549f1' and native_language = 'zh' and example_translation is distinct from $q$你知道瑞典有很多湖吗？你知道他也会说法语吗？$q$ and coalesce(example_translation, '') <> '';

-- f35214c1-17e0-4dd9-ad5e-2c24b4901156: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f35214c1-17e0-4dd9-ad5e-2c24b4901156', 'learning_objects', 'example_zh', example_zh, $q$谢谢上次，那顿晚餐很愉快。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'f35214c1-17e0-4dd9-ad5e-2c24b4901156' and example_zh is distinct from $q$谢谢上次，那顿晚餐很愉快。$q$ and true;
update public.learning_objects set example_zh = $q$谢谢上次，那顿晚餐很愉快。$q$, updated_at = now() where id = 'f35214c1-17e0-4dd9-ad5e-2c24b4901156' and example_zh is distinct from $q$谢谢上次，那顿晚餐很愉快。$q$ and true;

-- f35214c1-17e0-4dd9-ad5e-2c24b4901156: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f35214c1-17e0-4dd9-ad5e-2c24b4901156', 'learning_object_translations', 'zh.example_translation', example_translation, $q$谢谢上次，那顿晚餐很愉快。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'f35214c1-17e0-4dd9-ad5e-2c24b4901156' and native_language = 'zh' and example_translation is distinct from $q$谢谢上次，那顿晚餐很愉快。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$谢谢上次，那顿晚餐很愉快。$q$, updated_at = now() where learning_object_id = 'f35214c1-17e0-4dd9-ad5e-2c24b4901156' and native_language = 'zh' and example_translation is distinct from $q$谢谢上次，那顿晚餐很愉快。$q$ and coalesce(example_translation, '') <> '';

-- fb681d32-5858-48a4-9087-29d85b0c4a74: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fb681d32-5858-48a4-9087-29d85b0c4a74', 'learning_objects', 'example_zh', example_zh, $q$你知道昨天发生了什么吗？我找到了一份新工作。你知道昨天晚上发生了什么吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'fb681d32-5858-48a4-9087-29d85b0c4a74' and example_zh is distinct from $q$你知道昨天发生了什么吗？我找到了一份新工作。你知道昨天晚上发生了什么吗？$q$ and true;
update public.learning_objects set example_zh = $q$你知道昨天发生了什么吗？我找到了一份新工作。你知道昨天晚上发生了什么吗？$q$, updated_at = now() where id = 'fb681d32-5858-48a4-9087-29d85b0c4a74' and example_zh is distinct from $q$你知道昨天发生了什么吗？我找到了一份新工作。你知道昨天晚上发生了什么吗？$q$ and true;

-- fb681d32-5858-48a4-9087-29d85b0c4a74: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fb681d32-5858-48a4-9087-29d85b0c4a74', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你知道昨天发生了什么吗？我找到了一份新工作。你知道昨天晚上发生了什么吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'fb681d32-5858-48a4-9087-29d85b0c4a74' and native_language = 'zh' and example_translation is distinct from $q$你知道昨天发生了什么吗？我找到了一份新工作。你知道昨天晚上发生了什么吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你知道昨天发生了什么吗？我找到了一份新工作。你知道昨天晚上发生了什么吗？$q$, updated_at = now() where learning_object_id = 'fb681d32-5858-48a4-9087-29d85b0c4a74' and native_language = 'zh' and example_translation is distinct from $q$你知道昨天发生了什么吗？我找到了一份新工作。你知道昨天晚上发生了什么吗？$q$ and coalesce(example_translation, '') <> '';

-- fccb2026-3de1-464d-8000-cdbb9576dd87: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fccb2026-3de1-464d-8000-cdbb9576dd87', 'learning_objects', 'example_zh', example_zh, $q$一杯咖啡，谢谢。这样就可以了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'fccb2026-3de1-464d-8000-cdbb9576dd87' and example_zh is distinct from $q$一杯咖啡，谢谢。这样就可以了。$q$ and true;
update public.learning_objects set example_zh = $q$一杯咖啡，谢谢。这样就可以了。$q$, updated_at = now() where id = 'fccb2026-3de1-464d-8000-cdbb9576dd87' and example_zh is distinct from $q$一杯咖啡，谢谢。这样就可以了。$q$ and true;

-- fccb2026-3de1-464d-8000-cdbb9576dd87: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fccb2026-3de1-464d-8000-cdbb9576dd87', 'learning_object_translations', 'zh.example_translation', example_translation, $q$一杯咖啡，谢谢。这样就可以了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'fccb2026-3de1-464d-8000-cdbb9576dd87' and native_language = 'zh' and example_translation is distinct from $q$一杯咖啡，谢谢。这样就可以了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$一杯咖啡，谢谢。这样就可以了。$q$, updated_at = now() where learning_object_id = 'fccb2026-3de1-464d-8000-cdbb9576dd87' and native_language = 'zh' and example_translation is distinct from $q$一杯咖啡，谢谢。这样就可以了。$q$ and coalesce(example_translation, '') <> '';

-- fe2d71bc-02c4-4b51-b31d-875affa10c24: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fe2d71bc-02c4-4b51-b31d-875affa10c24', 'learning_objects', 'example_zh', example_zh, $q$你想和我们一起出去吃饭吗？你想关一下窗户吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'fe2d71bc-02c4-4b51-b31d-875affa10c24' and example_zh is distinct from $q$你想和我们一起出去吃饭吗？你想关一下窗户吗？$q$ and true;
update public.learning_objects set example_zh = $q$你想和我们一起出去吃饭吗？你想关一下窗户吗？$q$, updated_at = now() where id = 'fe2d71bc-02c4-4b51-b31d-875affa10c24' and example_zh is distinct from $q$你想和我们一起出去吃饭吗？你想关一下窗户吗？$q$ and true;

-- fe2d71bc-02c4-4b51-b31d-875affa10c24: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fe2d71bc-02c4-4b51-b31d-875affa10c24', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你想和我们一起出去吃饭吗？你想关一下窗户吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'fe2d71bc-02c4-4b51-b31d-875affa10c24' and native_language = 'zh' and example_translation is distinct from $q$你想和我们一起出去吃饭吗？你想关一下窗户吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你想和我们一起出去吃饭吗？你想关一下窗户吗？$q$, updated_at = now() where learning_object_id = 'fe2d71bc-02c4-4b51-b31d-875affa10c24' and native_language = 'zh' and example_translation is distinct from $q$你想和我们一起出去吃饭吗？你想关一下窗户吗？$q$ and coalesce(example_translation, '') <> '';

-- fe893949-2e1a-45b2-a318-5cd40a190f8c: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fe893949-2e1a-45b2-a318-5cd40a190f8c', 'learning_objects', 'example_zh', example_zh, $q$难道不是周日公交车开得更早吗？难道不是你已经问过他了吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'fe893949-2e1a-45b2-a318-5cd40a190f8c' and example_zh is distinct from $q$难道不是周日公交车开得更早吗？难道不是你已经问过他了吗？$q$ and true;
update public.learning_objects set example_zh = $q$难道不是周日公交车开得更早吗？难道不是你已经问过他了吗？$q$, updated_at = now() where id = 'fe893949-2e1a-45b2-a318-5cd40a190f8c' and example_zh is distinct from $q$难道不是周日公交车开得更早吗？难道不是你已经问过他了吗？$q$ and true;

-- fe893949-2e1a-45b2-a318-5cd40a190f8c: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fe893949-2e1a-45b2-a318-5cd40a190f8c', 'learning_object_translations', 'zh.example_translation', example_translation, $q$难道不是周日公交车开得更早吗？难道不是你已经问过他了吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'fe893949-2e1a-45b2-a318-5cd40a190f8c' and native_language = 'zh' and example_translation is distinct from $q$难道不是周日公交车开得更早吗？难道不是你已经问过他了吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$难道不是周日公交车开得更早吗？难道不是你已经问过他了吗？$q$, updated_at = now() where learning_object_id = 'fe893949-2e1a-45b2-a318-5cd40a190f8c' and native_language = 'zh' and example_translation is distinct from $q$难道不是周日公交车开得更早吗？难道不是你已经问过他了吗？$q$ and coalesce(example_translation, '') <> '';

-- fed4b68d-385a-4764-b1d3-b3305a3184ce: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fed4b68d-385a-4764-b1d3-b3305a3184ce', 'learning_objects', 'example_zh', example_zh, $q$正在下雨，所以带上雨伞。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'fed4b68d-385a-4764-b1d3-b3305a3184ce' and example_zh is distinct from $q$正在下雨，所以带上雨伞。$q$ and true;
update public.learning_objects set example_zh = $q$正在下雨，所以带上雨伞。$q$, updated_at = now() where id = 'fed4b68d-385a-4764-b1d3-b3305a3184ce' and example_zh is distinct from $q$正在下雨，所以带上雨伞。$q$ and true;

-- fed4b68d-385a-4764-b1d3-b3305a3184ce: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fed4b68d-385a-4764-b1d3-b3305a3184ce', 'learning_object_translations', 'zh.example_translation', example_translation, $q$正在下雨，所以带上雨伞。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'fed4b68d-385a-4764-b1d3-b3305a3184ce' and native_language = 'zh' and example_translation is distinct from $q$正在下雨，所以带上雨伞。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$正在下雨，所以带上雨伞。$q$, updated_at = now() where learning_object_id = 'fed4b68d-385a-4764-b1d3-b3305a3184ce' and native_language = 'zh' and example_translation is distinct from $q$正在下雨，所以带上雨伞。$q$ and coalesce(example_translation, '') <> '';

-- 05933f6c-3a09-45e5-b61b-bcc9a0f69dda: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '05933f6c-3a09-45e5-b61b-bcc9a0f69dda', 'learning_object_examples', 'insert', null, $q$Vad gör du där vid dörren?$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '05933f6c-3a09-45e5-b61b-bcc9a0f69dda' and example_swedish = $q$Vad gör du där vid dörren?$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '05933f6c-3a09-45e5-b61b-bcc9a0f69dda', $q$Vad gör du där vid dörren?$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '05933f6c-3a09-45e5-b61b-bcc9a0f69dda' and example_swedish = $q$Vad gör du där vid dörren?$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$你在门边那里干什么？$q$ from x union all select id, 'en', $q$What are you doing there by the door?$q$ from x;

-- 05933f6c-3a09-45e5-b61b-bcc9a0f69dda: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '05933f6c-3a09-45e5-b61b-bcc9a0f69dda', 'learning_object_examples', 'insert', null, $q$Vad gör du där ute så sent?$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '05933f6c-3a09-45e5-b61b-bcc9a0f69dda' and example_swedish = $q$Vad gör du där ute så sent?$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '05933f6c-3a09-45e5-b61b-bcc9a0f69dda', $q$Vad gör du där ute så sent?$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '05933f6c-3a09-45e5-b61b-bcc9a0f69dda' and example_swedish = $q$Vad gör du där ute så sent?$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$你那么晚在外面干什么？$q$ from x union all select id, 'en', $q$What are you doing out there so late?$q$ from x;

-- 08076b52-694b-4d64-8eb6-ec3f4526d74e: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '08076b52-694b-4d64-8eb6-ec3f4526d74e', 'learning_object_examples', 'insert', null, $q$Jag kan inte hålla reda på alla papper.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '08076b52-694b-4d64-8eb6-ec3f4526d74e' and example_swedish = $q$Jag kan inte hålla reda på alla papper.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '08076b52-694b-4d64-8eb6-ec3f4526d74e', $q$Jag kan inte hålla reda på alla papper.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = '08076b52-694b-4d64-8eb6-ec3f4526d74e' and example_swedish = $q$Jag kan inte hålla reda på alla papper.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$我没法把所有文件都理清楚。$q$ from x union all select id, 'en', $q$I can’t keep track of all the papers.$q$ from x;

-- 08076b52-694b-4d64-8eb6-ec3f4526d74e: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '08076b52-694b-4d64-8eb6-ec3f4526d74e', 'learning_object_examples', 'insert', null, $q$Kan du hålla reda på barnen en stund?$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = '08076b52-694b-4d64-8eb6-ec3f4526d74e' and example_swedish = $q$Kan du hålla reda på barnen en stund?$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select '08076b52-694b-4d64-8eb6-ec3f4526d74e', $q$Kan du hålla reda på barnen en stund?$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = '08076b52-694b-4d64-8eb6-ec3f4526d74e' and example_swedish = $q$Kan du hålla reda på barnen en stund?$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$你能照看一下孩子们吗？$q$ from x union all select id, 'en', $q$Can you keep an eye on the children for a while?$q$ from x;

-- 0cb02464-0c7e-4359-8036-d430eff1d6ae: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0cb02464-0c7e-4359-8036-d430eff1d6ae', 'learning_objects', 'example_zh', example_zh, $q$你是兽医吗？对，没错。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '0cb02464-0c7e-4359-8036-d430eff1d6ae' and example_zh is distinct from $q$你是兽医吗？对，没错。$q$ and true;
update public.learning_objects set example_zh = $q$你是兽医吗？对，没错。$q$, updated_at = now() where id = '0cb02464-0c7e-4359-8036-d430eff1d6ae' and example_zh is distinct from $q$你是兽医吗？对，没错。$q$ and true;

-- 0cb02464-0c7e-4359-8036-d430eff1d6ae: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0cb02464-0c7e-4359-8036-d430eff1d6ae', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你是兽医吗？对，没错。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '0cb02464-0c7e-4359-8036-d430eff1d6ae' and native_language = 'zh' and example_translation is distinct from $q$你是兽医吗？对，没错。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你是兽医吗？对，没错。$q$, updated_at = now() where learning_object_id = '0cb02464-0c7e-4359-8036-d430eff1d6ae' and native_language = 'zh' and example_translation is distinct from $q$你是兽医吗？对，没错。$q$ and coalesce(example_translation, '') <> '';

-- 192e8d79-b267-48ed-bcc5-e96a354a3a84: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '192e8d79-b267-48ed-bcc5-e96a354a3a84', 'learning_objects', 'example_zh', example_zh, $q$你觉得怎么样，我们今晚去锻炼吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '192e8d79-b267-48ed-bcc5-e96a354a3a84' and example_zh is distinct from $q$你觉得怎么样，我们今晚去锻炼吗？$q$ and true;
update public.learning_objects set example_zh = $q$你觉得怎么样，我们今晚去锻炼吗？$q$, updated_at = now() where id = '192e8d79-b267-48ed-bcc5-e96a354a3a84' and example_zh is distinct from $q$你觉得怎么样，我们今晚去锻炼吗？$q$ and true;

-- 192e8d79-b267-48ed-bcc5-e96a354a3a84: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '192e8d79-b267-48ed-bcc5-e96a354a3a84', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你觉得怎么样，我们今晚去锻炼吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '192e8d79-b267-48ed-bcc5-e96a354a3a84' and native_language = 'zh' and example_translation is distinct from $q$你觉得怎么样，我们今晚去锻炼吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你觉得怎么样，我们今晚去锻炼吗？$q$, updated_at = now() where learning_object_id = '192e8d79-b267-48ed-bcc5-e96a354a3a84' and native_language = 'zh' and example_translation is distinct from $q$你觉得怎么样，我们今晚去锻炼吗？$q$ and coalesce(example_translation, '') <> '';

-- 19f69fd4-80c3-40c1-b534-a3690f50baf7: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '19f69fd4-80c3-40c1-b534-a3690f50baf7', 'learning_objects', 'example_zh', example_zh, $q$你毕业后打算做什么？你回家后打算做什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '19f69fd4-80c3-40c1-b534-a3690f50baf7' and example_zh is distinct from $q$你毕业后打算做什么？你回家后打算做什么？$q$ and true;
update public.learning_objects set example_zh = $q$你毕业后打算做什么？你回家后打算做什么？$q$, updated_at = now() where id = '19f69fd4-80c3-40c1-b534-a3690f50baf7' and example_zh is distinct from $q$你毕业后打算做什么？你回家后打算做什么？$q$ and true;

-- 19f69fd4-80c3-40c1-b534-a3690f50baf7: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '19f69fd4-80c3-40c1-b534-a3690f50baf7', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你毕业后打算做什么？你回家后打算做什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '19f69fd4-80c3-40c1-b534-a3690f50baf7' and native_language = 'zh' and example_translation is distinct from $q$你毕业后打算做什么？你回家后打算做什么？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你毕业后打算做什么？你回家后打算做什么？$q$, updated_at = now() where learning_object_id = '19f69fd4-80c3-40c1-b534-a3690f50baf7' and native_language = 'zh' and example_translation is distinct from $q$你毕业后打算做什么？你回家后打算做什么？$q$ and coalesce(example_translation, '') <> '';

-- 1f346dc3-5a1e-4a85-902b-9d622567d9fc: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1f346dc3-5a1e-4a85-902b-9d622567d9fc', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$uppmaning att lyssna$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '1f346dc3-5a1e-4a85-902b-9d622567d9fc' and swedish_explanation is distinct from $q$uppmaning att lyssna$q$ and true;
update public.learning_objects set swedish_explanation = $q$uppmaning att lyssna$q$, updated_at = now() where id = '1f346dc3-5a1e-4a85-902b-9d622567d9fc' and swedish_explanation is distinct from $q$uppmaning att lyssna$q$ and true;

-- 1f346dc3-5a1e-4a85-902b-9d622567d9fc: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1f346dc3-5a1e-4a85-902b-9d622567d9fc', 'learning_objects', 'example_zh', example_zh, $q$把这段对话听两遍。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '1f346dc3-5a1e-4a85-902b-9d622567d9fc' and example_zh is distinct from $q$把这段对话听两遍。$q$ and true;
update public.learning_objects set example_zh = $q$把这段对话听两遍。$q$, updated_at = now() where id = '1f346dc3-5a1e-4a85-902b-9d622567d9fc' and example_zh is distinct from $q$把这段对话听两遍。$q$ and true;

-- 1f346dc3-5a1e-4a85-902b-9d622567d9fc: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1f346dc3-5a1e-4a85-902b-9d622567d9fc', 'learning_object_translations', 'zh.example_translation', example_translation, $q$把这段对话听两遍。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '1f346dc3-5a1e-4a85-902b-9d622567d9fc' and native_language = 'zh' and example_translation is distinct from $q$把这段对话听两遍。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$把这段对话听两遍。$q$, updated_at = now() where learning_object_id = '1f346dc3-5a1e-4a85-902b-9d622567d9fc' and native_language = 'zh' and example_translation is distinct from $q$把这段对话听两遍。$q$ and coalesce(example_translation, '') <> '';

-- 3a6f583b-0173-46b2-9fcf-279255e25a61: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3a6f583b-0173-46b2-9fcf-279255e25a61', 'learning_objects', 'example_zh', example_zh, $q$嗨！近况怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '3a6f583b-0173-46b2-9fcf-279255e25a61' and example_zh is distinct from $q$嗨！近况怎么样？$q$ and true;
update public.learning_objects set example_zh = $q$嗨！近况怎么样？$q$, updated_at = now() where id = '3a6f583b-0173-46b2-9fcf-279255e25a61' and example_zh is distinct from $q$嗨！近况怎么样？$q$ and true;

-- 3a6f583b-0173-46b2-9fcf-279255e25a61: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3a6f583b-0173-46b2-9fcf-279255e25a61', 'learning_object_translations', 'zh.example_translation', example_translation, $q$嗨！近况怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '3a6f583b-0173-46b2-9fcf-279255e25a61' and native_language = 'zh' and example_translation is distinct from $q$嗨！近况怎么样？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$嗨！近况怎么样？$q$, updated_at = now() where learning_object_id = '3a6f583b-0173-46b2-9fcf-279255e25a61' and native_language = 'zh' and example_translation is distinct from $q$嗨！近况怎么样？$q$ and coalesce(example_translation, '') <> '';

-- 71c72fac-3e5b-4efe-9cda-8580a8053e4d: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '71c72fac-3e5b-4efe-9cda-8580a8053e4d', 'learning_objects', 'example_zh', example_zh, $q$我很好。那你呢？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '71c72fac-3e5b-4efe-9cda-8580a8053e4d' and example_zh is distinct from $q$我很好。那你呢？$q$ and true;
update public.learning_objects set example_zh = $q$我很好。那你呢？$q$, updated_at = now() where id = '71c72fac-3e5b-4efe-9cda-8580a8053e4d' and example_zh is distinct from $q$我很好。那你呢？$q$ and true;

-- 71c72fac-3e5b-4efe-9cda-8580a8053e4d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '71c72fac-3e5b-4efe-9cda-8580a8053e4d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我很好。那你呢？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '71c72fac-3e5b-4efe-9cda-8580a8053e4d' and native_language = 'zh' and example_translation is distinct from $q$我很好。那你呢？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我很好。那你呢？$q$, updated_at = now() where learning_object_id = '71c72fac-3e5b-4efe-9cda-8580a8053e4d' and native_language = 'zh' and example_translation is distinct from $q$我很好。那你呢？$q$ and coalesce(example_translation, '') <> '';

-- 8c06fa2c-4c83-4f86-a80f-0d5de89c3ca3: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8c06fa2c-4c83-4f86-a80f-0d5de89c3ca3', 'learning_objects', 'example_zh', example_zh, $q$哎呀，外面真冷啊！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8c06fa2c-4c83-4f86-a80f-0d5de89c3ca3' and example_zh is distinct from $q$哎呀，外面真冷啊！$q$ and true;
update public.learning_objects set example_zh = $q$哎呀，外面真冷啊！$q$, updated_at = now() where id = '8c06fa2c-4c83-4f86-a80f-0d5de89c3ca3' and example_zh is distinct from $q$哎呀，外面真冷啊！$q$ and true;

-- 8c06fa2c-4c83-4f86-a80f-0d5de89c3ca3: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8c06fa2c-4c83-4f86-a80f-0d5de89c3ca3', 'learning_object_translations', 'zh.example_translation', example_translation, $q$哎呀，外面真冷啊！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8c06fa2c-4c83-4f86-a80f-0d5de89c3ca3' and native_language = 'zh' and example_translation is distinct from $q$哎呀，外面真冷啊！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$哎呀，外面真冷啊！$q$, updated_at = now() where learning_object_id = '8c06fa2c-4c83-4f86-a80f-0d5de89c3ca3' and native_language = 'zh' and example_translation is distinct from $q$哎呀，外面真冷啊！$q$ and coalesce(example_translation, '') <> '';

-- 8d864548-aad4-4687-877a-29cc54e6a156: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8d864548-aad4-4687-877a-29cc54e6a156', 'learning_objects', 'example_zh', example_zh, $q$山里正在下雪。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8d864548-aad4-4687-877a-29cc54e6a156' and example_zh is distinct from $q$山里正在下雪。$q$ and true;
update public.learning_objects set example_zh = $q$山里正在下雪。$q$, updated_at = now() where id = '8d864548-aad4-4687-877a-29cc54e6a156' and example_zh is distinct from $q$山里正在下雪。$q$ and true;

-- 8d864548-aad4-4687-877a-29cc54e6a156: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8d864548-aad4-4687-877a-29cc54e6a156', 'learning_object_translations', 'zh.example_translation', example_translation, $q$山里正在下雪。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8d864548-aad4-4687-877a-29cc54e6a156' and native_language = 'zh' and example_translation is distinct from $q$山里正在下雪。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$山里正在下雪。$q$, updated_at = now() where learning_object_id = '8d864548-aad4-4687-877a-29cc54e6a156' and native_language = 'zh' and example_translation is distinct from $q$山里正在下雪。$q$ and coalesce(example_translation, '') <> '';

-- 9a68d228-05cf-480d-9a80-486c3746f3ea: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9a68d228-05cf-480d-9a80-486c3746f3ea', 'learning_objects', 'example_zh', example_zh, $q$再见！明天见。拜拜！代我向家里所有人问好。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '9a68d228-05cf-480d-9a80-486c3746f3ea' and example_zh is distinct from $q$再见！明天见。拜拜！代我向家里所有人问好。$q$ and true;
update public.learning_objects set example_zh = $q$再见！明天见。拜拜！代我向家里所有人问好。$q$, updated_at = now() where id = '9a68d228-05cf-480d-9a80-486c3746f3ea' and example_zh is distinct from $q$再见！明天见。拜拜！代我向家里所有人问好。$q$ and true;

-- 9a68d228-05cf-480d-9a80-486c3746f3ea: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9a68d228-05cf-480d-9a80-486c3746f3ea', 'learning_object_translations', 'zh.example_translation', example_translation, $q$再见！明天见。拜拜！代我向家里所有人问好。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '9a68d228-05cf-480d-9a80-486c3746f3ea' and native_language = 'zh' and example_translation is distinct from $q$再见！明天见。拜拜！代我向家里所有人问好。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$再见！明天见。拜拜！代我向家里所有人问好。$q$, updated_at = now() where learning_object_id = '9a68d228-05cf-480d-9a80-486c3746f3ea' and native_language = 'zh' and example_translation is distinct from $q$再见！明天见。拜拜！代我向家里所有人问好。$q$ and coalesce(example_translation, '') <> '';

-- ac1b13e0-8ac0-4f39-b16b-06b664e82cca: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'ac1b13e0-8ac0-4f39-b16b-06b664e82cca', 'learning_objects', 'example_zh', example_zh, $q$不，我从来没做过！我甚至都没想过这件事。这对我来说完全是新的。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'ac1b13e0-8ac0-4f39-b16b-06b664e82cca' and example_zh is distinct from $q$不，我从来没做过！我甚至都没想过这件事。这对我来说完全是新的。$q$ and true;
update public.learning_objects set example_zh = $q$不，我从来没做过！我甚至都没想过这件事。这对我来说完全是新的。$q$, updated_at = now() where id = 'ac1b13e0-8ac0-4f39-b16b-06b664e82cca' and example_zh is distinct from $q$不，我从来没做过！我甚至都没想过这件事。这对我来说完全是新的。$q$ and true;

-- ac1b13e0-8ac0-4f39-b16b-06b664e82cca: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'ac1b13e0-8ac0-4f39-b16b-06b664e82cca', 'learning_object_translations', 'zh.example_translation', example_translation, $q$不，我从来没做过！我甚至都没想过这件事。这对我来说完全是新的。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'ac1b13e0-8ac0-4f39-b16b-06b664e82cca' and native_language = 'zh' and example_translation is distinct from $q$不，我从来没做过！我甚至都没想过这件事。这对我来说完全是新的。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$不，我从来没做过！我甚至都没想过这件事。这对我来说完全是新的。$q$, updated_at = now() where learning_object_id = 'ac1b13e0-8ac0-4f39-b16b-06b664e82cca' and native_language = 'zh' and example_translation is distinct from $q$不，我从来没做过！我甚至都没想过这件事。这对我来说完全是新的。$q$ and coalesce(example_translation, '') <> '';

-- b708c41e-c1f3-4314-93b5-6e3b5634eb04: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b708c41e-c1f3-4314-93b5-6e3b5634eb04', 'learning_objects', 'example_zh', example_zh, $q$这里发生什么事了？你看起来很担心。车怎么了？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b708c41e-c1f3-4314-93b5-6e3b5634eb04' and example_zh is distinct from $q$这里发生什么事了？你看起来很担心。车怎么了？$q$ and true;
update public.learning_objects set example_zh = $q$这里发生什么事了？你看起来很担心。车怎么了？$q$, updated_at = now() where id = 'b708c41e-c1f3-4314-93b5-6e3b5634eb04' and example_zh is distinct from $q$这里发生什么事了？你看起来很担心。车怎么了？$q$ and true;

-- b708c41e-c1f3-4314-93b5-6e3b5634eb04: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b708c41e-c1f3-4314-93b5-6e3b5634eb04', 'learning_object_translations', 'zh.example_translation', example_translation, $q$这里发生什么事了？你看起来很担心。车怎么了？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b708c41e-c1f3-4314-93b5-6e3b5634eb04' and native_language = 'zh' and example_translation is distinct from $q$这里发生什么事了？你看起来很担心。车怎么了？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$这里发生什么事了？你看起来很担心。车怎么了？$q$, updated_at = now() where learning_object_id = 'b708c41e-c1f3-4314-93b5-6e3b5634eb04' and native_language = 'zh' and example_translation is distinct from $q$这里发生什么事了？你看起来很担心。车怎么了？$q$ and coalesce(example_translation, '') <> '';

-- 08f9caaa-795a-401d-8f64-2a29b36edb2b: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '08f9caaa-795a-401d-8f64-2a29b36edb2b', 'learning_objects', 'example_sv', example_sv, $q$Katten, även kallad huskatt, är vanlig i Sverige. Sjukdomen kallas även influensa.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '08f9caaa-795a-401d-8f64-2a29b36edb2b' and example_sv is distinct from $q$Katten, även kallad huskatt, är vanlig i Sverige. Sjukdomen kallas även influensa.$q$ and true;
update public.learning_objects set example_sv = $q$Katten, även kallad huskatt, är vanlig i Sverige. Sjukdomen kallas även influensa.$q$, updated_at = now() where id = '08f9caaa-795a-401d-8f64-2a29b36edb2b' and example_sv is distinct from $q$Katten, även kallad huskatt, är vanlig i Sverige. Sjukdomen kallas även influensa.$q$ and true;

-- 08f9caaa-795a-401d-8f64-2a29b36edb2b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '08f9caaa-795a-401d-8f64-2a29b36edb2b', 'learning_objects', 'example_zh', example_zh, $q$猫，也叫家猫，在瑞典很常见。这种疾病也叫流感。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '08f9caaa-795a-401d-8f64-2a29b36edb2b' and example_zh is distinct from $q$猫，也叫家猫，在瑞典很常见。这种疾病也叫流感。$q$ and true;
update public.learning_objects set example_zh = $q$猫，也叫家猫，在瑞典很常见。这种疾病也叫流感。$q$, updated_at = now() where id = '08f9caaa-795a-401d-8f64-2a29b36edb2b' and example_zh is distinct from $q$猫，也叫家猫，在瑞典很常见。这种疾病也叫流感。$q$ and true;

-- 08f9caaa-795a-401d-8f64-2a29b36edb2b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '08f9caaa-795a-401d-8f64-2a29b36edb2b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$猫，也叫家猫，在瑞典很常见。这种疾病也叫流感。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '08f9caaa-795a-401d-8f64-2a29b36edb2b' and native_language = 'zh' and example_translation is distinct from $q$猫，也叫家猫，在瑞典很常见。这种疾病也叫流感。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$猫，也叫家猫，在瑞典很常见。这种疾病也叫流感。$q$, updated_at = now() where learning_object_id = '08f9caaa-795a-401d-8f64-2a29b36edb2b' and native_language = 'zh' and example_translation is distinct from $q$猫，也叫家猫，在瑞典很常见。这种疾病也叫流感。$q$ and coalesce(example_translation, '') <> '';

-- babebabe-864a-4036-afe5-cfee2881f351: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'babebabe-864a-4036-afe5-cfee2881f351', 'learning_objects', 'example_zh', example_zh, $q$太阳照耀，而且很暖和。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'babebabe-864a-4036-afe5-cfee2881f351' and example_zh is distinct from $q$太阳照耀，而且很暖和。$q$ and true;
update public.learning_objects set example_zh = $q$太阳照耀，而且很暖和。$q$, updated_at = now() where id = 'babebabe-864a-4036-afe5-cfee2881f351' and example_zh is distinct from $q$太阳照耀，而且很暖和。$q$ and true;

-- babebabe-864a-4036-afe5-cfee2881f351: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'babebabe-864a-4036-afe5-cfee2881f351', 'learning_object_translations', 'zh.example_translation', example_translation, $q$太阳照耀，而且很暖和。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'babebabe-864a-4036-afe5-cfee2881f351' and native_language = 'zh' and example_translation is distinct from $q$太阳照耀，而且很暖和。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$太阳照耀，而且很暖和。$q$, updated_at = now() where learning_object_id = 'babebabe-864a-4036-afe5-cfee2881f351' and native_language = 'zh' and example_translation is distinct from $q$太阳照耀，而且很暖和。$q$ and coalesce(example_translation, '') <> '';

-- bdacc5f0-e905-4abc-b3e1-f51c928de6d9: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'bdacc5f0-e905-4abc-b3e1-f51c928de6d9', 'learning_objects', 'example_zh', example_zh, $q$我们星期五去看电影好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'bdacc5f0-e905-4abc-b3e1-f51c928de6d9' and example_zh is distinct from $q$我们星期五去看电影好吗？$q$ and true;
update public.learning_objects set example_zh = $q$我们星期五去看电影好吗？$q$, updated_at = now() where id = 'bdacc5f0-e905-4abc-b3e1-f51c928de6d9' and example_zh is distinct from $q$我们星期五去看电影好吗？$q$ and true;

-- bdacc5f0-e905-4abc-b3e1-f51c928de6d9: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'bdacc5f0-e905-4abc-b3e1-f51c928de6d9', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我们星期五去看电影好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'bdacc5f0-e905-4abc-b3e1-f51c928de6d9' and native_language = 'zh' and example_translation is distinct from $q$我们星期五去看电影好吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我们星期五去看电影好吗？$q$, updated_at = now() where learning_object_id = 'bdacc5f0-e905-4abc-b3e1-f51c928de6d9' and native_language = 'zh' and example_translation is distinct from $q$我们星期五去看电影好吗？$q$ and coalesce(example_translation, '') <> '';

-- c2c9dfa2-e16f-483c-9ce5-462a6c96a018: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c2c9dfa2-e16f-483c-9ce5-462a6c96a018', 'learning_objects', 'example_zh', example_zh, $q$山顶海拔800米。该城市海拔15米。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c2c9dfa2-e16f-483c-9ce5-462a6c96a018' and example_zh is distinct from $q$山顶海拔800米。该城市海拔15米。$q$ and true;
update public.learning_objects set example_zh = $q$山顶海拔800米。该城市海拔15米。$q$, updated_at = now() where id = 'c2c9dfa2-e16f-483c-9ce5-462a6c96a018' and example_zh is distinct from $q$山顶海拔800米。该城市海拔15米。$q$ and true;

-- c2c9dfa2-e16f-483c-9ce5-462a6c96a018: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c2c9dfa2-e16f-483c-9ce5-462a6c96a018', 'learning_object_translations', 'zh.example_translation', example_translation, $q$山顶海拔800米。该城市海拔15米。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c2c9dfa2-e16f-483c-9ce5-462a6c96a018' and native_language = 'zh' and example_translation is distinct from $q$山顶海拔800米。该城市海拔15米。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$山顶海拔800米。该城市海拔15米。$q$, updated_at = now() where learning_object_id = 'c2c9dfa2-e16f-483c-9ce5-462a6c96a018' and native_language = 'zh' and example_translation is distinct from $q$山顶海拔800米。该城市海拔15米。$q$ and coalesce(example_translation, '') <> '';

-- d0691676-4053-4d69-9c0a-f34c9cc6668e: example row 0
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd0691676-4053-4d69-9c0a-f34c9cc6668e', 'learning_object_examples', 'insert', null, $q$Han är lutherskt kristen.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'd0691676-4053-4d69-9c0a-f34c9cc6668e' and example_swedish = $q$Han är lutherskt kristen.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'd0691676-4053-4d69-9c0a-f34c9cc6668e', $q$Han är lutherskt kristen.$q$, 0 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'd0691676-4053-4d69-9c0a-f34c9cc6668e' and example_swedish = $q$Han är lutherskt kristen.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$他是路德宗基督徒。$q$ from x union all select id, 'en', $q$He is a Lutheran Christian.$q$ from x;

-- d0691676-4053-4d69-9c0a-f34c9cc6668e: example row 1
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd0691676-4053-4d69-9c0a-f34c9cc6668e', 'learning_object_examples', 'insert', null, $q$Familjen lever i en lutherskt kristen tradition.$q$, $q$batch1 2026-11-01: verified review finding: each line of a multi-sentence example gets its own translation$q$ from (select 1) s where not exists (select 1 from public.learning_object_examples where learning_object_id = 'd0691676-4053-4d69-9c0a-f34c9cc6668e' and example_swedish = $q$Familjen lever i en lutherskt kristen tradition.$q$);
with x as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order) select 'd0691676-4053-4d69-9c0a-f34c9cc6668e', $q$Familjen lever i en lutherskt kristen tradition.$q$, 1 where not exists (select 1 from public.learning_object_examples where learning_object_id = 'd0691676-4053-4d69-9c0a-f34c9cc6668e' and example_swedish = $q$Familjen lever i en lutherskt kristen tradition.$q$) returning id)
insert into public.learning_object_example_translations (example_id, native_language, translation) select id, 'zh', $q$这个家庭生活在路德宗基督教传统中。$q$ from x union all select id, 'en', $q$The family lives in a Lutheran Christian tradition.$q$ from x;

-- d95b5efe-ff98-41b3-9b50-b8f62f5eba8d: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd95b5efe-ff98-41b3-9b50-b8f62f5eba8d', 'learning_objects', 'example_zh', example_zh, $q$我也这么认为，这个建议很好。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'd95b5efe-ff98-41b3-9b50-b8f62f5eba8d' and example_zh is distinct from $q$我也这么认为，这个建议很好。$q$ and true;
update public.learning_objects set example_zh = $q$我也这么认为，这个建议很好。$q$, updated_at = now() where id = 'd95b5efe-ff98-41b3-9b50-b8f62f5eba8d' and example_zh is distinct from $q$我也这么认为，这个建议很好。$q$ and true;

-- d95b5efe-ff98-41b3-9b50-b8f62f5eba8d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd95b5efe-ff98-41b3-9b50-b8f62f5eba8d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我也这么认为，这个建议很好。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'd95b5efe-ff98-41b3-9b50-b8f62f5eba8d' and native_language = 'zh' and example_translation is distinct from $q$我也这么认为，这个建议很好。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我也这么认为，这个建议很好。$q$, updated_at = now() where learning_object_id = 'd95b5efe-ff98-41b3-9b50-b8f62f5eba8d' and native_language = 'zh' and example_translation is distinct from $q$我也这么认为，这个建议很好。$q$ and coalesce(example_translation, '') <> '';

-- dadfe820-c50c-4f6d-bafc-50dc532f4ceb: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'dadfe820-c50c-4f6d-bafc-50dc532f4ceb', 'learning_objects', 'example_zh', example_zh, $q$到学校要花一个小时。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'dadfe820-c50c-4f6d-bafc-50dc532f4ceb' and example_zh is distinct from $q$到学校要花一个小时。$q$ and true;
update public.learning_objects set example_zh = $q$到学校要花一个小时。$q$, updated_at = now() where id = 'dadfe820-c50c-4f6d-bafc-50dc532f4ceb' and example_zh is distinct from $q$到学校要花一个小时。$q$ and true;

-- dadfe820-c50c-4f6d-bafc-50dc532f4ceb: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'dadfe820-c50c-4f6d-bafc-50dc532f4ceb', 'learning_object_translations', 'zh.example_translation', example_translation, $q$到学校要花一个小时。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'dadfe820-c50c-4f6d-bafc-50dc532f4ceb' and native_language = 'zh' and example_translation is distinct from $q$到学校要花一个小时。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$到学校要花一个小时。$q$, updated_at = now() where learning_object_id = 'dadfe820-c50c-4f6d-bafc-50dc532f4ceb' and native_language = 'zh' and example_translation is distinct from $q$到学校要花一个小时。$q$ and coalesce(example_translation, '') <> '';

-- e8d0db15-42a9-462e-b8e6-a7328cb1eae8: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e8d0db15-42a9-462e-b8e6-a7328cb1eae8', 'learning_objects', 'example_zh', example_zh, $q$你放假时最喜欢做什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'e8d0db15-42a9-462e-b8e6-a7328cb1eae8' and example_zh is distinct from $q$你放假时最喜欢做什么？$q$ and true;
update public.learning_objects set example_zh = $q$你放假时最喜欢做什么？$q$, updated_at = now() where id = 'e8d0db15-42a9-462e-b8e6-a7328cb1eae8' and example_zh is distinct from $q$你放假时最喜欢做什么？$q$ and true;

-- e8d0db15-42a9-462e-b8e6-a7328cb1eae8: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e8d0db15-42a9-462e-b8e6-a7328cb1eae8', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你放假时最喜欢做什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'e8d0db15-42a9-462e-b8e6-a7328cb1eae8' and native_language = 'zh' and example_translation is distinct from $q$你放假时最喜欢做什么？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你放假时最喜欢做什么？$q$, updated_at = now() where learning_object_id = 'e8d0db15-42a9-462e-b8e6-a7328cb1eae8' and native_language = 'zh' and example_translation is distinct from $q$你放假时最喜欢做什么？$q$ and coalesce(example_translation, '') <> '';

-- e8d0db15-42a9-462e-b8e6-a7328cb1eae8: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e8d0db15-42a9-462e-b8e6-a7328cb1eae8', 'learning_object_translations', 'en.example_translation', example_translation, $q$What do you most like to do on vacation?$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'e8d0db15-42a9-462e-b8e6-a7328cb1eae8' and native_language = 'en' and example_translation is distinct from $q$What do you most like to do on vacation?$q$ and true;
update public.learning_object_translations set example_translation = $q$What do you most like to do on vacation?$q$, updated_at = now() where learning_object_id = 'e8d0db15-42a9-462e-b8e6-a7328cb1eae8' and native_language = 'en' and example_translation is distinct from $q$What do you most like to do on vacation?$q$ and true;

-- ec642e21-0074-424d-841a-b07f471d295b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'ec642e21-0074-424d-841a-b07f471d295b', 'learning_objects', 'example_zh', example_zh, $q$你听说这门课上发生了什么吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'ec642e21-0074-424d-841a-b07f471d295b' and example_zh is distinct from $q$你听说这门课上发生了什么吗？$q$ and true;
update public.learning_objects set example_zh = $q$你听说这门课上发生了什么吗？$q$, updated_at = now() where id = 'ec642e21-0074-424d-841a-b07f471d295b' and example_zh is distinct from $q$你听说这门课上发生了什么吗？$q$ and true;

-- ec642e21-0074-424d-841a-b07f471d295b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'ec642e21-0074-424d-841a-b07f471d295b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你听说这门课上发生了什么吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'ec642e21-0074-424d-841a-b07f471d295b' and native_language = 'zh' and example_translation is distinct from $q$你听说这门课上发生了什么吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你听说这门课上发生了什么吗？$q$, updated_at = now() where learning_object_id = 'ec642e21-0074-424d-841a-b07f471d295b' and native_language = 'zh' and example_translation is distinct from $q$你听说这门课上发生了什么吗？$q$ and coalesce(example_translation, '') <> '';

-- 8943d2c2-38fe-49e0-99e4-311728f56f3d: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8943d2c2-38fe-49e0-99e4-311728f56f3d', 'learning_objects', 'example_zh', example_zh, $q$在家读第五页的课文。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8943d2c2-38fe-49e0-99e4-311728f56f3d' and example_zh is distinct from $q$在家读第五页的课文。$q$ and true;
update public.learning_objects set example_zh = $q$在家读第五页的课文。$q$, updated_at = now() where id = '8943d2c2-38fe-49e0-99e4-311728f56f3d' and example_zh is distinct from $q$在家读第五页的课文。$q$ and true;

-- 8943d2c2-38fe-49e0-99e4-311728f56f3d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8943d2c2-38fe-49e0-99e4-311728f56f3d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$在家读第五页的课文。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8943d2c2-38fe-49e0-99e4-311728f56f3d' and native_language = 'zh' and example_translation is distinct from $q$在家读第五页的课文。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$在家读第五页的课文。$q$, updated_at = now() where learning_object_id = '8943d2c2-38fe-49e0-99e4-311728f56f3d' and native_language = 'zh' and example_translation is distinct from $q$在家读第五页的课文。$q$ and coalesce(example_translation, '') <> '';

-- 2ffef997-61e8-4a76-bf83-f4ffe46067df: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2ffef997-61e8-4a76-bf83-f4ffe46067df', 'learning_objects', 'example_zh', example_zh, $q$你们去电影院要看什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '2ffef997-61e8-4a76-bf83-f4ffe46067df' and example_zh is distinct from $q$你们去电影院要看什么？$q$ and true;
update public.learning_objects set example_zh = $q$你们去电影院要看什么？$q$, updated_at = now() where id = '2ffef997-61e8-4a76-bf83-f4ffe46067df' and example_zh is distinct from $q$你们去电影院要看什么？$q$ and true;

-- 2ffef997-61e8-4a76-bf83-f4ffe46067df: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2ffef997-61e8-4a76-bf83-f4ffe46067df', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你们去电影院要看什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '2ffef997-61e8-4a76-bf83-f4ffe46067df' and native_language = 'zh' and example_translation is distinct from $q$你们去电影院要看什么？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你们去电影院要看什么？$q$, updated_at = now() where learning_object_id = '2ffef997-61e8-4a76-bf83-f4ffe46067df' and native_language = 'zh' and example_translation is distinct from $q$你们去电影院要看什么？$q$ and coalesce(example_translation, '') <> '';

-- 06ace86a-3080-48ea-b193-be88f975c395: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '06ace86a-3080-48ea-b193-be88f975c395', 'learning_objects', 'example_zh', example_zh, $q$为什么这么问？你想做点什么吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '06ace86a-3080-48ea-b193-be88f975c395' and example_zh is distinct from $q$为什么这么问？你想做点什么吗？$q$ and true;
update public.learning_objects set example_zh = $q$为什么这么问？你想做点什么吗？$q$, updated_at = now() where id = '06ace86a-3080-48ea-b193-be88f975c395' and example_zh is distinct from $q$为什么这么问？你想做点什么吗？$q$ and true;

-- 06ace86a-3080-48ea-b193-be88f975c395: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '06ace86a-3080-48ea-b193-be88f975c395', 'learning_object_translations', 'zh.example_translation', example_translation, $q$为什么这么问？你想做点什么吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '06ace86a-3080-48ea-b193-be88f975c395' and native_language = 'zh' and example_translation is distinct from $q$为什么这么问？你想做点什么吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$为什么这么问？你想做点什么吗？$q$, updated_at = now() where learning_object_id = '06ace86a-3080-48ea-b193-be88f975c395' and native_language = 'zh' and example_translation is distinct from $q$为什么这么问？你想做点什么吗？$q$ and coalesce(example_translation, '') <> '';

-- 91265a0a-22df-40da-a0d2-3357531f9a2d: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '91265a0a-22df-40da-a0d2-3357531f9a2d', 'learning_objects', 'example_zh', example_zh, $q$你的姓怎么拼？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '91265a0a-22df-40da-a0d2-3357531f9a2d' and example_zh is distinct from $q$你的姓怎么拼？$q$ and true;
update public.learning_objects set example_zh = $q$你的姓怎么拼？$q$, updated_at = now() where id = '91265a0a-22df-40da-a0d2-3357531f9a2d' and example_zh is distinct from $q$你的姓怎么拼？$q$ and true;

-- 91265a0a-22df-40da-a0d2-3357531f9a2d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '91265a0a-22df-40da-a0d2-3357531f9a2d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你的姓怎么拼？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '91265a0a-22df-40da-a0d2-3357531f9a2d' and native_language = 'zh' and example_translation is distinct from $q$你的姓怎么拼？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你的姓怎么拼？$q$, updated_at = now() where learning_object_id = '91265a0a-22df-40da-a0d2-3357531f9a2d' and native_language = 'zh' and example_translation is distinct from $q$你的姓怎么拼？$q$ and coalesce(example_translation, '') <> '';

-- 2570d4c7-0a0d-4450-b5ee-ecdf34e75f65: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2570d4c7-0a0d-4450-b5ee-ecdf34e75f65', 'learning_objects', 'example_zh', example_zh, $q$嗯，真好吃，这蛋糕真不错！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '2570d4c7-0a0d-4450-b5ee-ecdf34e75f65' and example_zh is distinct from $q$嗯，真好吃，这蛋糕真不错！$q$ and true;
update public.learning_objects set example_zh = $q$嗯，真好吃，这蛋糕真不错！$q$, updated_at = now() where id = '2570d4c7-0a0d-4450-b5ee-ecdf34e75f65' and example_zh is distinct from $q$嗯，真好吃，这蛋糕真不错！$q$ and true;

-- 2570d4c7-0a0d-4450-b5ee-ecdf34e75f65: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2570d4c7-0a0d-4450-b5ee-ecdf34e75f65', 'learning_object_translations', 'zh.example_translation', example_translation, $q$嗯，真好吃，这蛋糕真不错！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '2570d4c7-0a0d-4450-b5ee-ecdf34e75f65' and native_language = 'zh' and example_translation is distinct from $q$嗯，真好吃，这蛋糕真不错！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$嗯，真好吃，这蛋糕真不错！$q$, updated_at = now() where learning_object_id = '2570d4c7-0a0d-4450-b5ee-ecdf34e75f65' and native_language = 'zh' and example_translation is distinct from $q$嗯，真好吃，这蛋糕真不错！$q$ and coalesce(example_translation, '') <> '';

-- 8609842c-f065-4826-979b-eb899f87a534: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8609842c-f065-4826-979b-eb899f87a534', 'learning_objects', 'example_zh', example_zh, $q$这部电影在哪里上映？在萨迦电影院上映。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8609842c-f065-4826-979b-eb899f87a534' and example_zh is distinct from $q$这部电影在哪里上映？在萨迦电影院上映。$q$ and true;
update public.learning_objects set example_zh = $q$这部电影在哪里上映？在萨迦电影院上映。$q$, updated_at = now() where id = '8609842c-f065-4826-979b-eb899f87a534' and example_zh is distinct from $q$这部电影在哪里上映？在萨迦电影院上映。$q$ and true;

-- 8609842c-f065-4826-979b-eb899f87a534: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8609842c-f065-4826-979b-eb899f87a534', 'learning_object_translations', 'zh.example_translation', example_translation, $q$这部电影在哪里上映？在萨迦电影院上映。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8609842c-f065-4826-979b-eb899f87a534' and native_language = 'zh' and example_translation is distinct from $q$这部电影在哪里上映？在萨迦电影院上映。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$这部电影在哪里上映？在萨迦电影院上映。$q$, updated_at = now() where learning_object_id = '8609842c-f065-4826-979b-eb899f87a534' and native_language = 'zh' and example_translation is distinct from $q$这部电影在哪里上映？在萨迦电影院上映。$q$ and coalesce(example_translation, '') <> '';

-- c645b891-8de8-4f61-a9d0-5380dac4f38d: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c645b891-8de8-4f61-a9d0-5380dac4f38d', 'learning_objects', 'example_zh', example_zh, $q$我现在不明白了。你能再解释一遍吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c645b891-8de8-4f61-a9d0-5380dac4f38d' and example_zh is distinct from $q$我现在不明白了。你能再解释一遍吗？$q$ and true;
update public.learning_objects set example_zh = $q$我现在不明白了。你能再解释一遍吗？$q$, updated_at = now() where id = 'c645b891-8de8-4f61-a9d0-5380dac4f38d' and example_zh is distinct from $q$我现在不明白了。你能再解释一遍吗？$q$ and true;

-- c645b891-8de8-4f61-a9d0-5380dac4f38d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c645b891-8de8-4f61-a9d0-5380dac4f38d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我现在不明白了。你能再解释一遍吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c645b891-8de8-4f61-a9d0-5380dac4f38d' and native_language = 'zh' and example_translation is distinct from $q$我现在不明白了。你能再解释一遍吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我现在不明白了。你能再解释一遍吗？$q$, updated_at = now() where learning_object_id = 'c645b891-8de8-4f61-a9d0-5380dac4f38d' and native_language = 'zh' and example_translation is distinct from $q$我现在不明白了。你能再解释一遍吗？$q$ and coalesce(example_translation, '') <> '';

-- 1bfb5497-0142-48da-9065-51977f513d35: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1bfb5497-0142-48da-9065-51977f513d35', 'learning_objects', 'example_zh', example_zh, $q$你要去看望你姐姐吗？哦，真不错！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '1bfb5497-0142-48da-9065-51977f513d35' and example_zh is distinct from $q$你要去看望你姐姐吗？哦，真不错！$q$ and true;
update public.learning_objects set example_zh = $q$你要去看望你姐姐吗？哦，真不错！$q$, updated_at = now() where id = '1bfb5497-0142-48da-9065-51977f513d35' and example_zh is distinct from $q$你要去看望你姐姐吗？哦，真不错！$q$ and true;

-- 1bfb5497-0142-48da-9065-51977f513d35: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1bfb5497-0142-48da-9065-51977f513d35', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你要去看望你姐姐吗？哦，真不错！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '1bfb5497-0142-48da-9065-51977f513d35' and native_language = 'zh' and example_translation is distinct from $q$你要去看望你姐姐吗？哦，真不错！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你要去看望你姐姐吗？哦，真不错！$q$, updated_at = now() where learning_object_id = '1bfb5497-0142-48da-9065-51977f513d35' and native_language = 'zh' and example_translation is distinct from $q$你要去看望你姐姐吗？哦，真不错！$q$ and coalesce(example_translation, '') <> '';

-- d131f129-c12b-4c72-9bc8-894e77b2200f: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd131f129-c12b-4c72-9bc8-894e77b2200f', 'learning_objects', 'example_zh', example_zh, $q$我们该怎么安排这个时间表？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'd131f129-c12b-4c72-9bc8-894e77b2200f' and example_zh is distinct from $q$我们该怎么安排这个时间表？$q$ and true;
update public.learning_objects set example_zh = $q$我们该怎么安排这个时间表？$q$, updated_at = now() where id = 'd131f129-c12b-4c72-9bc8-894e77b2200f' and example_zh is distinct from $q$我们该怎么安排这个时间表？$q$ and true;

-- d131f129-c12b-4c72-9bc8-894e77b2200f: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd131f129-c12b-4c72-9bc8-894e77b2200f', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我们该怎么安排这个时间表？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'd131f129-c12b-4c72-9bc8-894e77b2200f' and native_language = 'zh' and example_translation is distinct from $q$我们该怎么安排这个时间表？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我们该怎么安排这个时间表？$q$, updated_at = now() where learning_object_id = 'd131f129-c12b-4c72-9bc8-894e77b2200f' and native_language = 'zh' and example_translation is distinct from $q$我们该怎么安排这个时间表？$q$ and coalesce(example_translation, '') <> '';

-- 2bfbeae4-8b24-42e7-8dad-8763717afb3f: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2bfbeae4-8b24-42e7-8dad-8763717afb3f', 'learning_objects', 'example_zh', example_zh, $q$你多久锻炼一次？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '2bfbeae4-8b24-42e7-8dad-8763717afb3f' and example_zh is distinct from $q$你多久锻炼一次？$q$ and true;
update public.learning_objects set example_zh = $q$你多久锻炼一次？$q$, updated_at = now() where id = '2bfbeae4-8b24-42e7-8dad-8763717afb3f' and example_zh is distinct from $q$你多久锻炼一次？$q$ and true;

-- 2bfbeae4-8b24-42e7-8dad-8763717afb3f: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2bfbeae4-8b24-42e7-8dad-8763717afb3f', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你多久锻炼一次？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '2bfbeae4-8b24-42e7-8dad-8763717afb3f' and native_language = 'zh' and example_translation is distinct from $q$你多久锻炼一次？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你多久锻炼一次？$q$, updated_at = now() where learning_object_id = '2bfbeae4-8b24-42e7-8dad-8763717afb3f' and native_language = 'zh' and example_translation is distinct from $q$你多久锻炼一次？$q$ and coalesce(example_translation, '') <> '';

-- 2bfbeae4-8b24-42e7-8dad-8763717afb3f: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2bfbeae4-8b24-42e7-8dad-8763717afb3f', 'learning_object_translations', 'en.example_translation', example_translation, $q$How often do you exercise?$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '2bfbeae4-8b24-42e7-8dad-8763717afb3f' and native_language = 'en' and example_translation is distinct from $q$How often do you exercise?$q$ and true;
update public.learning_object_translations set example_translation = $q$How often do you exercise?$q$, updated_at = now() where learning_object_id = '2bfbeae4-8b24-42e7-8dad-8763717afb3f' and native_language = 'en' and example_translation is distinct from $q$How often do you exercise?$q$ and true;

-- f719989e-5872-4d48-b67c-f2bb1fc8f22e: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f719989e-5872-4d48-b67c-f2bb1fc8f22e', 'learning_objects', 'example_zh', example_zh, $q$你能说慢一点吗？我在学瑞典语。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'f719989e-5872-4d48-b67c-f2bb1fc8f22e' and example_zh is distinct from $q$你能说慢一点吗？我在学瑞典语。$q$ and true;
update public.learning_objects set example_zh = $q$你能说慢一点吗？我在学瑞典语。$q$, updated_at = now() where id = 'f719989e-5872-4d48-b67c-f2bb1fc8f22e' and example_zh is distinct from $q$你能说慢一点吗？我在学瑞典语。$q$ and true;

-- f719989e-5872-4d48-b67c-f2bb1fc8f22e: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f719989e-5872-4d48-b67c-f2bb1fc8f22e', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你能说慢一点吗？我在学瑞典语。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'f719989e-5872-4d48-b67c-f2bb1fc8f22e' and native_language = 'zh' and example_translation is distinct from $q$你能说慢一点吗？我在学瑞典语。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你能说慢一点吗？我在学瑞典语。$q$, updated_at = now() where learning_object_id = 'f719989e-5872-4d48-b67c-f2bb1fc8f22e' and native_language = 'zh' and example_translation is distinct from $q$你能说慢一点吗？我在学瑞典语。$q$ and coalesce(example_translation, '') <> '';

-- 03872579-3a21-4660-96aa-c703915e3a50: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '03872579-3a21-4660-96aa-c703915e3a50', 'learning_objects', 'example_zh', example_zh, $q$搬家后一切都还好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '03872579-3a21-4660-96aa-c703915e3a50' and example_zh is distinct from $q$搬家后一切都还好吗？$q$ and true;
update public.learning_objects set example_zh = $q$搬家后一切都还好吗？$q$, updated_at = now() where id = '03872579-3a21-4660-96aa-c703915e3a50' and example_zh is distinct from $q$搬家后一切都还好吗？$q$ and true;

-- 03872579-3a21-4660-96aa-c703915e3a50: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '03872579-3a21-4660-96aa-c703915e3a50', 'learning_object_translations', 'zh.example_translation', example_translation, $q$搬家后一切都还好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '03872579-3a21-4660-96aa-c703915e3a50' and native_language = 'zh' and example_translation is distinct from $q$搬家后一切都还好吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$搬家后一切都还好吗？$q$, updated_at = now() where learning_object_id = '03872579-3a21-4660-96aa-c703915e3a50' and native_language = 'zh' and example_translation is distinct from $q$搬家后一切都还好吗？$q$ and coalesce(example_translation, '') <> '';

-- c971e164-a22c-4bf1-9b03-eb071d3da5c0: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c971e164-a22c-4bf1-9b03-eb071d3da5c0', 'learning_objects', 'example_zh', example_zh, $q$她小时候想成为什么？我不记得她想成为什么了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c971e164-a22c-4bf1-9b03-eb071d3da5c0' and example_zh is distinct from $q$她小时候想成为什么？我不记得她想成为什么了。$q$ and true;
update public.learning_objects set example_zh = $q$她小时候想成为什么？我不记得她想成为什么了。$q$, updated_at = now() where id = 'c971e164-a22c-4bf1-9b03-eb071d3da5c0' and example_zh is distinct from $q$她小时候想成为什么？我不记得她想成为什么了。$q$ and true;

-- c971e164-a22c-4bf1-9b03-eb071d3da5c0: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c971e164-a22c-4bf1-9b03-eb071d3da5c0', 'learning_object_translations', 'zh.example_translation', example_translation, $q$她小时候想成为什么？我不记得她想成为什么了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c971e164-a22c-4bf1-9b03-eb071d3da5c0' and native_language = 'zh' and example_translation is distinct from $q$她小时候想成为什么？我不记得她想成为什么了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$她小时候想成为什么？我不记得她想成为什么了。$q$, updated_at = now() where learning_object_id = 'c971e164-a22c-4bf1-9b03-eb071d3da5c0' and native_language = 'zh' and example_translation is distinct from $q$她小时候想成为什么？我不记得她想成为什么了。$q$ and coalesce(example_translation, '') <> '';

-- 89252410-44e6-42b5-8a10-8430b999653c: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '89252410-44e6-42b5-8a10-8430b999653c', 'learning_objects', 'example_zh', example_zh, $q$她想要什么礼物？我不知道她想要什么。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '89252410-44e6-42b5-8a10-8430b999653c' and example_zh is distinct from $q$她想要什么礼物？我不知道她想要什么。$q$ and true;
update public.learning_objects set example_zh = $q$她想要什么礼物？我不知道她想要什么。$q$, updated_at = now() where id = '89252410-44e6-42b5-8a10-8430b999653c' and example_zh is distinct from $q$她想要什么礼物？我不知道她想要什么。$q$ and true;

-- 89252410-44e6-42b5-8a10-8430b999653c: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '89252410-44e6-42b5-8a10-8430b999653c', 'learning_object_translations', 'zh.example_translation', example_translation, $q$她想要什么礼物？我不知道她想要什么。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '89252410-44e6-42b5-8a10-8430b999653c' and native_language = 'zh' and example_translation is distinct from $q$她想要什么礼物？我不知道她想要什么。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$她想要什么礼物？我不知道她想要什么。$q$, updated_at = now() where learning_object_id = '89252410-44e6-42b5-8a10-8430b999653c' and native_language = 'zh' and example_translation is distinct from $q$她想要什么礼物？我不知道她想要什么。$q$ and coalesce(example_translation, '') <> '';

-- Jaha! Nu förstår jag! Ah!: swedish
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1c6ba574-fc46-46ca-ae52-bf725fa7d10c', 'learning_objects', 'swedish', swedish, $q$Jaha! Nu förstår jag!$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '1c6ba574-fc46-46ca-ae52-bf725fa7d10c' and swedish is distinct from $q$Jaha! Nu förstår jag!$q$;
update public.learning_objects set swedish = $q$Jaha! Nu förstår jag!$q$, updated_at = now() where id = '1c6ba574-fc46-46ca-ae52-bf725fa7d10c' and swedish is distinct from $q$Jaha! Nu förstår jag!$q$;

-- Jaha! Nu förstår jag! Ah!: match_key
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1c6ba574-fc46-46ca-ae52-bf725fa7d10c', 'learning_objects', 'match_key', match_key, $q$jaha nu förstår jag$q$, $q$batch1 2026-11-01: verified review finding: English or typo in the headword$q$ from public.learning_objects where id = '1c6ba574-fc46-46ca-ae52-bf725fa7d10c' and match_key is distinct from $q$jaha nu förstår jag$q$;
update public.learning_objects set match_key = $q$jaha nu förstår jag$q$, updated_at = now() where id = '1c6ba574-fc46-46ca-ae52-bf725fa7d10c' and match_key is distinct from $q$jaha nu förstår jag$q$;

-- 8436b4e5-dd5a-4153-af4e-e4265cabbac5: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8436b4e5-dd5a-4153-af4e-e4265cabbac5', 'learning_objects', 'example_zh', example_zh, $q$看课本第十页。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8436b4e5-dd5a-4153-af4e-e4265cabbac5' and example_zh is distinct from $q$看课本第十页。$q$ and true;
update public.learning_objects set example_zh = $q$看课本第十页。$q$, updated_at = now() where id = '8436b4e5-dd5a-4153-af4e-e4265cabbac5' and example_zh is distinct from $q$看课本第十页。$q$ and true;

-- 8436b4e5-dd5a-4153-af4e-e4265cabbac5: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8436b4e5-dd5a-4153-af4e-e4265cabbac5', 'learning_object_translations', 'zh.example_translation', example_translation, $q$看课本第十页。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8436b4e5-dd5a-4153-af4e-e4265cabbac5' and native_language = 'zh' and example_translation is distinct from $q$看课本第十页。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$看课本第十页。$q$, updated_at = now() where learning_object_id = '8436b4e5-dd5a-4153-af4e-e4265cabbac5' and native_language = 'zh' and example_translation is distinct from $q$看课本第十页。$q$ and coalesce(example_translation, '') <> '';

-- 8436b4e5-dd5a-4153-af4e-e4265cabbac5: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8436b4e5-dd5a-4153-af4e-e4265cabbac5', 'learning_object_translations', 'en.example_translation', example_translation, $q$Look at page ten in the textbook.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8436b4e5-dd5a-4153-af4e-e4265cabbac5' and native_language = 'en' and example_translation is distinct from $q$Look at page ten in the textbook.$q$ and true;
update public.learning_object_translations set example_translation = $q$Look at page ten in the textbook.$q$, updated_at = now() where learning_object_id = '8436b4e5-dd5a-4153-af4e-e4265cabbac5' and native_language = 'en' and example_translation is distinct from $q$Look at page ten in the textbook.$q$ and true;

-- 7d2e7005-81d2-44b7-b814-fd6c23d480af: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7d2e7005-81d2-44b7-b814-fd6c23d480af', 'learning_objects', 'example_zh', example_zh, $q$你明白我的意思吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '7d2e7005-81d2-44b7-b814-fd6c23d480af' and example_zh is distinct from $q$你明白我的意思吗？$q$ and true;
update public.learning_objects set example_zh = $q$你明白我的意思吗？$q$, updated_at = now() where id = '7d2e7005-81d2-44b7-b814-fd6c23d480af' and example_zh is distinct from $q$你明白我的意思吗？$q$ and true;

-- 7d2e7005-81d2-44b7-b814-fd6c23d480af: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7d2e7005-81d2-44b7-b814-fd6c23d480af', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你明白我的意思吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '7d2e7005-81d2-44b7-b814-fd6c23d480af' and native_language = 'zh' and example_translation is distinct from $q$你明白我的意思吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你明白我的意思吗？$q$, updated_at = now() where learning_object_id = '7d2e7005-81d2-44b7-b814-fd6c23d480af' and native_language = 'zh' and example_translation is distinct from $q$你明白我的意思吗？$q$ and coalesce(example_translation, '') <> '';

-- 181a2c8a-d816-4556-853d-30571a46edb1: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '181a2c8a-d816-4556-853d-30571a46edb1', 'learning_objects', 'example_zh', example_zh, $q$我们下周见。保重！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '181a2c8a-d816-4556-853d-30571a46edb1' and example_zh is distinct from $q$我们下周见。保重！$q$ and true;
update public.learning_objects set example_zh = $q$我们下周见。保重！$q$, updated_at = now() where id = '181a2c8a-d816-4556-853d-30571a46edb1' and example_zh is distinct from $q$我们下周见。保重！$q$ and true;

-- 181a2c8a-d816-4556-853d-30571a46edb1: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '181a2c8a-d816-4556-853d-30571a46edb1', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我们下周见。保重！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '181a2c8a-d816-4556-853d-30571a46edb1' and native_language = 'zh' and example_translation is distinct from $q$我们下周见。保重！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我们下周见。保重！$q$, updated_at = now() where learning_object_id = '181a2c8a-d816-4556-853d-30571a46edb1' and native_language = 'zh' and example_translation is distinct from $q$我们下周见。保重！$q$ and coalesce(example_translation, '') <> '';

-- 0b4daa6a-16a3-4bbf-939f-fc624af873a1: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0b4daa6a-16a3-4bbf-939f-fc624af873a1', 'learning_objects', 'example_zh', example_zh, $q$我们晚饭吃什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '0b4daa6a-16a3-4bbf-939f-fc624af873a1' and example_zh is distinct from $q$我们晚饭吃什么？$q$ and true;
update public.learning_objects set example_zh = $q$我们晚饭吃什么？$q$, updated_at = now() where id = '0b4daa6a-16a3-4bbf-939f-fc624af873a1' and example_zh is distinct from $q$我们晚饭吃什么？$q$ and true;

-- 0b4daa6a-16a3-4bbf-939f-fc624af873a1: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0b4daa6a-16a3-4bbf-939f-fc624af873a1', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我们晚饭吃什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '0b4daa6a-16a3-4bbf-939f-fc624af873a1' and native_language = 'zh' and example_translation is distinct from $q$我们晚饭吃什么？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我们晚饭吃什么？$q$, updated_at = now() where learning_object_id = '0b4daa6a-16a3-4bbf-939f-fc624af873a1' and native_language = 'zh' and example_translation is distinct from $q$我们晚饭吃什么？$q$ and coalesce(example_translation, '') <> '';

-- 85ab9fd1-67a5-4daa-85ea-495affffd74b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '85ab9fd1-67a5-4daa-85ea-495affffd74b', 'learning_objects', 'example_zh', example_zh, $q$嘿，你好！最近怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '85ab9fd1-67a5-4daa-85ea-495affffd74b' and example_zh is distinct from $q$嘿，你好！最近怎么样？$q$ and true;
update public.learning_objects set example_zh = $q$嘿，你好！最近怎么样？$q$, updated_at = now() where id = '85ab9fd1-67a5-4daa-85ea-495affffd74b' and example_zh is distinct from $q$嘿，你好！最近怎么样？$q$ and true;

-- 85ab9fd1-67a5-4daa-85ea-495affffd74b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '85ab9fd1-67a5-4daa-85ea-495affffd74b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$嘿，你好！最近怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '85ab9fd1-67a5-4daa-85ea-495affffd74b' and native_language = 'zh' and example_translation is distinct from $q$嘿，你好！最近怎么样？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$嘿，你好！最近怎么样？$q$, updated_at = now() where learning_object_id = '85ab9fd1-67a5-4daa-85ea-495affffd74b' and native_language = 'zh' and example_translation is distinct from $q$嘿，你好！最近怎么样？$q$ and coalesce(example_translation, '') <> '';

-- e1688c43-659d-42d5-85c1-7d55916d6870: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e1688c43-659d-42d5-85c1-7d55916d6870', 'learning_objects', 'example_zh', example_zh, $q$求你了，帮我做作业吧！请下次准时来。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'e1688c43-659d-42d5-85c1-7d55916d6870' and example_zh is distinct from $q$求你了，帮我做作业吧！请下次准时来。$q$ and true;
update public.learning_objects set example_zh = $q$求你了，帮我做作业吧！请下次准时来。$q$, updated_at = now() where id = 'e1688c43-659d-42d5-85c1-7d55916d6870' and example_zh is distinct from $q$求你了，帮我做作业吧！请下次准时来。$q$ and true;

-- e1688c43-659d-42d5-85c1-7d55916d6870: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e1688c43-659d-42d5-85c1-7d55916d6870', 'learning_object_translations', 'zh.example_translation', example_translation, $q$求你了，帮我做作业吧！请下次准时来。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'e1688c43-659d-42d5-85c1-7d55916d6870' and native_language = 'zh' and example_translation is distinct from $q$求你了，帮我做作业吧！请下次准时来。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$求你了，帮我做作业吧！请下次准时来。$q$, updated_at = now() where learning_object_id = 'e1688c43-659d-42d5-85c1-7d55916d6870' and native_language = 'zh' and example_translation is distinct from $q$求你了，帮我做作业吧！请下次准时来。$q$ and coalesce(example_translation, '') <> '';

-- b8ea668b-8822-40bb-87e9-0d692f0b9732: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b8ea668b-8822-40bb-87e9-0d692f0b9732', 'learning_objects', 'example_zh', example_zh, $q$您能把目录寄给我吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b8ea668b-8822-40bb-87e9-0d692f0b9732' and example_zh is distinct from $q$您能把目录寄给我吗？$q$ and true;
update public.learning_objects set example_zh = $q$您能把目录寄给我吗？$q$, updated_at = now() where id = 'b8ea668b-8822-40bb-87e9-0d692f0b9732' and example_zh is distinct from $q$您能把目录寄给我吗？$q$ and true;

-- b8ea668b-8822-40bb-87e9-0d692f0b9732: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b8ea668b-8822-40bb-87e9-0d692f0b9732', 'learning_object_translations', 'zh.example_translation', example_translation, $q$您能把目录寄给我吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b8ea668b-8822-40bb-87e9-0d692f0b9732' and native_language = 'zh' and example_translation is distinct from $q$您能把目录寄给我吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$您能把目录寄给我吗？$q$, updated_at = now() where learning_object_id = 'b8ea668b-8822-40bb-87e9-0d692f0b9732' and native_language = 'zh' and example_translation is distinct from $q$您能把目录寄给我吗？$q$ and coalesce(example_translation, '') <> '';

-- 900d5e75-620f-4c29-b91f-1430ad2adc36: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '900d5e75-620f-4c29-b91f-1430ad2adc36', 'learning_objects', 'example_zh', example_zh, $q$你好吗？嗯，还可以。被问到工作时，他回答说还可以。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '900d5e75-620f-4c29-b91f-1430ad2adc36' and example_zh is distinct from $q$你好吗？嗯，还可以。被问到工作时，他回答说还可以。$q$ and true;
update public.learning_objects set example_zh = $q$你好吗？嗯，还可以。被问到工作时，他回答说还可以。$q$, updated_at = now() where id = '900d5e75-620f-4c29-b91f-1430ad2adc36' and example_zh is distinct from $q$你好吗？嗯，还可以。被问到工作时，他回答说还可以。$q$ and true;

-- 900d5e75-620f-4c29-b91f-1430ad2adc36: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '900d5e75-620f-4c29-b91f-1430ad2adc36', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你好吗？嗯，还可以。被问到工作时，他回答说还可以。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '900d5e75-620f-4c29-b91f-1430ad2adc36' and native_language = 'zh' and example_translation is distinct from $q$你好吗？嗯，还可以。被问到工作时，他回答说还可以。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你好吗？嗯，还可以。被问到工作时，他回答说还可以。$q$, updated_at = now() where learning_object_id = '900d5e75-620f-4c29-b91f-1430ad2adc36' and native_language = 'zh' and example_translation is distinct from $q$你好吗？嗯，还可以。被问到工作时，他回答说还可以。$q$ and coalesce(example_translation, '') <> '';

-- 6de66428-0ed8-4a8f-a153-ec8de7e41e35: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6de66428-0ed8-4a8f-a153-ec8de7e41e35', 'learning_objects', 'example_zh', example_zh, $q$为什么她没有得到任何帮助？为什么她没有拿到工资？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '6de66428-0ed8-4a8f-a153-ec8de7e41e35' and example_zh is distinct from $q$为什么她没有得到任何帮助？为什么她没有拿到工资？$q$ and true;
update public.learning_objects set example_zh = $q$为什么她没有得到任何帮助？为什么她没有拿到工资？$q$, updated_at = now() where id = '6de66428-0ed8-4a8f-a153-ec8de7e41e35' and example_zh is distinct from $q$为什么她没有得到任何帮助？为什么她没有拿到工资？$q$ and true;

-- 6de66428-0ed8-4a8f-a153-ec8de7e41e35: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6de66428-0ed8-4a8f-a153-ec8de7e41e35', 'learning_object_translations', 'zh.example_translation', example_translation, $q$为什么她没有得到任何帮助？为什么她没有拿到工资？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '6de66428-0ed8-4a8f-a153-ec8de7e41e35' and native_language = 'zh' and example_translation is distinct from $q$为什么她没有得到任何帮助？为什么她没有拿到工资？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$为什么她没有得到任何帮助？为什么她没有拿到工资？$q$, updated_at = now() where learning_object_id = '6de66428-0ed8-4a8f-a153-ec8de7e41e35' and native_language = 'zh' and example_translation is distinct from $q$为什么她没有得到任何帮助？为什么她没有拿到工资？$q$ and coalesce(example_translation, '') <> '';

-- 032baf45-371a-4ea3-b094-df7f3fa41bbf: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '032baf45-371a-4ea3-b094-df7f3fa41bbf', 'learning_objects', 'example_zh', example_zh, $q$你记得老师说了什么吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '032baf45-371a-4ea3-b094-df7f3fa41bbf' and example_zh is distinct from $q$你记得老师说了什么吗？$q$ and true;
update public.learning_objects set example_zh = $q$你记得老师说了什么吗？$q$, updated_at = now() where id = '032baf45-371a-4ea3-b094-df7f3fa41bbf' and example_zh is distinct from $q$你记得老师说了什么吗？$q$ and true;

-- 032baf45-371a-4ea3-b094-df7f3fa41bbf: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '032baf45-371a-4ea3-b094-df7f3fa41bbf', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你记得老师说了什么吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '032baf45-371a-4ea3-b094-df7f3fa41bbf' and native_language = 'zh' and example_translation is distinct from $q$你记得老师说了什么吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你记得老师说了什么吗？$q$, updated_at = now() where learning_object_id = '032baf45-371a-4ea3-b094-df7f3fa41bbf' and native_language = 'zh' and example_translation is distinct from $q$你记得老师说了什么吗？$q$ and coalesce(example_translation, '') <> '';

-- 5b259bfe-b42c-44e0-a29e-152dfac26358: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5b259bfe-b42c-44e0-a29e-152dfac26358', 'learning_objects', 'example_zh', example_zh, $q$哦，原来如此！那我明白了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '5b259bfe-b42c-44e0-a29e-152dfac26358' and example_zh is distinct from $q$哦，原来如此！那我明白了。$q$ and true;
update public.learning_objects set example_zh = $q$哦，原来如此！那我明白了。$q$, updated_at = now() where id = '5b259bfe-b42c-44e0-a29e-152dfac26358' and example_zh is distinct from $q$哦，原来如此！那我明白了。$q$ and true;

-- 5b259bfe-b42c-44e0-a29e-152dfac26358: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5b259bfe-b42c-44e0-a29e-152dfac26358', 'learning_object_translations', 'zh.example_translation', example_translation, $q$哦，原来如此！那我明白了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '5b259bfe-b42c-44e0-a29e-152dfac26358' and native_language = 'zh' and example_translation is distinct from $q$哦，原来如此！那我明白了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$哦，原来如此！那我明白了。$q$, updated_at = now() where learning_object_id = '5b259bfe-b42c-44e0-a29e-152dfac26358' and native_language = 'zh' and example_translation is distinct from $q$哦，原来如此！那我明白了。$q$ and coalesce(example_translation, '') <> '';

-- c06d9476-c3c3-4048-a9cd-0cc3421f4d0f: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c06d9476-c3c3-4048-a9cd-0cc3421f4d0f', 'learning_objects', 'example_zh', example_zh, $q$和你的朋友说瑞典语。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c06d9476-c3c3-4048-a9cd-0cc3421f4d0f' and example_zh is distinct from $q$和你的朋友说瑞典语。$q$ and true;
update public.learning_objects set example_zh = $q$和你的朋友说瑞典语。$q$, updated_at = now() where id = 'c06d9476-c3c3-4048-a9cd-0cc3421f4d0f' and example_zh is distinct from $q$和你的朋友说瑞典语。$q$ and true;

-- c06d9476-c3c3-4048-a9cd-0cc3421f4d0f: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c06d9476-c3c3-4048-a9cd-0cc3421f4d0f', 'learning_object_translations', 'zh.example_translation', example_translation, $q$和你的朋友说瑞典语。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c06d9476-c3c3-4048-a9cd-0cc3421f4d0f' and native_language = 'zh' and example_translation is distinct from $q$和你的朋友说瑞典语。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$和你的朋友说瑞典语。$q$, updated_at = now() where learning_object_id = 'c06d9476-c3c3-4048-a9cd-0cc3421f4d0f' and native_language = 'zh' and example_translation is distinct from $q$和你的朋友说瑞典语。$q$ and coalesce(example_translation, '') <> '';

-- 967de392-c67b-462d-ba2a-f2d78776ad82: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '967de392-c67b-462d-ba2a-f2d78776ad82', 'learning_objects', 'example_zh', example_zh, $q$请进！门开着。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '967de392-c67b-462d-ba2a-f2d78776ad82' and example_zh is distinct from $q$请进！门开着。$q$ and true;
update public.learning_objects set example_zh = $q$请进！门开着。$q$, updated_at = now() where id = '967de392-c67b-462d-ba2a-f2d78776ad82' and example_zh is distinct from $q$请进！门开着。$q$ and true;

-- 967de392-c67b-462d-ba2a-f2d78776ad82: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '967de392-c67b-462d-ba2a-f2d78776ad82', 'learning_object_translations', 'zh.example_translation', example_translation, $q$请进！门开着。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '967de392-c67b-462d-ba2a-f2d78776ad82' and native_language = 'zh' and example_translation is distinct from $q$请进！门开着。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$请进！门开着。$q$, updated_at = now() where learning_object_id = '967de392-c67b-462d-ba2a-f2d78776ad82' and native_language = 'zh' and example_translation is distinct from $q$请进！门开着。$q$ and coalesce(example_translation, '') <> '';

-- e75f237e-818e-4d06-af59-f891de14c7b5: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e75f237e-818e-4d06-af59-f891de14c7b5', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$Uttryck för förvåning eller oro.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'e75f237e-818e-4d06-af59-f891de14c7b5' and swedish_explanation is distinct from $q$Uttryck för förvåning eller oro.$q$ and true;
update public.learning_objects set swedish_explanation = $q$Uttryck för förvåning eller oro.$q$, updated_at = now() where id = 'e75f237e-818e-4d06-af59-f891de14c7b5' and swedish_explanation is distinct from $q$Uttryck för förvåning eller oro.$q$ and true;

-- e75f237e-818e-4d06-af59-f891de14c7b5: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e75f237e-818e-4d06-af59-f891de14c7b5', 'learning_objects', 'example_zh', example_zh, $q$天啊，已经十点了吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'e75f237e-818e-4d06-af59-f891de14c7b5' and example_zh is distinct from $q$天啊，已经十点了吗？$q$ and true;
update public.learning_objects set example_zh = $q$天啊，已经十点了吗？$q$, updated_at = now() where id = 'e75f237e-818e-4d06-af59-f891de14c7b5' and example_zh is distinct from $q$天啊，已经十点了吗？$q$ and true;

-- e75f237e-818e-4d06-af59-f891de14c7b5: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'e75f237e-818e-4d06-af59-f891de14c7b5', 'learning_object_translations', 'zh.example_translation', example_translation, $q$天啊，已经十点了吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'e75f237e-818e-4d06-af59-f891de14c7b5' and native_language = 'zh' and example_translation is distinct from $q$天啊，已经十点了吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$天啊，已经十点了吗？$q$, updated_at = now() where learning_object_id = 'e75f237e-818e-4d06-af59-f891de14c7b5' and native_language = 'zh' and example_translation is distinct from $q$天啊，已经十点了吗？$q$ and coalesce(example_translation, '') <> '';

-- d1babded-a538-42db-b49c-70a452234d63: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd1babded-a538-42db-b49c-70a452234d63', 'learning_objects', 'example_zh', example_zh, $q$你一个月赚多少钱？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'd1babded-a538-42db-b49c-70a452234d63' and example_zh is distinct from $q$你一个月赚多少钱？$q$ and true;
update public.learning_objects set example_zh = $q$你一个月赚多少钱？$q$, updated_at = now() where id = 'd1babded-a538-42db-b49c-70a452234d63' and example_zh is distinct from $q$你一个月赚多少钱？$q$ and true;

-- d1babded-a538-42db-b49c-70a452234d63: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd1babded-a538-42db-b49c-70a452234d63', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你一个月赚多少钱？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'd1babded-a538-42db-b49c-70a452234d63' and native_language = 'zh' and example_translation is distinct from $q$你一个月赚多少钱？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你一个月赚多少钱？$q$, updated_at = now() where learning_object_id = 'd1babded-a538-42db-b49c-70a452234d63' and native_language = 'zh' and example_translation is distinct from $q$你一个月赚多少钱？$q$ and coalesce(example_translation, '') <> '';

-- a158c773-0889-4717-8771-5385d95c6e3c: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a158c773-0889-4717-8771-5385d95c6e3c', 'learning_objects', 'example_zh', example_zh, $q$啊，哇！她是教授吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a158c773-0889-4717-8771-5385d95c6e3c' and example_zh is distinct from $q$啊，哇！她是教授吗？$q$ and true;
update public.learning_objects set example_zh = $q$啊，哇！她是教授吗？$q$, updated_at = now() where id = 'a158c773-0889-4717-8771-5385d95c6e3c' and example_zh is distinct from $q$啊，哇！她是教授吗？$q$ and true;

-- a158c773-0889-4717-8771-5385d95c6e3c: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a158c773-0889-4717-8771-5385d95c6e3c', 'learning_object_translations', 'zh.example_translation', example_translation, $q$啊，哇！她是教授吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'a158c773-0889-4717-8771-5385d95c6e3c' and native_language = 'zh' and example_translation is distinct from $q$啊，哇！她是教授吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$啊，哇！她是教授吗？$q$, updated_at = now() where learning_object_id = 'a158c773-0889-4717-8771-5385d95c6e3c' and native_language = 'zh' and example_translation is distinct from $q$啊，哇！她是教授吗？$q$ and coalesce(example_translation, '') <> '';

-- 1fce558d-83b1-4fb5-b395-60c6f8ea6cfd: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1fce558d-83b1-4fb5-b395-60c6f8ea6cfd', 'learning_objects', 'example_zh', example_zh, $q$你好，我能帮你们什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '1fce558d-83b1-4fb5-b395-60c6f8ea6cfd' and example_zh is distinct from $q$你好，我能帮你们什么？$q$ and true;
update public.learning_objects set example_zh = $q$你好，我能帮你们什么？$q$, updated_at = now() where id = '1fce558d-83b1-4fb5-b395-60c6f8ea6cfd' and example_zh is distinct from $q$你好，我能帮你们什么？$q$ and true;

-- 1fce558d-83b1-4fb5-b395-60c6f8ea6cfd: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1fce558d-83b1-4fb5-b395-60c6f8ea6cfd', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你好，我能帮你们什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '1fce558d-83b1-4fb5-b395-60c6f8ea6cfd' and native_language = 'zh' and example_translation is distinct from $q$你好，我能帮你们什么？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你好，我能帮你们什么？$q$, updated_at = now() where learning_object_id = '1fce558d-83b1-4fb5-b395-60c6f8ea6cfd' and native_language = 'zh' and example_translation is distinct from $q$你好，我能帮你们什么？$q$ and coalesce(example_translation, '') <> '';

-- 468c2906-fa46-464a-8ae7-dc735099dba4: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '468c2906-fa46-464a-8ae7-dc735099dba4', 'learning_objects', 'example_zh', example_zh, $q$谢谢，我只是看看。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '468c2906-fa46-464a-8ae7-dc735099dba4' and example_zh is distinct from $q$谢谢，我只是看看。$q$ and true;
update public.learning_objects set example_zh = $q$谢谢，我只是看看。$q$, updated_at = now() where id = '468c2906-fa46-464a-8ae7-dc735099dba4' and example_zh is distinct from $q$谢谢，我只是看看。$q$ and true;

-- 468c2906-fa46-464a-8ae7-dc735099dba4: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '468c2906-fa46-464a-8ae7-dc735099dba4', 'learning_object_translations', 'zh.example_translation', example_translation, $q$谢谢，我只是看看。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '468c2906-fa46-464a-8ae7-dc735099dba4' and native_language = 'zh' and example_translation is distinct from $q$谢谢，我只是看看。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$谢谢，我只是看看。$q$, updated_at = now() where learning_object_id = '468c2906-fa46-464a-8ae7-dc735099dba4' and native_language = 'zh' and example_translation is distinct from $q$谢谢，我只是看看。$q$ and coalesce(example_translation, '') <> '';

-- c8a884f1-6ef1-4212-9bb7-755c91e562c9: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c8a884f1-6ef1-4212-9bb7-755c91e562c9', 'learning_objects', 'example_zh', example_zh, $q$你把窗户关上好吗？这里面风吹得好冷。我们都已经冻坏了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c8a884f1-6ef1-4212-9bb7-755c91e562c9' and example_zh is distinct from $q$你把窗户关上好吗？这里面风吹得好冷。我们都已经冻坏了。$q$ and true;
update public.learning_objects set example_zh = $q$你把窗户关上好吗？这里面风吹得好冷。我们都已经冻坏了。$q$, updated_at = now() where id = 'c8a884f1-6ef1-4212-9bb7-755c91e562c9' and example_zh is distinct from $q$你把窗户关上好吗？这里面风吹得好冷。我们都已经冻坏了。$q$ and true;

-- c8a884f1-6ef1-4212-9bb7-755c91e562c9: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c8a884f1-6ef1-4212-9bb7-755c91e562c9', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你把窗户关上好吗？这里面风吹得好冷。我们都已经冻坏了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c8a884f1-6ef1-4212-9bb7-755c91e562c9' and native_language = 'zh' and example_translation is distinct from $q$你把窗户关上好吗？这里面风吹得好冷。我们都已经冻坏了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你把窗户关上好吗？这里面风吹得好冷。我们都已经冻坏了。$q$, updated_at = now() where learning_object_id = 'c8a884f1-6ef1-4212-9bb7-755c91e562c9' and native_language = 'zh' and example_translation is distinct from $q$你把窗户关上好吗？这里面风吹得好冷。我们都已经冻坏了。$q$ and coalesce(example_translation, '') <> '';

-- 9d12c4e6-c1ff-445c-a44d-f51261282039: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9d12c4e6-c1ff-445c-a44d-f51261282039', 'learning_objects', 'example_zh', example_zh, $q$你想喝杯咖啡吗？你想一起去散步吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '9d12c4e6-c1ff-445c-a44d-f51261282039' and example_zh is distinct from $q$你想喝杯咖啡吗？你想一起去散步吗？$q$ and true;
update public.learning_objects set example_zh = $q$你想喝杯咖啡吗？你想一起去散步吗？$q$, updated_at = now() where id = '9d12c4e6-c1ff-445c-a44d-f51261282039' and example_zh is distinct from $q$你想喝杯咖啡吗？你想一起去散步吗？$q$ and true;

-- 9d12c4e6-c1ff-445c-a44d-f51261282039: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9d12c4e6-c1ff-445c-a44d-f51261282039', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你想喝杯咖啡吗？你想一起去散步吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '9d12c4e6-c1ff-445c-a44d-f51261282039' and native_language = 'zh' and example_translation is distinct from $q$你想喝杯咖啡吗？你想一起去散步吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你想喝杯咖啡吗？你想一起去散步吗？$q$, updated_at = now() where learning_object_id = '9d12c4e6-c1ff-445c-a44d-f51261282039' and native_language = 'zh' and example_translation is distinct from $q$你想喝杯咖啡吗？你想一起去散步吗？$q$ and coalesce(example_translation, '') <> '';

-- 183902d2-7d12-4aa3-8ad0-01dce7728df0: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '183902d2-7d12-4aa3-8ad0-01dce7728df0', 'learning_objects', 'example_zh', example_zh, $q$你每次锻炼多长时间？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '183902d2-7d12-4aa3-8ad0-01dce7728df0' and example_zh is distinct from $q$你每次锻炼多长时间？$q$ and true;
update public.learning_objects set example_zh = $q$你每次锻炼多长时间？$q$, updated_at = now() where id = '183902d2-7d12-4aa3-8ad0-01dce7728df0' and example_zh is distinct from $q$你每次锻炼多长时间？$q$ and true;

-- 183902d2-7d12-4aa3-8ad0-01dce7728df0: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '183902d2-7d12-4aa3-8ad0-01dce7728df0', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你每次锻炼多长时间？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '183902d2-7d12-4aa3-8ad0-01dce7728df0' and native_language = 'zh' and example_translation is distinct from $q$你每次锻炼多长时间？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你每次锻炼多长时间？$q$, updated_at = now() where learning_object_id = '183902d2-7d12-4aa3-8ad0-01dce7728df0' and native_language = 'zh' and example_translation is distinct from $q$你每次锻炼多长时间？$q$ and coalesce(example_translation, '') <> '';

-- 4046319a-8b64-48f9-af57-429e3f90abc7: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4046319a-8b64-48f9-af57-429e3f90abc7', 'learning_objects', 'example_zh', example_zh, $q$你今天怎么会休息呢？她怎么会没回复呢？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '4046319a-8b64-48f9-af57-429e3f90abc7' and example_zh is distinct from $q$你今天怎么会休息呢？她怎么会没回复呢？$q$ and true;
update public.learning_objects set example_zh = $q$你今天怎么会休息呢？她怎么会没回复呢？$q$, updated_at = now() where id = '4046319a-8b64-48f9-af57-429e3f90abc7' and example_zh is distinct from $q$你今天怎么会休息呢？她怎么会没回复呢？$q$ and true;

-- 4046319a-8b64-48f9-af57-429e3f90abc7: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '4046319a-8b64-48f9-af57-429e3f90abc7', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你今天怎么会休息呢？她怎么会没回复呢？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '4046319a-8b64-48f9-af57-429e3f90abc7' and native_language = 'zh' and example_translation is distinct from $q$你今天怎么会休息呢？她怎么会没回复呢？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你今天怎么会休息呢？她怎么会没回复呢？$q$, updated_at = now() where learning_object_id = '4046319a-8b64-48f9-af57-429e3f90abc7' and native_language = 'zh' and example_translation is distinct from $q$你今天怎么会休息呢？她怎么会没回复呢？$q$ and coalesce(example_translation, '') <> '';

-- 8561aef6-3a5e-42ae-8837-8734cbfec97b: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8561aef6-3a5e-42ae-8837-8734cbfec97b', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$Det hörs åska.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8561aef6-3a5e-42ae-8837-8734cbfec97b' and swedish_explanation is distinct from $q$Det hörs åska.$q$ and true;
update public.learning_objects set swedish_explanation = $q$Det hörs åska.$q$, updated_at = now() where id = '8561aef6-3a5e-42ae-8837-8734cbfec97b' and swedish_explanation is distinct from $q$Det hörs åska.$q$ and true;

-- 8561aef6-3a5e-42ae-8837-8734cbfec97b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8561aef6-3a5e-42ae-8837-8734cbfec97b', 'learning_objects', 'example_zh', example_zh, $q$今晚打雷。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8561aef6-3a5e-42ae-8837-8734cbfec97b' and example_zh is distinct from $q$今晚打雷。$q$ and true;
update public.learning_objects set example_zh = $q$今晚打雷。$q$, updated_at = now() where id = '8561aef6-3a5e-42ae-8837-8734cbfec97b' and example_zh is distinct from $q$今晚打雷。$q$ and true;

-- 8561aef6-3a5e-42ae-8837-8734cbfec97b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8561aef6-3a5e-42ae-8837-8734cbfec97b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$今晚打雷。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8561aef6-3a5e-42ae-8837-8734cbfec97b' and native_language = 'zh' and example_translation is distinct from $q$今晚打雷。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$今晚打雷。$q$, updated_at = now() where learning_object_id = '8561aef6-3a5e-42ae-8837-8734cbfec97b' and native_language = 'zh' and example_translation is distinct from $q$今晚打雷。$q$ and coalesce(example_translation, '') <> '';

-- eae28f22-7c36-49b4-b1d4-1304ef9345bd: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'eae28f22-7c36-49b4-b1d4-1304ef9345bd', 'learning_objects', 'example_zh', example_zh, $q$我们三点见面可以吗？可以，这很合适。星期一对我来说很合适。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'eae28f22-7c36-49b4-b1d4-1304ef9345bd' and example_zh is distinct from $q$我们三点见面可以吗？可以，这很合适。星期一对我来说很合适。$q$ and true;
update public.learning_objects set example_zh = $q$我们三点见面可以吗？可以，这很合适。星期一对我来说很合适。$q$, updated_at = now() where id = 'eae28f22-7c36-49b4-b1d4-1304ef9345bd' and example_zh is distinct from $q$我们三点见面可以吗？可以，这很合适。星期一对我来说很合适。$q$ and true;

-- eae28f22-7c36-49b4-b1d4-1304ef9345bd: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'eae28f22-7c36-49b4-b1d4-1304ef9345bd', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我们三点见面可以吗？可以，这很合适。星期一对我来说很合适。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'eae28f22-7c36-49b4-b1d4-1304ef9345bd' and native_language = 'zh' and example_translation is distinct from $q$我们三点见面可以吗？可以，这很合适。星期一对我来说很合适。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我们三点见面可以吗？可以，这很合适。星期一对我来说很合适。$q$, updated_at = now() where learning_object_id = 'eae28f22-7c36-49b4-b1d4-1304ef9345bd' and native_language = 'zh' and example_translation is distinct from $q$我们三点见面可以吗？可以，这很合适。星期一对我来说很合适。$q$ and coalesce(example_translation, '') <> '';

-- 9bf088a4-59d0-4f69-b2d6-f13c9c5eb970: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9bf088a4-59d0-4f69-b2d6-f13c9c5eb970', 'learning_objects', 'example_zh', example_zh, $q$哎呀！外面真冷。哎呀！那听起来真让人不舒服。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '9bf088a4-59d0-4f69-b2d6-f13c9c5eb970' and example_zh is distinct from $q$哎呀！外面真冷。哎呀！那听起来真让人不舒服。$q$ and true;
update public.learning_objects set example_zh = $q$哎呀！外面真冷。哎呀！那听起来真让人不舒服。$q$, updated_at = now() where id = '9bf088a4-59d0-4f69-b2d6-f13c9c5eb970' and example_zh is distinct from $q$哎呀！外面真冷。哎呀！那听起来真让人不舒服。$q$ and true;

-- 9bf088a4-59d0-4f69-b2d6-f13c9c5eb970: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9bf088a4-59d0-4f69-b2d6-f13c9c5eb970', 'learning_object_translations', 'zh.example_translation', example_translation, $q$哎呀！外面真冷。哎呀！那听起来真让人不舒服。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '9bf088a4-59d0-4f69-b2d6-f13c9c5eb970' and native_language = 'zh' and example_translation is distinct from $q$哎呀！外面真冷。哎呀！那听起来真让人不舒服。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$哎呀！外面真冷。哎呀！那听起来真让人不舒服。$q$, updated_at = now() where learning_object_id = '9bf088a4-59d0-4f69-b2d6-f13c9c5eb970' and native_language = 'zh' and example_translation is distinct from $q$哎呀！外面真冷。哎呀！那听起来真让人不舒服。$q$ and coalesce(example_translation, '') <> '';

-- a25937a2-183d-4851-9dc9-0c13c91a4513: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a25937a2-183d-4851-9dc9-0c13c91a4513', 'learning_objects', 'example_zh', example_zh, $q$这张礼品卡有效多久？去博物馆的票有效多久？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a25937a2-183d-4851-9dc9-0c13c91a4513' and example_zh is distinct from $q$这张礼品卡有效多久？去博物馆的票有效多久？$q$ and true;
update public.learning_objects set example_zh = $q$这张礼品卡有效多久？去博物馆的票有效多久？$q$, updated_at = now() where id = 'a25937a2-183d-4851-9dc9-0c13c91a4513' and example_zh is distinct from $q$这张礼品卡有效多久？去博物馆的票有效多久？$q$ and true;

-- a25937a2-183d-4851-9dc9-0c13c91a4513: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a25937a2-183d-4851-9dc9-0c13c91a4513', 'learning_object_translations', 'zh.example_translation', example_translation, $q$这张礼品卡有效多久？去博物馆的票有效多久？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'a25937a2-183d-4851-9dc9-0c13c91a4513' and native_language = 'zh' and example_translation is distinct from $q$这张礼品卡有效多久？去博物馆的票有效多久？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$这张礼品卡有效多久？去博物馆的票有效多久？$q$, updated_at = now() where learning_object_id = 'a25937a2-183d-4851-9dc9-0c13c91a4513' and native_language = 'zh' and example_translation is distinct from $q$这张礼品卡有效多久？去博物馆的票有效多久？$q$ and coalesce(example_translation, '') <> '';

-- fe6bfe62-d801-4d6b-8534-ebf1e8e5eb0d: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fe6bfe62-d801-4d6b-8534-ebf1e8e5eb0d', 'learning_objects', 'example_zh', example_zh, $q$谢谢今晚的招待，饭菜太棒了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'fe6bfe62-d801-4d6b-8534-ebf1e8e5eb0d' and example_zh is distinct from $q$谢谢今晚的招待，饭菜太棒了。$q$ and true;
update public.learning_objects set example_zh = $q$谢谢今晚的招待，饭菜太棒了。$q$, updated_at = now() where id = 'fe6bfe62-d801-4d6b-8534-ebf1e8e5eb0d' and example_zh is distinct from $q$谢谢今晚的招待，饭菜太棒了。$q$ and true;

-- fe6bfe62-d801-4d6b-8534-ebf1e8e5eb0d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fe6bfe62-d801-4d6b-8534-ebf1e8e5eb0d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$谢谢今晚的招待，饭菜太棒了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'fe6bfe62-d801-4d6b-8534-ebf1e8e5eb0d' and native_language = 'zh' and example_translation is distinct from $q$谢谢今晚的招待，饭菜太棒了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$谢谢今晚的招待，饭菜太棒了。$q$, updated_at = now() where learning_object_id = 'fe6bfe62-d801-4d6b-8534-ebf1e8e5eb0d' and native_language = 'zh' and example_translation is distinct from $q$谢谢今晚的招待，饭菜太棒了。$q$ and coalesce(example_translation, '') <> '';

-- 132ec547-3090-480a-9777-1d1ca7f9e1f2: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '132ec547-3090-480a-9777-1d1ca7f9e1f2', 'learning_objects', 'example_zh', example_zh, $q$你生病了吗？祝你早日康复！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '132ec547-3090-480a-9777-1d1ca7f9e1f2' and example_zh is distinct from $q$你生病了吗？祝你早日康复！$q$ and true;
update public.learning_objects set example_zh = $q$你生病了吗？祝你早日康复！$q$, updated_at = now() where id = '132ec547-3090-480a-9777-1d1ca7f9e1f2' and example_zh is distinct from $q$你生病了吗？祝你早日康复！$q$ and true;

-- 132ec547-3090-480a-9777-1d1ca7f9e1f2: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '132ec547-3090-480a-9777-1d1ca7f9e1f2', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你生病了吗？祝你早日康复！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '132ec547-3090-480a-9777-1d1ca7f9e1f2' and native_language = 'zh' and example_translation is distinct from $q$你生病了吗？祝你早日康复！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你生病了吗？祝你早日康复！$q$, updated_at = now() where learning_object_id = '132ec547-3090-480a-9777-1d1ca7f9e1f2' and native_language = 'zh' and example_translation is distinct from $q$你生病了吗？祝你早日康复！$q$ and coalesce(example_translation, '') <> '';

-- a4ca0607-86a8-4831-9c21-2b58dc5faec5: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a4ca0607-86a8-4831-9c21-2b58dc5faec5', 'learning_objects', 'example_zh', example_zh, $q$明天课后有什么安排？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a4ca0607-86a8-4831-9c21-2b58dc5faec5' and example_zh is distinct from $q$明天课后有什么安排？$q$ and true;
update public.learning_objects set example_zh = $q$明天课后有什么安排？$q$, updated_at = now() where id = 'a4ca0607-86a8-4831-9c21-2b58dc5faec5' and example_zh is distinct from $q$明天课后有什么安排？$q$ and true;

-- a4ca0607-86a8-4831-9c21-2b58dc5faec5: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a4ca0607-86a8-4831-9c21-2b58dc5faec5', 'learning_object_translations', 'zh.example_translation', example_translation, $q$明天课后有什么安排？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'a4ca0607-86a8-4831-9c21-2b58dc5faec5' and native_language = 'zh' and example_translation is distinct from $q$明天课后有什么安排？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$明天课后有什么安排？$q$, updated_at = now() where learning_object_id = 'a4ca0607-86a8-4831-9c21-2b58dc5faec5' and native_language = 'zh' and example_translation is distinct from $q$明天课后有什么安排？$q$ and coalesce(example_translation, '') <> '';

-- b3489151-74c1-494b-8a73-dbdce981debe: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b3489151-74c1-494b-8a73-dbdce981debe', 'learning_objects', 'example_zh', example_zh, $q$sj 音怎么发？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b3489151-74c1-494b-8a73-dbdce981debe' and example_zh is distinct from $q$sj 音怎么发？$q$ and true;
update public.learning_objects set example_zh = $q$sj 音怎么发？$q$, updated_at = now() where id = 'b3489151-74c1-494b-8a73-dbdce981debe' and example_zh is distinct from $q$sj 音怎么发？$q$ and true;

-- b3489151-74c1-494b-8a73-dbdce981debe: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b3489151-74c1-494b-8a73-dbdce981debe', 'learning_object_translations', 'zh.example_translation', example_translation, $q$sj 音怎么发？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b3489151-74c1-494b-8a73-dbdce981debe' and native_language = 'zh' and example_translation is distinct from $q$sj 音怎么发？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$sj 音怎么发？$q$, updated_at = now() where learning_object_id = 'b3489151-74c1-494b-8a73-dbdce981debe' and native_language = 'zh' and example_translation is distinct from $q$sj 音怎么发？$q$ and coalesce(example_translation, '') <> '';

-- c010d4e6-2e9b-4c65-9a4b-48f1c64572ba: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c010d4e6-2e9b-4c65-9a4b-48f1c64572ba', 'learning_objects', 'example_zh', example_zh, $q$祝你考试顺利！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c010d4e6-2e9b-4c65-9a4b-48f1c64572ba' and example_zh is distinct from $q$祝你考试顺利！$q$ and true;
update public.learning_objects set example_zh = $q$祝你考试顺利！$q$, updated_at = now() where id = 'c010d4e6-2e9b-4c65-9a4b-48f1c64572ba' and example_zh is distinct from $q$祝你考试顺利！$q$ and true;

-- c010d4e6-2e9b-4c65-9a4b-48f1c64572ba: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c010d4e6-2e9b-4c65-9a4b-48f1c64572ba', 'learning_object_translations', 'zh.example_translation', example_translation, $q$祝你考试顺利！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c010d4e6-2e9b-4c65-9a4b-48f1c64572ba' and native_language = 'zh' and example_translation is distinct from $q$祝你考试顺利！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$祝你考试顺利！$q$, updated_at = now() where learning_object_id = 'c010d4e6-2e9b-4c65-9a4b-48f1c64572ba' and native_language = 'zh' and example_translation is distinct from $q$祝你考试顺利！$q$ and coalesce(example_translation, '') <> '';

-- 92552dca-be63-43f2-b3a6-ab088c36e510: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '92552dca-be63-43f2-b3a6-ab088c36e510', 'learning_objects', 'example_zh', example_zh, $q$非常感谢你的帮助！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '92552dca-be63-43f2-b3a6-ab088c36e510' and example_zh is distinct from $q$非常感谢你的帮助！$q$ and true;
update public.learning_objects set example_zh = $q$非常感谢你的帮助！$q$, updated_at = now() where id = '92552dca-be63-43f2-b3a6-ab088c36e510' and example_zh is distinct from $q$非常感谢你的帮助！$q$ and true;

-- 92552dca-be63-43f2-b3a6-ab088c36e510: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '92552dca-be63-43f2-b3a6-ab088c36e510', 'learning_object_translations', 'zh.example_translation', example_translation, $q$非常感谢你的帮助！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '92552dca-be63-43f2-b3a6-ab088c36e510' and native_language = 'zh' and example_translation is distinct from $q$非常感谢你的帮助！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$非常感谢你的帮助！$q$, updated_at = now() where learning_object_id = '92552dca-be63-43f2-b3a6-ab088c36e510' and native_language = 'zh' and example_translation is distinct from $q$非常感谢你的帮助！$q$ and coalesce(example_translation, '') <> '';

-- 797cb176-8017-47ca-a355-f5422ab528d8: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '797cb176-8017-47ca-a355-f5422ab528d8', 'learning_objects', 'example_zh', example_zh, $q$把你的名字写在纸上。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '797cb176-8017-47ca-a355-f5422ab528d8' and example_zh is distinct from $q$把你的名字写在纸上。$q$ and true;
update public.learning_objects set example_zh = $q$把你的名字写在纸上。$q$, updated_at = now() where id = '797cb176-8017-47ca-a355-f5422ab528d8' and example_zh is distinct from $q$把你的名字写在纸上。$q$ and true;

-- 797cb176-8017-47ca-a355-f5422ab528d8: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '797cb176-8017-47ca-a355-f5422ab528d8', 'learning_object_translations', 'zh.example_translation', example_translation, $q$把你的名字写在纸上。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '797cb176-8017-47ca-a355-f5422ab528d8' and native_language = 'zh' and example_translation is distinct from $q$把你的名字写在纸上。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$把你的名字写在纸上。$q$, updated_at = now() where learning_object_id = '797cb176-8017-47ca-a355-f5422ab528d8' and native_language = 'zh' and example_translation is distinct from $q$把你的名字写在纸上。$q$ and coalesce(example_translation, '') <> '';

-- f5ab0923-c5c5-4ca0-a91b-e4ca436db996: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f5ab0923-c5c5-4ca0-a91b-e4ca436db996', 'learning_objects', 'example_zh', example_zh, $q$哦不！我没赶上公交车。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'f5ab0923-c5c5-4ca0-a91b-e4ca436db996' and example_zh is distinct from $q$哦不！我没赶上公交车。$q$ and true;
update public.learning_objects set example_zh = $q$哦不！我没赶上公交车。$q$, updated_at = now() where id = 'f5ab0923-c5c5-4ca0-a91b-e4ca436db996' and example_zh is distinct from $q$哦不！我没赶上公交车。$q$ and true;

-- f5ab0923-c5c5-4ca0-a91b-e4ca436db996: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f5ab0923-c5c5-4ca0-a91b-e4ca436db996', 'learning_object_translations', 'zh.example_translation', example_translation, $q$哦不！我没赶上公交车。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'f5ab0923-c5c5-4ca0-a91b-e4ca436db996' and native_language = 'zh' and example_translation is distinct from $q$哦不！我没赶上公交车。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$哦不！我没赶上公交车。$q$, updated_at = now() where learning_object_id = 'f5ab0923-c5c5-4ca0-a91b-e4ca436db996' and native_language = 'zh' and example_translation is distinct from $q$哦不！我没赶上公交车。$q$ and coalesce(example_translation, '') <> '';

-- 21593a19-6df2-47ef-941e-6f2bbe0c6ec0: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '21593a19-6df2-47ef-941e-6f2bbe0c6ec0', 'learning_objects', 'example_zh', example_zh, $q$你们收现金还是只收卡？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '21593a19-6df2-47ef-941e-6f2bbe0c6ec0' and example_zh is distinct from $q$你们收现金还是只收卡？$q$ and true;
update public.learning_objects set example_zh = $q$你们收现金还是只收卡？$q$, updated_at = now() where id = '21593a19-6df2-47ef-941e-6f2bbe0c6ec0' and example_zh is distinct from $q$你们收现金还是只收卡？$q$ and true;

-- 21593a19-6df2-47ef-941e-6f2bbe0c6ec0: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '21593a19-6df2-47ef-941e-6f2bbe0c6ec0', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你们收现金还是只收卡？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '21593a19-6df2-47ef-941e-6f2bbe0c6ec0' and native_language = 'zh' and example_translation is distinct from $q$你们收现金还是只收卡？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你们收现金还是只收卡？$q$, updated_at = now() where learning_object_id = '21593a19-6df2-47ef-941e-6f2bbe0c6ec0' and native_language = 'zh' and example_translation is distinct from $q$你们收现金还是只收卡？$q$ and coalesce(example_translation, '') <> '';

-- 86551a47-bce7-4f1c-986d-c9e49ab8511e: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '86551a47-bce7-4f1c-986d-c9e49ab8511e', 'learning_objects', 'example_zh', example_zh, $q$合脚吗？还是会疼？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '86551a47-bce7-4f1c-986d-c9e49ab8511e' and example_zh is distinct from $q$合脚吗？还是会疼？$q$ and true;
update public.learning_objects set example_zh = $q$合脚吗？还是会疼？$q$, updated_at = now() where id = '86551a47-bce7-4f1c-986d-c9e49ab8511e' and example_zh is distinct from $q$合脚吗？还是会疼？$q$ and true;

-- 86551a47-bce7-4f1c-986d-c9e49ab8511e: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '86551a47-bce7-4f1c-986d-c9e49ab8511e', 'learning_object_translations', 'zh.example_translation', example_translation, $q$合脚吗？还是会疼？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '86551a47-bce7-4f1c-986d-c9e49ab8511e' and native_language = 'zh' and example_translation is distinct from $q$合脚吗？还是会疼？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$合脚吗？还是会疼？$q$, updated_at = now() where learning_object_id = '86551a47-bce7-4f1c-986d-c9e49ab8511e' and native_language = 'zh' and example_translation is distinct from $q$合脚吗？还是会疼？$q$ and coalesce(example_translation, '') <> '';

-- 8366b444-08f0-4bd6-9534-c7b157f9233f: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8366b444-08f0-4bd6-9534-c7b157f9233f', 'learning_objects', 'example_zh', example_zh, $q$你能帮我找到合适的尺码吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8366b444-08f0-4bd6-9534-c7b157f9233f' and example_zh is distinct from $q$你能帮我找到合适的尺码吗？$q$ and true;
update public.learning_objects set example_zh = $q$你能帮我找到合适的尺码吗？$q$, updated_at = now() where id = '8366b444-08f0-4bd6-9534-c7b157f9233f' and example_zh is distinct from $q$你能帮我找到合适的尺码吗？$q$ and true;

-- 8366b444-08f0-4bd6-9534-c7b157f9233f: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8366b444-08f0-4bd6-9534-c7b157f9233f', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你能帮我找到合适的尺码吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8366b444-08f0-4bd6-9534-c7b157f9233f' and native_language = 'zh' and example_translation is distinct from $q$你能帮我找到合适的尺码吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你能帮我找到合适的尺码吗？$q$, updated_at = now() where learning_object_id = '8366b444-08f0-4bd6-9534-c7b157f9233f' and native_language = 'zh' and example_translation is distinct from $q$你能帮我找到合适的尺码吗？$q$ and coalesce(example_translation, '') <> '';

-- 2fbfdc4e-98f2-4e74-9d6d-b72291371cc4: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2fbfdc4e-98f2-4e74-9d6d-b72291371cc4', 'learning_objects', 'example_zh', example_zh, $q$电影怎么样？非常好。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '2fbfdc4e-98f2-4e74-9d6d-b72291371cc4' and example_zh is distinct from $q$电影怎么样？非常好。$q$ and true;
update public.learning_objects set example_zh = $q$电影怎么样？非常好。$q$, updated_at = now() where id = '2fbfdc4e-98f2-4e74-9d6d-b72291371cc4' and example_zh is distinct from $q$电影怎么样？非常好。$q$ and true;

-- 2fbfdc4e-98f2-4e74-9d6d-b72291371cc4: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2fbfdc4e-98f2-4e74-9d6d-b72291371cc4', 'learning_object_translations', 'zh.example_translation', example_translation, $q$电影怎么样？非常好。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '2fbfdc4e-98f2-4e74-9d6d-b72291371cc4' and native_language = 'zh' and example_translation is distinct from $q$电影怎么样？非常好。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$电影怎么样？非常好。$q$, updated_at = now() where learning_object_id = '2fbfdc4e-98f2-4e74-9d6d-b72291371cc4' and native_language = 'zh' and example_translation is distinct from $q$电影怎么样？非常好。$q$ and coalesce(example_translation, '') <> '';

-- de186884-88ac-45c7-9856-db43d0274e0a: example_sv
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'de186884-88ac-45c7-9856-db43d0274e0a', 'learning_objects', 'example_sv', example_sv, $q$Den svenska kronan är valutan i Sverige.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'de186884-88ac-45c7-9856-db43d0274e0a' and example_sv is distinct from $q$Den svenska kronan är valutan i Sverige.$q$ and true;
update public.learning_objects set example_sv = $q$Den svenska kronan är valutan i Sverige.$q$, updated_at = now() where id = 'de186884-88ac-45c7-9856-db43d0274e0a' and example_sv is distinct from $q$Den svenska kronan är valutan i Sverige.$q$ and true;

-- de186884-88ac-45c7-9856-db43d0274e0a: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'de186884-88ac-45c7-9856-db43d0274e0a', 'learning_objects', 'example_zh', example_zh, $q$瑞典克朗是瑞典的货币。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'de186884-88ac-45c7-9856-db43d0274e0a' and example_zh is distinct from $q$瑞典克朗是瑞典的货币。$q$ and true;
update public.learning_objects set example_zh = $q$瑞典克朗是瑞典的货币。$q$, updated_at = now() where id = 'de186884-88ac-45c7-9856-db43d0274e0a' and example_zh is distinct from $q$瑞典克朗是瑞典的货币。$q$ and true;

-- de186884-88ac-45c7-9856-db43d0274e0a: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'de186884-88ac-45c7-9856-db43d0274e0a', 'learning_object_translations', 'zh.example_translation', example_translation, $q$瑞典克朗是瑞典的货币。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'de186884-88ac-45c7-9856-db43d0274e0a' and native_language = 'zh' and example_translation is distinct from $q$瑞典克朗是瑞典的货币。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$瑞典克朗是瑞典的货币。$q$, updated_at = now() where learning_object_id = 'de186884-88ac-45c7-9856-db43d0274e0a' and native_language = 'zh' and example_translation is distinct from $q$瑞典克朗是瑞典的货币。$q$ and coalesce(example_translation, '') <> '';

-- de186884-88ac-45c7-9856-db43d0274e0a: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'de186884-88ac-45c7-9856-db43d0274e0a', 'learning_object_translations', 'en.example_translation', example_translation, $q$The Swedish krona is the currency of Sweden.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'de186884-88ac-45c7-9856-db43d0274e0a' and native_language = 'en' and example_translation is distinct from $q$The Swedish krona is the currency of Sweden.$q$ and true;
update public.learning_object_translations set example_translation = $q$The Swedish krona is the currency of Sweden.$q$, updated_at = now() where learning_object_id = 'de186884-88ac-45c7-9856-db43d0274e0a' and native_language = 'en' and example_translation is distinct from $q$The Swedish krona is the currency of Sweden.$q$ and true;

-- 955eebdf-4367-4838-8aac-a1870dd4f6a9: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '955eebdf-4367-4838-8aac-a1870dd4f6a9', 'learning_objects', 'example_zh', example_zh, $q$干杯，欢迎来到派对！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '955eebdf-4367-4838-8aac-a1870dd4f6a9' and example_zh is distinct from $q$干杯，欢迎来到派对！$q$ and true;
update public.learning_objects set example_zh = $q$干杯，欢迎来到派对！$q$, updated_at = now() where id = '955eebdf-4367-4838-8aac-a1870dd4f6a9' and example_zh is distinct from $q$干杯，欢迎来到派对！$q$ and true;

-- 955eebdf-4367-4838-8aac-a1870dd4f6a9: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '955eebdf-4367-4838-8aac-a1870dd4f6a9', 'learning_object_translations', 'zh.example_translation', example_translation, $q$干杯，欢迎来到派对！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '955eebdf-4367-4838-8aac-a1870dd4f6a9' and native_language = 'zh' and example_translation is distinct from $q$干杯，欢迎来到派对！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$干杯，欢迎来到派对！$q$, updated_at = now() where learning_object_id = '955eebdf-4367-4838-8aac-a1870dd4f6a9' and native_language = 'zh' and example_translation is distinct from $q$干杯，欢迎来到派对！$q$ and coalesce(example_translation, '') <> '';

-- 955eebdf-4367-4838-8aac-a1870dd4f6a9: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '955eebdf-4367-4838-8aac-a1870dd4f6a9', 'learning_object_translations', 'en.example_translation', example_translation, $q$Cheers, and welcome to the party!$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '955eebdf-4367-4838-8aac-a1870dd4f6a9' and native_language = 'en' and example_translation is distinct from $q$Cheers, and welcome to the party!$q$ and true;
update public.learning_object_translations set example_translation = $q$Cheers, and welcome to the party!$q$, updated_at = now() where learning_object_id = '955eebdf-4367-4838-8aac-a1870dd4f6a9' and native_language = 'en' and example_translation is distinct from $q$Cheers, and welcome to the party!$q$ and true;

-- 5da42b45-24c1-4b9c-9088-e0735c0d514e: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5da42b45-24c1-4b9c-9088-e0735c0d514e', 'learning_objects', 'example_zh', example_zh, $q$你会关窗吧？不然会冷的。我们晚点见，好吧？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '5da42b45-24c1-4b9c-9088-e0735c0d514e' and example_zh is distinct from $q$你会关窗吧？不然会冷的。我们晚点见，好吧？$q$ and true;
update public.learning_objects set example_zh = $q$你会关窗吧？不然会冷的。我们晚点见，好吧？$q$, updated_at = now() where id = '5da42b45-24c1-4b9c-9088-e0735c0d514e' and example_zh is distinct from $q$你会关窗吧？不然会冷的。我们晚点见，好吧？$q$ and true;

-- 5da42b45-24c1-4b9c-9088-e0735c0d514e: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5da42b45-24c1-4b9c-9088-e0735c0d514e', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你会关窗吧？不然会冷的。我们晚点见，好吧？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '5da42b45-24c1-4b9c-9088-e0735c0d514e' and native_language = 'zh' and example_translation is distinct from $q$你会关窗吧？不然会冷的。我们晚点见，好吧？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你会关窗吧？不然会冷的。我们晚点见，好吧？$q$, updated_at = now() where learning_object_id = '5da42b45-24c1-4b9c-9088-e0735c0d514e' and native_language = 'zh' and example_translation is distinct from $q$你会关窗吧？不然会冷的。我们晚点见，好吧？$q$ and coalesce(example_translation, '') <> '';

-- 04a125fd-e458-4977-87e6-feee8df477ab: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '04a125fd-e458-4977-87e6-feee8df477ab', 'learning_objects', 'example_zh', example_zh, $q$你能关一下窗吗？我有点冷。你走的时候能把窗关上吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '04a125fd-e458-4977-87e6-feee8df477ab' and example_zh is distinct from $q$你能关一下窗吗？我有点冷。你走的时候能把窗关上吗？$q$ and true;
update public.learning_objects set example_zh = $q$你能关一下窗吗？我有点冷。你走的时候能把窗关上吗？$q$, updated_at = now() where id = '04a125fd-e458-4977-87e6-feee8df477ab' and example_zh is distinct from $q$你能关一下窗吗？我有点冷。你走的时候能把窗关上吗？$q$ and true;

-- 04a125fd-e458-4977-87e6-feee8df477ab: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '04a125fd-e458-4977-87e6-feee8df477ab', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你能关一下窗吗？我有点冷。你走的时候能把窗关上吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '04a125fd-e458-4977-87e6-feee8df477ab' and native_language = 'zh' and example_translation is distinct from $q$你能关一下窗吗？我有点冷。你走的时候能把窗关上吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你能关一下窗吗？我有点冷。你走的时候能把窗关上吗？$q$, updated_at = now() where learning_object_id = '04a125fd-e458-4977-87e6-feee8df477ab' and native_language = 'zh' and example_translation is distinct from $q$你能关一下窗吗？我有点冷。你走的时候能把窗关上吗？$q$ and coalesce(example_translation, '') <> '';

-- 04a125fd-e458-4977-87e6-feee8df477ab: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '04a125fd-e458-4977-87e6-feee8df477ab', 'learning_object_translations', 'en.example_translation', example_translation, $q$Could you close the window? I’m a little cold. Can you close the window when you leave?$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '04a125fd-e458-4977-87e6-feee8df477ab' and native_language = 'en' and example_translation is distinct from $q$Could you close the window? I’m a little cold. Can you close the window when you leave?$q$ and true;
update public.learning_object_translations set example_translation = $q$Could you close the window? I’m a little cold. Can you close the window when you leave?$q$, updated_at = now() where learning_object_id = '04a125fd-e458-4977-87e6-feee8df477ab' and native_language = 'en' and example_translation is distinct from $q$Could you close the window? I’m a little cold. Can you close the window when you leave?$q$ and true;

-- cdb1458d-51e5-434d-b9c2-928893fffaa8: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'cdb1458d-51e5-434d-b9c2-928893fffaa8', 'learning_objects', 'example_zh', example_zh, $q$你关一下窗好吗？这里有穿堂风。你走之前把窗关上，好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'cdb1458d-51e5-434d-b9c2-928893fffaa8' and example_zh is distinct from $q$你关一下窗好吗？这里有穿堂风。你走之前把窗关上，好吗？$q$ and true;
update public.learning_objects set example_zh = $q$你关一下窗好吗？这里有穿堂风。你走之前把窗关上，好吗？$q$, updated_at = now() where id = 'cdb1458d-51e5-434d-b9c2-928893fffaa8' and example_zh is distinct from $q$你关一下窗好吗？这里有穿堂风。你走之前把窗关上，好吗？$q$ and true;

-- cdb1458d-51e5-434d-b9c2-928893fffaa8: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'cdb1458d-51e5-434d-b9c2-928893fffaa8', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你关一下窗好吗？这里有穿堂风。你走之前把窗关上，好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'cdb1458d-51e5-434d-b9c2-928893fffaa8' and native_language = 'zh' and example_translation is distinct from $q$你关一下窗好吗？这里有穿堂风。你走之前把窗关上，好吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你关一下窗好吗？这里有穿堂风。你走之前把窗关上，好吗？$q$, updated_at = now() where learning_object_id = 'cdb1458d-51e5-434d-b9c2-928893fffaa8' and native_language = 'zh' and example_translation is distinct from $q$你关一下窗好吗？这里有穿堂风。你走之前把窗关上，好吗？$q$ and coalesce(example_translation, '') <> '';

-- 6eb6ff7d-134d-4cb3-9e12-c742e5fa4b78: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6eb6ff7d-134d-4cb3-9e12-c742e5fa4b78', 'learning_objects', 'example_zh', example_zh, $q$你一公里能跑多快？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '6eb6ff7d-134d-4cb3-9e12-c742e5fa4b78' and example_zh is distinct from $q$你一公里能跑多快？$q$ and true;
update public.learning_objects set example_zh = $q$你一公里能跑多快？$q$, updated_at = now() where id = '6eb6ff7d-134d-4cb3-9e12-c742e5fa4b78' and example_zh is distinct from $q$你一公里能跑多快？$q$ and true;

-- 6eb6ff7d-134d-4cb3-9e12-c742e5fa4b78: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6eb6ff7d-134d-4cb3-9e12-c742e5fa4b78', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你一公里能跑多快？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '6eb6ff7d-134d-4cb3-9e12-c742e5fa4b78' and native_language = 'zh' and example_translation is distinct from $q$你一公里能跑多快？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你一公里能跑多快？$q$, updated_at = now() where learning_object_id = '6eb6ff7d-134d-4cb3-9e12-c742e5fa4b78' and native_language = 'zh' and example_translation is distinct from $q$你一公里能跑多快？$q$ and coalesce(example_translation, '') <> '';

-- a984f42e-1513-43f4-b14c-adfd2d469d8d: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a984f42e-1513-43f4-b14c-adfd2d469d8d', 'learning_objects', 'example_zh', example_zh, $q$喂！你听得到我吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'a984f42e-1513-43f4-b14c-adfd2d469d8d' and example_zh is distinct from $q$喂！你听得到我吗？$q$ and true;
update public.learning_objects set example_zh = $q$喂！你听得到我吗？$q$, updated_at = now() where id = 'a984f42e-1513-43f4-b14c-adfd2d469d8d' and example_zh is distinct from $q$喂！你听得到我吗？$q$ and true;

-- a984f42e-1513-43f4-b14c-adfd2d469d8d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'a984f42e-1513-43f4-b14c-adfd2d469d8d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$喂！你听得到我吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'a984f42e-1513-43f4-b14c-adfd2d469d8d' and native_language = 'zh' and example_translation is distinct from $q$喂！你听得到我吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$喂！你听得到我吗？$q$, updated_at = now() where learning_object_id = 'a984f42e-1513-43f4-b14c-adfd2d469d8d' and native_language = 'zh' and example_translation is distinct from $q$喂！你听得到我吗？$q$ and coalesce(example_translation, '') <> '';

-- 08b4cece-1331-4f91-aeee-09a0e0424499: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '08b4cece-1331-4f91-aeee-09a0e0424499', 'learning_objects', 'example_zh', example_zh, $q$队里有多少人训练？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '08b4cece-1331-4f91-aeee-09a0e0424499' and example_zh is distinct from $q$队里有多少人训练？$q$ and true;
update public.learning_objects set example_zh = $q$队里有多少人训练？$q$, updated_at = now() where id = '08b4cece-1331-4f91-aeee-09a0e0424499' and example_zh is distinct from $q$队里有多少人训练？$q$ and true;

-- 08b4cece-1331-4f91-aeee-09a0e0424499: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '08b4cece-1331-4f91-aeee-09a0e0424499', 'learning_object_translations', 'zh.example_translation', example_translation, $q$队里有多少人训练？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '08b4cece-1331-4f91-aeee-09a0e0424499' and native_language = 'zh' and example_translation is distinct from $q$队里有多少人训练？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$队里有多少人训练？$q$, updated_at = now() where learning_object_id = '08b4cece-1331-4f91-aeee-09a0e0424499' and native_language = 'zh' and example_translation is distinct from $q$队里有多少人训练？$q$ and coalesce(example_translation, '') <> '';

-- 1f34c346-5c65-4505-91f6-83052c9fdd76: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1f34c346-5c65-4505-91f6-83052c9fdd76', 'learning_objects', 'example_zh', example_zh, $q$可以把窗户关上吗？外面的声音让我很受干扰。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '1f34c346-5c65-4505-91f6-83052c9fdd76' and example_zh is distinct from $q$可以把窗户关上吗？外面的声音让我很受干扰。$q$ and true;
update public.learning_objects set example_zh = $q$可以把窗户关上吗？外面的声音让我很受干扰。$q$, updated_at = now() where id = '1f34c346-5c65-4505-91f6-83052c9fdd76' and example_zh is distinct from $q$可以把窗户关上吗？外面的声音让我很受干扰。$q$ and true;

-- 1f34c346-5c65-4505-91f6-83052c9fdd76: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1f34c346-5c65-4505-91f6-83052c9fdd76', 'learning_object_translations', 'zh.example_translation', example_translation, $q$可以把窗户关上吗？外面的声音让我很受干扰。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '1f34c346-5c65-4505-91f6-83052c9fdd76' and native_language = 'zh' and example_translation is distinct from $q$可以把窗户关上吗？外面的声音让我很受干扰。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$可以把窗户关上吗？外面的声音让我很受干扰。$q$, updated_at = now() where learning_object_id = '1f34c346-5c65-4505-91f6-83052c9fdd76' and native_language = 'zh' and example_translation is distinct from $q$可以把窗户关上吗？外面的声音让我很受干扰。$q$ and coalesce(example_translation, '') <> '';

-- f2fbb267-236b-424b-bd84-11063dec7c02: swedish_explanation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f2fbb267-236b-424b-bd84-11063dec7c02', 'learning_objects', 'swedish_explanation', swedish_explanation, $q$ett vardagligt sätt att säga åt någon att sluta$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'f2fbb267-236b-424b-bd84-11063dec7c02' and swedish_explanation is distinct from $q$ett vardagligt sätt att säga åt någon att sluta$q$ and true;
update public.learning_objects set swedish_explanation = $q$ett vardagligt sätt att säga åt någon att sluta$q$, updated_at = now() where id = 'f2fbb267-236b-424b-bd84-11063dec7c02' and swedish_explanation is distinct from $q$ett vardagligt sätt att säga åt någon att sluta$q$ and true;

-- f2fbb267-236b-424b-bd84-11063dec7c02: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f2fbb267-236b-424b-bd84-11063dec7c02', 'learning_objects', 'example_zh', example_zh, $q$别闹了！你是在开玩笑吧？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'f2fbb267-236b-424b-bd84-11063dec7c02' and example_zh is distinct from $q$别闹了！你是在开玩笑吧？$q$ and true;
update public.learning_objects set example_zh = $q$别闹了！你是在开玩笑吧？$q$, updated_at = now() where id = 'f2fbb267-236b-424b-bd84-11063dec7c02' and example_zh is distinct from $q$别闹了！你是在开玩笑吧？$q$ and true;

-- f2fbb267-236b-424b-bd84-11063dec7c02: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f2fbb267-236b-424b-bd84-11063dec7c02', 'learning_object_translations', 'zh.example_translation', example_translation, $q$别闹了！你是在开玩笑吧？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'f2fbb267-236b-424b-bd84-11063dec7c02' and native_language = 'zh' and example_translation is distinct from $q$别闹了！你是在开玩笑吧？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$别闹了！你是在开玩笑吧？$q$, updated_at = now() where learning_object_id = 'f2fbb267-236b-424b-bd84-11063dec7c02' and native_language = 'zh' and example_translation is distinct from $q$别闹了！你是在开玩笑吧？$q$ and coalesce(example_translation, '') <> '';

-- 00cb9125-4816-4b7f-bcfa-e8ff6546ec00: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '00cb9125-4816-4b7f-bcfa-e8ff6546ec00', 'learning_objects', 'example_zh', example_zh, $q$你在开玩笑吧！你真的赢了吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '00cb9125-4816-4b7f-bcfa-e8ff6546ec00' and example_zh is distinct from $q$你在开玩笑吧！你真的赢了吗？$q$ and true;
update public.learning_objects set example_zh = $q$你在开玩笑吧！你真的赢了吗？$q$, updated_at = now() where id = '00cb9125-4816-4b7f-bcfa-e8ff6546ec00' and example_zh is distinct from $q$你在开玩笑吧！你真的赢了吗？$q$ and true;

-- 00cb9125-4816-4b7f-bcfa-e8ff6546ec00: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '00cb9125-4816-4b7f-bcfa-e8ff6546ec00', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你在开玩笑吧！你真的赢了吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '00cb9125-4816-4b7f-bcfa-e8ff6546ec00' and native_language = 'zh' and example_translation is distinct from $q$你在开玩笑吧！你真的赢了吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你在开玩笑吧！你真的赢了吗？$q$, updated_at = now() where learning_object_id = '00cb9125-4816-4b7f-bcfa-e8ff6546ec00' and native_language = 'zh' and example_translation is distinct from $q$你在开玩笑吧！你真的赢了吗？$q$ and coalesce(example_translation, '') <> '';

-- 227e93c5-303a-4268-b470-1507127c0340: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '227e93c5-303a-4268-b470-1507127c0340', 'learning_objects', 'example_zh', example_zh, $q$我通常五点下班回到家。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '227e93c5-303a-4268-b470-1507127c0340' and example_zh is distinct from $q$我通常五点下班回到家。$q$ and true;
update public.learning_objects set example_zh = $q$我通常五点下班回到家。$q$, updated_at = now() where id = '227e93c5-303a-4268-b470-1507127c0340' and example_zh is distinct from $q$我通常五点下班回到家。$q$ and true;

-- 227e93c5-303a-4268-b470-1507127c0340: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '227e93c5-303a-4268-b470-1507127c0340', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我通常五点下班回到家。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '227e93c5-303a-4268-b470-1507127c0340' and native_language = 'zh' and example_translation is distinct from $q$我通常五点下班回到家。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我通常五点下班回到家。$q$, updated_at = now() where learning_object_id = '227e93c5-303a-4268-b470-1507127c0340' and native_language = 'zh' and example_translation is distinct from $q$我通常五点下班回到家。$q$ and coalesce(example_translation, '') <> '';

-- 788807f8-d021-4a6a-b239-249563dba90b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '788807f8-d021-4a6a-b239-249563dba90b', 'learning_objects', 'example_zh', example_zh, $q$你觉得这门新课程怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '788807f8-d021-4a6a-b239-249563dba90b' and example_zh is distinct from $q$你觉得这门新课程怎么样？$q$ and true;
update public.learning_objects set example_zh = $q$你觉得这门新课程怎么样？$q$, updated_at = now() where id = '788807f8-d021-4a6a-b239-249563dba90b' and example_zh is distinct from $q$你觉得这门新课程怎么样？$q$ and true;

-- 788807f8-d021-4a6a-b239-249563dba90b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '788807f8-d021-4a6a-b239-249563dba90b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你觉得这门新课程怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '788807f8-d021-4a6a-b239-249563dba90b' and native_language = 'zh' and example_translation is distinct from $q$你觉得这门新课程怎么样？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你觉得这门新课程怎么样？$q$, updated_at = now() where learning_object_id = '788807f8-d021-4a6a-b239-249563dba90b' and native_language = 'zh' and example_translation is distinct from $q$你觉得这门新课程怎么样？$q$ and coalesce(example_translation, '') <> '';

-- 85a68cd1-db99-409c-a71b-5086a622a811: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '85a68cd1-db99-409c-a71b-5086a622a811', 'learning_objects', 'example_zh', example_zh, $q$高中毕业时，事情可以这样进行。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '85a68cd1-db99-409c-a71b-5086a622a811' and example_zh is distinct from $q$高中毕业时，事情可以这样进行。$q$ and true;
update public.learning_objects set example_zh = $q$高中毕业时，事情可以这样进行。$q$, updated_at = now() where id = '85a68cd1-db99-409c-a71b-5086a622a811' and example_zh is distinct from $q$高中毕业时，事情可以这样进行。$q$ and true;

-- 85a68cd1-db99-409c-a71b-5086a622a811: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '85a68cd1-db99-409c-a71b-5086a622a811', 'learning_object_translations', 'zh.example_translation', example_translation, $q$高中毕业时，事情可以这样进行。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '85a68cd1-db99-409c-a71b-5086a622a811' and native_language = 'zh' and example_translation is distinct from $q$高中毕业时，事情可以这样进行。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$高中毕业时，事情可以这样进行。$q$, updated_at = now() where learning_object_id = '85a68cd1-db99-409c-a71b-5086a622a811' and native_language = 'zh' and example_translation is distinct from $q$高中毕业时，事情可以这样进行。$q$ and coalesce(example_translation, '') <> '';

-- 84db7947-54e4-4d27-a1ce-f4b0705c3a37: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '84db7947-54e4-4d27-a1ce-f4b0705c3a37', 'learning_objects', 'example_zh', example_zh, $q$你在家说什么语言？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '84db7947-54e4-4d27-a1ce-f4b0705c3a37' and example_zh is distinct from $q$你在家说什么语言？$q$ and true;
update public.learning_objects set example_zh = $q$你在家说什么语言？$q$, updated_at = now() where id = '84db7947-54e4-4d27-a1ce-f4b0705c3a37' and example_zh is distinct from $q$你在家说什么语言？$q$ and true;

-- 84db7947-54e4-4d27-a1ce-f4b0705c3a37: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '84db7947-54e4-4d27-a1ce-f4b0705c3a37', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你在家说什么语言？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '84db7947-54e4-4d27-a1ce-f4b0705c3a37' and native_language = 'zh' and example_translation is distinct from $q$你在家说什么语言？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你在家说什么语言？$q$, updated_at = now() where learning_object_id = '84db7947-54e4-4d27-a1ce-f4b0705c3a37' and native_language = 'zh' and example_translation is distinct from $q$你在家说什么语言？$q$ and coalesce(example_translation, '') <> '';

-- 5fa27455-704a-491e-bd3b-03cb089711c8: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5fa27455-704a-491e-bd3b-03cb089711c8', 'learning_objects', 'example_zh', example_zh, $q$在我们开始之前，你们有什么问题吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '5fa27455-704a-491e-bd3b-03cb089711c8' and example_zh is distinct from $q$在我们开始之前，你们有什么问题吗？$q$ and true;
update public.learning_objects set example_zh = $q$在我们开始之前，你们有什么问题吗？$q$, updated_at = now() where id = '5fa27455-704a-491e-bd3b-03cb089711c8' and example_zh is distinct from $q$在我们开始之前，你们有什么问题吗？$q$ and true;

-- 5fa27455-704a-491e-bd3b-03cb089711c8: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5fa27455-704a-491e-bd3b-03cb089711c8', 'learning_object_translations', 'zh.example_translation', example_translation, $q$在我们开始之前，你们有什么问题吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '5fa27455-704a-491e-bd3b-03cb089711c8' and native_language = 'zh' and example_translation is distinct from $q$在我们开始之前，你们有什么问题吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$在我们开始之前，你们有什么问题吗？$q$, updated_at = now() where learning_object_id = '5fa27455-704a-491e-bd3b-03cb089711c8' and native_language = 'zh' and example_translation is distinct from $q$在我们开始之前，你们有什么问题吗？$q$ and coalesce(example_translation, '') <> '';

-- 2395e2d8-dee9-4e58-873c-b5a0a4b5282e: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2395e2d8-dee9-4e58-873c-b5a0a4b5282e', 'learning_objects', 'example_zh', example_zh, $q$我们怎么去酒店？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '2395e2d8-dee9-4e58-873c-b5a0a4b5282e' and example_zh is distinct from $q$我们怎么去酒店？$q$ and true;
update public.learning_objects set example_zh = $q$我们怎么去酒店？$q$, updated_at = now() where id = '2395e2d8-dee9-4e58-873c-b5a0a4b5282e' and example_zh is distinct from $q$我们怎么去酒店？$q$ and true;

-- 2395e2d8-dee9-4e58-873c-b5a0a4b5282e: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2395e2d8-dee9-4e58-873c-b5a0a4b5282e', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我们怎么去酒店？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '2395e2d8-dee9-4e58-873c-b5a0a4b5282e' and native_language = 'zh' and example_translation is distinct from $q$我们怎么去酒店？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我们怎么去酒店？$q$, updated_at = now() where learning_object_id = '2395e2d8-dee9-4e58-873c-b5a0a4b5282e' and native_language = 'zh' and example_translation is distinct from $q$我们怎么去酒店？$q$ and coalesce(example_translation, '') <> '';

-- df9a4524-4dc6-4430-b577-411eba9de7e6: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'df9a4524-4dc6-4430-b577-411eba9de7e6', 'learning_objects', 'example_zh', example_zh, $q$第一节课后你就会说瑞典语了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'df9a4524-4dc6-4430-b577-411eba9de7e6' and example_zh is distinct from $q$第一节课后你就会说瑞典语了。$q$ and true;
update public.learning_objects set example_zh = $q$第一节课后你就会说瑞典语了。$q$, updated_at = now() where id = 'df9a4524-4dc6-4430-b577-411eba9de7e6' and example_zh is distinct from $q$第一节课后你就会说瑞典语了。$q$ and true;

-- df9a4524-4dc6-4430-b577-411eba9de7e6: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'df9a4524-4dc6-4430-b577-411eba9de7e6', 'learning_object_translations', 'zh.example_translation', example_translation, $q$第一节课后你就会说瑞典语了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'df9a4524-4dc6-4430-b577-411eba9de7e6' and native_language = 'zh' and example_translation is distinct from $q$第一节课后你就会说瑞典语了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$第一节课后你就会说瑞典语了。$q$, updated_at = now() where learning_object_id = 'df9a4524-4dc6-4430-b577-411eba9de7e6' and native_language = 'zh' and example_translation is distinct from $q$第一节课后你就会说瑞典语了。$q$ and coalesce(example_translation, '') <> '';

-- 26cf0e38-c1cb-4c4d-8110-e364079f5245: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '26cf0e38-c1cb-4c4d-8110-e364079f5245', 'learning_objects', 'example_zh', example_zh, $q$你能不能把窗户关上？这里有点冷。我只是想委婉地问一下。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '26cf0e38-c1cb-4c4d-8110-e364079f5245' and example_zh is distinct from $q$你能不能把窗户关上？这里有点冷。我只是想委婉地问一下。$q$ and true;
update public.learning_objects set example_zh = $q$你能不能把窗户关上？这里有点冷。我只是想委婉地问一下。$q$, updated_at = now() where id = '26cf0e38-c1cb-4c4d-8110-e364079f5245' and example_zh is distinct from $q$你能不能把窗户关上？这里有点冷。我只是想委婉地问一下。$q$ and true;

-- 26cf0e38-c1cb-4c4d-8110-e364079f5245: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '26cf0e38-c1cb-4c4d-8110-e364079f5245', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你能不能把窗户关上？这里有点冷。我只是想委婉地问一下。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '26cf0e38-c1cb-4c4d-8110-e364079f5245' and native_language = 'zh' and example_translation is distinct from $q$你能不能把窗户关上？这里有点冷。我只是想委婉地问一下。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你能不能把窗户关上？这里有点冷。我只是想委婉地问一下。$q$, updated_at = now() where learning_object_id = '26cf0e38-c1cb-4c4d-8110-e364079f5245' and native_language = 'zh' and example_translation is distinct from $q$你能不能把窗户关上？这里有点冷。我只是想委婉地问一下。$q$ and coalesce(example_translation, '') <> '';

-- cecb3030-308b-41bd-a2bc-7cc61617237b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'cecb3030-308b-41bd-a2bc-7cc61617237b', 'learning_objects', 'example_zh', example_zh, $q$嗨！你好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'cecb3030-308b-41bd-a2bc-7cc61617237b' and example_zh is distinct from $q$嗨！你好吗？$q$ and true;
update public.learning_objects set example_zh = $q$嗨！你好吗？$q$, updated_at = now() where id = 'cecb3030-308b-41bd-a2bc-7cc61617237b' and example_zh is distinct from $q$嗨！你好吗？$q$ and true;

-- cecb3030-308b-41bd-a2bc-7cc61617237b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'cecb3030-308b-41bd-a2bc-7cc61617237b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$嗨！你好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'cecb3030-308b-41bd-a2bc-7cc61617237b' and native_language = 'zh' and example_translation is distinct from $q$嗨！你好吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$嗨！你好吗？$q$, updated_at = now() where learning_object_id = 'cecb3030-308b-41bd-a2bc-7cc61617237b' and native_language = 'zh' and example_translation is distinct from $q$嗨！你好吗？$q$ and coalesce(example_translation, '') <> '';

-- 64f3026c-dad3-4aee-8931-b7163a9533b5: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '64f3026c-dad3-4aee-8931-b7163a9533b5', 'learning_objects', 'example_zh', example_zh, $q$跟我读：早上好。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '64f3026c-dad3-4aee-8931-b7163a9533b5' and example_zh is distinct from $q$跟我读：早上好。$q$ and true;
update public.learning_objects set example_zh = $q$跟我读：早上好。$q$, updated_at = now() where id = '64f3026c-dad3-4aee-8931-b7163a9533b5' and example_zh is distinct from $q$跟我读：早上好。$q$ and true;

-- 64f3026c-dad3-4aee-8931-b7163a9533b5: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '64f3026c-dad3-4aee-8931-b7163a9533b5', 'learning_object_translations', 'zh.example_translation', example_translation, $q$跟我读：早上好。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '64f3026c-dad3-4aee-8931-b7163a9533b5' and native_language = 'zh' and example_translation is distinct from $q$跟我读：早上好。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$跟我读：早上好。$q$, updated_at = now() where learning_object_id = '64f3026c-dad3-4aee-8931-b7163a9533b5' and native_language = 'zh' and example_translation is distinct from $q$跟我读：早上好。$q$ and coalesce(example_translation, '') <> '';

-- 58b259e7-db3a-42b5-b778-25ccef9a6bcb: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '58b259e7-db3a-42b5-b778-25ccef9a6bcb', 'learning_objects', 'example_zh', example_zh, $q$我们坐火车，不坐汽车。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '58b259e7-db3a-42b5-b778-25ccef9a6bcb' and example_zh is distinct from $q$我们坐火车，不坐汽车。$q$ and true;
update public.learning_objects set example_zh = $q$我们坐火车，不坐汽车。$q$, updated_at = now() where id = '58b259e7-db3a-42b5-b778-25ccef9a6bcb' and example_zh is distinct from $q$我们坐火车，不坐汽车。$q$ and true;

-- 58b259e7-db3a-42b5-b778-25ccef9a6bcb: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '58b259e7-db3a-42b5-b778-25ccef9a6bcb', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我们坐火车，不坐汽车。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '58b259e7-db3a-42b5-b778-25ccef9a6bcb' and native_language = 'zh' and example_translation is distinct from $q$我们坐火车，不坐汽车。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我们坐火车，不坐汽车。$q$, updated_at = now() where learning_object_id = '58b259e7-db3a-42b5-b778-25ccef9a6bcb' and native_language = 'zh' and example_translation is distinct from $q$我们坐火车，不坐汽车。$q$ and coalesce(example_translation, '') <> '';

-- b8064c10-5d9d-4045-b9d6-c472ac1ff6b0: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b8064c10-5d9d-4045-b9d6-c472ac1ff6b0', 'learning_objects', 'example_zh', example_zh, $q$我有点跟不上，我们能再过一遍吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b8064c10-5d9d-4045-b9d6-c472ac1ff6b0' and example_zh is distinct from $q$我有点跟不上，我们能再过一遍吗？$q$ and true;
update public.learning_objects set example_zh = $q$我有点跟不上，我们能再过一遍吗？$q$, updated_at = now() where id = 'b8064c10-5d9d-4045-b9d6-c472ac1ff6b0' and example_zh is distinct from $q$我有点跟不上，我们能再过一遍吗？$q$ and true;

-- b8064c10-5d9d-4045-b9d6-c472ac1ff6b0: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b8064c10-5d9d-4045-b9d6-c472ac1ff6b0', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我有点跟不上，我们能再过一遍吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b8064c10-5d9d-4045-b9d6-c472ac1ff6b0' and native_language = 'zh' and example_translation is distinct from $q$我有点跟不上，我们能再过一遍吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我有点跟不上，我们能再过一遍吗？$q$, updated_at = now() where learning_object_id = 'b8064c10-5d9d-4045-b9d6-c472ac1ff6b0' and native_language = 'zh' and example_translation is distinct from $q$我有点跟不上，我们能再过一遍吗？$q$ and coalesce(example_translation, '') <> '';

-- c687cb66-d657-473c-acaa-dc3d973d193a: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c687cb66-d657-473c-acaa-dc3d973d193a', 'learning_objects', 'example_zh', example_zh, $q$我说这么快，你跟得上吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c687cb66-d657-473c-acaa-dc3d973d193a' and example_zh is distinct from $q$我说这么快，你跟得上吗？$q$ and true;
update public.learning_objects set example_zh = $q$我说这么快，你跟得上吗？$q$, updated_at = now() where id = 'c687cb66-d657-473c-acaa-dc3d973d193a' and example_zh is distinct from $q$我说这么快，你跟得上吗？$q$ and true;

-- c687cb66-d657-473c-acaa-dc3d973d193a: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c687cb66-d657-473c-acaa-dc3d973d193a', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我说这么快，你跟得上吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c687cb66-d657-473c-acaa-dc3d973d193a' and native_language = 'zh' and example_translation is distinct from $q$我说这么快，你跟得上吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我说这么快，你跟得上吗？$q$, updated_at = now() where learning_object_id = 'c687cb66-d657-473c-acaa-dc3d973d193a' and native_language = 'zh' and example_translation is distinct from $q$我说这么快，你跟得上吗？$q$ and coalesce(example_translation, '') <> '';

-- af7a7a33-adb7-432a-b0bf-9d71d715acb2: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'af7a7a33-adb7-432a-b0bf-9d71d715acb2', 'learning_objects', 'example_zh', example_zh, $q$早上好！你睡得好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'af7a7a33-adb7-432a-b0bf-9d71d715acb2' and example_zh is distinct from $q$早上好！你睡得好吗？$q$ and true;
update public.learning_objects set example_zh = $q$早上好！你睡得好吗？$q$, updated_at = now() where id = 'af7a7a33-adb7-432a-b0bf-9d71d715acb2' and example_zh is distinct from $q$早上好！你睡得好吗？$q$ and true;

-- af7a7a33-adb7-432a-b0bf-9d71d715acb2: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'af7a7a33-adb7-432a-b0bf-9d71d715acb2', 'learning_object_translations', 'zh.example_translation', example_translation, $q$早上好！你睡得好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'af7a7a33-adb7-432a-b0bf-9d71d715acb2' and native_language = 'zh' and example_translation is distinct from $q$早上好！你睡得好吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$早上好！你睡得好吗？$q$, updated_at = now() where learning_object_id = 'af7a7a33-adb7-432a-b0bf-9d71d715acb2' and native_language = 'zh' and example_translation is distinct from $q$早上好！你睡得好吗？$q$ and coalesce(example_translation, '') <> '';

-- ef782149-821b-4edd-b9f2-9bf3fbdb2dd5: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'ef782149-821b-4edd-b9f2-9bf3fbdb2dd5', 'learning_objects', 'example_zh', example_zh, $q$打扰一下，教室在哪里？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'ef782149-821b-4edd-b9f2-9bf3fbdb2dd5' and example_zh is distinct from $q$打扰一下，教室在哪里？$q$ and true;
update public.learning_objects set example_zh = $q$打扰一下，教室在哪里？$q$, updated_at = now() where id = 'ef782149-821b-4edd-b9f2-9bf3fbdb2dd5' and example_zh is distinct from $q$打扰一下，教室在哪里？$q$ and true;

-- ef782149-821b-4edd-b9f2-9bf3fbdb2dd5: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'ef782149-821b-4edd-b9f2-9bf3fbdb2dd5', 'learning_object_translations', 'zh.example_translation', example_translation, $q$打扰一下，教室在哪里？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'ef782149-821b-4edd-b9f2-9bf3fbdb2dd5' and native_language = 'zh' and example_translation is distinct from $q$打扰一下，教室在哪里？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$打扰一下，教室在哪里？$q$, updated_at = now() where learning_object_id = 'ef782149-821b-4edd-b9f2-9bf3fbdb2dd5' and native_language = 'zh' and example_translation is distinct from $q$打扰一下，教室在哪里？$q$ and coalesce(example_translation, '') <> '';

-- c9fb0cf5-752b-42a9-81be-5b88702c134c: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c9fb0cf5-752b-42a9-81be-5b88702c134c', 'learning_objects', 'example_zh', example_zh, $q$不太好，我感冒了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c9fb0cf5-752b-42a9-81be-5b88702c134c' and example_zh is distinct from $q$不太好，我感冒了。$q$ and true;
update public.learning_objects set example_zh = $q$不太好，我感冒了。$q$, updated_at = now() where id = 'c9fb0cf5-752b-42a9-81be-5b88702c134c' and example_zh is distinct from $q$不太好，我感冒了。$q$ and true;

-- c9fb0cf5-752b-42a9-81be-5b88702c134c: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c9fb0cf5-752b-42a9-81be-5b88702c134c', 'learning_object_translations', 'zh.example_translation', example_translation, $q$不太好，我感冒了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c9fb0cf5-752b-42a9-81be-5b88702c134c' and native_language = 'zh' and example_translation is distinct from $q$不太好，我感冒了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$不太好，我感冒了。$q$, updated_at = now() where learning_object_id = 'c9fb0cf5-752b-42a9-81be-5b88702c134c' and native_language = 'zh' and example_translation is distinct from $q$不太好，我感冒了。$q$ and coalesce(example_translation, '') <> '';

-- 8a8e0afd-100f-43c7-bead-e8d6cd32f5e4: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8a8e0afd-100f-43c7-bead-e8d6cd32f5e4', 'learning_objects', 'example_zh', example_zh, $q$嗨！最近怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '8a8e0afd-100f-43c7-bead-e8d6cd32f5e4' and example_zh is distinct from $q$嗨！最近怎么样？$q$ and true;
update public.learning_objects set example_zh = $q$嗨！最近怎么样？$q$, updated_at = now() where id = '8a8e0afd-100f-43c7-bead-e8d6cd32f5e4' and example_zh is distinct from $q$嗨！最近怎么样？$q$ and true;

-- 8a8e0afd-100f-43c7-bead-e8d6cd32f5e4: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '8a8e0afd-100f-43c7-bead-e8d6cd32f5e4', 'learning_object_translations', 'zh.example_translation', example_translation, $q$嗨！最近怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '8a8e0afd-100f-43c7-bead-e8d6cd32f5e4' and native_language = 'zh' and example_translation is distinct from $q$嗨！最近怎么样？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$嗨！最近怎么样？$q$, updated_at = now() where learning_object_id = '8a8e0afd-100f-43c7-bead-e8d6cd32f5e4' and native_language = 'zh' and example_translation is distinct from $q$嗨！最近怎么样？$q$ and coalesce(example_translation, '') <> '';

-- 75f924ed-a09a-463c-8434-04cca3a18009: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '75f924ed-a09a-463c-8434-04cca3a18009', 'learning_objects', 'example_zh', example_zh, $q$嗯，还可以，不过我累了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '75f924ed-a09a-463c-8434-04cca3a18009' and example_zh is distinct from $q$嗯，还可以，不过我累了。$q$ and true;
update public.learning_objects set example_zh = $q$嗯，还可以，不过我累了。$q$, updated_at = now() where id = '75f924ed-a09a-463c-8434-04cca3a18009' and example_zh is distinct from $q$嗯，还可以，不过我累了。$q$ and true;

-- 75f924ed-a09a-463c-8434-04cca3a18009: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '75f924ed-a09a-463c-8434-04cca3a18009', 'learning_object_translations', 'zh.example_translation', example_translation, $q$嗯，还可以，不过我累了。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '75f924ed-a09a-463c-8434-04cca3a18009' and native_language = 'zh' and example_translation is distinct from $q$嗯，还可以，不过我累了。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$嗯，还可以，不过我累了。$q$, updated_at = now() where learning_object_id = '75f924ed-a09a-463c-8434-04cca3a18009' and native_language = 'zh' and example_translation is distinct from $q$嗯，还可以，不过我累了。$q$ and coalesce(example_translation, '') <> '';

-- 7a67813f-c56e-4ce7-8b65-d00f30020b83: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7a67813f-c56e-4ce7-8b65-d00f30020b83', 'learning_objects', 'example_zh', example_zh, $q$嗨！你好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '7a67813f-c56e-4ce7-8b65-d00f30020b83' and example_zh is distinct from $q$嗨！你好吗？$q$ and true;
update public.learning_objects set example_zh = $q$嗨！你好吗？$q$, updated_at = now() where id = '7a67813f-c56e-4ce7-8b65-d00f30020b83' and example_zh is distinct from $q$嗨！你好吗？$q$ and true;

-- 7a67813f-c56e-4ce7-8b65-d00f30020b83: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7a67813f-c56e-4ce7-8b65-d00f30020b83', 'learning_object_translations', 'zh.example_translation', example_translation, $q$嗨！你好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '7a67813f-c56e-4ce7-8b65-d00f30020b83' and native_language = 'zh' and example_translation is distinct from $q$嗨！你好吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$嗨！你好吗？$q$, updated_at = now() where learning_object_id = '7a67813f-c56e-4ce7-8b65-d00f30020b83' and native_language = 'zh' and example_translation is distinct from $q$嗨！你好吗？$q$ and coalesce(example_translation, '') <> '';

-- 28e0cf62-d8ce-4f93-9ca1-ea2f8d37c0f2: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '28e0cf62-d8ce-4f93-9ca1-ea2f8d37c0f2', 'learning_objects', 'example_zh', example_zh, $q$作业进展怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '28e0cf62-d8ce-4f93-9ca1-ea2f8d37c0f2' and example_zh is distinct from $q$作业进展怎么样？$q$ and true;
update public.learning_objects set example_zh = $q$作业进展怎么样？$q$, updated_at = now() where id = '28e0cf62-d8ce-4f93-9ca1-ea2f8d37c0f2' and example_zh is distinct from $q$作业进展怎么样？$q$ and true;

-- 28e0cf62-d8ce-4f93-9ca1-ea2f8d37c0f2: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '28e0cf62-d8ce-4f93-9ca1-ea2f8d37c0f2', 'learning_object_translations', 'zh.example_translation', example_translation, $q$作业进展怎么样？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '28e0cf62-d8ce-4f93-9ca1-ea2f8d37c0f2' and native_language = 'zh' and example_translation is distinct from $q$作业进展怎么样？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$作业进展怎么样？$q$, updated_at = now() where learning_object_id = '28e0cf62-d8ce-4f93-9ca1-ea2f8d37c0f2' and native_language = 'zh' and example_translation is distinct from $q$作业进展怎么样？$q$ and coalesce(example_translation, '') <> '';

-- 9d844d32-0b55-4386-bd5d-e46b0eb75f27: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9d844d32-0b55-4386-bd5d-e46b0eb75f27', 'learning_objects', 'example_zh', example_zh, $q$瑞典语学得很顺利。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '9d844d32-0b55-4386-bd5d-e46b0eb75f27' and example_zh is distinct from $q$瑞典语学得很顺利。$q$ and true;
update public.learning_objects set example_zh = $q$瑞典语学得很顺利。$q$, updated_at = now() where id = '9d844d32-0b55-4386-bd5d-e46b0eb75f27' and example_zh is distinct from $q$瑞典语学得很顺利。$q$ and true;

-- 9d844d32-0b55-4386-bd5d-e46b0eb75f27: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '9d844d32-0b55-4386-bd5d-e46b0eb75f27', 'learning_object_translations', 'zh.example_translation', example_translation, $q$瑞典语学得很顺利。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '9d844d32-0b55-4386-bd5d-e46b0eb75f27' and native_language = 'zh' and example_translation is distinct from $q$瑞典语学得很顺利。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$瑞典语学得很顺利。$q$, updated_at = now() where learning_object_id = '9d844d32-0b55-4386-bd5d-e46b0eb75f27' and native_language = 'zh' and example_translation is distinct from $q$瑞典语学得很顺利。$q$ and coalesce(example_translation, '') <> '';

-- 6ffd2c6c-26cb-41bc-9487-1bdbbff122a1: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6ffd2c6c-26cb-41bc-9487-1bdbbff122a1', 'learning_objects', 'example_zh', example_zh, $q$对了，我们明天有作业。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '6ffd2c6c-26cb-41bc-9487-1bdbbff122a1' and example_zh is distinct from $q$对了，我们明天有作业。$q$ and true;
update public.learning_objects set example_zh = $q$对了，我们明天有作业。$q$, updated_at = now() where id = '6ffd2c6c-26cb-41bc-9487-1bdbbff122a1' and example_zh is distinct from $q$对了，我们明天有作业。$q$ and true;

-- 6ffd2c6c-26cb-41bc-9487-1bdbbff122a1: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6ffd2c6c-26cb-41bc-9487-1bdbbff122a1', 'learning_object_translations', 'zh.example_translation', example_translation, $q$对了，我们明天有作业。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '6ffd2c6c-26cb-41bc-9487-1bdbbff122a1' and native_language = 'zh' and example_translation is distinct from $q$对了，我们明天有作业。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$对了，我们明天有作业。$q$, updated_at = now() where learning_object_id = '6ffd2c6c-26cb-41bc-9487-1bdbbff122a1' and native_language = 'zh' and example_translation is distinct from $q$对了，我们明天有作业。$q$ and coalesce(example_translation, '') <> '';

-- 7bc06717-c398-4811-b775-17ec344ab625: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7bc06717-c398-4811-b775-17ec344ab625', 'learning_objects', 'example_zh', example_zh, $q$谢谢你的帮助！不客气。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '7bc06717-c398-4811-b775-17ec344ab625' and example_zh is distinct from $q$谢谢你的帮助！不客气。$q$ and true;
update public.learning_objects set example_zh = $q$谢谢你的帮助！不客气。$q$, updated_at = now() where id = '7bc06717-c398-4811-b775-17ec344ab625' and example_zh is distinct from $q$谢谢你的帮助！不客气。$q$ and true;

-- 7bc06717-c398-4811-b775-17ec344ab625: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7bc06717-c398-4811-b775-17ec344ab625', 'learning_object_translations', 'zh.example_translation', example_translation, $q$谢谢你的帮助！不客气。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '7bc06717-c398-4811-b775-17ec344ab625' and native_language = 'zh' and example_translation is distinct from $q$谢谢你的帮助！不客气。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$谢谢你的帮助！不客气。$q$, updated_at = now() where learning_object_id = '7bc06717-c398-4811-b775-17ec344ab625' and native_language = 'zh' and example_translation is distinct from $q$谢谢你的帮助！不客气。$q$ and coalesce(example_translation, '') <> '';

-- ddd021e8-aa9c-460e-a6cd-6675ee4467e4: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'ddd021e8-aa9c-460e-a6cd-6675ee4467e4', 'learning_objects', 'example_zh', example_zh, $q$祝你今天愉快！你也一样！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'ddd021e8-aa9c-460e-a6cd-6675ee4467e4' and example_zh is distinct from $q$祝你今天愉快！你也一样！$q$ and true;
update public.learning_objects set example_zh = $q$祝你今天愉快！你也一样！$q$, updated_at = now() where id = 'ddd021e8-aa9c-460e-a6cd-6675ee4467e4' and example_zh is distinct from $q$祝你今天愉快！你也一样！$q$ and true;

-- ddd021e8-aa9c-460e-a6cd-6675ee4467e4: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'ddd021e8-aa9c-460e-a6cd-6675ee4467e4', 'learning_object_translations', 'zh.example_translation', example_translation, $q$祝你今天愉快！你也一样！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'ddd021e8-aa9c-460e-a6cd-6675ee4467e4' and native_language = 'zh' and example_translation is distinct from $q$祝你今天愉快！你也一样！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$祝你今天愉快！你也一样！$q$, updated_at = now() where learning_object_id = 'ddd021e8-aa9c-460e-a6cd-6675ee4467e4' and native_language = 'zh' and example_translation is distinct from $q$祝你今天愉快！你也一样！$q$ and coalesce(example_translation, '') <> '';

-- 3113911e-fae1-4f8c-9028-b54a7566a7a5: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3113911e-fae1-4f8c-9028-b54a7566a7a5', 'learning_objects', 'example_zh', example_zh, $q$你是哪一年出生的？我出生于1995年。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '3113911e-fae1-4f8c-9028-b54a7566a7a5' and example_zh is distinct from $q$你是哪一年出生的？我出生于1995年。$q$ and true;
update public.learning_objects set example_zh = $q$你是哪一年出生的？我出生于1995年。$q$, updated_at = now() where id = '3113911e-fae1-4f8c-9028-b54a7566a7a5' and example_zh is distinct from $q$你是哪一年出生的？我出生于1995年。$q$ and true;

-- 3113911e-fae1-4f8c-9028-b54a7566a7a5: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3113911e-fae1-4f8c-9028-b54a7566a7a5', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你是哪一年出生的？我出生于1995年。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '3113911e-fae1-4f8c-9028-b54a7566a7a5' and native_language = 'zh' and example_translation is distinct from $q$你是哪一年出生的？我出生于1995年。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你是哪一年出生的？我出生于1995年。$q$, updated_at = now() where learning_object_id = '3113911e-fae1-4f8c-9028-b54a7566a7a5' and native_language = 'zh' and example_translation is distinct from $q$你是哪一年出生的？我出生于1995年。$q$ and coalesce(example_translation, '') <> '';

-- 5ca95673-1901-42c7-bd2c-83653d67cd04: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5ca95673-1901-42c7-bd2c-83653d67cd04', 'learning_objects', 'example_zh', example_zh, $q$好吃！这个肉桂面包真好吃。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '5ca95673-1901-42c7-bd2c-83653d67cd04' and example_zh is distinct from $q$好吃！这个肉桂面包真好吃。$q$ and true;
update public.learning_objects set example_zh = $q$好吃！这个肉桂面包真好吃。$q$, updated_at = now() where id = '5ca95673-1901-42c7-bd2c-83653d67cd04' and example_zh is distinct from $q$好吃！这个肉桂面包真好吃。$q$ and true;

-- 5ca95673-1901-42c7-bd2c-83653d67cd04: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '5ca95673-1901-42c7-bd2c-83653d67cd04', 'learning_object_translations', 'zh.example_translation', example_translation, $q$好吃！这个肉桂面包真好吃。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '5ca95673-1901-42c7-bd2c-83653d67cd04' and native_language = 'zh' and example_translation is distinct from $q$好吃！这个肉桂面包真好吃。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$好吃！这个肉桂面包真好吃。$q$, updated_at = now() where learning_object_id = '5ca95673-1901-42c7-bd2c-83653d67cd04' and native_language = 'zh' and example_translation is distinct from $q$好吃！这个肉桂面包真好吃。$q$ and coalesce(example_translation, '') <> '';

-- 50531d25-150a-4dc9-b054-6a2718c3f677: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '50531d25-150a-4dc9-b054-6a2718c3f677', 'learning_objects', 'example_zh', example_zh, $q$请给我来一杯咖啡，好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '50531d25-150a-4dc9-b054-6a2718c3f677' and example_zh is distinct from $q$请给我来一杯咖啡，好吗？$q$ and true;
update public.learning_objects set example_zh = $q$请给我来一杯咖啡，好吗？$q$, updated_at = now() where id = '50531d25-150a-4dc9-b054-6a2718c3f677' and example_zh is distinct from $q$请给我来一杯咖啡，好吗？$q$ and true;

-- 50531d25-150a-4dc9-b054-6a2718c3f677: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '50531d25-150a-4dc9-b054-6a2718c3f677', 'learning_object_translations', 'zh.example_translation', example_translation, $q$请给我来一杯咖啡，好吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '50531d25-150a-4dc9-b054-6a2718c3f677' and native_language = 'zh' and example_translation is distinct from $q$请给我来一杯咖啡，好吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$请给我来一杯咖啡，好吗？$q$, updated_at = now() where learning_object_id = '50531d25-150a-4dc9-b054-6a2718c3f677' and native_language = 'zh' and example_translation is distinct from $q$请给我来一杯咖啡，好吗？$q$ and coalesce(example_translation, '') <> '';

-- 6c920f41-0dd5-455a-964a-271f093f8423: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6c920f41-0dd5-455a-964a-271f093f8423', 'learning_objects', 'example_zh', example_zh, $q$你要收据吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '6c920f41-0dd5-455a-964a-271f093f8423' and example_zh is distinct from $q$你要收据吗？$q$ and true;
update public.learning_objects set example_zh = $q$你要收据吗？$q$, updated_at = now() where id = '6c920f41-0dd5-455a-964a-271f093f8423' and example_zh is distinct from $q$你要收据吗？$q$ and true;

-- 6c920f41-0dd5-455a-964a-271f093f8423: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6c920f41-0dd5-455a-964a-271f093f8423', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你要收据吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '6c920f41-0dd5-455a-964a-271f093f8423' and native_language = 'zh' and example_translation is distinct from $q$你要收据吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你要收据吗？$q$, updated_at = now() where learning_object_id = '6c920f41-0dd5-455a-964a-271f093f8423' and native_language = 'zh' and example_translation is distinct from $q$你要收据吗？$q$ and coalesce(example_translation, '') <> '';

-- 7aeb0e1c-9f85-44b0-ac6d-3e3dc6dd7746: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7aeb0e1c-9f85-44b0-ac6d-3e3dc6dd7746', 'learning_objects', 'example_zh', example_zh, $q$你还要别的吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '7aeb0e1c-9f85-44b0-ac6d-3e3dc6dd7746' and example_zh is distinct from $q$你还要别的吗？$q$ and true;
update public.learning_objects set example_zh = $q$你还要别的吗？$q$, updated_at = now() where id = '7aeb0e1c-9f85-44b0-ac6d-3e3dc6dd7746' and example_zh is distinct from $q$你还要别的吗？$q$ and true;

-- 7aeb0e1c-9f85-44b0-ac6d-3e3dc6dd7746: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '7aeb0e1c-9f85-44b0-ac6d-3e3dc6dd7746', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你还要别的吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '7aeb0e1c-9f85-44b0-ac6d-3e3dc6dd7746' and native_language = 'zh' and example_translation is distinct from $q$你还要别的吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你还要别的吗？$q$, updated_at = now() where learning_object_id = '7aeb0e1c-9f85-44b0-ac6d-3e3dc6dd7746' and native_language = 'zh' and example_translation is distinct from $q$你还要别的吗？$q$ and coalesce(example_translation, '') <> '';

-- f06e89ec-c517-4902-9e47-f68d32f6263b: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f06e89ec-c517-4902-9e47-f68d32f6263b', 'learning_objects', 'example_zh', example_zh, $q$这么低的工资，你怎么过得下去？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'f06e89ec-c517-4902-9e47-f68d32f6263b' and example_zh is distinct from $q$这么低的工资，你怎么过得下去？$q$ and true;
update public.learning_objects set example_zh = $q$这么低的工资，你怎么过得下去？$q$, updated_at = now() where id = 'f06e89ec-c517-4902-9e47-f68d32f6263b' and example_zh is distinct from $q$这么低的工资，你怎么过得下去？$q$ and true;

-- f06e89ec-c517-4902-9e47-f68d32f6263b: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'f06e89ec-c517-4902-9e47-f68d32f6263b', 'learning_object_translations', 'zh.example_translation', example_translation, $q$这么低的工资，你怎么过得下去？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'f06e89ec-c517-4902-9e47-f68d32f6263b' and native_language = 'zh' and example_translation is distinct from $q$这么低的工资，你怎么过得下去？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$这么低的工资，你怎么过得下去？$q$, updated_at = now() where learning_object_id = 'f06e89ec-c517-4902-9e47-f68d32f6263b' and native_language = 'zh' and example_translation is distinct from $q$这么低的工资，你怎么过得下去？$q$ and coalesce(example_translation, '') <> '';

-- ef1cce3e-7d69-4f8b-8e4e-aa286357e435: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'ef1cce3e-7d69-4f8b-8e4e-aa286357e435', 'learning_objects', 'example_zh', example_zh, $q$你们那辆旧车卖了多少钱？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'ef1cce3e-7d69-4f8b-8e4e-aa286357e435' and example_zh is distinct from $q$你们那辆旧车卖了多少钱？$q$ and true;
update public.learning_objects set example_zh = $q$你们那辆旧车卖了多少钱？$q$, updated_at = now() where id = 'ef1cce3e-7d69-4f8b-8e4e-aa286357e435' and example_zh is distinct from $q$你们那辆旧车卖了多少钱？$q$ and true;

-- ef1cce3e-7d69-4f8b-8e4e-aa286357e435: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'ef1cce3e-7d69-4f8b-8e4e-aa286357e435', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你们那辆旧车卖了多少钱？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'ef1cce3e-7d69-4f8b-8e4e-aa286357e435' and native_language = 'zh' and example_translation is distinct from $q$你们那辆旧车卖了多少钱？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你们那辆旧车卖了多少钱？$q$, updated_at = now() where learning_object_id = 'ef1cce3e-7d69-4f8b-8e4e-aa286357e435' and native_language = 'zh' and example_translation is distinct from $q$你们那辆旧车卖了多少钱？$q$ and coalesce(example_translation, '') <> '';

-- fe96ff07-c600-422e-a3a5-f0696ced9d46: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fe96ff07-c600-422e-a3a5-f0696ced9d46', 'learning_objects', 'example_zh', example_zh, $q$过去一年价格涨了很多。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'fe96ff07-c600-422e-a3a5-f0696ced9d46' and example_zh is distinct from $q$过去一年价格涨了很多。$q$ and true;
update public.learning_objects set example_zh = $q$过去一年价格涨了很多。$q$, updated_at = now() where id = 'fe96ff07-c600-422e-a3a5-f0696ced9d46' and example_zh is distinct from $q$过去一年价格涨了很多。$q$ and true;

-- fe96ff07-c600-422e-a3a5-f0696ced9d46: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'fe96ff07-c600-422e-a3a5-f0696ced9d46', 'learning_object_translations', 'zh.example_translation', example_translation, $q$过去一年价格涨了很多。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'fe96ff07-c600-422e-a3a5-f0696ced9d46' and native_language = 'zh' and example_translation is distinct from $q$过去一年价格涨了很多。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$过去一年价格涨了很多。$q$, updated_at = now() where learning_object_id = 'fe96ff07-c600-422e-a3a5-f0696ced9d46' and native_language = 'zh' and example_translation is distinct from $q$过去一年价格涨了很多。$q$ and coalesce(example_translation, '') <> '';

-- 6be368bf-b8f7-4ba0-838d-dd04335e990c: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6be368bf-b8f7-4ba0-838d-dd04335e990c', 'learning_objects', 'example_zh', example_zh, $q$非常感谢你的帮助！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '6be368bf-b8f7-4ba0-838d-dd04335e990c' and example_zh is distinct from $q$非常感谢你的帮助！$q$ and true;
update public.learning_objects set example_zh = $q$非常感谢你的帮助！$q$, updated_at = now() where id = '6be368bf-b8f7-4ba0-838d-dd04335e990c' and example_zh is distinct from $q$非常感谢你的帮助！$q$ and true;

-- 6be368bf-b8f7-4ba0-838d-dd04335e990c: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '6be368bf-b8f7-4ba0-838d-dd04335e990c', 'learning_object_translations', 'zh.example_translation', example_translation, $q$非常感谢你的帮助！$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '6be368bf-b8f7-4ba0-838d-dd04335e990c' and native_language = 'zh' and example_translation is distinct from $q$非常感谢你的帮助！$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$非常感谢你的帮助！$q$, updated_at = now() where learning_object_id = '6be368bf-b8f7-4ba0-838d-dd04335e990c' and native_language = 'zh' and example_translation is distinct from $q$非常感谢你的帮助！$q$ and coalesce(example_translation, '') <> '';

-- 111a1847-6de4-4d6a-9e07-edbf466ebf18: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '111a1847-6de4-4d6a-9e07-edbf466ebf18', 'learning_objects', 'example_zh', example_zh, $q$你多保重，我们很快再联系。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '111a1847-6de4-4d6a-9e07-edbf466ebf18' and example_zh is distinct from $q$你多保重，我们很快再联系。$q$ and true;
update public.learning_objects set example_zh = $q$你多保重，我们很快再联系。$q$, updated_at = now() where id = '111a1847-6de4-4d6a-9e07-edbf466ebf18' and example_zh is distinct from $q$你多保重，我们很快再联系。$q$ and true;

-- 111a1847-6de4-4d6a-9e07-edbf466ebf18: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '111a1847-6de4-4d6a-9e07-edbf466ebf18', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你多保重，我们很快再联系。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '111a1847-6de4-4d6a-9e07-edbf466ebf18' and native_language = 'zh' and example_translation is distinct from $q$你多保重，我们很快再联系。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你多保重，我们很快再联系。$q$, updated_at = now() where learning_object_id = '111a1847-6de4-4d6a-9e07-edbf466ebf18' and native_language = 'zh' and example_translation is distinct from $q$你多保重，我们很快再联系。$q$ and coalesce(example_translation, '') <> '';

-- 364efdfd-476c-4cab-959a-0e9a8b978bbe: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '364efdfd-476c-4cab-959a-0e9a8b978bbe', 'learning_objects', 'example_zh', example_zh, $q$我每天都想你。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '364efdfd-476c-4cab-959a-0e9a8b978bbe' and example_zh is distinct from $q$我每天都想你。$q$ and true;
update public.learning_objects set example_zh = $q$我每天都想你。$q$, updated_at = now() where id = '364efdfd-476c-4cab-959a-0e9a8b978bbe' and example_zh is distinct from $q$我每天都想你。$q$ and true;

-- 364efdfd-476c-4cab-959a-0e9a8b978bbe: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '364efdfd-476c-4cab-959a-0e9a8b978bbe', 'learning_object_translations', 'zh.example_translation', example_translation, $q$我每天都想你。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '364efdfd-476c-4cab-959a-0e9a8b978bbe' and native_language = 'zh' and example_translation is distinct from $q$我每天都想你。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$我每天都想你。$q$, updated_at = now() where learning_object_id = '364efdfd-476c-4cab-959a-0e9a8b978bbe' and native_language = 'zh' and example_translation is distinct from $q$我每天都想你。$q$ and coalesce(example_translation, '') <> '';

-- 364efdfd-476c-4cab-959a-0e9a8b978bbe: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '364efdfd-476c-4cab-959a-0e9a8b978bbe', 'learning_object_translations', 'en.example_translation', example_translation, $q$I miss you every day.$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '364efdfd-476c-4cab-959a-0e9a8b978bbe' and native_language = 'en' and example_translation is distinct from $q$I miss you every day.$q$ and true;
update public.learning_object_translations set example_translation = $q$I miss you every day.$q$, updated_at = now() where learning_object_id = '364efdfd-476c-4cab-959a-0e9a8b978bbe' and native_language = 'en' and example_translation is distinct from $q$I miss you every day.$q$ and true;

-- 2a7b7176-5e48-48f5-9f5b-8ebb3348c335: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2a7b7176-5e48-48f5-9f5b-8ebb3348c335', 'learning_objects', 'example_zh', example_zh, $q$太好了！那我们七点见。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '2a7b7176-5e48-48f5-9f5b-8ebb3348c335' and example_zh is distinct from $q$太好了！那我们七点见。$q$ and true;
update public.learning_objects set example_zh = $q$太好了！那我们七点见。$q$, updated_at = now() where id = '2a7b7176-5e48-48f5-9f5b-8ebb3348c335' and example_zh is distinct from $q$太好了！那我们七点见。$q$ and true;

-- 2a7b7176-5e48-48f5-9f5b-8ebb3348c335: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '2a7b7176-5e48-48f5-9f5b-8ebb3348c335', 'learning_object_translations', 'zh.example_translation', example_translation, $q$太好了！那我们七点见。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '2a7b7176-5e48-48f5-9f5b-8ebb3348c335' and native_language = 'zh' and example_translation is distinct from $q$太好了！那我们七点见。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$太好了！那我们七点见。$q$, updated_at = now() where learning_object_id = '2a7b7176-5e48-48f5-9f5b-8ebb3348c335' and native_language = 'zh' and example_translation is distinct from $q$太好了！那我们七点见。$q$ and coalesce(example_translation, '') <> '';

-- 95f8e325-1be4-49d2-b1bf-bd9cc0929d78: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '95f8e325-1be4-49d2-b1bf-bd9cc0929d78', 'learning_objects', 'example_zh', example_zh, $q$你喜欢什么类型的电影？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '95f8e325-1be4-49d2-b1bf-bd9cc0929d78' and example_zh is distinct from $q$你喜欢什么类型的电影？$q$ and true;
update public.learning_objects set example_zh = $q$你喜欢什么类型的电影？$q$, updated_at = now() where id = '95f8e325-1be4-49d2-b1bf-bd9cc0929d78' and example_zh is distinct from $q$你喜欢什么类型的电影？$q$ and true;

-- 95f8e325-1be4-49d2-b1bf-bd9cc0929d78: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '95f8e325-1be4-49d2-b1bf-bd9cc0929d78', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你喜欢什么类型的电影？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '95f8e325-1be4-49d2-b1bf-bd9cc0929d78' and native_language = 'zh' and example_translation is distinct from $q$你喜欢什么类型的电影？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你喜欢什么类型的电影？$q$, updated_at = now() where learning_object_id = '95f8e325-1be4-49d2-b1bf-bd9cc0929d78' and native_language = 'zh' and example_translation is distinct from $q$你喜欢什么类型的电影？$q$ and coalesce(example_translation, '') <> '';

-- 28a9ee06-71e9-43fb-8a7f-63a32d95f344: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '28a9ee06-71e9-43fb-8a7f-63a32d95f344', 'learning_objects', 'example_zh', example_zh, $q$如果你需要尺寸方面的帮助，就告诉我。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '28a9ee06-71e9-43fb-8a7f-63a32d95f344' and example_zh is distinct from $q$如果你需要尺寸方面的帮助，就告诉我。$q$ and true;
update public.learning_objects set example_zh = $q$如果你需要尺寸方面的帮助，就告诉我。$q$, updated_at = now() where id = '28a9ee06-71e9-43fb-8a7f-63a32d95f344' and example_zh is distinct from $q$如果你需要尺寸方面的帮助，就告诉我。$q$ and true;

-- 28a9ee06-71e9-43fb-8a7f-63a32d95f344: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '28a9ee06-71e9-43fb-8a7f-63a32d95f344', 'learning_object_translations', 'zh.example_translation', example_translation, $q$如果你需要尺寸方面的帮助，就告诉我。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '28a9ee06-71e9-43fb-8a7f-63a32d95f344' and native_language = 'zh' and example_translation is distinct from $q$如果你需要尺寸方面的帮助，就告诉我。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$如果你需要尺寸方面的帮助，就告诉我。$q$, updated_at = now() where learning_object_id = '28a9ee06-71e9-43fb-8a7f-63a32d95f344' and native_language = 'zh' and example_translation is distinct from $q$如果你需要尺寸方面的帮助，就告诉我。$q$ and coalesce(example_translation, '') <> '';

-- 3576b68b-9f30-4105-8410-1848764f8398: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3576b68b-9f30-4105-8410-1848764f8398', 'learning_objects', 'example_zh', example_zh, $q$这一点我同意你。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '3576b68b-9f30-4105-8410-1848764f8398' and example_zh is distinct from $q$这一点我同意你。$q$ and true;
update public.learning_objects set example_zh = $q$这一点我同意你。$q$, updated_at = now() where id = '3576b68b-9f30-4105-8410-1848764f8398' and example_zh is distinct from $q$这一点我同意你。$q$ and true;

-- 3576b68b-9f30-4105-8410-1848764f8398: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '3576b68b-9f30-4105-8410-1848764f8398', 'learning_object_translations', 'zh.example_translation', example_translation, $q$这一点我同意你。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '3576b68b-9f30-4105-8410-1848764f8398' and native_language = 'zh' and example_translation is distinct from $q$这一点我同意你。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$这一点我同意你。$q$, updated_at = now() where learning_object_id = '3576b68b-9f30-4105-8410-1848764f8398' and native_language = 'zh' and example_translation is distinct from $q$这一点我同意你。$q$ and coalesce(example_translation, '') <> '';

-- c9bb0cff-8807-40fc-9cb4-f3cf108cb4a9: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c9bb0cff-8807-40fc-9cb4-f3cf108cb4a9', 'learning_objects', 'example_zh', example_zh, $q$嗨！你在干什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'c9bb0cff-8807-40fc-9cb4-f3cf108cb4a9' and example_zh is distinct from $q$嗨！你在干什么？$q$ and true;
update public.learning_objects set example_zh = $q$嗨！你在干什么？$q$, updated_at = now() where id = 'c9bb0cff-8807-40fc-9cb4-f3cf108cb4a9' and example_zh is distinct from $q$嗨！你在干什么？$q$ and true;

-- c9bb0cff-8807-40fc-9cb4-f3cf108cb4a9: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c9bb0cff-8807-40fc-9cb4-f3cf108cb4a9', 'learning_object_translations', 'zh.example_translation', example_translation, $q$嗨！你在干什么？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c9bb0cff-8807-40fc-9cb4-f3cf108cb4a9' and native_language = 'zh' and example_translation is distinct from $q$嗨！你在干什么？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$嗨！你在干什么？$q$, updated_at = now() where learning_object_id = 'c9bb0cff-8807-40fc-9cb4-f3cf108cb4a9' and native_language = 'zh' and example_translation is distinct from $q$嗨！你在干什么？$q$ and coalesce(example_translation, '') <> '';

-- c9bb0cff-8807-40fc-9cb4-f3cf108cb4a9: en.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'c9bb0cff-8807-40fc-9cb4-f3cf108cb4a9', 'learning_object_translations', 'en.example_translation', example_translation, $q$Hi! What are you doing?$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'c9bb0cff-8807-40fc-9cb4-f3cf108cb4a9' and native_language = 'en' and example_translation is distinct from $q$Hi! What are you doing?$q$ and true;
update public.learning_object_translations set example_translation = $q$Hi! What are you doing?$q$, updated_at = now() where learning_object_id = 'c9bb0cff-8807-40fc-9cb4-f3cf108cb4a9' and native_language = 'en' and example_translation is distinct from $q$Hi! What are you doing?$q$ and true;

-- 43d06cc9-a54d-4a6c-9e7c-7272f0c52e5d: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '43d06cc9-a54d-4a6c-9e7c-7272f0c52e5d', 'learning_objects', 'example_zh', example_zh, $q$注意！请自带舞鞋。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '43d06cc9-a54d-4a6c-9e7c-7272f0c52e5d' and example_zh is distinct from $q$注意！请自带舞鞋。$q$ and true;
update public.learning_objects set example_zh = $q$注意！请自带舞鞋。$q$, updated_at = now() where id = '43d06cc9-a54d-4a6c-9e7c-7272f0c52e5d' and example_zh is distinct from $q$注意！请自带舞鞋。$q$ and true;

-- 43d06cc9-a54d-4a6c-9e7c-7272f0c52e5d: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '43d06cc9-a54d-4a6c-9e7c-7272f0c52e5d', 'learning_object_translations', 'zh.example_translation', example_translation, $q$注意！请自带舞鞋。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '43d06cc9-a54d-4a6c-9e7c-7272f0c52e5d' and native_language = 'zh' and example_translation is distinct from $q$注意！请自带舞鞋。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$注意！请自带舞鞋。$q$, updated_at = now() where learning_object_id = '43d06cc9-a54d-4a6c-9e7c-7272f0c52e5d' and native_language = 'zh' and example_translation is distinct from $q$注意！请自带舞鞋。$q$ and coalesce(example_translation, '') <> '';

-- d5001912-0f1c-4025-87a0-d64fc30c04f0: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd5001912-0f1c-4025-87a0-d64fc30c04f0', 'learning_objects', 'example_zh', example_zh, $q$什么？你能再说一遍吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'd5001912-0f1c-4025-87a0-d64fc30c04f0' and example_zh is distinct from $q$什么？你能再说一遍吗？$q$ and true;
update public.learning_objects set example_zh = $q$什么？你能再说一遍吗？$q$, updated_at = now() where id = 'd5001912-0f1c-4025-87a0-d64fc30c04f0' and example_zh is distinct from $q$什么？你能再说一遍吗？$q$ and true;

-- d5001912-0f1c-4025-87a0-d64fc30c04f0: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd5001912-0f1c-4025-87a0-d64fc30c04f0', 'learning_object_translations', 'zh.example_translation', example_translation, $q$什么？你能再说一遍吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'd5001912-0f1c-4025-87a0-d64fc30c04f0' and native_language = 'zh' and example_translation is distinct from $q$什么？你能再说一遍吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$什么？你能再说一遍吗？$q$, updated_at = now() where learning_object_id = 'd5001912-0f1c-4025-87a0-d64fc30c04f0' and native_language = 'zh' and example_translation is distinct from $q$什么？你能再说一遍吗？$q$ and coalesce(example_translation, '') <> '';

-- d19ae630-487e-49ed-a685-9b852585784c: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd19ae630-487e-49ed-a685-9b852585784c', 'learning_objects', 'example_zh', example_zh, $q$哎呀！我没看见你。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'd19ae630-487e-49ed-a685-9b852585784c' and example_zh is distinct from $q$哎呀！我没看见你。$q$ and true;
update public.learning_objects set example_zh = $q$哎呀！我没看见你。$q$, updated_at = now() where id = 'd19ae630-487e-49ed-a685-9b852585784c' and example_zh is distinct from $q$哎呀！我没看见你。$q$ and true;

-- d19ae630-487e-49ed-a685-9b852585784c: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'd19ae630-487e-49ed-a685-9b852585784c', 'learning_object_translations', 'zh.example_translation', example_translation, $q$哎呀！我没看见你。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'd19ae630-487e-49ed-a685-9b852585784c' and native_language = 'zh' and example_translation is distinct from $q$哎呀！我没看见你。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$哎呀！我没看见你。$q$, updated_at = now() where learning_object_id = 'd19ae630-487e-49ed-a685-9b852585784c' and native_language = 'zh' and example_translation is distinct from $q$哎呀！我没看见你。$q$ and coalesce(example_translation, '') <> '';

-- 0e7a0e4e-d944-4330-bec6-41ec6ad840ee: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0e7a0e4e-d944-4330-bec6-41ec6ad840ee', 'learning_objects', 'example_zh', example_zh, $q$你选什么颜色都没关系。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '0e7a0e4e-d944-4330-bec6-41ec6ad840ee' and example_zh is distinct from $q$你选什么颜色都没关系。$q$ and true;
update public.learning_objects set example_zh = $q$你选什么颜色都没关系。$q$, updated_at = now() where id = '0e7a0e4e-d944-4330-bec6-41ec6ad840ee' and example_zh is distinct from $q$你选什么颜色都没关系。$q$ and true;

-- 0e7a0e4e-d944-4330-bec6-41ec6ad840ee: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '0e7a0e4e-d944-4330-bec6-41ec6ad840ee', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你选什么颜色都没关系。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '0e7a0e4e-d944-4330-bec6-41ec6ad840ee' and native_language = 'zh' and example_translation is distinct from $q$你选什么颜色都没关系。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你选什么颜色都没关系。$q$, updated_at = now() where learning_object_id = '0e7a0e4e-d944-4330-bec6-41ec6ad840ee' and native_language = 'zh' and example_translation is distinct from $q$你选什么颜色都没关系。$q$ and coalesce(example_translation, '') <> '';

-- 1c055da3-edbf-4bcd-9022-1644db0b3aab: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1c055da3-edbf-4bcd-9022-1644db0b3aab', 'learning_objects', 'example_zh', example_zh, $q$你要一起去吗？这取决于天气。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = '1c055da3-edbf-4bcd-9022-1644db0b3aab' and example_zh is distinct from $q$你要一起去吗？这取决于天气。$q$ and true;
update public.learning_objects set example_zh = $q$你要一起去吗？这取决于天气。$q$, updated_at = now() where id = '1c055da3-edbf-4bcd-9022-1644db0b3aab' and example_zh is distinct from $q$你要一起去吗？这取决于天气。$q$ and true;

-- 1c055da3-edbf-4bcd-9022-1644db0b3aab: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', '1c055da3-edbf-4bcd-9022-1644db0b3aab', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你要一起去吗？这取决于天气。$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = '1c055da3-edbf-4bcd-9022-1644db0b3aab' and native_language = 'zh' and example_translation is distinct from $q$你要一起去吗？这取决于天气。$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你要一起去吗？这取决于天气。$q$, updated_at = now() where learning_object_id = '1c055da3-edbf-4bcd-9022-1644db0b3aab' and native_language = 'zh' and example_translation is distinct from $q$你要一起去吗？这取决于天气。$q$ and coalesce(example_translation, '') <> '';

-- b2ca4a1f-5db3-4309-a303-7244a7d8e424: example_zh
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b2ca4a1f-5db3-4309-a303-7244a7d8e424', 'learning_objects', 'example_zh', example_zh, $q$你知道我在画廊遇见谁了吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_objects where id = 'b2ca4a1f-5db3-4309-a303-7244a7d8e424' and example_zh is distinct from $q$你知道我在画廊遇见谁了吗？$q$ and true;
update public.learning_objects set example_zh = $q$你知道我在画廊遇见谁了吗？$q$, updated_at = now() where id = 'b2ca4a1f-5db3-4309-a303-7244a7d8e424' and example_zh is distinct from $q$你知道我在画廊遇见谁了吗？$q$ and true;

-- b2ca4a1f-5db3-4309-a303-7244a7d8e424: zh.example_translation
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', 'b2ca4a1f-5db3-4309-a303-7244a7d8e424', 'learning_object_translations', 'zh.example_translation', example_translation, $q$你知道我在画廊遇见谁了吗？$q$, $q$batch1 2026-11-01: verified review finding$q$ from public.learning_object_translations where learning_object_id = 'b2ca4a1f-5db3-4309-a303-7244a7d8e424' and native_language = 'zh' and example_translation is distinct from $q$你知道我在画廊遇见谁了吗？$q$ and coalesce(example_translation, '') <> '';
update public.learning_object_translations set example_translation = $q$你知道我在画廊遇见谁了吗？$q$, updated_at = now() where learning_object_id = 'b2ca4a1f-5db3-4309-a303-7244a7d8e424' and native_language = 'zh' and example_translation is distinct from $q$你知道我在画廊遇见谁了吗？$q$ and coalesce(example_translation, '') <> '';
commit;
