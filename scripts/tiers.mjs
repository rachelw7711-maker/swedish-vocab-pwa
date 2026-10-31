// Admin: move verified extended entries to the basic tier, by batch (2026-10-31).
// Only the tier changes — ids, learning records, favourites and article links
// stay as they are. Every promotion is logged in tier_changes and can be undone
// per batch.
//
//   node --env-file=.env scripts/tiers.mjs preview  [selection] [--allow-incomplete]
//   node --env-file=.env scripts/tiers.mjs promote  [selection] [--allow-incomplete] --note "…" --yes
//   node --env-file=.env scripts/tiers.mjs revert   --batch <batch id> --yes
//   node --env-file=.env scripts/tiers.mjs batches
//
// selection: --ids id1,id2 | --file ids.txt | --origin ai_reading,reading_expression [--type word|phrase|expression]
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const [command, ...rest] = process.argv.slice(2);
const opt = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : null; };
const flag = (n) => rest.includes(n);
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

async function selection() {
  if (opt("--ids")) return opt("--ids").split(",");
  if (opt("--file")) return readFileSync(opt("--file"), "utf8").split(/\s+/).filter(Boolean);
  if (!opt("--origin")) throw new Error("choose entries with --ids, --file or --origin");
  let ids = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from("learning_objects").select("id").eq("access_tier", "extended").in("content_origin", opt("--origin").split(","));
    if (opt("--type")) q = q.eq("object_type", opt("--type"));
    const data = must(await q.order("id").range(from, from + 999));
    ids = ids.concat(data.map((r) => r.id));
    if (data.length < 1000) return ids;
  }
}

async function preview(ids) {
  let rows = [];
  for (let i = 0; i < ids.length; i += 500) {
    rows = rows.concat(must(await db.rpc("preview_tier_promotion", { p_ids: ids.slice(i, i + 500), p_require_complete: !flag("--allow-incomplete") })));
  }
  const reasons = {};
  rows.forEach((r) => { const k = r.eligible ? "ok" : r.reason.replace(/:.*/, ""); reasons[k] = (reasons[k] || 0) + 1; });
  mkdirSync("data/reports", { recursive: true });
  writeFileSync("data/reports/tier-preview.json", JSON.stringify(rows, null, 1));
  console.log(JSON.stringify({ selected: ids.length, eligible: rows.filter((r) => r.eligible).length, reasons, detail: "data/reports/tier-preview.json" }, null, 1));
  return rows;
}

if (command === "preview") await preview(await selection());
else if (command === "promote") {
  const rows = await preview(await selection());
  const eligible = rows.filter((r) => r.eligible).map((r) => r.id);
  if (!flag("--yes")) { console.log("dry run — add --yes to promote", eligible.length, "entries"); process.exit(0); }
  let batch = null;
  for (let i = 0; i < eligible.length; i += 500) {
    batch = must(await db.rpc("promote_to_basic", { p_ids: eligible.slice(i, i + 500), p_note: opt("--note") || "", p_require_complete: !flag("--allow-incomplete") }));
    console.log("batch", batch, "entries", Math.min(500, eligible.length - i));
  }
} else if (command === "revert") {
  if (!opt("--batch")) throw new Error("--batch <id> required");
  if (!flag("--yes")) { console.log("dry run — add --yes to revert batch", opt("--batch")); process.exit(0); }
  console.log("reverted", must(await db.rpc("revert_tier_batch", { p_batch: opt("--batch") })));
} else if (command === "batches") {
  const rows = must(await db.from("tier_changes").select("batch_id, changed_at, note, reverted_at").order("changed_at", { ascending: false }).limit(5000));
  const by = {};
  rows.forEach((r) => { (by[r.batch_id] ??= { changedAt: r.changed_at, note: r.note, entries: 0, reverted: 0 }).entries++; if (r.reverted_at) by[r.batch_id].reverted++; });
  console.log(JSON.stringify(by, null, 1));
} else {
  console.error("usage: tiers.mjs preview|promote|revert|batches …");
  process.exit(1);
}
