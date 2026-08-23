'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildDashboardData,
  attributeElements,
  attributeBehaviors,
  fusionCoverageKeys,
} = require('../lib/dashboard_data');
const { renderHtml, esc } = require('../s6_dashboard');

// ---------------------------------------------------------------------------
// Deterministic on-disk fixture (same shape as the real run artifacts).
// ---------------------------------------------------------------------------

function makeRunDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fusion-dash-'));
  const w = (rel, obj) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), JSON.stringify(obj, null, 2));
  };

  // --- Architecture A ---
  w('dom/test_cases.json', [
    { id: 'TC001', objective: 'A replay test',
      steps: [{ action: 'click', selector: '#submit' }] },
    { id: 'TC002', objective: 'A replay test 2',
      steps: [{ action: 'fill', selector: '#userName' }] },
  ]);
  w('dom/states.json', [
    { state_id: 'state_001', url: 'https://x/', title: 'home' },
    { state_id: 'state_002', url: 'https://x/form', title: 'form' },
    { state_id: 'state_003', url: 'https://x/form#b', title: 'form again' },
  ]);

  // --- Architecture B ---
  w('vision/outputs/test_cases_run_1_exploration.json', [
    { id: 'TC01', objective: 'B visual workflow',
      steps: [{ action: 'click', target: { type: 'link', text: 'Docs' } }] },
  ]);
  w('vision/outputs/run_1_exploration_history.json', {
    start_url: 'https://x/',
    states: [{ state_id: 'state_001' }, { state_id: 'state_002' }],
    transitions: [],
  });

  // --- S1 catalog ---
  w('fusion/catalog.json', {
    pages: [
      { page_id: 'pg_home', page_key: 'https://x/', seen_by: ['A', 'B'], provenance: [] },
    ],
    elements: [
      { element_id: 'el_cov_a', page_key: 'https://x/', element_type: 'button', label: 'Submit', a_selectors: ['#submit'], seen_by: ['A'] },
      { element_id: 'el_cov_b', page_key: 'https://x/', element_type: 'link', label: 'Docs', a_selectors: [], seen_by: ['B'] },
      { element_id: 'el_fus', page_key: 'https://x/', element_type: 'button', label: 'New Tab', a_selectors: ['#tabButton'], seen_by: ['A'] },
      { element_id: 'el_uncov', page_key: 'https://x/', element_type: 'input', label: 'Search', a_selectors: [], seen_by: ['B'] },
    ],
    behaviors: [
      { behavior_id: 'bh_cov_a', page_key: 'https://x/', action_type: 'click', target: '#submit', seen_by: ['A'] },
      { behavior_id: 'bh_fus', page_key: 'https://x/', action_type: 'click', target: '#tabButton', seen_by: ['A'] },
    ],
    conflicts: [
      { subject: 'element_type', page_key: 'https://x/', label: 'Docs', values: ['a', 'link'], note: '' },
    ],
    summary: {},
  });

  // --- S2 gap report ---
  w('fusion/gap_report.json', {
    elements: {
      counts: { common: 0, a_only: 2, b_only: 2, actionable_uncovered: 2, covered: 1 },
      a_only: [{ id: 'el_cov_a', page_key: 'https://x/', type: 'button', label_or_target: 'Submit', occurrences: 2, seen_by: ['A'] }],
      b_only: [{ id: 'el_uncov', page_key: 'https://x/', type: 'input', label_or_target: 'Search', occurrences: 1, seen_by: ['B'] }],
      common: [],
      actionable_uncovered: [
        { id: 'el_fus', page_key: 'https://x/', type: 'button', label_or_target: 'New Tab', occurrences: 3, seen_by: ['A'] },
        { id: 'el_uncov', page_key: 'https://x/', type: 'input', label_or_target: 'Search', occurrences: 1, seen_by: ['B'] },
      ],
    },
    behaviors: {
      counts: { common: 0, a_only: 2, b_only: 0, uncovered: 1, covered: 1 },
      uncovered: [{ id: 'bh_fus', page_key: 'https://x/', type: 'click', label_or_target: '#tabButton', seen_by: ['A'] }],
      common: [], a_only: [], b_only: [],
    },
    conflicts: [
      { subject: 'element_type', page_key: 'https://x/', label: 'Docs', values: ['a', 'link'], note: 'mismatch' },
    ],
    conflict_count: 1,
    anomalies: { counts: { rare: 1, low_confidence: 0, multi_position: 0 } },
    opportunities: {
      quiet_pages_no_successful_outgoing_behavior: [
        { page_id: 'pg_home', page_key: 'https://x/', seen_by: ['A', 'B'] },
      ],
    },
    summary: {},
  });

  // --- S4 fusion ---
  const fusionTest = {
    test_id: 'FT001',
    source_gap_id: 'gap_bh_bh_fus',
    objective: 'Click New Tab',
    novelty_reason: 'No A or B test exercises the New Tab button.',
    start_page: 'https://x/',
    steps: [
      { action: 'navigate', url: 'https://x/' },
      { action: 'click', ref_kind: 'element', ref: 'el_fus' },
      { action: 'click', ref_kind: 'behavior', ref: 'bh_fus' },
    ],
    step_coverage_keys: ['navigate|https://x/', 'click|#tabButton', 'click|new tab'],
    provenance: { generated_by: 'fusion_s4', catalog_sources: ['dom/transitions.json'] },
  };
  w('fusion/fusion_tests.json', [fusionTest]);
  w('fusion/fusion_report.json', {
    llm_calls: 1,
    provider: 'openrouter:test-model',
    prompt_chars: 5000,
    candidates_generated: 1,
    accepted_count: 1,
    rejected_count: 0,
    rejections: [],
    gap_ids_used: ['gap_bh_bh_fus'],
    novelty_reasons: [{ test_id: 'FT001', reason: 'novel' }],
    all_accepted_grounded: true,
    duplicated_existing_ab_tests: false,
  });

  // --- Fusion execution ---
  w('fusion/ft_execution_results.json', {
    results: [{
      test_id: 'FT001', status: 'PASS',
      steps: [
        { step: 1, action: 'navigate', target_url: 'https://x/', result: 'PASS', verification_method: 'url_change' },
        { step: 2, action: 'click', ref: 'el_fus', result: 'PASS', verification_method: 'popup_opened_or_dom_response', coordinates_live: { x: 10, y: 10 } },
        { step: 3, action: 'click', ref: 'bh_fus', result: 'PASS', verification_method: 'popup_opened_or_dom_response' },
      ],
    }],
  });

  return dir;
}

