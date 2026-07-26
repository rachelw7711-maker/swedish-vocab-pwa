-- Same gap as reading_items/shadowing_items — server.mjs's /api/reading/*
-- endpoints run as service_role and need explicit grants on the new tables.
grant select, insert, update, delete on public.text_resources to service_role;
grant select, insert, update, delete on public.text_analysis to service_role;
grant select, insert, update, delete on public.ai_usage_logs to service_role;
-- server-reading.mjs's fetchUserWordState reads this to avoid re-flagging
-- words the user already knows.
grant select on public.user_words to service_role;
