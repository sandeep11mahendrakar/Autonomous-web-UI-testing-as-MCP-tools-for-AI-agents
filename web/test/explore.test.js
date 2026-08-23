'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  hashStr,
  normText,
  reconstructWorkflows,
  buildCandidates,
  deriveFlowsFromDOM,
} = require('../src/exploreHelpers');
const { storeStep } = require('../src/memoryLog');
const { preprocessDOM, buildTestCasePrompt } = require('../src/preprocess');
const { _deterministicTestCases } = require('../src/testGenerator');

// ── exploreHelpers ───────────────────────────────────────────────────────────

test('hashStr is deterministic and collision-distinct for simple inputs', () => {
  assert.equal(hashStr('abc'), hashStr('abc'));
  assert.notEqual(hashStr('abc'), hashStr('abd'));
});

test('normText collapses whitespace and lowercases', () => {
  assert.equal(normText('  Hello   World \n'), 'hello world');
});

test('reconstructWorkflows chains only consecutive successful transitions', () => {
  const transitions = [
    { from_state: 's1', to_state: 's2', result: 'success' },
    { from_state: 's2', to_state: 's3', result: 'success' },
    { from_state: 's3', to_state: null, result: 'repeated_state_skipped' }, // ignored, chain continues
    { from_state: 's3', to_state: 's4', result: 'success' },
    { from_state: 's9', to_state: 's10', result: 'success' }, // disconnected single step
  ];
  const wf = reconstructWorkflows(transitions);
  assert.equal(wf.length, 1);
  assert.deepEqual(wf[0].map(t => t.to_state), ['s2', 's3', 's4']);
});

test('buildCandidates ranks untried buttons/inputs before links, drops disabled', () => {
  const elements = [
    { elementId: 0, tag: 'A', text: 'link', selector: 'a.l', href: '/x' },
    { elementId: 1, tag: 'BUTTON', text: 'btn', selector: '#b1' },
    { elementId: 2, tag: 'INPUT', text: '', selector: '#i1', placeholder: 'Name' },
    { elementId: 3, tag: 'BUTTON', text: 'dead', selector: '#b2', disabled: true },
  ];
  const cands = buildCandidates(elements, new Set(), 'fp1');
  assert.equal(cands.some(c => c.selector === '#b2'), false); // disabled dropped
  assert.equal(cands[0].tag, 'BUTTON'); // button first
  // marking a candidate tried pushes it after untried ones of lower rank class
  const triedAgain = buildCandidates(elements, new Set(['fp1|#b1']), 'fp1');
  assert.equal(triedAgain.find(c => c.selector === '#b1').alreadyTried, true);
  assert.equal(triedAgain[0].selector !== '#b1', true);
});

test('deriveFlowsFromDOM finds same-origin top-level section links only', () => {
  const home = 'https://demoqa.com';
  const elements = [
    { tag: 'A', text: 'Elements', href: '/elements', ariaLabel: '' },
    { tag: 'A', text: 'Forms', href: 'https://demoqa.com/forms', ariaLabel: '' },
    { tag: 'A', text: 'External', href: 'https://other.com/tools', ariaLabel: '' },
    { tag: 'A', text: 'Deep', href: '/books/it/book-1', ariaLabel: '' },
    { tag: 'A', text: '', href: '/anonymous', ariaLabel: '' },
    { tag: 'A', text: 'Home', href: '/', ariaLabel: '' },
    { tag: 'BUTTON', text: 'NotALink', href: '', ariaLabel: '' },
  ];
  const flows = deriveFlowsFromDOM(elements, home);
  assert.deepEqual(flows.map(f => f.url), [
    'https://demoqa.com/elements',
    'https://demoqa.com/forms',
  ]);
});

test('deriveFlowsFromDOM returns [] when fewer than 2 flows are found (LLM fallback path)', () => {
  const home = 'https://example.com';
  assert.deepEqual(deriveFlowsFromDOM([{ tag: 'A', text: 'Only', href: '/one' }], home), []);
  assert.deepEqual(deriveFlowsFromDOM([], home), []);
});

// ── memoryLog ────────────────────────────────────────────────────────────────

test('storeStep produces the enriched backward-compatible schema', () => {
  const log = [];
  storeStep(log, {
    step: 1,
    state_id: 'state_001',
    parent_state_id: null,
    from_url: 'https://x/', action: 'fill',
    target: '#name', value: 'Test',
    to_url: 'https://x/',
    success: true,
  });
  const e = log[0];
  assert.equal(e.state_id, 'state_001');
  assert.deepEqual(e.action_details, { type: 'fill', target: '#name', value: 'Test' });
  assert.deepEqual(e.result, { url_after: 'https://x/', success: true, error: null });
  assert.ok(e.timestamp);
  assert.equal(typeof e.step, 'number');
});

// ── preprocess ───────────────────────────────────────────────────────────────

test('preprocessDOM keeps only meaningful interactable elements and dedups', () => {
  const raw = [
    { tag: 'DIV', text: 'nope', id: '', selector: 'div.x' },
    { tag: 'BUTTON', text: 'Go', id: 'go', selector: '#go' },
    { tag: 'A', text: '', id: '', href: '#', selector: 'a.anon' },
    { tag: 'A', text: 'Dup', id: 'd1', href: '/d', selector: '#d1' },
    { tag: 'A', text: 'dup', id: 'd2', href: '/d2', selector: '#d2' }, // duplicate text
    { tag: 'INPUT', text: '', id: 'q', selector: '#q', placeholder: 'Search' },
  ];
  const out = preprocessDOM(raw);
  const tags = out.map(el => el.tag);
  assert.ok(!tags.includes('DIV'));
  assert.equal(out.filter(el => el.text.toLowerCase() === 'dup').length, 1);
  assert.ok(out.every(el => ['BUTTON', 'A', 'INPUT'].includes(el.tag)));
  out.forEach((el, i) => assert.equal(el.elementId, i));
});

test('buildTestCasePrompt embeds workflows and grounding rules', () => {
  const transitions = [
    { from_state: 's1', to_state: 's2', result: 'success', action: { type: 'navigate', target: 'a[href="/elements"]', value: null } },
    { from_state: 's2', to_state: 's3', result: 'success', action: { type: 'fill', target: '#userName', value: 'Test' } },
  ];
  const prompt = buildTestCasePrompt({ memoryLog: [], transitions });
  assert.ok(prompt.includes('"action": "navigate"'.replace(/ /g, '')) || prompt.includes('navigate'));
  assert.ok(prompt.includes('#userName'));
  assert.ok(prompt.toLowerCase().includes('never invent a selector'));
});

// ── deterministic test generation ────────────────────────────────────────────

test('_deterministicTestCases are grounded in recorded history', () => {
  const transitions = [
    { from_state: 'state_001', to_state: 'state_002', result: 'success',
      action: { type: 'navigate', target: 'a[href="/text-box"]', value: null }, url_after: 'https://demoqa.com/text-box' },
    { from_state: 'state_002', to_state: 'state_003', result: 'success',
      action: { type: 'fill', target: '#userName', value: 'Test User' }, url_after: 'https://demoqa.com/text-box' },
  ];
  const cases = _deterministicTestCases([], transitions);
  assert.equal(cases.length, 1);
  const tc = cases[0];
  assert.ok(tc.id && tc.objective && tc.expected_result);
  assert.equal(tc.steps.length, 2);
  assert.equal(tc.steps[0].action, 'navigate');
  assert.equal(tc.steps[1].selector, '#userName');
});
