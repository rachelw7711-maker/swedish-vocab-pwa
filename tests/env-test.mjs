// Loaded first by test files whose imports read the OpenAI key at load time.
process.env.OPENAI_API_KEY ||= "test";
process.env.WIKTIONARY_RETRY_PAUSE_MS ||= "0";
process.env.KORP_OFFLINE ||= "1";   // no Korp in tests: the corpus decides nothing unless a test passes its own
