// Takes reviewed expressions out of the shared lists (2026-11-09): shown reading expressions the
// reviewer found wrong (an unrelated example, a wrong meaning, a misspelled headword) or no
// expression to learn (a free combination, an inflected piece of the text). They become drafts —
// still opened and studied from the reading that found them, out of Fasta fraser / Idiomatiska
// uttryck — never deleted. Only rows still ai_generated change; backup and rollback first.
//   node --env-file=.env scripts/hide-reviewed-expressions.mjs <json> [--write]
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
const WRITE = process.argv.includes("--write");
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const list = JSON.parse(readFileSync(process.argv[2], "utf8"));
const { data: rows, error } = await db.from("learning_objects").select("id, swedish, status, updated_at").in("id", list.map((x) => x.id));
if (error) throw error;
const ready = rows.filter((r) => r.status === "ai_generated").slice(0, 50);
console.log(`listed ${list.length}, still shown ${ready.length}, already draft ${rows.filter((r) => r.status === "draft").length}`);
if (!WRITE || !ready.length) process.exit(0);
const base = `data/reports/round-e/hide-expressions-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
writeFileSync(`${base}.json`, JSON.stringify(ready.map((r) => ({ ...r, why: list.find((x) => x.id === r.id)?.why })), null, 1));
writeFileSync(`${base}-rollback.sql`, ["begin;", ...ready.map((r) => `update public.learning_objects set status = 'ai_generated', updated_at = ${q(r.updated_at)} where id = ${q(r.id)} and status = 'draft';`), "commit;"].join("\n") + "\n");
const { error: e } = await db.from("learning_objects").update({ status: "draft", updated_at: new Date().toISOString() }).in("id", ready.map((r) => r.id)).eq("status", "ai_generated");
if (e) throw e;
const { data: back } = await db.from("learning_objects").select("id, status").in("id", ready.map((r) => r.id));
console.log(`written ${ready.length}, read back draft ${back.filter((b) => b.status === "draft").length}; backup and rollback ${base}*`);
