// Loaded first by test files whose imports read the OpenAI key at load time.
process.env.OPENAI_API_KEY ||= "test";
process.env.WIKTIONARY_RETRY_PAUSE_MS ||= "0";
