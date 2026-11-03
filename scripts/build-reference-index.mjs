// Builds the local indexes of the dictionaries used next to SALDO (2026-11-03), from the
// downloaded source files, into data/reference/<name>/index.json (one object: lowercase
// headword → entries) plus meta.json (source, licence, checksum, counts).
//
//   node scripts/build-reference-index.mjs [dir=data/reference]
//
// Sources (download into the folders named):
//   lexin-sv/swe_swe.xml   Lexin: Svenska ord, svenskt lexikon (Isof, 4th version 2020, CC BY 4.0)
//                          https://sprakresurser.isof.se/lexin/svenska/
//   lexin/swe_eng.xml      Lexin: Svensk-engelskt lexikon (Isof, CC BY 4.0)
//                          https://sprakresurser.isof.se/lexin/engelska/
//   folkets/folkets_sv_en_public.xml   Folkets lexikon (KTH, CC BY-SA 2.5) — evidence only
//                          https://folkets-lexikon.csc.kth.se/folkets/
//   enwiktionary/sv.jsonl  English Wiktionary, Swedish entries, extracted by wiktextract
//                          (kaikki.org, CC BY-SA 4.0) — evidence only
//                          https://kaikki.org/dictionary/Swedish/
// Lexin is the one family whose text may be reused with attribution; Folkets (built on
// Lexin) and Wiktionary are share-alike and only ever used as evidence in checks.
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const dir = process.argv[2] || "data/reference";

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const text = (s) => String(s || "").replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENTITIES[e]).replace(/\|/g, "").replace(/\s+/g, " ").trim();
const attrs = (s) => Object.fromEntries([...String(s).matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], text(m[2])]));
const all = (s, re) => [...String(s).matchAll(re)];
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

// Lexin's word classes → SpråkLab parts of speech ("subst. plural", "adj., ingen böjning" …).
const LEXIN_POS = {
  "subst.": "noun", verb: "verb", "adj.": "adjective", "adv.": "adverb", "prep.": "preposition", "pron.": "pronoun",
  "interj.": "interjection", "räkn.": "numeral", "konj.": "conjunction", "förk.": "abbreviation", namn: "name", förled: "prefix", efterled: "suffix",
};
const lexinPos = (type) => LEXIN_POS[String(type || "").split(/[ ,]/)[0]] || "other";
// Lexin's form labels → SpråkLab form types.
const LEXIN_FORM = {
  "best.f.sing.": "singular_definite", "obest.f.pl.": "plural_indefinite", "best.f.pl.": "plural_definite",
  infinitiv: "infinitive", imperfekt: "preteritum", supinum: "supinum", "perf.part.": "perfect_participle", imperativ: "imperative",
  tform: "neuter_form", aform: "plural_form", komparativ: "comparative", superlativ: "superlative",
};

function add(index, word, entry) {
  const k = text(word).toLowerCase();
  if (k) (index[k] ||= []).push(entry);
}

function lexinSwedish(file) {
  const index = {};
  const xml = readFileSync(file, "utf8");
  for (const [, head, body] of all(xml, /<Lemma ([^>]*)>([\s\S]*?)<\/Lemma>/g)) {
    const a = attrs(head);
    const top = body.split(/<Lexeme /)[0];
    const forms = {};
    for (const [, label, value] of all(top, /<Inflection Form="([^"]*)"[^>]*>([^<]*)<\/Inflection>/g)) if (LEXIN_FORM[label]) forms[LEXIN_FORM[label]] = text(value);
    const pos = lexinPos(a.Type);
    // Verbs are headed by the present tense ("drömmer"): listed under the infinitive.
    if (pos === "verb") forms.present = a.Value;
    const lexemes = all(body, /<Lexeme ([^>]*)>([\s\S]*?)<\/Lexeme>/g).map(([, h, x]) => ({
      variant: attrs(h).VariantID || "",
      definition: text(x.match(/<Definition[^>]*>([^<]*)/)?.[1]),
      constructions: all(x, /<Graminfo[^>]*>([^<]*)<\/Graminfo>/g).map((m) => text(m[1])),
      examples: all(x, /<Example[^>]*>([^<]*)<\/Example>/g).map((m) => text(m[1])),
      idioms: all(x, /<Idiom[^>]*>([^<]*)(?:<Definition[^>]*>([^<]*)<\/Definition>)?/g).map((m) => [text(m[1]), text(m[2])]),
      compounds: all(x, /<Compound[^>]*>([^<]*)<\/Compound>/g).map((m) => text(m[1])),
    }));
    add(index, pos === "verb" && forms.infinitive ? forms.infinitive : a.Value, { pos, type: a.Type, forms, lexemes });
  }
  return index;
}

function lexinEnglish(file) {
  const index = {};
  const xml = readFileSync(file, "utf8");
  for (const [, head, body] of all(xml, /<Word ([^>]*)>([\s\S]*?)<\/Word>/g)) {
    const a = attrs(head);
    if (a.Type === "se") continue;   // a cross-reference, not an entry
    const base = body.match(/<BaseLang>([\s\S]*?)<\/BaseLang>/)?.[1] || "";
    const target = body.match(/<TargetLang>([\s\S]*?)<\/TargetLang>/)?.[1] || "";
    const pick = (s, tag) => all(s, new RegExp(`<${tag}[^>]*>([^<]*)`, "g")).map((m) => text(m[1]));
    const svIdioms = pick(base, "Idiom"), enIdioms = pick(target, "Idiom");
    const svEx = pick(base, "Example"), enEx = pick(target, "Example");
    const pos = lexinPos(a.Type);
    // Verbs are headed by the present tense; the infinitive is the last listed form.
    const inflections = pick(base, "Inflection");
    const headword = pos === "verb" && inflections.length ? inflections.at(-1) : a.Value;
    add(index, headword, {
      pos, variant: a.VariantID || "", definition: pick(base, "Meaning")[0] || "",
      english: [...pick(target, "Translation"), ...pick(target, "Synonym")].filter(Boolean),
      constructions: pick(base, "Graminfo"),
      idioms: svIdioms.map((s, i) => [s, enIdioms[i] || ""]),
      examples: svEx.map((s, i) => [s, enEx[i] || ""]),
    });
  }
  return index;
}

