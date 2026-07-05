import { educationWordPacks } from "../vocab-data.js";
import { documentWordPacks } from "../document-vocab-data.js";

const checkedFields = [
  "swedish",
  "forms",
  "example",
  "collocations",
  "related_words",
  "relatedWords",
  "chinese",
  "english",
  "note",
];

const forbiddenSpellings = [
  { value: "peronlig", correction: "personlig" },
  { value: "peronligt", correction: "personligt" },
  { value: "peronliga", correction: "personliga" },
  { value: "glädjer", correction: "gläder" },
];

const inflectionRules = [
  {
    lemma: "glädja",
    pos: "verb",
    forms: {
      imperativ: "gläd",
      infinitiv: "glädja",
      presens: "gläder",
      preteritum: "gladde",
      supinum: "glatt",
    },
    forbiddenForms: ["glädjer"],
  },
  {
    lemma: "personlig",
    pos: "adjective",
    forms: {
      en: "personlig",
      ett: "personligt",
      plural: "personliga",
    },
    orderedForms: ["personlig", "personligt", "personliga"],
    forbiddenForms: ["peronlig", "peronligt", "peronliga"],
  },
];

const packs = [
  { file: "vocab-data.js", data: educationWordPacks },
  { file: "document-vocab-data.js", data: documentWordPacks },
];

const errors = [];

for (const source of packs) {
  for (const { pack, word, index } of iterateWords(source)) {
    validateForbiddenSpellings(source.file, pack, word, index);
    validateSearchCorpus(source.file, pack, word, index);
    validateSpellingTarget(source.file, pack, word, index);
    validateInflectionRules(source.file, pack, word, index);
  }
}

if (errors.length > 0) {
  throw new Error(`Vocabulary validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
}

console.log("Vocabulary validation complete.");

function* iterateWords(source) {
  for (const pack of source.data) {
    const words = Array.isArray(pack.words) ? pack.words : [];
    for (let index = 0; index < words.length; index += 1) {
      yield { pack, word: words[index], index };
    }
  }
}

function validateForbiddenSpellings(file, pack, word, index) {
  for (const field of checkedFields) {
    const value = word[field];
    if (typeof value !== "string") continue;
    for (const spelling of forbiddenSpellings) {
      if (containsToken(value, spelling.value)) {
        errors.push(
          `${location(file, pack, word, index)} has "${spelling.value}" in ${field}; use "${spelling.correction}".`,
        );
      }
    }
  }
}

function validateSearchCorpus(file, pack, word, index) {
  const corpus = checkedFields
    .map((field) => word[field])
    .filter((value) => typeof value === "string")
    .join(" ");

  for (const spelling of forbiddenSpellings) {
    if (containsToken(corpus, spelling.value)) {
      errors.push(
        `${location(file, pack, word, index)} would add "${spelling.value}" to the search index.`,
      );
    }
  }
}

function validateSpellingTarget(file, pack, word, index) {
  const target = typeof word.swedish === "string" ? word.swedish : "";
  for (const spelling of forbiddenSpellings) {
    if (containsToken(target, spelling.value)) {
      errors.push(
        `${location(file, pack, word, index)} would use "${spelling.value}" as a spelling-test answer.`,
      );
    }
  }
}

function validateInflectionRules(file, pack, word, index) {
  const lemma = clean(word.swedish);
  const pos = clean(word.pos);
  const rule = inflectionRules.find((candidate) => candidate.lemma === lemma && candidate.pos === pos);
  if (!rule) return;

  const parsedForms = parseForms(word.forms);
  const orderedForms = parseOrderedForms(word.forms);
  for (const [label, expected] of Object.entries(rule.forms)) {
    const actual = parsedForms.get(label);
    const orderedIndex = Object.keys(rule.forms).indexOf(label);
    const orderedActual = orderedForms[orderedIndex];
    const matchesLabeledForm = actual === expected;
    const matchesOrderedForm = rule.orderedForms && orderedActual === expected;
    if (!matchesLabeledForm && !matchesOrderedForm) {
      const observed = actual || orderedActual || "(missing)";
      errors.push(`${location(file, pack, word, index)} has wrong ${label} form: expected "${expected}", got "${observed}".`);
    }
  }

  const formsText = typeof word.forms === "string" ? word.forms : "";
  for (const forbidden of rule.forbiddenForms) {
    if (containsToken(formsText, forbidden)) {
      errors.push(`${location(file, pack, word, index)} contains forbidden form "${forbidden}".`);
    }
  }
}

function parseForms(forms) {
  const result = new Map();
  if (typeof forms !== "string") return result;

  for (const part of forms.split(";")) {
    const separatorIndex = part.indexOf(":");
    if (separatorIndex < 0) continue;
    const label = clean(part.slice(0, separatorIndex)).toLocaleLowerCase("sv-SE");
    const value = clean(part.slice(separatorIndex + 1)).toLocaleLowerCase("sv-SE");
    if (label && value) result.set(label, value);
  }
  return result;
}

function parseOrderedForms(forms) {
  if (typeof forms !== "string") return [];
  return forms
    .split(";")
    .map((part) => {
      const separatorIndex = part.indexOf(":");
      const value = separatorIndex >= 0 ? part.slice(separatorIndex + 1) : part;
      return clean(value).toLocaleLowerCase("sv-SE");
    })
    .filter(Boolean);
}

function containsToken(text, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}($|[^\\p{L}\\p{N}_])`, "iu").test(text);
}

function clean(value) {
  return String(value ?? "").trim();
}

function location(file, pack, word, index) {
  const notebook = pack.notebook || pack.level || "unknown pack";
  const lemma = word.swedish || word.id || `word ${index + 1}`;
  return `${file} / ${notebook} / ${lemma}`;
}
