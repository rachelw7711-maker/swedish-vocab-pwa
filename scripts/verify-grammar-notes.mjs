// Read-only: each conflict of scripts/audit-grammar-notes.mjs (data/reports/grammar-note-conflicts.json)
// checked again against every source there is, and classed (2026-11-09). SALDO found the conflict;
// here Lexin (its own forms), the corpus (Korp: the word's inflections as used) and the entry's
// own Grammatik table (word_forms, countability) each say whether they agree, so no conflict is
// called an error on one source's word:
//   confirmed_error      — the note contradicts SALDO and at least one other source (Lexin or Korp),
//                          and none supports the note;
//   special_usage        — the note gives a plural SALDO and Lexin lack, but the corpus uses one
//                          (a "kinds of" or other special plural): to be explained, not deleted;
//   dictionaries_differ  — Lexin (or the corpus) supports the note against SALDO;
//   audit_false_positive — the "unknown" form is a real form of the word (the corpus has it);
//   undetermined         — no second source either way.
// Writes data/reports/grammar-note-verified.json and .csv. Changes nothing in the database.
//   node --env-file=.env scripts/verify-grammar-notes.mjs [--no-korp]
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries, lexinForms } from "../server-references.mjs";
import { saldoGrammar, grammarNoteConflicts, plainGrammarNote } from "../server-grammar-consistency.mjs";
import { korpFormReadings, judgeForm, groupFromForms } from "../server-korp.mjs";

await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { conflicts } = JSON.parse(readFileSync("data/reports/grammar-note-conflicts.json", "utf8"));
const ids = [...new Set(conflicts.map((c) => c.id))];

// The entry's own table and both language notes, read in pages.
async function rows(table, columns, column, list) {
  const out = [];
  for (let i = 0; i < list.length; i += 200) {
    const { data, error } = await db.from(table).select(columns).in(column, list.slice(i, i + 200));
    if (error) throw error;
    out.push(...data);
  }
  return out;
}
const forms = await rows("word_forms", "learning_object_id, form_type, form_value", "learning_object_id", ids);
const notes = await rows("learning_object_translations", "learning_object_id, native_language, grammar_note", "learning_object_id", ids);
const entries = await rows("learning_objects", "id, swedish, part_of_speech, pos_detail, countability, status", "id", ids);
const table = (id) => Object.fromEntries(forms.filter((f) => f.learning_object_id === id).map((f) => [f.form_type, f.form_value]));
const noteOf = (id, lang) => notes.find((n) => n.learning_object_id === id && n.native_language === lang)?.grammar_note || "";

const lexinGender = (def) => (/t$/.test(def) ? "n" : /n$/.test(def) ? "u" : null);
const NUM = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5 };
const noteGroup = (text) => {
  const m = /第\s*([1-5一二三四五])\s*(?:变格|變格|组|組|类|類)|(?:declension|conjugation)\s*(?:group|class)?\s*([1-5])\b|group\s*([1-5])\b/i.exec(text);
  return m ? Number(NUM[m[1]] || m[1] || m[2] || m[3]) : null;
};

// --no-korp: Korp not asked (it was unreachable on 2026-11-09); what needs the corpus is then
// "undetermined" until a run with it. Each lemma's readings are given 60 s.
const NO_KORP = process.argv.includes("--no-korp");
const korp = new Map();
async function readings(lemma) {
  if (NO_KORP) return null;
  if (!korp.has(lemma)) korp.set(lemma, Promise.race([korpFormReadings(lemma, "noun").then((r) => r.readings), new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 60000))]).catch(() => null));
  return korp.get(lemma);
}

