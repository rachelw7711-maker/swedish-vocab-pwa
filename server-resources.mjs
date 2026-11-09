// Shared learning resources (2026-10-31): one place for what an entry needs, how
// words / fixed phrases / idiomatic expressions are normalised and de-duplicated,
// and how provenance and field status are recorded. Used by the word-card
// generation (server-native.mjs), reading analysis (server-reading.mjs) and the
// batch scripts in scripts/.
//
// Order of lookup before anything is generated:
//   1. SpråkLab's own rows (basic and extended alike — access never hides a row
//      from dedup),
//   2. SALDO (local reference: lemma, part of speech, forms),
//   3. AI only for the learning content that is still missing.
import { lemmatize, saldoEntries, compareWithSaldo, cardFieldsFromSaldo, saldoFormsDiffer, SALDO_SOURCE_ID } from "./server-lexicon.mjs";

export const AI_SOURCE_ID = "openai-generated";

// Form types a card shows per part of speech, when SALDO can't supply them.
const AI_FORMS = {
  noun: ["singular_definite", "plural_indefinite", "plural_definite"],
  verb: ["present", "preteritum", "supinum", "imperative"],
  adjective: ["neuter_form", "plural_form"],
};

/**
 * The fields an entry of this kind needs to count as complete. Form fields are
 * "form:<type>"; SALDO-checkable fields (forms, passiv_s, countability) are
 * decided by compareWithSaldo when SALDO has the word.
 */
export function requiredFields(type, pos) {
  const common = ["meaning_zh", "meaning_en", "example"];
  if (type !== "word") return [...common, "swedish_explanation"];
  return [...common, "swedish_explanation", "cefr_level", ...(AI_FORMS[pos] || []).map((f) => `form:${f}`)];
}

export const moduleOf = (objectType) => (objectType === "word" ? "word" : objectType === "phrase" ? "phrase" : "expression");

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------
const PLACEHOLDERS = new Map([
  ["någon", "ngn"], ["ngn", "ngn"], ["nån", "ngn"], ["någons", "ngns"], ["ngns", "ngns"],
  ["något", "ngt"], ["ngt", "ngt"], ["nåt", "ngt"],
  // reflexive and possessive pronouns: "ta sig an" = "ta mig an"; "göra sitt bästa" = "göra mitt bästa"
  ["mig", "sig"], ["dig", "sig"], ["sig", "sig"], ["oss", "sig"],
  ["min", "sin"], ["din", "sin"], ["sin", "sin"], ["vår", "sin"],
  ["mitt", "sitt"], ["ditt", "sitt"], ["sitt", "sitt"], ["vårt", "sitt"],
  ["mina", "sina"], ["dina", "sina"], ["sina", "sina"], ["våra", "sina"],
]);

