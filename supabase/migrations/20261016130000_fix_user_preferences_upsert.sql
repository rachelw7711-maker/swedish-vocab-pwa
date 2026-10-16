-- Follow-up to 20261016120000_native_ios_hardening.sql: PostgREST upserts
-- (INSERT … ON CONFLICT DO UPDATE SET <every payload column>) also "update" the
-- conflict key, so authenticated needs UPDATE on user_id/created_at too. RLS
-- (user_preferences_update_own: auth.uid() = user_id, with check) still prevents
-- touching another user's row. Server-owned columns stay non-writable.
grant update (user_id, created_at) on public.user_preferences to authenticated;
