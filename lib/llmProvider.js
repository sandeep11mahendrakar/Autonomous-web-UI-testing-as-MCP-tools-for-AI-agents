'use strict';

/**
 * lib/llmProvider.js — minimal multi-provider LLM configuration + transport.
 *
 * A very small generic abstraction shared ONLY as infrastructure; Architecture
 * A (web/) and Architecture B (vision/) each resolve their OWN configuration
 * independently and keep their own prompts/parsing/retry policies.
 *
 * Supported providers (OpenAI-compatible chat/completions endpoints):
 *   groq       https://api.groq.com/openai/v1
 *   openrouter https://openrouter.ai/api/v1
 *
 * Configuration is resolved PER ARCHITECTURE from prefixed variables:
 *   <PREFIX>LLM_PROVIDER / <PREFIX>LLM_API_KEY / <PREFIX>LLM_MODEL
 *   <PREFIX>LLM_BASE_URL   (optional override)
 * e.g. ARCH_A_LLM_PROVIDER=groq, ARCH_B_LLM_PROVIDER=openrouter.
 *
 * SECRETS ARE NEVER LOGGED. Keys are validated lazily — importing modules
 * that use this file never crashes when a key is absent (offline/stub mode).
 */

const PROVIDER_BASE_URLS = {
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

const PROVIDER_DEFAULT_MODELS = {
  groq: 'openai/gpt-oss-120b',
  // OpenRouter has no meaningful universal default — require an explicit model.
  openrouter: null,
};

const SUPPORTED_PROVIDERS = Object.keys(PROVIDER_BASE_URLS);

/**
 * Resolve one architecture's LLM configuration.
 *
 * @param {Object} opts
 * @param {Object} opts.env        environment object (e.g. process.env)
 * @param {String} opts.prefix     e.g. 'ARCH_A_' or 'ARCH_B_'
 * @param {String} [opts.legacyApiKey]  fallback key var value (e.g. GROQ_API_KEY)
 * @param {String} [opts.legacyModel]   fallback model var value
 * @param {Number} [opts.defaultMaxTokens]
 */
function resolveLLMConfig({ env, prefix, legacyApiKey = undefined, legacyModel = undefined }) {
  const pick = (k) => {
    const v = env[k];
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
  };

  let provider = (pick(prefix + 'LLM_PROVIDER') || 'groq').toLowerCase();
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(
      `Unsupported ${prefix}LLM_PROVIDER "${provider}" (supported: ${SUPPORTED_PROVIDERS.join(', ')})`
    );
  }

  const apiKey =
    pick(prefix + 'LLM_API_KEY') ||
    legacyApiKey || // legacy provider-specific fallback, e.g. GROQ_API_KEY
    undefined;

  const model =
    pick(prefix + 'LLM_MODEL') ||
    legacyModel ||
    PROVIDER_DEFAULT_MODELS[provider] ||
    undefined;

  const baseUrl =
    pick(prefix + 'LLM_BASE_URL') ||
    PROVIDER_BASE_URLS[provider];

  // Optional reasoning-effort control for reasoning models (e.g. 'low' keeps
  // SOTA-tier models fast). Empty/absent means "provider default".
  const reasoning = pick(prefix + 'LLM_REASONING') || pick('LLM_REASONING');

  return {
    provider,
    apiKey,            // may be undefined — callers must validate lazily
    model,             // may be undefined (openrouter without explicit model)
    baseUrl,
    reasoning,
  };
}

/**
 * One OpenAI-compatible chat completion via fetch. Returns the assistant
 * message content string. Errors carry `.status` for caller retry policies.
 * NEVER logs or embeds the API key in error messages.
 */
async function chatCompletion(config, { messages, maxTokens = 700, temperature = 0.2, model } = {}) {
  if (!config || !config.baseUrl) throw new Error('llmProvider: missing provider config');
  if (!config.apiKey) {
    throw new Error(
      `Missing API key for provider "${config.provider}". ` +
      'Set the architecture-specific LLM_API_KEY variable in .env.'
    );
  }
  const targetModel = model || config.model;
  if (!targetModel) {
    throw new Error(`No model configured for provider "${config.provider}"`);
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  };
  if (config.provider === 'openrouter') {
    // Recommended OpenRouter attribution headers (values are NOT secret).
    headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL || 'https://localhost/capstone';
    headers['X-Title'] = process.env.OPENROUTER_APP_NAME || 'Capstone Test Generator';
  }

  const body = {
    model: targetModel,
    max_tokens: maxTokens,
    temperature,
    messages,
  };
  if (config.reasoning) {
    body.reasoning = { effort: config.reasoning };
  }

  let res;
  try {
    res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    const e = new Error(`LLM network error (${config.provider}): ${err.message}`);
    e.status = null;
    throw e;
  }

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.text()).slice(0, 300); } catch (_) {}
    const e = new Error(`LLM HTTP ${res.status} from ${config.provider}: ${detail}`);
    e.status = res.status;
    throw e;
  }

  const data = await res.json();
  const msg = data?.choices?.[0]?.message;
  // Reasoning models (e.g. gpt-oss) occasionally emit the final answer in a
  // dedicated reasoning field with empty content — fall back so callers never
  // see a silent empty string.
  const content =
    (typeof msg?.content === 'string' && msg.content) ||
    (typeof msg?.reasoning === 'string' && msg.reasoning) ||
    (typeof msg?.reasoning_content === 'string' && msg.reasoning_content) ||
    '';
  return typeof content === 'string' ? content : '';
}

module.exports = {
  SUPPORTED_PROVIDERS,
  PROVIDER_BASE_URLS,
  resolveLLMConfig,
  chatCompletion,
};
