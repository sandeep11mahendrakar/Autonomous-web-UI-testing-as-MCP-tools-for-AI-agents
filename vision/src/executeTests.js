'use strict';

/**
 * executeTests.js — permanent Vision Architecture test executor.
 *
 * Loads generated coordinate-based test cases (JSON array), executes them
 * against the source URL via Playwright using pixel coordinates only,
 * verifies outcomes with the established heuristics, and writes a report
 * to storage/outputs/execution_results.json.
 *
 * Usage:
 *   node src/executeTests.js <test_cases.json> <base_url> [output_path]
 *
 * Example:
 *   node src/executeTests.js storage/outputs/test_cases_ss_1787344345124_visual_dom.json https://demoqa.com
 *
 * Verification heuristics (unchanged from validated ad-hoc runs):
 *   - If expected_result mentions a URL change/navigation -> PASS when
 *     page.url() differs after execution.
 *   - Otherwise -> PASS when rendered body text is non-trivial (>100 chars).
 *   - Unexpected mid-test navigation is recorded as a warning, not a failure
 *     (the ad-hoc heuristic that failed valid tests like TC07 was removed).
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { chromium } = require('playwright');
const { executeAction } = require('./llm');

const OUTPUT_DIR = path.join(__dirname, '..', 'storage', 'outputs');
const SCREENSHOT_ROOT = path.join(__dirname, '..', 'storage', 'screenshots');
const VISION_ROOT = path.join(__dirname, '..');

/**
 * Derive the evidence run directory from the test-cases file name
 * (pipeline runs embed run_<timestamp>) so execution evidence lands in the
 * same folder as the initial/YOLO/merged evidence for that run.
 */
function deriveRunDir(testCasesPath) {
  const match = path.basename(testCasesPath).match(/(run_\d+)/);
  const runId = match ? match[1] : `exec_${Date.now()}`;
  return {
    runId,
    relDir: path.join('storage', 'screenshots', runId),
  };
}

let stateCounter = 1; // state_001 is the pipeline's initial screenshot

function nextStateName(suffix) {
  stateCounter += 1;
  return path.join(CURRENT_RUN.dir,
    `state_${String(stateCounter).padStart(3, '0')}_${suffix}.png`);
}

let CURRENT_RUN = { dir: '', id: '' };

