-- learning_object_examples was created with only example_swedish — no
-- Chinese translation column, so a second example (used by the bundled
-- enrichment pass for Fraser/Uttryck, 2026-07-25) has nowhere to store its
-- translation. Add it now rather than parsing it back out of prose later.
alter table public.learning_object_examples
  add column if not exists example_chinese text not null default '';
