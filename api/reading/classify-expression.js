import { createClient } from "@supabase/supabase-js";
import { classifyReadingExpression } from "../../server-reading.mjs";

// 2026-08-03: the reading results page's phrase/expression cards get two
// explicit "Skicka till Fraser" / "Skicka till Uttryck" buttons — this is
// what they call. See analyze.js for the production-vs-local-dev routing
// context (every real endpoint needs a file under api/, not just a
// server.mjs route, or it silently no-ops in production).

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
    const error = new Error("Logga in för att spara fraser.");
    error.status = 401;
    throw error;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7).trim());
  if (error || !data?.user?.id) {
    const authError = new Error("Logga in för att spara fraser.");
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

    await readUserId(req);
    const { expressionId, classification } = req.body || {};

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const entry = await classifyReadingExpression({ supabaseAdmin, expressionId, classification });
    sendJson(res, 200, { entry });
  } catch (error) {
    console.error("[api/reading/classify-expression]", error);
    sendJson(res, error.status || 500, { error: error.message || "Kunde inte spara frasen." });
  }
}
