// The reviewed gap cards into the dictionary (2026-11-09). Each card was generated isolated (DB
// read-only, its writes recorded, tmp/harness3.mjs) and reviewed field by field
// (data/reports/round-e/gap-decisions.json: keep, drop, the reviewer's own text, or a field written
// again with Lexin's reference and reviewed). Here the card as it was saved is rebuilt from its
// recorded writes and the model's answer, the decisions are applied, and the result goes through
// the ordinary generation path (generateWordEntry) with the reviewed card given as the model's
// answer: SALDO and Lexin for lemma and forms, every check (P1–P6) again, the ordinary save — so
// nothing is saved the way no generated card is. A card unchanged by the review replays its
// recorded check answers (same input, nothing paid again); a changed one is checked anew.
// An entry of that headword and part of speech already in the dictionary is never duplicated:
// generation reuses it, and the card is then reported, not written.
//
//   node --env-file=.env scripts/import-gap-cards.mjs build                    → gap-import-cards.json (read-only)
//   node --env-file=.env scripts/import-gap-cards.mjs run --limit 50 [--write] → one batch; without --write isolated
// A batch writes data/reports/round-e/gap-import-<stamp>.json (created ids, the check of each) and
// a rollback SQL deleting exactly those entries (their rows cascade).
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const opt = (n, d = null) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const GAP = opt("--from", process.env.GAP_DIR || "");
const DECISIONS = "data/reports/round-e/gap-decisions.json";
const CARDS = "data/reports/round-e/gap-import-cards.json";
const lines = (t) => String(t || "").split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]);
const norm = (s) => String(s || "").trim().toLowerCase();

/** The card as generation saved it, from its recorded writes and the model's answers. */
function savedCard(rec, answer) {
  const op = (name) => rec.writes.filter((w) => w.op === name).map((w) => w.payload);
  const lo = op("insert learning_objects")[0];
  const tr = Object.fromEntries(op("insert learning_object_translations").map((t) => [t.native_language, t]));
  const examples = op("insert learning_object_examples").map((e) => {
    const a = (answer.examples || []).find((x) => norm(x.swedish) === norm(e.example_swedish)) || {};
    return { swedish: e.example_swedish, zh: a.zh || "", en: a.en || "" };
  });
  const enCol = lines(tr.en?.collocations), enRel = lines(tr.en?.related_words);
  return {
    ...answer,
    lemma: lo.swedish, pos: lo.part_of_speech === "other" ? answer.pos : lo.part_of_speech,
    meaning_zh: tr.zh?.meaning ?? answer.meaning_zh, meaning_en: tr.en?.meaning ?? answer.meaning_en,
    swedish_explanation: lo.swedish_explanation ?? answer.swedish_explanation,
    memory_tip_zh: tr.zh?.learning_tip ?? answer.memory_tip_zh, memory_tip_en: tr.en?.learning_tip ?? answer.memory_tip_en,
    examples,
    collocations: lines(tr.zh?.collocations).map(([phrase, zh, example]) => ({ phrase, zh: zh || "", en: enCol.find((c) => c[0] === phrase)?.[1] || "", example: example || "" })),
    related: lines(tr.zh?.related_words).map(([word, zh]) => ({ word, zh: (zh || "").replace(/（[^）]*）$/, ""), en: (enRel.find((r) => r[0] === word)?.[1] || "").replace(/\s*\([^)]*\)$/, ""),
      pos: (answer.related || []).find((r) => r.word === word)?.pos || "" })),
  };
}

