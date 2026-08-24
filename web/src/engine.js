'use strict';

/**
 * engine.js — reusable exploration SESSION for Architecture A.
 *
 * Extracted capability-set of explore.js into a class whose browser and
 * memory PERSIST across flows, so an interactive driver (interactive.js) can
 * issue multiple directed explorations in one live session.
 *
 * Reuses existing modules only: domExtractor, preprocess, llmClient,
 * memoryLog, exploreHelpers, testGenerator. explore.js remains the untouched
 * one-shot campaign runner.
 */

const path = require('path');
const fs = require('fs');

class ExploreSession {
  /**
   * @param {object} opts
   *   headless    boolean (default true)
   *   outputDir   artifact directory (default web/logs)
   *   seed        {username,password} | null
   */
  constructor(opts = {}) {
    this.headless = opts.headless !== false;
    this.seed = opts.seed || null;
    this.homeUrl = null;

    this.outputDir = opts.outputDir || path.join(__dirname, '..', 'logs');
    this.screenshotDir = path.join(this.outputDir, 'screenshots');
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.mkdirSync(this.screenshotDir, { recursive: true });

    this.browser = null;
    this.page = null;

    // Session-wide memory (survives across flows within one session).
    this.memoryLog = [];
    this.states = [];
    this.transitions = [];
    this.visitedFingerprints = new Map();
    this.triedActions = new Set();
    this.actionsPerState = new Map();
    this.stateCounter = 0;
    this.globalStep = 0;
    this.currentFingerprint = null;
    this.currentElements = [];

    this.limits = {
      quick:     { steps: 8,  states: 6,  depth: 4,  perState: 2 },
      standard:  { steps: 16, states: 10, depth: 6,  perState: 3 },
      extensive: { steps: 32, states: 15, depth: 10, perState: 5 },
    };
  }

  // ── lifecycle ────────────────────────────────────────────────────────────

