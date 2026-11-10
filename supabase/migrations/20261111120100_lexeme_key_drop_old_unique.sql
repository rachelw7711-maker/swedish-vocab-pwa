-- Round G step 2 (after the code naming swedish,part_of_speech,lexeme_key_nn is deployed): the old
-- (swedish, part_of_speech) uniqueness goes, so a second word of one spelling can have its card.
alter table public.learning_objects drop constraint if exists learning_objects_swedish_pos_key;
drop index if exists public.learning_objects_swedish_pos_key;
