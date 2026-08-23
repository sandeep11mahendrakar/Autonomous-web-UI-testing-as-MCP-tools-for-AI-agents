'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildGapCandidates,
  buildFusionContext,
  buildPrompt,
} = require('../lib/s4_context');
const {
  extractJson,
  stepCoverageKeys,
  testSignature,
  validateTests,
} = require('../lib/s4_validate');

// ---------------------------------------------------------------------------
// Offline fixture: tiny S1-style catalog + S2-style gap report.
// ---------------------------------------------------------------------------

function makeCatalog() {
  return {
    pages: [
      { page_id: 'pg_login', page_key: 'https://x/login', seen_by: ['A', 'B'], sources: ['dom/states.json'], provenance: ['dom/states.json'] },
      { page_id: 'pg_settings', page_key: 'https://x/settings', seen_by: ['B'], sources: ['vision/x.json'], provenance: ['vision/x.json'] },
    ],
    elements: [
      { element_id: 'el_btn1', page_key: 'https://x/login', element_type: 'button', label: 'Save', occurrences: 3, max_confidence: null, centers: [], seen_by: ['B'], sources: ['vision/vdom1.json'], a_selectors: [] },
      { element_id: 'el_inp1', page_key: 'https://x/login', element_type: 'input', label: 'Email', occurrences: 4, max_confidence: null, centers: [], seen_by: ['A'], sources: ['dom/memory_log.json'], a_selectors: ['#email'] },
      { element_id: 'el_txt9', page_key: 'https://x/settings', element_type: 'text', label: 'Header', occurrences: 1, max_confidence: null, centers: [], seen_by: ['B'], sources: ['vision/vdom2.json'], a_selectors: [] },
      { element_id: 'el_tog', page_key: 'https://x/settings', element_type: 'button', label: 'Theme Toggle', occurrences: 2, max_confidence: null, centers: [], seen_by: ['A'], sources: ['dom/memory_log.json'], a_selectors: ['#themeToggle'] },
    ],
    behaviors: [
      { behavior_id: 'bh_fill1', page_key: 'https://x/login', action_type: 'fill', target: 'input:Email', attempts: 1, successes: 0, results: {}, to_refs: [], seen_by: ['B'], sources: ['vision/history.json'], provenance: ['vision/history.json'] },
      { behavior_id: 'bh_clk1', page_key: 'https://x/settings', action_type: 'click', target: '#themeToggle', attempts: 2, successes: 2, results: {}, to_refs: [], seen_by: ['A'], sources: ['dom/transitions.json'], provenance: ['dom/transitions.json'] },
    ],
    conflicts: [],
    summary: {},
  };
}

function makeGapReport() {
  return {
    elements: {
      actionable_uncovered: [
        { id: 'el_btn1', page_key: 'https://x/login', type: 'button', label_or_target: 'Save', occurrences: 3, seen_by: ['B'] },
        { id: 'el_inp1', page_key: 'https://x/login', type: 'input', label_or_target: 'Email', occurrences: 4, seen_by: ['A'] },
      ],
    },
    behaviors: {
      uncovered: [
        { id: 'bh_fill1', page_key: 'https://x/login', type: 'fill', label_or_target: 'input:Email', seen_by: ['B'] },
        { id: 'bh_clk1', page_key: 'https://x/settings', type: 'click', label_or_target: '#themeToggle', seen_by: ['A'] },
      ],
    },
    conflicts: [
      { subject: 'element_type', page_key: 'https://x/login', label: 'Save', values: ['button', 'link'] },
    ],
    opportunities: {
      quiet_pages_no_successful_outgoing_behavior: [
        { page_id: 'pg_settings', page_key: 'https://x/settings', seen_by: ['B'] },
      ],
    },
  };
}

function makeIndex() {
  const { buildCatalogIndex } = require('../lib/s4_context');
  return buildCatalogIndex(makeCatalog());
}

const COVERED_A = new Set(['click|#saveBtn', 'fill|#email']);
const COVERED_B = new Set(['fill|input:email', 'fill|email']);

function goodTest(overrides = {}) {
  return {
    source_gap_id: 'gap_bh_bh_fill1',
    novelty_reason: 'B recorded this fill behavior during exploration but never generated a dedicated test for it.',
    objective: 'Fill the login email field and save',
    expected_result: 'Field accepts text',
    steps: [
      { action: 'navigate', url: 'https://x/login' },
      { action: 'fill', ref: 'bh_fill1', value: 'user@example.com' },
      { action: 'click', ref: 'el_btn1' },
    ],
    ...overrides,
  };
}

function run(responseTests, extra = {}) {
  return validateTests({
    response: { tests: Array.isArray(responseTests) ? responseTests : undefined },
    candidates: buildGapCandidates(makeGapReport()),
    index: makeIndex(),
    coveredA: extra.coveredA || COVERED_A,
    coveredB: extra.coveredB || COVERED_B,
    acceptedSigs: extra.acceptedSigs || [],
    maxTests: extra.maxTests ?? 8,
  });
}

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

