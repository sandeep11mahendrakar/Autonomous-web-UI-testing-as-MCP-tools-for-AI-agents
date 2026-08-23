/**
 * testGenerator.js
 * Day 3 – Nidhi K
 * Responsibility:
 *   generateTestCases(memoryLog) — calls buildTestCasePrompt (from preprocess.js),
 *   sends to LLM via callLLM() (Navya's), parses the JSON array response,
 *   saves to logs/test_cases.json, and prints a summary.
 *
 * Depends on:
 *   - src/preprocess.js    (buildTestCasePrompt)
 *   - src/llmClient.js     (callLLM — implemented by Navya)
 */

const fs = require('fs');
const path = require('path');
const { buildTestCasePrompt } = require('./preprocess');
const { callLLM } = require('./llmClient');
const { reconstructWorkflows } = require('./exploreHelpers');

// Honors ARCH_A_OUTPUT_DIR so unified runs collect into runs/<id>/dom.
const OUTPUT_DIR = process.env.ARCH_A_OUTPUT_DIR || path.join(__dirname, '..', 'logs');
const TEST_CASES_PATH = path.join(OUTPUT_DIR, 'test_cases.json');

/**
 * generateTestCases(memoryLog)
 *
 * Builds prompt from the completed memory log, calls the LLM,
 * parses the returned JSON array of test cases, and saves to disk.
 *
 * Retry logic: if JSON.parse fails on first attempt, strips markdown
 * fences and retries once. If still fails, logs the raw response and
 * saves an empty array so the pipeline doesn't crash.
 *
 * @param {Array} memoryLog  - Full completed exploration log
 * @returns {Promise<Array>} - Parsed test case array (may be empty on LLM error)
 */
async function generateTestCases(input) {
  const memoryLog = Array.isArray(input) ? input : (input && input.memoryLog) || [];
  const transitions = (!Array.isArray(input) && input && input.transitions) || [];

  if (!memoryLog.length) {
    console.warn('[testGenerator] Memory log is empty — cannot generate test cases.');
    return [];
  }

  console.log(`[testGenerator] Building test case prompt from ${memoryLog.length} steps / ${transitions.length} transitions...`);
  const prompt = buildTestCasePrompt({ memoryLog, transitions });

  let rawResponse = null;
  try {
    rawResponse = await callLLM(prompt);
  } catch (err) {
    // LLM unavailable (rate limit, network, missing key) — fall through to
    // the deterministic grounded fallback instead of producing nothing.
    console.error('[testGenerator] LLM call failed:', err.message);
  }

  // rawResponse may be an already-parsed object (if callLLM returns object)
  // or a raw string. Normalise to string for parsing.
  let testCases = [];

  if (Array.isArray(rawResponse)) {
    // callLLM already parsed it
    testCases = rawResponse;
  } else if (rawResponse !== null && rawResponse !== undefined) {
    const rawStr = typeof rawResponse === 'string'
      ? rawResponse
      : JSON.stringify(rawResponse);

    testCases = _parseTestCasesJSON(rawStr);
  }

  // Validate structure — each entry must have id, objective, steps, expected_result
  testCases = testCases.filter(tc => {
    const valid = tc.id && tc.objective && Array.isArray(tc.steps) && tc.expected_result;
    if (!valid) {
      console.warn(`[testGenerator] Skipping malformed test case:`, JSON.stringify(tc).slice(0, 80));
    }
    return valid;
  });

  // Save to disk
  // Deterministic fallback: if the LLM produced nothing usable, reconstruct
  // test cases DIRECTLY from recorded successful workflows — 100% grounded,
  // zero extra LLM calls.
  if (!testCases.length && transitions.length) {
    console.warn('[testGenerator] No valid LLM test cases — using deterministic grounded fallback.');
    testCases = _deterministicTestCases(memoryLog, transitions);
  }

  _saveTestCases(testCases);

  // Print summary
  console.log(`\n[testGenerator] ✓ Generated ${testCases.length} test case(s):`);
  testCases.forEach(tc => {
    console.log(`  [${tc.id}] ${tc.objective} (${tc.steps.length} steps)`);
  });

  return testCases;
}

/**
 * _deterministicTestCases(memoryLog, transitions)
 * Reconstructs consecutive successful transitions into multi-step replayable
 * test cases. Every selector/URL/value comes verbatim from recorded history —
 * nothing can be invented.
 */
function _deterministicTestCases(memoryLog, transitions) {
  const workflows = reconstructWorkflows(transitions);

  return workflows.map((wf, i) => ({
    id: `TC${String(i + 1).padStart(3, '0')}`,
    objective: `Replay the recorded workflow (${wf.map(t => t.action.type).join(' → ')}), ending at ${wf[wf.length - 1].url_after}`,
    source: 'deterministic_fallback',
    steps: wf.map((t, j) => ({
      stepNum: j + 1,
      action: t.action.type,
      selector: t.action.target,
      value: t.action.value || '',
      description: `${t.action.type} ${t.action.target}${t.action.value ? ` with "${t.action.value}"` : ''}`,
    })),
    expected_result: `All ${wf.length} steps execute without errors; final page loads at ${wf[wf.length - 1].url_after}`,
  }));
}

/**
 * _parseTestCasesJSON(rawStr)
 * Attempts JSON.parse on raw LLM output.
 * Strips markdown code fences if present and retries once.
 *
 * @param {string} rawStr
 * @returns {Array}
 */
function _parseTestCasesJSON(rawStr) {
  // Attempt 1: direct parse
  try {
    const parsed = JSON.parse(rawStr);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (_) {
    // Attempt 2: strip markdown fences (```json ... ```)
    const stripped = rawStr
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    try {
      const parsed = JSON.parse(stripped);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (err2) {
      console.error('[testGenerator] JSON parse failed after stripping fences:', err2.message);
      // Save raw response for debugging (inside this run's output dir)
      const debugPath = path.join(OUTPUT_DIR, 'test_cases_raw_response.txt');
      try {
        fs.mkdirSync(path.dirname(debugPath), { recursive: true });
        fs.writeFileSync(debugPath, rawStr, 'utf8');
        console.error(`[testGenerator] Raw LLM response saved to ${debugPath}`);
      } catch (_) {}
      return [];
    }
  }
}

/**
 * _saveTestCases(testCases)
 * Writes test case array to logs/test_cases.json.
 *
 * @param {Array} testCases
 */
function _saveTestCases(testCases) {
  const dir = path.dirname(TEST_CASES_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TEST_CASES_PATH, JSON.stringify(testCases, null, 2), 'utf8');
  console.log(`[testGenerator] Saved → ${TEST_CASES_PATH}`);
}

module.exports = { generateTestCases, _deterministicTestCases };
