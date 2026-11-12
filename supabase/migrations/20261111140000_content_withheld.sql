-- Round G (2026-11-11): content taken out of a public card, kept whole and traceable (owner's rules A/B).
-- A card's meaning has no sense ids — its parts are the ";"-separated glosses of meaning_en / meaning_zh;
-- a withheld part is keyed by item_key = hash(card, content type, normalised English). States:
--   pending   evidence too weak, may be worth showing: kept out of view, never re-checked automatically
--   excluded  not taken in (a redundant or minor extra gloss, or no evidence after a fair check) — not "wrong"
--   rejected  shown to be wrong
--   restored  back on the card (after new evidence); the row stays as history
-- history is appended to, never rewritten. Additive only: no existing table is changed.
create table if not exists public.content_withheld (
  id uuid primary key default gen_random_uuid(),
  item_key text not null unique,
  learning_object_id uuid not null references public.learning_objects(id) on delete cascade,
  content_type text not null,             -- 'gloss' (an extra meaning part); later 'example', 'collocation', …
  position int,                           -- its place in the meaning when it was taken out
  content jsonb not null,                 -- { en, zh, sv } as they were shown
  was_public boolean not null,
  state text not null check (state in ('pending', 'excluded', 'rejected', 'restored')),
  reason text not null,
  priority int not null default 3,        -- 1 high … 3 low
  evidence jsonb,                         -- checks made: knowledge_checks ids, dictionary support, Korp result
  recheck_when text,                      -- the condition that allows another check (none = never automatically)
  history jsonb not null default '[]',    -- [{ at, state, reason, by }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_withheld_object_idx on public.content_withheld (learning_object_id);
create index if not exists content_withheld_state_idx on public.content_withheld (state, priority);
alter table public.content_withheld enable row level security;   -- service role only, no policies
grant select, insert, update, delete on public.content_withheld to service_role;
revoke all on public.content_withheld from anon, authenticated;
