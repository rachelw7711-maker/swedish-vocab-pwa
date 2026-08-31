-- Starter reading library (Reviews/起步阅读素材库-评审与实施方案-2026-08-31.md,
-- 决策 1-4 approved 2026-08-31): a small set of admin-curated, AI-original
-- Swedish texts that every user can read without pasting their own text
-- first ("day one, something to read" — audit report §6 gap vs Lute/LWT).
--
-- Reuses the existing text_resources/text_analysis schema instead of a new
-- parallel table: a starter text is just a text_resources row owned by an
-- admin account, flagged is_starter_library, with its text_analysis marked
-- public. Writes stay service_role-only (no insert/update/delete policy for
-- authenticated on is_starter_library rows) — no user-facing "publish"
-- button, same posture as the existing curate-public-reading-analysis.mjs
-- admin tool.

alter table public.text_resources
  add column if not exists is_starter_library boolean not null default false;

create index if not exists text_resources_starter_library_idx
  on public.text_resources (is_starter_library)
  where is_starter_library = true;

alter table public.text_resources
  drop constraint if exists text_resources_source_type_check;
alter table public.text_resources
  add constraint text_resources_source_type_check
    check (source_type in ('paste', 'upload', 'camera', 'curated'));

drop policy if exists "text_resources_select_starter_library" on public.text_resources;
create policy "text_resources_select_starter_library" on public.text_resources
  for select using (is_starter_library = true);

-- text_analysis.visibility already exists (07-27) with a 'public' state and
-- an admin promotion script, but no select policy ever actually granted
-- read access on that state — every reader still had to own the underlying
-- text_resources row. That gap blocks the starter library outright (no
-- other user could read a starter text's analysis) and silently also meant
-- the "generate once, reuse forever" public-analysis-reuse path never
-- worked for anyone but the resource's own owner. Fixing it here since the
-- starter library needs it to function at all.
drop policy if exists "text_analysis_select_public" on public.text_analysis;
create policy "text_analysis_select_public" on public.text_analysis
  for select using (visibility = 'public');
