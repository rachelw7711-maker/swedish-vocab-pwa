// Review round 2 (2026-11-01), deterministic, no AI. Settles what reliable evidence
// settles and lists the rest:
//   1. noun fields the scan flagged (forms, gender, declension group) and the pending
//      AI suggestions in content_suggestions, judged against SALDO — a stored form is
//      only replaced when SALDO (one lexeme, or all homographs agreeing) gives another
//      value for that slot and never the stored one; a suggestion is closed when SALDO
//      confirms the stored value. AI-proposed noun plurals are never written: SALDO's
//      own plural is, or "no plural" when SALDO's paradigm has none.
//   2. a short list of single fixes checked by hand (buda had bjuda's forms, four
//      participles stored as "other", a misspelled headword, …), each with its evidence.
// A different classification of a correct form (group 4 for göra-type verbs, "irregular"
// for man/män) is not an error and is not changed.
// Old values go to public.content_audit_archive; the rollback restores them.
//
//   node --env-file=.env scripts/resolve-review.mjs [--status data/reports/prod3/field-status.ndjson] [--out data/reports/prod3/review]
// Writes review.sql, review-rollback.sql, review-preview.tsv and review-list.tsv; never writes to the database.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { useSaldoFiles, saldoEntries, GENUS, variants } from "../server-lexicon.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const outDir = opt("--out", "data/reports/prod3/review");
mkdirSync(outDir, { recursive: true });
const batch = randomUUID();
await useSaldoFiles();
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function all(table, cols, order = ["id"]) {
  let out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await order.reduce((q, c) => q.order(c), db.from(table).select(cols)).range(from, from + 999);
    if (error) throw error;
    out = out.concat(data);
    if (data.length < 1000) return out;
  }
}
const objects = new Map((await all("learning_objects", "id, swedish, part_of_speech, object_type, status, pos_detail, example_sv, swedish_explanation, countability")).filter((o) => o.status !== "retired").map((o) => [o.id, o]));
const formsOf = new Map();
for (const f of await all("word_forms", "id, learning_object_id, form_type, form_value")) (formsOf.get(f.learning_object_id) ?? formsOf.set(f.learning_object_id, new Map()).get(f.learning_object_id)).set(f.form_type, f.form_value);
const suggestions = (await all("content_suggestions", "id, learning_object_id, field, current_value, suggested_value, verdict, issue, status")).filter((s) => s.status === "pending");
const statuses = readFileSync(opt("--status", "data/reports/prod3/field-status.ndjson"), "utf8").trim().split("\n").map((l) => JSON.parse(l));

const SLOT = {
  noun: { singular_indefinite: "sg indef nom", singular_definite: "sg def nom", plural_indefinite: "pl indef nom", plural_definite: "pl def nom" },
  verb: { infinitive: "inf aktiv", present: "pres ind aktiv", preteritum: "pret ind aktiv", supinum: "sup aktiv", imperative: "imper", present_participle: "pres_part nom", perfect_participle: "pret_part indef sg u nom" },
  adjective: { base_form: "pos indef sg u nom", neuter_form: "pos indef sg n nom", plural_form: "pos indef pl nom", definite_form: "pos def sg no_masc nom", comparative: "komp nom", superlative_indefinite: "super indef nom", superlative_definite: "super def no_masc nom" },
};
const bare = (s) => String(s || "").trim().toLowerCase();
const saldoCache = new Map();
async function saldo(o) {
  const k = `${o.swedish}|${o.part_of_speech}`;
  if (!saldoCache.has(k)) saldoCache.set(k, await saldoEntries(null, o.swedish, o.part_of_speech));
  return saldoCache.get(k);
}
// SALDO's values for a slot: null when the lexemes disagree or SALDO has no such word.
function saldoSlot(rows, pos, slot) {
  const msd = SLOT[pos]?.[slot];
  if (!msd || !rows.length) return null;
  const sets = rows.map((r) => (r.forms[msd] || []).map(bare).sort().join("|"));
  if (new Set(sets).size !== 1) return null;
  return rows[0].forms[msd] || [];   // [] = this word has no such form (no plural)
}
const NUMERIC = /^([1-5]|2[ab])$/;
const KEEP = new Set(["spektrum", "trailer", "designer", "snacks", "pop", "membran"]);
function declensionGroup(sg, pl) {
  if (!sg || !pl) return null;
  if (pl === sg) return "5";
  if (/[aeiouyåäöé]$/.test(sg) && pl === `${sg}n`) return "4";
  if (/[eiouyåäöé]$/.test(sg) && pl === `${sg}r`) return "3";
  if (pl.endsWith("or") && (sg.endsWith("a") ? pl === `${sg.slice(0, -1)}or` : pl === `${sg}or`)) return "1";
  if (pl.endsWith("ar") && pl[0] === sg[0]) return "2";
  if (pl.endsWith("er") && pl[0] === sg[0] && !sg.endsWith("er") || pl.endsWith("er") && pl === `${sg.replace(/er$/, "r")}er`) return "3";
  return null;
}

