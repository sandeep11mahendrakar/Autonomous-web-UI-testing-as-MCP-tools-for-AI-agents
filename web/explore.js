'use strict';

/**
 * explore.js — Architecture A autonomous DOM exploration engine.
 *
 * Flow: URL -> Playwright -> DOM extraction -> preprocessing -> LLM picks ONE
 * action from the CURRENT page's untried candidates -> Playwright executes ->
 * fresh DOM extraction -> state fingerprint -> repeated? back+mark-tried :
 * adopt new state -> repeat until limits/termination.
 *
 * DOM-only: element understanding comes exclusively from the live DOM.
 *
 * Artifacts (dir: $ARCH_A_OUTPUT_DIR, default ./logs):
 *   memory_log.json        enriched step history (backward-compatible schema)
 *   states.json            visited states (id, parent, fingerprint, elements)
 *   transitions.json       edge list between states
 *   exploration_summary.json
 *   test_cases.json        generated from recorded workflows (grounded)
 *   screenshots/           evidence only — never the perception source
 */

require('dotenv').config();

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const { getDOMElements, getPageMeta }           = require('./src/domExtractor');
const { storeStep, saveLog, loadLog,
        saveStates, saveTransitions, saveSummary } = require('./src/memoryLog');
const { preprocessDOM, buildExplorationPrompt }  = require('./src/preprocess');
const { callLLM, parseAction, executeAction }    = require('./src/llmClient');
const { generateTestCases }                      = require('./src/testGenerator');
const { hashStr, normText, buildCandidates,
        deriveFlowsFromDOM }                     = require('./src/exploreHelpers');

const HOME_URL        = process.argv[2] || 'https://demoqa.com';
const MAX_FLOWS       = Number(process.env.MAX_FLOWS) || 5;
const LIMITS = {
  STEPS: Number(process.env.MAX_STEPS) || 25,
  STATES: Number(process.env.MAX_STATES) || 15,
  DEPTH: Number(process.env.MAX_DEPTH) || 8,
  ACTIONS_PER_STATE: Number(process.env.MAX_ACTIONS_PER_STATE) || 4,
};
const OUTPUT_DIR      = process.env.ARCH_A_OUTPUT_DIR || path.join(__dirname, 'logs');
const SCREENSHOT_DIR  = path.join(OUTPUT_DIR, 'screenshots');
const MEMORY_LOG_PATH = path.join(OUTPUT_DIR, 'memory_log.json');
const STATES_PATH     = path.join(OUTPUT_DIR, 'states.json');
const TRANSITIONS_PATH= path.join(OUTPUT_DIR, 'transitions.json');
const SUMMARY_PATH    = path.join(OUTPUT_DIR, 'exploration_summary.json');
// Headless by default; HEADLESS=false opts back into a visible browser.
const HEADLESS        = process.env.HEADLESS !== 'false';
// Authenticated-seed support: optional start credentials supplied by the
// orchestrator (runBoth.js --auth user pass) so exploration can get past
// login walls instead of inventing values.
const SEED = {
  username: process.env.SEED_USERNAME || '',
  password: process.env.SEED_PASSWORD || '',
};
if (SEED.username && SEED.password) {
  console.log('[explore] Auth seed provided — credentials will be used on login/signup forms.');
}

for (const d of [OUTPUT_DIR, SCREENSHOT_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// ── console tee → run_explore.log ────────────────────────────────────────────
const RUN_LOG_PATH = path.join(OUTPUT_DIR, 'run_explore.log');
const runLogStream = fs.createWriteStream(RUN_LOG_PATH, { flags: 'a' });
const _origLog  = console.log.bind(console);
const _origErr  = console.error.bind(console);
console.log  = (...a) => { const s = a.map(String).join(' '); runLogStream.write(s + '\n'); _origLog(s); };
console.error = (...a) => { const s = a.map(String).join(' '); runLogStream.write('[ERR] ' + s + '\n'); _origErr(s); };

// ── helpers ──────────────────────────────────────────────────────────────────

/** DOM-structure state fingerprint — never screenshot-based. */
async function fingerprintState(page, elements) {
  const visibleText = await page.evaluate(
    () => (document.body ? document.body.innerText : '').slice(0, 4000)
  ).catch(() => '');
  const elemSig = elements
    .map(el => `${el.tag}|${el.inputType || ''}|${el.name || ''}|${normText(el.text).slice(0, 40)}`)
    .sort()
    .join('|');
  const u = new URL(page.url());
  return `${u.origin}${u.pathname.replace(/\/$/, '')}|${hashStr(normText(visibleText))}|${hashStr(elemSig)}`;
}

/** One controlled re-prompt; then a deterministic untried-candidate fallback. */
async function decideAction(page, candidates, memoryLog, flowName, fingerprint) {
  const pageText = await page
    .evaluate(() => (document.body ? document.body.innerText : ''))
    .catch(() => '');
  const prompt = buildExplorationPrompt(
    // map candidates back to preprocess-shaped rows for the prompt builder
    candidates.map(c => ({ ...c, elementId: c.elementId })),
    memoryLog, flowName, pageText, SEED.username && SEED.password ? SEED : null
  );

  const attempt = async (forbidDone) => {
    const raw = await callLLM(prompt + (forbidDone
      ? '\nIMPORTANT: untried candidates ARE available — "done" is NOT acceptable right now.'
      : ''));
    const parsed = parseAction(raw);
    // Bind selector/href to the candidate table — the LLM cannot invent them.
    const chosen = candidates.find(c => c.elementId === parsed.elementId)
      || candidates.find(c => c.selector && c.selector === parsed.selector);
    if (parsed.action === 'navigate' && !chosen && parsed.url) {
      const byUrl = candidates.find(c => c.href && c.href.endsWith(parsed.url.split('/').pop()));
      if (byUrl) return { action: 'navigate', chosen: byUrl, value: '', reason: parsed.reason };
    }
    return { action: parsed.action, chosen, value: typeof parsed.value === 'string' ? parsed.value : '', reason: parsed.reason };
  };

  let decision;
  try {
    decision = await attempt(false);
  } catch (err) {
    console.log(`[explore] LLM failed (${err.message.slice(0, 80)}) — using deterministic fallback.`);
    decision = { action: 'done', chosen: null, value: '', reason: 'llm_error' };
  }
  if (decision.action === 'done' && candidates.some(c => !c.alreadyTried)) {
    try {
      decision = await attempt(true);
    } catch {
      decision = { action: 'done', chosen: null, value: '', reason: 'llm_error_retry' };
    }
  }
  // Persistent parse/done failure -> deterministic next untried candidate.
  const untried = candidates.filter(c => !c.alreadyTried);
  if ((decision.action === 'done' || !decision.chosen) && untried.length) {
    const pick = untried[0];
    console.log(`[explore] Deterministic fallback candidate: ${pick.tag} "${pick.text || pick.selector}"`);
    let fallbackAction;
    if (pick.tag === 'A') fallbackAction = 'navigate';
    else if (pick.tag === 'INPUT' || pick.tag === 'TEXTAREA') fallbackAction = pick.isDropdown ? 'select_option' : 'fill';
    else if (pick.tag === 'SELECT') fallbackAction = 'select_option';
    else fallbackAction = 'click';
    let fallbackValue = pick.placeholder || pick.text || 'test_input';
    if (fallbackAction === 'fill' && SEED.username && SEED.password) {
      const s = `${pick.selector} ${pick.placeholder || ''}`.toLowerCase();
      if (s.includes('password') || s.includes('pass')) fallbackValue = SEED.password;
      else if (s.includes('user') || s.includes('name') || s.includes('mail')) fallbackValue = SEED.username;
    }
    return {
      action: fallbackAction,
      chosen: pick,
      value: fallbackValue,
      reason: 'deterministic_fallback',
      fallback: true,
    };
  }
  return decision;
}

// ── flow discovery (unchanged behaviour) ─────────────────────────────────────

async function discoverFlows(page, elements) {
  // Deterministic first: obvious same-origin top-level sections need no LLM.
  const deterministic = deriveFlowsFromDOM(elements, HOME_URL, MAX_FLOWS);
  if (deterministic.length) {
    console.log(`[explore] Deterministic flow discovery found ${deterministic.length} flows:`,
      deterministic.map(f => f.name));
    return deterministic;
  }

  const compactElements = elements.map(el => ({
    elementId: el.elementId,
    tag: el.tag,
    text: el.text || '',
    selector: el.selector,
    href: el.href || '',
  }));

  const prompt = `You are a web exploration agent. Look at the homepage elements below and identify the main navigable sections.

HOMEPAGE ELEMENTS:
${JSON.stringify(compactElements)}

Return a JSON array of flows to explore. Each flow must have:
- "name": the section name (e.g. "Elements", "Forms")
- "url": the full absolute URL from the href field

Only include top-level section links — ignore logo, footer, and external links.
Return ONLY a raw JSON array. No markdown, no explanation.

Example:
[
  { "name": "Elements", "url": "https://demoqa.com/elements" },
  { "name": "Forms", "url": "https://demoqa.com/forms" }
]`;

  try {
    const llmResponse = await callLLM(prompt);

    let parsed;
    if (Array.isArray(llmResponse)) {
      parsed = llmResponse;
    } else if (typeof llmResponse === 'string') {
      const clean = llmResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        .trim();
      parsed = JSON.parse(clean);
    } else if (typeof llmResponse === 'object' && llmResponse !== null) {
      parsed = [llmResponse];
    } else {
      parsed = [];
    }

    const valid = parsed.filter(f => f.name && f.url && f.url.startsWith('http'));
    console.log(`[explore] Discovered ${valid.length} flows:`, valid.map(f => f.name));
    return valid.slice(0, MAX_FLOWS);

  } catch (err) {
    console.error('[explore] Flow discovery failed:', err.message);
    return [];
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

(async () => {
  const memoryLog   = [];
  const states      = [];
  const transitions = [];
  const warnings    = [];

  const visitedFingerprints = new Map(); // fingerprint -> state_id
  const triedActions        = new Set(); // `${fp}|${selector}`
  const actionsPerState     = new Map(); // fingerprint -> count

  let stateCounter  = 0;
  let globalStep    = 0;

  function nextStateId() {
    stateCounter += 1;
    return `state_${String(stateCounter).padStart(3, '0')}`;
  }

  async function captureState(label, leadingAction, parentId) {
    const shotBase = `${globalStep + 1}_${label}`;
    const shotBefore = path.join(SCREENSHOT_DIR, `${shotBase}.png`);
    await page.screenshot({ path: shotBefore }).catch(() => {});

    const rawElements = await getDOMElements(page).catch(() => []);
    const meta = await getPageMeta(page);
    const elements = preprocessDOM(rawElements);
    const fingerprint = await fingerprintState(page, elements);

    const state = {
      state_id: nextStateId(),
      parent_state_id: parentId || null,
      url: meta.url,
      title: meta.title,
      label,
      fingerprint,
      elements_observed: elements.length,
      leading_action: leadingAction || null,
      timestamp: new Date().toISOString(),
    };
    return { state, elements, fingerprint };
  }

  const browser = await chromium.launch({ headless: HEADLESS });
  const page    = await browser.newPage();

  await page.route('**/*', route => {
    const url = route.request().url();
    const blocked = [
      'googlesyndication', 'googletagmanager', 'adsbygoogle', 'doubleclick',
      'google-analytics', 'googletagservices', 'amazon-adsystem', 'adnxs',
      'adsystem', 'moatads', 'scorecardresearch', 'outbrain', 'taboola',
      'disqus', 'cdn.carbonads', 'media.net'
    ];
    if (blocked.some(b => url.includes(b))) route.abort();
    else route.continue();
  });

  await page.setViewportSize({ width: 1280, height: 900 });

  let terminationReason = 'completed';
  const startedAt = Date.now();

  // Incremental persistence — an interrupted run keeps everything recorded so far.
  const persistIncremental = () => {
    try {
      saveLog(memoryLog, MEMORY_LOG_PATH);
      saveStates(states, STATES_PATH);
      saveTransitions(transitions, TRANSITIONS_PATH);
    } catch (err) {
      _origErr(`[explore] Incremental persistence failed: ${err.message}`);
    }
  };
  process.on('SIGINT', () => {
    console.log('[explore] SIGINT — persisting artifacts before exit...');
    persistIncremental();
    runLogStream.end();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    console.log('[explore] SIGTERM — persisting artifacts before exit...');
    persistIncremental();
    runLogStream.end();
    process.exit(143);
  });

  try {
    // Step 1: homepage
    console.log(`[explore] Loading homepage: ${HOME_URL}`);
    await page.goto(HOME_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Step 2: flows
    console.log('[explore] Extracting homepage elements...');
    let homeElements;
    try {
      homeElements = preprocessDOM(await getDOMElements(page));
    } catch (err) {
      throw new Error(`Homepage DOM extraction failed: ${err.message}`);
    }
    console.log(`[explore] Homepage elements found: ${homeElements.length}`);

    let flows = await discoverFlows(page, homeElements);
    if (!flows.length) {
      console.warn('[explore] No flows discovered — falling back to single-flow base exploration.');
      flows = [{ name: 'Base', url: HOME_URL }];
    }

    // Step 3: explore each flow with the state-machine loop
    let flowNumber = 0;
    for (const flow of flows) {
      if (states.length >= LIMITS.STATES || globalStep >= LIMITS.STEPS) break;
      flowNumber += 1;
      console.log(`\n[explore] ▶ Flow ${flowNumber}/${flows.length}: ${flow.name} → ${flow.url}`);

      try {
        await page.goto(flow.url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(3000);
      } catch (err) {
        console.error(`[explore] Failed to load ${flow.url}: ${err.message}`);
        continue;
      }

      const first = await captureState('initial', { type: 'navigate', target: flow.url }, null);
      if (!visitedFingerprints.has(first.fingerprint)) {
        visitedFingerprints.set(first.fingerprint, first.state.state_id);
        states.push(first.state);
      }
      let current = first;
      let stepsInFlow = 0;

      while (globalStep < LIMITS.STEPS &&
             states.length < LIMITS.STATES &&
             stepsInFlow < LIMITS.DEPTH) {

        const fp = current.fingerprint;
        const used = actionsPerState.get(fp) || 0;
        if (used >= LIMITS.ACTIONS_PER_STATE) {
          console.log('[explore] Max actions per state reached — next flow.');
          break;
        }

        const candidates = buildCandidates(current.elements, triedActions, fp);
        if (!candidates.length) {
          console.log('[explore] No remaining candidates on this page.');
          break;
        }

        globalStep += 1;
        stepsInFlow += 1;
        console.log(`\n[explore] ══ Step ${globalStep} (Flow: ${flow.name}, flow-step: ${stepsInFlow}) ══`);

        const decision = await decideAction(
          page, candidates, memoryLog, flow.name, fp
        );
        if (decision.action === 'done' || !decision.chosen) {
          console.log(`[explore] Flow "${flow.name}" complete (${decision.reason || 'done'}).`);
          break;
        }
        actionsPerState.set(fp, used + 1);

        const cand = decision.chosen;
        triedActions.add(`${fp}|${cand.selector}`);
        const execAction = {
          action: decision.action,
          elementId: cand.elementId,
          selector: cand.selector,
          value: decision.value,
          url: decision.action === 'navigate' ? cand.href : undefined,
        };

        const shotBeforeRel = path.join('screenshots', `${globalStep}_before.png`);
        await page.screenshot({ path: path.join(OUTPUT_DIR, shotBeforeRel) }).catch(() => {});
        const { url: fromUrl, title: fromTitle } = await getPageMeta(page);

        let execError = null;
        try {
          await executeAction(page, execAction);
          await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(1500);
        } catch (err) {
          execError = err.message;
        }

        const shotAfterRel = path.join('screenshots', `${globalStep}_after.png`);
        await page.screenshot({ path: path.join(OUTPUT_DIR, shotAfterRel) }).catch(() => {});
        const { url: toUrl, title: toTitle } = await getPageMeta(page);

        const targetElement = current.elements.find(el => el.selector === cand.selector) || null;

        const transition = {
          from_state: current.state.state_id,
          action: {
            type: decision.action,
            target: cand.selector,
            value: decision.value || null,
          },
          to_state: null,
          result: execError ? 'error' : 'success',
          error: execError,
          url_after: toUrl,
          timestamp: new Date().toISOString(),
        };
        transitions.push(transition);

        storeStep(memoryLog, {
          step: globalStep,
          state_id: transition.from_state,
          parent_state_id: current.state.parent_state_id,
          from_url: fromUrl, from_title: fromTitle,
          action: decision.action,
          action_details: { type: decision.action, target: cand.selector, value: decision.value || '' },
          target: cand.selector,
          value: decision.value || '',
          target_element_details: targetElement || { selector: cand.selector },
          to_url: toUrl, to_title: toTitle,
          success: !execError,
          error: execError,
          elements_observed: current.elements.length,
          screenshot_before: path.relative(path.dirname(MEMORY_LOG_PATH), path.join(OUTPUT_DIR, shotBeforeRel)),
          screenshot_after: path.relative(path.dirname(MEMORY_LOG_PATH), path.join(OUTPUT_DIR, shotAfterRel)),
        });

        if (execError) {
          warnings.push(`Step ${globalStep} (${decision.action}): ${execError}`);
          console.log(`[explore] Action failed: ${execError.slice(0, 100)}`);
          continue;
        }

        // Fingerprint the post-action state.
        const nextRaw = await getDOMElements(page).catch(() => []);
        const nextElements = preprocessDOM(nextRaw);
        const nextFingerprint = await fingerprintState(page, nextElements);

        if (visitedFingerprints.has(nextFingerprint)) {
          transition.result = 'repeated_state_skipped';
          console.log('[explore] Repeated state — going back.');
          if (toUrl !== fromUrl) {
            await page.goBack({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
            await page.waitForTimeout(1200);
          }
          persistIncremental();
          continue;
        }

        const next = {
          state_id: nextStateId(),
          parent_state_id: current.state.state_id,
          url: toUrl,
          title: toTitle,
          label: `after_${decision.action}`,
          fingerprint: nextFingerprint,
          elements_observed: nextElements.length,
          leading_action: {
            type: decision.action,
            target: cand.selector,
            value: decision.value || null,
          },
          timestamp: new Date().toISOString(),
        };
        visitedFingerprints.set(nextFingerprint, next.state_id);
        states.push(next);
        transition.to_state = next.state_id;
        current = {
          state: next,
          elements: nextElements,
          fingerprint: nextFingerprint,
        };
        console.log(`[explore] Step ${globalStep}: ${decision.action} "${cand.text || cand.selector}" → ${next.state_id} @ ${toUrl}`);
        persistIncremental();
      }

      console.log(`[explore] ✓ Flow "${flow.name}" finished.`);
      if (states.length >= LIMITS.STATES) { terminationReason = 'max_states_reached'; break; }
      if (globalStep >= LIMITS.STEPS)     { terminationReason = 'max_steps_reached'; break; }
    }
  } catch (err) {
    terminationReason = `fatal_error: ${err.message}`;
    warnings.push(err.message);
    console.error('[explore] Fatal:', err.message);
  } finally {
    console.log('\n[explore] ✅ Exploration finished.');
    console.log(`[explore] Total steps logged: ${memoryLog.length}; states: ${states.length}; termination: ${terminationReason}`);
    await browser.close().catch(() => {});

    // Persist all machine-readable artifacts.
    saveLog(memoryLog, MEMORY_LOG_PATH);
    saveStates(states, STATES_PATH);
    saveTransitions(transitions, TRANSITIONS_PATH);

    const uniqueUrls = [...new Set(states.map(s => s.url))];
    const summary = {
      start_url: HOME_URL,
      started_at: new Date(startedAt).toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      limits: LIMITS,
      termination_reason: terminationReason,
      totals: {
        steps: memoryLog.length,
        states: states.length,
        unique_states: visitedFingerprints.size,
        unique_urls: uniqueUrls.length,
        clicks: transitions.filter(t => t.action.type === 'click').length,
        fills: transitions.filter(t => t.action.type === 'fill').length,
        navigates: transitions.filter(t => t.action.type === 'navigate').length,
        repeats_skipped: transitions.filter(t => t.result === 'repeated_state_skipped').length,
        errors: transitions.filter(t => t.result === 'error').length,
      },
      visited_urls: uniqueUrls,
      screenshots_dir: path.relative(path.dirname(MEMORY_LOG_PATH), SCREENSHOT_DIR),
      warnings,
    };
    saveSummary(summary, SUMMARY_PATH);

    // Finally wire in the documented test generator (grounded workflows).
    try {
      await generateTestCases({ memoryLog, transitions });
    } catch (err) {
      console.error(`[explore] Test generation failed: ${err.message}`);
      warnings.push(`test_generation_failed: ${err.message}`);
      summary.warnings = warnings;
      saveSummary(summary, SUMMARY_PATH);
    }

    // Explicit exit — Chromium/Groq SDK handles must not keep the process alive.
    runLogStream.end();
    process.exit(terminationReason.startsWith('fatal_error') ? 1 : 0);
  }
})();