const FOLKETS_POS = { nn: "noun", vb: "verb", jj: "adjective", ab: "adverb", pp: "preposition", pn: "pronoun", hp: "pronoun", ps: "pronoun", in: "interjection", rg: "numeral", kn: "conjunction", sn: "conjunction", abbrev: "abbreviation", pm: "name", pc: "adjective" };
function folkets(file) {
  const index = {};
  const xml = readFileSync(file, "utf8");
  for (const [, head, body] of all(xml, /<word ([^>]*)>([\s\S]*?)<\/word>/g)) {
    const a = attrs(head);
    const nested = (tag) => all(body, new RegExp(`<${tag} value="([^"]*)"[^>]*>(?:<translation[^>]*value="([^"]*)")?`, "g")).map((m) => [text(m[1]), text(m[2])]);
    add(index, a.value, {
      pos: FOLKETS_POS[a.class] || "other",
      english: all(body.split(/<(?:example|idiom|definition|compound)\b/)[0], /<translation[^>]*value="([^"]*)"/g).map((m) => text(m[1])).filter(Boolean),
      forms: all(body, /<inflection value="([^"]*)"/g).map((m) => text(m[1])),
      idioms: nested("idiom"),
    });
  }
  return index;
}

const WIKT_POS = { noun: "noun", verb: "verb", adj: "adjective", adv: "adverb", prep: "preposition", pron: "pronoun", det: "pronoun", intj: "interjection", num: "numeral", conj: "conjunction", phrase: "phrase", prep_phrase: "phrase", adv_phrase: "phrase", proverb: "phrase", abbrev: "abbreviation", name: "name", particle: "other", article: "other", prefix: "prefix", suffix: "suffix" };
async function enWiktionary(file) {
  const index = {};
  for await (const line of createInterface({ input: createReadStream(file, "utf8") })) {
    if (!line.trim()) continue;
    const d = JSON.parse(line);
    const senses = (d.senses || []).filter((s) => s.glosses?.length);
    const formOf = senses.filter((s) => (s.tags || []).some((t) => t === "form-of" || t === "alt-of"));
    const own = senses.filter((s) => !formOf.includes(s));
    if (!own.length && !formOf.length) continue;
    add(index, d.word, {
      pos: WIKT_POS[d.pos] || "other",
      glosses: own.map((s) => s.glosses.at(-1)).slice(0, 12),
      tags: [...new Set(own.flatMap((s) => s.tags || []))].sort(),
      head: (d.head_templates || []).map((h) => h.expansion || "").join(" ").slice(0, 200),
      formOf: [...new Set(formOf.map((s) => s.form_of?.[0]?.word).filter(Boolean))].slice(0, 3),
    });
  }
  return index;
}

const SOURCES = [
  { name: "lexin-sv", file: "swe_swe.xml", build: lexinSwedish, meta: { source: "Lexin: Svenska ord, svenskt lexikon", publisher: "Institutet för språk och folkminnen (Isof)", version: "4 (2020-03-09)", licence: "CC BY 4.0", url: "https://sprakresurser.isof.se/lexin/svenska/" } },
  { name: "lexin", file: "swe_eng.xml", build: lexinEnglish, meta: { source: "Lexin: Svensk-engelskt lexikon", publisher: "Institutet för språk och folkminnen (Isof)", version: "2010-04-04 (published 2020-03-09)", licence: "CC BY 4.0", url: "https://sprakresurser.isof.se/lexin/engelska/" } },
  { name: "folkets", file: "folkets_sv_en_public.xml", build: folkets, meta: { source: "Folkets lexikon (sv–en)", publisher: "KTH", licence: "CC BY-SA 2.5", url: "https://folkets-lexikon.csc.kth.se/folkets/", use: "evidence only" } },
  { name: "enwiktionary", file: "sv.jsonl", build: enWiktionary, meta: { source: "English Wiktionary, Swedish entries (wiktextract)", publisher: "Wiktionary contributors; extraction kaikki.org", licence: "CC BY-SA 4.0", url: "https://kaikki.org/dictionary/Swedish/", use: "evidence only" } },
];

for (const s of SOURCES) {
  const file = `${dir}/${s.name}/${s.file}`;
  if (!existsSync(file)) { console.log("skip", s.name, "(no", file + ")"); continue; }
  const index = await s.build(file);
  const counts = { headwords: Object.keys(index).length, entries: Object.values(index).reduce((n, v) => n + v.length, 0) };
  writeFileSync(`${dir}/${s.name}/index.json`, JSON.stringify(index));
  writeFileSync(`${dir}/${s.name}/meta.json`, JSON.stringify({ ...s.meta, file: s.file, sha256: sha256(file), builtAt: new Date().toISOString(), counts }, null, 1));
  console.log(s.name, counts);
}
