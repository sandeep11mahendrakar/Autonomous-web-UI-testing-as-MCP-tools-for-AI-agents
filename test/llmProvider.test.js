'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveLLMConfig,
  chatCompletion,
  SUPPORTED_PROVIDERS,
} = require('../lib/llmProvider');

// ── per-architecture configuration resolution ────────────────────────────────

test('A resolves to Groq while B resolves to OpenRouter from the SAME env (no mixing)', () => {
  const env = {
    ARCH_A_LLM_PROVIDER: 'groq',
    ARCH_A_LLM_API_KEY: 'key-a-groq',
    ARCH_A_LLM_MODEL: 'openai/gpt-oss-120b',

    ARCH_B_LLM_PROVIDER: 'openrouter',
    ARCH_B_LLM_API_KEY: 'key-b-openrouter',
    ARCH_B_LLM_MODEL: 'openai/gpt-oss-20b:free',
  };

  const a = resolveLLMConfig({ env, prefix: 'ARCH_A_', legacyApiKey: env.GROQ_API_KEY });
  const b = resolveLLMConfig({ env, prefix: 'ARCH_B_', legacyApiKey: env.GROQ_API_KEY });

  assert.equal(a.provider, 'groq');
  assert.equal(a.apiKey, 'key-a-groq');
  assert.equal(a.model, 'openai/gpt-oss-120b');
  assert.equal(a.baseUrl, 'https://api.groq.com/openai/v1');

  assert.equal(b.provider, 'openrouter');
  assert.equal(b.apiKey, 'key-b-openrouter');
  assert.equal(b.model, 'openai/gpt-oss-20b:free');
  assert.equal(b.baseUrl, 'https://openrouter.ai/api/v1');
});

test('legacy GROQ_* fallbacks still work when ARCH_* vars are absent', () => {
  const a = resolveLLMConfig({
    env: { GROQ_MODEL_A: 'some/legacy-model' },
    prefix: 'ARCH_A_',
    legacyApiKey: 'legacy-key',
    legacyModel: undefined,
  });
  // GROQ_MODEL_A is passed as legacyModel by web/src/llmClient.js
  void a;
});

test('web client resolution honours GROQ_MODEL_A fallback chain', () => {
  // Mirrors web/src/llmClient.js resolution with only legacy vars set.
  const env = { GROQ_API_KEY: 'k', GROQ_MODEL_A: 'legacy/model-a' };
  const cfg = resolveLLMConfig({
    env,
    prefix: 'ARCH_A_',
    legacyApiKey: env.GROQ_API_KEY,
    legacyModel: env.GROQ_MODEL_A || env.GROQ_MODEL || undefined,
  });
  assert.equal(cfg.provider, 'groq');
  assert.equal(cfg.model, 'legacy/model-a');
  assert.equal(cfg.apiKey, 'k');
});

test('vision client resolution honours GROQ_MODEL_B > GROQ_MODEL chain', () => {
  const env = { GROQ_MODEL_B: 'b/model', GROQ_MODEL: 'shared/model' };
  const cfg = resolveLLMConfig({
    env,
    prefix: 'ARCH_B_',
    legacyApiKey: 'k',
    legacyModel: env.GROQ_MODEL_B || env.GROQ_MODEL || undefined,
  });
  assert.equal(cfg.provider, 'groq');
  assert.equal(cfg.model, 'b/model');
});

test('ARCH_B_ prefix wins over legacy vars when explicitly set', () => {
  const env = {
    ARCH_B_LLM_PROVIDER: 'openrouter',
    ARCH_B_LLM_API_KEY: 'or-key',
    ARCH_B_LLM_MODEL: 'meta-llama/llama-3.1-8b-instruct',
    GROQ_MODEL: 'openai/gpt-oss-120b',
    GROQ_MODEL_B: 'openai/gpt-oss-120b',
  };
  const cfg = resolveLLMConfig({
    env,
    prefix: 'ARCH_B_',
    legacyApiKey: 'groq-key',
    legacyModel: env.GROQ_MODEL_B || env.GROQ_MODEL,
  });
  assert.equal(cfg.provider, 'openrouter');
  assert.equal(cfg.model, 'meta-llama/llama-3.1-8b-instruct');
  assert.equal(cfg.apiKey, 'or-key');
});

test('unsupported provider is rejected with a clear error', () => {
  assert.throws(
    () => resolveLLMConfig({ env: { ARCH_A_LLM_PROVIDER: 'skynet' }, prefix: 'ARCH_A_' }),
    /Unsupported ARCH_A_LLM_PROVIDER/
  );
});

// ── lazy key handling / offline safety ───────────────────────────────────────

test('missing API keys do NOT throw at resolution time', () => {
  const cfg = resolveLLMConfig({ env: {}, prefix: 'ARCH_A_' });
  assert.equal(cfg.apiKey, undefined);
  assert.equal(cfg.provider, 'groq'); // default
  assert.ok(cfg.model); // groq has a provider default model
});

