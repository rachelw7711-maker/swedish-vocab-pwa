import {
  adminClient, assessPronunciation, deleteAccount, generateWordEntry, normalizeLanguage, requireUser, sendJson,
} from "../server-native.mjs";

// Native iOS v1 endpoints in ONE serverless function (the Vercel plan allows 12
// functions; separate files pushed the project over the limit). POST /api/native
// with { action, ... }:
//   "generate-entry"  { word, nativeLanguage }        → { entryId, created }
//   "delete-account"  {}                               → { deleted }
//   "assess"          { referenceText, audioBase64 }   → pronunciation scores
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
    const body = req.body || {};
    const userId = await requireUser(req, "Logga in för att fortsätta.");
    const supabaseAdmin = adminClient();
    switch (body.action) {
      case "generate-entry":
        return sendJson(res, 200, await generateWordEntry({ supabaseAdmin, userId, word: body.word, nativeLanguage: normalizeLanguage(body.nativeLanguage) }));
      case "delete-account":
        return sendJson(res, 200, await deleteAccount({ supabaseAdmin, userId }));
      case "assess":
        return sendJson(res, 200, await assessPronunciation({ supabaseAdmin, userId, referenceText: body.referenceText, audioBase64: body.audioBase64 }));
      default:
        return sendJson(res, 400, { error: "Okänd åtgärd." });
    }
  } catch (error) {
    console.error("[api/native]", error);
    sendJson(res, error.status || 500, { error: error.status ? error.message : "Något gick fel." });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };
