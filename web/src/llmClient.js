'use strict';

// Architecture A LLM configuration — independently configurable provider.
// Resolution order (prefix ARCH_A_):
//   ARCH_A_LLM_PROVIDER  (groq | openrouter; default groq)
//   ARCH_A_LLM_API_KEY   > GROQ_API_KEY
//   ARCH_A_LLM_MODEL     > GROQ_MODEL_A > GROQ_MODEL > provider default
const { resolveLLMConfig, chatCompletion } = require('../../lib/llmProvider');

const STUB_MODE = process.env.STUB_LLM === 'true';

// Validated lazily inside callLLM() so importing this module never crashes
// offline tooling, unit tests or stub-mode runs.
const LLM_CONFIG = resolveLLMConfig({
  env: process.env,
  prefix: 'ARCH_A_',
  legacyApiKey: process.env.GROQ_API_KEY,
  legacyModel: process.env.GROQ_MODEL_A || process.env.GROQ_MODEL || undefined,
});

// Reasoning models spend budget on reasoning tokens; a small max_tokens
// yields EMPTY or truncated content. Keep a sane minimum.
const MAX_TOKENS  = Number(process.env.GROQ_MAX_TOKENS_A) || 1500;
const TEMPERATURE = 0.2;

async function callLLM(prompt) {
  if (STUB_MODE) {
    console.warn('[llmClient] STUB MODE — returning done');
    return { action: 'done', elementId: null, selector: '', value: '', reason: 'stub' };
  }

  console.log(`[llmClient] Calling ${LLM_CONFIG.provider} → ${LLM_CONFIG.model || '(no model set)'} ...`);

  // Retry up to 3 times on transient failures
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const rawText = (
        await chatCompletion(LLM_CONFIG, {
          maxTokens: MAX_TOKENS,
          temperature: TEMPERATURE,
          messages: [
            {
              role: 'system',
              content:
                'You are a web UI exploration agent for automated testing. ' +
                'You MUST respond with a single raw JSON object only. ' +
                'Absolutely NO markdown, NO code blocks, NO backticks, NO explanation. ' +
                'Just the JSON object starting with { and ending with }.'
            },
            { role: 'user', content: prompt }
          ],
        })
      ).trim();

      console.log('[llmClient] Raw response:', rawText.slice(0, 150));

      // Empty content = reasoning consumed the whole budget (or a transient
      // provider issue). Retry within the same attempt loop instead of
      // returning garbage for parseAction to choke on.
      if (!rawText) {
        if (attempt < 3) {
          console.warn('[llmClient] Empty response — retrying...');
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw new Error('Empty LLM response after 3 attempts');
      }

      try {
        return JSON.parse(rawText);
      } catch (_) {
        console.warn('[llmClient] Response needs cleaning — parseAction() will handle it');
        return rawText;
      }

    } catch (err) {
      console.error(`[llmClient] Attempt ${attempt} failed:`, err.message);
      // Quota/auth errors: retrying only burns quota or repeats the failure.
      if (err.status === 429 || err.status === 401 || err.status === 403) throw err;
      if (attempt < 3) {
        console.log('[llmClient] Retrying in 2 seconds...');
        await new Promise(r => setTimeout(r, 2000));
      } else {
        throw err; // re-throw after 3 failures so explore.js can log it properly
      }
    }
  }
}

function parseAction(llmResponse) {
  if (STUB_MODE) {
    return { action: 'done', elementId: null, selector: '', value: '', url: '', reason: 'stub' };
  }

  if (typeof llmResponse === 'object' && llmResponse !== null && !Array.isArray(llmResponse)) {
    return _normaliseAction(llmResponse);
  }

  if (typeof llmResponse === 'string') {
    const trimmed = llmResponse.trim();

    try { return _normaliseAction(JSON.parse(trimmed)); } catch (_) {}

    // Some reasoning models inject markdown-fence fragments INSIDE JSON
    // values/keys ("elementId":6```html). Strip every fence token and any
    // leftover raw newlines (illegal as control chars inside JSON strings;
    // harmless outside them for this single-line protocol).
    const deFenced = trimmed.replace(/```[a-z]*/gi, '').replace(/\r?\n/g, ' ');
    try { return _normaliseAction(JSON.parse(deFenced)); } catch (_) {}

    // Models also emit CSS attribute selectors with UNESCAPED double quotes
    // ("selector": "[name="username"]") which break JSON parsing. Normalise
    // bracket-attribute quoting to single quotes and retry.
    const attrRepaired = deFenced
      .replace(/\[([a-zA-Z][\w:-]*)="/g, "[$1='")
      .replace(/"\]/g, "']");
    try { return _normaliseAction(JSON.parse(attrRepaired)); } catch (_) {}

    const noFences = trimmed
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim();
    try { return _normaliseAction(JSON.parse(noFences)); } catch (_) {}

    const match = trimmed.match(/\{[\s\S]*?\}/);
    if (match) { try { return _normaliseAction(JSON.parse(match[0])); } catch (_) {} }

    const matchGreedy = trimmed.match(/\{[\s\S]*\}/);
    if (matchGreedy) { try { return _normaliseAction(JSON.parse(matchGreedy[0])); } catch (_) {} }
  }

  console.error('[llmClient] parseAction: all strategies failed, raw:', JSON.stringify(llmResponse).slice(0, 300));
  return { action: 'done', elementId: null, selector: '', value: '', url: '', reason: 'parse_failed' };
}

function _normaliseAction(obj) {
  const VALID_ACTIONS = ['click', 'fill', 'navigate', 'select_option', 'done'];
  return {
    action:    VALID_ACTIONS.includes(obj.action) ? obj.action : 'done',
    elementId: typeof obj.elementId === 'number'  ? obj.elementId : null,
    selector:  typeof obj.selector  === 'string'  ? obj.selector.trim() : '',
    value:     typeof obj.value     === 'string'  ? obj.value : '',
    url:       typeof obj.url       === 'string'  ? obj.url : '',
    reason:    typeof obj.reason    === 'string'  ? obj.reason : '',
  };
}

async function executeAction(page, action) {
  if (STUB_MODE) { console.warn('[llmClient] STUB MODE — skipping executeAction'); return; }

  const { action: type, selector, value, url } = action;

  switch (type) {
  case 'click': {
    if (!selector) throw new Error('executeAction: click missing selector');
    console.log(`[llmClient] Executing: click "${selector}"`);

    try {
      // If the element has an href, navigate directly — more reliable than clicking
      const href = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el ? el.getAttribute('href') : null;
      }, selector).catch(() => null);

      if (href && href.startsWith('http')) {
        await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } else if (href && href.startsWith('/')) {
        const base = new URL(page.url()).origin;
        await page.goto(base + href, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } else {
        // Not a link — do normal click
        await page.click(selector, { timeout: 8000 });
      }
    } catch (firstErr) {
      try {
        await page.locator(`text=${selector}`).first().click({ timeout: 5000 });
      } catch (_) {
        throw firstErr;
      }
    }
    break;
  }
    case 'fill': {
      if (!selector) throw new Error('executeAction: fill missing selector');
      const textToType = (value && value.trim()) ? value : _defaultValue(selector);
      console.log(`[llmClient] Executing: fill "${selector}" with "${textToType}"`);
      try {
        await page.fill(selector, textToType, { timeout: 8000 });
      } catch (_) {
        await page.click(selector, { timeout: 5000 });
        await page.fill(selector, textToType, { timeout: 5000 });
      }
      break;
    }
    case 'navigate': {
      const target = url || selector;
      if (!target) throw new Error('executeAction: navigate missing url');
      const absolute = target.startsWith('http') ? target : new URL(target, page.url()).href;
      console.log(`[llmClient] Executing: navigate "${absolute}"`);
      await page.goto(absolute, { waitUntil: 'domcontentloaded', timeout: 20000 });
      break;
    }
    case 'select_option': {
      // Custom dropdowns (react-select et al.) reject page.fill(); they need
      // click-to-open then click on the option. Native <select> uses the
      // dedicated Playwright primitive.
      if (!selector) throw new Error('executeAction: select_option missing selector');
      const optionText = (value || '').trim();
      console.log(`[llmClient] Executing: select_option "${selector}" -> "${optionText}"`);

      const isNativeSelect = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return !!el && el.tagName === 'SELECT';
      }, selector).catch(() => false);

      if (isNativeSelect) {
        try {
          if (optionText) {
            await page.selectOption(selector, { label: optionText }, { timeout: 8000 });
          } else {
            await page.selectOption(selector, { index: 1 }, { timeout: 8000 });
          }
        } catch (_) {
          await page.selectOption(selector, { index: 1 }, { timeout: 5000 });
        }
        break;
      }

      // Custom widget: the detected node is often a hidden zero-size input
      // (react-select) that Playwright cannot click directly — resolve the
      // visible control ancestor and click its centre with raw mouse events.
      const ctrlPoint = await page.evaluate((sel) => {
        const norm = (t) => String(t || '').toLowerCase();
        const el = document.querySelector(sel);
        if (!el) return null;
        let ctrl = el;
        while (ctrl && ctrl !== document.body) {
          const c = norm(ctrl.className);
          if (c.includes('control') || c.includes('dropdown') || c.includes('select')) break;
          ctrl = ctrl.parentElement;
        }
        if (!ctrl || ctrl === document.body) ctrl = el.parentElement || el;
        const r = ctrl.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) {
          const er = el.getBoundingClientRect();
          if (er.width > 0 && er.height > 0) return { x: er.x + er.width / 2, y: er.y + er.height / 2 };
          return null;
        }
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, selector);

      if (!ctrlPoint) throw new Error(`select_option: ${selector} not found or not renderable`);
      await page.mouse.click(ctrlPoint.x, ctrlPoint.y);
      await page.waitForTimeout(700); // let the options menu render

      // Options live in the freshly-opened menu; prefer the requested text,
      // but NEVER hang on a missing label — deterministic first-option
      // fallback keeps exploration moving (a wrong-but-real selection still
      // records state; a stuck menu poisons every later step).
      const MENU_SEL = '[class*="menu" i] [class*="option" i], [role="listbox"] [role="option"]';
      try {
        if (optionText) {
          await page.locator(MENU_SEL)
            .filter({ hasText: optionText })
            .first()
            .click({ timeout: 3000 });
        } else {
          throw new Error('no value — take first option');
        }
      } catch (_) {
        if (optionText) {
          console.log(`[llmClient] Option "${optionText}" not in menu — selecting first available option.`);
        }
        await page.locator(MENU_SEL).first().click({ timeout: 6000 });
      }
      break;
    }
    case 'done': {
      console.log('[llmClient] Action is "done" — exploration complete');
      break;
    }
    default: {
      console.warn(`[llmClient] Unknown action type: "${type}" — skipping`);
    }
  }
}

function _defaultValue(selector) {
  const s = selector.toLowerCase();
  // Authenticated-seed support: real credentials win over invented ones.
  if (process.env.SEED_PASSWORD && (s.includes('password') || s.includes('pass'))) return process.env.SEED_PASSWORD;
  if (process.env.SEED_USERNAME && (s.includes('user') || s.includes('name') || s.includes('mail'))) {
    return process.env.SEED_USERNAME;
  }
  if (s.includes('email') || s.includes('mail'))    return 'test@example.com';
  if (s.includes('password') || s.includes('pass')) return 'TestPass123!';
  if (s.includes('user') || s.includes('name'))     return 'testuser';
  if (s.includes('phone') || s.includes('mobile'))  return '9876543210';
  if (s.includes('search') || s.includes('query'))  return 'test search';
  if (s.includes('first'))                           return 'Test';
  if (s.includes('last'))                            return 'User';
  if (s.includes('address') || s.includes('city'))  return 'Bangalore';
  return 'test_input';
}

module.exports = { callLLM, parseAction, executeAction };