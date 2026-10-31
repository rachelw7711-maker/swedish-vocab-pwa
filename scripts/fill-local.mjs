// Fills empty word-card fields from local data only (2026-10-31): SALDO's
// morphology (CC BY 4.0) for forms, s-passive and countability, and the row's own
// `note` for a Swedish definition the course-list import left there. Never
// overwrites a value: forms are inserted only where the row has no form of that
// type, the other fields only where empty.
//
//   node --env-file=.env scripts/fill-local.mjs [--status data/reports/field-status.ndjson]
//        [--sql <file>]   write the fill and its rollback as SQL (review / local test DB)
//        [--apply]        write through the Supabase service role (production needs the owner's go-ahead)
//
// Input is the scan's field-status file (scripts/scan-resources.mjs): rows with
// status "missing" and detail.fill "local". Output: a plan summary on stdout,
// data/reports/saldo-fill-plan.json, and with --sql <file> also <file> and
// <file minus .sql>-rollback.sql.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { SALDO_SOURCE_ID } from "../server-lexicon.mjs";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const statusFile = opt("--status") || "data/reports/field-status.ndjson";
const sqlFile = opt("--sql");
const jobId = randomUUID();

const plan = readFileSync(statusFile, "utf8").trim().split("\n").map((l) => JSON.parse(l))
  .filter((s) => s.status === "missing" && s.detail?.fill === "local" && s.detail.reference)
  .map((s) => ({ id: s.learning_object_id, field: s.field, value: s.detail.reference }));

const byField = {};
plan.forEach((p) => { byField[p.field] = (byField[p.field] || 0) + 1; });
writeFileSync("data/reports/saldo-fill-plan.json", JSON.stringify({ jobId, createdAt: new Date().toISOString(), byField, plan }, null, 1));
console.log(JSON.stringify({ jobId, fields: plan.length, entries: new Set(plan.map((p) => p.id)).size, byField }, null, 1));

const forms = plan.filter((p) => p.field.startsWith("form:")).map((p) => ({ ...p, formType: p.field.slice(5) }));
const passives = plan.filter((p) => p.field === "passiv_s");
const countability = plan.filter((p) => p.field === "countability");
const explanations = plan.filter((p) => p.field === "swedish_explanation");
const sourceOf = (p) => (p.field === "swedish_explanation" ? "existing-note" : SALDO_SOURCE_ID);
const ids = [...new Set(plan.map((p) => p.id))];

