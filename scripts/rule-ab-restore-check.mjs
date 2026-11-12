// Round G: after a rule-ab rollback, checks every card of the batch is back to its exact meanings and nothing withheld is left.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const cards = JSON.parse(readFileSync("data/reports/round-g/rule-ab-A.json", "utf8")).cards.filter((c) => c.items?.length && c.zhText);
const ids = (await db.from("content_audit_archive").select("learning_object_id").eq("batch_id", process.argv[2]).eq("field", "zh")).data.map((r) => r.learning_object_id);
let same = 0, diff = [];
for (const id of ids) { const c = cards.find((x) => x.id === id); const t = Object.fromEntries((await db.from("learning_object_translations").select("native_language, meaning").eq("learning_object_id", id)).data.map((x) => [x.native_language, x.meaning]));
  if (t.en === c.en && t.zh === c.zhText) same++; else diff.push(c.swedish); }
const w = (await db.from("content_withheld").select("id").in("learning_object_id", ids)).data.length;
console.log({ restoredExactly: same, of: ids.length, diff, withheldLeft: w });
