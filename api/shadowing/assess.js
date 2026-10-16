import { adminClient, assessPronunciation, requireUser, sendJson } from "../../server-native.mjs";

// Talanalys: Azure pronunciation assessment for one ≤60 s WAV segment (16 kHz mono PCM).
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
    const userId = await requireUser(req, "Logga in för att använda talanalys.");
    const { referenceText, audioBase64 } = req.body || {};
    sendJson(res, 200, await assessPronunciation({ supabaseAdmin: adminClient(), userId, referenceText, audioBase64 }));
  } catch (error) {
    console.error("[api/shadowing/assess]", error);
    sendJson(res, error.status || 500, { error: error.status ? error.message : "Talanalysen misslyckades." });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };
