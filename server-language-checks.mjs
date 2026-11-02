// Language checks on what the AI writes (2026-11-02), in layers:
//   1. the dictionary and SALDO — forms and the parts of speech a word can have;
//   2. Swedish Wiktionary — when SALDO doesn't have the word, or for the senses of each
//      part of speech;
//   3. an AI check of meaning against context and references — only for what the two
//      dictionaries can't decide (which sense, translations), several items per call;
//   4. before saving — part of speech, meanings, forms and examples must agree.
// Each check says what it found: confirmed, corrected, or not confirmed (no evidence
// either way) — "the forms match SALDO" is never taken to mean the entry is right.

import { formReadings, saldoPartsOfSpeech } from "./server-lexicon.mjs";
import { lookupWiktionary, wiktionaryReadings } from "./server-wiktionary.mjs";
import { callOpenAIJson, logUsage } from "./server-native.mjs";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const ARTICLE = /^(en|ett)\s+/i;

/**
 * The part of speech a textbook word list entry gives its word: "en torka" → noun,
 * "drabba, drabbas" / "att agera" → verb, "ofantlig, -t" → adjective. Null when the
 * entry doesn't say ("blöt", "hållbar").
 */
export function glossaryPartOfSpeech(printed) {
  const parts = String(printed || "").split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const first = parts[0].toLowerCase();
  if (ARTICLE.test(first)) return { lemma: first.replace(ARTICLE, "").split(/\s+/)[0], pos: "noun" };
  if (/^att\s+/.test(first)) return { lemma: first.replace(/^att\s+/, "").split(/\s+/)[0], pos: "verb" };
  const lemma = first.split(/\s+/)[0];
  const second = (parts[1] || "").toLowerCase().split(/\s+/)[0];
  if (!second) return null;
  if (second === "-t" || second === "-tt") return { lemma, pos: "adjective" };
  // "drabba, drabbas", "påverka, påverkar", "införa, inför", "smälta, smälter, smälte, smält"
  if (!second.startsWith("-") && /[rs]$/.test(second) && /[aeiouyåäö]$/.test(lemma) && second.slice(0, 2) === lemma.slice(0, 2)) return { lemma, pos: "verb" };
  return null;
}

/** lemma → part of speech from the whole word list, for words it names one for. */
export function glossaryPartsOfSpeech(glossary = []) {
  const map = new Map();
  for (const g of glossary || []) {
    const found = glossaryPartOfSpeech(g?.word);
    if (found && !map.has(found.lemma)) map.set(found.lemma, found.pos);
  }
  return map;
}

/**
 * The parts of speech the references give a headword: SALDO first, Wiktionary only when
 * SALDO has none (a compound like "klimatflykting") or when asked. { saldo, wiktionary,
 * wiktionaryStatus, all } — wiktionaryStatus "skipped" when it wasn't asked.
 */
export async function referencePartsOfSpeech(supabaseAdmin, lemma, { askWiktionary = false } = {}) {
  const saldo = await saldoPartsOfSpeech(supabaseAdmin, lemma);
  let wiktionary = [];
  let wiktionaryStatus = "skipped";
  if (askWiktionary || !saldo.length) {
    const page = await lookupWiktionary(supabaseAdmin, lemma);
    wiktionaryStatus = page.status;
    wiktionary = [...new Set(wiktionaryReadings(page).filter((r) => !r.form).map((r) => r.pos))];
  }
  return { saldo, wiktionary, wiktionaryStatus, all: [...new Set([...saldo, ...wiktionary])] };
}

/**
 * A keyword's part of speech against the evidence. The textbook's own word list decides
 * when it names one ("en torka" → noun); otherwise the AI's choice must be one the
 * references give the word. A word no reference knows is kept as unconfirmed — not
 * missing from a dictionary doesn't make it wrong.
 *   { pos, status: "confirmed" | "corrected" | "unconfirmed" | "rejected", reason }
 */
// Regular conversions dictionaries often don't list: an adjective's -t form used as an
// adverb ("explicit", "konsekvent"), an adjective or participle used as a noun
// ("anställd", "vuxen"). Not evidence for the part of speech, not against it either.
const DERIVED = { adverb: ["adjective"], noun: ["adjective"] };

