'use strict';

/**
 * Regression tests for the extended runBoth collector provenance guard
 * (defect candidate #24): the mtime-window collector previously filtered
 * *_exploration_result.json files ONLY, so foreign `test_cases_*` and
 * `execution_results.json` artifacts were swept into run folders when two
 * pipelines ran concurrently without the lock (site 31 magento + site 32
 * eviltester contamination-skips, 2026-08-26 — see docs/TASK_BOARD.md comms
 * and docs/AUDIT_REPORT.md ADDENDUM mandate).
 *
 * Pattern mirrors test/regen_ledger.test.js: os.tmpdir() fixture trees,
 * one overridden field per test, cleanup left to the OS temp sweeper.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  artifactBelongsToRun,
  collectArtifactUrls,
  hostMatchesTarget,
} = require('../lib/provenanceGuard');

// ── host matching ────────────────────────────────────────────────────────────

test('hostMatchesTarget ignores www and honors verified aliases', () => {
  assert.ok(hostMatchesTarget('www.magento.softwaretestingboard.com', 'magento.softwaretestingboard.com'));
  assert.ok(hostMatchesTarget('www.lambdatest.com', 'www.testmuai.com'));
  assert.ok(!hostMatchesTarget('magento.softwaretestingboard.com', 'testpages.eviltester.com'));
});

// ── URL extraction across artifact classes ───────────────────────────────────

test('collectArtifactUrls finds start_url/source_url/page/url in every observed shape', () => {
  assert.deepEqual(
    collectArtifactUrls({ source_url: 'https://a.example.com/', started_at: 'x' }),
    ['https://a.example.com/']
  );
  assert.deepEqual(
    collectArtifactUrls([{ id: 'TC01' }, { page: 'https://b.example.com/cart' }]),
    ['https://b.example.com/cart']
  );
  assert.deepEqual(
    collectArtifactUrls({ cases: [{ url: 'https://c.example.com/' }], source_url: 'https://c.example.com/' }),
    ['https://c.example.com/', 'https://c.example.com/']
  );
  assert.deepEqual(collectArtifactUrls([{ id: 'TC02', steps: [{ action: 'click' }] }]), []);
});

// ── execution_results.json (source_url) ──────────────────────────────────────

test('execution_results with foreign source_url is REJECTED (site-31 leak class)', () => {
  // Real leak: magento run swept an execution_results.json whose TC01 replayed
  // testpages.eviltester.com.
  const artifact = {
    architecture: 'B',
    run_id: 'run_1787683956796',
    source_url: 'https://testpages.eviltester.com/styled/index.html',
    results: [{ id: 'TC01', status: 'PASS' }],
  };
  const verdict = artifactBelongsToRun(artifact, 'https://magento.softwaretestingboard.com/');
  assert.equal(verdict.ok, false);
  assert.match(verdict.via, /foreign_host \(testpages\.eviltester\.com\)/);
});

test('execution_results with manifest-host source_url passes', () => {
  const artifact = {
    architecture: 'B',
    source_url: 'https://magento.softwaretestingboard.com/',
    results: [{ id: 'TC01', status: 'PASS' }],
  };
  assert.equal(artifactBelongsToRun(artifact, 'https://magento.softwaretestingboard.com/').ok, true);
});

test('execution_results on a localhost fixture host is REJECTED for remote runs', () => {
  const artifact = { source_url: 'http://127.0.0.1:58621/index.html', results: [] };
  const verdict = artifactBelongsToRun(artifact, 'https://www.lambdatest.com/selenium-playground/');
  assert.equal(verdict.ok, false);
  assert.match(verdict.via, /localhost_fixture/);
});

// ── test_cases_*.json (start_url / page fields) ──────────────────────────────

test('test_cases array referencing a foreign page is REJECTED (shared-storage stitching)', () => {
  const cases = [
    { id: 'TC01', steps: [{ action: 'click', target: { text: 'Home' } }] },
    { id: 'TC02', start_url: 'https://todomvc.com/examples/typescript-react/#/', steps: [] },
  ];
  const verdict = artifactBelongsToRun(cases, 'https://magento.softwaretestingboard.com/');
  assert.equal(verdict.ok, false);
  assert.match(verdict.via, /foreign_host \(todomvc\.com\)/);
});

test('test_cases object wrapper with foreign `page` field is REJECTED', () => {
  const artifact = { cases: [{ id: 'TC01', page: 'https://evil.example.com/login' }] };
  assert.equal(artifactBelongsToRun(artifact, 'https://testpages.eviltester.com/styled/index.html').ok, false);
});

test('clean same-host test_cases file passes', () => {
  const cases = [
    { id: 'TC01', page: 'https://testpages.eviltester.com/styled/pages/basic-html-form-test.html' },
    { id: 'TC02', steps: [{ action: 'fill' }] },
  ];
  assert.equal(artifactBelongsToRun(cases, 'https://testpages.eviltester.com/styled/index.html').ok, true);
});

// ── exploration_result back-compat + legacy tolerance ────────────────────────

test('exploration_result foreign start_url still rejected; alias accepted', () => {
  assert.equal(
    artifactBelongsToRun({ start_url: 'https://weatherspark.com/' }, 'https://www.saucedemo.com/').ok,
    false
  );
  assert.equal(
    artifactBelongsToRun({ source_url: 'https://www.testmuai.com/selenium-playground/' }, 'https://www.lambdatest.com/selenium-playground/').ok,
    true
  );
});

test('legacy artifacts without any URL fields pass through untouched', () => {
  assert.equal(artifactBelongsToRun({ results: [{ id: 'TC01' }] }, 'https://any.example.com/').ok, true);
  assert.equal(artifactBelongsToRun(null, 'https://any.example.com/').ok, true);
});

test('unparseable manifest URL fails safe (pass-through, never crash the collector)', () => {
  assert.equal(artifactBelongsToRun({ start_url: 'https://a.example.com/' }, 'not-a-url').ok, true);
});

// ── collector-level regression: PROVENANCE_FILE_RE coverage ──────────────────

test('PROVENANCE_FILE_RE covers exploration_result, test_cases_* and execution_results.json', () => {
  // Re-import the regex from runBoth without executing its main IIFE:
  // read + eval only the constant's line (runBoth self-runs, so no require).
  const src = fs.readFileSync(path.join(__dirname, '..', 'runBoth.js'), 'utf8');
  const m = src.match(/const PROVENANCE_FILE_RE = (\/.+\/);/);
  assert.ok(m, 'PROVENANCE_FILE_RE defined in runBoth.js');
  const re = eval(m[1]); // eslint-disable-line no-eval

  assert.ok(re.test('run_1787683721105_exploration_result.json'));
  assert.ok(re.test('test_cases_run_1787683721105_exploration.json'));
  assert.ok(re.test('execution_results.json'));
  // Non-guarded classes must stay OUT (mtime-only handling preserved).
  assert.ok(!re.test('state_001_visual_dom.json'));
  assert.ok(!re.test('screenshots_index.json'));
});

test('(F4-05) url-less guarded artifact passes but carries an explicit provenance warning', () => {
  const { artifactBelongsToRun } = require('../lib/provenanceGuard');
  const v = artifactBelongsToRun(
    { payload: 'no url fields anywhere in here' },
    'https://todomvc.com/examples/typescript-react/#/'
  );
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.via, 'no_url_fields');
  assert.match(String(v.warn), /no URL/i);
});