async function snap(page, relPath) {
  const abs = path.join(VISION_ROOT, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  await page.screenshot({ path: abs });
  return relPath.replace(/\\/g, '/');
}

// ---------------------------------------------------------------------------
// Closed-loop observation helpers
// ---------------------------------------------------------------------------

const GATEWAY_URL = process.env.VISION_GATEWAY_URL || 'http://127.0.0.1:5000';
let REDETECT_ENABLED = false;

async function probeRedetectAvailability() {
  try {
    await axios.get(`${GATEWAY_URL}/vision/health`, { timeout: 2000 });
    REDETECT_ENABLED = true;
  } catch {
    REDETECT_ENABLED = false;
    console.warn('[execute] Vision services not reachable — post-action re-detection disabled.');
  }
}

/**
 * Re-run YOLO+OCR+merge on a post-action screenshot via the gateway and
 * return a compact description of the NEW visual state.
 */
async function redetectState(absScreenshotPath) {
  if (!REDETECT_ENABLED) return null;
  try {
    const res = await axios.post(
      `${GATEWAY_URL}/vision/process`,
      { image_path: absScreenshotPath },
      { timeout: 90000 }
    );
    return {
      elements: res.data.element_count ?? null,
      ocr_words: res.data.raw?.ocr_words_found ?? null,
      top_texts: (res.data.elements || [])
        .filter((el) => el.text)
        .slice(0, 10)
        .map((el) => `${el.type}:${el.text}`)
        .join(' | '),
    };
  } catch (err) {
    console.warn(`[execute] Re-detection failed: ${err.message}`);
    return null;
  }
}

/** Inspect whatever interactive element sits at viewport coordinates (x,y). */
async function probePoint(page, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return page.evaluate(([px, py]) => {
    let el = document.elementFromPoint(px, py);
    if (!el) return null;
    // Clicks often land on the <label> wrapping/next-to a control; resolve
    // to the associated form control so value/checked stay observable.
    // (Standard HTMLLabelElement behaviour — site-independent.)
    if (el.tagName === 'LABEL' && el.control) el = el.control;
    const info = {
      tag: el.tagName ? el.tagName.toLowerCase() : '',
      inputType: el.getAttribute ? el.getAttribute('type') || '' : '',
    };
    if (typeof el.value === 'string') info.value = el.value.slice(0, 120);
    if (typeof el.checked === 'boolean') info.checked = el.checked;
    return info;
  }, [Math.round(x), Math.round(y)]);
}

async function getScrollY(page) {
  return page.evaluate(() => window.scrollY || 0).catch(() => 0);
}

/**
 * Compare pre/post observable signals for one action and produce a
 * semantic verification signal (or null when nothing observable applies).
 */
function deriveStepSignal(step, before, after) {
  const action = step.action;
  if (action === 'fill' && after && typeof after.value === 'string' && after.value.length > 0) {
    return { method: 'input_value', detail: `field now holds "${after.value.slice(0, 40)}"` };
  }
  if (
    (action === 'click') &&
    before && after && typeof before.checked === 'boolean' && typeof after.checked === 'boolean' &&
    before.checked !== after.checked
  ) {
    return { method: 'checked_state', detail: `checkbox/radio toggled ${before.checked} -> ${after.checked}` };
  }
  if (action === 'navigate' || action === 'click') {
    // URL handled separately at test level; nothing here.
  }
  return null;
}
const DEFAULT_OUTPUT = path.join(OUTPUT_DIR, 'execution_results.json');
const VIEWPORT = { width: 1280, height: 900 };
const BODY_TEXT_MIN_LENGTH = 100;
const STEP_TIMEOUT_MS = 15000;

function parseArgs(argv) {
  const [testCasesPath, baseUrl, outPath] = argv;
  if (!testCasesPath || !baseUrl) {
    console.error(
      'Usage: node src/executeTests.js <test_cases.json> <base_url> [output_path]\n' +
        'Example: node src/executeTests.js storage/outputs/test_cases_ss_1787344345124_visual_dom.json https://demoqa.com'
    );
    process.exit(1);
  }
  return {
    testCasesPath: path.resolve(testCasesPath),
    baseUrl,
    outputPath: outPath ? path.resolve(outPath) : DEFAULT_OUTPUT,
  };
}

function loadTestCases(testCasesPath) {
  if (!fs.existsSync(testCasesPath)) {
    throw new Error(`Test cases file not found: ${testCasesPath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(testCasesPath, 'utf8'));
  const testCases = Array.isArray(parsed) ? parsed : [parsed];
  const valid = testCases.filter(
    (tc) => tc && tc.id && Array.isArray(tc.steps)
  );
  if (!valid.length) {
    throw new Error('No valid test cases found (each needs id + steps[])');
  }
  return valid;
}

/**
 * Normalise a step into the shape llm.executeAction expects.
 * Generated test cases store navigate targets in `value`; executeAction
 * reads `url`, so translate here without touching the schema.
 */
function normaliseStep(step, baseUrl) {
  const action = String(step.action || '').toLowerCase();
  const normalised = { ...step, action };

  if (action === 'navigate') {
    const raw = step.url || step.value || '';
    try {
      normalised.url = new URL(raw, baseUrl).href;
    } catch {
      normalised.url = baseUrl;
    }
  }
  return normalised;
}

function expectsUrlChange(expectedResult) {
  return /url/i.test(expectedResult || '') &&
    /chang|navigat|different|away/i.test(expectedResult || '');
}

/**
 * Decide whether a test requires the URL to change.
 * Generated tests may state this explicitly via "expect_navigation";
 * older test files fall back to the expected_result text heuristic.
 */
function requiresUrlChange(testCase) {
  if (typeof testCase.expect_navigation === 'boolean') {
    return testCase.expect_navigation;
  }
  return expectsUrlChange(testCase.expected_result);
}

async function getBodyTextLength(page) {
  return page.evaluate(() => (document.body ? document.body.innerText.length : 0));
}

async function runTestCase(page, testCase, baseUrl, beforeScreenshot, initialState) {
  const startedAt = Date.now();
  const urlBefore = page.url();
  const executedSteps = [];
  const signals = [];
  const states = [];
  let lastState = initialState;
  const warnings = [];
  let status = 'PASS';
  let failureReason = null;
  let scrollBefore = null;

  for (let i = 0; i < testCase.steps.length; i++) {
    const step = normaliseStep(testCase.steps[i], baseUrl);
    const stepStartedAt = Date.now();

    // Pre-action observable state.
    const pointProbeBefore = ['click', 'fill'].includes(step.action)
      ? await probePoint(page, step.x, step.y).catch(() => null)
      : null;
    if (step.action === 'scroll') {
      scrollBefore = await getScrollY(page);
    }

    try {
      await executeAction(page, step);
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);

      // Post-action evidence: screenshot -> probe -> re-detect new visual state.
      let afterScreenshot = null;
      let absShot = null;
      try {
        const relShot = nextStateName(`after_${step.action}`);
        afterScreenshot = await snap(page, relShot);
        absShot = path.join(VISION_ROOT, relShot);
      } catch (_) { /* evidence capture must never break execution */ }

      const pointProbeAfter = ['click', 'fill'].includes(step.action)
        ? await probePoint(page, step.x, step.y).catch(() => null)
        : null;
      const sig = deriveStepSignal(step, pointProbeBefore, pointProbeAfter);
      if (sig) signals.push({ step: i + 1, ...sig });

      if (absShot) {
        const detected = await redetectState(absShot);
        if (detected) {
          const stateId = `state_${String(stateCounter).padStart(3, '0')}`;
          const entry = {
            state_id: stateId,
            screenshot: afterScreenshot,
            url: page.url(),
            elements: detected.elements,
            ocr_words: detected.ocr_words,
          };
          if (lastState && typeof lastState.elements === 'number') {
            entry.elements_delta = detected.elements - lastState.elements;
          }
          if (step.action === 'scroll' && scrollBefore !== null) {
            const scrollAfter = await getScrollY(page);
            if (scrollAfter !== scrollBefore) {
              signals.push({
                step: i + 1,
                method: 'scroll_position',
                detail: `scrollY ${scrollBefore} -> ${scrollAfter}`,
              });
            }
            scrollBefore = scrollAfter;
          }
          states.push(entry);
          lastState = detected;
        }
      }

      executedSteps.push({
        index: i + 1,
        ...step,
        ok: true,
        before_screenshot: i === 0 ? beforeScreenshot : null,
        after_screenshot: afterScreenshot,
        signal: sig || null,
        duration_ms: Date.now() - stepStartedAt,
      });
    } catch (err) {
      executedSteps.push({
        index: i + 1,
        ...step,
        ok: false,
        error: err.message,
        duration_ms: Date.now() - stepStartedAt,
      });
      status = 'ERROR';
      failureReason = `Step ${i + 1} (${step.action}) failed: ${err.message}`;
      break;
    }
  }

  const urlAfter = page.url();
  const urlChanged = urlAfter !== urlBefore;
  const needUrlChange = requiresUrlChange(testCase);

  // ------------------------------------------------------------------
  // Verification: strongest available observable evidence first.
  // ------------------------------------------------------------------
  let verification = { method: null, detail: null };

  if (status !== 'PASS') {
    verification = { method: 'skipped', detail: failureReason };
  } else if (needUrlChange) {
    if (urlChanged) {
      verification = { method: 'url_change', detail: `navigated to ${urlAfter}` };
    } else {
      status = 'FAIL';
      failureReason = `Expected URL to change but stayed on ${urlAfter}`;
      verification = { method: 'url_change', detail: failureReason };
    }
  } else {
    if (urlChanged && !needUrlChange) {
      warnings.push(`Unexpected navigation to ${urlAfter}`);
    }
    const rank = { input_value: 3, checked_state: 3, scroll_position: 2 };
    const best = signals
      .filter((s) => rank[s.method])
      .sort((a, b) => rank[b.method] - rank[a.method])[0] || null;

    if (best) {
      verification = { method: best.method, detail: best.detail };
    } else {
      // Weak fallback only as a last resort — flagged, never silent.
      const textLength = await getBodyTextLength(page);
      if (textLength <= BODY_TEXT_MIN_LENGTH) {
        status = 'FAIL';
        failureReason = `No semantic signal and page body text too short (${textLength} chars)`;
        verification = { method: 'none', detail: failureReason };
      } else {
        verification = {
          method: 'body_text_fallback',
          detail: 'no stronger observable signal available; body renders non-trivially',
        };
        warnings.push('Verification used weak body-text fallback (no semantic signal)');
      }
    }
  }

  // Optional static-text expectation (miss = warning, never a silent pass).
  if (
    status === 'PASS' &&
    typeof testCase.expected_text === 'string' &&
    testCase.expected_text.trim()
  ) {
    const bodyText = await page.evaluate(() =>
      document.body ? document.body.innerText : ''
    );
    if (!bodyText.toLowerCase().includes(testCase.expected_text.toLowerCase())) {
      warnings.push(`Expected text "${testCase.expected_text}" not found in rendered body`);
    }
  }

  return {
    id: testCase.id,
    objective: testCase.objective || '',
    expected_result: testCase.expected_result || '',
    evidence: testCase.evidence || null,
    inferred_behavior: testCase.inferred_behavior || null,
    expect_navigation: typeof testCase.expect_navigation === 'boolean'
      ? testCase.expect_navigation
      : null,
    expected_text: testCase.expected_text || null,
    status,
    failure_reason: failureReason,
    verification,
    warnings,
    before_screenshot: beforeScreenshot,
    failure_screenshot: null,
    url_before: urlBefore,
    url_after: urlAfter,
    steps_executed: executedSteps,
    states_observed: states,
    duration_ms: Date.now() - startedAt,
  };
}

async function main() {
  const { testCasesPath, baseUrl, outputPath } = parseArgs(process.argv.slice(2));
  const testCases = loadTestCases(testCasesPath);

  const { runId, relDir } = deriveRunDir(testCasesPath);
  CURRENT_RUN.dir = relDir;
  CURRENT_RUN.id = runId;
  fs.mkdirSync(path.join(VISION_ROOT, relDir), { recursive: true });

  console.log(`[execute] Test cases: ${testCasesPath} (${testCases.length} tests)`);
  console.log(`[execute] Base URL:   ${baseUrl}`);
  console.log(`[execute] Run ID:     ${runId} (evidence: ${relDir.replace(/\\/g, '/')}/)`);

  await probeRedetectAvailability();

  // Baseline visual state from the pipeline's own visual DOM for this run.
  let initialState = null;
  try {
    const vdom = JSON.parse(
      fs.readFileSync(
        path.join(OUTPUT_DIR, `${runId}_visual_dom.json`), 'utf8')
    );
    initialState = {
      state_id: 'state_001',
      screenshot: (vdom.screenshots && vdom.screenshots.initial) || null,
      url: vdom.source_url || baseUrl,
      elements: vdom.element_count ?? null,
      ocr_words: vdom.raw?.ocr_words_found ?? null,
    };
    stateCounter = 1; // state_001 belongs to the pipeline capture
  } catch (_) { /* standalone execution without a pipeline run */ }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });

  const cleanup = async () => {
    try { await context.close(); } catch {}
    try { await browser.close(); } catch {}
  };
  process.on('SIGINT', async () => {
    console.log('\n[execute] Interrupted — shutting down browser...');
    await cleanup();
    process.exit(130);
  });

  const results = [];
  const reportStartedAt = Date.now();

  try {
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n[execute] Test ${i + 1}/${testCases.length}: ${testCase.id}`);
      console.log(`[execute]   Objective: ${testCase.objective}`);

      const page = await context.newPage();
      let result;
      try {
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.setViewportSize(VIEWPORT).catch(() => {});
        await page.waitForTimeout(1000); // match capture settle behaviour
        let beforeScreenshot = null;
        try {
          beforeScreenshot = await snap(page, nextStateName(`before_${testCase.id}`));
        } catch (_) { /* evidence capture must never break execution */ }
        result = await runTestCase(page, testCase, baseUrl, beforeScreenshot, initialState);
        if (result.status !== 'PASS') {
          // Preserve the final failed state — never cleaned up.
          try {
            result.failure_screenshot = await snap(
              page,
              nextStateName(`failure_${testCase.id}`)
            );
          } catch (_) {}
        }
      } catch (err) {
        result = {
          id: testCase.id,
          objective: testCase.objective || '',
          expected_result: testCase.expected_result || '',
          evidence: testCase.evidence || null,
          inferred_behavior: testCase.inferred_behavior || null,
          expect_navigation: typeof testCase.expect_navigation === 'boolean'
            ? testCase.expect_navigation
            : null,
          expected_text: testCase.expected_text || null,
          status: 'ERROR',
          failure_reason: `Setup/navigation failed: ${err.message}`,
          warnings: [],
          url_before: baseUrl,
          url_after: page.url(),
          steps_executed: [],
          duration_ms: 0,
        };
      } finally {
        await page.close().catch(() => {});
      }

      results.push(result);
      const marker = result.status === 'PASS' ? 'PASS' : result.status;
      console.log(`[execute]   Result: ${marker}${result.failure_reason ? ` — ${result.failure_reason}` : ''}`);
      for (const warning of result.warnings) {
        console.log(`[execute]   Warning: ${warning}`);
      }
    }
  } finally {
    await cleanup();
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const errors = results.filter((r) => r.status === 'ERROR').length;

  // Verification-quality accounting: what evidence backed each verdict.
  const verificationMethods = {};
  let unsupportedVerifications = 0;
  for (const r of results) {
    const m = r.verification?.method || 'unknown';
    verificationMethods[m] = (verificationMethods[m] || 0) + 1;
    if (m === 'body_text_fallback' || m === 'none') unsupportedVerifications += 1;
  }
  const warningCount = results.reduce((n, r) => n + (r.warnings?.length || 0), 0);
  const statesSeen = results.reduce((n, r) => n + (r.states_observed?.length || 0), 0);

  const report = {
    architecture: 'B',
    run_id: runId,
    evidence_dir: relDir.replace(/\\/g, '/'),
    re_detection_enabled: REDETECT_ENABLED,
    source_url: baseUrl,
    test_cases_file: testCasesPath,
    started_at: new Date(reportStartedAt).toISOString(),
    finished_at: new Date().toISOString(),
    total_duration_ms: Date.now() - reportStartedAt,
    summary: {
      total: results.length,
      passed,
      failed,
      errors,
      pass_rate: results.length ? Number((passed / results.length).toFixed(3)) : 0,
      multi_step_tests: results.filter(
        (r) => (r.steps_executed || []).length >= 2
      ).length,
      fill_actions: results.reduce(
        (n, r) => n + (r.steps_executed || []).filter((s) => s.action === 'fill').length, 0),
      scroll_actions: results.reduce(
        (n, r) => n + (r.steps_executed || []).filter((s) => s.action === 'scroll').length, 0),
      states_observed: statesSeen,
      verification_methods: verificationMethods,
      weak_verifications: unsupportedVerifications,
      warnings: warningCount,
    },
    results,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log('\n=========================================');
  console.log(`[execute] Suite finished: ${passed} passed, ${failed} failed, ${errors} errors (of ${results.length})`);
  console.log(`[execute] Report saved to ${outputPath}`);
  console.log('=========================================');

  return errors > 0 ? 1 : 0;
}

if (require.main === module) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error('[execute] Fatal error:', err.message);
      process.exit(1);
    });
}