const changes = [], review = [], closed = [];
const done = new Set();   // `${id}|${field}` already settled
const setForm = (o, type, value, reason) => {
  const old = formsOf.get(o.id)?.get(type) ?? null;
  if (old === value || done.has(`${o.id}|form:${type}`)) return;
  done.add(`${o.id}|form:${type}`);
  changes.push({ kind: "form", id: o.id, field: type, old, value, reason, swedish: o.swedish });
  (formsOf.get(o.id) ?? formsOf.set(o.id, new Map()).get(o.id)).set(type, value);
};
const dropForm = (o, type, reason) => {
  const old = formsOf.get(o.id)?.get(type);
  if (old === undefined) return;
  changes.push({ kind: "form_delete", id: o.id, field: type, old, value: null, reason, swedish: o.swedish });
  formsOf.get(o.id).delete(type);
};
const setColumn = (o, column, value, reason) => { changes.push({ kind: "column", id: o.id, field: column, old: o[column] ?? null, value, reason, swedish: o.swedish }); o[column] = value; };
const notApplicable = (o, field, reason) => changes.push({ kind: "na", id: o.id, field, old: null, value: "not_applicable", reason, swedish: o.swedish });
const toReview = (o, field, why, stored, candidate, who = "language") => review.push({ who, swedish: o.swedish, pos: o.part_of_speech, field, why, stored: stored ?? "∅", candidate: candidate ?? "" });
const close = (s, status, note) => closed.push({ id: s.id, entry: s.learning_object_id, status, note });

// ---------------------------------------------------------------------------
// 1. Single fixes checked by hand (evidence in the reason).
// ---------------------------------------------------------------------------
const byHead = (w, pos) => [...objects.values()].find((o) => o.swedish === w && o.object_type === "word" && (!pos || o.part_of_speech === pos));
{
  // buda carried bjuda's forms; SALDO buda..vb.1 is a first-conjugation verb.
  const o = byHead("buda", "verb");
  if (o && formsOf.get(o.id)?.get("infinitive") === "bjuda") {
    const f = { infinitive: "buda", present: "budar", preteritum: "budade", supinum: "budat", imperative: "buda", present_participle: "budande", perfect_participle: "budad", verb_group: "1" };
    for (const [t, v] of Object.entries(f)) setForm(o, t, v, "forms_of_bjuda_on_buda:saldo_buda..vb.1");
    setColumn(o, "passiv_s", null, "skip"); changes.pop();   // passive left as stored
  }
  // singularis: SALDO nn_0u (no plural).
  const s = byHead("singularis", "noun");
  if (s) for (const f of ["form:plural_indefinite", "form:plural_definite", "form:declension_group"]) { notApplicable(s, f, "saldo_nn_0u_no_plural"); done.add(`${s.id}|${f}`); }
  // främre is itself a comparative form and indeclinable (SALDO av_i, superlative främst).
  const fr = byHead("främre", "adjective");
  if (fr) { notApplicable(fr, "form:comparative", "comparative_form_itself:saldo_av_i"); done.add(`${fr.id}|form:comparative`); }
  // Participles stored as part of speech "other": forms from SALDO's participle of the verb.
  const participles = { skriven: ["skriva", "skriven", "skrivet", "skrivna"], tänkt: ["tänka", "tänkt", "tänkt", "tänkta"], utesluten: ["utesluta", "utesluten", "uteslutet", "uteslutna"], taget: ["ta", "tagen", "taget", "tagna"] };
  for (const [w, [verb, en, ett, pl]] of Object.entries(participles)) {
    const p = byHead(w, "other");
    if (!p) continue;
    setColumn(p, "part_of_speech", "perfekt_particip", `participle_of_${verb}:saldo_pret_part`);
    for (const [t, v] of Object.entries({ base_form: en, en_form: en, ett_form: ett, neuter_form: ett, plural_form: pl, definite_form: pl, base_verb: verb })) setForm(p, t, v, `participle_of_${verb}:saldo_pret_part`);
    if (w === "taget") toReview(p, "swedish", "headword is the neuter form; the participle's base form is tagen", "taget", "tagen", "decision");
  }
  // Explanations the AI could not give without repeating the phrase (three rounds); "laga mat"
  // got "Att tillaga mat." which the check rejected only because "tillaga" contains "laga".
  const explanations = {
    "börja med något": "göra något som det första steget i en uppgift eller en ordning",
    "det som": "syftar på en sak eller händelse som resten av meningen beskriver",
    "inte ens": "förstärker en negation: inte heller det minsta eller det enklaste",
    "ta sig an något": "åta sig en uppgift och börja arbeta med den",
    "laga mat": "göra i ordning mat genom att till exempel koka, steka eller baka",
    "skånsk": "som hör till Skåne, till exempel landskapets folk, mat eller dialekt",
  };
  for (const [w, text] of Object.entries(explanations)) {
    const e = [...objects.values()].find((o) => o.swedish === w && !String(o.swedish_explanation || "").trim());
    if (e) setColumn(e, "swedish_explanation", text, "written_by_editor:ai_answers_failed_check");
  }
  // Misspelled headword (triple k); no entry markkontakt exists.
  const mk = byHead("markkkontakt");
  if (mk && !byHead("markkontakt")) setColumn(mk, "swedish", "markkontakt", "misspelled_headword");
}

