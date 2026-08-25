'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { assertPurity, isLocalhostHost, hostMatches } = require('../testing/folder_purity');
const {
  DEFAULT_QUARANTINED,
  BOUNDARY_DEFINITION,
  buildHeaderLine,
  applyIndexNumericUpdates,
  classifyStep,
  buildVisionQualityMarkdown,
  collectCleanRuns,
} = require('../testing/regen_ledger');

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeTmpRoot() {
  // Fixture trees live under os.tmpdir(); cleanup left to the OS temp sweeper.
  return fs.mkdtempSync(path.join(os.tmpdir(), 'purity-fixture-'));
}

/**
 * Create runs/<id>/ with the minimal artifact set folder_purity reads.
 * Every URL defaults to the manifest host so tests override one field at a time.
 */
function makeRun(root, runId, opts = {}) {
  const dir = path.join(root, 'runs', runId);
  for (const sub of ['dom', path.join('vision', 'outputs'), 'fusion']) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }
  const manifestUrl = opts.manifestUrl || `https://site-a.example.com`;
  fs.writeFileSync(path.join(dir, 'run_manifest.json'), JSON.stringify({ run_id: runId, url: manifestUrl }));
  fs.writeFileSync(
    path.join(dir, 'dom', 'exploration_summary.json'),
    JSON.stringify({
      start_url: manifestUrl,
      visited_urls: opts.domVisited || [manifestUrl + '/', manifestUrl + '/pricing'],
    })
  );
  fs.writeFileSync(
    path.join(dir, 'vision', 'outputs', `run_${runId}_exploration_result.json`),
    JSON.stringify({ run_id: `run_${runId}`, start_url: opts.visionStartUrl || manifestUrl, visited_urls: opts.visionVisited || [manifestUrl + '/'] })
  );
  fs.writeFileSync(
    path.join(dir, 'fusion', 'catalog.json'),
    JSON.stringify({ pages: (opts.catalogPages || [{ page_key: manifestUrl }, { page_key: manifestUrl + '/pricing' }]) })
  );
  return dir;
}

// ---------------------------------------------------------------------------
// folder_purity
// ---------------------------------------------------------------------------

test('isLocalhostHost covers localhost, 127.x and ::1 but not public hosts', () => {
  assert.ok(isLocalhostHost('127.0.0.1:49205'));
  assert.ok(isLocalhostHost('localhost'));
  assert.ok(isLocalhostHost('[::1]:8080'));
  assert.ok(!isLocalhostHost('books.toscrape.com'));
});

test('hostMatches ignores www and honors ALIASES (LambdaTest -> TestMu AI rebrand)', () => {
  assert.ok(hostMatches('www.saucedemo.com', 'saucedemo.com'));
  assert.ok(hostMatches('www.lambdatest.com', 'testmuai.com'));
  assert.ok(hostMatches('www.lambdatest.com', 'www.testmuai.com'));
  assert.ok(!hostMatches('www.lambdatest.com', 'saucedemo.com'));
});

test('(a) foreign-host DOM exploration is detected as contamination', () => {
  const root = makeTmpRoot();
  makeRun(root, 'run_20260826_000001', {
    domVisited: ['https://site-a.example.com/', 'https://evil.example.com/login'],
  });
  const v = assertPurity('run_20260826_000001', { root });
  assert.strictEqual(v.pure, false);
  assert.ok(v.contamination.some((c) => c.file === 'dom/exploration_summary.json' && c.urls.includes('https://evil.example.com/login')));
});

test('(b) localhost vision fixture is flagged without failing purity', () => {
  const root = makeTmpRoot();
  makeRun(root, 'run_20260826_000002', { visionStartUrl: 'http://127.0.0.1:50172/index.html' });
  const v = assertPurity('run_20260826_000002', { root });
  assert.strictEqual(v.pure, true);
  assert.strictEqual(v.flags.length, 1);
  assert.match(v.flags[0].reason, /localhost fixture/);
});

test('(c) catalog page_key on an unvisited foreign host is contamination', () => {
  const root = makeTmpRoot();
  makeRun(root, 'run_20260826_000003', {
    catalogPages: [
      { page_key: 'https://site-a.example.com' },
      { page_key: 'https://other-site.example.com/cart' },
    ],
  });
  const v = assertPurity('run_20260826_000003', { root });
  assert.strictEqual(v.pure, false);
  assert.ok(v.contamination.some((c) => c.file === 'fusion/catalog.json'));
});

