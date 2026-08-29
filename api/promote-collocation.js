import { createClient } from "@supabase/supabase-js";
import { promoteCollocationToPhrase } from "../server-words.mjs";

// Real Vercel serverless function — see api/reading/analyze.js. This is
// the word card's "+ Fraser" button endpoint.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

// 2026-08-29 audit fix (SprakLab-Audit-Report.md §3.3): this endpoint
// writes into the shared public learning_objects catalog with service-role
// privileges and previously had no check at all — same readUserId pattern
// as api/reading/analyze.js. No admin/curator role exists anywhere in the
// codebase yet (confirmed: the is_admin column is unreferenced), so this
// is the minimum real bar (logged in), not a new RBAC system.
async function readUserId(req) {
  const authHeader = String(req.headers.authorization || req.headers.Authorization || "").trim();
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    const error = new Error("Logga in för att lägga till frasen.");
    error.status = 401;
    throw error;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7).trim());
  if (error || !data?.user?.id) {
    const authError = new Error("Logga in för att lägga till frasen.");
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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      sendJson(res, 500, { error: "Supabase är inte konfigurerat på servern." });
      return;
    }
    await readUserId(req);
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { sourceWordId, phrase, meaning, exampleSv, cefrLevel } = req.body || {};
    const entry = await promoteCollocationToPhrase({ supabaseAdmin, sourceWordId, phrase, meaning, exampleSv, cefrLevel });
    sendJson(res, 200, { entry });
  } catch (error) {
    console.error("[api/promote-collocation]", error);
    sendJson(res, error.status || 500, { error: error.message || "Kunde inte skapa frasen." });
  }
}