// ---------------------------------------------------------------------------
// 2. Flagged noun fields and pending suggestions, against SALDO.
// ---------------------------------------------------------------------------
const flagged = statuses.filter((s) => (s.status === "mismatch" || (s.status === "missing" && s.detail?.fill === "review")) && objects.get(s.learning_object_id)?.part_of_speech === "noun");
const formSuggestions = suggestions.filter((s) => /^form:/.test(s.field) && s.verdict !== "ok");
const tasks = new Map();
for (const s of flagged) tasks.set(`${s.learning_object_id}|${s.field}`, { id: s.learning_object_id, field: s.field, stored: s.detail?.stored, from: "scan" });
for (const s of formSuggestions) {
  const k = `${s.learning_object_id}|${s.field}`;
  const t = tasks.get(k) ?? { id: s.learning_object_id, field: s.field, from: "suggestion" };
  (t.suggestions ??= []).push(s);
  tasks.set(k, t);
}

for (const t of tasks.values()) {
  const o = objects.get(t.id);
  if (!o) { for (const s of t.suggestions || []) close(s, "rejected", "entry retired"); continue; }
  if (done.has(`${o.id}|${t.field}`)) { for (const s of t.suggestions || []) close(s, "applied", "settled by a single fix"); continue; }
  const slot = t.field.replace(/^form:/, "");
  const stored = formsOf.get(o.id)?.get(slot) ?? null;
  const rows = await saldo(o);
  const aiPlural = (t.suggestions || []).some((s) => s.issue === "ai_plural_held");

  if (slot === "genus") {
    const genders = new Set(rows.map((r) => r.paradigm.match(/^nn_\w*?([unv])_/)?.[1]).filter(Boolean));
    const g = genders.size === 1 ? { u: "en", n: "ett" }[[...genders][0]] : null;
    const def = formsOf.get(o.id)?.get("singular_definite"), sdef = saldoSlot(rows, "noun", "singular_definite");
    if (g && sdef?.length && sdef.map(bare).includes(bare(def))) {
      setForm(o, "genus", g, "saldo_gender_and_definite_form");
      if (o.pos_detail !== `${g}-ord`) setColumn(o, "pos_detail", `${g}-ord`, "saldo_gender_and_definite_form");
    } else toReview(o, t.field, rows.length > 1 ? "SALDO homographs" : "gender evidence incomplete", stored, g);
    continue;
  }

  if (slot === "declension_group") continue;   // settled after the forms, below

  const values = saldoSlot(rows, o.part_of_speech, slot);
  const sugg = (t.suggestions || []).map((s) => s.suggested_value).filter(Boolean);
  if (values === null) {   // SALDO cannot decide (no entry, or homographs disagree)
    toReview(o, t.field, rows.length ? "SALDO homographs disagree" : "word not in SALDO", stored, sugg.join(" | "));
    continue;
  }
  const storedOk = stored && variants(stored).every((v) => values.map(bare).includes(bare(v)));
  if (storedOk) { for (const s of t.suggestions || []) close(s, "rejected", "SALDO confirms the stored form"); continue; }
  if (!values.length) {   // SALDO: no such form (uncountable noun)
    if (/^plural_/.test(slot)) {
      if (!stored) { notApplicable(o, t.field, "saldo_no_plural"); for (const s of t.suggestions || []) close(s, "rejected", "SALDO: no plural"); }
      else toReview(o, t.field, "SALDO lists no plural but one is stored", stored, "");
    } else toReview(o, t.field, "SALDO lists no such form", stored, "");
    continue;
  }
  // Lexeme check before replacing: the entry's other stored forms must be SALDO's forms of this word.
  const others = Object.keys(SLOT[o.part_of_speech] || {}).filter((k) => k !== slot && formsOf.get(o.id)?.get(k));
  const sameWord = others.every((k) => { const v = saldoSlot(rows, o.part_of_speech, k); return v === null || !v.length || variants(formsOf.get(o.id).get(k)).some((x) => v.map(bare).includes(bare(x))); });
  if (!sameWord) { toReview(o, t.field, "other stored forms belong to another word", stored, values.join(" / ")); continue; }
  // Only nouns are corrected here; other parts of speech go to review (comparison and
  // imperative choices are often style, and SALDO lists forms nobody uses for s-verbs).
  if (o.part_of_speech !== "noun") { toReview(o, t.field, "SALDO gives another form", stored, values.join(" / ")); continue; }
  // SALDO lists sort plurals for mass nouns (snuser, sminkerna); a plural is added, or a
  // zero plural replaced, only for a noun stored as countable.
  const sg = formsOf.get(o.id)?.get("singular_indefinite") || o.swedish;
  if (/^plural_/.test(slot) && (!stored || bare(stored) === bare(sg) || bare(stored) === bare(formsOf.get(o.id)?.get("singular_definite"))) && o.countability !== "countable") { toReview(o, t.field, `SALDO plural for a noun stored as ${o.countability || "unknown countability"}`, stored, values.join(" / ")); continue; }
  // Read through by hand: here the stored form is a variant SALDO lacks (spektren, poppen)
  // or SALDO's first form would not match the stored -s plural (designers → designerna).
  if (KEEP.has(o.swedish)) { toReview(o, t.field, "stored form is a variant SALDO lacks, or the change breaks the paradigm", stored, values.join(" / ")); continue; }
  setForm(o, slot, values[0], stored ? (aiPlural ? "saldo_form" : "contradicts:saldo") : "missing:saldo");
  for (const s of t.suggestions || []) close(s, bare(s.suggested_value) === bare(values[0]) ? "applied" : "rejected", `SALDO form ${values[0]} written`);
}

