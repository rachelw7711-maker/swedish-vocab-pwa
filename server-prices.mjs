// Prices for the cost estimate in ai_usage_logs (2026-11-09). One place, with a version recorded on
// every row, so a later price change never rewrites what earlier rows meant. These are list prices:
// the estimate is metered usage × price, not the provider's bill (free tiers, credits and discounts
// are not known here).
//   OpenAI gpt-5.4-mini: USD per 1M tokens — input, cached input, output.
//   Azure Speech, swedencentral (prices.azure.com retail API, 2026-11-09): Neural TTS 15 USD per
//   1M characters; speech to text 1.00 USD per audio hour, pronunciation assessment adds 0.30.
//   ElevenLabs is a subscription with character credits (the fallback voice only): characters are
//   recorded, no USD.
export const PRICE_VERSION = "2026-11-09";
// gpt-6.1-terra: round G script batches only (2026-11-11, owner-approved, 12 USD cap); production
// generation stays on gpt-5.4-mini. Official price page, as in round-f/ai-cost-audit-2026-11-09.md.
const OPENAI = { "gpt-5.4-mini": { input: 0.75, cached: 0.075, output: 4.5 }, "gpt-6.1-terra": { input: 1.0, cached: 0.05, output: 5.0 } };
const AZURE_TTS_PER_CHAR = 15 / 1e6;
const AZURE_ASSESSMENT_PER_HOUR = 1.0 + 0.3;

// A Responses API usage object → tokens and USD (cached input tokens at their own price).
export function openaiCost(usage = {}, model = "gpt-5.4-mini") {
  const p = OPENAI[model] || OPENAI["gpt-5.4-mini"];
  const input = usage.input_tokens || 0, output = usage.output_tokens || 0;
  const cached = Math.min(input, usage.input_tokens_details?.cached_tokens || 0);
  return { input, output, cached, cost: ((input - cached) * p.input + cached * p.cached + output * p.output) / 1e6 };
}

// Azure bills the text's characters (SSML markup is not counted).
export function ttsCost(provider, characters) {
  return provider === "azure-speech" ? characters * AZURE_TTS_PER_CHAR : 0;
}

export function assessmentCost(seconds) {
  return (seconds / 3600) * AZURE_ASSESSMENT_PER_HOUR;
}

// Who caused a call: a signed-in user, the server for no one (an anonymous request, a cache
// fill), or a script run by hand (a batch job).
export function usageSource(userId) {
  return userId ? "user" : process.env.VERCEL ? "server" : "script";
}
