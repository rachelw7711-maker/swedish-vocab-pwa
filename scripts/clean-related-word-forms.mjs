// Ordfamilj clean-up (2026-11-07): related_words lines that are only the headword itself
// or one of its own inflected forms ("lampor | 灯（复数）" on lampa) are its grammar, not
// its family; the app showed them as family members, linked to the headword's own entry.
//
// A line is removed only when that is certain:
//   - it is the headword itself, or
//   - it is one of the headword's own word_forms (participles aside: those are words of
//     their own), no entry has it as its headword, its note names no other part of speech,
//     SALDO reads it as the headword's form (or doesn't know it), and the line itself says
//     it is a form ("复数", "definite form" …) with nothing that points to a word of another
//     class or a use of its own (so "rättvisa | 正义" on rättvis, "arabiska | 阿拉伯语" on
//     arabisk, "förhållanden | 情况；条件（复数常用）" stay);
//   - the headword's own spelling stays when an entry of another class is spelt so.
// Nothing is added or rewritten: a part of speech nobody can confirm is not filled in.
//
//   node --env-file=.env scripts/clean-related-word-forms.mjs plan      (read only: backup + changes + preview)
//   node --env-file=.env scripts/clean-related-word-forms.mjs apply     (writes rows whose text is still the backed-up one)
//   node --env-file=.env scripts/clean-related-word-forms.mjs rollback  (puts the backed-up text back where apply changed it)
// Files: data/reports/related-forms-2026-11-07/.
import { createClient } from "@supabase/supabase-js";
import { useSaldoFiles, formReadings } from "../server-lexicon.mjs";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const DIR = "data/reports/related-forms-2026-11-07";
const [command] = process.argv.slice(2);
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function all(table, columns, filter = (q) => q) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(db.from(table).select(columns)).order("id").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const POS_NOTES = { "名词": "noun", "动词": "verb", "形容词": "adjective", "副词": "adverb", "代词": "pronoun", "介词": "preposition", "连词": "conjunction", "数词": "numeral",
  noun: "noun", verb: "verb", adjective: "adjective", adverb: "adverb", pronoun: "pronoun", preposition: "preposition", conjunction: "conjunction", numeral: "numeral" };

// The line says it is a form of the headword ("（ärta的复数）", "(neuter form of liten)",
// "the definite form: …") — and nothing in it points to a word of another class: a
// language ("arabiska | 阿拉伯语"), an adverb ("skriftligt | in writing", "合法地"), a
// noun or verb sense. Without such a remark a line is kept, even when it looks like a
// form: "beska | 苦味" is the noun bitterness, not besk's plural (2026-11-07 dry run).
export const FORM_MARKER = /复数|定式|定形|定指|单数定|中性(?:单数)?形式|中性形|比较级|最高级|过去式|不定式|单数形式|\b(?:plural|definite (?:singular |plural )?form|definite singular|neuter (?:singular )?form|comparative|superlative|past form|past tense|infinitive form|singular form)\b/i;
export const OTHER_CLASS = /语|地[，,；;）)]|地$|名词|副词|动词|\b(?:language|dialect|adverb|noun|verb)\b|\bin an? [^,;]*\b(?:way|manner)\b/i;
// A form used in a sense or way of its own ("förhållanden | 情况；条件（复数常用）",
// "frun | … also often used as a form of address") is a usage note worth keeping.
export const USAGE_NOTE = /常|特指|\b(?:often|commonly|common|also|usually)\b/i;
// An adjective's form used as a noun or adverb: "vuxna | 成年人", "japanska | Japanese
// people", "ledset | sadly".
export const NOUN_OR_ADVERB_USE = /人|者|\b(?:people|woman|man|men)\b|\b\w{3,}ly\b/i;

const key = (s) => String(s || "").trim().toLowerCase();

// The measure the app uses (EntryTextParser.similarMeaning): shared Chinese character pairs
// or shared words. An unknown meaning is not similar here — nothing goes on a guess.
export function similarMeaning(a, b) {
  const units = (s) => {
    const t = key(s);
    if (!/[\u4e00-\u9fff]/.test(t)) return new Set(t.split(/[^\p{L}]+/u).filter((w) => w.length > 2));
    const chars = [...t].filter((c) => /[\u4e00-\u9fff]/.test(c));
    const out = new Set(chars.length === 1 ? chars : []);
    for (let i = 0; i + 1 < chars.length; i++) out.add(chars[i] + chars[i + 1]);
    return out;
  };
  const x = units(a), y = units(b);
  if (!x.size || !y.size) return false;
  const shared = [...x].filter((u) => y.has(u)).length;
  return shared / (x.size + y.size - shared) >= 0.5;
}