// Declension groups: keep a numeric group that matches the noun's own (now corrected) plural
// and any non-numeric label (irregular, uncountable …); recompute only a group that
// contradicts its own SALDO-confirmed plural.
for (const t of tasks.values()) {
  if (!t.field.endsWith("declension_group")) continue;
  const o = objects.get(t.id);
  if (!o || done.has(`${o.id}|form:declension_group`)) continue;
  const f = formsOf.get(o.id) || new Map();
  const stored = f.get("declension_group") ?? null, sg = f.get("singular_indefinite") || o.swedish, pl = f.get("plural_indefinite");
  const derived = declensionGroup(bare(sg), bare(pl));
  const rows = await saldo(o), splural = saldoSlot(rows, "noun", "plural_indefinite");
  if (stored && !NUMERIC.test(stored) && stored !== "0") continue;                 // label kept
  if (stored && derived === stored) continue;                                         // own plural agrees: convention difference
  if (stored === "0" && splural?.length === 0) continue;                              // no plural, as SALDO says
  if (derived && splural?.map(bare).includes(bare(pl))) setForm(o, "declension_group", derived, stored ? "contradicts:own_saldo_plural" : "missing:own_saldo_plural");
  else toReview(o, t.field, stored === "0" ? "stored as no plural; SALDO has one" : "plural not confirmed by SALDO", stored, derived || "");
}

