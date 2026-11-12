// Round G stage 0 (2026-11-12), READ-ONLY: the public "partial" cards whose sense is verified and that
// miss only part of speech or forms. For each: which fields are open, and whether SALDO (one lexeme of
// the card's part of speech, or homographs that inflect alike) gives the same forms the card shows.
// Nothing is written. → data/reports/round-g/stage0-precheck.json
//   node --env-file=.env scripts/stage0-precheck.mjs
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { saldoEntries, saldoFormsDiffer, cardFieldsFromSaldo } from "../server-lexicon.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const norm = (s) => String(s || "").toLowerCase().split(/[\/,]/).map((x) => x.trim()).filter(Boolean).sort().join("/");
const cards = [];
for (let i = 0; ; i += 1000) {
  const d = must(await db.from("learning_objects").select("id, swedish, part_of_speech, object_type, status").in("status", ["published", "human_reviewed", "ai_generated"]).eq("verification_status", "partial").order("id").range(i, i + 999));
  cards.push(...d); if (d.length < 1000) break;
}
const out = [], tally = {};
for (let i = 0; i < cards.length; i += 20) {
  const ids = cards.slice(i, i + 20).map((c) => c.id);
  const rows = must(await db.from("resource_field_status").select("learning_object_id, field, status, grade, source").in("learning_object_id", ids));
  const forms = must(await db.from("word_forms").select("learning_object_id, form_type, form_value").in("learning_object_id", ids));
  for (const c of cards.slice(i, i + 20)) {
    const r = rows.filter((x) => x.learning_object_id === c.id);
    if (!r.some((x) => x.field === "sense" && x.status === "verified" && x.grade === "verified")) continue;
    const open = r.filter((x) => (x.field === "pos" && x.status !== "verified") || (x.field.startsWith("form:") && x.status === "present") || (x.status === "missing" && x.source === "saldo-morphology-2017")).map((x) => `${x.field}:${x.status}`);
    if (!r.some((x) => x.field === "pos")) open.push("pos:no_row");
    const shown = Object.fromEntries(forms.filter((f) => f.learning_object_id === c.id).map((f) => [f.form_type, f.form_value]));
    const saldo = c.object_type === "word" ? await saldoEntries(db, c.swedish, c.part_of_speech) : [];
    let cls;
    if (!saldo.length) cls = "no_saldo";
    else if (saldo.length > 1 && saldoFormsDiffer(saldo, c.part_of_speech)) cls = "homographs_differ";
    else {
      const want = cardFieldsFromSaldo(saldo[0], c.part_of_speech).forms;
      const diff = Object.keys(shown).filter((t) => want[t] && norm(want[t]) !== norm(shown[t]));
      const missing = Object.keys(want).filter((t) => !shown[t]);
      cls = diff.length ? "forms_differ" : missing.length ? "forms_missing_on_card" : "saldo_agrees";
      c.diff = diff.map((t) => ({ t, card: shown[t], saldo: want[t] })); c.missing = missing;
    }
    tally[cls] = (tally[cls] || 0) + 1;
    out.push({ id: c.id, swedish: c.swedish, pos: c.part_of_speech, type: c.object_type, open, cls, diff: c.diff, missing: c.missing });
  }
}
writeFileSync("data/reports/round-g/stage0-precheck.json", JSON.stringify({ total: out.length, tally, cards: out }, null, 1));
console.log({ total: out.length, tally });
