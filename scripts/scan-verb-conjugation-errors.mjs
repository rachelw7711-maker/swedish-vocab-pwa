import "dotenv/config";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Read-only audit. Does not modify public.learning_objects or any other
// table. Full-scan follow-up to the spot-check that found the bug: a
// systematic mis-generation where group-1 weak verbs (infinitive ends in
// -a, standard conjugation stem+ar/stem+ade/stem+at) got group-2/3-style
// endings appended directly to the consonant-ending stem instead — e.g.
// "fatta" -> correct "fattar/fattade/fattat" but stored as "fattr/fattde/
// fattt" (the -a that should precede r/de/t is simply missing).
//
// Detection is deliberately narrow and rule-based, not a full Swedish verb
// classifier: it only flags the ONE specific, mechanically-checkable
// signature above (see isBuggyPresens below), because that pattern is
// phonotactically implausible in real Swedish regardless of verb group —
// there's no legitimate conjugation that appends bare "r" straight onto a
// consonant cluster with no vowel. This avoids false-flagging the many
// verb groups where "-er"/"-de"/"-t" directly on a consonant IS correct
// (e.g. group 2a "ringa" -> "ringer/ringde/ringt" is fine and untouched).

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function clean(v) {
  return String(v || "").trim();
}

// Mirrors app.js/src/lib/db.js's readNoteSection: structured forms/etc. now
// have real columns (added by the Phase 1 migration), but most existing
// verb rows haven't been individually re-saved since, so their forms text
// still lives packed inside the legacy `note` field as a labeled section.
function readNoteSection(note, label) {
  const text = clean(note);
  if (!text) return "";
  const pattern = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\n[A-Z][^\\n:]+:|$)`);
  return clean(text.match(pattern)?.[1]);
}

function extractForms(row) {
  const raw = clean(row.forms) || readNoteSection(row.note, "Forms");
  if (!raw) return null;
  const fields = {};
  for (const part of raw.split(/[;\n]+/)) {
    const [rawLabel, ...rest] = part.split(":");
    if (!rest.length) continue;
    fields[clean(rawLabel).toLowerCase()] = clean(rest.join(":"));
  }
  return {
    infinitiv: fields["infinitiv"] || "",
    presens: fields["presens"] || "",
    preteritum: fields["preteritum"] || "",
    supinum: fields["supinum"] || "",
  };
}

// The specific, narrow bug signature: presens ends in a consonant
// immediately followed by "r", with no vowel between — not "-ar"/"-er"
// (both legitimate) and not a vowel+"r" (also legitimate, e.g. "bor").
const VOWELS = "aeiouyåäö";
function isBuggyPresensEnding(presens) {
  if (presens.length < 2) return false;
  if (!presens.endsWith("r")) return false;
  if (/(ar|er)$/.test(presens)) return false;
  const beforeR = presens[presens.length - 2].toLowerCase();
  return !VOWELS.includes(beforeR);
}

function suggestFix(infinitiv, preteritum, supinum) {
  if (!infinitiv.toLowerCase().endsWith("a")) return null;
  const stem = infinitiv.slice(0, -1);
  const suggestion = {
    presens: `${stem}ar`,
    preteritum: preteritum,
    supinum: supinum,
  };
  // Only propose fixing preteritum/supinum if they show the SAME truncation
  // signature (stem+de / stem+t with no "a") — otherwise leave as-is rather
  // than risk overwriting a legitimately different (e.g. strong-verb) form.
  if (preteritum.toLowerCase() === `${stem}de`.toLowerCase()) {
    suggestion.preteritum = `${stem}ade`;
  }
  if (supinum.toLowerCase() === `${stem}t`.toLowerCase()) {
    suggestion.supinum = `${stem}at`;
  }
  return suggestion;
}

async function fetchAllVerbs() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase
      .from("learning_objects")
      .select("id, swedish, forms, note")
      .eq("part_of_speech", "verb")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Supabase fetch failed: ${JSON.stringify(error)}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

const rows = await fetchAllVerbs();
console.log(`Scanned ${rows.length} verb rows.`);

let parsedCount = 0;
const flagged = [];
for (const row of rows) {
  const forms = extractForms(row);
  if (!forms || !forms.presens || !forms.infinitiv) continue;
  parsedCount += 1;
  if (isBuggyPresensEnding(forms.presens)) {
    const suggestion = suggestFix(forms.infinitiv, forms.preteritum, forms.supinum);
    flagged.push({ ...row, forms, suggestion });
  }
}

console.log(`Rows with parseable forms: ${parsedCount}`);
console.log(`Flagged as likely conjugation errors: ${flagged.length} (${((flagged.length / parsedCount) * 100).toFixed(1)}% of parseable verbs)`);

flagged.sort((a, b) => a.swedish.localeCompare(b.swedish, "sv"));

const lines = [];
lines.push("# 疑似动词变位错误清单");
lines.push("");
lines.push("**只读扫描结果，没有改动任何数据库内容。** 检测规则很窄：只标记「presens 以辅音直接加 r 结尾（不是 -ar/-er，且 r 前面不是元音）」这一种具体、机械可判断的错误signature——这种拼写在瑞典语里不存在于任何一个动词变位组，不会跟合法的第二变位组（如 ringa→ringer）混淆，所以误报率应该很低，但列出的\"建议修正值\"仍需要人工确认后再批量执行，脚本本身不做任何修改。");
lines.push("");
lines.push(`扫描时间：${new Date().toISOString()}`);
lines.push(`扫描范围：\`part_of_speech = 'verb'\` 的全部 ${rows.length} 条`);
lines.push(`其中能解析出 presens/infinitiv 的：${parsedCount} 条`);
lines.push(`命中疑似错误：**${flagged.length} 条**（占可解析动词的 ${((flagged.length / parsedCount) * 100).toFixed(1)}%）`);
lines.push("");
lines.push("## 清单");
lines.push("");
lines.push("| 单词 | 现在存的（错） | 建议修正为 | learning_object id |");
lines.push("|---|---|---|---|");
for (const item of flagged) {
  const current = `${item.forms.infinitiv} / ${item.forms.presens} / ${item.forms.preteritum} / ${item.forms.supinum}`;
  const fixed = item.suggestion
    ? `${item.forms.infinitiv} / ${item.suggestion.presens} / ${item.suggestion.preteritum} / ${item.suggestion.supinum}`
    : "（无法确定，需人工核对）";
  lines.push(`| ${item.swedish} | ${current} | ${fixed} | \`${item.id}\` |`);
}
lines.push("");
lines.push("## 修复方案建议");
lines.push("");
lines.push("这批错误集中在「第一变位组动词（不定式以 -a 结尾，标准规则是词干+ar/ade/at）被误按其他变位组规则生成」，属于系统性、可用固定规则批量修正的错误，**不需要逐词调用 AI 重新生成**：");
lines.push("");
lines.push("1. 人工过一遍上面的清单，确认「建议修正为」这一列是对的（尤其是清单里标注\"无法确定\"的那些，需要单独核对，通常是因为 preteritum/supinum 没有呈现出同样规律的截断，可能是别的原因导致的错误，不属于这次要修的这类 bug）。");
lines.push("2. 确认后，写一个只更新这批 id 的 SQL/脚本，把 `forms` 字段（以及以后回填到 `word_forms` 结构化表时）替换成建议值，同时更新 `note` 里的对应文本，保持两处一致。");
lines.push("3. 建议同时把这批词的 `status` 标记一下（比如加个 tag 或 source note），方便追溯这次批量修正的记录。");
lines.push("");

const outPath = new URL("../Reviews/待复核-疑似动词变位错误清单.md", import.meta.url);
writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`Written: ${decodeURIComponent(outPath.pathname)}`);
