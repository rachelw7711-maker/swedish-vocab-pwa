import { generateWord } from "../server-words.mjs";

// Real Vercel serverless function — see api/reading/analyze.js for why
// server.mjs's own /api/generate-word route never actually ran in
// production. This is the "Komplettera" button's endpoint.

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    const { word, source } = req.body || {};
    if (!word || typeof word !== "string") {
      sendJson(res, 400, { error: "Skriv ett svenskt ord." });
      return;
    }
    const entry = await generateWord(word.trim(), source);
    sendJson(res, 200, { entry });
  } catch (error) {
    console.error("[api/generate-word]", error);
    sendJson(res, error.status || 500, { error: error.message || "Kunde inte generera ordet." });
  }
}
