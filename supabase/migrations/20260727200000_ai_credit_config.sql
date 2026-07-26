-- SprakLab_AI成本控制与阅读模块实施规范 §14.1/§17 — Credits schema, config
-- only. Per Rachel's 2026-07-26 decision: record real usage/cost now (see
-- ai_usage_logs, already shipped), but do NOT enforce daily/monthly limits
-- yet — single-user stage, the real risk is runaway AI cost overall, not
-- one user exceeding a quota. daily/monthly *used* counters are deliberately
-- NOT columns here — they're computed live from ai_usage_logs to avoid a
-- reset-cron-job and drift between a counter and the log it's supposed to
-- summarize.
alter table public.user_preferences
  add column if not exists account_plan text not null default 'free',
  add column if not exists daily_ai_credit_limit integer not null default 100,
  add column if not exists monthly_ai_credit_limit integer not null default 2000,
  add column if not exists is_admin boolean not null default false;

alter table public.user_preferences
  drop constraint if exists user_preferences_account_plan_check;
alter table public.user_preferences
  add constraint user_preferences_account_plan_check
    check (account_plan in ('free', 'standard', 'premium', 'admin'));

-- credits_used on ai_usage_logs (already exists, always 0 so far) now gets
-- real point values per SprakLab_AI成本控制_V1.1 §14.3's table, computed in
-- server-reading.mjs's calculateCredits() — no schema change needed for
-- that, just noting it here since this migration is the natural place for
-- the decision log entry.
