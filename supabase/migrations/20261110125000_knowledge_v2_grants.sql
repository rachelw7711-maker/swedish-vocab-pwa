-- Knowledge v2: the tables of 20261110120000 had no table privileges in production (new tables there
-- get none by default), so the server's service_role was refused ("permission denied for table …"):
-- evidence rows and the shared Korp cache were silently skipped. Grants only; no rows change.
grant select, insert, update, delete on public.content_evidence, public.learning_object_senses,
  public.expression_surface_forms, public.korp_cache to service_role;
-- learning_object_senses has a read policy for readers; the policy needs the privilege under it.
grant select on public.learning_object_senses to authenticated, anon;
