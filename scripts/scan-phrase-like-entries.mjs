import "dotenv/config";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Read-only audit. Does not modify public.learning_objects or any other
// table. Produces Reviews/待复核-疑似短语或整句的词条清单.md for human review,
// per the plan in Reviews/词条数据结构设计草案（母语支持+词形结构化+Fraser-Uttryck）.md
// section 四: heuristics only flag candidates, they never auto-decide.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SENTENCE_END_RE = /[.!?…]["')\]]?$/;
const MULTI_SPACE_COUNT = (s) => (s.match(/\s+/g) || []).length;

function classify(row) {
  const swedish = String(row.swedish || "").trim();
  const pos = String(row.part_of_speech || row.pos || "").trim();
  const wordCount = swedish.split(/\s+/).filter(Boolean).length;
  const reasons = [];

  if (pos === "phrase") {
    reasons.push("pos=phrase 但 object_type 仍是 word");
  }
  if (SENTENCE_END_RE.test(swedish) && wordCount >= 3) {
    reasons.push("以句末标点结尾且词数>=3，疑似整句");
  }
  if (wordCount >= 5) {
    reasons.push(`词数达 ${wordCount}，疑似短语/整句而非单词`);
  }
  if (MULTI_SPACE_COUNT(swedish) >= 4) {
    reasons.push("空格数量偏多");
  }
  // Starts with a capital mid-sentence-looking pattern followed by lowercase words + verb-like shape
  if (/^[A-ZÅÄÖ][a-zåäö]+\s+[a-zåäö]+\s+[a-zåäö]+/.test(swedish) && wordCount >= 4) {
    reasons.push("首字母大写+多个小写词，疑似句子开头");
  }

  return reasons;
}

async function fetchAll() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase
      .from("learning_objects")
      .select("id, swedish, part_of_speech, object_type, notebook")
      .eq("object_type", "word")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Supabase fetch failed: ${JSON.stringify(error)}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

const rows = await fetchAll();
console.log(`Scanned ${rows.length} object_type='word' rows.`);

const flagged = [];
for (const row of rows) {
  const reasons = classify(row);
  if (reasons.length) flagged.push({ ...row, reasons });
}

flagged.sort((a, b) => b.reasons.length - a.reasons.length || a.swedish.localeCompare(b.swedish, "sv"));

console.log(`Flagged ${flagged.length} candidates (${((flagged.length / rows.length) * 100).toFixed(1)}%).`);

const lines = [];
lines.push("# 待复核：疑似短语或整句的词条清单");
lines.push("");
lines.push("**这是只读扫描结果，没有改动任何数据库内容。以下条目按启发式规则标记为「疑似不是单个单词」，需要人工确认后才能改 `object_type`（id 不变，用户收藏关系不受影响）。**");
lines.push("");
lines.push(`扫描时间：${new Date().toISOString()}`);
lines.push(`扫描范围：\`object_type = 'word'\` 的全部 ${rows.length} 条`);
lines.push(`命中：${flagged.length} 条（${((flagged.length / rows.length) * 100).toFixed(1)}%）`);
lines.push("");
lines.push("| swedish | pos | notebook | 命中原因 | learning_object id |");
lines.push("|---|---|---|---|---|");
for (const row of flagged) {
  lines.push(
    `| ${row.swedish.replace(/\|/g, "\\|")} | ${row.part_of_speech || ""} | ${row.notebook || ""} | ${row.reasons.join("；")} | \`${row.id}\` |`
  );
}
lines.push("");

const outPath = new URL("../Reviews/待复核-疑似短语或整句的词条清单.md", import.meta.url);
writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`Written: ${outPath.pathname}`);
