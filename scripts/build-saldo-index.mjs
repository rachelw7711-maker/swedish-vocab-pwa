// Builds SpråkLab's local SALDO morphology index (2026-10-31) from Språkbanken's
// saldom.xml — "SALDO's morphology" (updated 2017-09-19), CC BY 4.0,
// https://doi.org/10.23695/agcm-ny22. Attribution: "SALDO's morphology,
// Språkbanken Text, University of Gothenburg (CC BY 4.0)".
//
//   node scripts/build-saldo-index.mjs <path/to/saldom.xml> [outDir=data/reference/saldo]
//
// Writes:
//   saldo-lemmas.ndjson — one line per lemgram: {n lemgram, l baseform, p SALDO pos,
//                         g paradigm, f {msd: [forms]}} — only the forms a word card uses
//   saldo-lemmas.tsv     — id, lemgram, baseform, pos, paradigm, forms — for public.saldo_lemmas
//                         (proper names left out)
//   saldo-wordforms.tsv  — lower-cased form → lemma id, for public.saldo_wordforms; only
//                         single-word classes (multi-word entries are found by baseform)
//                         and no compound-part forms
//   meta.json            — source, version, licence, sha256, counts
import { createReadStream, mkdirSync, writeFileSync, createWriteStream } from "node:fs";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";

const [input, outDir = "data/reference/saldo"] = process.argv.slice(2);
if (!input) throw new Error("usage: node scripts/build-saldo-index.mjs <saldom.xml> [outDir]");
mkdirSync(outDir, { recursive: true });

// The forms a word card shows (see FORM_TYPES in server-native.mjs and
// server-lexicon.mjs); the rest of each inflection table stays out of the card index.
const CARD_MSD = new Set([
  "sg indef nom", "sg def nom", "pl indef nom", "pl def nom",
  "inf aktiv", "pres ind aktiv", "pret ind aktiv", "sup aktiv", "imper",
  "inf s-form", "pres ind s-form", "pret ind s-form", "sup s-form",
  "pres_part nom", "pret_part indef sg u nom", "pret_part indef sg n nom", "pret_part indef pl nom",
  "pos indef sg u nom", "pos indef sg n nom", "pos indef pl nom", "pos def sg no_masc nom",
  "komp nom", "super indef nom", "super def no_masc nom",
  "pos", "komp", "super",
  "nom", "ack", "invar",
]);
const COMPOUND_PART = /(^| )(c|ci|cm|sms)( |$)/;

const hash = createHash("sha256");
createReadStream(input).on("data", (chunk) => hash.update(chunk));
const lines = createInterface({ input: createReadStream(input, "utf8"), crlfDelay: Infinity });
const lemmaOut = createWriteStream(`${outDir}/saldo-lemmas.ndjson`);
const lemmaTsv = createWriteStream(`${outDir}/saldo-lemmas.tsv`);
const formTsv = createWriteStream(`${outDir}/saldo-wordforms.tsv`);
const tsv = (s) => String(s).replace(/[\t\n\\]/g, " ");
const val = (line) => line.match(/val="([^"]*)"/)?.[1]?.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&") ?? "";

const SINGLE_WORD_POS = new Set(["nn", "vb", "av", "ab", "pn", "pp", "kn", "sn", "in", "nl"]);
let entry = null, pendingForm = null, inLemma = false, nextId = 1;
const counts = { lemgrams: 0, wordforms: 0, byPos: {} };
const seenForm = new Set();
for await (const line of lines) {
  if (line.includes("<LexicalEntry")) { entry = { f: {} }; seenForm.clear(); continue; }
  if (!entry) continue;
  if (line.includes("<Lemma>")) inLemma = true;
  else if (line.includes("</Lemma>")) inLemma = false;
  else if (inLemma && line.includes('att="writtenForm"')) entry.l = val(line);
  else if (inLemma && line.includes('att="lemgram"')) entry.n = val(line);
  else if (inLemma && line.includes('att="partOfSpeech"')) entry.p = val(line);
  else if (inLemma && line.includes('att="paradigm"')) entry.g = val(line);
  else if (line.includes("<WordForm>")) pendingForm = {};
  else if (pendingForm && line.includes('att="writtenForm"')) pendingForm.w = val(line);
  else if (pendingForm && line.includes('att="msd"')) pendingForm.m = val(line);
  else if (pendingForm && line.includes("</WordForm>")) {
    const { w, m } = pendingForm;
    pendingForm = null;
    if (!w || !m || COMPOUND_PART.test(m)) continue;
    if (CARD_MSD.has(m)) (entry.f[m] ??= []).includes(w) || entry.f[m].push(w);
    seenForm.add(w.toLowerCase());
  } else if (line.includes("</LexicalEntry>")) {
    if (entry.n) {
      lemmaOut.write(JSON.stringify(entry) + "\n");
      if (!entry.p.startsWith("pm")) {
        const id = nextId++;
        lemmaTsv.write([id, entry.n, entry.l, entry.p, entry.g, JSON.stringify(entry.f)].map(tsv).join("\t") + "\n");
        if (SINGLE_WORD_POS.has(entry.p)) {
          seenForm.add(entry.l.toLowerCase());
          for (const form of seenForm) { formTsv.write(`${tsv(form)}\t${id}\n`); counts.wordforms++; }
        }
      }
      counts.lemgrams++;
      counts.byPos[entry.p] = (counts.byPos[entry.p] || 0) + 1;
    }
    entry = null;
  }
}
await Promise.all([lemmaOut, lemmaTsv, formTsv].map((s) => new Promise((r) => s.end(r))));
writeFileSync(`${outDir}/meta.json`, JSON.stringify({
  source: "SALDO's morphology", publisher: "Språkbanken Text, University of Gothenburg", version: "2017-09-19",
  licence: "CC BY 4.0", url: "https://spraakbanken.gu.se/en/resources/saldom", doi: "https://doi.org/10.23695/agcm-ny22",
  download: "https://svn.spraakbanken.gu.se/sb-arkiv/pub/lmf/saldom/saldom.xml", sha256: hash.digest("hex"),
  builtAt: new Date().toISOString(), counts,
}, null, 1));
console.log(JSON.stringify(counts));
