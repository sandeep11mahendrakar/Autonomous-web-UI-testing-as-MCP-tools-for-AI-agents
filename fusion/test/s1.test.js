'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  pageKey,
  normText,
  mapBType,
  normalizeAStates,
  normalizeATransitions,
  normalizeVisualDom,
  normalizeExecutionResults,
  buildBStateUrlMap,
  normalizeBHistoryStates,
  normalizeBHistoryTransitions,
  clusterObservations,
  assignObsIds,
} = require('../lib/normalize');

test('pageKey normalizes URLs deterministically', () => {
  assert.equal(pageKey('https://demoqa.com/elements/'), 'https://demoqa.com/elements');
  assert.equal(pageKey('https://demoqa.com/elements'), 'https://demoqa.com/elements');
  assert.equal(pageKey('https://demoqa.com/elements?x=1#f'), 'https://demoqa.com/elements');
});

test('normText collapses whitespace/case', () => {
  assert.equal(normText(' Text  Box\n'), 'text box');
});

test('mapBType maps visual types onto the neutral vocabulary', () => {
  assert.equal(mapBType('Text Button'), 'button');
  assert.equal(mapBType('text input'), 'input');
  assert.equal(mapBType('Web Link'), 'link');
  assert.equal(mapBType(''), 'unknown');
});

test('normalizeATransitions keeps provenance and state refs', () => {
  const states = [{ state_id: 's1', url: 'https://x/a' }];
  const transitions = [{
    from_state: 's1', to_state: 's2', result: 'success',
    action: { type: 'fill', target: '#name', value: 'T' }, timestamp: '2026-08-22T00:00:00Z',
  }];
  const obs = normalizeATransitions(transitions, states);
  assert.equal(obs.length, 1);
  assert.equal(obs[0].architecture, 'A');
  assert.equal(obs[0].page_key, 'https://x/a');
  assert.equal(obs[0].action_type, 'fill');
});

test('normalizeVisualDom extracts typed labeled elements with centers', () => {
  const vdom = {
    source_url: 'https://x/',
    elements: [
      { id: 'e1', type: 'Text Button', text: 'Submit', bbox: [10, 20, 30, 40], confidence: 0.8 },
    ],
  };
  const obs = normalizeVisualDom(vdom, 'vision/outputs/x.json');
  assert.equal(obs.length, 1);
  assert.equal(obs[0].element_type, 'button');
  assert.deepEqual(obs[0].center, { x: 20, y: 30 });
  assert.equal(obs[0].confidence, 0.8);
});

test('normalizeExecutionResults maps steps and verification', () => {
  const exec = {
    source_url: 'https://x/',
    results: [{
      test_id: 'TC01', status: 'PASS', verification_strength: 'strong',
      steps: [{ action: 'click', resolved_element: { text: 'Elements' }, verification: 'url_change', re_detected: true }],
    }],
  };
  const obs = normalizeExecutionResults(exec, 'vision/outputs/execution_results.json');
  assert.equal(obs.length, 1);
  assert.equal(obs[0].steps[0].verification, 'url_change');
  assert.equal(obs[0].steps[0].target_label, 'Elements');
});

test('clustering dedups identical observations and counts frequency', () => {
  const mkEl = (i) => ({
    kind: 'element', architecture: 'B', source: 'v.json',
    page_key: 'https://x/', element_type: 'button', label: 'Submit',
    confidence: 0.5 + i / 10, center: { x: 10, y: 10 },
    ref_id: `e${i}`, timestamp: null, attrs: {},
  });
  const catalog = clusterObservations([mkEl(0), mkEl(1), mkEl(2)]);
  assert.equal(catalog.elements.length, 1);
  assert.equal(catalog.elements[0].occurrences, 3);
  assert.equal(catalog.elements[0].max_confidence, 0.7);
  assert.equal(catalog.elements[0].centers.length, 1); // same position deduped
  assert.ok(catalog.pages.has ? false : true); void catalog.pages;
});

test('clustering flags type conflicts for same page+label', () => {
  const a = {
    kind: 'element', architecture: 'B', source: 'v1.json',
    page_key: 'https://x/', element_type: 'button', label: 'Go',
    confidence: null, center: null, ref_id: 'a', timestamp: null, attrs: {},
  };
  const b = { ...a, ref_id: 'b', element_type: 'link', center: null };
  const catalog = clusterObservations([assignObsIds([a, b])[0], assignObsIds([a, b])[1]]);
  assert.equal(catalog.conflicts.filter(c => c.subject === 'element_type').length >= 1, true);
});