// Other pending suggestions (examples, part of speech, explanations, whole form sets).
const SOFT_HYPHEN = /­/g;
for (const s of suggestions.filter((s) => !/^form:/.test(s.field) || s.verdict === "ok")) {
  const o = objects.get(s.learning_object_id);
  if (!o) { close(s, "rejected", "entry retired"); continue; }
  if (s.verdict === "ok") { close(s, "rejected", "AI check found no error"); continue; }
  if (s.field === "example") {
    const ex = String(o.example_sv || "");
    const rows = await saldo(o);
    const forms = new Set([o.swedish, ...rows.flatMap((r) => Object.values(r.forms).flat()), ...(formsOf.get(o.id)?.values() || [])].map(bare).filter(Boolean));
    const words = ex.replace(SOFT_HYPHEN, "").toLowerCase().split(/[^\p{L}-]+/u);
    const parts = o.swedish.toLowerCase().split(/[\s…\.]+/).filter((p) => p.length > 1);
    const has = words.some((w) => forms.has(w)) || (parts.length > 1 && parts.every((p) => words.includes(p)));
    if (has && SOFT_HYPHEN.test(ex)) { setColumn(o, "example_sv", ex.replace(SOFT_HYPHEN, ""), "soft_hyphen_hid_headword"); close(s, "applied", "soft hyphen removed; the example uses the word"); }
    else if (has) close(s, "rejected", "the example uses a form of the word");
    else toReview(o, "example", "example does not contain the word", ex, "");
    continue;
  }
  if (s.field === "part_of_speech") {
    const all = await saldoEntries(null, o.swedish);
    const posSet = new Set(all.map((r) => r.pos));
    const POS = { noun: "nn", verb: "vb", adjective: "av", adverb: "ab" };
    if (POS[s.suggested_value] && posSet.size === 1 && posSet.has(POS[s.suggested_value]) && !posSet.has(POS[o.part_of_speech])) toReview(o, "part_of_speech", "SALDO knows the word only as " + s.suggested_value + "; changing the part of speech replaces the card's forms", o.part_of_speech, s.suggested_value, "language");
    else close(s, "rejected", "SALDO does not support the change");
    continue;
  }
  toReview(o, s.field, s.issue || "AI check", s.current_value, s.suggested_value);
}

