-- Round G (2026-11-11), decision 6: homographs of one spelling and part of speech are separate
-- cards — regel..nn.1 (regler, "rule") and regel..nn.2 (reglar, "bolt"). learning_objects.lexeme_key
-- (added 2026-11-10, all null) holds the SALDO lemgram only when the spelling is several words that
-- inflect differently; every other card keeps null, so nothing existing changes (ids, progress and
-- user data untouched). Uniqueness becomes (swedish, part_of_speech, lexeme_key_nn) — a generated
-- column, so onConflict can name it. Step 1 (this file) adds it beside the old (swedish,
-- part_of_speech) index, which the deployed code's upsert still names; step 2
-- (20261111120100_lexeme_key_drop_old_unique.sql) drops the old index after the deploy.
alter table public.learning_objects
  add column if not exists lexeme_key_nn text generated always as (coalesce(lexeme_key, '')) stored;
create unique index if not exists learning_objects_swedish_pos_lexeme_key
  on public.learning_objects (swedish, part_of_speech, lexeme_key_nn);
