// Native iOS v1: production test of the AI paths with a throwaway account.
// - reading analysis on a starter-library text (public cached analysis → no AI cost)
// - Talanalys via /api/native "assess" using Azure-synthesised Swedish audio
// Usage: node --env-file=.env scripts/native-e2e-ai.mjs
import { createClient } from "@supabase/supabase-js";
const U = process.env.VITE_SUPABASE_URL, A = process.env.VITE_SUPABASE_ANON_KEY, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = "https://swedish-vocab-pwa.vercel.app";
const admin = createClient(U, K, { auth: { persistSession: false } });
const log = (k, v) => console.log(k.padEnd(30), v);
const email = `e2e-${Date.now()}@spraklab-test.invalid`, password = `T!${crypto.randomUUID()}`;
const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
const uid = created.user.id;
try {
  const user = createClient(U, A, { auth: { persistSession: false } });
  const { data: s } = await user.auth.signInWithPassword({ email, password });
  const token = s.session.access_token;
  const post = async (path, body, timeout = 150000) => {
    const t0 = Date.now();
    const r = await fetch(`${API}${path}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
    return [r.status, await r.json(), Date.now() - t0];
  };
  const { data: starter } = await user.from("text_resources").select("id,title,cleaned_text").eq("is_starter_library", true).limit(1).single();
  log("starter text", starter?.title);
  const [st, res, ms] = await post("/api/reading/analyze", { text: starter.cleaned_text, sourceType: "paste", nativeLanguage: "zh" });
  log("analyze zh", `${st} cached=${res.cached} public=${res.reusedFromPublic} deepReady=${res.deepReady} ${ms}ms`);
  const a = res.analysis || {};
  log("vocab / expressions", `${(a.selected_vocabulary || []).length} / ${(a.selected_expressions || []).length}`);
  log("expr categories", [...new Set((a.selected_expressions || []).map((e) => e.category))].join(","));
  log("summary_zh present", Boolean(a.summary_zh));
  // Talanalys: synthesise a sentence as 16 kHz PCM, then assess it through the API.
  const text = "Ove går upp, som vanligt. Han sätter på kaffe och går sin runda.";
  const tts = await fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: { "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "riff-16khz-16bit-mono-pcm" },
    body: `<speak version='1.0' xml:lang='sv-SE'><voice name='sv-SE-MattiasNeural'>${text}</voice></speak>`,
  });
  const wav = Buffer.from(await tts.arrayBuffer());
  const [as, assess, ams] = await post("/api/native", { action: "assess", referenceText: text, audioBase64: wav.toString("base64") });
  log("assess", `${as} ${ams}ms ${JSON.stringify(assess)}`);
  const [ws] = await post("/api/native", { action: "assess", referenceText: "Hej", audioBase64: Buffer.alloc(100).toString("base64") });
  log("assess too-short → 400", ws);
  const { data: usage } = await admin.from("ai_usage_logs").select("feature,credits_used").eq("user_id", uid);
  log("usage logged", JSON.stringify(usage));
} finally {
  await admin.from("text_resources").delete().eq("user_id", uid);
  await admin.auth.admin.deleteUser(uid);
  log("cleanup", "test account deleted");
}