/** The lines of one related_words text to remove, with why. */
export function formLines(text, entry, { forms, headwords, readings, posBySpelling, meaning }) {
  const removed = [];
  const kept = [];
  for (const line of String(text || "").split("\n")) {
    const [rawWord, rawMeaning = ""] = line.split("|", 2);
    const word = key(String(rawWord || "").replace(/^[·•\-– ]+/, ""));
    if (!word) { kept.push(line); continue; }
    const note = rawMeaning.match(/[（(]([^（()）]*)[）)]\s*$/)?.[1]?.trim().toLowerCase() || "";
    const notePos = POS_NOTES[note] || null;
    let why = null;
    // SALDO reads the spelling only as a form of the headword, or doesn't know it at all
    // (then the entry's own word_forms decide). A spelling that is also another word
    // ("visst" the adverb, "sina" the verb, "vuxna" of växa) stays.
    const known = readings.get(word) || [];
    const saldoAgrees = known.every((r) => key(r.lemma) === key(entry.swedish));
    const adjective = ["adjective", "presens_particip", "perfekt_particip"].includes(entry.part_of_speech);
    if (word === key(entry.swedish)) {
      // A same-spelling word of another class ("hyra | 租（动词）" on the noun hyra) stays.
      const others = [...(posBySpelling.get(word) || [])].filter((p) => p !== entry.part_of_speech);
      // Only a repeat of the entry's own meaning goes; another sense ("krona | 树冠") stays.
      if ((!notePos || notePos === entry.part_of_speech) && !others.length && !OTHER_CLASS.test(rawMeaning)
        && similarMeaning(rawMeaning.replace(/[（(][^（()）]*[）)]\s*$/, ""), meaning)) why = "headword";
    } else if (forms.has(word) && !headwords.has(word) && saldoAgrees && (!notePos || notePos === entry.part_of_speech)
      && FORM_MARKER.test(rawMeaning) && !OTHER_CLASS.test(rawMeaning) && !USAGE_NOTE.test(rawMeaning)
      && !(adjective && (NOUN_OR_ADVERB_USE.test(rawMeaning) || (/sk$/.test(key(entry.swedish)) && /ska$/.test(word))))) why = "marked_form";
    if (why) removed.push({ line, why }); else kept.push(line);
  }
  return { removed, text: kept.join("\n") };
}

