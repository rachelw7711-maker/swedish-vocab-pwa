// Round G (2026-11-11), READ-ONLY: the per-card ledger of the cards withheld as drafts (batch of
// scripts/withhold-unverified.mjs). Zero AI. For each card, item by item:
//   headword  a word whose headword is an inflected form of another SALDO lemma (konsumentregler →
//             konsumentregel), and whether that lemma has a card;
//   pos       the dictionary families listing it (SALDO, its compound head, a participle's verb,
//             Lexin, Wiktionary — Lexin and Folkets are one family), an expression's listing;
//   sense     a word: the Lexin sense its English and Swedish definition both match
//             (dictionary_sense_link); an expression: a Lexin idiom of its own whose English matches;
//             else only the English overlap (a candidate, ai_consistent);
//   conflicts every mismatch row with its source — an AI verdict (audit-2026-11-02, check-entries,
//             reading_check) against a dictionary listing is "ai_vs_dictionary", one no dictionary
//             contradicts stays a conflict;
//   learners  user_words rows (saved / studied), never changed.
// → data/reports/round-g/withheld-ledger.json and .md (one row per card) and a proposed outcome:
//   restore   no conflict left, part of speech and the core sense verified by a dictionary
//   fix       a definite error the dictionaries name (inflected headword, a form SALDO/Lexin gives
//             otherwise, a part of speech no dictionary has while another is listed)
//   draft     nothing verifies the core: stays withheld, with what was looked up and what would decide it
//   node --env-file=.env scripts/withheld-ledger.mjs <withhold batch>
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { useSaldoFiles, saldoEntries, compoundRows, participleRows, lemmatize, saldoHasExpression } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries, posFamilies, englishEquivalents, meaningSupport, expressionInReferences } from "../server-references.mjs";
import { lexinSenseLink, aiObjectionAnswered } from "../server-evidence.mjs";

const batch = process.argv[2];
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });
const withheld = JSON.parse(readFileSync(`data/reports/round-g/withhold-${batch}.json`, "utf8")).cards;
const ids = withheld.map((c) => c.id);
// 25 ids a request: a request returns at most 1000 rows, and 150 cards' field rows were cut off
// silently (round G: i åratal's pos mismatch went unread). A full page is an error, not a result.
const inIds = async (t, c, col = "learning_object_id") => {
  const o = [];
  for (let i = 0; i < ids.length; i += 25) {
    const rows = must(await db.from(t).select(c).in(col, ids.slice(i, i + 25)));
    if (rows.length >= 1000) throw new Error(`${t}: 1000 rows for 25 ids — read would be cut off`);
    o.push(...rows);
  }
  return o;
};
const cards = new Map((await inIds("learning_objects", "id, swedish, part_of_speech, object_type, status, verification_status, source, swedish_explanation", "id")).map((c) => [c.id, c]));
const en = new Map((await inIds("learning_object_translations", "learning_object_id, native_language, meaning")).filter((t) => t.native_language === "en").map((t) => [t.learning_object_id, t.meaning]));
const zh = new Map((await inIds("learning_object_translations", "learning_object_id, native_language, meaning")).filter((t) => t.native_language === "zh").map((t) => [t.learning_object_id, t.meaning]));
const group = (rows) => { const m = new Map(); for (const r of rows) (m.get(r.learning_object_id) || m.set(r.learning_object_id, []).get(r.learning_object_id)).push(r); return m; };
const status = group(await inIds("resource_field_status", "learning_object_id, field, status, source, grade, detail"));
const forms = group(await inIds("word_forms", "learning_object_id, form_type, form_value"));
const learners = group(await inIds("user_words", "word_id, status, review_count", "word_id").then((r) => r.map((x) => ({ ...x, learning_object_id: x.word_id }))));
const AI_SOURCES = /^(audit-2026-11-02|check-entries|reading_check|ai_check)/;
const key = (s) => String(s || "").trim().toLowerCase();

