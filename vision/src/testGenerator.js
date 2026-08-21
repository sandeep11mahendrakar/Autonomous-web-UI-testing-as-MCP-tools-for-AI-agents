'use strict';

/**
 * testGenerator.js — Vision Architecture test case generator.
 *
 * Takes a visual DOM, builds a prompt via visualDom.buildTestPrompt,
 * calls llm.callLLM, parses JSON array of test cases,
 * and saves results to storage/outputs/test_cases.json.
 */

const fs = require('fs');
const path = require('path');
const { callLLM, extractJSON } = require('./llm');
const { buildTestPrompt } = require('./visualDom');

const OUTPUT_DIR = path.join(__dirname, '..', 'storage', 'outputs');

function saveTestCases(testCases, sourceFile) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outFile = path.join(
    OUTPUT_DIR,
    `test_cases_${path.basename(sourceFile || 'vision', path.extname(sourceFile || '.json'))}.json`
  );
  fs.writeFileSync(outFile, JSON.stringify(testCases, null, 2));
  return outFile;
}

async function generateTestCases(visualDOM) {
  if (!visualDOM || !Array.isArray(visualDOM.elements)) {
    throw new Error('generateTestCases: visualDOM with elements array required');
  }

  console.log(`[testGenerator] Building prompt from ${visualDOM.elements.length} elements...`);
  const prompt = buildTestPrompt(visualDOM);

  let rawResponse;
  try {
    rawResponse = await callLLM(prompt);
  } catch (err) {
    console.error('[testGenerator] LLM call failed:', err.message);
    return {
      error: 'llm_failed',
      detail: err.message,
      test_cases: [],
    };
  }

  let testCases = extractJSON(rawResponse);
  if (!Array.isArray(testCases)) {
    if (testCases && typeof testCases === 'object') testCases = [testCases];
    else testCases = [];
  }

  testCases = testCases.filter((tc) => tc.id && tc.objective && Array.isArray(tc.steps));
  if (!testCases.length) {
    console.warn('[testGenerator] No valid test cases parsed.');
  }

  const savedPath = saveTestCases(testCases, visualDOM.saved_to);
  console.log(`[testGenerator] Saved ${testCases.length} test cases -> ${savedPath}`);

  return {
    architecture: 'B',
    source_url: visualDOM.source_url || null,
    element_count: visualDOM.elements.length,
    test_case_count: testCases.length,
    test_cases: testCases,
    saved_to: savedPath,
  };
}

module.exports = { generateTestCases };