async function plan() {
  mkdirSync(DIR, { recursive: true });
  const objects = await all("learning_objects", "id, swedish, part_of_speech, object_type, status, chinese, related_words");
  const translations = await all("learning_object_translations", "id, learning_object_id, native_language, meaning, related_words", (q) => q.not("related_words", "is", null));
  const formRows = await all("word_forms", "id, learning_object_id, form_type, form_value");
  const live = objects.filter((o) => o.status !== "retired" && o.object_type === "word");
  const headwords = new Set(live.map((o) => key(o.swedish)));
  const posBySpelling = new Map();
  for (const o of live) (posBySpelling.get(key(o.swedish)) || posBySpelling.set(key(o.swedish), new Set()).get(key(o.swedish))).add(o.part_of_speech);
  const formsOf = new Map();
  for (const f of formRows) {
    if (/participle|_group$/.test(f.form_type)) continue;
    const set = formsOf.get(f.learning_object_id) || formsOf.set(f.learning_object_id, new Set()).get(f.learning_object_id);
    for (const v of String(f.form_value || "").split("/")) if (key(v)) set.add(key(v));
  }
  const byId = new Map(objects.map((o) => [o.id, o]));
  const zhMeaning = new Map(translations.filter((t) => t.native_language === "zh").map((t) => [t.learning_object_id, t.meaning]));
  const changes = [];
  const spellings = new Set();
  for (const text of [...translations.map((t) => t.related_words), ...objects.map((o) => o.related_words)])
    for (const line of String(text || "").split("\n")) { const w = key(line.split("|")[0]); if (w) spellings.add(w); }
  await useSaldoFiles();
  const readings = await formReadings(null, [...spellings]);
  const context = (o) => ({ forms: formsOf.get(o.id) || new Set(), headwords, readings, posBySpelling });
  for (const t of translations) {
    const o = byId.get(t.learning_object_id);
    if (!o || o.object_type !== "word" || !t.related_words) continue;
    const r = formLines(t.related_words, o, { ...context(o), meaning: t.meaning || (t.native_language === "zh" ? o.chinese : "") });
    if (r.removed.length) changes.push({ table: "learning_object_translations", id: t.id, entry: o.id, swedish: o.swedish, language: t.native_language, before: t.related_words, after: r.text, removed: r.removed });
  }
  for (const o of objects) {
    if (o.object_type !== "word" || !o.related_words) continue;
    const r = formLines(o.related_words, o, { ...context(o), meaning: zhMeaning.get(o.id) || o.chinese });
    if (r.removed.length) changes.push({ table: "learning_objects", id: o.id, entry: o.id, swedish: o.swedish, language: "zh", before: o.related_words, after: r.text, removed: r.removed });
  }
  writeFileSync(`${DIR}/backup.json`, JSON.stringify({
    takenAt: new Date().toISOString(),
    learning_object_translations: translations.map(({ id, learning_object_id, native_language, related_words }) => ({ id, learning_object_id, native_language, related_words })),
    learning_objects: objects.filter((o) => o.related_words).map(({ id, swedish, related_words }) => ({ id, swedish, related_words })),
  }));
  writeFileSync(`${DIR}/changes.json`, JSON.stringify(changes, null, 1));
  writeFileSync(`${DIR}/preview.tsv`, "table\theadword\tlanguage\twhy\tremoved line\n" + changes.flatMap((c) => c.removed.map((r) => [c.table, c.swedish, c.language, r.why, r.line].join("\t"))).join("\n") + "\n");
  const tally = (list, f) => list.reduce((m, x) => ((m[f(x)] = (m[f(x)] || 0) + 1), m), {});
  const lines = changes.flatMap((c) => c.removed);
  console.log(JSON.stringify({
    rowsChecked: { translations: translations.length, objects: objects.filter((o) => o.related_words).length },
    rowsChanged: tally(changes, (c) => c.table), linesRemoved: lines.length, byReason: tally(lines, (l) => l.why.replace(/:.*/, "")),
    emptiedRows: changes.filter((c) => !c.after.trim()).length,
  }, null, 1));
}

async function apply() {
  const changes = JSON.parse(readFileSync(`${DIR}/changes.json`, "utf8"));
  let done = 0, skipped = 0;
  const applied = [];
  for (const c of changes) {
    // Only where the text is still the one backed up: a row edited since is left alone.
    const { data, error } = await db.from(c.table).update({ related_words: c.after }).eq("id", c.id).eq("related_words", c.before).select("id");
    if (error) throw new Error(`${c.table} ${c.id}: ${error.message}`);
    if (data?.length) { done++; applied.push({ table: c.table, id: c.id }); } else skipped++;
  }
  writeFileSync(`${DIR}/applied.json`, JSON.stringify({ at: new Date().toISOString(), applied }, null, 1));
  console.log(JSON.stringify({ updated: done, skippedChangedSince: skipped }));
}

async function rollback() {
  const changes = JSON.parse(readFileSync(`${DIR}/changes.json`, "utf8"));
  const { applied } = JSON.parse(readFileSync(`${DIR}/applied.json`, "utf8"));
  const wanted = new Set(applied.map((a) => `${a.table}|${a.id}`));
  let restored = 0;
  for (const c of changes.filter((c) => wanted.has(`${c.table}|${c.id}`))) {
    const { data, error } = await db.from(c.table).update({ related_words: c.before }).eq("id", c.id).eq("related_words", c.after).select("id");
    if (error) throw new Error(`${c.table} ${c.id}: ${error.message}`);
    restored += data?.length || 0;
  }
  console.log(JSON.stringify({ restored, of: applied.length }));
}

const commands = { plan, apply, rollback };
if (!commands[command]) { console.error("usage: clean-related-word-forms.mjs plan|apply|rollback"); process.exit(1); }
if (command !== "plan" && !existsSync(`${DIR}/changes.json`)) throw new Error("run plan first");
// Once applied, the backup and changes are what rollback needs: plan doesn't overwrite them.
if (command === "plan" && existsSync(`${DIR}/applied.json`)) throw new Error("already applied: rollback reads changes.json and backup.json");
await commands[command]();
