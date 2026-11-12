// Round G (2026-11-12, owner's item E): confirmed form errors removed, each archived and reversible.
//   rädd: neuter "rätt" — another word (rätt, right); Lexin gives no neuter ("–"), SALDO none.
//   a conjugation / declension group on a multi-word headword that is not a particle verb (gå som på
//   räls: a lone "grupp 4"); a particle verb keeps its verb's (gå ut på) — as the generator now does.
// The form row and its resource_field_status row go to content_audit_archive (reason round_g_e_forms);
// statuses recomputed. Dry run by default.
//   node --env-file=.env scripts/round-g-fixes.mjs [--apply]
//   node --env-file=.env scripts/round-g-fixes.mjs --rollback <batch>
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { particleVerb } from "../server-native.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const REASON = "round_g_e_forms";

if (process.argv.includes("--rollback")) {
  const batch = arg("--rollback");
  const rows = must(await db.from("content_audit_archive").select("learning_object_id, table_name, old_value").eq("batch_id", batch).eq("reason", REASON));
  for (const r of rows) {
    const old = JSON.parse(r.old_value);
    if (r.table_name === "word_forms") must(await db.from("word_forms").upsert(old, { onConflict: "learning_object_id,form_type" }));
    else must(await db.from("resource_field_status").upsert(old, { onConflict: "learning_object_id,field" }));
  }
  const ids = [...new Set(rows.map((r) => r.learning_object_id))];
  if (ids.length) must(await db.rpc("refresh_resource_summary", { p_ids: ids }));
  console.log({ batch, restored: rows.length });
  process.exit(0);
}

async function all(table, cols, f) {
  const out = [];
  for (let i = 0; ; i += 1000) { const d = must(await f(db.from(table).select(cols)).order("id").range(i, i + 999)); out.push(...d); if (d.length < 1000) return out; }
}
await useSaldoFiles();
const targets = [];
const radd = must(await db.from("learning_objects").select("id").eq("swedish", "rädd").eq("object_type", "word"));
for (const o of radd) for (const f of must(await db.from("word_forms").select("*").eq("learning_object_id", o.id).eq("form_type", "neuter_form").eq("form_value", "rätt"))) targets.push({ swedish: "rädd", form: f });
const multi = await all("learning_objects", "id, swedish", (q) => q.neq("object_type", "word"));
for (let i = 0; i < multi.length; i += 200) {
  const chunk = multi.slice(i, i + 200);
  for (const f of must(await db.from("word_forms").select("*").in("learning_object_id", chunk.map((o) => o.id)).in("form_type", ["verb_group", "declension_group"])))
    { const swedish = chunk.find((o) => o.id === f.learning_object_id).swedish; if (!(await particleVerb(null, swedish))) targets.push({ swedish, form: f }); }
}
console.log(targets.map((t) => `${t.swedish}: ${t.form.form_type}=${t.form.form_value}`));
if (!process.argv.includes("--apply")) process.exit(0);
const batch = randomUUID();
for (const { form } of targets) {
  const st = must(await db.from("resource_field_status").select("*").eq("learning_object_id", form.learning_object_id).eq("field", `form:${form.form_type}`).maybeSingle());
  must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: form.learning_object_id, table_name: "word_forms", field: form.form_type, old_value: JSON.stringify(form), new_value: "", reason: REASON }));
  if (st) must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: form.learning_object_id, table_name: "resource_field_status", field: st.field, old_value: JSON.stringify(st), new_value: "", reason: REASON }));
  must(await db.from("word_forms").delete().eq("id", form.id));
  if (st) must(await db.from("resource_field_status").delete().eq("learning_object_id", form.learning_object_id).eq("field", st.field));
}
const ids = [...new Set(targets.map((t) => t.form.learning_object_id))];
if (ids.length) must(await db.rpc("refresh_resource_summary", { p_ids: ids }));
console.log({ batch, removed: targets.length });
