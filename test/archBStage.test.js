'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  isValidExplorationTestCases,
  selectExplorationTestCases,
  archBOutcome,
} = require('../lib/archBStage');

// ── temp-dir helpers ─────────────────────────────────────────────────────────

function tmpOutputs() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'archb-outputs-'));
}

function writeTC(dir, name, content, mtimeMs) {
  const full = path.join(dir, name);
  fs.writeFileSync(full, JSON.stringify(content));
  if (mtimeMs !== undefined) fs.utimesSync(full, new Date(mtimeMs), new Date(mtimeMs));
  return full;
}

const GOOD_CASES = [
  { id: 'TC001', steps: [{ action: 'navigate', url: 'https://x/' }] },
  { id: 'TC002', steps: [{ action: 'click', x: 1, y: 2 }] },
];

// ── file validation ──────────────────────────────────────────────────────────

test('isValidExplorationTestCases accepts non-empty arrays of id+steps cases', () => {
  const dir = tmpOutputs();
  const f = writeTC(dir, 'test_cases_run_1_exploration.json', GOOD_CASES);
  assert.equal(isValidExplorationTestCases(f), true);
});

test('isValidExplorationTestCases rejects empty arrays, malformed JSON, missing id/steps', () => {
  const dir = tmpOutputs();
  assert.equal(isValidExplorationTestCases(writeTC(dir, 'a.json', [])), false);
  const bad = path.join(dir, 'b.json');
  fs.writeFileSync(bad, '{not json');
  assert.equal(isValidExplorationTestCases(bad), false);
  assert.equal(isValidExplorationTestCases(writeTC(dir, 'c.json', [{ id: 'TC1' }])), false);
});

// ── run-specific selection, no stale fallback ────────────────────────────────

test('selectExplorationTestCases ignores files older than the run start (no stale fallback)', () => {
  const dir = tmpOutputs();
  const NOW = 1_800_000_000_000;
  writeTC(dir, 'test_cases_run_OLD_exploration.json', GOOD_CASES, NOW - 60_000);
  const sel = selectExplorationTestCases(dir, NOW - 5_000);
  assert.equal(sel.selected, null);
  assert.equal(sel.reason, 'no-exploration-output');
});

test('selectExplorationTestCases picks THE newest run file', () => {
  const dir = tmpOutputs();
  const NOW = 1_800_000_000_000;
  writeTC(dir, 'test_cases_run_111_exploration.json', GOOD_CASES, NOW - 30_000);
  writeTC(dir, 'test_cases_run_222_exploration.json', GOOD_CASES, NOW - 1_000);
  const sel = selectExplorationTestCases(dir, NOW - 60_000);
  assert.equal(sel.selected.runId, 'run_222');
  assert.equal(sel.valid, true);
  assert.equal(sel.reason, 'ok');
});

test('zero-test exploration output is selected but marked invalid (graceful, never executed)', () => {
  const dir = tmpOutputs();
  const NOW = 1_800_000_000_000;
  writeTC(dir, 'test_cases_run_333_exploration.json', [], NOW - 1_000);
  const sel = selectExplorationTestCases(dir, NOW - 60_000);
  assert.equal(sel.selected.runId, 'run_333'); // newest IS this run's file
  assert.equal(sel.valid, false);              // but it has zero cases
  assert.equal(sel.reason, 'empty-or-invalid');
});

test('unrelated files in outputs dir are ignored', () => {
  const dir = tmpOutputs();
  const NOW = 1_800_000_000_000;
  writeTC(dir, 'test_cases_run_1_visual_dom.json', GOOD_CASES, NOW);
  writeTC(dir, 'run_2_exploration_result.json', {}, NOW);
  const sel = selectExplorationTestCases(dir, NOW - 60_000);
  assert.equal(sel.selected, null);
});

// ── stage outcome mapping ────────────────────────────────────────────────────

test('archBOutcome: exploration failure propagates honestly', () => {
  const out = archBOutcome({ gen: { status: 'failed(exit 1)', duration_ms: 5 }, sel: null, exec: null });
  assert.equal(out.stage, 'exploration');
  assert.equal(out.status, 'failed(exit 1)');
});

test('archBOutcome: zero generated tests → partial_success, executor never launched', () => {
  const gen = { status: 'success', duration_ms: 1000 };
  const out = archBOutcome({
    gen,
    sel: { selected: { runId: 'run_X' }, valid: false },
    exec: null,
  });
  assert.equal(out.status, 'partial_success');
  assert.equal(out.stage, 'exploration-produced-no-test-cases');
  assert.equal(out.duration_ms, 1000);
  assert.equal(out.vision_run_id, undefined); // nothing was executed
});

test('archBOutcome: successful execution → success with run binding', () => {
  const out = archBOutcome({
    gen: { status: 'success', duration_ms: 1000 },
    sel: { selected: { runId: 'run_Y' }, valid: true },
    exec: { status: 'success', duration_ms: 500, exitCode: 0 },
  });
  assert.equal(out.status, 'success');
  assert.equal(out.stage, 'execution');
  assert.equal(out.vision_run_id, 'run_Y');
  assert.equal(out.duration_ms, 1500);
});

test('archBOutcome: execution failure after valid exploration → partial_success', () => {
  const out = archBOutcome({
    gen: { status: 'success', duration_ms: 1000 },
    sel: { selected: { runId: 'run_Z' }, valid: true },
    exec: { status: 'failed(exit 1)', duration_ms: 200, exitCode: 1 },
  });
  assert.equal(out.status, 'partial_success');
  assert.equal(out.stage, 'execution');
  assert.equal(out.vision_run_id, 'run_Z');
});

// ── dual-LLM provider: both clients import cleanly without any API key ──────

test('Architecture A and B LLM clients import without keys and stay stub-safe', () => {
  const keyA = process.env.ARCH_A_LLM_API_KEY;
  const keyB = process.env.ARCH_B_LLM_API_KEY;
  const groq = process.env.GROQ_API_KEY;
  delete process.env.ARCH_A_LLM_API_KEY;
  delete process.env.ARCH_B_LLM_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    delete require.cache[require.resolve('../web/src/llmClient')];
    delete require.cache[require.resolve('../vision/src/llm')];
    const a = require('../web/src/llmClient');
    const b = require('../vision/src/llm');
    assert.equal(typeof a.callLLM, 'function');
    assert.equal(typeof b.callLLM, 'function');
    assert.equal(a.parseAction({ action: 'done' }).action, 'done');
    assert.equal(b.parseAction({ action: 'done' }).action, 'done');
  } finally {
    if (keyA) process.env.ARCH_A_LLM_API_KEY = keyA;
    if (keyB) process.env.ARCH_B_LLM_API_KEY = keyB;
    if (groq) process.env.GROQ_API_KEY = groq;
    delete require.cache[require.resolve('../web/src/llmClient')];
    delete require.cache[require.resolve('../vision/src/llm')];
  }
});
