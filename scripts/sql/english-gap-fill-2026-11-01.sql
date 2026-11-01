-- English learning content missing on entries made in Chinese mode (2026-11-01): memory tip,
-- collocation and related-word glosses for 19 entries, 32 example translations, and the
-- English translation of legacy single examples. Swedish text and line structure come from
-- the stored Chinese rows; only empty English fields are filled. Archived; :'batch'.
begin;
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'Think of it as taking something into your own hands and dealing with it yourself. That captures both starting on something and accepting responsibility for it.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6f276ea3-91ff-4e1e-96cc-1a2ffb980de6' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'Think of it as taking something into your own hands and dealing with it yourself. That captures both starting on something and accepting responsibility for it.', updated_at = now() where learning_object_id = '6f276ea3-91ff-4e1e-96cc-1a2ffb980de6' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'ta sig an ett problem | tackle a problem | De tog sig an problemet direkt.
ta sig an en uppgift | take on a task | Jag tar mig an uppgiften i morgon.
ta sig an ett projekt | take on a project | Företaget tog sig an ett nytt projekt.
ta sig an ansvaret | take on the responsibility | Hon tog sig an ansvaret utan att tveka.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6f276ea3-91ff-4e1e-96cc-1a2ffb980de6' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'ta sig an ett problem | tackle a problem | De tog sig an problemet direkt.
ta sig an en uppgift | take on a task | Jag tar mig an uppgiften i morgon.
ta sig an ett projekt | take on a project | Företaget tog sig an ett nytt projekt.
ta sig an ansvaret | take on the responsibility | Hon tog sig an ansvaret utan att tveka.', updated_at = now() where learning_object_id = '6f276ea3-91ff-4e1e-96cc-1a2ffb980de6' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'åta sig | undertake (verb)
ta itu med | deal with
ansvara för | be responsible for (verb)
uppgift | task (noun)
ansvar | responsibility (noun)', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6f276ea3-91ff-4e1e-96cc-1a2ffb980de6' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'åta sig | undertake (verb)
ta itu med | deal with
ansvara för | be responsible for (verb)
uppgift | task (noun)
ansvar | responsibility (noun)', updated_at = now() where learning_object_id = '6f276ea3-91ff-4e1e-96cc-1a2ffb980de6' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'Think of gräns, which means “boundary” or “limit.” Begränsad is something that has clear limits around it, so it means “limited.”', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '247841d3-2c72-4448-bc6a-8c2bcfc3a2b4' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'Think of gräns, which means “boundary” or “limit.” Begränsad is something that has clear limits around it, so it means “limited.”', updated_at = now() where learning_object_id = '247841d3-2c72-4448-bc6a-8c2bcfc3a2b4' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'begränsad tillgång | limited access | I den här byn finns det begränsad tillgång till internet.
begränsad tid | limited time | Du har bara begränsad tid på dig.
begränsade resurser | limited resources | Företaget arbetar med begränsade resurser.
begränsad upplaga | limited edition | Boken gavs ut i en begränsad upplaga.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '247841d3-2c72-4448-bc6a-8c2bcfc3a2b4' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'begränsad tillgång | limited access | I den här byn finns det begränsad tillgång till internet.
begränsad tid | limited time | Du har bara begränsad tid på dig.
begränsade resurser | limited resources | Företaget arbetar med begränsade resurser.
begränsad upplaga | limited edition | Boken gavs ut i en begränsad upplaga.', updated_at = now() where learning_object_id = '247841d3-2c72-4448-bc6a-8c2bcfc3a2b4' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'begränsa | limit
begränsning | limitation
gräns | boundary
obegränsad | unlimited', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '247841d3-2c72-4448-bc6a-8c2bcfc3a2b4' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'begränsa | limit
begränsning | limitation
gräns | boundary
obegränsad | unlimited', updated_at = now() where learning_object_id = '247841d3-2c72-4448-bc6a-8c2bcfc3a2b4' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, '“Snö” means “snow,” and “skottning” comes from “skotta,” meaning “to shovel” or “clear.” So snöskottning simply means “snow shoveling” or “clearing snow.”', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '9be10cc2-10c8-4f1a-a39e-e34499725c8f' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = '“Snö” means “snow,” and “skottning” comes from “skotta,” meaning “to shovel” or “clear.” So snöskottning simply means “snow shoveling” or “clearing snow.”', updated_at = now() where learning_object_id = '9be10cc2-10c8-4f1a-a39e-e34499725c8f' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'göra snöskottning | do snow shoveling | Vi måste göra snöskottning före jobbet.
snöskottning på trottoaren | snow clearing on the sidewalk | Snöskottning på trottoaren är viktig för säkerheten.
snöskottning på taket | snow clearing on the roof | Snöskottning på taket kan vara farligt.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '9be10cc2-10c8-4f1a-a39e-e34499725c8f' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'göra snöskottning | do snow shoveling | Vi måste göra snöskottning före jobbet.
snöskottning på trottoaren | snow clearing on the sidewalk | Snöskottning på trottoaren är viktig för säkerheten.
snöskottning på taket | snow clearing on the roof | Snöskottning på taket kan vara farligt.', updated_at = now() where learning_object_id = '9be10cc2-10c8-4f1a-a39e-e34499725c8f' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'skotta | shovel; clear away (verb)
snö | snow (noun)
skottkärra | wheelbarrow (noun)
snöskyffel | snow shovel (noun)
snöplog | snowplow (noun)', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '9be10cc2-10c8-4f1a-a39e-e34499725c8f' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'skotta | shovel; clear away (verb)
snö | snow (noun)
skottkärra | wheelbarrow (noun)
snöskyffel | snow shovel (noun)
snöplog | snowplow (noun)', updated_at = now() where learning_object_id = '9be10cc2-10c8-4f1a-a39e-e34499725c8f' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'You can remember it as “everyone’s right”: allas rätt (“everyone’s right”) is close in idea to allemansrätt.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '937bff7d-8e51-4a7b-b035-3eb863e301ec' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'You can remember it as “everyone’s right”: allas rätt (“everyone’s right”) is close in idea to allemansrätt.', updated_at = now() where learning_object_id = '937bff7d-8e51-4a7b-b035-3eb863e301ec' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'utöva allemansrätten | exercise the right of public access | Man får utöva allemansrätten i skogen.
respektera allemansrätten | respect the right of public access | Alla måste respektera allemansrätten.
på privat mark | on private land | Man får gå på privat mark enligt allemansrätten.
vandra i naturen | walk/hike in nature | Många gillar att vandra i naturen tack vare allemansrätten.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '937bff7d-8e51-4a7b-b035-3eb863e301ec' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'utöva allemansrätten | exercise the right of public access | Man får utöva allemansrätten i skogen.
respektera allemansrätten | respect the right of public access | Alla måste respektera allemansrätten.
på privat mark | on private land | Man får gå på privat mark enligt allemansrätten.
vandra i naturen | walk/hike in nature | Många gillar att vandra i naturen tack vare allemansrätten.', updated_at = now() where learning_object_id = '937bff7d-8e51-4a7b-b035-3eb863e301ec' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'friluftsliv | outdoor life
natur | nature
markägare | landowner
allemansrättslig | relating to the right of public access', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '937bff7d-8e51-4a7b-b035-3eb863e301ec' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'friluftsliv | outdoor life
natur | nature
markägare | landowner
allemansrättslig | relating to the right of public access', updated_at = now() where learning_object_id = '937bff7d-8e51-4a7b-b035-3eb863e301ec' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'You can link jäsning to jäst, “yeast.” Jäsning is the process caused by yeast: fermentation.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '3906f270-b2fd-421b-93de-07edb221b0b1' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'You can link jäsning to jäst, “yeast.” Jäsning is the process caused by yeast: fermentation.', updated_at = now() where learning_object_id = '3906f270-b2fd-421b-93de-07edb221b0b1' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'alkoholjäsning | alcoholic fermentation | Alkoholjäsning används vid ölbryggning.
mjölksyrajäsning | lactic acid fermentation | Mjölksyrajäsning sker i vissa livsmedel.
jäsa degen | let the dough rise | Bröddegen ska jäsa i en varm skål.
jäsningsprocess | fermentation process | Jäsningsprocessen kräver rätt temperatur.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '3906f270-b2fd-421b-93de-07edb221b0b1' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'alkoholjäsning | alcoholic fermentation | Alkoholjäsning används vid ölbryggning.
mjölksyrajäsning | lactic acid fermentation | Mjölksyrajäsning sker i vissa livsmedel.
jäsa degen | let the dough rise | Bröddegen ska jäsa i en varm skål.
jäsningsprocess | fermentation process | Jäsningsprocessen kräver rätt temperatur.', updated_at = now() where learning_object_id = '3906f270-b2fd-421b-93de-07edb221b0b1' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'jäsa | ferment; rise (verb)
jäst | yeast
fermentera | ferment; cause to ferment (verb)
fermentation | fermentation', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '3906f270-b2fd-421b-93de-07edb221b0b1' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'jäsa | ferment; rise (verb)
jäst | yeast
fermentera | ferment; cause to ferment (verb)
fermentation | fermentation', updated_at = now() where learning_object_id = '3906f270-b2fd-421b-93de-07edb221b0b1' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'Think of krämig as meaning “like cream.” If something is creamy, rich, and smooth, krämig is a good word for it.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '5491eb4f-b579-499c-8b7f-7da27d01e445' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'Think of krämig as meaning “like cream.” If something is creamy, rich, and smooth, krämig is a good word for it.', updated_at = now() where learning_object_id = '5491eb4f-b579-499c-8b7f-7da27d01e445' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'krämig sås | creamy sauce | Jag gjorde en krämig sås med grädde.
krämig soppa | creamy soup | Den krämiga soppan serverades med bröd.
krämig konsistens | creamy texture | Yoghurten har en krämig konsistens.
krämig dessert | creamy dessert | Vi avslutade med en krämig dessert.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '5491eb4f-b579-499c-8b7f-7da27d01e445' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'krämig sås | creamy sauce | Jag gjorde en krämig sås med grädde.
krämig soppa | creamy soup | Den krämiga soppan serverades med bröd.
krämig konsistens | creamy texture | Yoghurten har en krämig konsistens.
krämig dessert | creamy dessert | Vi avslutade med en krämig dessert.', updated_at = now() where learning_object_id = '5491eb4f-b579-499c-8b7f-7da27d01e445' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'kräm | cream; custard; lotion (noun)
gräddig | creamy; with a taste of cream
mjuk | soft; gentle
len | smooth; silky', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '5491eb4f-b579-499c-8b7f-7da27d01e445' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'kräm | cream; custard; lotion (noun)
gräddig | creamy; with a taste of cream
mjuk | soft; gentle
len | smooth; silky', updated_at = now() where learning_object_id = '5491eb4f-b579-499c-8b7f-7da27d01e445' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'Remember: varsamhet is the state of doing things very carefully and gently.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'b93f5ece-9a71-496b-ab30-51d16fabf4f4' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'Remember: varsamhet is the state of doing things very carefully and gently.', updated_at = now() where learning_object_id = 'b93f5ece-9a71-496b-ab30-51d16fabf4f4' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'med varsamhet | carefully; with caution | Han lyfte glaset med varsamhet.
behandla något med varsamhet | handle something with care | Gamla böcker bör behandlas med varsamhet.
visa varsamhet | show caution | Du måste visa varsamhet när du arbetar med maskinen.
varsamhet i trafiken | caution in traffic | Varsamhet i trafiken kan rädda liv.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'b93f5ece-9a71-496b-ab30-51d16fabf4f4' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'med varsamhet | carefully; with caution | Han lyfte glaset med varsamhet.
behandla något med varsamhet | handle something with care | Gamla böcker bör behandlas med varsamhet.
visa varsamhet | show caution | Du måste visa varsamhet när du arbetar med maskinen.
varsamhet i trafiken | caution in traffic | Varsamhet i trafiken kan rädda liv.', updated_at = now() where learning_object_id = 'b93f5ece-9a71-496b-ab30-51d16fabf4f4' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'varsam | careful; gentle
varsamt | carefully; gently
försiktighet | caution; carefulness
försiktig | careful; cautious', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'b93f5ece-9a71-496b-ab30-51d16fabf4f4' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'varsam | careful; gentle
varsamt | carefully; gently
försiktighet | caution; carefulness
försiktig | careful; cautious', updated_at = now() where learning_object_id = 'b93f5ece-9a71-496b-ab30-51d16fabf4f4' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, '"Kräft" means crayfish, and "skiva" here refers to a social gathering. Put them together and you get a party where people eat crayfish.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '407e42e6-e70a-49d1-9c19-0e115a47ef99' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = '"Kräft" means crayfish, and "skiva" here refers to a social gathering. Put them together and you get a party where people eat crayfish.', updated_at = now() where learning_object_id = '407e42e6-e70a-49d1-9c19-0e115a47ef99' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'ha kräftskiva | have a crayfish party | Familjen ska ha kräftskiva på lördag.
gå på kräftskiva | go to a crayfish party | Jag går på kräftskiva hos en vän i kväll.
ordna kräftskiva | organize a crayfish party | De ordnade kräftskiva i trädgården.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '407e42e6-e70a-49d1-9c19-0e115a47ef99' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'ha kräftskiva | have a crayfish party | Familjen ska ha kräftskiva på lördag.
gå på kräftskiva | go to a crayfish party | Jag går på kräftskiva hos en vän i kväll.
ordna kräftskiva | organize a crayfish party | De ordnade kräftskiva i trädgården.', updated_at = now() where learning_object_id = '407e42e6-e70a-49d1-9c19-0e115a47ef99' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'kräfta | crayfish (noun)
skiva | party; gathering (noun)
fest | party; celebration (noun)
augusti | August (noun)', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '407e42e6-e70a-49d1-9c19-0e115a47ef99' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'kräfta | crayfish (noun)
skiva | party; gathering (noun)
fest | party; celebration (noun)
augusti | August (noun)', updated_at = now() where learning_object_id = '407e42e6-e70a-49d1-9c19-0e115a47ef99' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'sedvanerätt is made from sedvana, meaning “custom” or “tradition,” and rätt, meaning “law” or “legal right.” So it means law that develops from long-established custom.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '7a34ba0d-03e8-4470-b401-946ac1ab303c' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'sedvanerätt is made from sedvana, meaning “custom” or “tradition,” and rätt, meaning “law” or “legal right.” So it means law that develops from long-established custom.', updated_at = now() where learning_object_id = '7a34ba0d-03e8-4470-b401-946ac1ab303c' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'internationell sedvanerätt | international customary law | Internationell sedvanerätt spelar en viktig roll i folkrätten.
sedvanerättslig princip | customary-law principle | Domstolen hänvisade till en sedvanerättslig princip.
enligt sedvanerätt | under customary law | Marken användes enligt sedvanerätt.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '7a34ba0d-03e8-4470-b401-946ac1ab303c' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'internationell sedvanerätt | international customary law | Internationell sedvanerätt spelar en viktig roll i folkrätten.
sedvanerättslig princip | customary-law principle | Domstolen hänvisade till en sedvanerättslig princip.
enligt sedvanerätt | under customary law | Marken användes enligt sedvanerätt.', updated_at = now() where learning_object_id = '7a34ba0d-03e8-4470-b401-946ac1ab303c' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'sedvana | custom (noun)
rätt | law; legal right
rättspraxis | case law; legal practice
folkrätt | international law', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '7a34ba0d-03e8-4470-b401-946ac1ab303c' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'sedvana | custom (noun)
rätt | law; legal right
rättspraxis | case law; legal practice
folkrätt | international law', updated_at = now() where learning_object_id = '7a34ba0d-03e8-4470-b401-946ac1ab303c' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'mark means “land” and ägare means “owner,” so markägare literally means “landowner.”', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '271bcd08-6bb2-4a6d-8165-3dbda91481e6' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'mark means “land” and ägare means “owner,” so markägare literally means “landowner.”', updated_at = now() where learning_object_id = '271bcd08-6bb2-4a6d-8165-3dbda91481e6' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'privat markägare | private landowner | Den privata markägaren vill sälja marken.
stor markägare | large landowner | Bolaget är en stor markägare i området.
lokal markägare | local landowner | Kommunen samarbetar med lokala markägare.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '271bcd08-6bb2-4a6d-8165-3dbda91481e6' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'privat markägare | private landowner | Den privata markägaren vill sälja marken.
stor markägare | large landowner | Bolaget är en stor markägare i området.
lokal markägare | local landowner | Kommunen samarbetar med lokala markägare.', updated_at = now() where learning_object_id = '271bcd08-6bb2-4a6d-8165-3dbda91481e6' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'mark | land
ägare | owner
äga | own (verb)
fastighetsägare | property owner (noun)
jordägare | landowner (noun)', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '271bcd08-6bb2-4a6d-8165-3dbda91481e6' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'mark | land
ägare | owner
äga | own (verb)
fastighetsägare | property owner (noun)
jordägare | landowner (noun)', updated_at = now() where learning_object_id = '271bcd08-6bb2-4a6d-8165-3dbda91481e6' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'Think of fast here as introducing a contrast: the situation is different, but the result is still true. It often means “although” or “but” depending on the sentence.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6057535b-97ad-4326-a213-005b5d7d4ce1' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'Think of fast here as introducing a contrast: the situation is different, but the result is still true. It often means “although” or “but” depending on the sentence.', updated_at = now() where learning_object_id = '6057535b-97ad-4326-a213-005b5d7d4ce1' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'fast än | although; though | Fast än det var sent, ville de fortsätta prata.
fast jag | although I ... | Fast jag var nervös, sa jag sanningen.
fast du | although you ... | Jag hjälpte dig, fast du inte bad om det.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6057535b-97ad-4326-a213-005b5d7d4ce1' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'fast än | although; though | Fast än det var sent, ville de fortsätta prata.
fast jag | although I ... | Fast jag var nervös, sa jag sanningen.
fast du | although you ... | Jag hjälpte dig, fast du inte bad om det.', updated_at = now() where learning_object_id = '6057535b-97ad-4326-a213-005b5d7d4ce1' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'fastän | although; though
även om | even if; although
trots att | although; though
men | but', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6057535b-97ad-4326-a213-005b5d7d4ce1' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'fastän | although; though
även om | even if; although
trots att | although; though
men | but', updated_at = now() where learning_object_id = '6057535b-97ad-4326-a213-005b5d7d4ce1' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'Think of grädde, “cream.” If something is gräddig, it is cream-like: rich, smooth, or tasting of cream.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '99c30570-3a49-45e8-be19-56911b855d8b' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'Think of grädde, “cream.” If something is gräddig, it is cream-like: rich, smooth, or tasting of cream.', updated_at = now() where learning_object_id = '99c30570-3a49-45e8-be19-56911b855d8b' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'gräddig sås | creamy sauce | Vi serverade kycklingen med en gräddig sås.
gräddig smak | creamy flavor | Glassen har en tydligt gräddig smak.
gräddig konsistens | rich, smooth consistency | Yoghurten fick en gräddig konsistens.
gräddig ton | creamy tone; soft pale shade | Väggarna har en gräddig ton.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '99c30570-3a49-45e8-be19-56911b855d8b' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'gräddig sås | creamy sauce | Vi serverade kycklingen med en gräddig sås.
gräddig smak | creamy flavor | Glassen har en tydligt gräddig smak.
gräddig konsistens | rich, smooth consistency | Yoghurten fick en gräddig konsistens.
gräddig ton | creamy tone; soft pale shade | Väggarna har en gräddig ton.', updated_at = now() where learning_object_id = '99c30570-3a49-45e8-be19-56911b855d8b' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'grädde | cream; whipping cream (noun)
grädda | bake; fry (verb)
krämig | creamy; smooth
fet | fatty; greasy
smörig | buttery; overly sentimental', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '99c30570-3a49-45e8-be19-56911b855d8b' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'grädde | cream; whipping cream (noun)
grädda | bake; fry (verb)
krämig | creamy; smooth
fet | fatty; greasy
smörig | buttery; overly sentimental', updated_at = now() where learning_object_id = '99c30570-3a49-45e8-be19-56911b855d8b' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'Think of slappna av as “let go of the tension” and become relaxed. The av part can help you remember the idea of stress going away.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6f227509-7c58-474d-8903-1d74d1d5dbf7' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'Think of slappna av as “let go of the tension” and become relaxed. The av part can help you remember the idea of stress going away.', updated_at = now() where learning_object_id = '6f227509-7c58-474d-8903-1d74d1d5dbf7' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'slappna av i musklerna | relax the muscles | Försök att slappna av i musklerna i axlarna.
slappna av och andas | relax and breathe | Slappna av och andas lugnt.
slappna av efter en stressig dag | relax after a stressful day | Jag brukar slappna av efter en stressig dag.
svårt att slappna av | have difficulty relaxing | Jag har svårt att slappna av på kvällen.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6f227509-7c58-474d-8903-1d74d1d5dbf7' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'slappna av i musklerna | relax the muscles | Försök att slappna av i musklerna i axlarna.
slappna av och andas | relax and breathe | Slappna av och andas lugnt.
slappna av efter en stressig dag | relax after a stressful day | Jag brukar slappna av efter en stressig dag.
svårt att slappna av | have difficulty relaxing | Jag har svårt att slappna av på kvällen.', updated_at = now() where learning_object_id = '6f227509-7c58-474d-8903-1d74d1d5dbf7' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'slappna | relax; loosen up (verb)
avslappnad | relaxed; laid-back (adjective)
avslappning | relaxation; rest (noun)
avkoppla | relax; help someone unwind (verb)
avkoppling | relaxation; rest (noun)', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6f227509-7c58-474d-8903-1d74d1d5dbf7' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'slappna | relax; loosen up (verb)
avslappnad | relaxed; laid-back (adjective)
avslappning | relaxation; rest (noun)
avkoppla | relax; help someone unwind (verb)
avkoppling | relaxation; rest (noun)', updated_at = now() where learning_object_id = '6f227509-7c58-474d-8903-1d74d1d5dbf7' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'Think of dela upp as dela + upp: you break something up into several parts. The upp adds the idea of splitting it apart piece by piece.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'd719caa5-fa9f-4fe7-9813-290f018026e7' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'Think of dela upp as dela + upp: you break something up into several parts. The upp adds the idea of splitting it apart piece by piece.', updated_at = now() where learning_object_id = 'd719caa5-fa9f-4fe7-9813-290f018026e7' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'dela upp arbetet | divide the work | Vi delar upp arbetet mellan oss.
dela upp kostnaderna | split the costs | De delar upp kostnaderna lika.
dela upp i grupper | divide into groups | Läraren delar upp eleverna i grupper.
dela upp tiden | divide up the time | Vi måste dela upp tiden bättre.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'd719caa5-fa9f-4fe7-9813-290f018026e7' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'dela upp arbetet | divide the work | Vi delar upp arbetet mellan oss.
dela upp kostnaderna | split the costs | De delar upp kostnaderna lika.
dela upp i grupper | divide into groups | Läraren delar upp eleverna i grupper.
dela upp tiden | divide up the time | Vi måste dela upp tiden bättre.', updated_at = now() where learning_object_id = 'd719caa5-fa9f-4fe7-9813-290f018026e7' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'uppdelning | division; splitting (noun)
uppdelad | divided; split up (adjective)
dela | divide; share (verb)
fördela | distribute; allocate; apportion costs (verb)
separera | separate (verb)', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'd719caa5-fa9f-4fe7-9813-290f018026e7' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'uppdelning | division; splitting (noun)
uppdelad | divided; split up (adjective)
dela | divide; share (verb)
fördela | distribute; allocate; apportion costs (verb)
separera | separate (verb)', updated_at = now() where learning_object_id = 'd719caa5-fa9f-4fe7-9813-290f018026e7' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'Think of upp as “up”: reta upp is like “work someone up” until their feelings rise and they get annoyed or angry.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6aac9c86-6d15-4a91-acb1-b23aa79136c0' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'Think of upp as “up”: reta upp is like “work someone up” until their feelings rise and they get annoyed or angry.', updated_at = now() where learning_object_id = '6aac9c86-6d15-4a91-acb1-b23aa79136c0' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'reta upp någon | annoy / upset someone | Hon retade upp sin bror med skämtet.
reta upp sig | get annoyed / worked up | Han retar upp sig för lätt.
reta upp känslor | stir up feelings | Frågan retade upp starka känslor.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6aac9c86-6d15-4a91-acb1-b23aa79136c0' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'reta upp någon | annoy / upset someone | Hon retade upp sin bror med skämtet.
reta upp sig | get annoyed / worked up | Han retar upp sig för lätt.
reta upp känslor | stir up feelings | Frågan retade upp starka känslor.', updated_at = now() where learning_object_id = '6aac9c86-6d15-4a91-acb1-b23aa79136c0' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'irritera | irritate; annoy (verb)
upprörd | upset; agitated (adjective)
provocera | provoke (verb)
ilska | anger (noun)
retlig | irritable; easily annoyed (adjective)', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6aac9c86-6d15-4a91-acb1-b23aa79136c0' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'irritera | irritate; annoy (verb)
upprörd | upset; agitated (adjective)
provocera | provoke (verb)
ilska | anger (noun)
retlig | irritable; easily annoyed (adjective)', updated_at = now() where learning_object_id = '6aac9c86-6d15-4a91-acb1-b23aa79136c0' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'Think of upp as “up” or “upward.” So växa upp literally suggests “grow up” into an adult.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '04670310-9cc9-4a5c-b78d-7fd6425b1b32' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'Think of upp as “up” or “upward.” So växa upp literally suggests “grow up” into an adult.', updated_at = now() where learning_object_id = '04670310-9cc9-4a5c-b78d-7fd6425b1b32' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'växa upp i en stad | grow up in a city | Hon växte upp i en liten stad.
växa upp på landet | grow up in the countryside | Han växte upp på landet.
växa upp med syskon | grow up with siblings | Jag växte upp med två bröder.
växa upp snabbt | grow up quickly | De växer upp snabbt.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '04670310-9cc9-4a5c-b78d-7fd6425b1b32' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'växa upp i en stad | grow up in a city | Hon växte upp i en liten stad.
växa upp på landet | grow up in the countryside | Han växte upp på landet.
växa upp med syskon | grow up with siblings | Jag växte upp med två bröder.
växa upp snabbt | grow up quickly | De växer upp snabbt.', updated_at = now() where learning_object_id = '04670310-9cc9-4a5c-b78d-7fd6425b1b32' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'växa | grow; grow up (verb)
uppväxt | upbringing; childhood background (noun)
uppvuxen | grown up; raised in (adjective)
uppfostran | upbringing; child-rearing (noun)', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '04670310-9cc9-4a5c-b78d-7fd6425b1b32' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'växa | grow; grow up (verb)
uppväxt | upbringing; childhood background (noun)
uppvuxen | grown up; raised in (adjective)
uppfostran | upbringing; child-rearing (noun)', updated_at = now() where learning_object_id = '04670310-9cc9-4a5c-b78d-7fd6425b1b32' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'Think of ut as “all the way out.” If something is used so much that its strength is gone, it gets worn out; if a person uses up all their energy, they end up exhausted.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'd8fddd3e-f1da-46e0-82a4-f99fd51d4b0e' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'Think of ut as “all the way out.” If something is used so much that its strength is gone, it gets worn out; if a person uses up all their energy, they end up exhausted.', updated_at = now() where learning_object_id = 'd8fddd3e-f1da-46e0-82a4-f99fd51d4b0e' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'slita ut skorna | wear out shoes | Jag har slitit ut mina skor på bara några månader.
slita ut kläderna | wear out clothes | Barnen sliter ut sina kläder fort.
slita ut sig | exhaust yourself | Du kan inte slita ut dig på jobbet.
slita ut kroppen | wear out your body | Det är lätt att slita ut kroppen om man lyfter fel.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'd8fddd3e-f1da-46e0-82a4-f99fd51d4b0e' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'slita ut skorna | wear out shoes | Jag har slitit ut mina skor på bara några månader.
slita ut kläderna | wear out clothes | Barnen sliter ut sina kläder fort.
slita ut sig | exhaust yourself | Du kan inte slita ut dig på jobbet.
slita ut kroppen | wear out your body | Det är lätt att slita ut kroppen om man lyfter fel.', updated_at = now() where learning_object_id = 'd8fddd3e-f1da-46e0-82a4-f99fd51d4b0e' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'slita | pull; tear; work hard (verb)
utsliten | worn-out; exhausted
slitage | wear and tear (noun)
slit | hard work; toil (noun)
förslita sig | overwork yourself (verb)', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'd8fddd3e-f1da-46e0-82a4-f99fd51d4b0e' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'slita | pull; tear; work hard (verb)
utsliten | worn-out; exhausted
slitage | wear and tear (noun)
slit | hard work; toil (noun)
förslita sig | overwork yourself (verb)', updated_at = now() where learning_object_id = 'd8fddd3e-f1da-46e0-82a4-f99fd51d4b0e' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'Think of tråk- as “boring” and ut as “out”: if you tråkar ut someone, you “bore them out” and make them feel bored.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'f8fe915e-e74b-4e49-9d43-ad0d4757f609' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'Think of tråk- as “boring” and ut as “out”: if you tråkar ut someone, you “bore them out” and make them feel bored.', updated_at = now() where learning_object_id = 'f8fe915e-e74b-4e49-9d43-ad0d4757f609' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'tråka ut någon | bore someone | Han tråkade ut oss med sina klagomål.
inte tråka ut | not bore people | Försök att inte tråka ut publiken.
tråka ut publiken | bore the audience | Talaren riskerar att tråka ut publiken.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'f8fe915e-e74b-4e49-9d43-ad0d4757f609' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'tråka ut någon | bore someone | Han tråkade ut oss med sina klagomål.
inte tråka ut | not bore people | Försök att inte tråka ut publiken.
tråka ut publiken | bore the audience | Talaren riskerar att tråka ut publiken.', updated_at = now() where learning_object_id = 'f8fe915e-e74b-4e49-9d43-ad0d4757f609' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'tråkig | boring; dull (adjective)
tråkas | be bored; feel fed up (verb)
tråk | boredom; dullness (noun)
uttråkad | bored (adjective)
uttråkning | boredom (noun)', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'f8fe915e-e74b-4e49-9d43-ad0d4757f609' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'tråkig | boring; dull (adjective)
tråkas | be bored; feel fed up (verb)
tråk | boredom; dullness (noun)
uttråkad | bored (adjective)
uttråkning | boredom (noun)', updated_at = now() where learning_object_id = 'f8fe915e-e74b-4e49-9d43-ad0d4757f609' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:learning_tip', learning_tip, 'Think of om as meaning “again” or “the other way around.” So kasta om is like throwing things into a new order.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '44d01caa-b486-4098-98ad-3a213267f7e7' and native_language = 'en' and coalesce(learning_tip, '') = '';
update public.learning_object_translations set learning_tip = 'Think of om as meaning “again” or “the other way around.” So kasta om is like throwing things into a new order.', updated_at = now() where learning_object_id = '44d01caa-b486-4098-98ad-3a213267f7e7' and native_language = 'en' and coalesce(learning_tip, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:collocations', collocations, 'kasta om planen | rearrange the plan | Vi fick kasta om planen när tåget blev försenat.
kasta om ordningen | change the order | Läraren kastade om ordningen på frågorna.
kasta om i schemat | rework the schedule | Jag måste kasta om i schemat i morgon.
kasta om korten | reshuffle the cards; reorganize the whole situation | Krisen tvingade företaget att kasta om korten.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '44d01caa-b486-4098-98ad-3a213267f7e7' and native_language = 'en' and coalesce(collocations, '') = '';
update public.learning_object_translations set collocations = 'kasta om planen | rearrange the plan | Vi fick kasta om planen när tåget blev försenat.
kasta om ordningen | change the order | Läraren kastade om ordningen på frågorna.
kasta om i schemat | rework the schedule | Jag måste kasta om i schemat i morgon.
kasta om korten | reshuffle the cards; reorganize the whole situation | Krisen tvingade företaget att kasta om korten.', updated_at = now() where learning_object_id = '44d01caa-b486-4098-98ad-3a213267f7e7' and native_language = 'en' and coalesce(collocations, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:related_words', related_words, 'omkastning | rearrangement; reversal (noun)
omkastad | rearranged; shuffled (adjective)
omkasta | turn over; reverse; overturn (verb)
ordna om | rearrange; reorganize (verb)
förändra | change; alter (verb)', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '44d01caa-b486-4098-98ad-3a213267f7e7' and native_language = 'en' and coalesce(related_words, '') = '';
update public.learning_object_translations set related_words = 'omkastning | rearrangement; reversal (noun)
omkastad | rearranged; shuffled (adjective)
omkasta | turn over; reverse; overturn (verb)
ordna om | rearrange; reorganize (verb)
förändra | change; alter (verb)', updated_at = now() where learning_object_id = '44d01caa-b486-4098-98ad-3a213267f7e7' and native_language = 'en' and coalesce(related_words, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '6057535b-97ad-4326-a213-005b5d7d4ce1', 'inserted:learning_object_example_translations', '38254024-8349-452b-86a1-66f15416570e', null, 'I went out even though it was raining.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '38254024-8349-452b-86a1-66f15416570e') and not exists (select 1 from public.learning_object_example_translations where example_id = '38254024-8349-452b-86a1-66f15416570e' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '38254024-8349-452b-86a1-66f15416570e', 'en', 'I went out even though it was raining.' where exists (select 1 from public.learning_object_examples where id = '38254024-8349-452b-86a1-66f15416570e') and not exists (select 1 from public.learning_object_example_translations where example_id = '38254024-8349-452b-86a1-66f15416570e' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '6057535b-97ad-4326-a213-005b5d7d4ce1', 'inserted:learning_object_example_translations', 'd443e631-cac9-47b5-b6f0-f242d121965b', null, 'She is tired, but she keeps working.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'd443e631-cac9-47b5-b6f0-f242d121965b') and not exists (select 1 from public.learning_object_example_translations where example_id = 'd443e631-cac9-47b5-b6f0-f242d121965b' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'd443e631-cac9-47b5-b6f0-f242d121965b', 'en', 'She is tired, but she keeps working.' where exists (select 1 from public.learning_object_examples where id = 'd443e631-cac9-47b5-b6f0-f242d121965b') and not exists (select 1 from public.learning_object_example_translations where example_id = 'd443e631-cac9-47b5-b6f0-f242d121965b' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '407e42e6-e70a-49d1-9c19-0e115a47ef99', 'inserted:learning_object_example_translations', 'c0457453-63a2-4cb5-8f62-285e315c2bf2', null, 'We''re going to have a crayfish party this weekend.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'c0457453-63a2-4cb5-8f62-285e315c2bf2') and not exists (select 1 from public.learning_object_example_translations where example_id = 'c0457453-63a2-4cb5-8f62-285e315c2bf2' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'c0457453-63a2-4cb5-8f62-285e315c2bf2', 'en', 'We''re going to have a crayfish party this weekend.' where exists (select 1 from public.learning_object_examples where id = 'c0457453-63a2-4cb5-8f62-285e315c2bf2') and not exists (select 1 from public.learning_object_example_translations where example_id = 'c0457453-63a2-4cb5-8f62-285e315c2bf2' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '407e42e6-e70a-49d1-9c19-0e115a47ef99', 'inserted:learning_object_example_translations', '701c8931-983e-4fdd-aad9-e3f0a3bff992', null, 'At the crayfish party, we sang and ate crayfish.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '701c8931-983e-4fdd-aad9-e3f0a3bff992') and not exists (select 1 from public.learning_object_example_translations where example_id = '701c8931-983e-4fdd-aad9-e3f0a3bff992' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '701c8931-983e-4fdd-aad9-e3f0a3bff992', 'en', 'At the crayfish party, we sang and ate crayfish.' where exists (select 1 from public.learning_object_examples where id = '701c8931-983e-4fdd-aad9-e3f0a3bff992') and not exists (select 1 from public.learning_object_example_translations where example_id = '701c8931-983e-4fdd-aad9-e3f0a3bff992' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, 'f8fe915e-e74b-4e49-9d43-ad0d4757f609', 'inserted:learning_object_example_translations', 'a41ee55e-a35c-4b97-acf3-a7dcf58ededc', null, 'I don''t want to bore you with details.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'a41ee55e-a35c-4b97-acf3-a7dcf58ededc') and not exists (select 1 from public.learning_object_example_translations where example_id = 'a41ee55e-a35c-4b97-acf3-a7dcf58ededc' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'a41ee55e-a35c-4b97-acf3-a7dcf58ededc', 'en', 'I don''t want to bore you with details.' where exists (select 1 from public.learning_object_examples where id = 'a41ee55e-a35c-4b97-acf3-a7dcf58ededc') and not exists (select 1 from public.learning_object_example_translations where example_id = 'a41ee55e-a35c-4b97-acf3-a7dcf58ededc' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '6f276ea3-91ff-4e1e-96cc-1a2ffb980de6', 'inserted:learning_object_example_translations', 'ee4ffc3e-a151-422f-a0d5-20d92f91293d', null, 'She took on the difficult project with great energy.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'ee4ffc3e-a151-422f-a0d5-20d92f91293d') and not exists (select 1 from public.learning_object_example_translations where example_id = 'ee4ffc3e-a151-422f-a0d5-20d92f91293d' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'ee4ffc3e-a151-422f-a0d5-20d92f91293d', 'en', 'She took on the difficult project with great energy.' where exists (select 1 from public.learning_object_examples where id = 'ee4ffc3e-a151-422f-a0d5-20d92f91293d') and not exists (select 1 from public.learning_object_example_translations where example_id = 'ee4ffc3e-a151-422f-a0d5-20d92f91293d' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '6f276ea3-91ff-4e1e-96cc-1a2ffb980de6', 'inserted:learning_object_example_translations', '94a245ac-522c-44a4-9ece-3b19695ffe15', null, 'He tackled the task as if it were easy.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '94a245ac-522c-44a4-9ece-3b19695ffe15') and not exists (select 1 from public.learning_object_example_translations where example_id = '94a245ac-522c-44a4-9ece-3b19695ffe15' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '94a245ac-522c-44a4-9ece-3b19695ffe15', 'en', 'He tackled the task as if it were easy.' where exists (select 1 from public.learning_object_examples where id = '94a245ac-522c-44a4-9ece-3b19695ffe15') and not exists (select 1 from public.learning_object_example_translations where example_id = '94a245ac-522c-44a4-9ece-3b19695ffe15' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '247841d3-2c72-4448-bc6a-8c2bcfc3a2b4', 'inserted:learning_object_example_translations', 'e2970941-fdac-45de-ab2c-e06928b6788a', null, 'We have limited time today.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'e2970941-fdac-45de-ab2c-e06928b6788a') and not exists (select 1 from public.learning_object_example_translations where example_id = 'e2970941-fdac-45de-ab2c-e06928b6788a' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'e2970941-fdac-45de-ab2c-e06928b6788a', 'en', 'We have limited time today.' where exists (select 1 from public.learning_object_examples where id = 'e2970941-fdac-45de-ab2c-e06928b6788a') and not exists (select 1 from public.learning_object_example_translations where example_id = 'e2970941-fdac-45de-ab2c-e06928b6788a' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '271bcd08-6bb2-4a6d-8165-3dbda91481e6', 'inserted:learning_object_example_translations', '85e1ae42-4659-4ba7-9cfa-c22ca78cf6e2', null, 'The landowner decided who was allowed to use the road.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '85e1ae42-4659-4ba7-9cfa-c22ca78cf6e2') and not exists (select 1 from public.learning_object_example_translations where example_id = '85e1ae42-4659-4ba7-9cfa-c22ca78cf6e2' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '85e1ae42-4659-4ba7-9cfa-c22ca78cf6e2', 'en', 'The landowner decided who was allowed to use the road.' where exists (select 1 from public.learning_object_examples where id = '85e1ae42-4659-4ba7-9cfa-c22ca78cf6e2') and not exists (select 1 from public.learning_object_example_translations where example_id = '85e1ae42-4659-4ba7-9cfa-c22ca78cf6e2' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '3906f270-b2fd-421b-93de-07edb221b0b1', 'inserted:learning_object_example_translations', '5455fe50-7147-4ad2-8c49-33345e92fa76', null, 'Fermentation is used when making bread or beer.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '5455fe50-7147-4ad2-8c49-33345e92fa76') and not exists (select 1 from public.learning_object_example_translations where example_id = '5455fe50-7147-4ad2-8c49-33345e92fa76' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '5455fe50-7147-4ad2-8c49-33345e92fa76', 'en', 'Fermentation is used when making bread or beer.' where exists (select 1 from public.learning_object_examples where id = '5455fe50-7147-4ad2-8c49-33345e92fa76') and not exists (select 1 from public.learning_object_example_translations where example_id = '5455fe50-7147-4ad2-8c49-33345e92fa76' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '7a34ba0d-03e8-4470-b401-946ac1ab303c', 'inserted:learning_object_example_translations', '09fbd4e7-f124-4b7b-a4d1-1dd8bacbcf3b', null, 'Customary law can be important in older societies.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '09fbd4e7-f124-4b7b-a4d1-1dd8bacbcf3b') and not exists (select 1 from public.learning_object_example_translations where example_id = '09fbd4e7-f124-4b7b-a4d1-1dd8bacbcf3b' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '09fbd4e7-f124-4b7b-a4d1-1dd8bacbcf3b', 'en', 'Customary law can be important in older societies.' where exists (select 1 from public.learning_object_examples where id = '09fbd4e7-f124-4b7b-a4d1-1dd8bacbcf3b') and not exists (select 1 from public.learning_object_example_translations where example_id = '09fbd4e7-f124-4b7b-a4d1-1dd8bacbcf3b' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '937bff7d-8e51-4a7b-b035-3eb863e301ec', 'inserted:learning_object_example_translations', '655db660-ad4a-4218-957c-09b5d5156490', null, 'Everyone is allowed to walk, cycle, and camp here under the right of public access.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '655db660-ad4a-4218-957c-09b5d5156490') and not exists (select 1 from public.learning_object_example_translations where example_id = '655db660-ad4a-4218-957c-09b5d5156490' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '655db660-ad4a-4218-957c-09b5d5156490', 'en', 'Everyone is allowed to walk, cycle, and camp here under the right of public access.' where exists (select 1 from public.learning_object_examples where id = '655db660-ad4a-4218-957c-09b5d5156490') and not exists (select 1 from public.learning_object_example_translations where example_id = '655db660-ad4a-4218-957c-09b5d5156490' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, 'b93f5ece-9a71-496b-ab30-51d16fabf4f4', 'inserted:learning_object_example_translations', 'eb6c5558-80e8-424e-9ccd-9e1a28c84ade', null, 'He walked very carefully on the ice.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'eb6c5558-80e8-424e-9ccd-9e1a28c84ade') and not exists (select 1 from public.learning_object_example_translations where example_id = 'eb6c5558-80e8-424e-9ccd-9e1a28c84ade' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'eb6c5558-80e8-424e-9ccd-9e1a28c84ade', 'en', 'He walked very carefully on the ice.' where exists (select 1 from public.learning_object_examples where id = 'eb6c5558-80e8-424e-9ccd-9e1a28c84ade') and not exists (select 1 from public.learning_object_example_translations where example_id = 'eb6c5558-80e8-424e-9ccd-9e1a28c84ade' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '9be10cc2-10c8-4f1a-a39e-e34499725c8f', 'inserted:learning_object_example_translations', '1dd31b49-1ed8-4bb0-a8bc-08e215d0678c', null, 'Snow clearing is necessary after heavy snowfall.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '1dd31b49-1ed8-4bb0-a8bc-08e215d0678c') and not exists (select 1 from public.learning_object_example_translations where example_id = '1dd31b49-1ed8-4bb0-a8bc-08e215d0678c' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '1dd31b49-1ed8-4bb0-a8bc-08e215d0678c', 'en', 'Snow clearing is necessary after heavy snowfall.' where exists (select 1 from public.learning_object_examples where id = '1dd31b49-1ed8-4bb0-a8bc-08e215d0678c') and not exists (select 1 from public.learning_object_example_translations where example_id = '1dd31b49-1ed8-4bb0-a8bc-08e215d0678c' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '9be10cc2-10c8-4f1a-a39e-e34499725c8f', 'inserted:learning_object_example_translations', '5c997f63-0fdb-4b55-a636-8628a5611d12', null, 'He is tired after several hours of shoveling snow.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '5c997f63-0fdb-4b55-a636-8628a5611d12') and not exists (select 1 from public.learning_object_example_translations where example_id = '5c997f63-0fdb-4b55-a636-8628a5611d12' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '5c997f63-0fdb-4b55-a636-8628a5611d12', 'en', 'He is tired after several hours of shoveling snow.' where exists (select 1 from public.learning_object_examples where id = '5c997f63-0fdb-4b55-a636-8628a5611d12') and not exists (select 1 from public.learning_object_example_translations where example_id = '5c997f63-0fdb-4b55-a636-8628a5611d12' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '5491eb4f-b579-499c-8b7f-7da27d01e445', 'inserted:learning_object_example_translations', 'afe53b9d-98fc-434e-a31b-01662561d9b8', null, 'The soup became creamy after I blended it.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'afe53b9d-98fc-434e-a31b-01662561d9b8') and not exists (select 1 from public.learning_object_example_translations where example_id = 'afe53b9d-98fc-434e-a31b-01662561d9b8' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'afe53b9d-98fc-434e-a31b-01662561d9b8', 'en', 'The soup became creamy after I blended it.' where exists (select 1 from public.learning_object_examples where id = 'afe53b9d-98fc-434e-a31b-01662561d9b8') and not exists (select 1 from public.learning_object_example_translations where example_id = 'afe53b9d-98fc-434e-a31b-01662561d9b8' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '5491eb4f-b579-499c-8b7f-7da27d01e445', 'inserted:learning_object_example_translations', '288907b4-5580-47ef-89d7-d0702bbb111b', null, 'We ate a creamy mushroom pasta sauce.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '288907b4-5580-47ef-89d7-d0702bbb111b') and not exists (select 1 from public.learning_object_example_translations where example_id = '288907b4-5580-47ef-89d7-d0702bbb111b' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '288907b4-5580-47ef-89d7-d0702bbb111b', 'en', 'We ate a creamy mushroom pasta sauce.' where exists (select 1 from public.learning_object_examples where id = '288907b4-5580-47ef-89d7-d0702bbb111b') and not exists (select 1 from public.learning_object_example_translations where example_id = '288907b4-5580-47ef-89d7-d0702bbb111b' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '99c30570-3a49-45e8-be19-56911b855d8b', 'inserted:learning_object_example_translations', 'd6ec0e4e-ad46-41ec-ac02-b7964abd6169', null, 'The soup became extra creamy with a little milk and butter.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'd6ec0e4e-ad46-41ec-ac02-b7964abd6169') and not exists (select 1 from public.learning_object_example_translations where example_id = 'd6ec0e4e-ad46-41ec-ac02-b7964abd6169' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'd6ec0e4e-ad46-41ec-ac02-b7964abd6169', 'en', 'The soup became extra creamy with a little milk and butter.' where exists (select 1 from public.learning_object_examples where id = 'd6ec0e4e-ad46-41ec-ac02-b7964abd6169') and not exists (select 1 from public.learning_object_example_translations where example_id = 'd6ec0e4e-ad46-41ec-ac02-b7964abd6169' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '99c30570-3a49-45e8-be19-56911b855d8b', 'inserted:learning_object_example_translations', 'b1444424-02b2-415a-83e7-19d1cd4c8888', null, 'She bought a creamy sauce for the pasta.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'b1444424-02b2-415a-83e7-19d1cd4c8888') and not exists (select 1 from public.learning_object_example_translations where example_id = 'b1444424-02b2-415a-83e7-19d1cd4c8888' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'b1444424-02b2-415a-83e7-19d1cd4c8888', 'en', 'She bought a creamy sauce for the pasta.' where exists (select 1 from public.learning_object_examples where id = 'b1444424-02b2-415a-83e7-19d1cd4c8888') and not exists (select 1 from public.learning_object_example_translations where example_id = 'b1444424-02b2-415a-83e7-19d1cd4c8888' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '6f227509-7c58-474d-8903-1d74d1d5dbf7', 'inserted:learning_object_example_translations', 'cf82172d-09f4-48a9-ad51-551189346df8', null, 'You need to relax after work.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'cf82172d-09f4-48a9-ad51-551189346df8') and not exists (select 1 from public.learning_object_example_translations where example_id = 'cf82172d-09f4-48a9-ad51-551189346df8' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'cf82172d-09f4-48a9-ad51-551189346df8', 'en', 'You need to relax after work.' where exists (select 1 from public.learning_object_examples where id = 'cf82172d-09f4-48a9-ad51-551189346df8') and not exists (select 1 from public.learning_object_example_translations where example_id = 'cf82172d-09f4-48a9-ad51-551189346df8' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '6f227509-7c58-474d-8903-1d74d1d5dbf7', 'inserted:learning_object_example_translations', '28ed2b7f-d1b3-4d0b-a0a9-d6525b53468f', null, 'She relaxed when she got home.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '28ed2b7f-d1b3-4d0b-a0a9-d6525b53468f') and not exists (select 1 from public.learning_object_example_translations where example_id = '28ed2b7f-d1b3-4d0b-a0a9-d6525b53468f' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '28ed2b7f-d1b3-4d0b-a0a9-d6525b53468f', 'en', 'She relaxed when she got home.' where exists (select 1 from public.learning_object_examples where id = '28ed2b7f-d1b3-4d0b-a0a9-d6525b53468f') and not exists (select 1 from public.learning_object_example_translations where example_id = '28ed2b7f-d1b3-4d0b-a0a9-d6525b53468f' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '44d01caa-b486-4098-98ad-3a213267f7e7', 'inserted:learning_object_example_translations', '5afcef25-0857-4e21-aa15-a2965c9d2001', null, 'We rearranged the furniture in the living room.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '5afcef25-0857-4e21-aa15-a2965c9d2001') and not exists (select 1 from public.learning_object_example_translations where example_id = '5afcef25-0857-4e21-aa15-a2965c9d2001' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '5afcef25-0857-4e21-aa15-a2965c9d2001', 'en', 'We rearranged the furniture in the living room.' where exists (select 1 from public.learning_object_examples where id = '5afcef25-0857-4e21-aa15-a2965c9d2001') and not exists (select 1 from public.learning_object_example_translations where example_id = '5afcef25-0857-4e21-aa15-a2965c9d2001' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '44d01caa-b486-4098-98ad-3a213267f7e7', 'inserted:learning_object_example_translations', '8a9b0a5d-b290-4562-8720-2301c8f3b2e2', null, 'Traffic was rerouted after the accident.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '8a9b0a5d-b290-4562-8720-2301c8f3b2e2') and not exists (select 1 from public.learning_object_example_translations where example_id = '8a9b0a5d-b290-4562-8720-2301c8f3b2e2' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '8a9b0a5d-b290-4562-8720-2301c8f3b2e2', 'en', 'Traffic was rerouted after the accident.' where exists (select 1 from public.learning_object_examples where id = '8a9b0a5d-b290-4562-8720-2301c8f3b2e2') and not exists (select 1 from public.learning_object_example_translations where example_id = '8a9b0a5d-b290-4562-8720-2301c8f3b2e2' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, 'd719caa5-fa9f-4fe7-9813-290f018026e7', 'inserted:learning_object_example_translations', 'e728ee9b-31dd-474b-810c-f51d836f53d4', null, 'We divide the class into two groups.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'e728ee9b-31dd-474b-810c-f51d836f53d4') and not exists (select 1 from public.learning_object_example_translations where example_id = 'e728ee9b-31dd-474b-810c-f51d836f53d4' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'e728ee9b-31dd-474b-810c-f51d836f53d4', 'en', 'We divide the class into two groups.' where exists (select 1 from public.learning_object_examples where id = 'e728ee9b-31dd-474b-810c-f51d836f53d4') and not exists (select 1 from public.learning_object_example_translations where example_id = 'e728ee9b-31dd-474b-810c-f51d836f53d4' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, 'd719caa5-fa9f-4fe7-9813-290f018026e7', 'inserted:learning_object_example_translations', '5bed5d39-6f9c-4f1f-a0ac-6890d74767af', null, 'She divided the money among her children.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '5bed5d39-6f9c-4f1f-a0ac-6890d74767af') and not exists (select 1 from public.learning_object_example_translations where example_id = '5bed5d39-6f9c-4f1f-a0ac-6890d74767af' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '5bed5d39-6f9c-4f1f-a0ac-6890d74767af', 'en', 'She divided the money among her children.' where exists (select 1 from public.learning_object_examples where id = '5bed5d39-6f9c-4f1f-a0ac-6890d74767af') and not exists (select 1 from public.learning_object_example_translations where example_id = '5bed5d39-6f9c-4f1f-a0ac-6890d74767af' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '6aac9c86-6d15-4a91-acb1-b23aa79136c0', 'inserted:learning_object_example_translations', 'e8fac370-022c-4f88-a21b-9ae4bf556a52', null, 'His comments upset many people in the audience.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'e8fac370-022c-4f88-a21b-9ae4bf556a52') and not exists (select 1 from public.learning_object_example_translations where example_id = 'e8fac370-022c-4f88-a21b-9ae4bf556a52' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'e8fac370-022c-4f88-a21b-9ae4bf556a52', 'en', 'His comments upset many people in the audience.' where exists (select 1 from public.learning_object_examples where id = 'e8fac370-022c-4f88-a21b-9ae4bf556a52') and not exists (select 1 from public.learning_object_example_translations where example_id = 'e8fac370-022c-4f88-a21b-9ae4bf556a52' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '6aac9c86-6d15-4a91-acb1-b23aa79136c0', 'inserted:learning_object_example_translations', '922931d8-8dcb-42af-8560-10ef144ede09', null, 'Try not to provoke the dog.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '922931d8-8dcb-42af-8560-10ef144ede09') and not exists (select 1 from public.learning_object_example_translations where example_id = '922931d8-8dcb-42af-8560-10ef144ede09' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '922931d8-8dcb-42af-8560-10ef144ede09', 'en', 'Try not to provoke the dog.' where exists (select 1 from public.learning_object_examples where id = '922931d8-8dcb-42af-8560-10ef144ede09') and not exists (select 1 from public.learning_object_example_translations where example_id = '922931d8-8dcb-42af-8560-10ef144ede09' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '04670310-9cc9-4a5c-b78d-7fd6425b1b32', 'inserted:learning_object_example_translations', '863eea3d-bece-447d-a6ef-4e4bc659914d', null, 'I grew up in Gothenburg.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '863eea3d-bece-447d-a6ef-4e4bc659914d') and not exists (select 1 from public.learning_object_example_translations where example_id = '863eea3d-bece-447d-a6ef-4e4bc659914d' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '863eea3d-bece-447d-a6ef-4e4bc659914d', 'en', 'I grew up in Gothenburg.' where exists (select 1 from public.learning_object_examples where id = '863eea3d-bece-447d-a6ef-4e4bc659914d') and not exists (select 1 from public.learning_object_example_translations where example_id = '863eea3d-bece-447d-a6ef-4e4bc659914d' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, '04670310-9cc9-4a5c-b78d-7fd6425b1b32', 'inserted:learning_object_example_translations', 'e030915e-cd9d-486b-88b8-1510e29af2bd', null, 'Children grow up quickly.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'e030915e-cd9d-486b-88b8-1510e29af2bd') and not exists (select 1 from public.learning_object_example_translations where example_id = 'e030915e-cd9d-486b-88b8-1510e29af2bd' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'e030915e-cd9d-486b-88b8-1510e29af2bd', 'en', 'Children grow up quickly.' where exists (select 1 from public.learning_object_examples where id = 'e030915e-cd9d-486b-88b8-1510e29af2bd') and not exists (select 1 from public.learning_object_example_translations where example_id = 'e030915e-cd9d-486b-88b8-1510e29af2bd' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, 'd8fddd3e-f1da-46e0-82a4-f99fd51d4b0e', 'inserted:learning_object_example_translations', '4761a9e1-7ce8-4269-b1f4-fee7f9c859d2', null, 'The old shoes are almost completely worn out.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = '4761a9e1-7ce8-4269-b1f4-fee7f9c859d2') and not exists (select 1 from public.learning_object_example_translations where example_id = '4761a9e1-7ce8-4269-b1f4-fee7f9c859d2' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select '4761a9e1-7ce8-4269-b1f4-fee7f9c859d2', 'en', 'The old shoes are almost completely worn out.' where exists (select 1 from public.learning_object_examples where id = '4761a9e1-7ce8-4269-b1f4-fee7f9c859d2') and not exists (select 1 from public.learning_object_example_translations where example_id = '4761a9e1-7ce8-4269-b1f4-fee7f9c859d2' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, 'd8fddd3e-f1da-46e0-82a4-f99fd51d4b0e', 'inserted:learning_object_example_translations', 'd670d7c3-f587-438c-b268-46370f5414bc', null, 'He worked so much that he almost exhausted himself.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'd670d7c3-f587-438c-b268-46370f5414bc') and not exists (select 1 from public.learning_object_example_translations where example_id = 'd670d7c3-f587-438c-b268-46370f5414bc' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'd670d7c3-f587-438c-b268-46370f5414bc', 'en', 'He worked so much that he almost exhausted himself.' where exists (select 1 from public.learning_object_examples where id = 'd670d7c3-f587-438c-b268-46370f5414bc') and not exists (select 1 from public.learning_object_example_translations where example_id = 'd670d7c3-f587-438c-b268-46370f5414bc' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, 'f8fe915e-e74b-4e49-9d43-ad0d4757f609', 'inserted:learning_object_example_translations', 'bc1734e9-4239-484c-9208-44dc3ba87858', null, 'The teacher bored the students with a long lecture.', 'english_gap_fill'
where exists (select 1 from public.learning_object_examples where id = 'bc1734e9-4239-484c-9208-44dc3ba87858') and not exists (select 1 from public.learning_object_example_translations where example_id = 'bc1734e9-4239-484c-9208-44dc3ba87858' and native_language = 'en');
insert into public.learning_object_example_translations (example_id, native_language, translation)
select 'bc1734e9-4239-484c-9208-44dc3ba87858', 'en', 'The teacher bored the students with a long lecture.' where exists (select 1 from public.learning_object_examples where id = 'bc1734e9-4239-484c-9208-44dc3ba87858') and not exists (select 1 from public.learning_object_example_translations where example_id = 'bc1734e9-4239-484c-9208-44dc3ba87858' and native_language = 'en');
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Parents can share 480 days of leave while keeping their pay.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '004dcb94-cbb1-49d1-8b81-182ae92def25' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Parents can share 480 days of leave while keeping their pay.', updated_at = now() where learning_object_id = '004dcb94-cbb1-49d1-8b81-182ae92def25' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'It felt as if Christer was going behind her back.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '006a8d9b-742b-4998-9e37-4a0ab6d743e2' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'It felt as if Christer was going behind her back.', updated_at = now() where learning_object_id = '006a8d9b-742b-4998-9e37-4a0ab6d743e2' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'She pulled her jacket more tightly around herself and stood still for a moment before starting to walk toward the preschool, even though she knew they would be closing soon and that every minute''s delay always gave her the same pang of guilt.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '01a41248-5f93-42a1-8277-1085b4fef5b1' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'She pulled her jacket more tightly around herself and stood still for a moment before starting to walk toward the preschool, even though she knew they would be closing soon and that every minute''s delay always gave her the same pang of guilt.', updated_at = now() where learning_object_id = '01a41248-5f93-42a1-8277-1085b4fef5b1' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'This often happened in connection with the ''crayfish party,'' which was a festive way of saying farewell to summer and welcoming the approaching autumn.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '0238b37e-e7e0-4168-a0f5-976e16ff676e' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'This often happened in connection with the ''crayfish party,'' which was a festive way of saying farewell to summer and welcoming the approaching autumn.', updated_at = now() where learning_object_id = '0238b37e-e7e0-4168-a0f5-976e16ff676e' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'In autumn, it gets colder again.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '03dc87e2-f020-4802-ac88-aa63b86ed64b' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'In autumn, it gets colder again.', updated_at = now() where learning_object_id = '03dc87e2-f020-4802-ac88-aa63b86ed64b' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Many fathers choose to go back to work early, while the mothers stay home longer.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '05b192ca-de49-43b1-8662-7913131d41d8' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Many fathers choose to go back to work early, while the mothers stay home longer.', updated_at = now() where learning_object_id = '05b192ca-de49-43b1-8662-7913131d41d8' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'At the same time, jobseekers are required to attend meetings, follow the rules, and take reasonable job opportunities seriously.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '07316aaa-7639-4022-964a-d2e578672e8d' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'At the same time, jobseekers are required to attend meetings, follow the rules, and take reasonable job opportunities seriously.', updated_at = now() where learning_object_id = '07316aaa-7639-4022-964a-d2e578672e8d' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Sweden has a generous parental-leave system.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '083a43df-316e-4d08-85c9-09ff3b928d9e' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Sweden has a generous parental-leave system.', updated_at = now() where learning_object_id = '083a43df-316e-4d08-85c9-09ff3b928d9e' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Perhaps she was waiting not only for him alone, but also for the moment when the day would finally feel whole, when work and family would no longer pull in opposite directions but could fit within the same breath.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '0cefefd1-b788-41d0-affa-d4dedcfc2fac' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Perhaps she was waiting not only for him alone, but also for the moment when the day would finally feel whole, when work and family would no longer pull in opposite directions but could fit within the same breath.', updated_at = now() where learning_object_id = '0cefefd1-b788-41d0-affa-d4dedcfc2fac' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'It is often best to start with the most recent thing first, so that the employer quickly sees what you are doing now or what you did most recently.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '0d49409d-4918-473f-9206-ed0803dae420' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'It is often best to start with the most recent thing first, so that the employer quickly sees what you are doing now or what you did most recently.', updated_at = now() where learning_object_id = '0d49409d-4918-473f-9206-ed0803dae420' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Many people like these days, because that''s when you meet family and friends and eat good food.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '0dcf3956-c8ac-4fcc-bf78-74fddef2ccc6' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Many people like these days, because that''s when you meet family and friends and eat good food.', updated_at = now() where learning_object_id = '0dcf3956-c8ac-4fcc-bf78-74fddef2ccc6' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'After work I go home and cook.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '0f4c98ad-f644-4085-ae6e-485870080765' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'After work I go home and cook.', updated_at = now() where learning_object_id = '0f4c98ad-f644-4085-ae6e-485870080765' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The oldest fish-fermentation facility known to us was located in southern Sweden, at Norje Sunnansund, about 9,000 years ago.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '16cd1d43-581c-48b1-9bf9-ee92ae6a6a6b' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The oldest fish-fermentation facility known to us was located in southern Sweden, at Norje Sunnansund, about 9,000 years ago.', updated_at = now() where learning_object_id = '16cd1d43-581c-48b1-9bf9-ee92ae6a6a6b' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The foundation engages in charity work in several countries.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '1a0dae1e-e39a-4b7c-ac95-c109b18413ad' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The foundation engages in charity work in several countries.', updated_at = now() where learning_object_id = '1a0dae1e-e39a-4b7c-ac95-c109b18413ad' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'It often rains, but the sun comes out too.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '1a53eed0-5ffa-46e4-bd4e-341c459c21b9' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'It often rains, but the sun comes out too.', updated_at = now() where learning_object_id = '1a53eed0-5ffa-46e4-bd4e-341c459c21b9' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Even though summer in Sweden is short, many Swedes love spending time outdoors.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '1c4b6c54-92e3-4d9a-b819-c5a82da79f55' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Even though summer in Sweden is short, many Swedes love spending time outdoors.', updated_at = now() where learning_object_id = '1c4b6c54-92e3-4d9a-b819-c5a82da79f55' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Astrid had always dreamed of becoming a writer, even though everyone in her family thought it was a bad career choice.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '1de2d153-f144-4e63-8bcb-2332d6a025dd' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Astrid had always dreamed of becoming a writer, even though everyone in her family thought it was a bad career choice.', updated_at = now() where learning_object_id = '1de2d153-f144-4e63-8bcb-2332d6a025dd' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'She knew that she still had a lot left to get used to, but now there was at least one face in the house that she recognized.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '1e0a67b3-7a3b-4f1c-afbc-61e119b3b485' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'She knew that she still had a lot left to get used to, but now there was at least one face in the house that she recognized.', updated_at = now() where learning_object_id = '1e0a67b3-7a3b-4f1c-afbc-61e119b3b485' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The word midsommar, on the other hand, appears to be pre-Christian, and originally referred to the beginning of the third quarter, 20-22 July—that is, a month later than the Christian Midsummer celebration.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '209bf0c5-7b59-4149-b08d-c2ada39e36a6' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The word midsommar, on the other hand, appears to be pre-Christian, and originally referred to the beginning of the third quarter, 20-22 July—that is, a month later than the Christian Midsummer celebration.', updated_at = now() where learning_object_id = '209bf0c5-7b59-4149-b08d-c2ada39e36a6' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'For then you will better understand why the people here in the valley slave and starve and die with only one thought and dream—to see their valley free again.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '233054c1-ace6-4861-ba77-ae83c6215600' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'For then you will better understand why the people here in the valley slave and starve and die with only one thought and dream—to see their valley free again.', updated_at = now() where learning_object_id = '233054c1-ace6-4861-ba77-ae83c6215600' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'We need to buy food this week.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '23d2a8d7-609f-42ca-8d7f-f331380cb2ac' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'We need to buy food this week.', updated_at = now() where learning_object_id = '23d2a8d7-609f-42ca-8d7f-f331380cb2ac' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'In time she learned to trust her own voice instead of comparing herself to others.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '2db3e053-f919-4e32-be07-ab3556b38398' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'In time she learned to trust her own voice instead of comparing herself to others.', updated_at = now() where learning_object_id = '2db3e053-f919-4e32-be07-ab3556b38398' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Tourists come from all over the world to hike in the Swedish countryside.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '2db72ae9-481e-4acb-9168-03988a146d12' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Tourists come from all over the world to hike in the Swedish countryside.', updated_at = now() where learning_object_id = '2db72ae9-481e-4acb-9168-03988a146d12' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'In recent years, the right of public access has been explicitly written into law in Sweden and Norway, but even in these countries the rules are still based largely on customary law and on an argument by contrast from certain legal provisions stating what is forbidden; such an argument by contrast means that what is not forbidden is permitted.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '304506a6-e498-46d3-bd65-464f2cc26466' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'In recent years, the right of public access has been explicitly written into law in Sweden and Norway, but even in these countries the rules are still based largely on customary law and on an argument by contrast from certain legal provisions stating what is forbidden; such an argument by contrast means that what is not forbidden is permitted.', updated_at = now() where learning_object_id = '304506a6-e498-46d3-bd65-464f2cc26466' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Surströmming is Baltic herring that has been preserved through fermentation.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '31625dc7-cd50-43b6-b905-022a1c4e4a18' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Surströmming is Baltic herring that has been preserved through fermentation.', updated_at = now() where learning_object_id = '31625dc7-cd50-43b6-b905-022a1c4e4a18' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Navid''s dark gaze hit her like a gunshot.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '3177a844-135f-43b1-b532-c3a0e6be9726' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Navid''s dark gaze hit her like a gunshot.', updated_at = now() where learning_object_id = '3177a844-135f-43b1-b532-c3a0e6be9726' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'But her friends told her that she had done the right thing.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '31b0537a-6922-4e31-9e62-5804ac392c84' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'But her friends told her that she had done the right thing.', updated_at = now() where learning_object_id = '31b0537a-6922-4e31-9e62-5804ac392c84' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'A flash of lightning lit up the cottage, and the thunder followed close behind.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '36f5f2f4-19a3-4a80-87da-35e510189a11' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'A flash of lightning lit up the cottage, and the thunder followed close behind.', updated_at = now() where learning_object_id = '36f5f2f4-19a3-4a80-87da-35e510189a11' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The washed fish is salted, placed in open containers, and left to ferment, as the herring, through autolysis—that is, through its own enzymes—and together with bacteria, forms strongly smelling acids such as propionic acid, butyric acid, and acetic acid from the simple sugars in the fish.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '3803bdd3-d586-40da-a30e-39d250832880' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The washed fish is salted, placed in open containers, and left to ferment, as the herring, through autolysis—that is, through its own enzymes—and together with bacteria, forms strongly smelling acids such as propionic acid, butyric acid, and acetic acid from the simple sugars in the fish.', updated_at = now() where learning_object_id = '3803bdd3-d586-40da-a30e-39d250832880' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Or they gang up...', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '38bcb5c8-48d2-4292-98bb-ad4a24a16ecb' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Or they gang up...', updated_at = now() where learning_object_id = '38bcb5c8-48d2-4292-98bb-ad4a24a16ecb' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'In the end, she got her first book published, and it felt as if all the hard work had finally paid off.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '39191751-0845-48a9-a6fb-f9c3247ceb9a' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'In the end, she got her first book published, and it felt as if all the hard work had finally paid off.', updated_at = now() where learning_object_id = '39191751-0845-48a9-a6fb-f9c3247ceb9a' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The right of public access is a right for everyone to travel across private land in nature, to stay there temporarily, and, for example, to pick berries, mushrooms, and certain other plants.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '3b06c31a-0e73-4622-b100-2f7720f4299b' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The right of public access is a right for everyone to travel across private land in nature, to stay there temporarily, and, for example, to pick berries, mushrooms, and certain other plants.', updated_at = now() where learning_object_id = '3b06c31a-0e73-4622-b100-2f7720f4299b' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Catrin guessed that she would be late and was already feeling irritated.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '3c28f793-db76-4f8a-ba98-693e347519d1' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Catrin guessed that she would be late and was already feeling irritated.', updated_at = now() where learning_object_id = '3c28f793-db76-4f8a-ba98-693e347519d1' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'In some places the bonfires are the most important thing, while student activities play a bigger role in other places.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '3d24f589-2a3a-4547-b6c1-45f38af16cbf' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'In some places the bonfires are the most important thing, while student activities play a bigger role in other places.', updated_at = now() where learning_object_id = '3d24f589-2a3a-4547-b6c1-45f38af16cbf' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Many therefore choose to travel to warmer countries during the winter months.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '3e93113b-eb58-4041-af60-00f8d718134a' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Many therefore choose to travel to warmer countries during the winter months.', updated_at = now() where learning_object_id = '3e93113b-eb58-4041-af60-00f8d718134a' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'That means that people in the country can help influence things by voting in elections, joining parties, contacting politicians, and taking part in public debate.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '4291ce3f-22ae-4fce-a0c7-fedb74cd3e47' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'That means that people in the country can help influence things by voting in elections, joining parties, contacting politicians, and taking part in public debate.', updated_at = now() where learning_object_id = '4291ce3f-22ae-4fce-a0c7-fedb74cd3e47' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The municipality is responsible for many services that people use often.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '4366a637-1d3d-45cd-b860-d4d5be90c80e' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The municipality is responsible for many services that people use often.', updated_at = now() where learning_object_id = '4366a637-1d3d-45cd-b860-d4d5be90c80e' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'It is an old tradition that marks the arrival of spring and the beginning of the warmer part of the year.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '4c0a5ee7-3a1a-43d4-8e9c-b5eeede8f9ca' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'It is an old tradition that marks the arrival of spring and the beginning of the warmer part of the year.', updated_at = now() where learning_object_id = '4c0a5ee7-3a1a-43d4-8e9c-b5eeede8f9ca' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Then you can include your education, work experience, and other skills that are important for the position.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '508953df-7601-43bd-8fe1-2fc525bc5cd6' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Then you can include your education, work experience, and other skills that are important for the position.', updated_at = now() where learning_object_id = '508953df-7601-43bd-8fe1-2fc525bc5cd6' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The government is trying to change this by introducing a special dads'' month.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '5480baf2-fd8e-450d-a469-e2998bedc066' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The government is trying to change this by introducing a special dads'' month.', updated_at = now() where learning_object_id = '5480baf2-fd8e-450d-a469-e2998bedc066' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'And the little pocket thought that Dossy must live in a big house suited to her size. A big house at the end of a very, very long street. With a garden. And plum trees. And a piano in the room facing the street. And a piano stool that you could spin round and round on. And candies in a blue tin on the mantelpiece that the father reached for and said, have a striped one, girl, they last a long time.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '57c3e205-dcf3-4037-8c81-f00ece6432d9' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'And the little pocket thought that Dossy must live in a big house suited to her size. A big house at the end of a very, very long street. With a garden. And plum trees. And a piano in the room facing the street. And a piano stool that you could spin round and round on. And candies in a blue tin on the mantelpiece that the father reached for and said, have a striped one, girl, they last a long time.', updated_at = now() where learning_object_id = '57c3e205-dcf3-4037-8c81-f00ece6432d9' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'With a well-planned schedule, we managed to fit in all the meetings.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '59274bed-6fe5-444d-9312-affa8fa4c16b' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'With a well-planned schedule, we managed to fit in all the meetings.', updated_at = now() where learning_object_id = '59274bed-6fe5-444d-9312-affa8fa4c16b' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Everyone wore funny hats and sang drinking songs between the courses.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '5c0b0e9d-49f7-4909-a8cb-357b7d97b8ee' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Everyone wore funny hats and sang drinking songs between the courses.', updated_at = now() where learning_object_id = '5c0b0e9d-49f7-4909-a8cb-357b7d97b8ee' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Such places are found primarily in sparsely populated areas.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '5c1d1e46-3502-4908-8e25-fdbbd9fe9621' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Such places are found primarily in sparsely populated areas.', updated_at = now() where learning_object_id = '5c1d1e46-3502-4908-8e25-fdbbd9fe9621' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Once, when my mother was six and Lonny was eleven, they went out picking blueberries.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '5fc4c286-6c24-478b-9485-efd77283aa6c' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Once, when my mother was six and Lonny was eleven, they went out picking blueberries.', updated_at = now() where learning_object_id = '5fc4c286-6c24-478b-9485-efd77283aa6c' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Put simply, you could say that the right of public access is laws that help people be in nature without destroying it and to take good care of it.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '60268a99-bf5b-45e3-a283-352dfd4c1f53' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Put simply, you could say that the right of public access is laws that help people be in nature without destroying it and to take good care of it.', updated_at = now() where learning_object_id = '60268a99-bf5b-45e3-a283-352dfd4c1f53' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Catrin found it hard to enjoy such things these days.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '60f82848-c614-4812-b153-68979795d021' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Catrin found it hard to enjoy such things these days.', updated_at = now() where learning_object_id = '60f82848-c614-4812-b153-68979795d021' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, id, 'learning_objects', 'example_sv', example_sv, 'I Sverige kan klimatförändringarna leda till att det blir vanligare med kraftiga regn som leder till översvämningar.', 'ocr_line_breaks_joined' from public.learning_objects where id = '632c3222-b009-40a9-a4ea-1d0cb6807d36' and example_sv = 'I Sverige kan klimatförändringarna leda till att det blir vanligare med kraf-
tiga regn som leder till översvämningar.';
update public.learning_objects set example_sv = 'I Sverige kan klimatförändringarna leda till att det blir vanligare med kraftiga regn som leder till översvämningar.', updated_at = now() where id = '632c3222-b009-40a9-a4ea-1d0cb6807d36' and example_sv = 'I Sverige kan klimatförändringarna leda till att det blir vanligare med kraf-
tiga regn som leder till översvämningar.';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'In Sweden, climate change may lead to heavy rain becoming more common, which can lead to flooding.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '632c3222-b009-40a9-a4ea-1d0cb6807d36' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'In Sweden, climate change may lead to heavy rain becoming more common, which can lead to flooding.', updated_at = now() where learning_object_id = '632c3222-b009-40a9-a4ea-1d0cb6807d36' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'She had tried to set rules for that phone, but nothing seemed to help.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '63fbeb49-845e-4f2a-8eab-613858713ef4' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'She had tried to set rules for that phone, but nothing seemed to help.', updated_at = now() where learning_object_id = '63fbeb49-845e-4f2a-8eab-613858713ef4' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'In recent years, the right of public access has been explicitly written into law in Sweden and Norway, but even in these countries the rules are based largely on customary law and on an argument-from-the-opposite interpretation of certain legal provisions that state what is forbidden; such an interpretation means that what is not forbidden is permitted.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '67bbfff1-594c-4468-9c5a-b514b5366702' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'In recent years, the right of public access has been explicitly written into law in Sweden and Norway, but even in these countries the rules are based largely on customary law and on an argument-from-the-opposite interpretation of certain legal provisions that state what is forbidden; such an interpretation means that what is not forbidden is permitted.', updated_at = now() where learning_object_id = '67bbfff1-594c-4468-9c5a-b514b5366702' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'In common usage, the word midsommar shifted from referring to the quarter-day change in July to referring to the Christian celebration of John the Baptist in June.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6c16a2de-1376-40ff-be32-e61be82ceb37' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'In common usage, the word midsommar shifted from referring to the quarter-day change in July to referring to the Christian celebration of John the Baptist in June.', updated_at = now() where learning_object_id = '6c16a2de-1376-40ff-be32-e61be82ceb37' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'They were looking forward to going down to the beach and swimming the next day.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6cbaa778-d8b4-4479-a619-c5721cfe0cb5' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'They were looking forward to going down to the beach and swimming the next day.', updated_at = now() where learning_object_id = '6cbaa778-d8b4-4479-a619-c5721cfe0cb5' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'When they were about to go back, Lonny realized that they had gotten lost.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6debe466-5cd9-469b-8796-0484af26be0b' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'When they were about to go back, Lonny realized that they had gotten lost.', updated_at = now() where learning_object_id = '6debe466-5cd9-469b-8796-0484af26be0b' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'No, and we''re out of bread too.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '6f867311-e853-4207-aec2-4e7d4d616d81' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'No, and we''re out of bread too.', updated_at = now() where learning_object_id = '6f867311-e853-4207-aec2-4e7d4d616d81' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Finally there, they could breathe a sigh of relief.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '72184c45-065b-4b3f-8c0d-3ca499847803' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Finally there, they could breathe a sigh of relief.', updated_at = now() where learning_object_id = '72184c45-065b-4b3f-8c0d-3ca499847803' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The washed fish is salted, placed in open containers, and allowed to ferment, as the Baltic herring, through autolysis—that is, through its own enzymes—and together with bacteria forms strongly smelling acids such as propionic acid, butyric acid, and acetic acid from the simple sugars in the fish.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '73500459-df4c-474b-8c07-e5413c5db6dd' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The washed fish is salted, placed in open containers, and allowed to ferment, as the Baltic herring, through autolysis—that is, through its own enzymes—and together with bacteria forms strongly smelling acids such as propionic acid, butyric acid, and acetic acid from the simple sugars in the fish.', updated_at = now() where learning_object_id = '73500459-df4c-474b-8c07-e5413c5db6dd' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The Baltic herring is then put into cans to continue fermenting.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The Baltic herring is then put into cans to continue fermenting.', updated_at = now() where learning_object_id = '74bef913-4d95-4ac2-8a6a-8b6709d2a489' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The Christian Church has celebrated the birth of John the Baptist on June 24 since the 4th century, and brought this holiday to Sweden in the 11th century.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '76cb9306-d804-42ac-b360-65b2a711d513' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The Christian Church has celebrated the birth of John the Baptist on June 24 since the 4th century, and brought this holiday to Sweden in the 11th century.', updated_at = now() where learning_object_id = '76cb9306-d804-42ac-b360-65b2a711d513' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'She locked the door carefully and tried the handle to make sure it was properly locked.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '76fcacd6-4bdb-455d-90e1-f8d02dd4fcd0' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'She locked the door carefully and tried the handle to make sure it was properly locked.', updated_at = now() where learning_object_id = '76fcacd6-4bdb-455d-90e1-f8d02dd4fcd0' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The table was set with paper lanterns, crispbread, and a large cheese.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '818d3ffe-fcc2-4a8e-a156-a14becc6b146' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The table was set with paper lanterns, crispbread, and a large cheese.', updated_at = now() where learning_object_id = '818d3ffe-fcc2-4a8e-a156-a14becc6b146' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Surströmming is a Swedish specialty, especially from northern Sweden, that is produced on an industrial scale mainly along the High Coast.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '838bce2a-4923-44a1-a7cc-edf1c82543aa' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Surströmming is a Swedish specialty, especially from northern Sweden, that is produced on an industrial scale mainly along the High Coast.', updated_at = now() where learning_object_id = '838bce2a-4923-44a1-a7cc-edf1c82543aa' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'I think everyone ought to give it some thought and stop using social media, news updates, and other digital functions while the children are still small.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '86a53c55-243f-4d17-9665-9d182c53d13d' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'I think everyone ought to give it some thought and stop using social media, news updates, and other digital functions while the children are still small.', updated_at = now() where learning_object_id = '86a53c55-243f-4d17-9665-9d182c53d13d' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'We were just a little caught off guard.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '8818e49f-8dc7-42a0-bf8d-bcb6c19bc0e7' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'We were just a little caught off guard.', updated_at = now() where learning_object_id = '8818e49f-8dc7-42a0-bf8d-bcb6c19bc0e7' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'All day she had been sitting in meetings where people talked at length about planning, efficiency, and new goals, but now, when she heard her own footsteps heading toward the brightly lit entrance, all of it felt strangely distant, as if the workday already belonged to some other version of herself.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '8b5d204f-fe0a-4032-9366-c289bdc00e80' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'All day she had been sitting in meetings where people talked at length about planning, efficiency, and new goals, but now, when she heard her own footsteps heading toward the brightly lit entrance, all of it felt strangely distant, as if the workday already belonged to some other version of herself.', updated_at = now() where learning_object_id = '8b5d204f-fe0a-4032-9366-c289bdc00e80' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'On private land you may not move about freely; in principle you may walk on private roads and paths, but there are often problems when the roads pass through farmyards or when landowners block them off.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '8e30c619-e917-4ae2-bbb3-c582d1aaa782' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'On private land you may not move about freely; in principle you may walk on private roads and paths, but there are often problems when the roads pass through farmyards or when landowners block them off.', updated_at = now() where learning_object_id = '8e30c619-e917-4ae2-bbb3-c582d1aaa782' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'I''ve been taking it easy at home and drinking a lot of water, but it doesn''t feel any better.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '8e802578-0408-4970-96cc-6bd8ea38de8c' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'I''ve been taking it easy at home and drinking a lot of water, but it doesn''t feel any better.', updated_at = now() where learning_object_id = '8e802578-0408-4970-96cc-6bd8ea38de8c' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'There are comparatively few such court rulings, so many conflicts between landowners and users of the right of public access are rooted in uncertainty about exactly what that right includes and what falls outside it.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '9696bea9-c9ee-4ede-aefb-a63c08642097' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'There are comparatively few such court rulings, so many conflicts between landowners and users of the right of public access are rooted in uncertainty about exactly what that right includes and what falls outside it.', updated_at = now() where learning_object_id = '9696bea9-c9ee-4ede-aefb-a63c08642097' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'I have a sore throat and I''m coughing a lot.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '9826aac1-bf9b-4065-a64d-179fa7f00ea2' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'I have a sore throat and I''m coughing a lot.', updated_at = now() where learning_object_id = '9826aac1-bf9b-4065-a64d-179fa7f00ea2' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'When I arrive, I greet my colleagues and start with my emails.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '984299f2-ea6c-46f7-8ee4-ed23581b58e8' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'When I arrive, I greet my colleagues and start with my emails.', updated_at = now() where learning_object_id = '984299f2-ea6c-46f7-8ee4-ed23581b58e8' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'As if she were making up for nine years of thinking.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '99729ebd-f0ad-41c3-951b-5f31b964e04e' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'As if she were making up for nine years of thinking.', updated_at = now() where learning_object_id = '99729ebd-f0ad-41c3-951b-5f31b964e04e' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Life isn''t all just me, me, me.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '9b27083f-4bd4-4672-acd1-2aa22b3b7524' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Life isn''t all just me, me, me.', updated_at = now() where learning_object_id = '9b27083f-4bd4-4672-acd1-2aa22b3b7524' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Many fathers choose to go back to work early, while mothers stay home longer.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = '9f455651-a75a-49e3-a2aa-b62929a17329' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Many fathers choose to go back to work early, while mothers stay home longer.', updated_at = now() where learning_object_id = '9f455651-a75a-49e3-a2aa-b62929a17329' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'While the coffee is brewing, I get dressed and pack my bag.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'a0121495-717d-4553-a7ca-9fbd0fb4bad7' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'While the coffee is brewing, I get dressed and pack my bag.', updated_at = now() where learning_object_id = 'a0121495-717d-4553-a7ca-9fbd0fb4bad7' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Then we have breakfast at home.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'a3e83857-df4a-4038-a33b-3caf9c79ed44' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Then we have breakfast at home.', updated_at = now() where learning_object_id = 'a3e83857-df4a-4038-a33b-3caf9c79ed44' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'So the system is designed to ensure that healthcare is available even to people who do not have substantial financial means.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'a8b120fc-df52-41c9-b32f-15ce9a2afb90' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'So the system is designed to ensure that healthcare is available even to people who do not have substantial financial means.', updated_at = now() where learning_object_id = 'a8b120fc-df52-41c9-b32f-15ce9a2afb90' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'I''ll have a coffee and a cinnamon bun.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'ac45834f-1be5-4682-858d-982afb565327' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'I''ll have a coffee and a cinnamon bun.', updated_at = now() where learning_object_id = 'ac45834f-1be5-4682-858d-982afb565327' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'But tonight she was going to entice him to put his phone away.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'b177a558-0d15-4fb9-9704-b1ad3fea120a' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'But tonight she was going to entice him to put his phone away.', updated_at = now() where learning_object_id = 'b177a558-0d15-4fb9-9704-b1ad3fea120a' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Sweden has a generous system of parental leave.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'b31b0eeb-2f46-46e3-834e-2b2d280c5308' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Sweden has a generous system of parental leave.', updated_at = now() where learning_object_id = 'b31b0eeb-2f46-46e3-834e-2b2d280c5308' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Boldly, she pulled the moldy bedspread off the bed, yanked off the bedding, went out into the yard, and shook the dust out of it.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'b48d221b-4b4a-4ff1-b2d4-bf94c3fe5107' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Boldly, she pulled the moldy bedspread off the bed, yanked off the bedding, went out into the yard, and shook the dust out of it.', updated_at = now() where learning_object_id = 'b48d221b-4b4a-4ff1-b2d4-bf94c3fe5107' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'I think parents should think carefully before taking out their smartphones when they are spending time with their children!', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'b8c40cd2-f19c-493c-bc79-dd18e0823bf9' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'I think parents should think carefully before taking out their smartphones when they are spending time with their children!', updated_at = now() where learning_object_id = 'b8c40cd2-f19c-493c-bc79-dd18e0823bf9' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The bus arrives, as it usually does, on time.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'ba80b3bc-7e44-4497-a9bb-8c6c7e95de37' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The bus arrives, as it usually does, on time.', updated_at = now() where learning_object_id = 'ba80b3bc-7e44-4497-a9bb-8c6c7e95de37' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'This makes the forest more sustainable in the long run.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'be4ccfe4-8df5-4e99-8dd5-b62296f7c4e5' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'This makes the forest more sustainable in the long run.', updated_at = now() where learning_object_id = 'be4ccfe4-8df5-4e99-8dd5-b62296f7c4e5' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Once inside the restaurant, they sat down on wine-red velvet sofas.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'c02375a8-3d8f-4e21-9bb6-729267e02955' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Once inside the restaurant, they sat down on wine-red velvet sofas.', updated_at = now() where learning_object_id = 'c02375a8-3d8f-4e21-9bb6-729267e02955' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Surströmming is a Swedish delicacy, especially associated with northern Sweden, that is produced on an industrial scale mainly along the High Coast.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'c21c5517-9e6b-4df4-adc5-8eb6965a132e' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Surströmming is a Swedish delicacy, especially associated with northern Sweden, that is produced on an industrial scale mainly along the High Coast.', updated_at = now() where learning_object_id = 'c21c5517-9e6b-4df4-adc5-8eb6965a132e' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'I leave home shortly after seven.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'c3d2c3dc-7d84-40f8-8930-fd0c982af1f7' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'I leave home shortly after seven.', updated_at = now() where learning_object_id = 'c3d2c3dc-7d84-40f8-8930-fd0c982af1f7' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Over time she learned to trust her own voice instead of comparing herself to others.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'cac57317-db85-425e-82be-c5a0a106eb4b' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Over time she learned to trust her own voice instead of comparing herself to others.', updated_at = now() where learning_object_id = 'cac57317-db85-425e-82be-c5a0a106eb4b' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Many people donated money to charity after the fire.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'ccf09ce4-709c-4467-baf0-69ce1f12b61b' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Many people donated money to charity after the fire.', updated_at = now() where learning_object_id = 'ccf09ce4-709c-4467-baf0-69ce1f12b61b' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Even though it was already dark, they decided to keep looking for the way home.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'd26b9f77-8bd7-4fec-9f57-afe5dae3dd77' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Even though it was already dark, they decided to keep looking for the way home.', updated_at = now() where learning_object_id = 'd26b9f77-8bd7-4fec-9f57-afe5dae3dd77' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The system is financed mainly through taxes and fees, and it is administered by government agencies, regions, and municipalities.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'd3eb81e7-9e23-4141-86d2-1ac737c9ad99' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The system is financed mainly through taxes and fees, and it is administered by government agencies, regions, and municipalities.', updated_at = now() where learning_object_id = 'd3eb81e7-9e23-4141-86d2-1ac737c9ad99' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'There are several clear advantages to working remotely.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'd696ccb2-7045-43c0-a85e-fd792f52e406' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'There are several clear advantages to working remotely.', updated_at = now() where learning_object_id = 'd696ccb2-7045-43c0-a85e-fd792f52e406' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'She locked the door carefully and tried the handle to make sure it was properly locked.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'd92137f0-5bd2-43e9-b7ae-631c498bb899' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'She locked the door carefully and tried the handle to make sure it was properly locked.', updated_at = now() where learning_object_id = 'd92137f0-5bd2-43e9-b7ae-631c498bb899' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'In spring it gets warmer.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'da4b3eba-02c7-4b4c-88ba-1b528656468d' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'In spring it gets warmer.', updated_at = now() where learning_object_id = 'da4b3eba-02c7-4b4c-88ba-1b528656468d' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The municipal council makes decisions about the municipality''s budget and goals.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'db4a1f76-d7e3-4868-8fd6-b233a0984709' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The municipal council makes decisions about the municipality''s budget and goals.', updated_at = now() where learning_object_id = 'db4a1f76-d7e3-4868-8fd6-b233a0984709' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'That means that people in the country can help influence things by voting in elections, joining parties, contacting politicians, and taking part in public debate.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'de9a0df8-80cc-4c5e-ac32-d149be87cb08' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'That means that people in the country can help influence things by voting in elections, joining parties, contacting politicians, and taking part in public debate.', updated_at = now() where learning_object_id = 'de9a0df8-80cc-4c5e-ac32-d149be87cb08' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, '"Yes, I moved in this weekend. I still don''t really know my way around."', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'df955c9f-aa07-4ea0-bd7c-0980e5552d2c' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = '"Yes, I moved in this weekend. I still don''t really know my way around."', updated_at = now() where learning_object_id = 'df955c9f-aa07-4ea0-bd7c-0980e5552d2c' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'When winter was over, the animals could go out to pasture again.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'e017d911-5016-4c33-8e2b-357d9d916749' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'When winter was over, the animals could go out to pasture again.', updated_at = now() where learning_object_id = 'e017d911-5016-4c33-8e2b-357d9d916749' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The first time crayfish are mentioned in writing in Sweden was in 1562, in a letter from Erik XIV to the bailiff at Nyköpingshus.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'e0d9233a-1a38-4c71-ab3b-40ff0f6e1911' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The first time crayfish are mentioned in writing in Sweden was in 1562, in a letter from Erik XIV to the bailiff at Nyköpingshus.', updated_at = now() where learning_object_id = 'e0d9233a-1a38-4c71-ab3b-40ff0f6e1911' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'And the two of them went on hopping and skipping very carefully for three blocks, and then they got tired, and they forgot about it, and they stopped to pick marigolds through the gap in the corner fence, but only Dossy could reach them because she was the biggest.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'e40376c2-0356-41c4-9bce-53c1574cbb83' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'And the two of them went on hopping and skipping very carefully for three blocks, and then they got tired, and they forgot about it, and they stopped to pick marigolds through the gap in the corner fence, but only Dossy could reach them because she was the biggest.', updated_at = now() where learning_object_id = 'e40376c2-0356-41c4-9bce-53c1574cbb83' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'People lit fires to protect the animals from predators and evil forces.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'e4c1a269-44e0-41d5-8a5e-3202a5d9af22' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'People lit fires to protect the animals from predators and evil forces.', updated_at = now() where learning_object_id = 'e4c1a269-44e0-41d5-8a5e-3202a5d9af22' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Shall we order?', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'e5477206-c754-40de-bf3a-93a7fd6f37d8' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Shall we order?', updated_at = now() where learning_object_id = 'e5477206-c754-40de-bf3a-93a7fd6f37d8' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Parents can manage everyday life more easily, and people who live far from larger cities gain access to jobs that had previously been difficult to apply for.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'e63409ba-3227-427f-9c57-9798600ff452' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Parents can manage everyday life more easily, and people who live far from larger cities gain access to jobs that had previously been difficult to apply for.', updated_at = now() where learning_object_id = 'e63409ba-3227-427f-9c57-9798600ff452' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'She usually works out in the morning.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'ed15b714-8440-411b-afc6-e40abbf7b728' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'She usually works out in the morning.', updated_at = now() where learning_object_id = 'ed15b714-8440-411b-afc6-e40abbf7b728' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'So if you recognize yourself in this / if this sounds like you, don''t be so self-absorbed.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'ed9e5ae2-cc48-42dc-a833-f48040a718ff' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'So if you recognize yourself in this / if this sounds like you, don''t be so self-absorbed.', updated_at = now() where learning_object_id = 'ed9e5ae2-cc48-42dc-a833-f48040a718ff' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'They were looking forward to going down to the beach and swimming the next day.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'ede7c716-3414-44ef-b1a9-cb03c680dca3' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'They were looking forward to going down to the beach and swimming the next day.', updated_at = now() where learning_object_id = 'ede7c716-3414-44ef-b1a9-cb03c680dca3' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'I think parents should think very carefully before picking up their smartphones when they are with their children!', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'f1bc9975-cf76-43dd-95ad-ee88303adefe' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'I think parents should think very carefully before picking up their smartphones when they are with their children!', updated_at = now() where learning_object_id = 'f1bc9975-cf76-43dd-95ad-ee88303adefe' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'But she forces a smile.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'f46f99c2-ea3b-4d47-8987-44e508d30e88' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'But she forces a smile.', updated_at = now() where learning_object_id = 'f46f99c2-ea3b-4d47-8987-44e508d30e88' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'In recent years, the right of public access has been explicitly written into law in Sweden and Norway, but even in these countries the rules are for the most part based on customary law and an argument by implication from certain legal provisions that state what is prohibited; such interpretation means that what is not prohibited is permitted.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'f58f5d45-43ce-432e-85e0-e26adabde525' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'In recent years, the right of public access has been explicitly written into law in Sweden and Norway, but even in these countries the rules are for the most part based on customary law and an argument by implication from certain legal provisions that state what is prohibited; such interpretation means that what is not prohibited is permitted.', updated_at = now() where learning_object_id = 'f58f5d45-43ce-432e-85e0-e26adabde525' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, '"Let''s race to the monastery gate," she said, and together they set off along the sidewalk, and Dossy won, Dossy won easily.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'f818278f-2b99-4cc1-a099-b73d53983fb4' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = '"Let''s race to the monastery gate," she said, and together they set off along the sidewalk, and Dossy won, Dossy won easily.', updated_at = now() where learning_object_id = 'f818278f-2b99-4cc1-a099-b73d53983fb4' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'In recent years, the right of public access has been explicitly written into law in Sweden and Norway, but even in these countries the rules are for the most part based on customary law and an argument by implication from certain legal provisions that state what is prohibited; such interpretation means that what is not prohibited is permitted.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'f8c2c892-985c-4e2d-90e9-7125e511591d' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'In recent years, the right of public access has been explicitly written into law in Sweden and Norway, but even in these countries the rules are for the most part based on customary law and an argument by implication from certain legal provisions that state what is prohibited; such interpretation means that what is not prohibited is permitted.', updated_at = now() where learning_object_id = 'f8c2c892-985c-4e2d-90e9-7125e511591d' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'The Riksdag also scrutinizes the government, which governs the country and implements many of the decisions that the Riksdag has made.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'f98afdec-49e0-416b-a71d-d6599e4725eb' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'The Riksdag also scrutinizes the government, which governs the country and implements many of the decisions that the Riksdag has made.', updated_at = now() where learning_object_id = 'f98afdec-49e0-416b-a71d-d6599e4725eb' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'It often happened in connection with the ''crayfish supper,'' which was a festive way of saying goodbye to the summer and welcoming the approaching autumn.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'f9ece614-8aa8-4c40-b7b5-5b4b2bd81b16' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'It often happened in connection with the ''crayfish supper,'' which was a festive way of saying goodbye to the summer and welcoming the approaching autumn.', updated_at = now() where learning_object_id = 'f9ece614-8aa8-4c40-b7b5-5b4b2bd81b16' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, id, 'learning_objects', 'example_sv', example_sv, 'Ett mål är att Sveriges utsläpp av växthusgaser ska vara så nära noll som möjligt år 2045.', 'ocr_line_breaks_joined' from public.learning_objects where id = 'fb040af8-2e5e-473a-9ff7-dce4af77b2a0' and example_sv = 'Ett mål är att
Sveriges utsläpp av växthusgaser ska vara så nära noll som möjligt år
2045.';
update public.learning_objects set example_sv = 'Ett mål är att Sveriges utsläpp av växthusgaser ska vara så nära noll som möjligt år 2045.', updated_at = now() where id = 'fb040af8-2e5e-473a-9ff7-dce4af77b2a0' and example_sv = 'Ett mål är att
Sveriges utsläpp av växthusgaser ska vara så nära noll som möjligt år
2045.';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'One goal is for Sweden''s greenhouse-gas emissions to be as close to zero as possible in 2045.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'fb040af8-2e5e-473a-9ff7-dce4af77b2a0' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'One goal is for Sweden''s greenhouse-gas emissions to be as close to zero as possible in 2045.', updated_at = now() where learning_object_id = 'fb040af8-2e5e-473a-9ff7-dce4af77b2a0' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'Only occasionally did he come across the river to Cherry Valley, and he came to strike fear into the people, so that no one would forget who he was and start dreaming too much about freedom, said Jonatan.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'fd1cff06-0360-499f-b956-bce585da4e0a' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'Only occasionally did he come across the river to Cherry Valley, and he came to strike fear into the people, so that no one would forget who he was and start dreaming too much about freedom, said Jonatan.', updated_at = now() where learning_object_id = 'fd1cff06-0360-499f-b956-bce585da4e0a' and native_language = 'en' and coalesce(example_translation, '') = '';
insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason)
select :'batch'::uuid, learning_object_id, 'learning_object_translations', 'en:example_translation', example_translation, 'She learned the way to the office, greeted her new colleagues cautiously, and tried to remember their names.', 'english_gap_fill' from public.learning_object_translations
where learning_object_id = 'fd75eca2-05f8-4f8e-bea7-779e1bc2f7ed' and native_language = 'en' and coalesce(example_translation, '') = '';
update public.learning_object_translations set example_translation = 'She learned the way to the office, greeted her new colleagues cautiously, and tried to remember their names.', updated_at = now() where learning_object_id = 'fd75eca2-05f8-4f8e-bea7-779e1bc2f7ed' and native_language = 'en' and coalesce(example_translation, '') = '';
commit;
