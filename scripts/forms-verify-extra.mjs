// Round G (2026-11-12, owner's item E): forms SALDO cannot confirm although they are right, checked
// another way — no AI, no card content changed, only resource_field_status of the form:
//   periphrastic comparison  "mer japansk", "mest japanska": SALDO lists only the mechanical
//                            -are/-ast forms (japanskare), so it never matches; the card's form is
//                            verified when Korp has the word sequence (multiword attestation thresholds).
//   a definite superlative written as the base form (mest global) is put right from the card's verified
//                            definite form (mest globala; the old value archived) and then checked the same way.
//   invariable adjectives     inre, yttre, överens, östra: SALDO's paradigm is invariable (av_i…) with
//                            one form; the card's form is that form.
// Public cards' forms still "present" only. Old rows archived (content_audit_archive, reason
// round_g_e_forms_verify); statuses recomputed. Dry run by default.
//   node --env-file=.env scripts/forms-verify-extra.mjs [--apply]
//   node --env-file=.env scripts/forms-verify-extra.mjs --rollback <batch>
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { useSaldoFiles, saldoEntries } from "../server-lexicon.mjs";
import { korpAttestation, judgeAttestation } from "../server-korp.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const REASON = "round_g_e_forms_verify";

if (process.argv.includes("--rollback")) {
  const rows = must(await db.from("content_audit_archive").select("learning_object_id, table_name, field, old_value").eq("batch_id", arg("--rollback")).eq("reason", REASON));
  for (const r of rows) {
    if (r.table_name === "word_forms") must(await db.from("word_forms").update({ form_value: JSON.parse(r.old_value) }).eq("learning_object_id", r.learning_object_id).eq("form_type", r.field));
    else must(await db.from("resource_field_status").upsert(JSON.parse(r.old_value), { onConflict: "learning_object_id,field" }));
  }
  const ids = [...new Set(rows.map((r) => r.learning_object_id))];
  for (let i = 0; i < ids.length; i += 200) must(await db.rpc("refresh_resource_summary", { p_ids: ids.slice(i, i + 200) }));
  console.log({ restored: rows.length });
  process.exit(0);
}
await useSaldoFiles();
const APPLY = process.argv.includes("--apply");
async function all(table, cols, f, by) {
  const out = [];
  for (let i = 0; ; i += 1000) { const d = must(await f(db.from(table).select(cols)).order(by).range(i, i + 999)); out.push(...d); if (d.length < 1000) return out; }
}
const open = await all("resource_field_status", "*", (q) => q.eq("status", "present").like("field", "form:%"), "learning_object_id");
const cards = new Map();
for (let i = 0; i < open.length; i += 200) {
  const ids = [...new Set(open.slice(i, i + 200).map((r) => r.learning_object_id))];
  for (const o of must(await db.from("learning_objects").select("id, swedish, part_of_speech, status").in("id", ids).in("status", ["published", "human_reviewed", "ai_generated"]))) cards.set(o.id, o);
}
const rows = open.filter((r) => cards.has(r.learning_object_id));
const forms = new Map();
for (let i = 0; i < rows.length; i += 200) for (const f of must(await db.from("word_forms").select("learning_object_id, form_type, form_value").in("learning_object_id", [...new Set(rows.slice(i, i + 200).map((r) => r.learning_object_id))]))) forms.set(`${f.learning_object_id}|form:${f.form_type}`, f.form_value);

const found = [];
const todo = [...rows];
await Promise.all([1, 2, 3].map(async () => {
  while (todo.length) {
    const r = todo.shift(), o = cards.get(r.learning_object_id), value = String(forms.get(`${r.learning_object_id}|${r.field}`) || "").trim();
    if (!value) continue;
    if (/^(mer|mest) \S+$/.test(value) && /comparative|superlative/.test(r.field)) {
      // The definite superlative takes the definite ending (mest globala), never the base form (mest
      // global — written on several cards): put right from the card's SALDO-verified definite form.
      let fixed = null;
      if (r.field === "form:superlative_definite" && !/[ae]$/.test(value)) {
        const def = forms.get(`${r.learning_object_id}|form:definite_form`) || forms.get(`${r.learning_object_id}|form:plural_form`);
        const defOk = open.every((x) => x.learning_object_id !== r.learning_object_id || !["form:definite_form", "form:plural_form"].includes(x.field));
        if (!def || !defOk || !/[ae]$/.test(def)) continue;
        fixed = `mest ${def}`;
      }
      const a = await korpAttestation(fixed || value).catch(() => null);
      const v = a && judgeAttestation(a, null).exists;
      if (v?.ok) found.push({ row: r, swedish: o.swedish, value: fixed || value, ...(fixed ? { was: value } : {}), rule: fixed ? "definite_superlative_corrected" : "korp_periphrastic", evidence: { korp: v.reason, cqp: a.cqp } });
    } else if (o.part_of_speech === "adjective") {
      const saldo = (await saldoEntries(null, o.swedish, "adjective")).filter((x) => /^av_i/.test(x.paradigm));
      const only = saldo.map((x) => [...new Set(Object.values(x.forms || {}).flat())]).find((v) => v.length === 1);
      if (only && only[0] === value) found.push({ row: r, swedish: o.swedish, value, rule: "saldo_invariable", evidence: { lemgram: saldo[0].lemgram, paradigm: saldo[0].paradigm } });
    }
  }
}));
const batch = randomUUID();
if (APPLY) {
  for (const x of found) {
    if (x.was) {
      const type = x.row.field.slice("form:".length);
      must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: x.row.learning_object_id, table_name: "word_forms", field: type, old_value: JSON.stringify(x.was), new_value: x.value, reason: REASON }));
      must(await db.from("word_forms").update({ form_value: x.value }).eq("learning_object_id", x.row.learning_object_id).eq("form_type", type).eq("form_value", x.was));
    }
    must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: x.row.learning_object_id, table_name: "resource_field_status", field: x.row.field, old_value: JSON.stringify(x.row), new_value: "verified", reason: REASON }));
    must(await db.from("resource_field_status").update({ status: "verified", source: x.rule === "korp_periphrastic" ? "korp-attestation" : "saldo-morphology-2017", rule_version: "kv2-2026-11-12/forms-extra",
      detail: { ...(x.row.detail || {}), rule: x.rule, ...x.evidence }, updated_at: new Date().toISOString() }).eq("learning_object_id", x.row.learning_object_id).eq("field", x.row.field).eq("status", "present"));
  }
  const ids = [...new Set(found.map((x) => x.row.learning_object_id))];
  for (let i = 0; i < ids.length; i += 200) must(await db.rpc("refresh_resource_summary", { p_ids: ids.slice(i, i + 200) }));
}
writeFileSync(`data/reports/round-g/fix/forms-verify-extra${APPLY ? "" : "-dry"}.json`, JSON.stringify(found.map((x) => ({ swedish: x.swedish, field: x.row.field, value: x.value, was: x.was, rule: x.rule, ...x.evidence })), null, 1));
const t = {};
for (const x of found) t[x.rule] = (t[x.rule] || 0) + 1;
console.log({ apply: APPLY, batch: APPLY ? batch : null, openFormsOnPublicCards: rows.length, verified: found.length, cards: new Set(found.map((x) => x.row.learning_object_id)).size, byRule: t });
