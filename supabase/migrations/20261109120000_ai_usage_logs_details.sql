-- ai_usage_logs.details (2026-11-09): what a cost row needs besides tokens — the price version the
-- estimate used, who caused the call (user / server / script), the billed unit for non-token
-- services (TTS characters, audio seconds), cached input tokens, a retry. Never user text.
-- Additive and nullable: older rows and older code paths stay valid.
alter table public.ai_usage_logs add column if not exists details jsonb default '{}'::jsonb;
