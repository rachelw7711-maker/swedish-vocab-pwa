import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { educationWordPacks } from "../vocab-data.js";
import { documentWordPacks } from "../document-vocab-data.js";

function clean(value) {
  return String(value || "").trim();
}

function stableId(notebook, swedish, pos, index) {
  const source = `${notebook}::${swedish}::${pos}::${index}`;
  return `word_${createHash("sha1").update(source).digest("hex").slice(0, 16)}`;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map(clean).filter(Boolean);
  }
  const text = clean(value);
  return text ? [text] : [];
}

function migrateWord(word, notebook, index) {
  const swedish = clean(word.swedish);
  const pos = clean(word.pos) || "other";
  const tags = normalizeTags(firstDefined(word.tags, word.tag));
  return {
    id: clean(word.id) || stableId(notebook, swedish, pos, index),
    swedish,
    pos,
    pos_detail: clean(firstDefined(word.pos_detail, word.posDetail)),
    chinese: clean(word.chinese),
    english: clean(word.english),
    forms: clean(word.forms),
    example: clean(word.example),
    collocations: clean(word.collocations),
    related_words: clean(firstDefined(word.related_words, word.relatedWords)),
    favorite: Boolean(word.favorite),
    learned: Boolean(word.learned),
    review_count: Number(firstDefined(word.review_count, word.reviewCount, 0)) || 0,
    wrong_count: Number(firstDefined(word.wrong_count, word.wrongCount, 0)) || 0,
    last_reviewed: firstDefined(word.last_reviewed, word.lastReviewed) ?? null,
    next_review_at: firstDefined(word.next_review_at, word.nextReviewAt) ?? null,
    created_at: firstDefined(word.created_at, word.createdAt) ?? null,
    updated_at: firstDefined(word.updated_at, word.updatedAt) ?? null,
    tags,
  };
}

function migratePacks(packs) {
  return packs.map((pack) => ({
    ...pack,
    words: pack.words.map((word, index) => migrateWord(word, pack.notebook || pack.level || "", index)),
  }));
}

const migratedEducation = migratePacks(educationWordPacks);
const migratedDocument = migratePacks(documentWordPacks);

writeFileSync(
  new URL("../vocab-data.js", import.meta.url),
  `export const educationWordPacks = ${JSON.stringify(migratedEducation, null, 2)};\n`,
);
writeFileSync(
  new URL("../document-vocab-data.js", import.meta.url),
  `export const documentWordPacks = ${JSON.stringify(migratedDocument, null, 2)};\n`,
);

console.log("Migrated word schema to snake_case fields.");