const out = [];
for (const w of withheld) {
  const c = cards.get(w.id);
  if (!c) { out.push({ id: w.id, swedish: w.swedish, missing: true }); continue; }
  const lemma = c.swedish.trim(), pos = c.part_of_speech, rows = status.get(c.id) || [];
  const expression = c.object_type !== "word" || /\s/.test(lemma);
  const own = [lemma, ...(forms.get(c.id) || []).map((f) => f.form_value)];
  const refs = await referenceEntries(null, lemma);
  const row = { id: c.id, swedish: lemma, pos, type: c.object_type, source: c.source, wasStatus: w.status, why: w.verification_status, nowStatus: c.status, nowVerification: c.verification_status, meaningEn: en.get(c.id) || "", meaningZh: zh.get(c.id) || "" };

  // Headword: an inflected form of another lemma (and not a lemma of its own of this part of speech).
  if (!expression) {
    const ownLemma = (await saldoEntries(null, lemma, pos)).length > 0;
    const readings = (await lemmatize(null, key(lemma))).filter((r) => key(r.lemma) !== key(lemma));
    // Not an error (the generation's own rules, posDecision): a lemma Lexin lists as this part of
    // speech (sådan, flytande); a participle entry (förvandlad, frilansande); an adverb or noun
    // regularly converted from an adjective or participle (noggrant, förbluffande); an adjective
    // that is a participle of a listed verb (förföljd) — a part-of-speech label question, not a headword.
    const lexinHas = posFamilies(refs, pos).includes("lexin");
    const regular = readings.some((r) => /particip/.test(pos) ? r.pos === "verb"
      : (pos === "adverb" || pos === "noun") ? ["adjective", "verb"].includes(r.pos) && /(t|nde|d)$/.test(key(lemma))
      : pos === "adjective" ? r.pos === "verb" && /(d|t|nde|en)$/.test(key(lemma)) : false);
    if (!ownLemma && !lexinHas && !regular && readings.length) {
      const target = readings.find((r) => r.pos === pos) || readings[0];
      const { data } = await db.from("learning_objects").select("id, status").eq("object_type", "word").ilike("swedish", target.lemma).eq("part_of_speech", target.pos).neq("status", "retired").limit(1);
      row.headword = { inflectedOf: target.lemma, pos: target.pos, lemmaCard: data?.[0]?.id || null, lemmaCardStatus: data?.[0]?.status || null };
    }
  }
  // Part of speech / listing.
  let fam = [];
  if (expression) {
    const hits = await expressionInReferences(null, lemma);
    if (await saldoHasExpression(null, [lemma])) hits.push({ source: "saldo" });
    fam = [...new Set(hits.map((h) => (h.source === "saldo" ? "saldo" : h.source === "enwikt" ? "wiktionary" : "lexin")))];
    row.listing = hits.slice(0, 3).map((h) => `${h.source}:${h.headword || ""}${h.idiom ? ` «${h.idiom}»` : ""}`);
    const idiomEn = hits.filter((h) => h.english).map((h) => ({ source: h.source, text: h.english }));
    row.senseEvidence = idiomEn.length && meaningSupport(row.meaningEn, idiomEn).length ? "dictionary_idiom_english" : hits.length ? "listed_meaning_unmatched" : "none";
  } else {
    if ((await saldoEntries(null, lemma, pos)).length) fam.push("saldo");
    fam.push(...posFamilies(refs, pos));
    if (!fam.includes("saldo") && /particip/.test(pos) && (await participleRows(null, lemma, pos)).length) fam.push("saldo-participle");
    if (!fam.includes("saldo") && (await compoundRows(null, lemma, pos)).length) fam.push("saldo-compound");
    fam = [...new Set(fam)];
    const link = await lexinSenseLink(null, refs, pos, { meaningEn: row.meaningEn, swedishExplanation: c.swedish_explanation, forms: own });
    const overlap = meaningSupport(row.meaningEn, englishEquivalents(refs, pos)).length > 0;
    row.senseEvidence = link.linked ? `dictionary_sense_link:${link.variant}` : overlap ? "english_overlap (candidate)" : "none";
    if (!fam.length) row.otherPos = [...new Set((await saldoEntries(null, lemma)).map((r) => r.pos))];
  }
  row.posFamilies = fam;
  // Conflicts: what said "mismatch", and whether a dictionary listing answers it.
  row.conflicts = rows.filter((r) => r.status === "mismatch").map((r) => {
    const ai = AI_SOURCES.test(r.source || "");
    // The same rule as reference-check (aiObjectionAnswered): a word's part of speech only — an
    // expression's listing shows it exists, not its part of speech.
    const korpPos = rows.find((x) => x.field === "sense")?.detail?.korp?.pos?.ok === true ? ["korp"] : [];
    const answered = !expression && aiObjectionAnswered({ field: r.field, source: r.source }, [...fam, ...korpPos]);
    return { field: r.field, source: r.source, kind: ai ? (answered ? "ai_vs_dictionary" : "ai_only") : "dictionary", detail: r.detail };
  });
  row.verified = rows.filter((r) => r.status === "verified").map((r) => `${r.field}${r.grade ? `(${r.grade})` : ""}`);
  row.learners = (learners.get(c.id) || []).length;

  // Proposed outcome.
  const dictConflict = row.conflicts.filter((x) => x.kind === "dictionary");
  const aiOnly = row.conflicts.filter((x) => x.kind === "ai_only");
  // Core sense: a dictionary tie found now, or a sense row already graded verified by evidence that
  // can verify (Korp sense sentences, a dictionary link or listing, the compound rule).
  const senseRow = rows.find((r) => r.field === "sense" && r.status === "verified" && r.grade === "verified");
  if (senseRow && !/^dictionary_(sense_link|idiom_english)/.test(row.senseEvidence)) row.senseEvidence = `stored:${senseRow.source}`;
  const coreSense = /^(dictionary_(sense_link|idiom_english)|stored:)/.test(row.senseEvidence);
  if (row.headword) row.outcome = { decision: "fix", reason: `headword is an inflected form of ${row.headword.inflectedOf} (${row.headword.pos})${row.headword.lemmaCard ? ", which has a card" : ""}` };
  else if (dictConflict.length) row.outcome = { decision: "fix", reason: `dictionary disagrees: ${dictConflict.map((x) => `${x.field} stored ${x.detail?.stored} / ${x.source} ${x.detail?.reference}`).join("; ")}` };
  else if (!expression && !fam.length && row.otherPos?.length && row.conflicts.some((x) => x.field === "pos")) row.outcome = { decision: "fix", reason: `no dictionary has it as ${pos}; SALDO has it as ${(row.otherPos || []).join("/") || "nothing"}` };
  else if (aiOnly.length) row.outcome = { decision: "draft", reason: `AI-only objection no dictionary answers: ${aiOnly.map((x) => x.field).join(", ")}` };
  else if ((fam.length || rows.some((r) => r.field === "pos" && r.status === "verified")) && coreSense) row.outcome = { decision: "restore", reason: `part of speech ${fam.length ? `listed (${fam.join("+")})` : `verified (${rows.find((r) => r.field === "pos").source})`}, core sense ${row.senseEvidence}` };
  else if (fam.length) row.outcome = { decision: "draft", reason: `listed (${fam.join("+")}) but the core sense has only ${row.senseEvidence}`, needs: "a sense check (Korp sense sentences or a second independent source)" };
  else row.outcome = { decision: "draft", reason: expression ? "no dictionary lists the expression (not an error by itself)" : "no dictionary lists the word", needs: expression ? "Korp attestation of the sequence + a sense check" : "SALDO/Lexin or Korp attestation" };
  out.push(row);
}
const tally = {};
for (const r of out) tally[r.outcome?.decision || "missing"] = (tally[r.outcome?.decision || "missing"] || 0) + 1;
writeFileSync("data/reports/round-g/withheld-ledger.json", JSON.stringify({ batch, tally, cards: out }, null, 1));
const cell = (s) => String(s ?? "").replace(/\|/g, "/").replace(/\n/g, " ");
const md = [`# 287 张撤回卡逐张台账（batch ${batch}，零 AI，${new Date().toISOString().slice(0, 10)}）`, "", `结果：${JSON.stringify(tally)}`, "",
  "| id | 词条 | 词性 | 类型 | 原状态 | 撤回原因 | 词性证据 | 义项证据 | 冲突 | 学习者 | 处理 | 依据 | 现状态 |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ...out.map((r) => `| ${r.id.slice(0, 8)} | ${cell(r.swedish)} | ${r.pos} | ${r.type} | ${r.wasStatus} | ${r.why} | ${cell((r.posFamilies || []).join("+") || "—")} | ${cell(r.senseEvidence)} | ${cell((r.conflicts || []).map((x) => `${x.field}:${x.kind}`).join(", ") || "—")} | ${r.learners} | ${r.outcome?.decision} | ${cell(r.outcome?.reason)} | ${r.nowStatus}/${r.nowVerification} |`)];
writeFileSync("data/reports/round-g/withheld-ledger.md", md.join("\n") + "\n");
console.log(tally);
