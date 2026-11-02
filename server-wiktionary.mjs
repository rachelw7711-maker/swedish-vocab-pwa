// Swedish Wiktionary (sv.wiktionary.org) as a second reference next to SALDO
// (2026-11-02): which parts of speech a spelling has, the senses of each, and their
// inflected forms. Evidence for checks only — its text is CC BY-SA 4.0, so definitions
// are never copied into the dictionary (an entry's own explanations stay ours).
//
// One page per spelling through the MediaWiki Action API (action=parse, wikitext),
// parsed per part-of-speech section; forms come from expanding that section's
// inflection template. Server side only, cached (memory, then the wiktionary_cache
// table when it exists), serial with a short gap between requests, a timeout, and a
// result that says what happened — "missing", "timeout", "error" — instead of a guess.

const API = "https://sv.wiktionary.org/w/api.php";
// Wikimedia User-Agent policy: a descriptive agent with a way to reach the operator.
const USER_AGENT = "SprakLab/0.1 (https://swedish-vocab-pwa.vercel.app; dictionary verification) node-fetch";
const TIMEOUT_MS = 4000;
const GAP_MS = 120;
const RETRY_PAUSE_MS = Number(process.env.WIKTIONARY_RETRY_PAUSE_MS ?? 1500);
const FOUND_TTL_MS = 30 * 24 * 3600 * 1000;
const MISSING_TTL_MS = 7 * 24 * 3600 * 1000;

// Section headings of a Swedish entry → the dictionary's parts of speech.
const POS_HEADINGS = {
  substantiv: "noun", verb: "verb", adjektiv: "adjective", adverb: "adverb", pronomen: "pronoun",
  preposition: "preposition", konjunktion: "conjunction", subjunktion: "conjunction", interjektion: "interjection",
  räkneord: "numeral", artikel: "other", partikel: "other", förkortning: "other", affix: "other",
  fras: "phrase", ordspråk: "phrase", "verbpartikel": "other",
};
// {{böjning|sv|<code>|<lemma>}} on a page for an inflected form.
const FORM_OF_POS = { subst: "noun", verb: "verb", adj: "adjective", adv: "adverb", pron: "pronoun", räkn: "numeral" };

const memory = new Map();
let queue = Promise.resolve();

const normalize = (word) => String(word || "").trim().toLowerCase();

/** Plain text of a wikitext line: links to their text, templates and markup removed. */
export function plainText(wikitext) {
  return String(wikitext || "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The Swedish section of a page as { entries: [{ pos, heading, senses: [{ text, examples }],
 * english: [[...]], inflection, formOf }] }. A spelling can have several parts of speech
 * (torka: Substantiv and Verb) and each part of speech several senses — kept apart.
 */
