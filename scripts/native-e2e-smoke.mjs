// Native iOS v1 production smoke test: creates a throwaway account, exercises the
// app's data paths and RLS, then deletes the account through /api/native.
// Usage: node --env-file=.env scripts/native-e2e-smoke.mjs   (costs < $0.01)
import { createClient } from "@supabase/supabase-js";
const U = process.env.VITE_SUPABASE_URL, A = process.env.VITE_SUPABASE_ANON_KEY, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = "https://swedish-vocab-pwa.vercel.app";
const admin = createClient(U, K, { auth: { persistSession: false } });
const email = `e2e-${Date.now()}@spraklab-test.invalid`, password = `T!${crypto.randomUUID()}`;
const log = (k, v) => console.log(k.padEnd(34), v);
const { data: created, error: ce } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (ce) throw ce;
const uid = created.user.id;
try {
  const user = createClient(U, A, { auth: { persistSession: false } });
  const { data: s, error: se } = await user.auth.signInWithPassword({ email, password });
  if (se) throw se;
  const token = s.session.access_token;
  const prof = await admin.from("profiles").select("id").eq("id", uid).maybeSingle();
  log("profile auto-created", Boolean(prof.data));
  const { data: word } = await user.from("learning_objects").select("id,swedish").eq("swedish", "påverka").limit(1).single();
  log("read catalog", word?.swedish);
  const up = await user.from("user_words").upsert({ user_id: uid, word_id: word.id, is_favorite: true, favorited_at: new Date().toISOString(), status: "new", review_stage: 0, personal_note: JSON.stringify({ schema: "spraklab-user-word-v1" }) }, { onConflict: "user_id,word_id" });
  log("favorite (user_words v2 upsert)", up.error ? up.error.message : "ok");
  const hack = await user.from("learning_objects").update({ chinese: "HACK" }).eq("id", word.id).select();
  log("user cannot edit catalog", (hack.data || []).length === 0 ? "ok (0 rows)" : "FAIL");
  const pref = await user.from("user_preferences").upsert({ user_id: uid, preferences: { nativeLanguage: "en", dailyNewWordTarget: 8 } }, { onConflict: "user_id" });
  log("preferences upsert", pref.error ? pref.error.message : "ok");
  const esc = await user.from("user_preferences").update({ is_admin: true }).eq("user_id", uid);
  log("cannot self-promote admin", esc.error ? "ok (" + esc.error.code + ")" : "FAIL");
  const note = await user.from("user_notes").insert({ user_id: uid, title: "Test", body: "Hej 你好" }).select().single();
  log("note insert", note.error ? note.error.message : "ok");
  const rep = await user.from("content_reports").insert({ user_id: uid, word_id: word.id, swedish: word.swedish, category: "other", note: "e2e" });
  log("report insert", rep.error ? rep.error.message : "ok");
  const reports = await user.from("content_reports").select("id");
  log("sees only own reports", reports.data?.length);
  const call = async (body) => { const r = await fetch(`${API}/api/native`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) }); return [r.status, await r.json()]; };
  const g1 = await call({ action: "generate-entry", word: "förändrade", nativeLanguage: "zh" });
  log("generate existing (inflected)", JSON.stringify(g1));
  const ttsCached = await fetch(`${API}/api/shadowing/tts`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ text: "påverka", voiceId: "sv-SE-SofieNeural", itemId: "pronunciation" }) }).then(r => r.json());
  log("tts cache (logged in)", ttsCached.cached);
  const del = await call({ action: "delete-account" });
  log("delete-account", JSON.stringify(del));
  const gone = await admin.auth.admin.getUserById(uid);
  log("auth user removed", gone.error ? "ok" : "FAIL");
  const left = await admin.from("user_notes").select("id").eq("user_id", uid);
  const leftW = await admin.from("user_words").select("id").eq("user_id", uid);
  const leftR = await admin.from("content_reports").select("id").eq("user_id", uid);
  log("personal rows left", `${left.data?.length}/${leftW.data?.length}/${leftR.data?.length}`);
  const still = await admin.from("learning_objects").select("id,chinese").eq("id", word.id).single();
  log("catalog entry intact", still.data?.chinese !== "HACK");
} finally {
  await admin.auth.admin.deleteUser(uid).catch(() => {});
}
