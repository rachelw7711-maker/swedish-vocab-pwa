import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

import { documentWordPacks } from "../document-vocab-data.js";
import { educationWordPacks } from "../vocab-data.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH_SIZE = 500;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function clean(value) {
  return String(value || "").trim();
}

function firstCollocationMeaning(value) {
  const firstLine = clean(value)
    .split(/\n+/)
    .map(clean)
    .find(Boolean);
  if (!firstLine) return "";
  const parts = firstLine.split("|").map(clean);
  return parts[1] || "";
}

function noteForWord(word) {
  return [
    clean(word.english) ? `Swedish explanation: ${clean(word.english)}` : "",
    clean(word.forms) ? `Forms:\n${clean(word.forms)}` : "",
    clean(word.collocations) ? `Collocations:\n${clean(word.collocations)}` : "",
    clean(word.related_words) ? `Related words:\n${clean(word.related_words)}` : "",
    Array.isArray(word.tags) && word.tags.length ? `Tags: ${word.tags.map(clean).filter(Boolean).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function sourceForPack(sourceName, pack) {
  return [sourceName, clean(pack.level), clean(pack.notebook)].filter(Boolean).join(" / ");
}

function toWordRow(word, pack, sourceName) {
  return {
    swedish: clean(word.swedish),
    chinese: clean(word.chinese),
    part_of_speech: clean(word.pos),
    level: clean(pack.level),
    example_sv: clean(word.example),
    example_zh: firstCollocationMeaning(word.collocations),
    note: noteForWord(word),
    source: sourceForPack(sourceName, pack),
  };
}

function collectWords() {
  const bySwedish = new Map();
  let total = 0;
  const sources = [
    { name: "vocab-data.js", packs: educationWordPacks },
    { name: "document-vocab-data.js", packs: documentWordPacks },
  ];

  for (const source of sources) {
    for (const pack of source.packs) {
      for (const word of pack.words || []) {
        total += 1;
        const swedish = clean(word.swedish);
        const key = swedish.toLocaleLowerCase("sv-SE");
        if (!key || bySwedish.has(key)) continue;
        bySwedish.set(key, toWordRow(word, pack, source.name));
      }
    }
  }

  return {
    total,
    uniqueWords: [...bySwedish.values()],
  };
}

async function upsertWords(words) {
  for (let index = 0, batchNumber = 1; index < words.length; index += BATCH_SIZE, batchNumber += 1) {
    const batch = words.slice(index, index + BATCH_SIZE);
    const { error } = await supabase
      .from("words")
      .upsert(batch, { onConflict: "swedish" });
    if (error) {
      console.error(JSON.stringify(error, null, 2));
      throw new Error(`Supabase upsert failed on batch ${batchNumber}.`);
    }
    console.log(`Batch ${batchNumber} inserted: ${batch.length}`);
  }
}

async function countRemoteWords() {
  const { count, error } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true });
  return { count, error };
}

const { total, uniqueWords } = collectWords();
await upsertWords(uniqueWords);
const { count, error: countError } = await countRemoteWords();

console.log(`Local words read: ${total}`);
console.log(`Unique words after Swedish dedupe: ${uniqueWords.length}`);
if (countError) {
  console.error(JSON.stringify(countError, null, 2));
  throw new Error("Supabase count failed.");
}
console.log(`Current words count: ${count}`);
