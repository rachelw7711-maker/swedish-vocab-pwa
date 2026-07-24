import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

// Read-only analysis. Touches nothing in Supabase, only SELECTs.
// Produces Reviews/词库扩充候选清单.md and a JSON sidecar for later use
// by the real import step. Source files live outside the repo, on the
// Desktop, per Rachel's download location — paths below are absolute.

const RESOURCE_DIR = "/Users/huijingwang/Desktop/临时文件/SpråkLab Language Resources";
const KELLY_PATH = `${RESOURCE_DIR}/Swedish-Kelly_M3_CEFR.xls`;
const SALDO_PATH = `${RESOURCE_DIR}/saldo.xml`;
const LEXIN_PATH = `${RESOURCE_DIR}/LEXIN/LEXIN.xml`;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function norm(s) {
  return String(s || "")
    .trim()
    .toLocaleLowerCase("sv-SE")
    .replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// 1. Existing learning_objects (what we already have)
// ---------------------------------------------------------------------------
async function fetchExisting() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase
      .from("learning_objects")
      .select("swedish, part_of_speech, object_type")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Supabase fetch failed: ${JSON.stringify(error)}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

const existingRows = await fetchExisting();
const existingSet = new Set(existingRows.map((r) => norm(r.swedish)));
console.error(`Existing learning_objects: ${existingRows.length} rows, ${existingSet.size} distinct normalized forms.`);

// ---------------------------------------------------------------------------
// 2. Kelly (CEFR-graded frequency list) — this is the priority source
// ---------------------------------------------------------------------------
function loadKelly() {
  const wb = XLSX.readFile(KELLY_PATH);
  const sheet = wb.Sheets["Swedish_M3_CEFR"];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const [, ...dataRows] = rows; // first row is header
  const items = [];
  for (const row of dataRows) {
    const [id, , , cefr, , grammar, lemma, wordClass] = row;
    if (!lemma) continue;
    items.push({
      id,
      cefr: String(cefr || "").trim(),
      grammar: String(grammar || "").trim(),
      lemma: String(lemma).trim(),
      wordClass: String(wordClass || "").trim(),
    });
  }
  return items;
}

const kellyItems = loadKelly();
console.error(`Kelly list: ${kellyItems.length} entries.`);

// ---------------------------------------------------------------------------
// 3. SALDO — used two ways: (a) confirms a candidate is a real Swedish
//    lemma, (b) lets us flag candidates that are probably an inflected
//    form of a lemma we already have, rather than a genuinely new word.
//    NOTE: saldo.xml (the sense/relation lexicon we have) only carries a
//    `paradigm` CODE per lemma (e.g. vb_4a_dricka), not the expanded
//    inflected surface forms -- that requires SALDO's separate morphology
//    component, which was not part of this download. So this script does
//    NOT do true morphological generation; it only does (a) exact-lemma
//    lookup against SALDO's ~131k lemma inventory, plus (b) a plain
//    suffix-stripping heuristic for (b) above. Heuristic hits are flagged
//    for human review, never auto-resolved.
// ---------------------------------------------------------------------------
function loadSaldo() {
  const content = readFileSync(SALDO_PATH, "utf8");
  const re =
    /<FormRepresentation>\s*<feat att="writtenForm" val="([^"]*)"\s*\/>\s*<feat att="partOfSpeech" val="([^"]*)"\s*\/>\s*<feat att="lemgram" val="([^"]*)"\s*\/>\s*(?:<feat att="paradigm" val="([^"]*)"\s*\/>\s*)?<\/FormRepresentation>/g;
  const lemmaSet = new Set();
  let match;
  let count = 0;
  while ((match = re.exec(content))) {
    const [, form] = match;
    lemmaSet.add(norm(form));
    count += 1;
  }
  console.error(`SALDO: ${count} FormRepresentation entries, ${lemmaSet.size} distinct normalized forms.`);
  return lemmaSet;
}

const saldoLemmaSet = loadSaldo();

const INFLECTION_SUFFIXES = [
  "arna", "orna", "erna", "ena", // definite plural (noun)
  "ade", "are", "ast", "aste", // preteritum / comparative / superlative
  "or", "ar", "er", "en", "et", "na", // plural / definite (noun)
  "de", "te", "it", "at", // preteritum / supinum (verb)
  "a", "e", "s", "t", // light single-letter endings, tried last
];

function possibleBaseForms(word) {
  const bases = [];
  for (const suf of INFLECTION_SUFFIXES) {
    if (word.length - suf.length >= 3 && word.endsWith(suf)) {
      bases.push(word.slice(0, -suf.length));
    }
  }
  return bases;
}