if (sqlFile) {
  const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
  const values = (rows, fn) => rows.map(fn).join(",\n  ");
  const sql = [`-- SALDO fill ${jobId}: ${plan.length} fields on ${ids.length} entries. Only empty fields are written.`, "begin;",
    `insert into public.enrichment_jobs (id, kind, name, status, params) values (${q(jobId)}, 'local_fill', 'SALDO fill', 'done', ${q(JSON.stringify({ byField }))});`,
    forms.length && `insert into public.word_forms (learning_object_id, form_type, form_value, sort_order) values\n  ${values(forms, (f) => `(${q(f.id)}, ${q(f.formType)}, ${q(f.value)}, 100)`)}\non conflict (learning_object_id, form_type) do nothing;`,
    ...passives.map((p) => `update public.learning_objects set passiv_s = ${q(p.value)} where id = ${q(p.id)} and coalesce(passiv_s, '') = '';`),
    ...countability.map((p) => `update public.learning_objects set countability = ${q(p.value)} where id = ${q(p.id)} and countability is null;`),
    ...explanations.map((p) => `update public.learning_objects set swedish_explanation = ${q(p.value)} where id = ${q(p.id)} and coalesce(swedish_explanation, '') = '';`),
    `insert into public.resource_field_status (learning_object_id, field, status, source, detail) values\n  ${values(plan, (p) => `(${q(p.id)}, ${q(p.field)}, ${q(p.field === "swedish_explanation" ? "present" : "verified")}, ${q(sourceOf(p))}, ${q(JSON.stringify({ filled_by: jobId }))})`)}\non conflict (learning_object_id, field) do update set status = 'verified', source = excluded.source, detail = excluded.detail, updated_at = now();`,
    `insert into public.learning_object_sources (learning_object_id, source_id, role, fields, detail)\nselect id, ${q(SALDO_SOURCE_ID)}, 'forms', array_agg(field), jsonb_build_object('filled_by', ${q(jobId)}) from (values\n  ${values(plan.filter((p) => p.field !== "swedish_explanation"), (p) => `(${q(p.id)}::uuid, ${q(p.field)})`)}\n) v(id, field) group by id\non conflict (learning_object_id, source_id, role) do update set fields = (select array_agg(distinct f) from unnest(learning_object_sources.fields || excluded.fields) f), detail = learning_object_sources.detail || excluded.detail;`,
    "commit;"].filter(Boolean).join("\n\n");
  writeFileSync(sqlFile, sql + "\n");
  const rollback = ["-- Rollback for SALDO fill " + jobId + ": removes exactly the values it wrote (if still unchanged).", "begin;",
    forms.length && `delete from public.word_forms w using (values\n  ${values(forms, (f) => `(${q(f.id)}::uuid, ${q(f.formType)}, ${q(f.value)})`)}\n) v(id, form_type, form_value) where w.learning_object_id = v.id and w.form_type = v.form_type and w.form_value = v.form_value;`,
    ...passives.map((p) => `update public.learning_objects set passiv_s = '' where id = ${q(p.id)} and passiv_s = ${q(p.value)};`),
    ...countability.map((p) => `update public.learning_objects set countability = null where id = ${q(p.id)} and countability = ${q(p.value)};`),
    ...explanations.map((p) => `update public.learning_objects set swedish_explanation = '' where id = ${q(p.id)} and swedish_explanation = ${q(p.value)};`),
    `delete from public.resource_field_status where detail->>'filled_by' = ${q(jobId)};`,
    `update public.enrichment_jobs set status = 'cancelled', updated_at = now() where id = ${q(jobId)};`,
    "commit;"].filter(Boolean).join("\n\n");
  writeFileSync(sqlFile.replace(/\.sql$/, "") + "-rollback.sql", rollback + "\n");
  console.log(`wrote ${sqlFile} and its rollback`);
}

if (args.includes("--apply")) {
  const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const must = ({ error }) => { if (error) throw error; };
  must(await db.from("enrichment_jobs").insert({ id: jobId, kind: "local_fill", name: "SALDO fill", status: "running", params: { byField } }));
  for (let i = 0; i < forms.length; i += 500) {
    must(await db.from("word_forms").upsert(forms.slice(i, i + 500).map((f) => ({ learning_object_id: f.id, form_type: f.formType, form_value: f.value, sort_order: 100 })),
      { onConflict: "learning_object_id,form_type", ignoreDuplicates: true }));
  }
  for (const p of passives) must(await db.from("learning_objects").update({ passiv_s: p.value }).eq("id", p.id).or("passiv_s.is.null,passiv_s.eq."));
  for (const p of countability) must(await db.from("learning_objects").update({ countability: p.value }).eq("id", p.id).is("countability", null));
  for (const p of explanations) must(await db.from("learning_objects").update({ swedish_explanation: p.value }).eq("id", p.id).or("swedish_explanation.is.null,swedish_explanation.eq."));
  for (let i = 0; i < plan.length; i += 500) {
    must(await db.from("resource_field_status").upsert(plan.slice(i, i + 500).map((p) => ({ learning_object_id: p.id, field: p.field, status: p.field === "swedish_explanation" ? "present" : "verified", source: sourceOf(p), detail: { filled_by: jobId }, updated_at: new Date().toISOString() })),
      { onConflict: "learning_object_id,field" }));
  }
  for (let i = 0; i < ids.length; i += 500) must(await db.rpc("refresh_resource_summary", { p_ids: ids.slice(i, i + 500) }));
  must(await db.from("enrichment_jobs").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", jobId));
  console.log("applied", jobId);
}
