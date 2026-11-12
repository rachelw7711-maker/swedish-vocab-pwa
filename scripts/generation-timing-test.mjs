// Round G (2026-11-12): word card request timing on production, from a throwaway account
// (@spraklab-test.invalid, deleted at the end). Four cases, five requests each: an entry of the
// curated library, an entry an earlier AI request made (shared), a new word, a new expression.
// Reads the generation_timing rows the server logged (server-native.mjs) and the AI calls made
// meanwhile. → data/reports/round-g/generation-timing.json
//   node --env-file=.env scripts/generation-timing-test.mjs
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const U = process.env.VITE_SUPABASE_URL, A = process.env.VITE_SUPABASE_ANON_KEY, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = "https://swedish-vocab-pwa.vercel.app";
const admin = createClient(U, K, { auth: { persistSession: false } });
const CASES = {
  library: ["påverka", "beslut", "ansvar", "möjlighet", "sjukhus"],
  shared: ["välutbildad", "liberal", "öde", "äga", "vända"],
  new_word: ["skottkärra", "vattenkokare", "brödrost", "kökshandduk", "skohorn"],
  new_expression: ["slå två flugor i en smäll", "gå som på räls", "ha is i magen", "dra sitt strå till stacken", "ta tjuren vid hornen"],
};
const email = `timing-${Date.now()}@spraklab-test.invalid`, password = `T!${crypto.randomUUID()}`;
const { data: created, error: ce } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (ce) throw ce;
const uid = created.user.id, out = [];
try {
  const user = createClient(U, A, { auth: { persistSession: false } });
  const { data: s, error: se } = await user.auth.signInWithPassword({ email, password });
  if (se) throw se;
  const call = async (body) => { const r = await fetch(`${API}/api/native`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${s.session.access_token}` }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) }; };
  for (const [kind, words] of Object.entries(CASES)) for (const word of words) {
    const t0 = Date.now(), since = new Date(t0 - 1000).toISOString();
    const r = await call({ action: "generate-entry", word, nativeLanguage: "zh" });
    const wall = Date.now() - t0;
    await new Promise((ok) => setTimeout(ok, 1500));
    const logs = (await admin.from("ai_usage_logs").select("feature, actual_cost, details, created_at").eq("user_id", uid).gte("created_at", since).order("created_at")).data || [];
    const timing = logs.find((l) => l.feature === "generation_timing")?.details;
    const calls = logs.filter((l) => l.feature !== "generation_timing");
    out.push({ kind, word, http: r.status, entryId: r.body?.entryId || null, created: r.body?.created ?? null, error: r.body?.error || null, wall_ms: wall, server: timing ? { path: timing.path, ms: timing.ms } : null, ai: calls.map((c) => ({ feature: c.feature, usd: Number(c.actual_cost) })), usd: calls.reduce((a, c) => a + Number(c.actual_cost), 0) });
    console.log(kind, word, r.status, wall, timing?.ms?.total, calls.length);
  }
  console.log(JSON.stringify(await call({ action: "delete-account" })));
} finally {
  await admin.auth.admin.deleteUser(uid).catch(() => {});
  writeFileSync("data/reports/round-g/generation-timing.json", JSON.stringify(out, null, 1));
}
