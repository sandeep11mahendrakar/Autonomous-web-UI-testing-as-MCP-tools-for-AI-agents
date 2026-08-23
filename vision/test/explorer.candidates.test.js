'use strict';

// Regression test for the stalled /elements exploration (run_20260822_214750):
// 1. tried-action keys were stored WITH a fingerprint prefix but checked
//    WITHOUT it, so alreadyTried was always false and the same dead element
//    got re-picked indefinitely.
// 2. goBack() after no-progress clicks unwound real history — covered by the
//    position-desync guard; here we pin the candidate-table contract.

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildCandidates } = require('../src/explorer');

function vdom(elements) {
  return { elements };
}

const el = (id, type, text, x1, y1, x2, y2, conf = 0.8) => ({
  id, type, text,
  bbox: { x1, y1, x2, y2 },
  confidence: { yolo: conf },
});

test('candidate keys match the store format: fingerprint-prefixed tried set is honoured', () => {
  const fp = 'https://demoqa.com/elements|fxjr7x|8bs8dz';
  const tried = new Set();
  // Exactly what the explorer stores after executing a click:
  // `${fp}|${type}|${normText}|${x},${y}`
  tried.add(`${fp}|link|text box|113,263`);

  const cands = buildCandidates(vdom([
    el('elem-20', 'link', 'Text Box', 79.7, 253.7, 145.6, 271.8),
  ]), tried, new Map(), fp);

  // Single (exhausted) candidate must still surface, correctly flagged.
  assert.equal(cands.length, 1);
  assert.equal(cands[0].elementId, 'elem-20');
  assert.equal(cands[0].alreadyTried, true,
    'key formats MUST match — a mismatch silently re-offers dead elements');
});

test('an already-tried candidate is withheld while untried candidates remain', () => {
  const vd = vdom([
    el('elem-20', 'link', 'Text Box', 79.7, 253.7, 145.6, 271.8),
    el('elem-7', 'list_item', 'Dynamic Properties', 47.2, 741.4, 185, 804.3),
  ]);
  const fp = 'fp1';
  const tried = new Set([`${fp}|link|text box|113,263`]);

  const cands = buildCandidates(vd, tried, new Map(), fp);
  assert.equal(cands.some((c) => c.elementId === 'elem-20'), false,
    'dead candidate must not be re-offered when alternatives exist');
  assert.equal(cands.some((c) => c.elementId === 'elem-7'), true);
});

test('a failed candidate is re-offered only when NOTHING untried remains', () => {
  const vd = vdom([
    el('elem-20', 'link', 'Text Box', 79.7, 253.7, 145.6, 271.8),
  ]);
  const fp = 'fp1';
  const tried = new Set([`${fp}|link|text box|113,263`]);

  const cands = buildCandidates(vd, tried, new Map(), fp);
  assert.equal(cands.length, 1); // exhausted state still exposes it (marked tried)
  assert.equal(cands[0].alreadyTried, true);
});

test('family blacklist excludes elements whose (type,text) kept failing across states', () => {
  const vd = vdom([
    el('elem-9', 'link', 'practice.', 506, 127, 563, 146),
  ]);
  const failCounts = new Map([['link|practice.', 2]]);
  const cands = buildCandidates(vdom([
    el('elem-9', 'link', 'practice.', 506, 127, 563, 146),
  ]), new Set(), failCounts, 'fpX');
  void vd;
  assert.equal(cands.length, 0, 'junk family with >=2 failures must be excluded everywhere');
});
