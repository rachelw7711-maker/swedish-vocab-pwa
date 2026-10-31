// Loads the local SALDO index (scripts/build-saldo-index.mjs) into
// public.saldo_lemmas / public.saldo_wordforms through the service role
// (2026-10-31). Replaces the tables' contents; needs migration 20261031130000.
//
//   node --env-file=.env scripts/load-saldo.mjs [dir=data/reference/saldo]
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const dir = process.argv[2] || "data/reference/saldo";
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const rows = (file) => readFileSync(`${dir}/${file}`, "utf8").trim().split("\n").map((l) => l.split("\t"));
const must = ({ error }) => { if (error) throw error; };

async function insertAll(table, list, chunk = 2000) {
  for (let i = 0; i < list.length; i += chunk) {
    for (let attempt = 1; ; attempt++) {
      const { error } = await db.from(table).upsert(list.slice(i, i + chunk), { ignoreDuplicates: true });
      if (!error) break;
      if (attempt === 3) throw error;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
    if ((i / chunk) % 50 === 0) console.log(table, i, "/", list.length);
  }
}

must(await db.from("saldo_wordforms").delete().gte("lemma_id", 0));
must(await db.from("saldo_lemmas").delete().gte("id", 0));
await insertAll("saldo_lemmas", rows("saldo-lemmas.tsv").map(([id, lemgram, baseform, pos, paradigm, forms]) =>
  ({ id: Number(id), lemgram, baseform, pos, paradigm, forms: JSON.parse(forms) })), 1000);
await insertAll("saldo_wordforms", rows("saldo-wordforms.tsv").map(([form, id]) => ({ form, lemma_id: Number(id) })));
const { count } = await db.from("saldo_lemmas").select("id", { count: "exact", head: true });
console.log("loaded", count, "lemmas");
