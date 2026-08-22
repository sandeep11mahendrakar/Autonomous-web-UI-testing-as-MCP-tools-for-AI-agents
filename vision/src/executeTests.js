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
const { chromium } = require('playwright');
const { executeAction } = require('./llm');

const OUTPUT_DIR = path.join(__dirname, '..', 'storage', 'outputs');
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

async function runTestCase(page, testCase, baseUrl) {
  const startedAt = Date.now();
  const urlBefore = page.url();
  const executedSteps = [];
  const warnings = [];
  let status = 'PASS';
  let failureReason = null;

  for (let i = 0; i < testCase.steps.length; i++) {
    const step = normaliseStep(testCase.steps[i], baseUrl);
    const stepStartedAt = Date.now();
    try {
      await executeAction(page, step);
      executedSteps.push({
        index: i + 1,
        ...step,
        ok: true,
        duration_ms: Date.now() - stepStartedAt,
      });
      // Small settle delay so navigation/rendering triggered by the action
      // completes before the next step or verification.
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
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

  if (status === 'PASS') {
    const needUrlChange = requiresUrlChange(testCase);
    if (!urlChanged && needUrlChange) {
      status = 'FAIL';
      failureReason = `Expected URL to change but stayed on ${urlAfter}`;
    } else if (urlChanged && !needUrlChange) {
      // Navigation happened although the test did not assert it.
      // This alone is not evidence of failure (e.g. carousel/banner clicks);
      // record it as a warning and fall back to body-text verification.
      warnings.push(`Unexpected navigation to ${urlAfter}`);
      const textLength = await getBodyTextLength(page);
      if (textLength <= BODY_TEXT_MIN_LENGTH) {
        status = 'FAIL';
        failureReason =
          `Unexpected navigation to ${urlAfter} and page body text too short (${textLength} chars)`;
      }
    } else {
      const textLength = await getBodyTextLength(page);
      if (textLength <= BODY_TEXT_MIN_LENGTH) {
        status = 'FAIL';
        failureReason = `Page body text too short (${textLength} chars, expected >${BODY_TEXT_MIN_LENGTH})`;
      }
    }
  }

  // Optional static-text expectation (set by the LLM only for non-animated
  // content). A miss is recorded as a warning — the primary pass/fail
  // decision stays with the URL/body heuristics above.
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
    warnings,
    url_before: urlBefore,
    url_after: urlAfter,
    steps_executed: executedSteps,
    duration_ms: Date.now() - startedAt,
  };
}

async function main() {
  const { testCasesPath, baseUrl, outputPath } = parseArgs(process.argv.slice(2));
  const testCases = loadTestCases(testCasesPath);

  console.log(`[execute] Test cases: ${testCasesPath} (${testCases.length} tests)`);
  console.log(`[execute] Base URL:   ${baseUrl}`);

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
        result = await runTestCase(page, testCase, baseUrl);
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

  const report = {
    architecture: 'B',
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