/** The reviewer's decisions applied; returns the card and whether anything changed. */
function applyDecision(card, d) {
  const c = structuredClone(card);
  const before = JSON.stringify(c);
  if (d.set?.zh) c.meaning_zh = d.set.zh;
  if (d.set?.en) c.meaning_en = d.set.en;
  if (d.set?.explanation) c.swedish_explanation = d.set.explanation;
  if (d.set_examples) c.examples = d.set_examples.map((s) => c.examples.find((x) => x.swedish === s) || { swedish: s, zh: "", en: "" });
  c.examples = c.examples.filter((x) => !(d.drop_ex || []).includes(x.swedish)).map((x) => (d.replace_ex?.[x.swedish] ? { swedish: d.replace_ex[x.swedish], zh: "", en: "" } : x));
  for (const [sv, zh, en] of d.add_ex || []) if (!c.examples.some((x) => x.swedish === sv)) c.examples.push({ swedish: sv, zh, en });
  c.collocations = c.collocations.filter((x) => !(d.drop_col || []).includes(x.phrase)).map((x) => {
    const r = d.rename_col?.[x.phrase];
    if (r) return { phrase: r[0], zh: r[1], en: r[2], example: r[3] };
    return { ...x, ...(d.set_col_example?.[x.phrase] ? { example: d.set_col_example[x.phrase] } : {}), ...(d.set_col_zh?.[x.phrase] ? { zh: d.set_col_zh[x.phrase] } : {}) };
  });
  for (const [phrase, zh, en, example] of d.add_col || []) if (!c.collocations.some((x) => x.phrase === phrase)) c.collocations.push({ phrase, zh, en, example });
  c.related = c.related.filter((x) => !(d.drop_rel || []).includes(x.word)).map((x) => (d.set_rel?.[x.word] ? { ...x, zh: d.set_rel[x.word][0].replace(/（[^）]*）$/, ""), en: d.set_rel[x.word][1].replace(/\s*\([^)]*\)$/, "") } : x));
  if (d.dedupe_rel) c.related = c.related.filter((x, i, a) => a.findIndex((y) => y.word === x.word) === i);
  for (const [word, zh, en] of d.add_rel || []) if (!c.related.some((x) => x.word === word)) c.related.push({ word, zh: zh.replace(/（[^）]*）$/, ""), en: en.replace(/\s*\([^)]*\)$/, ""), pos: /名词/.test(zh) ? "noun" : "" });
  // A replaced or added example's translations, written by the reviewer.
  c.examples = c.examples.map((x) => (d.ex_tr?.[x.swedish] ? { ...x, zh: d.ex_tr[x.swedish][0], en: d.ex_tr[x.swedish][1] } : x));
  return { card: c, changed: JSON.stringify(c) !== before };
}

