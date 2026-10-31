// Plan allowances (structure for later subscriptions, 2026-10-31). Limits live in
// public.plan_limits; nothing here blocks anyone while app_settings.commercial_mode
// is off — callers get { enforced: false, allowed: true } plus the usage numbers,
// so the same call can start enforcing on the day the switch is turned on.
//
// Counting:
//   reading_analysis     new texts analysed (one fast-layer call per new text;
//                        reopening a saved analysis makes no call)
//   shadowing_new_text   shadowing texts created
//   shadowing_evaluation full evaluations of one text (needs textResourceId; the
//                        evaluation log must carry it — see the 2026-10-31 report)
const PERIOD_START = {
  day: () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; },
  week: () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d; },
  month: () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); },
};

async function countUsage(supabaseAdmin, userId, feature, since, textResourceId) {
  if (feature === "reading_analysis") {
    const { count } = await supabaseAdmin.from("ai_usage_logs").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("feature", "reading_fast_layer").gte("created_at", since.toISOString());
    return count || 0;
  }
  if (feature === "shadowing_new_text") {
    const { count } = await supabaseAdmin.from("shadowing_items").select("id", { count: "exact", head: true })
      .eq("user_id", userId).is("deleted_at", null).gte("created_at", since.toISOString());
    return count || 0;
  }
  if (feature === "shadowing_evaluation") {
    if (!textResourceId) return 0;
    const { count } = await supabaseAdmin.from("ai_usage_logs").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("feature", "shadowing_evaluation").eq("text_resource_id", textResourceId);
    return count || 0;
  }
  return 0;
}

/** { enforced, plan, limit (null = none), period, used, allowed } for one feature. */
export async function planAllowance(supabaseAdmin, userId, feature, { textResourceId = null } = {}) {
  const [{ data: settings }, { data: prefs }, { data: admin }] = await Promise.all([
    supabaseAdmin.from("app_settings").select("commercial_mode").maybeSingle(),
    supabaseAdmin.from("user_preferences").select("account_plan").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  const enforced = Boolean(settings?.commercial_mode);
  const plan = admin ? "admin" : prefs?.account_plan || "free";
  const { data: limits } = await supabaseAdmin.from("plan_limits").select("period, max_count").eq("plan", plan === "admin" ? "premium" : plan).eq("feature", feature);
  const rule = plan === "admin" ? null : limits?.[0] || null;
  const limit = rule ? rule.max_count : null;
  const since = rule && rule.period !== "per_text" ? PERIOD_START[rule.period]() : new Date(0);
  const used = rule ? await countUsage(supabaseAdmin, userId, feature, since, textResourceId) : 0;
  const withinLimit = limit === null || used < limit;
  return { enforced, plan, limit, period: rule?.period || null, used, allowed: !enforced || withinLimit };
}
