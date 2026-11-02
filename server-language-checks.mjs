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
export function checkKeywordPos({ pos, glossaryPos = null, referencePos = [] }) {
  const known = new Set(referencePos);
  if (glossaryPos) {
    if (known.size && !known.has(glossaryPos)) return { pos, status: known.has(pos) ? "confirmed" : "rejected", reason: "glossary_not_in_references" };
    if (glossaryPos === pos) return { pos, status: "confirmed", reason: "glossary" };
    return { pos: glossaryPos, status: "corrected", reason: `glossary_says_${glossaryPos}` };
  }
  if (!known.size) return { pos, status: "unconfirmed", reason: "no_reference" };
  if (known.has(pos)) return { pos, status: "confirmed", reason: "references" };
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
    index: { type: "integer" },
    fits_entry: { type: "boolean" },
    translation_zh_ok: { type: "boolean" },
    translation_en_ok: { type: "boolean" },
    translation_zh_fixed: { type: "string" },
    translation_en_fixed: { type: "string" },
  },
  required: ["index", "fits_entry", "translation_zh_ok", "translation_en_ok", "translation_zh_fixed", "translation_en_fixed"],
};
const itemCheck = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
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
  required: ["id", "pos_supported", "other_pos_senses", "unsupported_senses", "meaning_zh_fixed", "meaning_en_fixed", "swedish_explanation_fixed", "examples", "context_matches_entry", "verdict", "note"],
};

const SENSE_CHECK_SYSTEM = `You check Swedish learner's-dictionary entries for one problem class: content that does not belong to the entry's part of speech and sense. Each item has a lemma, its part of speech, the entry's meanings (Chinese, English, Swedish explanation) and examples with translations, and reference evidence: the parts of speech SALDO gives the lemma and, when available, Swedish Wiktionary's senses per part of speech with their English equivalents. Some items also have a context: a sentence from a text and what the word means there.

For each item:
- pos_supported: whether the references support this part of speech for the lemma (when they give none, judge from your knowledge and say so in note).
- other_pos_senses: senses in the entry's meanings that belong to ANOTHER part of speech of the same spelling (e.g. the noun sense "干旱 / drought" written into the verb entry "torka") — empty if none.
- unsupported_senses: senses neither the references nor ordinary Swedish usage support for this lemma and part of speech — empty if none. Don't list a sense just because the references are short.
- meaning_zh_fixed / meaning_en_fixed / swedish_explanation_fixed: only when something must change — the corrected text for THIS part of speech, keeping every supported sense and the entry's style (concise, Simplified Chinese for zh). When the only problem is a sense that doesn't belong, delete just that sense and leave the rest exactly as it was, word for word (don't reword or "improve" it). Never copy Wiktionary's wording. "" when the field is fine.
- examples: for each example (by index), fits_entry = the Swedish sentence uses the word in this part of speech and one of the entry's senses; translation_*_ok = the translation renders the WHOLE sentence correctly — go through the Swedish sentence word by word and check each content word's meaning is in the translation; a fragment, a gloss of only the headword, a translation of a different sentence, or a zh translation in traditional characters is not ok; translation_*_fixed = a correct full translation when not ok, else "". zh translations in Simplified Chinese. An example may carry "flags" from a program check (e.g. "zh_too_short", "zh_traditional"): look at those especially carefully.
- context_matches_entry: when a context is given, "yes" if one of the entry's (fixed) senses is the one the sentence uses, else "no"; "n/a" without a context.
- verdict: "ok" if nothing needed changing, "fixed" if you gave corrections, "unsure" if the evidence isn't enough to decide — then change nothing and say why in note.
Be conservative: change only what is clearly wrong.`;

// Characters only traditional Chinese uses (common ones): a zh field is Simplified Chinese.
const TRADITIONAL = /[乾淨國這說們會來時對學過還長無與開關見發後電話書車門問題觀點記讓應樣種經變當實現燒鍋魚鳥麵飯雞錢買賣寫聽讀]/u;

/** Program checks on an example's translations, passed to the AI check as flags. */
export function translationFlags(example) {
  const flags = [];
  const words = (String(example.sv || "").match(/\p{L}+/gu) || []).length;
  const zh = String(example.zh || "").replace(/[\s，。！？、；：,.!?]/gu, "");
  const en = (String(example.en || "").match(/\p{L}+/gu) || []).length;
  if (example.zh !== undefined && words >= 4 && zh.length < words) flags.push("zh_too_short");
  if (TRADITIONAL.test(zh)) flags.push("zh_traditional");
  if (example.en !== undefined && words >= 4 && en < Math.ceil(words / 2)) flags.push("en_too_short");
  return flags;
}

/**
 * Checks entries' meanings and examples against their part of speech, the references
 * and (optionally) a sentence they're used in — several items per call. Returns
 * Map(id → check) and the usage; an item the model didn't return is absent (unchecked).
 */
export async function aiSenseCheck(supabaseAdmin, items, { userId = null, textResourceId = null, feature = "sense_check", chunk = 8 } = {}) {
  const checks = new Map();
  const usage = { input_tokens: 0, output_tokens: 0, calls: 0, cost: 0 };
  for (let i = 0; i < items.length; i += chunk) {
    const batch = items.slice(i, i + chunk).map((item) => ({
      ...item,
      entry: { ...item.entry, examples: (item.entry?.examples || []).map((e) => { const flags = translationFlags(e); return flags.length ? { ...e, flags } : e; }) },
    }));
    const { result, usage: u } = await callOpenAIJson({
      schemaName: "sense_check",
      schema: { type: "object", additionalProperties: false, properties: { items: { type: "array", items: itemCheck } }, required: ["items"] },
      system: SENSE_CHECK_SYSTEM,
      user: JSON.stringify(batch),
      maxOutputTokens: 1200 + 700 * batch.length,
    });
    const cost = ((u.input_tokens || 0) * 0.75 + (u.output_tokens || 0) * 4.5) / 1e6;
    usage.input_tokens += u.input_tokens || 0;
    usage.output_tokens += u.output_tokens || 0;
    usage.calls += 1;
    usage.cost += cost;
    if (supabaseAdmin) await logUsage(supabaseAdmin, { userId, textResourceId, feature, model: MODEL, inputTokens: u.input_tokens, outputTokens: u.output_tokens, cost });
    for (const c of result.items || []) if (batch.some((b) => b.id === c.id)) checks.set(c.id, c);
  }
  return { checks, usage };
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
  } catch (error) {
    return { ok: true, result: card, pos: posCheck, sense: { status: "missing", source: "ai_check", detail: { error: error.message, dropped } }, usage };
  }
  if (!check) return { ok: true, result: card, pos: posCheck, sense: { status: "missing", source: "ai_check", detail: { dropped } }, usage };
  if (!isPhrase && !check.pos_supported && posCheck.status !== "verified") return { ok: false, reason: `pos_not_supported: ${check.note}`, usage };
  if (check.meaning_zh_fixed) card.meaning_zh = check.meaning_zh_fixed;
  if (check.meaning_en_fixed) card.meaning_en = check.meaning_en_fixed;
  if (check.swedish_explanation_fixed) card.swedish_explanation = check.swedish_explanation_fixed;
  const misfits = [];
  for (const x of check.examples || []) {
    const e = card.examples[x.index] || card.examples[x.index - 1];
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