export function checkKeywordPos({ pos, glossaryPos = null, referencePos = [], wiktionaryStatus = "found" }) {
  const known = new Set(referencePos);
  if (glossaryPos) {
    if (known.size && !known.has(glossaryPos)) return { pos, status: known.has(pos) ? "confirmed" : "rejected", reason: "glossary_not_in_references" };
    if (glossaryPos === pos) return { pos, status: "confirmed", reason: "glossary" };
    return { pos: glossaryPos, status: "corrected", reason: `glossary_says_${glossaryPos}` };
  }
  if (!known.size) return { pos, status: "unconfirmed", reason: wiktionaryStatus === "found" || wiktionaryStatus === "missing" ? "no_reference" : `wiktionary_${wiktionaryStatus}` };
  if (known.has(pos)) return { pos, status: "confirmed", reason: "references" };
  if ((DERIVED[pos] || []).some((p) => known.has(p))) return { pos, status: "unconfirmed", reason: `derived_from_${[...known].join("/")}` };
  // Wiktionary not reached: SALDO alone doesn't reject.
  if (wiktionaryStatus !== "found" && wiktionaryStatus !== "missing") return { pos, status: "unconfirmed", reason: `wiktionary_${wiktionaryStatus}` };
  return { pos, status: "rejected", reason: `references_say_${[...known].join("/")}` };
}

/** Whether an example sentence uses the word in one of its forms. */
export function exampleUsesWord(sentence, forms) {
  const tokens = new Set((String(sentence || "").toLowerCase().match(/\p{L}+/gu) || []));
  const list = [...forms].map((f) => String(f || "").toLowerCase()).filter(Boolean);
  if (list.some((f) => tokens.has(f))) return true;
  // A multi-word lemma or particle verb: all its words in the sentence.
  return list.some((f) => f.includes(" ") && f.split(/\s+/).every((w) => tokens.has(w)));
}

/** SALDO readings of each word of a text, for the candidate list and the checks. */
export async function textReadings(supabaseAdmin, tokens) {
  return formReadings(supabaseAdmin, tokens);
}

// ---------------------------------------------------------------------------
// AI check of meaning (layer 3)
// ---------------------------------------------------------------------------

const exampleCheck = {
  type: "object",
  additionalProperties: false,
  properties: {
    key: { type: "string" },
    sv_start: { type: "string" },
    fits_entry: { type: "boolean" },
    translation_zh_ok: { type: "boolean" },
    translation_en_ok: { type: "boolean" },
    translation_zh_fixed: { type: "string" },
    translation_en_fixed: { type: "string" },
  },
  required: ["key", "sv_start", "fits_entry", "translation_zh_ok", "translation_en_ok", "translation_zh_fixed", "translation_en_fixed"],
};
const itemCheck = {
  type: "object",
  additionalProperties: false,
  properties: {
    key: { type: "string" },
    lemma: { type: "string" },
    pos: { type: "string" },
    pos_supported: { type: "boolean" },
    other_pos_senses: { type: "array", items: { type: "string" } },
    unsupported_senses: { type: "array", items: { type: "string" } },
    meaning_zh_fixed: { type: "string" },
    meaning_en_fixed: { type: "string" },
    swedish_explanation_fixed: { type: "string" },
    examples: { type: "array", items: exampleCheck },
    context_matches_entry: { type: "string", enum: ["yes", "no", "n/a"] },
    verdict: { type: "string", enum: ["ok", "fixed", "unsure"] },
    note: { type: "string" },
  },
  required: ["key", "lemma", "pos", "pos_supported", "other_pos_senses", "unsupported_senses", "meaning_zh_fixed", "meaning_en_fixed", "swedish_explanation_fixed", "examples", "context_matches_entry", "verdict", "note"],
};