const out = [];
let done = 0;
async function verify(c) {
  const e = entries.find((x) => x.id === c.id);
  const saldo = await saldoGrammar(null, c.swedish, c.pos);
  const refs = await referenceEntries(null, c.swedish);
  // A compound Lexin lacks is held against its last part, which it inflects like (bankkonto: konto).
  let lexin = (refs.lexin_sv || []).filter((x) => x.pos === "noun"), lexinWord = c.swedish;
  for (let i = 2; !lexin.length && i <= c.swedish.length - 3; i++) {
    const head = c.swedish.slice(i).toLowerCase();
    const found = ((await referenceEntries(null, head)).lexin_sv || []).filter((x) => x.pos === "noun");
    if (found.length) { lexin = found; lexinWord = head; }
  }
  const lexinG = new Set(lexin.map((x) => lexinGender(String(x.forms?.singular_definite || "").toLowerCase())).filter(Boolean));
  const lexinGroups = new Set(lexin.map((x) => { const f = lexinForms(x, "noun"); return f.noPlural ? null : groupFromForms(lexinWord, f.forms.plural_indefinite, lexinGender(String(x.forms?.singular_definite || "")) === "n" ? "ett" : "en"); }).filter(Boolean).map(Number));
  // Countability is the word's own (kärnkraft has none, kraft has krafter): never the last part's.
  const ownLexin = lexinWord === c.swedish ? lexin : [];
  const lexinNoPlural = ownLexin.length ? ownLexin.every((x) => lexinForms(x, "noun").noPlural) : null;
  const k = await readings(c.swedish);
  const corpusNoPlural = k ? judgeForm("plural_indefinite", "–", k) : null;
  const own = table(c.id);
  const verdicts = [];
  for (const x of c.conflicts) {
    const ev = { saldo: saldo ? { groups: [...saldo.groups], genders: [...saldo.genders], plural: saldo.plural } : null };
    let status;
    if (x.kind === "gender") {
      ev.lexin = [...lexinG]; if (lexinWord !== c.swedish) ev.lexin_word = lexinWord;
      const noteSays = /^note (en|ett)/.exec(x.detail)?.[1] === "ett" ? "n" : "u";
      status = lexinG.has(noteSays) ? "dictionaries_differ" : lexinG.size ? "confirmed_error" : "undetermined";
    } else if (x.kind === "group") {
      const said = noteGroup(c.note);
      ev.lexin = [...lexinGroups]; if (lexinWord !== c.swedish) ev.lexin_word = lexinWord; ev.table = own.declension_group || null; ev.note = said;
      const tableAgrees = own.declension_group && saldo?.groups.has(Number(own.declension_group));
      status = lexinGroups.has(said) ? "dictionaries_differ" : lexinGroups.size || tableAgrees ? "confirmed_error" : "undetermined";
    } else if (x.kind === "plural_for_no_plural" || x.kind === "plural_unconfirmed") {
      ev.lexin = lexinNoPlural === null ? "not in Lexin" : lexinNoPlural ? "no plural" : "plural"; ev.corpus = corpusNoPlural?.reason || "no answer"; ev.table_countability = e?.countability || null;
      if (corpusNoPlural?.ok === false && corpusNoPlural.hits >= 20) status = lexinNoPlural === false ? "dictionaries_differ" : "special_usage";
      else if (lexinNoPlural === false) status = "dictionaries_differ";
      else if (lexinNoPlural || corpusNoPlural?.ok) status = "confirmed_error";
      else status = "undetermined";
    } else if (x.kind === "unknown_form" || x.kind === "form_unconfirmed") {
      const words = x.detail.split(/,\s*/);
      const seen = words.map((w) => ({ w, n: (k || []).filter((r) => r.word === w).reduce((s, r) => s + r.n, 0) }));
      ev.corpus = k ? seen : "no answer";
      status = !k ? "undetermined" : seen.every((s) => s.n >= 3) ? "audit_false_positive" : seen.some((s) => s.n >= 3) ? "undetermined" : "confirmed_error";
    }
    verdicts.push({ kind: x.kind, detail: x.detail, status, evidence: ev });
  }
  const rank = ["confirmed_error", "special_usage", "dictionaries_differ", "undetermined", "audit_false_positive"];
  const status = rank.find((r) => verdicts.some((v) => v.status === r));
  // The fix proposed: the other language's note when it agrees with every source and only this
  // one is wrong (the English notes renumbered declension groups in translation) — to be
  // translated from it; else the note written again from SALDO; else none (a reviewer writes it).
  const otherLang = c.language === "zh" ? "en" : "zh";
  const other = noteOf(c.id, otherLang);
  const otherClean = other && !(await grammarNoteConflicts(null, { lemma: c.swedish, pos: c.pos, note: other, refs })).length;
  const plain = await plainGrammarNote(null, { lemma: c.swedish, pos: c.pos, refs });
  const fix = status !== "confirmed_error" ? null : otherClean ? { how: `translate_from_${otherLang}`, source: other } : plain?.[c.language] ? { how: "from_saldo", text: plain[c.language] } : null;
  out.push({
    id: c.id, swedish: c.swedish, pos: c.pos, language: c.language, status, verdicts,
    original: c.note, table: { declension_group: own.declension_group || null, plural_indefinite: own.plural_indefinite || null, countability: e?.countability || null },
    // A plural taken away needs the corpus too (design: SALDO and Lexin give none, "designer"
    // is used): without Korp's answer it waits for review or a run with Korp.
    fix, batch: status === "confirmed_error" && !!fix && verdicts.every((v) => ["confirmed_error", "audit_false_positive"].includes(v.status))
      && verdicts.every((v) => !/plural/.test(v.kind) || corpusNoPlural?.ok === true),
    review: status !== "confirmed_error" || !fix,
  });
  if (++done % 50 === 0) console.log(done, "/", conflicts.length);
}
const queue = [...conflicts];
await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) await verify(queue.shift()); }));
const count = (f) => out.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
const summary = {
  korp: NO_KORP ? "not asked" : "asked", rows: out.length, entries: new Set(out.map((r) => r.id)).size,
  by_status: count((r) => r.status), by_status_language: count((r) => `${r.status}|${r.language}`),
  by_kind_status: out.reduce((m, r) => { for (const v of r.verdicts) m[`${v.kind}|${v.status}`] = (m[`${v.kind}|${v.status}`] || 0) + 1; return m; }, {}),
  fix: count((r) => r.fix?.how || "none"), batch: out.filter((r) => r.batch).length, review: out.filter((r) => r.review).length,
};
writeFileSync("data/reports/grammar-note-verified.json", JSON.stringify({ summary, rows: out }, null, 1));
const csv = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
writeFileSync("data/reports/grammar-note-verified.csv", ["id,swedish,language,status,kinds,original,fix_how,fix_text,batch,review,evidence"].concat(out.map((r) => [r.id, r.swedish, r.language, r.status, r.verdicts.map((v) => `${v.kind}:${v.status}`).join(" "), r.original, r.fix?.how || "", r.fix?.text || r.fix?.source || "", r.batch, r.review, JSON.stringify(r.verdicts.map((v) => v.evidence))].map(csv).join(","))).join("\n"));
console.log(JSON.stringify(summary, null, 1));
