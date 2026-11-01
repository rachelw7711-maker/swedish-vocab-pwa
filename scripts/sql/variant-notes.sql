-- Variant and inflected-form headwords kept as entries (2026-11-01), each with a note on how
-- it relates to the usual form. anmälning / innevånare / verkning / sankt are SALDO lemmas;
-- eget / ende / norske / lyckligt are forms of egen / en / norsk / lycklig. Only empty
-- meaning_note fields are filled; archived (:'batch'), rollback sets them back to ''.
begin;
create temp table n (head text, lang text, note text) on commit drop;
insert into n values
 ('anmälning','zh','anmälan 的同义词，较少用；日常多说 anmälan。'), ('anmälning','en','Less common synonym of anmälan, which is the usual word.'),
 ('innevånare','zh','invånare 的旧式拼写，现代通常写 invånare。'), ('innevånare','en','Older spelling of invånare, the usual modern form.'),
 ('verkning','zh','与 verkan 同义，verkan 更常用；两者的复数都是 verkningar。'), ('verkning','en','Synonym of verkan, which is more common; verkningar is the plural of both.'),
 ('sankt','zh','多用于圣人名和地名，如 Sankt Petersburg（缩写 S:t）；其他用法较古旧。'), ('sankt','en','Mainly in saints'' names and place names, e.g. Sankt Petersburg (abbr. S:t); otherwise dated.'),
 ('eget','zh','egen 的中性形式，如 ett eget rum。'), ('eget','en','Neuter form of egen, as in ett eget rum.'),
 ('ende','zh','用于 den ende（唯一的那个），是 en 的形容词用法。'), ('ende','en','Used in den ende (the only one); adjectival use of en.'),
 ('norske','zh','norsk 的弱变化形式，用于男性，如 den norske kungen；一般形式是 norska。'), ('norske','en','Weak form of norsk used of a male, e.g. den norske kungen; the general form is norska.'),
 ('lyckligt','zh','lycklig 的中性形式，也用作副词，如 leva lyckligt。'), ('lyckligt','en','Neuter form of lycklig, also used as an adverb (leva lyckligt).');
create temp table upd on commit drop as
select t.id, t.learning_object_id, n.lang, n.note from n
join public.learning_objects lo on lo.swedish = n.head and lo.status <> 'retired'
join public.learning_object_translations t on t.learning_object_id = lo.id and t.native_language = n.lang
where coalesce(t.meaning_note, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', learning_object_id, 'learning_object_translations', 'meaning_note:' || lang, '', note, 'variant_or_form_note' from upd;
update public.learning_object_translations t set meaning_note = u.note, updated_at = now() from upd u where t.id = u.id;
commit;
