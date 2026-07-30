import { createClient } from "@supabase/supabase-js";
import { extractTextFromImage, calculateCredits } from "../../server-reading.mjs";

// Real Vercel serverless function — see api/reading/analyze.js for why
// production needs actual files under api/. This is the photo/camera
// import step (规范§12): extract text only, no analysis — the extracted
// text lands in the reading editor's textarea for the user to review/edit
// before saving, same as pasted text.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function clean(value) {
  return String(value || "").trim();
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

async function readUserId(req) {
  const authHeader = clean(req.headers.authorization || req.headers.Authorization);
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    const error = new Error("Logga in för att importera foton.");
    error.status = 401;
    throw error;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7).trim());
  if (error || !data?.user?.id) {
    const authError = new Error("Logga in för att importera foton.");
    authError.status = 401;
    throw authError;
  }
  return data.user.id;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      sendJson(res, 500, { error: "Supabase är inte konfigurerat på servern." });
      return;
    }

    const userId = await readUserId(req);
    const { imageDataUrl } = req.body || {};
    if (!clean(imageDataUrl) || !imageDataUrl.startsWith("data:image/")) {
      sendJson(res, 400, { error: "Ingen giltig bild mottagen." });
      return;
    }
    if (imageDataUrl.length > MAX_IMAGE_BYTES * 1.4) {
      // base64 inflates size ~33% — 1.4x gives headroom without a strict decode.
      sendJson(res, 400, { error: "Bilden är för stor (max 8 MB)." });
      return;
    }

    const { text, glossary, usage } = await extractTextFromImage({ imageDataUrl });
    if (!text) {
      sendJson(res, 200, { text: "", glossary: [], warning: "Ingen läsbar svensk text hittades i bilden." });
      return;
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    await supabaseAdmin.from("ai_usage_logs").insert({
      user_id: userId,
      feature: "ocr",
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      credits_used: calculateCredits("ocr"),
      actual_cost: (inputTokens / 1_000_000) * 0.75 + (outputTokens / 1_000_000) * 4.5,
      cache_hit: false,
    });

    sendJson(res, 200, { text, glossary });
  } catch (error) {
    console.error("[api/reading/ocr]", error);
    sendJson(res, error.status || 500, { error: error.message || "Kunde inte läsa texten från bilden." });
  }
}
