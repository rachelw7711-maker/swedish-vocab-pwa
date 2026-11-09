// Cost rows (2026-11-09): one price table, cached input at its own price, the price version and
// the source on every row, TTS logged by characters with a cache hit at no cost. No network.
import "./env-test.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
const { openaiCost, ttsCost, assessmentCost, PRICE_VERSION } = await import("../server-prices.mjs");
const { logUsage } = await import("../server-native.mjs");

const fakeDb = () => { const rows = []; return { rows, from: () => ({ insert: async (r) => { rows.push(r); return { error: null }; } }) }; };

test("openaiCost prices cached input tokens at the cached price", () => {
  const plain = openaiCost({ input_tokens: 1_000_000, output_tokens: 0 });
  const cached = openaiCost({ input_tokens: 1_000_000, output_tokens: 0, input_tokens_details: { cached_tokens: 800_000 } });
  assert.equal(plain.cost, 0.75);
  assert.equal(cached.cached, 800_000);
  assert.ok(Math.abs(cached.cost - (0.2 * 0.75 + 0.8 * 0.075)) < 1e-9);
  assert.equal(openaiCost({ input_tokens: 0, output_tokens: 1_000_000 }).cost, 4.5);
});

test("Azure TTS and assessment are priced by characters and audio time; ElevenLabs by credits (no USD)", () => {
  assert.equal(ttsCost("azure-speech", 1_000_000), 15);
  assert.equal(ttsCost("elevenlabs", 1000), 0);
  assert.ok(Math.abs(assessmentCost(3600) - 1.3) < 1e-9);
});

test("logUsage records tokens and cost from a usage object, with price version, source and details", async () => {
  const db = fakeDb();
  await logUsage(db, { userId: "u1", feature: "word_generate", model: "gpt-5.4-mini", usage: { input_tokens: 2000, output_tokens: 500, input_tokens_details: { cached_tokens: 1000 } }, details: { retry: true } });
  const [r] = db.rows;
  assert.equal(r.input_tokens, 2000);
  assert.ok(Math.abs(r.actual_cost - (1000 * 0.75 + 1000 * 0.075 + 500 * 4.5) / 1e6) < 1e-12);
  assert.deepEqual(r.details, { price_version: PRICE_VERSION, source: "user", cached_input_tokens: 1000, retry: true });
  await logUsage(db, { feature: "tts_word", model: "sv-SE-SofieNeural", cacheHit: true, details: { unit: "characters", units: 0 } });
  assert.equal(db.rows[1].actual_cost, 0);
  assert.equal(db.rows[1].cache_hit, true);
  assert.equal(db.rows[1].details.source, "script");
});