test('gap candidates get deterministic ids derived from record ids', () => {
  const c = buildGapCandidates(makeGapReport());
  const ids = c.map(x => x.gap_id);
  assert.ok(ids.includes('gap_el_btn1'));
  assert.ok(ids.includes('gap_bh_bh_fill1'));
  assert.ok(ids.includes('gap_conflict_0'));
  assert.ok(ids.includes('gap_quiet_pg_settings'));
});

test('context orders candidates by priority: behaviors > conflicts > quiet > elements', () => {
  const { candidates } = buildFusionContext({ catalog: makeCatalog(), gapReport: makeGapReport() });
  const kinds = candidates.map(c => c.kind);
  const firstEl = kinds.indexOf('uncovered_actionable_element');
  // Executability filter drops vision-only targets: bh_fill1 ('input:Email' is
  // not a DOM selector) is excluded, bh_clk1 ('#themeToggle') survives.
  assert.equal(kinds.filter(k => k === 'uncovered_behavior').length, 1);
  assert.ok(firstEl === -1 || kinds.slice(firstEl).every(k => k === 'uncovered_actionable_element'));
});

test('executability filter excludes candidates without DOM-resolvable targets', () => {
  const { candidates, payload } = buildFusionContext({ catalog: makeCatalog(), gapReport: makeGapReport() });
  const gids = candidates.map(c => c.gap_id);
  // el_btn1 / bh_fill1 / 'Save' conflict are all vision-only targets
  assert.ok(!gids.includes('gap_el_btn1'), 'selector-less element gaps must be excluded');
  assert.ok(!gids.includes('gap_bh_bh_fill1'), 'behavior gaps with non-selector targets must be excluded');
  assert.ok(!gids.some(g => g.startsWith('gap_conflict_')), 'conflicts on selector-less elements must be excluded');
  // pg_settings hosts el_tog (DOM-resolvable) so its quiet-page gap stays offered
  assert.ok(gids.includes('gap_quiet_pg_settings'));
  assert.ok(!payload.elements.map(e => e.id).includes('el_btn1'));
});

test('prompt payload contains only compact structured data — no DOM/OCR/screenshots', () => {
  const { payload } = buildFusionContext({ catalog: makeCatalog(), gapReport: makeGapReport() });
  const s = JSON.stringify(payload);
  assert.ok(!/screenshot|ocr|raw_dom|html/i.test(s));
  // Only records actually referenced by gaps are shipped to the LLM.
  const elIds = payload.elements.map(e => e.id);
  assert.ok(elIds.includes('el_inp1'));
  assert.ok(!elIds.includes('el_btn1'), 'unreferenced elements must be excluded');
  assert.ok(!elIds.includes('el_txt9'), 'unreferenced elements must be excluded');
  const bhIds = payload.behaviors.map(b => b.id);
  assert.deepEqual(bhIds, ['bh_clk1']);
});

test('prompt stays compact (< 20k chars) even with many element gaps', () => {
  const big = makeGapReport();
  big.elements.actionable_uncovered = Array.from({ length: 60 }, (_, i) => ({
    id: `el_bulk${i}`, page_key: 'https://x/login', type: 'button', label_or_target: `Btn ${i}`, occurrences: 1, seen_by: ['B'],
  }));
  const bigCatalog = makeCatalog();
  for (let i = 0; i < 60; i++) {
    bigCatalog.elements.push({ element_id: `el_bulk${i}`, page_key: 'https://x/login', element_type: 'button', label: `Btn ${i}`, occurrences: 1, max_confidence: null, centers: [], seen_by: ['B'], sources: [], a_selectors: [] });
  }
  const { payload } = buildFusionContext({ catalog: bigCatalog, gapReport: big, maxElementGaps: 30 });
  assert.ok(payload.gaps.filter(g => g.kind === 'uncovered_actionable_element').length <= 30);
  assert.ok(buildPrompt(payload).length < 20000);
});

// ---------------------------------------------------------------------------
// Schema + grounding validation
// ---------------------------------------------------------------------------

test('valid multi-step grounded test is accepted with resolved fields', () => {
  const r = run([goodTest()]);
  assert.equal(r.accepted.length, 1);
  assert.equal(r.rejected.length, 0);
  const t = r.accepted[0];
  assert.equal(t.start_page, 'https://x/login');
  assert.equal(t.gap.kind, 'uncovered_behavior');
  assert.equal(t.steps[0].action, 'navigate');
  assert.equal(t.steps[1].ref_kind, 'behavior');
  assert.equal(t.steps[2].ref_kind, 'element');
});

test('unknown source_gap_id is rejected (no free-form gap claims)', () => {
  const r = run([goodTest({ source_gap_id: 'gap_made_up_999' })]);
  assert.equal(r.accepted.length, 0);
  assert.equal(r.rejected[0].reason, 'unknown_source_gap_id');
});

test('hallucinated element ref is rejected', () => {
  const t = goodTest();
  t.steps[2] = { action: 'click', ref: 'el_hallucinated' };
  const r = run([t]);
  assert.equal(r.rejected[0].reason, 'unknown_ref');
});

