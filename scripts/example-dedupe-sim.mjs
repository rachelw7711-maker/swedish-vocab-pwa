// Round G, ledger 7.1: plain examples that repeat a collocation's example (code
// example_repeats_collocation_example), READ-ONLY simulation. The collocation keeps the sentence;
// the plain copy can go only when the card keeps another plain example (never the last one —
// the generation rule of 2026-11-09, server-language-checks). Writes the list and SQL for approval.
//   node --env-file=.env scripts/example-dedupe-sim.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const hits = new Map();
for (const l of readFileSync("data/reports/round-g/baseline-audit.ndjson", "utf8").split("\n")) {
  if (!l) continue;
  const r = JSON.parse(l);
  for (const f of r.findings) if (f.code === "example_repeats_collocation_example") (hits.get(r.id) || hits.set(r.id, { swedish: r.swedish, status: r.status, dup: [] }).get(r.id)).dup.push(f.example);
}
const ids = [...hits.keys()];
const rows = [], tally = { removable: 0, last_example: 0, main_example: 0 };
for (let i = 0; i < ids.length; i += 100) {
  const part = ids.slice(i, i + 100);
  const { data: lo } = await db.from("learning_objects").select("id, example_sv").in("id", part);
  const { data: ex } = await db.from("learning_object_examples").select("id, learning_object_id, example_swedish, sort_order").in("learning_object_id", part);
  for (const id of part) {
    const h = hits.get(id), main = (lo.find((o) => o.id === id)?.example_sv || "").trim();
    const list = ex.filter((e) => e.learning_object_id === id).sort((a, b) => a.sort_order - b.sort_order);
    const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
    for (const d of h.dup) {
      const row = list.find((e) => same(e.example_swedish, d));
      const others = list.filter((e) => !h.dup.some((x) => same(e.example_swedish, x)));
      const isMain = same(main, d);
      const action = !row ? "main_only" : isMain ? "main_example" : others.length ? "removable" : "last_example";
      tally[action] = (tally[action] || 0) + 1;
      rows.push({ id, swedish: h.swedish, status: h.status, example: d, exampleRowId: row?.id || null, isMain, othersLeft: others.length, action });
    }
  }
}
writeFileSync("data/reports/round-g/example-dedupe-sim.json", JSON.stringify({ note: "simulation — nothing written", tally, rows }, null, 1));
console.log({ cards: ids.length, tally });