test('catalog page_key on a foreign host that WAS visited is legitimate', () => {
  const root = makeTmpRoot();
  makeRun(root, 'run_20260826_000004', {
    // External footer link visited by the B-side session: legitimate navigation.
    visionVisited: ['https://site-a.example.com/', 'https://footer-link.example.com/docs'],
    catalogPages: [{ page_key: 'https://site-a.example.com' }, { page_key: 'https://footer-link.example.com/docs' }],
  });
  const v = assertPurity('run_20260826_000004', { root });
  assert.strictEqual(v.pure, true);
  assert.deepStrictEqual(v.contamination, []);
});

test('clean fixture passes with zero contamination and zero flags', () => {
  const root = makeTmpRoot();
  makeRun(root, 'run_20260826_000005');
  const v = assertPurity('run_20260826_000005', { root });
  assert.strictEqual(v.pure, true);
  assert.ok(v.checks.length >= 4);
  assert.ok(v.checks.every((c) => c.ok));
});

test('(F3-03) missing exploration_summary.json with dom artifacts present is FLAGGED vacuous, not silently passed', () => {
  const root = makeTmpRoot();
  const runId = 'run_20260826_000008';
  makeRun(root, runId);
  fs.unlinkSync(path.join(root, 'runs', runId, 'dom', 'exploration_summary.json'));
  // dom artifact left behind so the vacuous case is the real one
  fs.writeFileSync(path.join(root, 'runs', runId, 'dom', 'states.json'), JSON.stringify({ states: [] }));
  const v = assertPurity(runId, { root });
  assert.strictEqual(v.pure, true); // flag does not flip purity by itself
  assert.ok(v.flags.some((f) => /Check-1 vacuous/.test(f.reason)));
  assert.ok(v.checks.some((c) => c.check === 'visited_urls_hosts_match_manifest' && c.vacuous));
});

test('CLI exits 1 and writes CONTAMINATION_MARKER when impure; 0 when pure', () => {
  const root = makeTmpRoot();
  makeRun(root, 'run_20260826_000006');
  makeRun(root, 'run_20260826_000007', { visionStartUrl: 'https://weatherspark.com' });

  const tool = path.join(__dirname, '..', 'testing', 'folder_purity.js');
  const bad = spawnSync(process.execPath, [tool, 'run_20260826_000007'], { encoding: 'utf8', env: { ...process.env, FOLDER_PURITY_ROOT: root } });
  assert.strictEqual(bad.status, 1);
  const verdict = JSON.parse(bad.stdout);
  assert.strictEqual(verdict.pure, false);
  assert.ok(fs.existsSync(path.join(root, 'runs', 'run_20260826_000007', 'CONTAMINATION_MARKER')));

  const good = spawnSync(process.execPath, [tool, 'run_20260826_000006'], { encoding: 'utf8', env: { ...process.env, FOLDER_PURITY_ROOT: root } });
  assert.strictEqual(good.status, 0);
  assert.strictEqual(JSON.parse(good.stdout).pure, true);
});

// ---------------------------------------------------------------------------
// regen_ledger
// ---------------------------------------------------------------------------

const TIER2_INDEX = [
  '# Site Testing Index',
  '',
  'Ledger intro paragraph that must survive regeneration.',
  '',
  '## TIER 2 (sites 11-20) - night campaign 2026-08-25',
  '',
  '| 11 | Clean Site | https://site-a.example.com | 2026-08-25 | `clean.md` | `run_20260826_100001` | OK 8 steps | OK 1/1 PASS | 5/5 grounded | 4/5 PASS | **71.4%** |',
  '| 12 | Quarantined Site | https://bad.example.com | 2026-08-25 | `bad.md` | `run_20260826_100002` | OK 8 steps | FAIL-HONEST 0/2 fail | 2/2 grounded | 0/2 FAIL | **40%** |',
  '',
].join('\n');

function makeDashboard(root, runId, values) {
  const dir = path.join(root, 'runs', runId, 'fusion');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'dashboard_data.json'),
    JSON.stringify({
      headline: { pct_final_tests_attributable_to_fusion: values.pct },
      fusion: { tests_generated: values.gen, tests_accepted: values.acc },
      execution: { executed_tests: values.exec, passed: values.pass },
    })
  );
}

function makeExecutionResults(root, runId, results) {
  const dir = path.join(root, 'runs', runId, 'vision', 'outputs');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'execution_results.json'), JSON.stringify({ results }));
}

