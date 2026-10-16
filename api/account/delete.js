import { adminClient, deleteAccount, requireUser, sendJson } from "../../server-native.mjs";

// In-app account deletion (App Store guideline 5.1.1(v)). Removes the caller's
// recordings/audio and auth user; personal tables cascade. Public catalog untouched.
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
    const userId = await requireUser(req, "Logga in för att radera kontot.");
    sendJson(res, 200, await deleteAccount({ supabaseAdmin: adminClient(), userId }));
  } catch (error) {
    console.error("[api/account/delete]", error);
    sendJson(res, error.status || 500, { error: error.status ? error.message : "Kontot kunde inte raderas." });
  }
}