/** Spelling-level key: lower case, no punctuation or brackets, single spaces. */
export function normalizeText(text) {
  return String(text || "").normalize("NFC").toLowerCase()
    .replace(/[“”"'’«»()[\]{}.,!?;:…–—/]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Match key for a fixed phrase or expression: the spelling key with placeholder
 * and pronoun variants unified, a leading "att" dropped and an inflected first
 * verb put in the infinitive ("tar hand om någon" → "ta hand om ngn").
 * Expressions that only mean the same thing keep different keys on purpose.
 */
export async function expressionMatchKey(supabaseAdmin, text) {
  const raw = String(text || "").trim();
  // A whole sentence ("Kom igen!", "Det är fint?") is learnt as it stands: its verb
  // is not put in the infinitive, and a question stays apart from a statement.
  const sentence = /[.!?…]$/.test(raw) || /^\p{Lu}/u.test(raw);
  const words = normalizeText(raw).split(" ").filter(Boolean);
  if (words[0] === "att" && words.length > 1) words.shift();
  const unified = words.map((w) => PLACEHOLDERS.get(w) || w);
  if (/\?[!.…]*$/.test(raw)) unified.push("?");
  if (unified.length > 1 && !sentence) {
    const verb = (await lemmatize(supabaseAdmin, unified[0])).find((c) => c.pos === "verb");
    if (verb && !(await onlyParticiple(supabaseAdmin, unified[0], verb.lemma))) unified[0] = normalizeText(verb.lemma);
  }
  return unified.join(" ");
}

// A first word that is the verb's participle only ("växande intresse", "liknande system",
// "stängda dörrar") describes the noun: it is not the verb, and "växa intresse" was another
// expression's key (2026-11-09, R9). A form that is also finite or a supine ("stängt") stays a verb.
async function onlyParticiple(supabaseAdmin, word, lemma) {
  const w = normalizeText(word);
  const slots = (await saldoEntries(supabaseAdmin, lemma, "verb")).flatMap((r) => Object.entries(r.forms || {}).filter(([, v]) => [].concat(v).some((f) => normalizeText(f) === w)).map(([k]) => k));
  return slots.length > 0 && slots.every((k) => /_part/.test(k));
}

// ---------------------------------------------------------------------------
// Dedup
// ---------------------------------------------------------------------------

/**
 * Existing fixed phrase / expression for this text, in either module:
 * { id, object_type, swedish } or null.
 */
export async function findExistingExpression(supabaseAdmin, text, matchKey = null) {
  const key = matchKey || (await expressionMatchKey(supabaseAdmin, text));
  const { data, error } = await supabaseAdmin.from("learning_objects").select("id, object_type, swedish")
    .in("object_type", ["phrase", "expression"]).neq("status", "retired").eq("match_key", key).limit(1);
  if (!error && data?.length) return data[0];
  // Before the shared-resources migration (no match_key) or a row whose key was
  // never normalised: the plain spelling.
  const { data: plain } = await supabaseAdmin.from("learning_objects").select("id, object_type, swedish")
    .in("object_type", ["phrase", "expression"]).neq("status", "retired").ilike("swedish", normalizeText(text)).limit(1);
  return plain?.[0] || null;
}

async function wordRow(supabaseAdmin, lemma, pos) {
  let query = supabaseAdmin.from("learning_objects").select("id, swedish, part_of_speech").eq("object_type", "word")
    .neq("status", "retired").ilike("swedish", normalizeText(lemma));
  if (pos) query = query.eq("part_of_speech", pos);
  const { data } = await query.limit(1);
  return data?.[0] || null;
}

/**
 * Resolves a word (as written in a text or typed in search) to an existing entry
 * or to the lemma a new entry should get:
 *   { entryId, lemma, pos, saldo, alsoPos } — entryId null when nothing exists yet; saldo is
 *   the SALDO row for (lemma, pos) when SALDO has one; alsoPos the other parts of speech
 *   SALDO has the same headword as (the pos is then only one of them).
 * An inflected form is never a new word; a same-spelling word of another part of
 * speech is never the same entry.
 */
export async function resolveWord(supabaseAdmin, text, pos = null) {
  const direct = await wordRow(supabaseAdmin, text, pos);
  if (direct) return { entryId: direct.id, lemma: direct.swedish, pos: direct.part_of_speech, saldo: null };

  const candidates = (await lemmatize(supabaseAdmin, text)).filter((c) => !pos || c.pos === pos);
  // A text that is itself a headword is that word, never another's inflected form: "visa" (a song)
  // is also visum's plural, and the noun asked for got the entry of visum (2026-11-09).
  const own = candidates.filter((c) => normalizeText(c.lemma) === normalizeText(text));
  for (const c of own.length ? own : candidates) {
    const row = await wordRow(supabaseAdmin, c.lemma, c.pos);
    if (row) return { entryId: row.id, lemma: row.swedish, pos: row.part_of_speech, saldo: null };
  }
  // Prefer the reading of the text itself as a headword ("fast" → fast), then the first lemma.
  const pick = candidates.find((c) => normalizeText(c.lemma) === normalizeText(text)) || candidates[0];
  if (pick) {
    const [saldo] = await saldoEntries(supabaseAdmin, pick.lemma, pick.pos);
    // The same headword as words of other parts of speech ("man": the pronoun and the noun):
    // the pick is only SALDO's listing order, so a caller without a part of speech must not
    // take it as the word meant (2026-11-08).
    const alsoPos = [...new Set(candidates.filter((c) => normalizeText(c.lemma) === normalizeText(pick.lemma) && c.pos !== pick.pos).map((c) => c.pos))];
    return { entryId: null, lemma: pick.lemma, pos: pick.pos, saldo: saldo || null, alsoPos };
  }
  return { entryId: null, lemma: String(text).trim(), pos, saldo: null };
}

/**
 * SALDO reference text for the generation prompt. `homographs` are all SALDO rows of the lemma
 * as this part of speech: when they inflect differently by sense (fot: fötter / fot), each is
 * shown and the model gives the forms of the sense it writes, by which the card's row is picked
 * (pickSaldoRow) — otherwise forms come from SALDO alone and the model returns none.
 */
export function saldoPromptLine(saldo, pos, homographs = []) {
  if (!saldo) return "";
  const shown = (row) => Object.entries(cardFieldsFromSaldo(row, pos).forms).map(([k, v]) => `${k}: ${v}`).join("; ") || "none";
  if (homographs.length > 1 && saldoFormsDiffer(homographs, pos)) {
    return `Reference (SALDO): lemma "${saldo.baseform}". SALDO has ${homographs.length} words with this spelling as this part of speech, inflected differently by sense: ${homographs.map((r, i) => `(${i + 1}) ${shown(r)}`).join(" | ")}. Use this lemma, and return in forms the forms of the sense you write (one of these sets).`;
  }
  return `Reference (SALDO): lemma "${saldo.baseform}", forms ${shown(saldo)}. Use this lemma; forms are filled in from SALDO, so return forms: [].`;
}

/**
 * A new noun's four forms, complete (2026-11-04): a form the model left out — a countable noun
 * with only its singular — comes from SALDO's analysis of the compound or from Lexin's forms of
 * the word, never invented; an uncountable noun needs no plural. Adds to `forms` in place and
 * returns what it added ({ type, value, source }); what neither has stays missing.
 */
export function completeNounForms(forms, { countability, compoundRow = null, lexinNounForms = null }) {
  const want = countability === "uncountable" ? ["singular_definite"] : ["singular_definite", "plural_indefinite", "plural_definite"];
  const have = new Set(forms.filter((f) => String(f.value || "").trim()).map((f) => f.type));
  const fromCompound = compoundRow ? cardFieldsFromSaldo(compoundRow, "noun").forms : {};
  const added = [];
  for (const type of want) {
    if (have.has(type)) continue;
    const value = fromCompound[type] || lexinNounForms?.[type];
    if (!value || /^[—–-]$/.test(String(value).trim())) continue;
    forms.push({ type, value });
    added.push({ type, value, source: fromCompound[type] ? "saldo-compound" : LEXIN_SOURCE });
  }
  return added;
}
const LEXIN_SOURCE = "lexin-sv-2020";

/** Card fields SALDO decides for a new entry: { forms: [{type, value}], passive, countability }. */
export function saldoCardFields(saldo, pos) {
  if (!saldo) return null;
  const fields = cardFieldsFromSaldo(saldo, pos);
  return {
    forms: Object.entries(fields.forms).map(([type, value]) => ({ type, value })),
    passive: fields.passive || "",
    countability: fields.countability || null,
  };
}

// ---------------------------------------------------------------------------
// Provenance and field status
// ---------------------------------------------------------------------------

/**
 * Records where a row's content came from and which fields are present,
 * verified or missing, then refreshes the row's summary columns. Never throws:
 * before the shared-resources migration the tables don't exist and this is a no-op.
 *
 * entry: { type, pos, forms: {type: value}, passiv_s, countability, meaning_zh, meaning_en,
 *          example, swedish_explanation, cefr_level } (booleans for the text fields)
 * saldoRows: SALDO rows for (lemma, pos), [] when SALDO lacks the word (or rows built from a
 * compound's last part, formSource "saldo-compound"); referenceFields: fields already compared
 * with another dictionary (Lexin, compareWithLexin) when SALDO has nothing, under formSource.
 */
export async function recordEntryStatus(supabaseAdmin, entryId, entry, { saldoRows = [], referenceFields = null, formSource = SALDO_SOURCE_ID, generated = true } = {}) {
  try {
    const rows = [];
    const now = new Date().toISOString();
    const saldoFields = entry.type !== "word" ? {} : referenceFields && !saldoRows.length ? referenceFields : compareWithSaldo(entry, saldoRows).fields;
    for (const [field, r] of Object.entries(saldoFields)) {
      rows.push({ learning_object_id: entryId, field, status: r.status, source: r.status === "present" ? (generated ? AI_SOURCE_ID : "existing") : formSource,
        detail: r.status === "verified" ? null : { stored: r.stored, reference: r.reference }, updated_at: now });
    }
    for (const field of requiredFields(entry.type, entry.pos)) {
      if (field in saldoFields) continue;
      const present = field.startsWith("form:") ? Boolean(entry.forms?.[field.slice(5)]) : Boolean(entry[field]);
      if (!present && /^form:plural_/.test(field) && entry.countability === "uncountable") {
        rows.push({ learning_object_id: entryId, field, status: "not_applicable", source: saldoRows.length ? SALDO_SOURCE_ID : "existing", detail: null, updated_at: now });
        continue;
      }
      rows.push({ learning_object_id: entryId, field, status: present ? "present" : "missing", source: present ? (generated ? AI_SOURCE_ID : "existing") : null, detail: null, updated_at: now });
    }
    const { error } = await supabaseAdmin.from("resource_field_status").upsert(rows, { onConflict: "learning_object_id,field" });
    if (error) return;
    const sources = [];
    if (generated) sources.push({ learning_object_id: entryId, source_id: AI_SOURCE_ID, role: "generated_text" });
    if (saldoRows.length) {
      sources.push({ learning_object_id: entryId, source_id: SALDO_SOURCE_ID, role: "forms",
        fields: Object.keys(saldoFields), detail: { lemgram: saldoRows.map((r) => r.lemgram), ...(formSource !== SALDO_SOURCE_ID ? { via: formSource } : {}) } });
    } else if (referenceFields && Object.keys(saldoFields).length) {
      sources.push({ learning_object_id: entryId, source_id: formSource, role: "forms", fields: Object.keys(saldoFields), detail: null });
    }
    if (sources.length) await supabaseAdmin.from("learning_object_sources").upsert(sources, { onConflict: "learning_object_id,source_id,role" });
    await supabaseAdmin.rpc("refresh_resource_summary", { p_ids: [entryId] });
  } catch (error) {
    console.warn("[resources] status not recorded", error?.message || error);
  }
}

// What each explanation language says about a core fact (2026-11-03): when the Swedish core
// changes — part of speech, sense, forms, a group, countability — these per-language fields
// may now be wrong. One Swedish core, so one list for every language.
const DEPENDENTS = {
  pos: ["meaning", "grammar_note", "example"],
  sense: ["meaning", "example"],
  forms: ["grammar_note"],
  group: ["grammar_note"],
  countability: ["grammar_note"],
};

/**
 * Marks the per-language fields that depend on changed core facts for a re-check: their status
 * becomes "present" (back from verified, never up from missing or mismatch) with the change in
 * its detail. Content is not touched. Returns the rows written. Never throws.
 */
export async function markDependentsForRecheck(supabaseAdmin, entryId, changed, { languages = ["zh", "en"], reason = "" } = {}) {
  try {
    const fields = [...new Set(changed.flatMap((c) => DEPENDENTS[c] || []))].flatMap((f) => languages.map((l) => `${f}_${l}`));
    if (!fields.length) return [];
    const { data: current, error: readError } = await supabaseAdmin.from("resource_field_status").select("field, status").eq("learning_object_id", entryId).in("field", fields);
    if (readError) return [];
    const now = new Date().toISOString();
    const rows = fields
      .filter((f) => !current.some((c) => c.field === f && (c.status === "missing" || c.status === "mismatch")))
      .map((field) => ({ learning_object_id: entryId, field, status: "present", source: "recheck", detail: { after: changed, ...(reason ? { reason } : {}) }, updated_at: now }));
    const { error } = await supabaseAdmin.from("resource_field_status").upsert(rows, { onConflict: "learning_object_id,field" });
    return error ? [] : rows;
  } catch {
    return [];
  }
}

/** Adds a module membership (a phrase also studied as an expression). Never throws. */
export async function addModule(supabaseAdmin, entryId, module) {
  try {
    await supabaseAdmin.from("learning_object_modules").upsert({ learning_object_id: entryId, module }, { onConflict: "learning_object_id,module", ignoreDuplicates: true });
  } catch { /* table not there yet */ }
}

/** Writes the normalised match key (no-op before the migration). */
export async function setMatchKey(supabaseAdmin, entryId, matchKey) {
  try {
    await supabaseAdmin.from("learning_objects").update({ match_key: matchKey }).eq("id", entryId);
  } catch { /* column not there yet */ }
}
