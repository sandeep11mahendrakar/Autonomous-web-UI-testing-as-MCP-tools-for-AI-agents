'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  normalizeText,
  levenshtein,
  tokenOverlap,
  fuzzyTextMatch,
} = require('../lib/fuzzyMatch');

test('normalizeText lowercases, trims and collapses whitespace', () => {
  assert.strictEqual(normalizeText('  IPhone   12 Pro Max '), 'iphone 12 pro max');
  assert.strictEqual(normalizeText(null), '');
});

test('levenshtein distance basics', () => {
  assert.strictEqual(levenshtein('kitten', 'sitting'), 3);
  assert.strictEqual(levenshtein('iphone', 'iphone'), 0);
  assert.strictEqual(levenshtein('', 'abc'), 3);
});

test('tokenOverlap handles order-independent partial overlap', () => {
  const r = tokenOverlap('iphone 12 pro max', 'iphone pro max 12');
  assert.ok(r >= 0.99);
  assert.strictEqual(tokenOverlap('login', ''), 0);
});

test('fuzzyTextMatch: exact containment passes', () => {
  assert.strictEqual(fuzzyTextMatch('iphone 12 pro max', 'iphone 12').match, true);
});

test('fuzzyTextMatch: OCR noise still matches via edit distance or tokens', () => {
  const r = fuzzyTextMatch('lphone 12 prc max', 'iphone 12');
  assert.strictEqual(r.match, true);
});

test('fuzzyTextMatch: case-insensitive match', () => {
  assert.strictEqual(fuzzyTextMatch('iPhone 12 Pro Max', 'iphone 12 pro max').match, true);
});

test('fuzzyTextMatch: unrelated texts rejected', () => {
  assert.strictEqual(fuzzyTextMatch('checkout', 'iphone 12').match, false);
  assert.strictEqual(fuzzyTextMatch('search', 'username').match, false);
});

test('fuzzyTextMatch: empty wanted text never matches', () => {
  assert.strictEqual(fuzzyTextMatch('anything', '').match, false);
});
