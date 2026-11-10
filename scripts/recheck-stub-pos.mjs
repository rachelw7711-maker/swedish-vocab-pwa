// Round G (2026-11-11), rule fix F3: a card whose part of speech is "verified" by the dictionaries,
// re-checked now that a Lexin cross-reference stub ("gjord, verb" → göra) lists nothing. Zero AI,
// read-only: lists the cards whose families are now empty (their pos evidence was only a stub).
//   node --env-file=.env scripts/recheck-stub-pos.mjs
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ordered } from "./page-order.mjs";
import { useSaldoFiles, saldoEntries, compoundRows, participleRows } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries, posFamilies } from "../server-references.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });
const rows = [];
for (let i = 0; ; i += 1000) {
  const { data, error } = await ordered(db.from("resource_field_status").select("learning_object_id, source").eq("field", "pos").eq("status", "verified").like("source", "references:%"), "resource_field_status").range(i, i + 999);
  if (error) throw error;
  rows.push(...data); if (data.length < 1000) break;
}
const lexinOnly = rows.filter((r) => /^references:lexin$/.test(r.source) || r.source === "references:lexin+wiktionary" || r.source === "references:wiktionary+lexin");
const out = [];
for (let i = 0; i < lexinOnly.length; i += 150) {
  const { data } = await db.from("learning_objects").select("id, swedish, part_of_speech, object_type, status").in("id", lexinOnly.slice(i, i + 150).map((r) => r.learning_object_id));
  for (const c of data) {
    if (c.object_type !== "word" || /\s/.test(c.swedish)) continue;
    const fam = posFamilies(await referenceEntries(null, c.swedish), c.part_of_speech);
    if (fam.includes("lexin")) continue;
    const saldo = (await saldoEntries(null, c.swedish, c.part_of_speech)).length || (await compoundRows(null, c.swedish, c.part_of_speech)).length || (/particip/.test(c.part_of_speech) && (await participleRows(null, c.swedish, c.part_of_speech)).length);
    out.push({ id: c.id, swedish: c.swedish, pos: c.part_of_speech, status: c.status, nowFamilies: fam, saldo: Boolean(saldo) });
  }
}
writeFileSync("data/reports/round-g/stub-pos-recheck.json", JSON.stringify(out, null, 1));
console.log({ lexinBacked: lexinOnly.length, stubOnly: out.length, list: out.map((x) => `${x.swedish}/${x.pos}/${x.status}${x.saldo ? " (SALDO has it)" : ""}`) });

// --apply: those cards' pos goes back to "present" (the stub shows a form of another word, not a
// headword of this part of speech), archived (reason round_g_stub_pos); statuses recomputed.
if (process.argv.includes("--apply") && out.length) {
  const { randomUUID } = await import("node:crypto");
  const batch = randomUUID();
  const prev = (await db.from("resource_field_status").select("learning_object_id, source, detail").eq("field", "pos").in("learning_object_id", out.map((x) => x.id))).data;
  const ins = await db.from("content_audit_archive").insert(prev.map((p) => ({ batch_id: batch, learning_object_id: p.learning_object_id, table_name: "resource_field_status", field: "pos", old_value: JSON.stringify({ status: "verified", source: p.source, detail: p.detail }), new_value: "present", reason: "round_g_stub_pos" })));
  if (ins.error) throw ins.error;
  for (const x of out) {
    const { error } = await db.from("resource_field_status").update({ status: "present", detail: { f3: "Lexin lists it only as a cross-reference to another headword (a form), not as this part of speech", round: "G 2026-11-11" }, updated_at: new Date().toISOString() }).eq("learning_object_id", x.id).eq("field", "pos").eq("status", "verified");
    if (error) throw error;
  }
  const { error } = await db.rpc("refresh_resource_summary", { p_ids: out.map((x) => x.id) });
  if (error) throw error;
  console.log({ batch, downgraded: out.length });
}
