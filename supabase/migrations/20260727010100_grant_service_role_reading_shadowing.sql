-- reading_items/shadowing_items were only ever accessed via the browser's
-- RLS-scoped client before — the new Phase A migration scripts need
-- service-role access to read/backfill across all users' rows.
grant select, insert, update, delete on public.reading_items to service_role;
grant select, insert, update, delete on public.shadowing_items to service_role;
