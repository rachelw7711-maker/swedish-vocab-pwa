-- text_resources has no title column (only reading_items does, for a
-- user's own private label) — the starter reading library needs one to
-- show in a browse list before a user has "added" the text to their own
-- reading_items. Nullable; only populated for starter library rows.
alter table public.text_resources
  add column if not exists title text;