  async launch(startUrl) {
    const { chromium } = require('playwright');
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: this.headless });
      this.page = await this.browser.newPage();
      await this._installAdBlock(this.page);
      await this.page.setViewportSize({ width: 1280, height: 900 });
    }
    if (startUrl) {
      this.homeUrl = startUrl;
      await this.gotoPage(startUrl);
    }
    return this;
  }

  async _installAdBlock(page) {
    await page.route('**/*', route => {
      const url = route.request().url();
      const blocked = [
        'googlesyndication', 'googletagmanager', 'adsbygoogle', 'doubleclick',
        'google-analytics', 'googletagservices', 'amazon-adsystem', 'adnxs',
        'adsystem', 'moatads', 'scorecardresearch', 'outbrain', 'taboola',
        'disqus', 'cdn.carbonads', 'media.net',
      ];
      if (blocked.some(b => url.includes(b))) route.abort();
      else route.continue();
    });
  }

  /** networkidle never settles on heavy SPAs — fall back to domcontentloaded. */
  async gotoPage(url) {
    try {
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (err) {
      if (!/Timeout.*exceeded/i.test(err.message)) throw err;
      console.warn(`[engine] networkidle timeout on ${url} — falling back to domcontentloaded.`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.page.waitForTimeout(6000);
    }
    await this.page.waitForTimeout(2000);
  }

  async relaunch(headless) {
    this.headless = !!headless;
    const currentUrl = this.page ? this.page.url() : this.homeUrl;
    if (this.browser) await this.browser.close().catch(() => {});
    this.browser = null;
    this.page = null;
    await this.launch(currentUrl);
  }

  async close() {
    if (this.browser) await this.browser.close().catch(() => {});
    this.browser = null;
    this.page = null;
  }

  // ── perception ───────────────────────────────────────────────────────────

  async captureState(label, leadingAction, parentId) {
    const { getDOMElements, getPageMeta } = require('./domExtractor');
    const { preprocessDOM } = require('./preprocess');
    const shotBase = `${this.globalStep + 1}_${label}`;
    const shotPath = path.join(this.screenshotDir, `${shotBase}.png`);
    await this.page.screenshot({ path: shotPath }).catch(() => {});

    const rawElements = await getDOMElements(this.page).catch(() => []);
    const meta = await getPageMeta(this.page);
    const elements = preprocessDOM(rawElements);
    const fingerprint = await this.fingerprint(elements);

    const state = {
      state_id: this.nextStateId(),
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

  async fingerprint(elements) {
    const { hashStr, normText } = require('./exploreHelpers');
    const visibleText = await this.page.evaluate(
      () => (document.body ? document.body.innerText : '').slice(0, 4000)
    ).catch(() => '');
    const elemSig = elements
      .map(el => `${el.tag}|${el.inputType || ''}|${el.name || ''}|${normText(el.text).slice(0, 40)}`)
      .sort()
      .join('|');
    const u = new URL(this.page.url());
    return `${u.origin}${u.pathname.replace(/\/$/, '')}|${hashStr(normText(visibleText))}|${hashStr(elemSig)}`;
  }

  nextStateId() {
    this.stateCounter += 1;
    return `state_${String(this.stateCounter).padStart(3, '0')}`;
  }

  // ── decision ─────────────────────────────────────────────────────────────

  async decideAction(candidates, flowName, directive) {
    const { callLLM, parseAction } = require('./llmClient');
    const { buildExplorationPrompt } = require('./preprocess');

    let pageText = '';
    try {
      pageText = await this.page.evaluate(() =>
        (document.body ? document.body.innerText : ''));
    } catch (_) {}

    const prompt = buildExplorationPrompt(
      candidates.map(c => ({ ...c, elementId: c.elementId })),
      this.memoryLog, flowName, pageText,
      this.seed && this.seed.username && this.seed.password ? this.seed : null,
      directive || null
    );

    const attempt = async (forbidDone) => {
      const raw = await callLLM(prompt + (forbidDone
        ? '\nIMPORTANT: untried candidates ARE available — "done" is NOT acceptable right now.'
        : ''));
      const parsed = parseAction(raw);
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
      console.log(`[engine] LLM failed (${err.message.slice(0, 80)}) — deterministic fallback.`);
      decision = { action: 'done', chosen: null, value: '', reason: 'llm_error' };
    }
    if ((decision.action === 'done' || !decision.chosen)) {
      const untried = candidates.filter(c => !c.alreadyTried);
      if (untried.length) {
        try {
          decision = await attempt(true);
        } catch (_) {
          decision = { action: 'done', chosen: null, value: '', reason: 'llm_error_retry' };
        }
        // Deterministic fallback keeps directed flows moving when the LLM
        // insists on done or returns garbage.
        if ((decision.action === 'done' || !decision.chosen) && untried.length) {
          const pick = untried[0];
          let act;
          if (pick.tag === 'A') act = 'navigate';
          else if (pick.tag === 'INPUT' || pick.tag === 'TEXTAREA') act = pick.isDropdown ? 'select_option' : 'fill';
          else if (pick.tag === 'SELECT') act = 'select_option';
          else act = 'click';
          let val = pick.placeholder || pick.text || 'test_input';
          if (act === 'fill' && this.seed && this.seed.username) {
            const s = `${pick.selector} ${pick.placeholder || ''}`.toLowerCase();
            if (s.includes('password')) val = this.seed.password;
            else if (/user|name|mail/.test(s)) val = this.seed.username;
          }
          decision = { action: act, chosen: pick, value: val, reason: 'deterministic_fallback', fallback: true };
        }
      }
    }
    return decision;
  }

  // ── one exploration step ─────────────────────────────────────────────────

  /**
   * Execute ONE action cycle against current state.
   * @returns {{done:boolean, reason?:string, adopted?:boolean}}
   */
  async step(flowName, limit, directive) {
    const fp = this.currentFingerprint;
    const used = this.actionsPerState.get(fp) || 0;
    if (used >= limit.perState) return { done: true, reason: 'max_actions_per_state' };

    const { buildCandidates } = require('./exploreHelpers');
    const candidates = buildCandidates(this.currentElements, this.triedActions, fp);
    if (!candidates.length) return { done: true, reason: 'no_candidates' };

    this.globalStep += 1;
    console.log(`\n[engine] ══ Step ${this.globalStep} (flow: ${flowName}) ══`);

    const decision = await this.decideAction(candidates, flowName, directive);
    if (decision.action === 'done' || !decision.chosen) {
      return { done: true, reason: decision.reason || 'llm_done' };
    }
    this.actionsPerState.set(fp, used + 1);

    const cand = decision.chosen;
    this.triedActions.add(`${fp}|${cand.selector}`);
    const execAction = {
      action: decision.action,
      elementId: cand.elementId,
      selector: cand.selector,
      value: decision.value,
      url: decision.action === 'navigate' ? cand.href : undefined,
    };

    const shotBeforeRel = path.join('screenshots', `${this.globalStep}_before.png`);
    await this.page.screenshot({ path: path.join(this.outputDir, shotBeforeRel) }).catch(() => {});
    const { getPageMeta } = require('./domExtractor');
    const { url: fromUrl, title: fromTitle } = await getPageMeta(this.page);

    let execError = null;
    try {
      const { executeAction } = require('./llmClient');
      await executeAction(this.page, execAction);
      await this.page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
      await this.page.waitForTimeout(1500);
    } catch (err) {
      execError = err.message;
    }

    const shotAfterRel = path.join('screenshots', `${this.globalStep}_after.png`);
    await this.page.screenshot({ path: path.join(this.outputDir, shotAfterRel) }).catch(() => {});
    const { url: toUrl, title: toTitle } = await getPageMeta(this.page);

    const targetElement = this.currentElements.find(el => el.selector === cand.selector) || null;

    const transition = {
      from_state: this.states.find(s => s.fingerprint === fp)?.state_id || null,
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
    this.transitions.push(transition);

    const { storeStep } = require('./memoryLog');
    storeStep(this.memoryLog, {
      step: this.globalStep,
      state_id: transition.from_state,
      parent_state_id: this.states.find(s => s.fingerprint === fp)?.parent_state_id || null,
      from_url: fromUrl, from_title: fromTitle,
      action: decision.action,
      action_details: { type: decision.action, target: cand.selector, value: decision.value || '' },
      target: cand.selector,
      value: decision.value || '',
      target_element_details: targetElement || { selector: cand.selector },
      to_url: toUrl, to_title: toTitle,
      success: !execError,
      error: execError,
      elements_observed: this.currentElements.length,
      screenshot_before: path.relative(path.join(this.outputDir), path.join(this.outputDir, shotBeforeRel)),
      screenshot_after: path.relative(path.join(this.outputDir), path.join(this.outputDir, shotAfterRel)),
    });

    if (execError) {
      console.log(`[engine] Action failed: ${execError.slice(0, 100)}`);
      return { done: false, error: execError };
    }

    // External-domain scope guard (same policy as the campaign runner).
    let homeOrigin = ''; try { homeOrigin = new URL(this.homeUrl).origin; } catch (_) {}
    let toOrigin = ''; try { toOrigin = new URL(toUrl).origin; } catch (_) {}
    if (homeOrigin && toOrigin && toOrigin !== homeOrigin) {
      transition.result = 'external_domain_skipped';
      console.log(`[engine] ⛔ External domain (${toOrigin}) — out of scope, going back.`);
      if (toUrl !== fromUrl) {
        await this.page.goBack({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await this.page.waitForTimeout(1200);
      }
      return { done: false, externalBlocked: true };
    }

    // Fingerprint post-action state.
    const { getDOMElements } = require('./domExtractor');
    const { preprocessDOM } = require('./preprocess');
    const nextRaw = await getDOMElements(this.page).catch(() => []);
    const nextElements = preprocessDOM(nextRaw);
    const nextFingerprint = await this.fingerprint(nextElements);

    if (this.visitedFingerprints.has(nextFingerprint)) {
      transition.result = 'repeated_state_skipped';
      console.log('[engine] Repeated state — going back.');
      if (toUrl !== fromUrl) {
        await this.page.goBack({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await this.page.waitForTimeout(1200);
      }
      return { done: false, repeated: true };
    }

    const nextStateId = this.nextStateId();
    const next = {
      state_id: nextStateId,
      parent_state_id: this.states.find(s => s.fingerprint === fp)?.state_id || null,
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
    this.visitedFingerprints.set(nextFingerprint, nextStateId);
    this.states.push(next);
    transition.to_state = nextStateId;
    this.currentFingerprint = nextFingerprint;
    this.currentElements = nextElements;
    console.log(`[engine] Step ${this.globalStep}: ${decision.action} "${cand.text || cand.selector}" → ${nextStateId} @ ${toUrl}`);
    this.persist();
    return { done: false, adopted: true };
  }

  // ── flows ────────────────────────────────────────────────────────────────

  /** Effort inference from free text — "quickly check" vs "extensively test". */
  static effortFromText(text) {
    const t = String(text || '').toLowerCase();
    if (/\b(quick|fast|simple|just|brief|basic)\b/.test(t)) return 'quick';
    if (/\b(extensive|thorough|deep|detailed|comprehensive|full|all|complete)\b/.test(t)) return 'extensive';
    return 'standard';
  }

  /** Directive enrichment: effort level tells the model HOW MUCH to do. */
  static enrichDirective(directive, effort) {
    if (!directive) return null;
    const base = String(directive).trim();
    if (effort === 'extensive') {
      return base +
        '\nPerform EXTENSIVE testing of this target: reach it through every plausible path, exercise positive AND negative cases ' +
        '(invalid inputs, empty submits, boundary values), repeat key interactions, and verify resulting states. Do NOT stop early.';
    }
    if (effort === 'quick') {
      return base +
        '\nPerform a QUICK check of this target: reach it directly, exercise its primary happy path once, then stop.';
    }
    return base +
      '\nExercise this target thoroughly along its main user path, plus one variation if obvious.';
  }

  /**
   * Run a flow. When `goalDirective` is set the LLM is steered toward the
   * user's feature/page instead of generic goals.
   */
  async runFlow({ name = 'session-flow', url = null, goalDirective = null, effort = 'standard' }) {
    const limit = typeof effort === 'string'
      ? (this.limits[effort] || this.limits.standard)
      : effort;

    if (url) await this.gotoPage(url);

    // Capture/refresh current state.
    const first = await this.captureState('initial', { type: 'navigate', target: url || this.page.url() }, null);
    if (!this.visitedFingerprints.has(first.fingerprint)) {
      this.visitedFingerprints.set(first.fingerprint, first.state.state_id);
      this.states.push(first.state);
    } else {
      // Restore element table for a known fingerprint.
      first.elements = this.currentElements.length && this.currentFingerprint === first.fingerprint
        ? this.currentElements : first.elements;
    }
    this.currentFingerprint = first.fingerprint;
    this.currentElements = first.elements;

    const enriched = ExploreSession.enrichDirective(goalDirective, effort);
    if (enriched) console.log(`[engine] ▶ Directed flow "${name}" [${typeof effort === 'string' ? effort : 'custom'}]: ${goalDirective}`);

    const startSteps = this.globalStep;
    let stopReason = 'limit_reached';
    while (this.globalStep - startSteps < limit.steps &&
           this.states.length < limit.states) {
      const r = await this.step(name, limit, enriched);
      if (r.done) { stopReason = r.reason || 'done'; break; }
    }

    console.log(`\n[engine] ✓ Flow "${name}" finished (${stopReason}). ` +
      `Session totals: ${this.globalStep} steps, ${this.states.length} states.`);
    this.persist();
    return { stopReason, steps: this.globalStep - startSteps };
  }

  // ── persistence & reporting ──────────────────────────────────────────────

  persist() {
    try {
      const { saveLog, saveStates, saveTransitions } = require('./memoryLog');
      saveLog(this.memoryLog, path.join(this.outputDir, 'memory_log.json'));
      saveStates(this.states, path.join(this.outputDir, 'states.json'));
      saveTransitions(this.transitions, path.join(this.outputDir, 'transitions.json'));
    } catch (err) {
      console.error(`[engine] Persist failed: ${err.message}`);
    }
  }

  async generateTests() {
    const { generateTestCases } = require('./testGenerator');
    try {
      const tcs = await generateTestCases({ memoryLog: this.memoryLog, transitions: this.transitions });
      return tcs;
    } catch (err) {
      console.error(`[engine] Test generation failed: ${err.message}`);
      return [];
    }
  }

  loadGeneratedTests() {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.outputDir, 'test_cases.json'), 'utf8'));
    } catch (_) { return []; }
  }

  status() {
    const lastActions = this.memoryLog.slice(-5).map(m =>
      `${m.action}@${String(m.target_element_details?.selector || m.target).slice(0, 30)}${m.success ? '' : ' ✖'}`);
    return {
      url: this.page ? this.page.url() : '(no page)',
      headless: this.headless,
      total_steps: this.globalStep,
      states: this.states.length,
      transitions: this.transitions.length,
      generated_tests: this.loadGeneratedTests().length,
      recent_actions: lastActions,
    };
  }

  listStates() {
    return this.states.map(s => ({
      id: s.state_id, url: s.url, title: s.title,
      elements: s.elements_observed, via: s.leading_action?.type || '-',
    }));
  }

  // ── live test execution ──────────────────────────────────────────────────

  /**
   * Execute generated A-format test cases LIVE in this session's page.
   * Auto-execution target for directed `test` commands.
   */
  async executeTestCase(tc) {
    const { executeAction } = require('./llmClient');
    const result = { id: tc.id, objective: tc.objective, status: 'PASS', steps: [] };
    console.log(`\n[engine-runner] ▶ ${tc.id}: ${tc.objective}`);
    for (const s of tc.steps || []) {
      const rec = { step: s.stepNum, action: s.action, selector: s.selector, result: 'PASS' };
      try {
        const execAction = {
          action: s.action,
          selector: s.selector,
          value: s.value || '',
          url: s.url || (s.action === 'navigate' ? s.selector : undefined),
        };
        if (s.action === 'navigate' && !s.url) {
          // Some generators put the URL in the selector field.
          execAction.url = s.selector && /^https?:/.test(s.selector) ? s.selector : undefined;
        }
        await executeAction(this.page, execAction);
        await this.page.waitForTimeout(1000);
        rec.detail = 'executed';
      } catch (err) {
        rec.result = 'FAIL';
        rec.detail = String(err.message).slice(0, 120);
        result.status = 'FAIL';
      }
      console.log(`[engine-runner]   step ${rec.step} ${rec.action.padEnd(8)} ${String(rec.selector || '').slice(0, 40).padEnd(42)} → ${rec.result}${rec.result === 'FAIL' ? ' (' + rec.detail + ')' : ''}`);
      result.steps.push(rec);
    }
    console.log(`[engine-runner] RESULT ${tc.id}: ${result.status}`);
    return result;
  }
}

module.exports = { ExploreSession };