const SENSE_CHECK_SYSTEM = `You check Swedish learner's-dictionary entries for one problem class: content that does not belong to the entry's part of speech and sense. Each item has a lemma, its part of speech, the entry's meanings (Chinese, English, Swedish explanation) and examples with translations, and reference evidence: the parts of speech SALDO gives the lemma and, when available, Swedish Wiktionary's senses per part of speech with their English equivalents. Some items also have a context: a sentence from a text and what the word means there.

Every item has a key ("i1", "i2", …) and every example a key ("i1.e0", "i1.e1", …). Answer every item and, inside it, every one of its examples — never leave an example out, never answer one item with another item's content. Echo the item's key, lemma and pos exactly, and for each example its key and sv_start = its first three words exactly as written.

For each item:
- pos_supported: whether the references support this part of speech for the lemma (when they give none, judge from your knowledge and say so in note).
- other_pos_senses: (look hardest when the item has "also_exists_as": the same spelling is also those parts of speech, and their senses are often written into the wrong entry) senses in THIS entry's meanings that belong to ANOTHER part of speech of the same spelling (e.g. the noun sense "干旱" written into the verb entry "torka") — each one quoted exactly as it is written in this entry's meaning_zh, meaning_en or swedish_explanation; empty if none. Judge each item only by its own fields.
- unsupported_senses: senses in this entry that neither the references nor ordinary Swedish usage support for this lemma and part of speech, quoted exactly from its fields — empty if none. Don't list a sense just because the references are short.
- meaning_zh_fixed / meaning_en_fixed / swedish_explanation_fixed: only when something must change — the corrected text for THIS part of speech, keeping every supported sense and the entry's style (concise, Simplified Chinese for zh). When the only problem is a sense that doesn't belong, delete just that sense and leave the rest exactly as it was, word for word (don't reword or "improve" it). Never copy Wiktionary's wording. "" when the field is fine.
- examples: for each example (by key), fits_entry = the Swedish sentence uses the word in this part of speech and one of the entry's senses; translation_*_ok = the translation renders the WHOLE sentence correctly — go through the Swedish sentence word by word and check each content word's meaning is in the translation; a fragment, a gloss of only the headword, a translation of a different sentence, or a zh translation in traditional characters is not ok; translation_*_fixed = a correct full translation when not ok, else "". zh translations in Simplified Chinese. Keep every pronoun's person and gender (hon = 她 / she, han = 他 / he, de = 他们 / they, vi = 我们) and add nothing that is not in the Swedish. An example may carry "flags" from a program check (e.g. "zh_too_short", "zh_traditional"): look at those especially carefully.
- context_matches_entry: when a context is given, "yes" if one of the entry's (fixed) senses is the one the sentence uses, else "no"; "n/a" without a context.
- verdict: "ok" if nothing needed changing, "fixed" if you gave corrections, "unsure" if the evidence isn't enough to decide — then change nothing and say why in note.
Be conservative: change only what is clearly wrong.`;

// Characters only traditional Chinese uses (common ones): a zh field is Simplified Chinese.
const TRADITIONAL = /[乾淨國這說們會來時對學過還長無與開關見發後電話書車門問題觀點記讓應樣種經變當實現燒鍋魚鳥麵飯雞錢買賣寫聽讀從裡為麼誰嗎幾體邊遠給錯樂歡氣將專業級總親愛顏場歲頭腦臉髮兒媽爺覺廳館區園離準備辦幫將應該較雖際網號碼個們]/u;

/** Program checks on an example's translations, passed to the AI check as flags. */
export function translationFlags(example) {
  const flags = [];
  const words = (String(example.sv || "").match(/\p{L}+/gu) || []).length;
  const zh = String(example.zh || "").replace(/[\s，。！？、；：,.!?]/gu, "");
  const en = (String(example.en || "").match(/\p{L}+/gu) || []).length;
  if (example.zh !== undefined && words >= 4 && zh.length < words * 0.8) flags.push("zh_too_short");
  if (TRADITIONAL.test(zh)) flags.push("zh_traditional");
  if (example.en !== undefined && words >= 4 && en < Math.ceil(words / 2)) flags.push("en_too_short");
  if (example.zh && pronounMismatch(example.sv, example.zh)) flags.push("zh_pronoun");
  if (example.zh && words >= 3 && zh.length > words * 4 + 6) flags.push("zh_too_long");
  return flags;
}

/**
 * A Chinese translation that gets a pronoun's gender wrong: the Swedish has only "hon"
 * (henne, hennes) and the Chinese only 他, or only "han" and the Chinese only 她. A
 * pronoun left out is normal Chinese, and 他 for another person in the sentence ("hon
 * ringde sin fästman … 告诉他") is fine — neither is judged.
 */
export function pronounMismatch(sv, zh) {
  const words = new Set((String(sv || "").toLowerCase().match(/\p{L}+/gu) || []));
  const she = words.has("hon") || words.has("henne") || words.has("hennes");
  const he = words.has("han") || words.has("honom") || words.has("hans");
  const text = String(zh || "");
  const hasShe = text.includes("她"), hasHe = /他(?!们)/u.test(text);
  if (she && !he) return hasHe && !hasShe;
  if (he && !she) return hasShe && !hasHe;
  return false;
}