test('applyIndexNumericUpdates rewrites only Tier-2 numeric cells of clean rows', () => {
  const root = makeTmpRoot();
  makeDashboard(root, 'run_20260826_100001', { pct: 80, gen: 4, acc: 3, exec: 2, pass: 1 });

  const { md } = applyIndexNumericUpdates(TIER2_INDEX, {
    root,
    excluded: DEFAULT_QUARANTINED,
    nowIso: '2026-08-26T00:00:00.000Z',
  });

  assert.ok(md.includes('| 3/4 grounded | 1/2 PASS | **80%** |'), 'numeric cells recomputed');
  assert.ok(md.includes('Ledger intro paragraph that must survive regeneration.'), 'non-table content untouched');
  assert.ok(md.includes('| 12 | Quarantined Site'), 'quarantined row present');
  assert.ok(md.includes('FAIL-HONEST 0/2 fail | 2/2 grounded | 0/2 FAIL | **40%**'), 'excluded row cells untouched');
  assert.match(md, /Regenerated 2026-08-26T00:00:00\.000Z by regen_ledger\.js; boundary definition: /);
  assert.match(md, /^# Site Testing Index/, 'H1 stays first line');
});

test('applyIndexNumericUpdates leaves rows without dashboard data untouched', () => {
  const { md } = applyIndexNumericUpdates(TIER2_INDEX, { root: os.tmpdir(), excluded: [], nowIso: 'x' });
  assert.ok(md.includes('| 11 | Clean Site | https://site-a.example.com'));
  assert.ok(md.includes('| 12 | Quarantined Site'));
});

test('classifyStep implements the single boundary definition', () => {
  assert.strictEqual(classifyStep('input_value', true), 'STRONG');
  assert.strictEqual(classifyStep('checked_state', true), 'STRONG');
  assert.strictEqual(classifyStep('dropdown_option_selected', true), 'STRONG');
  assert.strictEqual(classifyStep('select_option', true), 'STRONG');
  assert.strictEqual(classifyStep('scroll_position', true), 'STRONG');
  assert.strictEqual(classifyStep('url_change', true), 'MEDIUM');
  assert.strictEqual(classifyStep('body_text_fallback', true), 'WEAK');
  assert.strictEqual(BOUNDARY_DEFINITION.includes('scroll_position'), true);
});

test('buildVisionQualityMarkdown aggregates only clean runs and states the boundary once', () => {
  const root = makeTmpRoot();
  makeExecutionResults(root, 'run_20260826_200001', [
    {
      id: 'TC01',
      status: 'PASS',
      objective: 'fill login form',
      steps_executed: [
        { action: 'fill', ok: true, signal: { method: 'input_value', detail: 'value matched' } },
        { action: 'click', ok: true, signal: { method: 'url_change' } },
      ],
    },
    {
      id: 'TC02',
      status: 'FAIL',
      objective: 'weak body text check',
      steps_executed: [{ action: 'click', ok: true, signal: { method: 'body_text_fallback' } }],
    },
  ]);
  // Contaminated sibling must be dropped by the purity gate.
  const badDir = path.join(root, 'runs', 'run_20260826_200002', 'fusion');
  fs.mkdirSync(badDir, { recursive: true });
  makeExecutionResults(root, 'run_20260826_200002', [
    { id: 'TC99', status: 'PASS', objective: 'wrong-site test', steps_executed: [{ action: 'fill', ok: true, signal: { method: 'input_value' } }] },
  ]);
  fs.writeFileSync(
    path.join(badDir, 'catalog.json'),
    JSON.stringify({ pages: [{ page_key: 'https://totally-other.example.com' }] })
  );
  const manifestDir = path.join(root, 'runs', 'run_20260826_200002');
  fs.writeFileSync(path.join(manifestDir, 'run_manifest.json'), JSON.stringify({ url: 'https://site-a.example.com' }));

  const runs = collectCleanRuns(root, []);
  assert.strictEqual(runs.length, 1, 'contaminated run excluded by purity gate');

  const md = buildVisionQualityMarkdown(runs, { nowIso: '2026-08-26T00:00:00.000Z', excluded: [] });
  assert.match(md, /Total B test cases executed:   2/);
  assert.match(md, /STRONG \(value-level asserts\): 1/);
  assert.match(md, /WEAK   \(body-text fallback\):  1/);
  assert.strictEqual((md.match(new RegExp(BOUNDARY_DEFINITION.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 2,
    'boundary stated in header line + body');
  assert.ok(!md.includes('TC99'), 'no quarantined-run tests leaked into ledger');
});

test('buildHeaderLine lists excluded runs explicitly', () => {
  const line = buildHeaderLine('2026-08-26T00:00:00.000Z', ['run_20260825_062152']);
  assert.match(line, /excluded runs: run_20260825_062152/);
  assert.match(buildHeaderLine('x', []), /excluded runs: \(none\)/);
});