function findLikelyLemma(word, knownSets) {
  for (const base of possibleBaseForms(word)) {
    for (const set of knownSets) {
      if (set.has(base)) return base;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 4. LEXIN — coverage checklist ONLY (per license: no content is read out
//    of this file into the candidate list or the database, only the plain
//    word list is used to cross-check coverage).
// ---------------------------------------------------------------------------
function loadLexin() {
  const content = readFileSync(LEXIN_PATH, "latin1");
  const re = /<form>([^<]*)<\/form>/g;
  const set = new Set();
  let match;
  while ((match = re.exec(content))) {
    const cleaned = match[1].replace(/\s+\d+\s*$/, "").trim(); // strip homograph number, e.g. "a 2" -> "a"
    if (cleaned) set.add(norm(cleaned));
  }
  console.error(`LEXIN: ${set.size} distinct normalized forms (word list only, no definitions/examples read).`);
  return set;
}

const lexinSet = loadLexin();

// ---------------------------------------------------------------------------
// 5. Classify every Kelly entry
// ---------------------------------------------------------------------------
const alreadyCovered = [];
const newCandidates = [];
const flaggedAsInflection = [];

for (const item of kellyItems) {
  const key = norm(item.lemma);
  if (!key) continue;
  if (existingSet.has(key)) {
    alreadyCovered.push(item);
    continue;
  }
  const likelyBase = findLikelyLemma(key, [existingSet, saldoLemmaSet]);
  const record = {
    ...item,
    normalized: key,
    confirmedBySaldo: saldoLemmaSet.has(key),
    confirmedByLexin: lexinSet.has(key),
    likelyBaseForm: likelyBase,
  };
  if (likelyBase && likelyBase !== key) {
    flaggedAsInflection.push(record);
  } else {
    newCandidates.push(record);
  }
}

console.error(`Already covered: ${alreadyCovered.length}`);
console.error(`Genuinely new candidates: ${newCandidates.length}`);
console.error(`Flagged as possible inflection (needs human check): ${flaggedAsInflection.length}`);

// ---------------------------------------------------------------------------
// 6. Report
// ---------------------------------------------------------------------------
const cefrOrder = ["A1", "A2", "B1", "B2", "C1", "C2"];
function countByCefr(list) {
  const counts = Object.fromEntries(cefrOrder.map((c) => [c, 0]));
  let other = 0;
  for (const item of list) {
    if (counts[item.cefr] !== undefined) counts[item.cefr] += 1;
    else other += 1;
  }
  return { counts, other };
}

const newByCefr = countByCefr(newCandidates);

const lines = [];
lines.push("# 词库扩充候选清单（Kelly 高频词表 × 现有词库 × SALDO/LEXIN 交叉核对）");
lines.push("");
lines.push("**这是只读分析结果，没有改动数据库或调用任何 AI。三份词表资源的使用方式：**");
lines.push("- **Kelly**：作为主要的收词优先级来源（CC-BY-SA 3.0 / 下载版 CC-BY 4.0，可用，需署名）");
lines.push("- **SALDO**：只用于交叉确认某个候选词是否是真实存在的瑞典语词目（CC-BY 4.0，可用，需署名）");
lines.push("- **LEXIN**：只用于覆盖校验（是否已被这本词典收录），**没有读取或使用其释义/例句内容**，因其许可证明确禁止电子形式再发布");
lines.push("");
lines.push("⚠️ **重要限制说明**：本次拿到的 `saldo.xml` 只包含每个词目的 `paradigm`（变形范式代码，例如 `vb_4a_dricka`），不包含展开后的具体屈折形式（如 sprang/sprungit）——完整展开需要 SALDO 单独的形态学组件，这次下载的文件里没有。因此下面「疑似是词形变化」的判断，用的是简单的后缀剥离启发式，**不是精确的形态分析**，仅供人工复核参考，没有自动剔除任何词。");
lines.push("");
lines.push("## 一、总体数字");
lines.push("");
lines.push(`- 现有词库（\`learning_objects\`）：${existingRows.length} 条，去重后 ${existingSet.size} 个不同词形`);
lines.push(`- Kelly 高频词表：${kellyItems.length} 条`);
lines.push(`- 其中已经在现有词库里：${alreadyCovered.length} 条（${((alreadyCovered.length / kellyItems.length) * 100).toFixed(1)}%）`);
lines.push(`- 真正缺失、值得收录的新词候选：**${newCandidates.length} 条**`);
lines.push(`- 启发式判断「疑似是已有词的屈折变化，不建议直接当新词」，需人工确认：${flaggedAsInflection.length} 条`);
lines.push("");
lines.push("## 二、新词候选按 CEFR 等级分布");
lines.push("");
lines.push("| 等级 | 数量 |");
lines.push("|---|---|");
for (const level of cefrOrder) {
  lines.push(`| ${level} | ${newByCefr.counts[level]} |`);
}
if (newByCefr.other) lines.push(`| 未标级 | ${newByCefr.other} |`);
lines.push("");
lines.push("## 三、新词候选清单（按 Kelly 原始顺序=频率优先级排列）");
lines.push("");
lines.push("| Kelly ID | 词 | CEFR | 词性(Kelly) | SALDO确认 | LEXIN也收录 |");
lines.push("|---|---|---|---|---|---|");
for (const item of newCandidates) {
  lines.push(
    `| ${item.id} | ${item.lemma} | ${item.cefr} | ${item.wordClass} | ${item.confirmedBySaldo ? "✓" : ""} | ${item.confirmedByLexin ? "✓" : ""} |`
  );
}
lines.push("");
lines.push("## 四、疑似屈折变化，建议人工确认后再决定（不建议直接当新词收录）");
lines.push("");
lines.push("| 词 | CEFR | 词性(Kelly) | 猜测词根 | 词根是否已在词库/SALDO |");
lines.push("|---|---|---|---|---|");
for (const item of flaggedAsInflection) {
  const baseKnown = existingSet.has(item.likelyBaseForm) ? "已在词库" : "仅SALDO";
  lines.push(`| ${item.lemma} | ${item.cefr} | ${item.wordClass} | ${item.likelyBaseForm} | ${baseKnown} |`);
}
lines.push("");

const outMd = new URL("../Reviews/词库扩充候选清单.md", import.meta.url);
writeFileSync(outMd, lines.join("\n"), "utf8");
console.error(`Written: ${decodeURIComponent(outMd.pathname)}`);

const outJson = new URL("../Reviews/词库扩充候选清单.json", import.meta.url);
writeFileSync(
  outJson,
  JSON.stringify({ newCandidates, flaggedAsInflection, alreadyCoveredCount: alreadyCovered.length }, null, 2),
  "utf8"
);
console.error(`Written: ${decodeURIComponent(outJson.pathname)}`);
