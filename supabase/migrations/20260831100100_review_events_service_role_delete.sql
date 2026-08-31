-- review_events is append-only for the "authenticated" role (end users
-- never edit/delete their own review history — that's the point of an
-- immutable log) but service_role should still be able to clean up bad
-- rows (e.g. test data) without needing a destructive schema change.
grant delete on public.review_events to service_role;
