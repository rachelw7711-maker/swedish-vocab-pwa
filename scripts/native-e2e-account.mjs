// Creates (create) or deletes (delete <email>) a throwaway e2e test account. Prints KEY=VALUE lines.
import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const [cmd, arg] = process.argv.slice(2);
if (cmd === "create") {
  const email = `e2e-${Date.now()}@spraklab-test.invalid`, password = `T!${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  console.log(`E2E_EMAIL=${email}\nE2E_PASSWORD=${password}\nE2E_UID=${data.user.id}`);
} else if (cmd === "delete") {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user = data.users.find((u) => u.email === arg && u.email.endsWith("@spraklab-test.invalid"));
  if (!user) { console.log("not found"); process.exit(0); }
  await admin.from("user_notes").delete().eq("user_id", user.id);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  console.log(error ? `error ${error.message}` : `deleted ${user.id}`);
}
