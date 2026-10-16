import { adminClient, generateWordEntry, normalizeLanguage, requireUser, sendJson } from "../../server-native.mjs";

// Native iOS "Skapa med AI" (04.5): query → dedupe → auth/quota → generate → validate → save,
// returns the public entry id. The client never writes the public catalog itself.
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
    const userId = await requireUser(req, "Logga in för att skapa ordkort.");
    const { word, nativeLanguage } = req.body || {};
    const result = await generateWordEntry({ supabaseAdmin: adminClient(), userId, word, nativeLanguage: normalizeLanguage(nativeLanguage) });
    sendJson(res, 200, result);
  } catch (error) {
    console.error("[api/entries/generate]", error);
    sendJson(res, error.status || 500, { error: error.status ? error.message : "Kunde inte skapa ordkortet." });
  }
}