function coverageFor(runDir) {
  const { collectCoverage } = require('../s2_gap_report');
  return collectCoverage(runDir);
}

// ---------------------------------------------------------------------------
// Aggregation tests
// ---------------------------------------------------------------------------

test('coverage matrix attributes elements across A / B / Fusion', () => {
  const dir = makeRunDir();
  try {
    const data = buildDashboardData(dir);
    const e = data.coverage_matrix.elements;
    assert.equal(e.total, 4);
    // el_cov_a covered by A's click|#submit; el_fus only by Fusion; el_cov_b by B.
    assert.equal(e.by_a, 1);
    assert.equal(e.by_b, 1);
    assert.equal(e.by_fusion_only, 1);
    assert.equal(e.covered_any, 3);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('behaviors attribute: one covered by A, one only by Fusion', () => {
  const dir = makeRunDir();
  try {
    const data = buildDashboardData(dir);
    const b = data.coverage_matrix.behaviors;
    assert.equal(b.total, 2);
    assert.equal(b.by_a, 1);   // bh_cov_a via click|#submit
    assert.equal(b.by_fusion_only, 1); // bh_fus referenced by FT001
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('fusion-attributable headline math is correct', () => {
  const dir = makeRunDir();
  try {
    const data = buildDashboardData(dir);
    const h = data.headline;
    assert.equal(h.total_final_tests, 4);   // 2 A + 1 B + 1 Fusion
    assert.equal(h.tests_fusion_created, 1);
    assert.equal(h.tests_already_covered_by_ab, 0);
    assert.equal(h.pct_final_tests_attributable_to_fusion, 25);
    assert.ok(h.novel_targets_exercised_by_fusion >= 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('test and state counts come straight from artifacts', () => {
  const dir = makeRunDir();
  try {
    const data = buildDashboardData(dir);
    const m = data.coverage_matrix;
    assert.deepEqual(
      { a: m.tests.a, b: m.tests.b, f: m.tests.fusion, total: m.tests.total },
      { a: 2, b: 1, f: 1, total: 4 });
    assert.equal(m.states.a, 3);           // states.json length
    assert.equal(m.states.b, 2);           // history.states length
    assert.equal(m.states.fusion_pages_touched, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('execution section aggregates PASS/FAIL and verification strength', () => {
  const dir = makeRunDir();
  try {
    const data = buildDashboardData(dir);
    const ex = data.execution;
    assert.equal(ex.available, true);
    assert.equal(ex.passed, 1);
    assert.equal(ex.failed, 0);
    assert.equal(ex.steps_total, 3);
    assert.equal(ex.steps_passed, 3);
    assert.deepEqual(ex.verification_methods,
      { url_change: 1, popup_opened_or_dom_response: 2 });
    assert.match(ex.reliability_flakiness, /single execution run/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('findings sections mirror the S2 gap report', () => {
  const dir = makeRunDir();
  try {
    const data = buildDashboardData(dir);
    assert.equal(data.findings.conflict_count, 1);
    assert.equal(data.findings.uncovered_actionable_elements, 2);
    assert.equal(data.findings.uncovered_behaviors, 1);
    assert.equal(data.findings.quiet_pages, 1);
    assert.equal(data.findings.a_only_elements, 2);
    assert.equal(data.findings.b_only_elements, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('every dashboard section carries provenance sources', () => {
  const dir = makeRunDir();
  try {
    const data = JSON.parse(JSON.stringify(buildDashboardData(dir)));
    for (const section of [data.headline, data.coverage_matrix,
      data.architecture_comparison, data.findings, data.gaps,
      data.fusion, data.execution]) {
      assert.ok(Array.isArray(section.sources) && section.sources.length > 0,
        'section missing provenance sources');
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('aggregation makes zero LLM calls and embeds no wall-clock time', () => {
  const dir = makeRunDir();
  try {
    const raw = JSON.stringify(buildDashboardData(dir));
    assert.ok(!/"wall_clock":\s*(?!null)/.test(raw), 'no wall-clock timestamps allowed');
    const data = JSON.parse(raw);
    assert.equal(data.llm_calls, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('fusionCoverageKeys falls back to deriving keys from catalog refs', () => {
  const idx = {
    elements: new Map([['el_x', { element_id: 'el_x', a_selectors: ['#btnX'], label: 'Btn X' }]]),
    behaviors: new Map(),
  };
  const { keys, refIds } = fusionCoverageKeys(
    [{ steps: [{ action: 'click', ref_kind: 'element', ref: 'el_x' }] }], idx);
  assert.ok(keys.has('click|#btnX'));
  assert.ok(keys.has('click|btn x'));
  assert.ok(refIds.has('el_x'));
});

test('attributeElements marks fusion-covered elements not covered by A/B', () => {
  const catalog = {
    elements: [
      { element_id: 'e1', a_selectors: ['#onlyFusion'], label: 'Only Fusion' },
      { element_id: 'e2', a_selectors: [], label: null },
    ],
  };
  const r = attributeElements(catalog,
    { aSelectorActions: new Set(), bLabelActions: new Set() },
    new Set(['click|#onlyFusion']));
  assert.equal(r.total, 2);
  assert.equal(r.by_fusion_only, 1);
  assert.equal(r.covered_any, 1);
});

test('attributeBehaviors matches A selectors and normalized B labels', () => {
  const catalog = {
    behaviors: [
      { behavior_id: 'b1', action_type: 'click', target: '#go' },
      { behavior_id: 'b2', action_type: 'fill', target: 'input:Name' },
    ],
  };
  const r = attributeBehaviors(catalog, {
    aSelectorActions: new Set(['click|#go']),
    bLabelActions: new Set(['fill|input:name']),
  }, new Set());
  assert.equal(r.by_a, 1);
  assert.equal(r.by_b, 1);
  assert.equal(r.by_fusion_only, 0);
});

// ---------------------------------------------------------------------------
// HTML rendering
// ---------------------------------------------------------------------------

test('rendered HTML escapes content and embeds key metrics', () => {
  assert.equal(esc('<script>&'), '&lt;script&gt;&amp;');
  const html = renderHtml({
    run_dir: 'r<un>',
    llm_calls: 0,
    headline: {
      pct_final_tests_attributable_to_fusion: 25,
      total_final_tests: 4, tests_from_architecture_a: 2,
      tests_from_architecture_b: 1, tests_fusion_created: 1,
      tests_already_covered_by_ab: 0, duplicate_rejections_audit: 0,
      novel_targets_exercised_by_fusion: 6,
    },
    coverage_matrix: {
      elements: { by_a: 5, by_b: 40, by_fusion_only: 3, covered_any: 45, total: 204 },
      behaviors: { by_a: 2, by_b: 9, by_fusion_only: 3, total: 23 },
      tests: { a: 2, b: 1, fusion: 1, total: 4 },
      states: { a: 15, b: 9, fusion_pages_touched: 1 },
      note: '',
      sources: [],
    },
    architecture_comparison: {
      a: { tests: 2, states: 15, elements_seen: 16, behaviors_seen: 14, targets_covered: 8 },
      b: { tests: 1, states: 9, elements_seen: 197, behaviors_seen: 9, targets_covered: 20 },
      sources: [],
    },
    findings: {
      a_only_sample: [], b_only_sample: [], common_sample: [],
      conflicts: [], conflict_count: 9, a_only_elements: 15, b_only_elements: 188,
      common_elements: 1, a_only_behaviors: 14, b_only_behaviors: 9,
      common_behaviors: 0, uncovered_actionable_elements: 80,
      uncovered_behaviors: 12, quiet_pages: 3, anomalies: {},
    },
    gaps: { actionable_uncovered_sample: [], uncovered_behaviors_sample: [] },
    fusion: { tests: [], llm_calls: 1, provider: 'x', prompt_chars: 16277, all_grounded: true, duplicated_existing: false, tests_rejected: 0 },
    execution: { available: false },
  });
  assert.ok(html.includes('r&lt;un&gt;'), 'run dir must be HTML-escaped');
  assert.ok(html.includes('25%'), 'headline percentage must render');
  assert.ok(!html.includes('<script>alert'), 'no injected scripts');
});
