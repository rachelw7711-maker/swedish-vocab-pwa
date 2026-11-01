-- Seven particle verbs created 2026-11-01 (SALDO vbm lemmas, missing from the dictionary;
-- klä ut skipped: klä ut sig exists). Content came from the AI word card; here they get the
-- shape of the existing particle verbs (hålla med, tycka om): verb / word, with the base
-- verb's forms (SALDO) plus the particle. Rollback: delete these seven entries (new, no data).
begin;
create temp table pv (head text, inf text, pres text, pret text, sup text, imp text, grp text) on commit drop;
insert into pv values
 ('slappna av','slappna av','slappnar av','slappnade av','slappnat av','slappna av','1'),
 ('kasta om','kasta om','kastar om','kastade om','kastat om','kasta om','1'),
 ('dela upp','dela upp','delar upp','delade upp','delat upp','dela upp','1'),
 ('reta upp','reta upp','retar upp','retade upp','retat upp','reta upp','1'),
 ('växa upp','växa upp','växer upp','växte upp','vuxit upp','väx upp','4'),
 ('slita ut','slita ut','sliter ut','slet ut','slitit ut','slit ut','4'),
 ('tråka ut','tråka ut','tråkar ut','tråkade ut','tråkat ut','tråka ut','1');
create temp table ids on commit drop as
select lo.id, pv.* from pv join public.learning_objects lo on lo.swedish = pv.head and lo.status <> 'retired' and lo.object_type = 'phrase' and lo.created_at > now() - interval '1 day';
do $$ begin if (select count(*) from ids) <> 7 then raise exception 'expected 7 new entries, got %', (select count(*) from ids); end if; end $$;
update public.learning_objects lo set part_of_speech = 'verb', object_type = 'word', updated_at = now() from ids where lo.id = ids.id;
delete from public.learning_object_modules m using ids where m.learning_object_id = ids.id and m.module = 'phrase';
insert into public.learning_object_modules (learning_object_id, module) select id, 'word' from ids on conflict do nothing;
insert into public.word_forms (learning_object_id, form_type, form_value, sort_order)
select ids.id, v.t, v.v, v.o from ids, lateral (values ('infinitive', inf, 0), ('present', pres, 1), ('preteritum', pret, 2), ('supinum', sup, 3), ('imperative', imp, 4), ('verb_group', grp, 5)) v(t, v, o)
on conflict (learning_object_id, form_type) do nothing;
commit;

-- Participles: the particle goes in front (uppretad, utsliten); the generated
-- "retad upp" / "kastande om" forms are not Swedish. Present participles of these particle
-- verbs are not in use and are removed. Old values archived (:'batch').
begin;
create temp table pp (head text, val text) on commit drop;
insert into pp values ('dela upp','uppdelad'),('kasta om','omkastad'),('reta upp','uppretad'),('slita ut','utsliten'),('tråka ut','uttråkad'),('växa upp','uppvuxen');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch', f.learning_object_id, 'word_forms', f.form_type, f.form_value,
  case when f.form_type = 'perfect_participle' then pp.val end, 'particle_verb_participle'
from public.word_forms f join public.learning_objects lo on lo.id = f.learning_object_id and lo.status <> 'retired'
join pp on pp.head = lo.swedish
where f.form_type in ('perfect_participle', 'present_participle') and f.form_value is distinct from pp.val;
update public.word_forms f set form_value = pp.val, updated_at = now()
from public.learning_objects lo, pp where lo.id = f.learning_object_id and pp.head = lo.swedish and lo.status <> 'retired' and f.form_type = 'perfect_participle';
delete from public.word_forms f using public.learning_objects lo, pp
where lo.id = f.learning_object_id and pp.head = lo.swedish and lo.status <> 'retired' and f.form_type = 'present_participle';
commit;
