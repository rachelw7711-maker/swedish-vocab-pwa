import "./env-test.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { parseSwedishSection, formsFromTable, lookupWiktionary, wiktionaryReadings, clearWiktionaryMemory } from "../server-wiktionary.mjs";

const TORKA = `==Svenska==
===Substantiv===
{{sv-subst-n-or|fog=}}
'''torka'''
#det att [[växtlighet]]en [[#Verb|torka]]r under torra, regnfria tidperioder
#:{{sammansättningar|[[idétorka]]}}

====Översättningar====
{{ö-topp|}}
*engelska: {{ö+|en|dry spell}}, {{ö+|en|drought}}
{{ö-botten}}

===Verb===
{{sv-verb-ar|rot=tork|perfpart=}}
'''torka'''
#(''intransitivt'') bli [[torr]](are); [[vissna]]
#:''Hyllan står och '''torkar'''.''
#(''transitivt'') få eller göra eller låta bli torr
{{ö-topp|bli torr}}
*engelska: {{ö+|en|dry}}
{{ö-botten}}

==Finska==
===Verb===
'''torka'''
#something else`;

test("Wiktionary: each part of speech and each sense kept apart, other languages ignored", () => {
  const { entries } = parseSwedishSection(TORKA);
  assert.deepEqual(entries.map((e) => e.pos), ["noun", "verb"]);
  assert.equal(entries[0].senses.length, 1);
  assert.match(entries[0].senses[0].text, /^det att växtligheten torkar under torra/);
  assert.deepEqual(entries[0].english, [["dry spell", "drought"]]);
  assert.equal(entries[1].senses.length, 2);
  assert.equal(entries[1].senses[0].text, "(intransitivt) bli torr(are); vissna");
  assert.deepEqual(entries[1].senses[0].examples, ["Hyllan står och torkar."]);
  assert.equal(entries[1].inflection, "{{sv-verb-ar|rot=tork|perfpart=}}");
});

test("Wiktionary: a page for an inflected form points to its lemma", () => {
  const { entries } = parseSwedishSection("==Svenska==\n===Substantiv===\n'''torkar'''\n#{{böjning|sv|subst|tork}}\n\n===Verb===\n'''torkar'''\n#{{böjning|sv|verb|torka}}");
  assert.deepEqual(wiktionaryReadings({ status: "found", word: "torkar", entries }), [
    { pos: "noun", lemma: "tork", form: true }, { pos: "verb", lemma: "torka", form: true },
  ]);
});

test("Wiktionary: forms are read from the expanded inflection table", () => {
  const table = `|<span class="b-0">[[torka]]</span>\n|<span class="b-">[[torkan]]</span>\n|<span class="b-">[[torkor]]</span>`;
  assert.deepEqual(formsFromTable(table), ["torka", "torkan", "torkor"]);
});

const reply = (body, ok = true, status = 200) => async () => ({ ok, status, json: async () => body });

test("Wiktionary: a missing page, a timeout, a server error and an unreadable page are reported, never guessed", async () => {
  clearWiktionaryMemory();
  assert.equal((await lookupWiktionary(null, "finnsinte", { fetchImpl: reply({ error: { code: "missingtitle" } }) })).status, "missing");
  const timeout = async (_url, { signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
  const slow = await lookupWiktionary(null, "långsam", { fetchImpl: timeout });
  assert.equal(slow.status, "timeout");
  assert.equal((await lookupWiktionary(null, "fel", { fetchImpl: reply({}, false, 503) })).status, "error");
  assert.equal((await lookupWiktionary(null, "utansvenska", { fetchImpl: reply({ parse: { wikitext: "==Engelska==\n===Verb===\n#x" } }) })).status, "missing");
  assert.equal((await lookupWiktionary(null, "natfel", { fetchImpl: async () => { throw new TypeError("fetch failed"); } })).status, "error");
  // A timeout is not cached: the next lookup asks again.
  assert.equal((await lookupWiktionary(null, "långsam", { fetchImpl: reply({ parse: { wikitext: TORKA } }) })).status, "found");
});

test("Wiktionary: a passing failure (timeout, 503, 429) is asked once more; a 404 is not", async () => {
  clearWiktionaryMemory();
  let calls = 0;
  const flaky = async () => (++calls === 1 ? { ok: false, status: 503, json: async () => ({}) } : { ok: true, json: async () => ({ parse: { wikitext: TORKA } }) });
  assert.equal((await lookupWiktionary(null, "omigen", { fetchImpl: flaky })).status, "found");
  assert.equal(calls, 2);
  calls = 0;
  const gone = async () => { calls++; return { ok: false, status: 404, json: async () => ({}) }; };
  assert.equal((await lookupWiktionary(null, "borta", { fetchImpl: gone })).status, "error");
  assert.equal(calls, 1);
});
