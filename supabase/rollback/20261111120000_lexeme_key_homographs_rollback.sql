-- Only while no two cards share (swedish, part_of_speech): first retire or re-key the homograph cards.
alter table public.learning_objects add constraint learning_objects_swedish_pos_key unique (swedish, part_of_speech);
drop index if exists public.learning_objects_swedish_pos_lexeme_key;
alter table public.learning_objects drop column if exists lexeme_key_nn;