test('behavior clustering counts attempts/successes per action signature', () => {
  const mkAct = (result) => ({
    kind: 'action', architecture: 'A', source: 't.json',
    page_key: 'https://x/', action_type: 'fill', target: '#name',
    value: null, result, to_ref: result === 'success' ? 's2' : null,
    timestamp: null, attrs: {},
  });
  const catalog = clusterObservations([mkAct('success'), mkAct('success'), mkAct('error')]);
  assert.equal(catalog.behaviors.length, 1);
  assert.equal(catalog.behaviors[0].attempts, 3);
  assert.equal(catalog.behaviors[0].successes, 2);
});

// ── B exploration history normalization ──────────────────────────────────────

const B_HISTORY = {
  start_url: 'https://demoqa.com/',
  states: [
    { state_id: 'state_001', url: 'https://demoqa.com/', parent_state_id: null,
      screenshot: 's/1.png', merged_evidence: 's/1_merged.png', fingerprint: 'fp1' },
    { state_id: 'state_002', url: 'https://demoqa.com/elements', parent_state_id: 'state_001',
      screenshot: 's/2.png', fingerprint: 'fp2' },
  ],
  transitions: [
    { from_state: 'state_001', to_state: 'state_002', result: 'executed',
      action: { action: 'click', elementType: 'link', elementText: 'Elements', x: 134, y: 674 } },
  ],
};

test('buildBStateUrlMap maps state ids to urls for visual-DOM fallback', () => {
  const map = buildBStateUrlMap(B_HISTORY);
  assert.equal(map.state_001, 'https://demoqa.com/');
  assert.equal(map.state_002, 'https://demoqa.com/elements');
  assert.equal(map.state_003, undefined);
});

test('repeated-state re-detections inherit the page they were re-detected on', () => {
  const history = {
    states: [{ state_id: 'state_002', url: 'https://x/elements' }],
    transitions: [
      { from_state: 'state_002', to_state: 'state_003', result: 'repeated_state_skipped' },
    ],
  };
  const map = buildBStateUrlMap(history);
  assert.equal(map.state_003, 'https://x/elements');
});

test('B history states carry evidence pointers and provenance', () => {
  const obs = normalizeBHistoryStates(B_HISTORY, 'vision/outputs/run_1_exploration_history.json');
  assert.equal(obs.length, 2);
  assert.equal(obs[0].architecture, 'B');
  assert.equal(obs[0].page_key, 'https://demoqa.com');
  assert.equal(obs[0].attrs.screenshot, 's/1.png');
  assert.equal(obs[1].parent_ref, 'state_001');
});

test('B history transitions use label-based neutral targets (conservative vs A selectors)', () => {
  const obs = normalizeBHistoryTransitions(B_HISTORY, 'vision/outputs/run_1_exploration_history.json');
  assert.equal(obs.length, 1);
  assert.equal(obs[0].action_type, 'click');
  assert.equal(obs[0].target, 'link:Elements');
  assert.equal(obs[0].page_key, 'https://demoqa.com');
  assert.equal(obs[0].attrs.x, 134);
});

test('A and B actions on the same page stay separate behaviors (conservative clustering)', () => {
  const aAct = {
    kind: 'action', architecture: 'A', source: 'dom/transitions.json',
    page_key: 'https://demoqa.com', action_type: 'click', target: 'a.card-link',
    value: null, result: 'success', to_ref: null, timestamp: null, attrs: {},
  };
  const bAct = {
    kind: 'action', architecture: 'B', source: 'vision/outputs/h.json',
    page_key: 'https://demoqa.com', action_type: 'click', target: 'link:Elements',
    value: null, result: 'executed', to_ref: null, timestamp: null, attrs: {},
  };
  const catalog = clusterObservations([aAct, bAct]);
  assert.equal(catalog.behaviors.length, 2, 'label vs selector identities must NOT merge');
  const page = catalog.pages.get ? undefined : catalog.pages[0];
  assert.equal(page.seen_by.includes('A') && page.seen_by.includes('B'), true);
});

test('defect-23: pageKey returns empty for null/undefined/"null" URLs', () => {
  const { pageKey } = require('../lib/normalize');
  assert.strictEqual(pageKey(null), '');
  assert.strictEqual(pageKey(undefined), '');
  assert.strictEqual(pageKey('null'), '');
  assert.strictEqual(pageKey('undefined'), '');
  assert.strictEqual(pageKey('https://example.com/x/'), 'https://example.com/x');
});
