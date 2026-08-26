'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { BUGS, buildSite } = require('../mutation/fixtures');
const { createFixtureServer } = require('../mutation/server');
const { scoreChannel, collectSignals, analyzeVariant } = require('../mutation/analyze');

test('fixtures: buildSite is deterministic for the same bug set', () => {
  const a = JSON.stringify(buildSite(['wrong_calc']));
  const b = JSON.stringify(buildSite(['wrong_calc']));
  assert.strictEqual(a, b);
});

test('fixtures: every bug id in registry produces a site', () => {
  for (const id of Object.keys(BUGS)) {
    const site = buildSite([id]);
    assert.ok(site['/index.html'].length > 500, `${id} index too small`);
  }
});

test('fixtures: baseline has about.html; broken_nav removes it', () => {
  assert.ok(buildSite([])['/about.html']);
  assert.ok(!buildSite(['broken_nav'])['/about.html']);
  assert.ok(!buildSite(['broken_nav'])['/about2.html'.replace('2', '')]);
});

test('fixtures: wrong_calc injects phantom fee; baseline does not', () => {
  assert.ok(buildSite(['wrong_calc'])['/cart.html'].includes('total+=10;'));
  assert.ok(!buildSite([])['/cart.html'].includes('total+=10;'));
});

test('server: serves pages and honest 404s', async () => {
  const srv = await createFixtureServer(['broken_nav'], 0);
  const addr = srv.address();
  const opts = { headers: { Connection: 'close' } };
  const res = await fetch(`http://127.0.0.1:${addr.port}/index.html`, opts);
  const body = await res.text();
  assert.strictEqual(res.status, 200);
  assert.ok(body.includes('DemoShop'));
  const res404 = await fetch(`http://127.0.0.1:${addr.port}/about.html`, opts);
  assert.strictEqual(res404.status, 404);
  await res404.text(); // drain
  await new Promise((r) => srv.close(r));
});

test('analyze: failed step on a target element => DETECTED', () => {
  const report = {
    results: [{
      status: 'failed',
      steps_executed: [{ target: { text: 'About' }, status: 'fail' }],
    }],
  };
  assert.strictEqual(scoreChannel(report, BUGS.broken_nav), 'DETECTED');
});

test('analyze: passed steps over targets => NOT_DETECTED (honest)', () => {
  const report = {
    results: [{
      status: 'passed',
      steps_executed: [{ target: { text: 'Total' }, status: 'pass' }],
    }],
  };
  assert.strictEqual(scoreChannel(report, BUGS.wrong_calc), 'NOT_DETECTED');
});

test('analyze: untouched bug surface => NOT_COVERED', () => {
  const report = {
    results: [{ status: 'passed', steps_executed: [{ target: { text: 'Home' }, status: 'pass' }] }],
  };
  assert.strictEqual(scoreChannel(report, BUGS.dead_button), 'NOT_COVERED');
});

test('analyze: missing report => NO_REPORT', () => {
  assert.strictEqual(scoreChannel(null, BUGS.dead_button), 'NO_REPORT');
});

test('analyze: URL context on a FAILED step detects broken nav', () => {
  const report = {
    results: [{
      status: 'failed',
      steps_executed: [{
        target: { text: 'About link' },
        url: 'http://x/about.html',
        status: 'fail',
        reason: 'expected shop page, landed on 404',
      }],
    }],
  };
  assert.strictEqual(scoreChannel(report, BUGS.broken_nav), 'DETECTED');
});

test('analyze: analyzeVariant returns all three channels', () => {
  const r = analyzeVariant(BUGS.dead_button, { bExecutionReport: null, ftExecutionReport: null });
  assert.deepStrictEqual(r, { arch_b: 'NO_REPORT', fused: 'NO_REPORT', arch_a: 'NOT_APPLICABLE_V1' });
});
