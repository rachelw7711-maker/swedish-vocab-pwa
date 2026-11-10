// Round G (2026-11-11), READ-ONLY: the public cards nothing has verified (verification_status
// unverified) — whether SALDO / Lexin know the word or expression, whether the headword is an
// inflected form, and how many readers saved each. → data/reports/round-g/unverified-public-triage.json
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { useSaldoFiles, saldoEntries, saldoHasExpression, lemmatize } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries, expressionInReferences } from "../server-references.mjs";
await useSaldoFiles(); await useReferenceFiles("data/reference");
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ids = readFileSync("data/reports/round-g/unverified-public-ids.txt", "utf8").match(/[0-9a-f-]{36}/g);
const rows = [];
for (let i = 0; i < ids.length; i += 100) { const { data } = await db.from("learning_objects").select("id, swedish, part_of_speech, object_type, status, source").in("id", ids.slice(i, i + 100)); rows.push(...data); }
const { count: dummy } = { count: 0 };
const out = [];
for (const r of rows) {
  const w = r.swedish.trim();
  const saldo = (await saldoEntries(null, w)).length > 0;
  const saldoExpr = w.includes(" ") ? await saldoHasExpression(null, [w]) : false;
  const refs = await referenceEntries(null, w);
  const lexin = (refs.lexin_sv || []).length + (refs.lexin_en || []).length > 0;
  const inRefs = w.includes(" ") ? await expressionInReferences(null, w).catch(() => null) : null;
  const lem = (await lemmatize(null, w.toLowerCase())).filter((x) => x.lemma.toLowerCase() !== w.toLowerCase()).map((x) => x.lemma);
  const users = (await db.from("user_words").select("user_id", { count: "exact", head: true }).eq("word_id", r.id)).count;
  out.push({ ...r, saldo, saldoExpr, lexin, // An empty hit list is "not listed" (it counted as listed: 157 reported, 8 real — round G).
    inRefs: inRefs ? inRefs.length > 0 : null, lemmaOf: lem[0] || null, users });
}
writeFileSync("data/reports/round-g/unverified-public-triage.json", JSON.stringify(out, null, 1));
const c = (f) => out.filter(f).length;
console.log({ all: out.length, saldoOrLexinWord: c((x) => !x.swedish.includes(" ") && (x.saldo || x.lexin)), expressionListed: c((x) => x.swedish.includes(" ") && (x.saldoExpr || x.lexin || x.inRefs)), inflectedForm: c((x) => x.lemmaOf), savedByUsers: c((x) => x.users > 0), usersTotal: out.reduce((a, x) => a + (x.users || 0), 0) });