export function parseSwedishSection(wikitext) {
  const text = String(wikitext || "");
  const start = text.search(/^==\s*Svenska\s*==\s*$/m);
  if (start < 0) return { entries: [] };
  const rest = text.slice(start).split("\n").slice(1);
  const end = rest.findIndex((line) => /^==[^=].*==\s*$/.test(line));
  const lines = end < 0 ? rest : rest.slice(0, end);

  const entries = [];
  let current = null;
  let translationGroup = null;
  for (const line of lines) {
    const heading = line.match(/^===\s*([^=]+?)\s*===\s*$/);
    if (heading) {
      const name = heading[1].toLowerCase();
      current = { pos: POS_HEADINGS[name] || "other", heading: heading[1], senses: [], english: [], inflection: "", formOf: null };
      entries.push(current);
      translationGroup = null;
      continue;
    }
    if (!current) continue;
    const template = line.match(/^\{\{(sv-[a-z]+-[^}]*)\}\}\s*$/);
    if (template && !current.inflection) { current.inflection = `{{${template[1]}}}`; continue; }
    const formOf = line.match(/^#\s*\{\{böjning\|sv\|([^|}]+)\|([^|}]+)/);
    if (formOf) { current.formOf = { pos: FORM_OF_POS[formOf[1]] || "other", lemma: formOf[2].trim() }; continue; }
    if (/^#[^:*]/.test(line)) {
      const sense = plainText(line.replace(/^#\s*/, "").replace(/\{\{(?!böjning)[^{}]*\}\}/g, ""));
      if (sense) current.senses.push({ text: sense, examples: [] });
      continue;
    }
    if (/^#:/.test(line) && current.senses.length && /''/.test(line) && !/\{\{/.test(line)) {
      current.senses.at(-1).examples.push(plainText(line.replace(/^#:\s*/, "")));
      continue;
    }
    if (/^\{\{ö-topp/.test(line)) { translationGroup = []; current.english.push(translationGroup); continue; }
    if (translationGroup && /^\*engelska:/.test(line)) {
      for (const m of line.matchAll(/\{\{ö\+?\|en\|([^|}]+)/g)) translationGroup.push(m[1].trim());
    }
  }
  return { entries: entries.filter((e) => e.senses.length || e.formOf) };
}

/** The forms in an expanded inflection table ("[[torkan]]" cells). */
export function formsFromTable(wikitext) {
  const forms = new Set();
  for (const m of String(wikitext || "").matchAll(/\|\s*<span[^>]*>\s*\[\[([^\]|]+)\]\]/g)) forms.add(m[1].trim().toLowerCase());
  return [...forms];
}

// One retry after a pause for what may pass (timeout, network, 429, 5xx); not for 4xx.
async function request(params, fetchImpl) {
  const first = await requestOnce(params, fetchImpl);
  const transient = first.error === "timeout" || first.error === "network" || /^http_(429|5\d\d)$/.test(String(first.error || ""));
  if (!transient) return first;
  await new Promise((r) => setTimeout(r, RETRY_PAUSE_MS));
  const second = await requestOnce(params, fetchImpl);
  return second.error ? { ...second, retried: true } : second;
}

async function requestOnce(params, fetchImpl) {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params })}`;
  // Serial, with a short gap: Wikimedia asks API clients not to send requests in parallel.
  const turn = queue.then(() => new Promise((r) => setTimeout(r, GAP_MS)));
  queue = turn.catch(() => {});
  await turn;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT }, signal: controller.signal });
    if (!res.ok) return { error: `http_${res.status}` };
    return await res.json();
  } catch (error) {
    return { error: error.name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

async function readCache(supabaseAdmin, word) {
  const hit = memory.get(word);
  if (hit && Date.now() - hit.at < (hit.value.status === "found" ? FOUND_TTL_MS : MISSING_TTL_MS)) return hit.value;
  if (!supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin.from("wiktionary_cache").select("status, data, fetched_at").eq("word", word).maybeSingle();
    if (error || !data) return null;
    const age = Date.now() - Date.parse(data.fetched_at);
    if (age > (data.status === "found" ? FOUND_TTL_MS : MISSING_TTL_MS)) return null;
    const value = { status: data.status, word, ...(data.data || {}) };
    memory.set(word, { at: Date.parse(data.fetched_at), value });
    return value;
  } catch {
    return null;   // no cache table yet: memory only
  }
}

async function writeCache(supabaseAdmin, word, value) {
  memory.set(word, { at: Date.now(), value });
  if (!supabaseAdmin) return;
  const { status, word: _w, ...data } = value;
  try {
    await supabaseAdmin.from("wiktionary_cache").upsert({ word, status, data, fetched_at: new Date().toISOString() }, { onConflict: "word" });
  } catch { /* no cache table yet */ }
}

/**
 * What sv.wiktionary.org says about a spelling:
 *   { status: "found", word, entries } — entries as parseSwedishSection gives them
 *   { status: "missing" }   — no page, or no Swedish section on it
 *   { status: "timeout" | "error" | "parse_failed", reason } — nothing known (not cached)
 * withForms adds each entry's inflected forms (one more request per part of speech).
 */
export async function lookupWiktionary(supabaseAdmin, spelling, { withForms = false, fetchImpl = globalThis.fetch } = {}) {
  const word = normalize(spelling);
  if (!word || word.length > 60) return { status: "error", word, reason: "invalid" };
  const cached = await readCache(supabaseAdmin, word);
  if (cached && (!withForms || cached.status !== "found" || cached.entries.every((e) => e.forms || !e.inflection))) return cached;

  let entries;
  if (cached?.status === "found") {
    entries = cached.entries;
  } else {
    const page = await request({ action: "parse", page: word, prop: "wikitext", redirects: "1" }, fetchImpl);
    if (page.error === "timeout" || page.error === "network" || String(page.error || "").startsWith("http_")) {
      return { status: page.error === "timeout" ? "timeout" : "error", word, reason: page.error };
    }
    if (page.error?.code === "missingtitle") {
      const value = { status: "missing", word };
      await writeCache(supabaseAdmin, word, value);
      return value;
    }
    if (page.error) return { status: "error", word, reason: page.error.code || "api" };
    try {
      entries = parseSwedishSection(page.parse?.wikitext).entries;
    } catch (error) {
      return { status: "parse_failed", word, reason: error.message };
    }
    if (!entries.length) {
      const value = { status: "missing", word };
      await writeCache(supabaseAdmin, word, value);
      return value;
    }
  }
  if (withForms) {
    for (const entry of entries) {
      if (!entry.inflection || entry.forms) continue;
      const expanded = await request({ action: "expandtemplates", title: word, text: entry.inflection, prop: "wikitext" }, fetchImpl);
      if (expanded.error) return { status: expanded.error === "timeout" ? "timeout" : "error", word, reason: String(expanded.error.code || expanded.error) };
      entry.forms = formsFromTable(expanded.expandtemplates?.wikitext);
    }
  }
  const value = { status: "found", word, entries };
  await writeCache(supabaseAdmin, word, value);
  return value;
}

/** The parts of speech Wiktionary gives a spelling, as a headword or as an inflected form of a lemma. */
export function wiktionaryReadings(result) {
  if (result?.status !== "found") return [];
  return result.entries.map((e) => (e.formOf ? { pos: e.formOf.pos, lemma: e.formOf.lemma, form: true } : { pos: e.pos, lemma: result.word, form: false }));
}

export function clearWiktionaryMemory() {
  memory.clear();
}