function recordsOf(dir) {
  const out = new Map();
  for (const sub of readdirSync(dir).filter((d) => d.startsWith("gap-"))) {
    const raw = existsSync(join(dir, sub, "raw.jsonl")) ? readFileSync(join(dir, sub, "raw.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    for (const f of readdirSync(join(dir, sub)).filter((f) => f.endsWith(".json"))) {
      const rec = JSON.parse(readFileSync(join(dir, sub, f), "utf8"));
      if (rec.error || !rec.writes?.some((w) => w.op === "insert learning_objects")) continue;
      // The later batch (gap-retry) wins over a failed earlier one.
      out.set(rec.id, { rec, raw: raw.filter((r) => r.item === rec.id) });
    }
  }
  return out;
}

if (args[0] === "build") {
  if (!GAP) throw new Error("--from <dir with gap-b*/ outputs>");
  const decisions = JSON.parse(readFileSync(DECISIONS, "utf8"));
  const records = recordsOf(GAP);
  const cards = [];
  for (const [id, d] of Object.entries(decisions)) {
    const r = records.get(id);
    if (!r) { cards.push({ id, error: "no record" }); continue; }
    const answerText = r.raw.find((x) => x.schema === "swedish_word_card_v2")?.text;
    const answer = JSON.parse(answerText);
    const saved = savedCard(r.rec, answer);
    if (d.verdict === "regenerate") {
      // Generated again (gap-regen) and still wrong: the reviewer's card, on the new answer's frame.
      const again = recordsOf(GAP).get(id) && existsSync(join(GAP, "gap-regen", "raw.jsonl"))
        ? JSON.parse(readFileSync(join(GAP, "gap-regen", "raw.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).find((x) => x.item === id && x.schema === "swedish_word_card_v2").text) : answer;
      cards.push({ id, word: saved.lemma, pos: saved.pos, verdict: "regenerate", why: d.why, changed: true, untranslated: [], card: d.card ? { ...again, ...d.card } : null });
      continue;
    }
    if (d.hold) { cards.push({ id, word: saved.lemma, pos: saved.pos, verdict: "hold", why: d.hold, card: null }); continue; }
    const { card, changed } = applyDecision(saved, d);
    const untranslated = card.examples.filter((x) => !x.zh || !x.en).map((x) => x.swedish);
    cards.push({ id, word: saved.lemma, pos: saved.pos, verdict: d.verdict, changed, untranslated, card,
      replay: changed || d.no_replay ? null : Object.fromEntries(["card_detail_check", "sense_check"].map((s) => [s, r.raw.filter((x) => x.schema === s).map((x) => x.text)])) });
  }
  writeFileSync(CARDS, JSON.stringify({ built: new Date().toISOString(), cards }, null, 1));
  const n = (f) => cards.filter(f).length;
  console.log({ cards: cards.length, unchanged: n((c) => c.verdict === "ok" || c.changed === false), changed: n((c) => c.changed), regenerate: n((c) => c.verdict === "regenerate"), untranslated_examples: cards.reduce((s, c) => s + (c.untranslated?.length || 0), 0), errors: n((c) => c.error) });
  process.exit(0);
}

if (args[0] === "run") {
  const WRITE = args.includes("--write");
  const LIMIT = Number(opt("--limit", "50"));
  const { cards } = JSON.parse(readFileSync(CARDS, "utf8"));
  const done = new Set(readdirSync("data/reports/round-e").filter((f) => /^gap-import-.*\.json$/.test(f) && !f.includes("cards"))
    .flatMap((f) => JSON.parse(readFileSync(join("data/reports/round-e", f), "utf8")).rows.filter((r) => r.written).map((r) => r.id)));
  const only = opt("--only") ? new Set(opt("--only").split(",")) : null;
  const todo = cards.filter((c) => c.card && !c.untranslated?.length && !done.has(c.id) && (!only || only.has(c.id))).slice(0, LIMIT);
  const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  let current = null;
  const realFetch = globalThis.fetch;
  const spent = { calls: 0, replayed: 0, input: 0, output: 0 };
  globalThis.fetch = async (url, init) => {
    if (!String(url).includes("api.openai.com")) return realFetch(url, init);
    const schema = JSON.parse(init.body).text?.format?.name;
    const reply = (text) => new Response(JSON.stringify({ output_text: text, usage: {} }), { status: 200, headers: { "content-type": "application/json" } });
    if (schema === "swedish_word_card_v2") return reply(JSON.stringify(current.card));
    const q = current.replay?.[schema];
    if (q?.length) { spent.replayed++; return reply(q.shift()); }
    const res = await realFetch(url, init);
    const data = await res.clone().json();
    spent.calls++; spent.input += data.usage?.input_tokens || 0; spent.output += data.usage?.output_tokens || 0;
    return res;
  };
  // Isolated without --write: reads go to the database, writes are only recorded.
  let target = db;
  if (!WRITE) {
    const swallow = (table, m, payload) => { current.recorded?.push({ table, m, payload }); const r = { data: null, error: null }; const p = new Proxy(() => {}, { get(_, k) { return k === "then" ? (a, b) => Promise.resolve(r).then(a, b) : () => p; }, apply() { return p; } }); return p; };
    target = new Proxy(db, { get(t, k) { if (k !== "from") return t[k]?.bind?.(t) ?? t[k]; return (table) => { const q = t.from(table); return new Proxy(q, { get(qt, m) { if (["insert", "upsert", "update", "delete"].includes(m)) return (payload) => swallow(table, m, payload); return qt[m]?.bind?.(qt) ?? qt[m]; } }); }; } });
  }
  const { generateWordEntry } = await import("../server-native.mjs");
  const rows = [];
  for (const c of todo) {
    current = { ...structuredClone(c), recorded: [] };
    const { data: before } = await db.from("learning_objects").select("id").ilike("swedish", c.word).eq("part_of_speech", c.pos === "other" ? "other" : c.pos).neq("status", "retired");
    if (before?.length) { rows.push({ id: c.id, word: c.word, skipped: "exists", existing: before.map((b) => b.id) }); console.log(c.word, "exists — not written"); continue; }
    try {
      const r = await generateWordEntry({ supabaseAdmin: target, userId: null, word: c.word, nativeLanguage: "zh", pos: c.pos === "other" ? null : c.pos, chargeQuota: false, source: "gap review 2026-11-09" });
      const saved = (t) => current.recorded.filter((w) => w.table === t).map((w) => w.payload);
      const tr = saved("learning_object_translations").flat().find((t) => t?.native_language === "zh");
      rows.push({ id: c.id, word: c.word, entryId: r.entryId, created: r.created, written: WRITE && r.created,
        ...(WRITE ? {} : { would_save: { meaning: tr?.meaning, examples: saved("learning_object_examples").flat().map((e) => e.example_swedish), collocations: tr?.collocations, related: tr?.related_words,
          fields: saved("resource_field_status").flat().filter((f) => !String(f.field).startsWith("form:")).map((f) => ({ field: f.field, status: f.status, open: (f.detail?.open_items || []).map((o) => `${o.kind}:${o.text || o.phrase || o.word || ""}`), removed: f.detail?.removed || f.detail?.dropped || null, ...(f.status === "missing" && f.detail ? { why: f.detail.error || f.detail.problems || null } : {}) })) } }) });
      console.log(c.word, r.created ? "created" : "reused", r.entryId);
    } catch (error) {
      rows.push({ id: c.id, word: c.word, error: error.message });
      console.log(c.word, "not saved:", error.message);
    }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const report = `data/reports/round-e/gap-import-${WRITE ? "" : "dry-"}${stamp}.json`;
  writeFileSync(report, JSON.stringify({ write: WRITE, spent, rows }, null, 1));
  const created = rows.filter((r) => r.written).map((r) => r.entryId);
  if (WRITE) writeFileSync(report.replace(/\.json$/, "-rollback.sql"), ["begin;", ...(created.length ? [`delete from public.learning_objects where id in (${created.map((i) => `'${i}'`).join(", ")});`] : []), "commit;"].join("\n") + "\n");
  console.log({ batch: todo.length, created: created.length, skipped: rows.filter((r) => r.skipped).length, failed: rows.filter((r) => r.error).length, spent, report });
}
