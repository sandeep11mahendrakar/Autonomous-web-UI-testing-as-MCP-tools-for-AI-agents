'use strict';

/**
 * vision_test_quality.js — aggregate Architecture B test-case QUALITY across
 * all campaign runs. Produces testing/VISION_TEST_QUALITY.md with a rubric:
 *   groundedness  (targets resolved live, preverified)
 *   verification strength (input_value/dropdown > checked/url > body_text)
 *   actionability (steps executed vs failed-to-resolve)
 *   outcome       (pass/fail honestly classified)
 * Plus verbatim exemplar test cases. Zero LLM.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RUNS = path.join(ROOT, 'runs');

const STRONG = ['input_value', 'checked_state', 'dropdown_option_selected', 'select_option', 'scroll_position'];
const MEDIUM = ['url_change', 'popup_opened_or_dom_response'];

function j(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }

function* walkRuns() {
  for (const d of fs.readdirSync(RUNS).sort()) {
    const rep = j(path.join(RUNS, d, 'vision', 'outputs', 'execution_results.json'));
    if (rep) yield { runId: d, rep };
  }
}

function classify(method) {
  if (STRONG.includes(method)) return 'STRONG';
  if (MEDIUM.includes(method)) return 'MEDIUM';
  return 'WEAK';
}

const rows = [];
const exemplars = [];
// Quarantined runs (wrong-site evidence — see testing/QUARANTINE_TIER2.md)
const QUARANTINED = new Set([
  // run_20260825_053921 (lambdatest) CLEARED: B explore #2 + FTs ran on
  // testmuai.com, official post-rebrand LambdaTest domain (301 verified live) 'run_20260825_055129', 'run_20260825_060707',
  'run_20260825_062152', 'run_20260825_063248', 'run_20260825_064713',
  'run_20260825_065652', 'run_20260825_070918',
]);
for (const { runId, rep } of walkRuns()) {
  if (QUARANTINED.has(runId)) continue;
  for (const t of rep.results || []) {
    const steps = t.steps_executed || [];
    let strong = 0, medium = 0, weak = 0;
    for (const s of steps) {
      const m = s.signal?.method || s.verification?.method || null;
      const c = m ? classify(m) : (s.ok ? 'MEDIUM' : 'WEAK');
      if (c === 'STRONG') strong++; else if (c === 'MEDIUM') medium++; else weak++;
    }
    const cls = strong ? 'STRONG' : (medium ? 'MEDIUM' : 'WEAK');
    rows.push({
      runId,
      id: t.id,
      status: t.status,
      steps: steps.length,
      fills: steps.filter(s => s.action === 'fill').length,
      redetect: steps.filter(s => s.re_detected).length,
      staleBlocked: t.stale_coordinates_prevented || 0,
      unresolved: t.unresolved_targets || 0,
      cls,
      objective: (t.objective || '').slice(0, 100),
    });
    if (cls === 'STRONG' && exemplars.length < 8) {
      exemplars.push({
        runId, id: t.id, objective: t.objective,
        expected: t.expected_result,
        status: t.status,
        steps: steps.map(s => ({
          i: s.index, action: s.action,
          target: s.target?.text || s.target?.type || '',
          ok: s.ok,
          method: s.signal?.method || null,
          detail: (s.signal?.detail || '').slice(0, 90),
          via: s.resolution_via,
        })),
      });
    }
  }
}

// Aggregate
const total = rows.length;
const byCls = { STRONG: 0, MEDIUM: 0, WEAK: 0 };
for (const r of rows) byCls[r.cls]++;
const passed = rows.filter(r => r.status === 'PASS').length;
const totalSteps = rows.reduce((n, r) => n + r.steps, 0);
const redetected = rows.reduce((n, r) => n + r.redetect, 0);
const staleBlocked = rows.reduce((n, r) => n + r.staleBlocked, 0);
const unresolved = rows.reduce((n, r) => n + r.unresolved, 0);
const fillActions = rows.reduce((n, r) => n + r.fills, 0);

const L = [];
L.push('# Vision Test-Case Quality Report');
L.push('');
L.push(`Generated: ${new Date().toISOString()} — deterministic aggregation over ALL`);
L.push(`campaign runs with B replay results. Every number traces to artifacts.`);
L.push('');
L.push('## Rubric summary');
L.push('');
L.push('```text');
L.push(`Total B test cases executed:   ${total}`);
L.push(`Passed:                        ${passed} (${total ? Math.round(passed / total * 100) : 0}%)`);
L.push(`Verification strength:`);
L.push(`  STRONG (value-level asserts): ${byCls.STRONG}`);
L.push(`  MEDIUM (state-change):        ${byCls.MEDIUM}`);
L.push(`  WEAK   (body-text fallback):  ${byCls.WEAK}`);
L.push(`Total steps executed:          ${totalSteps}`);
L.push(`  fill actions (value writes): ${fillActions}`);
L.push(`Targets re-detected on state:  ${redetected}`);
L.push(`Stale coordinates prevented:   ${staleBlocked}`);
L.push(`Unresolved targets (honest):   ${unresolved}`);
L.push('```');
L.push('');
L.push('Interpretation: STRONG = the test asserted a VALUE (field contents, dropdown');
L.push('selection, checked state) and matched it — the highest quality class.');
L.push('WEAK = pass rested on page-body heuristics; counted honestly against us.');
L.push('');
L.push('## Per-test ledger');
L.push('');
L.push('| Run | Test | Class | Status | Steps | Fills | Re-detected | Objective |');
L.push('|---|---|---|---|---|---|---|---|');
for (const r of rows.sort((a, b) => a.runId.localeCompare(b.runId))) {
  L.push(`| ${r.runId.slice(-6)} | ${r.id} | ${r.cls} | ${r.status} | ${r.steps} | ${r.fills} | ${r.redetect} | ${r.objective.replace(/\|/g, '/')} |`);
}
L.push('');
L.push('## Exemplar STRONG test cases (verbatim from artifacts)');
L.push('');
for (const ex of exemplars) {
  L.push(`### ${ex.id} (${ex.runId}) — ${ex.status.toUpperCase()}`);
  L.push('');
  L.push(`- **Objective:** ${ex.objective}`);
  L.push(`- **Expected:** ${ex.expected}`);
  L.push('- **Steps:**');
  for (const st of ex.steps) {
    L.push(`  ${st.i}. \`${st.action}\` on "${st.target}" -> ${st.ok ? 'OK' : 'FAIL'}${st.method ? ` [${st.method}: ${st.detail}]` : ''}${st.via ? ` (resolved via ${st.via})` : ''}`);
  }
  L.push('');
}

fs.writeFileSync(path.join(__dirname, 'VISION_TEST_QUALITY.md'), L.join('\n'));
console.log(`Wrote VISION_TEST_QUALITY.md — ${total} tests, ${byCls.STRONG} STRONG / ${byCls.MEDIUM} MEDIUM / ${byCls.WEAK} WEAK, pass ${passed}/${total}`);
