// CI/local test runs never have a real OPENAI_API_KEY - several modules
// construct an OpenAI client at import time (config/openaiclient.ts,
// config/openai.ts), which throws before any test body even runs.
// Stub it here so importing those modules in tests never depends on a
// real secret; production startup (index.ts) is unaffected since this
// file is only loaded by jest.
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = "sk-test-000000000000000000000000000000000000000000000000";
}