test('hallucinated URL is rejected — navigate only to known catalog pages', () => {
  const t = goodTest();
  t.steps[0] = { action: 'navigate', url: 'https://evil.example.com/login' };
  const r = run([t]);
  assert.equal(r.rejected[0].reason, 'hallucinated_url');
});

test('cross-page ref without navigation is rejected', () => {
  const t = goodTest();
  t.steps[2] = { action: 'click', ref: 'bh_clk1' }; // lives on /settings
  const r = run([t]);
  assert.equal(r.rejected[0].reason, 'cross_page_ref');
});

test('navigate legitimately switches pages — composed workflows stay allowed', () => {
  const t = goodTest({
    steps: [
      { action: 'navigate', url: 'https://x/login' },
      { action: 'fill', ref: 'bh_fill1', value: 'user@example.com' },
      { action: 'navigate', url: 'https://x/settings' },
      { action: 'click', ref: 'bh_clk1' },
    ],
  });
  const r = run([t]);
  assert.equal(r.accepted.length, 1, JSON.stringify(r.rejected));
});

test('behavior action mismatch is rejected (fill behavior cannot become click)', () => {
  const t = goodTest();
  t.steps[1] = { action: 'click', ref: 'bh_fill1', value: 'x' };
  const r = run([t]);
  assert.equal(r.rejected[0].reason, 'action_mismatch');
});

test('fill on a non-fillable element type is rejected', () => {
  const t = goodTest();
  t.steps[1] = { action: 'fill', ref: 'el_btn1', value: 'x' };
  const r = run([t]);
  assert.equal(r.rejected[0].reason, 'action_not_applicable');
});

test('fill without a value is rejected', () => {
  const t = goodTest();
  delete t.steps[1].value;
  const r = run([t]);
  assert.equal(r.rejected[0].reason, 'missing_value');
});

test('missing or too-short novelty_reason is rejected', () => {
  const r = run([goodTest({ novelty_reason: 'because' })]);
  assert.equal(r.rejected[0].reason, 'missing_novelty_reason');
});

test('invalid action vocabulary is rejected', () => {
  const t = goodTest();
  t.steps.push({ action: 'hover', ref: 'el_btn1' });
  const r = run([t]);
  assert.equal(r.rejected[0].reason, 'invalid_action');
});

test('malformed response shape yields a single invalid_response_shape rejection', () => {
  const r = validateTests({
    response: { something_else: true },
    candidates: buildGapCandidates(makeGapReport()),
    index: makeIndex(),
    coveredA: COVERED_A, coveredB: COVERED_B,
  });
  assert.equal(r.accepted.length, 0);
  assert.equal(r.rejected[0].reason, 'invalid_response_shape');
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

test('test whose every target is already covered by A/B is rejected as duplicate', () => {
  // el_inp1 has a_selectors ['#email'] -> key 'fill|#email' ∈ COVERED_A,
  // and label 'Email' -> normalized key 'fill|email' ∈ COVERED_B.
  const t = goodTest({
    source_gap_id: 'gap_el_inp1',
    steps: [{ action: 'navigate', url: 'https://x/login' }, { action: 'fill', ref: 'el_inp1', value: 'dup@example.com' }],
  });
  const r = run([t]);
  assert.equal(r.accepted.length, 0);
  assert.equal(r.rejected[0].reason, 'duplicate_of_existing');
});

test('exact signature repeat within one batch is rejected as duplicate_in_batch', () => {
  const t = goodTest();
  const r = run([t, { ...t }]);
  assert.equal(r.accepted.length, 1);
  assert.equal(r.rejected.find(x => x.reason === 'duplicate_in_batch').index, 1);
});

test('maxTests cap stops acceptance beyond the limit', () => {
  const variants = [1, 2].map(n => goodTest({
    objective: `variant ${n}`,
    steps: [{ action: 'navigate', url: 'https://x/login' }, { action: 'click', ref: n === 1 ? 'el_btn1' : 'bh_clk1' }],
  }));
  // second variant targets another page — make it legal by navigating first
  variants[1].steps = [
    { action: 'navigate', url: 'https://x/settings' },
    { action: 'click', ref: 'bh_clk1' },
  ];
  const r = run(variants, { maxTests: 1 });
  assert.equal(r.accepted.length, 1);
  assert.equal(r.rejected[0].reason, 'max_tests_reached');
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

test('extractJson strips markdown fences and salvages embedded objects', () => {
  assert.deepEqual(extractJson('```json\n{"tests":[]}\n```'), { tests: [] });
  assert.deepEqual(extractJson('Sure! {"tests":[]} done'), { tests: [] });
  assert.equal(extractJson('not json at all'), null);
});

test('stepCoverageKeys spans A selector space and normalized B label space', () => {
  const idx = makeIndex();
  const k = stepCoverageKeys({ action: 'fill', ref: 'el_inp1' }, idx);
  assert.ok(k.includes('fill|#email'));
  assert.ok(k.includes('fill|email'));
  const sig = testSignature(goodTest(), idx);
  assert.ok(sig.includes('navigate|https://x/login'));
});
