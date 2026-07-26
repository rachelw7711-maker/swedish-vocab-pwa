import { createClient } from "@supabase/supabase-js";
import { generateReadingSummary } from "../../server-reading.mjs";

// See api/reading/analyze.js for why this needs to be a real file under
// api/ rather than a route inside server.mjs.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function clean(value) {
  return String(value || "").trim();
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

async function readUserId(req) {
  const authHeader = clean(req.headers.authorization || req.headers.Authorization);
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    const error = new Error("Logga in för att generera sammanfattning.");
    error.status = 401;
    throw error;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7).trim());
  if (error || !data?.user?.id) {
    const authError = new Error("Logga in för att generera sammanfattning.");
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
    const { textResourceId } = req.body || {};
    if (!clean(textResourceId)) {
      sendJson(res, 400, { error: "textResourceId saknas." });
      return;
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const summary = await generateReadingSummary({ supabaseAdmin, userId, textResourceId: clean(textResourceId) });
    sendJson(res, 200, { summary });
  } catch (error) {
    console.error("[api/reading/summary]", error);
    sendJson(res, error.status || 500, { error: error.message || "Kunde inte generera sammanfattning." });
  }
}
