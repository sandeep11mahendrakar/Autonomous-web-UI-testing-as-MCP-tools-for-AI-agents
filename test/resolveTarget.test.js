'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { resolveTarget } = require('../vision/src/executeTests');

const stepFor = (text, type, x = 100, y = 100) => ({
  action: 'click',
  x,
  y,
  target: { text, type },
});

test('resolveTarget: exact containment still wins (unchanged behavior)', () => {
  const els = [
    { type: 'link', text: 'iPhone 12 Pro Max', cx: 50, cy: 50 },
    { type: 'button', text: 'Buy', cx: 200, cy: 200 },
  ];
  const r = resolveTarget(els, stepFor('iphone 12', 'link'));
  assert.strictEqual(r.resolved, true);
  assert.strictEqual(r.via, 'text_match');
  assert.strictEqual(r.element.text, 'iPhone 12 Pro Max');
});

test('resolveTarget: OCR noise now resolves via fuzzy tier (was a FAIL before)', () => {
  // Regression case from bstackdemo: re-detection saw char-level OCR noise
  // ("lphone", "prc") that broke exact family matching.
  const els = [
    { type: 'link', text: 'lphone 12 prc max', cx: 50, cy: 50 },
  ];
  const r = resolveTarget(els, stepFor('iphone 12 pro max', 'link'));
  assert.strictEqual(r.resolved, true);
  assert.ok(r.via.startsWith('fuzzy_'), `via=${r.via}`);
});

test('resolveTarget: fuzzy respects type compatibility when wanted type present', () => {
  const els = [
    { type: 'input', text: 'lphone 12 pro max', cx: 10, cy: 10 },
    { type: 'link', text: 'iphone 12 prc max', cx: 60, cy: 60 },
  ];
  const r = resolveTarget(els, stepFor('iphone 12 pro max', 'link'));
  assert.strictEqual(r.resolved, true);
  assert.strictEqual(r.element.type, 'link');
});

test('resolveTarget: unrelated elements never fuzzy-match', () => {
  // Far from the recorded coordinates so the proximity fallback cannot
  // rescue it either — only a text match could resolve this.
  const els = [{ type: 'link', text: 'Checkout', cx: 500, cy: 500 }];
  const r = resolveTarget(els, stepFor('iphone 12', 'link'));
  assert.strictEqual(r.resolved, false);
});

test('resolveTarget: proximity fallback still works after fuzzy miss', () => {
  const els = [{ type: 'link', text: 'Totally different label', cx: 110, cy: 105 }];
  const r = resolveTarget(els, stepFor('iphone 12', 'link'));
  assert.strictEqual(r.resolved, true);
  assert.strictEqual(r.via, 'proximity');
});

test('resolveTarget: empty element list reports honest failure', () => {
  const r = resolveTarget([], stepFor('x', 'link'));
  assert.strictEqual(r.resolved, false);
  assert.strictEqual(r.reason, 'no_elements_in_current_state');
});