// ---------------------------------------------------------------------------
// SQL: archive, then guarded per-row statements; rollback restores the archived values.
// ---------------------------------------------------------------------------
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const table = { form: "word_forms", form_delete: "word_forms", column: "learning_objects", na: "resource_field_status" };
const sql = [`-- Review round 2 ${batch}: ${changes.length} changes, ${closed.length} suggestions closed.`, "begin;"];
for (let i = 0; i < changes.length; i += 500) sql.push(`insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason) values\n  ${changes.slice(i, i + 500).map((c) => `(${q(batch)}, ${q(c.id)}, ${q(table[c.kind])}, ${q(c.field)}, ${q(c.old)}, ${q(c.value)}, ${q(c.reason)})`).join(",\n  ")};`);
const back = [];
for (const c of changes) {
  if (c.kind === "form" && c.old === null) { sql.push(`insert into public.word_forms (learning_object_id, form_type, form_value, sort_order) values (${q(c.id)}, ${q(c.field)}, ${q(c.value)}, 0) on conflict (learning_object_id, form_type) do nothing;`); back.push(`delete from public.word_forms where learning_object_id = ${q(c.id)} and form_type = ${q(c.field)} and form_value = ${q(c.value)};`); }
  else if (c.kind === "form") { sql.push(`update public.word_forms set form_value = ${q(c.value)}, updated_at = now() where learning_object_id = ${q(c.id)} and form_type = ${q(c.field)} and form_value = ${q(c.old)};`); back.push(`update public.word_forms set form_value = ${q(c.old)}, updated_at = now() where learning_object_id = ${q(c.id)} and form_type = ${q(c.field)} and form_value = ${q(c.value)};`); }
  else if (c.kind === "form_delete") { sql.push(`delete from public.word_forms where learning_object_id = ${q(c.id)} and form_type = ${q(c.field)} and form_value = ${q(c.old)};`); back.push(`insert into public.word_forms (learning_object_id, form_type, form_value, sort_order) values (${q(c.id)}, ${q(c.field)}, ${q(c.old)}, 0) on conflict (learning_object_id, form_type) do nothing;`); }
  else if (c.kind === "column") { sql.push(`update public.learning_objects set ${c.field} = ${q(c.value)}, updated_at = now() where id = ${q(c.id)} and ${c.field} is not distinct from ${q(c.old)};`); back.push(`update public.learning_objects set ${c.field} = ${q(c.old)} where id = ${q(c.id)} and ${c.field} is not distinct from ${q(c.value)};`); }
  else if (c.kind === "na") {
    // The row it replaces is archived whole, so the rollback puts back its status and source.
    const where = `learning_object_id = ${q(c.id)} and field = ${q(c.field)}`;
    sql.push(`insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason) select ${q(batch)}, learning_object_id, 'resource_field_status_row', field, row_to_json(r)::text, null, 'row before not_applicable' from public.resource_field_status r where ${where} and status in ('missing', 'mismatch');`);
    sql.push(`insert into public.resource_field_status (learning_object_id, field, status, source, detail, updated_at) values (${q(c.id)}, ${q(c.field)}, 'not_applicable', 'review-round-2', ${q(JSON.stringify({ reason: c.reason, batch }))}::jsonb, now()) on conflict (learning_object_id, field) do update set status = 'not_applicable', source = 'review-round-2', detail = excluded.detail, updated_at = now() where resource_field_status.status in ('missing', 'mismatch');`); back.push(`delete from public.resource_field_status where ${where} and source = 'review-round-2';\ninsert into public.resource_field_status select (json_populate_record(null::public.resource_field_status, a.old_value::json)).* from public.content_audit_archive a where a.batch_id = ${q(batch)} and a.table_name = 'resource_field_status_row' and a.learning_object_id = ${q(c.id)} and a.field = ${q(c.field)};`); }
}
for (const c of closed) { sql.push(`update public.content_suggestions set status = ${q(c.status)}, note = coalesce(note, '') || ' [review ${batch.slice(0, 8)}: ${c.note.replace(/'/g, "''")}]', reviewed_at = now() where id = ${c.id} and status = 'pending';`); back.push(`update public.content_suggestions set status = 'pending', reviewed_at = null, note = replace(note, ' [review ${batch.slice(0, 8)}: ${c.note.replace(/'/g, "''")}]', '') where id = ${c.id};`); }
sql.push("commit;");
writeFileSync(`${outDir}/review.sql`, sql.join("\n") + "\n");
writeFileSync(`${outDir}/review-rollback.sql`, ["begin;", ...back.reverse(), `delete from public.content_audit_archive where batch_id = ${q(batch)};`, "commit;"].join("\n") + "\n");
writeFileSync(`${outDir}/review-preview.tsv`, "headword\tkind\tfield\treason\told\tnew\n" + changes.map((c) => [c.swedish, c.kind, c.field, c.reason, c.old ?? "∅", c.value ?? "∅"].join("\t")).join("\n") + "\n");
writeFileSync(`${outDir}/review-list.tsv`, "who\theadword\tpos\tfield\twhy\tstored\tcandidate\n" + review.map((r) => [r.who, r.swedish, r.pos, r.field, r.why, r.stored, r.candidate].join("\t").replace(/\n/g, " ")).join("\n") + "\n");
const tally = (list, k) => list.reduce((m, c) => { m[k(c)] = (m[k(c)] || 0) + 1; return m; }, {});
console.log(JSON.stringify({ batch, changes: changes.length, byKind: tally(changes, (c) => `${c.kind} ${c.field} ${c.reason.split(":")[0]}`), closed: tally(closed, (c) => c.status), review: tally(review, (r) => `${r.who} ${r.field} ${r.why}`) }, null, 1));