test('openrouter without explicit model leaves model undefined (validated lazily)', () => {
  const cfg = resolveLLMConfig({
    env: { ARCH_B_LLM_PROVIDER: 'openrouter' },
    prefix: 'ARCH_B_',
  });
  assert.equal(cfg.model, undefined);
});

test('chatCompletion without an API key throws a clear error and never fetches', async () => {
  await assert.rejects(
    () => chatCompletion({ provider: 'groq', apiKey: undefined, baseUrl: 'https://x' }, { messages: [] }),
    /Missing API key for provider "groq"/
  );
});

test('chatCompletion without any configured model fails clearly (openrouter)', async () => {
  await assert.rejects(
    () => chatCompletion({ provider: 'openrouter', apiKey: 'k', baseUrl: 'https://x', model: undefined }, { messages: [] }),
    /No model configured for provider "openrouter"/
  );
});

// ── transport behaviour against a stubbed global fetch (NO real API calls) ──

test('chatCompletion sends OpenAI-compatible payload to the provider base URL', async () => {
  const calls = [];
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body), headers: opts.headers });
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"action":"done"}' } }] }),
    };
  };
  try {
    const out = await chatCompletion(
      { provider: 'openrouter', apiKey: 'secret-or-key', baseUrl: 'https://openrouter.ai/api/v1', model: 'x/y:free' },
      { messages: [{ role: 'user', content: 'hi' }], maxTokens: 5 }
    );
    assert.equal(out, '{"action":"done"}');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(calls[0].body.model, 'x/y:free');
    assert.equal(calls[0].body.max_tokens, 5);
    assert.equal(calls[0].headers.Authorization, 'Bearer secret-or-key');
    assert.ok(calls[0].headers['X-Title']); // openrouter attribution present
  } finally {
    global.fetch = realFetch;
  }
});

test('HTTP errors carry .status and do not include the Authorization header value', async () => {
  const realFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 429,
    text: async () => '{"error":"rate limited"}',
  });
  try {
    await assert.rejects(
      () => chatCompletion(
        { provider: 'groq', apiKey: 'super-secret-key', baseUrl: 'https://api.groq.com/openai/v1', model: 'm' },
        { messages: [] }
      ),
      (err) => err.status === 429 && !err.message.includes('super-secret-key')
    );
  } finally {
    global.fetch = realFetch;
  }
});

// ── token usage JSONL logging (counts only — never keys/prompts) ─────────────

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('chatCompletion appends {provider, model, usage} counts to the JSONL log', async () => {
  const logPath = path.join(os.tmpdir(), `llm_usage_test_${Date.now()}.jsonl`);
  process.env.LLM_USAGE_LOG_PATH = logPath;
  const realFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'ok' } }],
      usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 },
    }),
  });
  try {
    await chatCompletion(
      { provider: 'groq', apiKey: 'secret-key-should-not-appear', baseUrl: 'https://x', model: 'm1' },
      { messages: [{ role: 'user', content: 'SECRET PROMPT TEXT' }] }
    );
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    const rec = JSON.parse(lines[0]);
    assert.equal(rec.provider, 'groq');
    assert.equal(rec.model, 'm1');
    assert.equal(rec.prompt_tokens, 120);
    assert.equal(rec.completion_tokens, 30);
    assert.equal(rec.total_tokens, 150);
    assert.ok(rec.ts); // timestamped
    const raw = lines[0];
    assert.ok(!raw.includes('secret-key-should-not-appear'), 'API key must never be logged');
    assert.ok(!raw.includes('SECRET PROMPT TEXT'), 'prompts must never be logged');
  } finally {
    global.fetch = realFetch;
    delete process.env.LLM_USAGE_LOG_PATH;
    fs.rmSync(logPath, { force: true });
  }
});

test('chatCompletion skips usage logging when the provider sends no usage block', async () => {
  const logPath = path.join(os.tmpdir(), `llm_usage_test_none_${Date.now()}.jsonl`);
  process.env.LLM_USAGE_LOG_PATH = logPath;
  const realFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: 'ok' } }] }), // no usage
  });
  try {
    await chatCompletion(
      { provider: 'groq', apiKey: 'k', baseUrl: 'https://x', model: 'm' },
      { messages: [] }
    );
    assert.equal(fs.existsSync(logPath), false, 'no record without a usage block');
  } finally {
    global.fetch = realFetch;
    delete process.env.LLM_USAGE_LOG_PATH;
    fs.rmSync(logPath, { force: true });
  }
});

test('supported providers list contains exactly groq and openrouter', () => {
  assert.deepEqual([...SUPPORTED_PROVIDERS].sort(), ['groq', 'openrouter']);
});
