revoke select, insert, update, delete on public.content_evidence, public.learning_object_senses,
  public.expression_surface_forms, public.korp_cache from service_role;
revoke select on public.learning_object_senses from authenticated, anon;