const norm = (text) => String(text || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
const startsAlike = (echo, sentence) => {
  const a = norm(echo).slice(0, 3), b = norm(sentence).slice(0, 3);
  return a.length > 0 && a.every((w, i) => w === b[i]);
};

/**
 * Whether one returned check really answers this item (2026-11-02, after a batch answered
 * one entry with another's content and left examples out): the echoed lemma and part of
 * speech, every example by key with its first words, no example twice, and answers that
 * are consistent (a translation judged wrong comes with a correction that passes the
 * program checks). Returns a list of problems — empty when the check can be used.
 */
export function checkProblems(item, c) {
  const problems = [];
  if (!c) return ["missing"];
  if (norm(c.lemma).join(" ") !== norm(item.lemma).join(" ")) problems.push(`lemma_echo:${c.lemma}`);
  if (c.pos !== item.pos) problems.push(`pos_echo:${c.pos}`);
  const examples = item.entry?.examples || [];
  const seen = new Set();
  for (const x of c.examples || []) {
    const idx = examples.findIndex((e) => e.key === x.key);
    if (idx < 0) { problems.push(`unknown_example:${x.key}`); continue; }
    if (seen.has(x.key)) problems.push(`duplicate_example:${x.key}`);
    seen.add(x.key);
    const e = examples[idx];
    if (!startsAlike(x.sv_start, e.sv)) problems.push(`example_echo:${x.key}`);
    if (!x.translation_zh_ok && e.zh !== undefined) {
      if (!x.translation_zh_fixed) problems.push(`no_zh_fix:${x.key}`);
      else if (TRADITIONAL.test(x.translation_zh_fixed) || pronounMismatch(e.sv, x.translation_zh_fixed)) problems.push(`bad_zh_fix:${x.key}`);
    }
    if (!x.translation_en_ok && e.en !== undefined && !x.translation_en_fixed) problems.push(`no_en_fix:${x.key}`);
  }
  for (const e of examples) if (!seen.has(e.key)) problems.push(`example_missing:${e.key}`);
  // A sense said not to belong must be one this entry has: words quoted from another item
  // of the batch mean the answer mixed items up.
  const own = norm(`${item.entry?.meaning_zh || ""} ${item.entry?.meaning_en || ""} ${item.entry?.swedish_explanation || ""}`).join(" ");
  const ownZh = String(item.entry?.meaning_zh || "") + String(item.entry?.swedish_explanation || "") + String(item.entry?.meaning_en || "");
  for (const quote of [...(c.other_pos_senses || []), ...(c.unsupported_senses || [])]) {
    const q = norm(quote).join(" ");
    const parts = String(quote).split(/[\/／|]/).map((x) => x.trim()).filter(Boolean);
    const inEntry = (q && own.includes(q)) || parts.some((p) => ownZh.includes(p) || (norm(p).length && own.includes(norm(p).join(" "))));
    if (!inEntry) problems.push(`foreign_sense:${quote}`);
  }
  const hasFix = c.meaning_zh_fixed || c.meaning_en_fixed || c.swedish_explanation_fixed || (c.examples || []).some((x) => !x.translation_zh_ok || !x.translation_en_ok || !x.fits_entry);
  if (c.verdict === "ok" && hasFix) c.verdict = "fixed";      // the answers decide, not the label
  return problems;
}

/**
 * Checks entries' meanings and examples against their part of speech, the references
 * and (optionally) a sentence they're used in — several items per call. Every answer is
 * matched to its item by key AND checked against it (checkProblems); an item whose
 * answer is missing, misplaced or incomplete is asked again on its own once, and if that
 * fails too it is reported in `failures` — never counted as checked.
 * Returns { checks: Map(id → check), failures: Map(id → problems), usage }.
 * A check's examples carry `index` (position in item.entry.examples) besides the key.
 */
export async function aiSenseCheck(supabaseAdmin, items, { userId = null, textResourceId = null, feature = "sense_check", chunk = 8 } = {}) {
  const checks = new Map();
  const failures = new Map();
  const usage = { input_tokens: 0, output_tokens: 0, calls: 0, cost: 0, retries: 0, failed_calls: 0 };
  const keyed = items.map((item, n) => {
    const key = `i${n + 1}`;
    // The spelling's other parts of speech, named, so mixing them in is looked for.
    const others = [...new Set([...(item.references?.saldo_pos || []), ...((item.references?.wiktionary?.entries || []).map((e) => e.pos))])]
      .filter((p) => p && p !== item.pos && p !== "other");
    return { item, prompt: {
      ...item, id: undefined, key,
      ...(others.length ? { also_exists_as: others } : {}),
      entry: { ...item.entry, examples: (item.entry?.examples || []).map((e, j) => { const flags = translationFlags(e); return { key: `${key}.e${j}`, ...e, ...(flags.length ? { flags } : {}) }; }) },
    } };
  });
  const ask = async (group) => {
    const { result, usage: u } = await callOpenAIJson({
      schemaName: "sense_check",
      schema: { type: "object", additionalProperties: false, properties: { items: { type: "array", items: itemCheck } }, required: ["items"] },
      system: SENSE_CHECK_SYSTEM,
      user: JSON.stringify(group.map((g) => g.prompt)),
      maxOutputTokens: 1200 + 800 * group.length,
    });
    const cost = ((u.input_tokens || 0) * 0.75 + (u.output_tokens || 0) * 4.5) / 1e6;
    usage.input_tokens += u.input_tokens || 0;
    usage.output_tokens += u.output_tokens || 0;
    usage.calls += 1;
    usage.cost += cost;
    if (supabaseAdmin) await logUsage(supabaseAdmin, { userId, textResourceId, feature, model: MODEL, inputTokens: u.input_tokens, outputTokens: u.output_tokens, cost });
    return result.items || [];
  };
  const settle = (group, answers, final) => {
    const retry = [];
    for (const g of group) {
      const mine = answers.filter((c) => c.key === g.prompt.key);
      const c = mine.length === 1 ? mine[0] : null;
      const problems = mine.length > 1 ? ["duplicate_item"] : checkProblems(g.prompt, c);
      if (!problems.length) {
        c.examples = c.examples.map((x) => ({ ...x, index: g.prompt.entry.examples.findIndex((e) => e.key === x.key) }));
        checks.set(g.item.id, { ...c, id: g.item.id });
        failures.delete(g.item.id);
      } else if (final) failures.set(g.item.id, problems);
      else { failures.set(g.item.id, problems); retry.push(g); }
    }
    return retry;
  };
  // Batches never hold two items of the same lemma (an answer about one torka was
  // carried over to the other).
  const groups = [];
  for (const k of keyed) {
    const lemma = norm(k.item.lemma).join(" ");
    let g = groups.find((x) => x.length < chunk && !x.some((y) => norm(y.item.lemma).join(" ") === lemma));
    if (!g) groups.push((g = []));
    g.push(k);
  }
  for (const group of groups) {
    let retry = group;
    try {
      retry = settle(group, await ask(group), false);
    } catch (error) {
      usage.failed_calls += 1;
      group.forEach((g) => failures.set(g.item.id, [`call_failed:${error.message}`]));
    }
    for (const g of retry) {
      usage.retries += 1;
      try {
        settle([g], await ask([g]), true);
      } catch (error) {
        usage.failed_calls += 1;
        failures.set(g.item.id, [...(failures.get(g.item.id) || []), `call_failed:${error.message}`]);
      }
    }
  }
  return { checks, failures, usage };
}

/** The Wiktionary evidence an AI check gets: senses and English equivalents per part of speech. */
export function wiktionaryEvidence(page) {
  if (page?.status !== "found") return { status: page?.status || "skipped" };
  return {
    status: "found",
    entries: page.entries.filter((e) => !e.formOf).map((e) => ({ pos: e.pos, senses: e.senses.map((s) => s.text).slice(0, 6), english: e.english.flat().slice(0, 8) })),
  };
}

/** Records a check on an entry (resource_field_status "pos" / "sense") and refreshes its summary. */
export async function recordCheck(supabaseAdmin, entryId, field, status, source, detail = null) {
  try {
    await supabaseAdmin.from("resource_field_status").upsert(
      { learning_object_id: entryId, field, status, source, detail, updated_at: new Date().toISOString() },
      { onConflict: "learning_object_id,field" },
    );
    await supabaseAdmin.rpc("refresh_resource_summary", { p_ids: [entryId] });
  } catch (error) {
    console.warn("[checks] could not record", field, entryId, error.message);
  }
}

// ---------------------------------------------------------------------------
// Before a new word card is saved (layer 4)
// ---------------------------------------------------------------------------

/**
 * A generated word card checked before it is saved: the part of speech asked for and
 * one the references give the lemma (a card SALDO and Wiktionary contradict is not
 * saved); examples that don't use the word are dropped; then one AI check of meanings,
 * examples and translations against the part of speech, the references and the sense
 * the text uses, whose corrections are applied. Returns
 *   { ok, reason, result, pos: { status, source }, sense: { status, source, detail }, usage }.
 */
export async function checkNewWordCard(supabaseAdmin, { lemma, pos, wantedPos = null, sense = "", result, forms = [], isPhrase = false, userId = null, textResourceId = null }) {
  if (!isPhrase && wantedPos && pos !== wantedPos) return { ok: false, reason: `asked_${wantedPos}_got_${pos}` };
  let posCheck = { status: "present", source: "unconfirmed" };
  let page = { status: "skipped" };
  if (!isPhrase) {
    const references = await referencePartsOfSpeech(supabaseAdmin, lemma, { askWiktionary: true });
    page = await lookupWiktionary(supabaseAdmin, lemma);
    if (references.all.length && !references.all.includes(pos)) return { ok: false, reason: `references_say_${references.all.join("/")}` };
    if (references.saldo.includes(pos)) posCheck = { status: "verified", source: "saldo-morphology-2017" };
    else if (references.wiktionary.includes(pos)) posCheck = { status: "verified", source: "sv-wiktionary" };
    // Unconfirmed says why: no reference has the word, or Wiktionary couldn't be asked.
    else posCheck = { status: "present", source: "unconfirmed", detail: { saldo: references.saldo, wiktionary: page.status } };
  } else {
    page = await lookupWiktionary(supabaseAdmin, lemma);
  }

  const card = structuredClone(result);
  const wordForms = [lemma, ...forms.map((f) => f.value)].filter(Boolean);
  const dropped = [];
  card.examples = (card.examples || []).filter((e) => {
    const keep = exampleUsesWord(e.swedish, wordForms);
    if (!keep) dropped.push(e.swedish);
    return keep;
  });

  const item = {
    id: "card", lemma, pos: isPhrase ? "phrase" : pos,
    entry: { meaning_zh: card.meaning_zh || "", meaning_en: card.meaning_en || "", swedish_explanation: card.swedish_explanation || "",
      examples: card.examples.map((e) => ({ sv: e.swedish, zh: e.zh, en: e.en })) },
    ...(sense ? { context: { sentence: "", meaning_here: sense } } : {}),
    references: { wiktionary: wiktionaryEvidence(page) },
  };
  let check;
  let usage = null;
  try {
    const out = await aiSenseCheck(supabaseAdmin, [item], { userId, textResourceId, feature: "word_card_check" });
    check = out.checks.get("card");
    usage = out.usage;
    // The check failed (no usable answer even when asked again): the card is saved as
    // generated, marked unchecked with the reason — never as checked.
    if (!check) return { ok: true, result: card, pos: posCheck, usage,
      sense: { status: "missing", source: "ai_check_failed", detail: { problems: out.failures.get("card") || ["missing"], dropped, wiktionary: page.status } } };
  } catch (error) {
    return { ok: true, result: card, pos: posCheck, sense: { status: "missing", source: "ai_check_failed", detail: { error: error.message, dropped, wiktionary: page.status } }, usage };
  }
  if (!isPhrase && !check.pos_supported && posCheck.status !== "verified") return { ok: false, reason: `pos_not_supported: ${check.note}`, usage };
  if (check.meaning_zh_fixed) card.meaning_zh = check.meaning_zh_fixed;
  if (check.meaning_en_fixed) card.meaning_en = check.meaning_en_fixed;
  if (check.swedish_explanation_fixed) card.swedish_explanation = check.swedish_explanation_fixed;
  const misfits = [];
  for (const x of check.examples || []) {
    const e = card.examples[x.index];
    if (!e) continue;
    if (!x.fits_entry) misfits.push(e.swedish);
    if (!x.translation_zh_ok && x.translation_zh_fixed) e.zh = x.translation_zh_fixed;
    if (!x.translation_en_ok && x.translation_en_fixed) e.en = x.translation_en_fixed;
  }
  card.examples = card.examples.filter((e) => !misfits.includes(e.swedish));
  const unsure = check.verdict === "unsure";
  const detail = { verdict: check.verdict, other_pos_senses: check.other_pos_senses, unsupported_senses: check.unsupported_senses, dropped: [...dropped, ...misfits], note: check.note, wiktionary: page.status };
  return {
    ok: true, result: card, pos: posCheck, usage,
    sense: unsure ? { status: "mismatch", source: "ai_check", detail } : { status: "verified", source: page.status === "found" ? "ai_check+sv-wiktionary" : "ai_check", detail },
  };
}

// ---------------------------------------------------------------------------
// Example translations: written, then independently reviewed (2026-11-02)
// ---------------------------------------------------------------------------

const translationItem = {
  type: "object", additionalProperties: false,
  properties: { key: { type: "string" }, sv_start: { type: "string" }, zh: { type: "string" }, en: { type: "string" } },
  required: ["key", "sv_start", "zh", "en"],
};
const reviewItem = {
  type: "object", additionalProperties: false,
  properties: {
    key: { type: "string" }, sv_start: { type: "string" },
    zh_faithful: { type: "boolean" }, en_faithful: { type: "boolean" },
    problems: { type: "array", items: { type: "string" } },
  },
  required: ["key", "sv_start", "zh_faithful", "en_faithful", "problems"],
};
const TRANSLATE_SYSTEM = `You translate example sentences of a Swedish learner's dictionary. Each item has a key, the headword with its part of speech (it tells you which sense the sentence uses) and the Swedish text (one or more sentences). For each item give zh = the whole text in natural Simplified Chinese and en = the whole text in natural English. Translate every sentence and every content word; add nothing that isn't in the Swedish (no invented time, place, reason or detail); keep each pronoun's person and gender (hon = 她 / she, han = 他 / he, hen = 他/她 / they, de = 他们 / they, vi = 我们 / we, man = 人们 or a natural impersonal phrasing / one, you). Echo each key and sv_start = the first three words of its Swedish text exactly. If problems from an earlier attempt are listed, avoid them.`;
const REVIEW_SYSTEM = `You review translations of Swedish dictionary example sentences, strictly. For each item compare the Swedish with the Chinese (zh) and the English (en) word by word. zh_faithful / en_faithful = true only if the translation renders the whole Swedish text with the same meaning: no sentence or content word left out, nothing added that isn't in the Swedish, pronouns with the same person and gender (hon = 她, han = 他), tense and negation kept, the headword in the right sense; zh in Simplified Chinese. Natural rephrasing is fine. problems = short descriptions of what is wrong (empty when both are faithful). Echo each key and sv_start = the first three words of its Swedish text exactly. Don't rewrite anything.`;

/**
 * Example translations made and checked: one call writes zh/en for each item, a second,
 * independent call reviews them against the Swedish, and program checks (pronouns,
 * traditional characters, fragment length) run on both. An item passing everything is
 * `accepted`; one that doesn't is written again once with the problems named, reviewed
 * again, and otherwise reported in `rejected` with the reasons — never written.
 *   items: [{ id, headword, pos, sv }]   → { accepted: Map(id → {zh, en}), rejected: Map(id → problems), usage }
 */
export async function checkedTranslations(supabaseAdmin, items, { feature = "example_translation", chunk = 15 } = {}) {
  const usage = { input_tokens: 0, output_tokens: 0, calls: 0, cost: 0, failed_calls: 0 };
  const call = async (schemaName, system, schema, payload, perItem) => {
    const { result, usage: u } = await callOpenAIJson({
      schemaName, system, user: JSON.stringify(payload), maxOutputTokens: 800 + perItem * payload.length,
      schema: { type: "object", additionalProperties: false, properties: { items: { type: "array", items: schema } }, required: ["items"] },
    });
    const cost = ((u.input_tokens || 0) * 0.75 + (u.output_tokens || 0) * 4.5) / 1e6;
    usage.input_tokens += u.input_tokens || 0; usage.output_tokens += u.output_tokens || 0; usage.calls += 1; usage.cost += cost;
    if (supabaseAdmin) await logUsage(supabaseAdmin, { feature, model: MODEL, inputTokens: u.input_tokens, outputTokens: u.output_tokens, cost });
    return result.items || [];
  };
  const accepted = new Map();
  const rejected = new Map();
  const keyed = items.map((item, n) => ({ ...item, key: `t${n + 1}` }));
  const programProblems = (sv, zh, en) => {
    const p = [];
    if (!zh) p.push("zh_empty");
    if (!en) p.push("en_empty");
    for (const f of translationFlags({ sv, zh, en })) p.push(f);
    return p;
  };
  for (let i = 0; i < keyed.length; i += chunk) {
    let group = keyed.slice(i, i + chunk);
    const notes = new Map();
    for (let attempt = 1; attempt <= 2 && group.length; attempt += 1) {
      let drafts = [];
      let reviews = [];
      try {
        drafts = await call("example_translation", TRANSLATE_SYSTEM, translationItem,
          group.map((g) => ({ key: g.key, headword: g.headword, pos: g.pos, sv: g.sv, ...(notes.get(g.key) ? { problems_before: notes.get(g.key) } : {}) })), 220);
        const usable = group.map((g) => ({ g, d: drafts.filter((d) => d.key === g.key) })).filter(({ g, d }) => d.length === 1 && startsAlike(d[0].sv_start, g.sv));
        reviews = usable.length ? await call("translation_review", REVIEW_SYSTEM, reviewItem,
          usable.map(({ g, d }) => ({ key: g.key, headword: g.headword, sv: g.sv, zh: d[0].zh, en: d[0].en })), 120) : [];
      } catch (error) {
        usage.failed_calls += 1;
        group.forEach((g) => notes.set(g.key, [`call_failed:${error.message}`]));
      }
      const again = [];
      for (const g of group) {
        const d = drafts.filter((x) => x.key === g.key);
        const r = reviews.filter((x) => x.key === g.key);
        const problems = [];
        if (d.length !== 1) problems.push(d.length ? "duplicate_draft" : "draft_missing");
        else if (!startsAlike(d[0].sv_start, g.sv)) problems.push("draft_echo");
        else problems.push(...programProblems(g.sv, d[0].zh.trim(), d[0].en.trim()));
        if (!problems.length) {
          if (r.length !== 1 || !startsAlike(r[0].sv_start, g.sv)) problems.push("review_missing");
          else if (!r[0].zh_faithful || !r[0].en_faithful) problems.push(...(r[0].problems.length ? r[0].problems : ["review_not_faithful"]));
        }
        if (!problems.length) accepted.set(g.id, { zh: d[0].zh.trim(), en: d[0].en.trim() });
        else if (attempt === 2) rejected.set(g.id, [...(notes.get(g.key) || []), ...problems]);
        else { notes.set(g.key, problems); again.push(g); }
      }
      group = again;
    }
  }
  return { accepted, rejected, usage };
}

// ---------------------------------------------------------------------------
// The other explanation language of an expression entry (2026-11-02)
// ---------------------------------------------------------------------------

const otherMeaningItem = {
  type: "object", additionalProperties: false,
  properties: { key: { type: "string" }, expression: { type: "string" }, meaning: { type: "string" } },
  required: ["key", "expression", "meaning"],
};

/**
 * Fills the missing explanation-language row of expression entries found while reading
 * (they were saved in the reader's language only, so readers of the other language saw
 * no meaning): the meaning in one batched call (echo-checked), the example sentence with
 * checkedTranslations (written, reviewed, program-checked). A row is written only when
 * both pass. Returns { filled: [ids], failed: Map(id → problems), usage }.
 *   items: [{ id, expression, meaning, meaningLanguage, sentence }]
 */
export async function fillExpressionLanguage(supabaseAdmin, items, { write = true } = {}) {
  const filled = [];
  const failed = new Map();
  const usage = { input_tokens: 0, output_tokens: 0, calls: 0, cost: 0 };
  const byTarget = { zh: items.filter((i) => i.meaningLanguage === "en"), en: items.filter((i) => i.meaningLanguage === "zh") };
  for (const [lang, group] of Object.entries(byTarget)) {
    if (!group.length) continue;
    const keyed = group.map((g, n) => ({ ...g, key: `m${n + 1}` }));
    const { result, usage: u } = await callOpenAIJson({
      schemaName: "expression_meaning",
      schema: { type: "object", additionalProperties: false, properties: { items: { type: "array", items: otherMeaningItem } }, required: ["items"] },
      system: `You write the ${lang === "zh" ? "Simplified Chinese" : "English"} meaning of Swedish expressions for a learner's dictionary: short, in the style of the given meaning in the other language, for the sense the example sentence uses. Echo each key and the expression exactly.`,
      user: JSON.stringify(keyed.map((k) => ({ key: k.key, expression: k.expression, meaning_given: k.meaning, sentence: k.sentence }))),
      maxOutputTokens: 400 + 80 * keyed.length,
    });
    const cost = ((u.input_tokens || 0) * 0.75 + (u.output_tokens || 0) * 4.5) / 1e6;
    usage.input_tokens += u.input_tokens || 0; usage.output_tokens += u.output_tokens || 0; usage.calls += 1; usage.cost += cost;
    if (supabaseAdmin && write) await logUsage(supabaseAdmin, { feature: "expression_language", model: MODEL, inputTokens: u.input_tokens, outputTokens: u.output_tokens, cost });
    const examples = await checkedTranslations(write ? supabaseAdmin : null, keyed.filter((k) => k.sentence).map((k) => ({ id: k.id, headword: k.expression, pos: "phrase", sv: k.sentence })), { feature: "expression_language" });
    usage.input_tokens += examples.usage.input_tokens; usage.output_tokens += examples.usage.output_tokens; usage.calls += examples.usage.calls; usage.cost += examples.usage.cost;
    for (const k of keyed) {
      const answers = (result.items || []).filter((x) => x.key === k.key);
      const meaning = answers.length === 1 && norm(answers[0].expression).join(" ") === norm(k.expression).join(" ") ? answers[0].meaning.trim() : "";
      const example = k.sentence ? examples.accepted.get(k.id)?.[lang] : "";
      const problems = [];
      if (!meaning) problems.push("meaning_missing_or_misplaced");
      if (lang === "zh" && TRADITIONAL.test(meaning)) problems.push("meaning_traditional");
      if (k.sentence && !example) problems.push(...(examples.rejected.get(k.id) || ["example_missing"]));
      if (problems.length) { failed.set(k.id, problems); continue; }
      if (write && supabaseAdmin) {
        const { error } = await supabaseAdmin.from("learning_object_translations").upsert(
          { learning_object_id: k.id, native_language: lang, meaning, example_translation: example || null, updated_at: new Date().toISOString() },
          { onConflict: "learning_object_id,native_language" });
        if (error) { failed.set(k.id, [`write_failed:${error.message}`]); continue; }
      }
      filled.push(k.id);
    }
  }
  return { filled, failed, usage };
}
