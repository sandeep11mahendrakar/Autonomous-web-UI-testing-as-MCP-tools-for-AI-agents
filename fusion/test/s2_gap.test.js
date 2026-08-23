'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGapReport } = require('../s2_gap_report');

// Synthetic S1-style catalog covering every classification branch.
function makeCatalog() {
  const el = (id, page, type, label, seen_by, extra = {}) => ({
    element_id: `el_${id}`, page_key: page, element_type: type, label,
    occurrences: extra.occ ?? 2, max_confidence: extra.conf ?? null,
    centers: extra.centers || [{ x: 10, y: 10 }],
    seen_by, sources: [], a_selectors: extra.selectors || [],
  });
  const beh = (id, page, action, target, seen_by, successes = 1, to_refs = []) => ({
    behavior_id: `bh_${id}`, page_key: page, action_type: action, target,
    attempts: 1, successes, results: {}, to_refs, seen_by, sources: [], provenance: [],
  });

  return {
    pages: [
      { page_id: 'pg1', page_key: 'https://x/common', seen_by: ['A', 'B'] },
      { page_id: 'pg2', page_key: 'https://x/a-only', seen_by: ['A'] },
      { page_id: 'pg3', page_key: 'https://x/b-only', seen_by: ['B'] },
    ],
    elements: [
      el('common1', 'https://x/common', 'button', 'Submit', ['A', 'B']),
      el('aonly1', 'https://x/a-only', 'input', 'Email', ['A'], { selectors: ['#email'] }),
      el('bonly1', 'https://x/b-only', 'link', 'Docs', ['B']),
      // rare single observation, actionable but uncovered
      el('rare1', 'https://x/common', 'checkbox', 'Terms', ['B'], { occ: 1 }),
      // non-actionable text element — must NOT count as actionable-uncovered
      el('text1', 'https://x/common', 'text', 'Welcome text', ['B']),
    ],
    behaviors: [
      beh('acov1', 'https://x/common', 'click', '#submitBtn', ['A']),   // covered via A selector
      beh('bcov1', 'https://x/b-only', 'fill', 'input:Full Name', ['B']), // covered via B label
      beh('auncov1', 'https://x/a-only', 'click', '#neverTested', ['A']), // uncovered
      beh('buncov1', 'https://x/b-only', 'click', 'link:Docs', ['B']),     // uncovered
      beh('common1', 'https://x/common', 'navigate', 'a[href="/next"]', ['A', 'B']),
    ],
    conflicts: [
      { subject: 'element_type', page_key: 'https://x/common', label: 'Submit', values: ['a', 'button'] },
    ],
    summary: {},
  };
}

const COVERAGE = {
  aSelectorActions: new Set(['click|#submitBtn', 'fill|#email']),
  bLabelActions: new Set(['fill|input:full name']),
};

test('elements are split into common / A-only / B-only by provenance', () => {
  const r = buildGapReport(makeCatalog(), COVERAGE);
  assert.equal(r.elements.counts.common, 1);
  assert.equal(r.elements.counts.a_only, 1);
  assert.equal(r.elements.counts.b_only, 3);
});

test('behaviors are split into common / A-only / B-only', () => {
  const r = buildGapReport(makeCatalog(), COVERAGE);
  assert.equal(r.behaviors.counts.common, 1); // navigate behavior seen by both
  assert.equal(r.behaviors.counts.a_only, 2);
  assert.equal(r.behaviors.counts.b_only, 2);
});

test('behavior coverage matches A selectors AND normalized B labels', () => {
  const r = buildGapReport(makeCatalog(), COVERAGE);
  assert.equal(r.behaviors.counts.covered, 2);  // acov1 + bcov1
  assert.equal(r.behaviors.counts.uncovered, 3); // auncov1 + buncov1 + common1(navigate)
  const uncovIds = r.behaviors.uncovered.map(u => u.id);
  assert.ok(uncovIds.includes('bh_auncov1'));
  assert.ok(uncovIds.includes('bh_buncov1'));
});

test('actionable uncovered excludes text elements and includes interactive ones', () => {
  const r = buildGapReport(makeCatalog(), COVERAGE);
  const ids = r.elements.actionable_uncovered.map(u => u.id);
  assert.ok(ids.includes('el_bonly1'));  // link, uncovered
  assert.ok(ids.includes('el_rare1'));   // checkbox, uncovered
  assert.ok(!ids.includes('el_text1'), 'text must never count as actionable');
  assert.ok(!ids.includes('el_aonly1'), 'covered via its recorded selector');
});

test('anomalies detect rare observations', () => {
  const r = buildGapReport(makeCatalog(), COVERAGE);
  assert.equal(r.anomalies.counts.rare, 1);
  assert.equal(r.anomalies.rare_single_observation[0].id, 'el_rare1');
});

test('conflicts pass through with their count', () => {
  const r = buildGapReport(makeCatalog(), COVERAGE);
  assert.equal(r.conflict_count, 1);
  assert.equal(r.conflicts[0].values[0], 'a');
});

test('quiet pages flag pages without successful outgoing behavior', () => {
  const r = buildGapReport(makeCatalog(), COVERAGE);
  const keys = r.opportunities.quiet_pages_no_successful_outgoing_behavior.map(q => q.page_key);
  // a-only page has one unsuccessful-ish behavior? No: auncov1 has successes=1.
  // Only pages whose behaviors ALL have zero successes qualify; here none are quiet.
  assert.deepEqual(keys, []);
});

test('quiet pages detected when a page has states but no successful behaviors', () => {
  const c = makeCatalog();
  c.pages.push({ page_id: 'pg4', page_key: 'https://x/dead-end', seen_by: ['B'] });
  const r = buildGapReport(c, COVERAGE);
  const keys = r.opportunities.quiet_pages_no_successful_outgoing_behavior.map(q => q.page_key);
  assert.ok(keys.includes('https://x/dead-end'));
});

test('summary percentages are integers and deterministic', () => {
  const r1 = buildGapReport(makeCatalog(), COVERAGE);
  const r2 = buildGapReport(makeCatalog(), COVERAGE);
  assert.deepEqual(r1, r2, 'identical inputs MUST produce identical reports');
  assert.equal(typeof r1.summary.totals.element_coverage_pct, 'number');
  assert.equal(r1.summary.llm_calls, 0);
});
