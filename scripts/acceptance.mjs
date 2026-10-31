// Acceptance report (2026-11-01), read-only: per part of speech, how many of the
// fields a card should have are complete, not applicable, waiting for review or still
// missing — from a fresh scan's field-status file — plus display checks that mirror
// the iOS card (gender shown from pos_detail or genus, group shown only as 1–5 / 2a / 2b).
//
//   node --env-file=.env scripts/acceptance.mjs --status <field-status.ndjson> [--out data/reports/prod2/acceptance.json]
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function all(table, cols) {
  let out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(cols).order("id").range(from, from + 999);
    if (error) throw error;
    out = out.concat(data);
    if (data.length < 1000) return out;
  }
}
const objects = new Map((await all("learning_objects", "id, swedish, part_of_speech, object_type, status, pos_detail")).filter((o) => o.status !== "retired").map((o) => [o.id, o]));
const forms = new Map();
for (const f of await all("word_forms", "id, learning_object_id, form_type, form_value")) (forms.get(f.learning_object_id) ?? forms.set(f.learning_object_id, {}).get(f.learning_object_id))[f.form_type] = f.form_value;
const openSuggestions = new Set((await all("content_suggestions", "id, learning_object_id, field, verdict, status")).filter((s) => s.status === "pending" && s.verdict !== "ok").map((s) => `${s.learning_object_id}|${s.field}`));

const group = (o) => (o.object_type === "word" ? o.part_of_speech : o.object_type);
const report = {};
const bucket = (g) => (report[g] ??= { entries: new Set(), fields: 0, complete: 0, notApplicable: 0, review: 0, missing: 0, byField: {} });
for (const s of readFileSync(opt("--status"), "utf8").trim().split("\n").map((l) => JSON.parse(l))) {
  const o = objects.get(s.learning_object_id);
  if (!o) continue;
  const b = bucket(group(o));
  b.entries.add(o.id);
  // Group 4 for göra/sätta-type verbs is the school-grammar convention (SALDO files them as 2a/2b).
  const convention = s.field === "form:verb_group" && s.status === "mismatch" && s.detail?.stored === "4";
  const kind = s.status === "not_applicable" ? "notApplicable" : convention ? "complete"
    : s.status === "mismatch" || openSuggestions.has(`${o.id}|${s.field}`) || (s.status === "missing" && s.detail?.fill === "review") ? "review"
    : s.status === "missing" ? "missing" : "complete";
  b[kind]++;
  if (kind !== "notApplicable") b.fields++;
  const f = (b.byField[s.field] ??= { complete: 0, notApplicable: 0, review: 0, missing: 0 });
  f[kind]++;
}

// Display checks, as the card renders them.
const GENDER = /^(en|en-ord|utrum|ett|ett-ord|neutrum)$/i, GROUP = /^(grupp\s*)?([1-5]|2[ab])$/i;
const display = { nounsWithoutGender: [], nounGroupHidden: [], verbGroupHidden: [] };
for (const o of objects.values()) {
  if (o.object_type !== "word") continue;
  const f = forms.get(o.id) || {};
  if (o.part_of_speech === "noun") {
    const pluralOnly = !f.singular_definite && f.plural_indefinite && f.plural_indefinite === (f.singular_indefinite || o.swedish);
    if (!GENDER.test((o.pos_detail || "").trim()) && !GENDER.test((f.genus || "").trim()) && !pluralOnly) display.nounsWithoutGender.push(o.swedish);
    if (f.declension_group && !GROUP.test(f.declension_group.trim()) && f.declension_group !== "0") display.nounGroupHidden.push(`${o.swedish}=${f.declension_group}`);
  }
  if (o.part_of_speech === "verb" && f.verb_group && !GROUP.test(f.verb_group.trim())) display.verbGroupHidden.push(`${o.swedish}=${f.verb_group}`);
}

const pct = (a, b) => (b ? +((100 * a) / b).toFixed(1) : null);
const out = Object.fromEntries(Object.entries(report).sort((a, b) => b[1].entries.size - a[1].entries.size).map(([g, b]) => [g, {
  entries: b.entries.size, applicableFields: b.fields, completePct: pct(b.complete, b.fields), complete: b.complete, review: b.review, missing: b.missing, notApplicable: b.notApplicable,
  weakestFields: Object.entries(b.byField).map(([f, c]) => [f, pct(c.complete, c.complete + c.review + c.missing), c.review, c.missing]).filter(([, p]) => p !== null && p < 99).sort((x, y) => x[1] - y[1]).slice(0, 6),
}]));
const result = { generatedAt: new Date().toISOString(), byGroup: out, display: Object.fromEntries(Object.entries(display).map(([k, v]) => [k, { count: v.length, sample: v.slice(0, 12) }])), openSuggestions: openSuggestions.size };
writeFileSync(opt("--out", "data/reports/prod2/acceptance.json"), JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
