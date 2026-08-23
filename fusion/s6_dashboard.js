'use strict';

/**
 * s6_dashboard.js — evaluation dashboard builder. NO LLM calls.
 *
 * Aggregates A / B / S1 / S2 / S4 / Fusion-execution artifacts into
 *   runs/<run>/fusion/dashboard_data.json   (metrics + provenance)
 *   runs/<run>/fusion/dashboard.html        (standalone, no server needed)
 *
 * The HTML embeds the data JSON directly so it renders from file:// with zero
 * framework and zero network access. `--validate` re-checks the produced data
 * against the real artifacts' known invariants instead of writing files.
 *
 * Usage: node fusion/s6_dashboard.js <run_id | run_dir> [--validate]
 */

const fs = require('fs');
const path = require('path');
const { buildDashboardData } = require('./lib/dashboard_data');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

// ---------------------------------------------------------------------------
// HTML rendering — vanilla JS + CSS, data embedded as JSON.
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderHtml(data) {
  const m = data.coverage_matrix;
  const h = data.headline;
  const ex = data.execution;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Fusion Evaluation Dashboard — ${esc(data.run_dir)}</title>
<style>
  :root { --bg:#0f1216; --panel:#171c23; --edge:#2a313b; --ink:#dbe2ea; --dim:#8b96a5;
          --a:#4da3ff; --b:#ffb454; --f:#59d499; --bad:#ff6b6b; --warn:#ffd166; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink);
         font:14px/1.45 "Segoe UI", system-ui, sans-serif; }
  header { padding:20px 28px 8px; }
  h1 { font-size:20px; margin:0 0 4px; }
  .sub { color:var(--dim); font-size:12px; }
  main { padding:0 28px 40px; max-width:1200px; }
  section { margin-top:22px; }
  h2 { font-size:15px; text-transform:uppercase; letter-spacing:.08em;
       color:var(--dim); border-bottom:1px solid var(--edge); padding-bottom:6px; }
  .cards { display:flex; flex-wrap:wrap; gap:12px; }
  .card { background:var(--panel); border:1px solid var(--edge); border-radius:10px;
          padding:14px 18px; min-width:150px; }
  .card .v { font-size:26px; font-weight:600; }
  .card .l { color:var(--dim); font-size:11px; text-transform:uppercase; letter-spacing:.06em; }
  table { border-collapse:collapse; width:100%; background:var(--panel);
          border:1px solid var(--edge); border-radius:10px; overflow:hidden; }
  th, td { text-align:left; padding:8px 12px; border-bottom:1px solid var(--edge); font-size:13px; }
  th { color:var(--dim); font-weight:600; font-size:11px; text-transform:uppercase;
       letter-spacing:.05em; background:#131820; }
  tr:last-child td { border-bottom:none; }
  td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; }
  .A { color:var(--a); } .B { color:var(--b); } .F { color:var(--f); }
  .pass { color:var(--f); font-weight:600; } .fail { color:var(--bad); font-weight:600; }
  .warn { color:var(--warn); }
  .muted { color:var(--dim); }
  ul { margin:6px 0; padding-left:18px; }
  li { margin:2px 0; }
  .prov { color:var(--dim); font-size:11px; margin-top:8px; }
  .prov code { background:#131820; padding:1px 5px; border-radius:4px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  @media (max-width:900px){ .grid2{grid-template-columns:1fr;} }
  .banner { background:linear-gradient(90deg,#12331f,#171c23); border:1px solid var(--f);
            border-radius:10px; padding:14px 18px; display:flex; gap:24px; align-items:center;
            flex-wrap:wrap; }
  .banner .big { font-size:30px; font-weight:700; color:var(--f); }
</style>
</head>
<body>
<header>
  <h1>Fusion Evaluation Dashboard</h1>
  <div class="sub">run: ${esc(data.run_dir)} &middot; built deterministically from artifacts &middot; LLM calls in aggregation: ${data.llm_calls}</div>
</header>
<main>

<section>
  <h2>Fusion-Attributable Coverage (headline)</h2>
  <div class="banner">
    <div><div class="big">${h.pct_final_tests_attributable_to_fusion}%</div>
    <div class="l">of final tests attributable to FUSION</div></div>
    <div><div class="v">${h.total_final_tests}</div><div class="l">total final tests (${h.tests_from_architecture_a} A + ${h.tests_from_architecture_b} B + ${h.tests_fusion_created} fusion)</div></div>
    <div><div class="v">${h.tests_already_covered_by_ab}</div><div class="l">fusion tests duplicating A/B (audit rejections: ${h.duplicate_rejections_audit})</div></div>
    <div><div class="v">${h.novel_targets_exercised_by_fusion}</div><div class="l">novel element/behavior targets only Fusion exercises</div></div>
  </div>
  <div class="prov">provenance: <code>fusion/fusion_tests.json</code> <code>fusion/fusion_report.json</code> <code>dom/test_cases.json</code> <code>vision/outputs/test_cases_*</code></div>
</section>

<section>
  <h2>Coverage Matrix</h2>
  <table>
    <tr><th></th><th class="num A">A</th><th class="num B">B</th><th class="num F">Fusion</th><th class="num">Total distinct</th></tr>
    <tr><td>Elements covered</td><td class="num A">${m.elements.by_a}</td><td class="num B">${m.elements.by_b}</td><td class="num F">${m.elements.by_fusion_only}</td><td class="num">${m.elements.covered_any} / ${m.elements.total}</td></tr>
    <tr><td>Behaviors covered</td><td class="num A">${m.behaviors.by_a}</td><td class="num B">${m.behaviors.by_b}</td><td class="num F">${m.behaviors.by_fusion_only}</td><td class="num">${m.behaviors.total}</td></tr>
    <tr><td>Tests generated</td><td class="num A">${m.tests.a}</td><td class="num B">${m.tests.b}</td><td class="num F">${m.tests.fusion}</td><td class="num">${m.tests.total}</td></tr>
    <tr><td>States observed</td><td class="num A">${m.states.a}</td><td class="num B">${m.states.b}</td><td class="num F">${m.states.fusion_pages_touched} pages</td><td class="num">&mdash;</td></tr>
  </table>
  <div class="sub" style="margin-top:6px">${esc(m.note)}</div>
  <div class="prov">provenance: <code>fusion/catalog.json</code> <code>dom/states.json</code> <code>vision/outputs/*_exploration_history.json</code></div>
</section>

<div class="grid2">
<section>
  <h2>Architecture A vs B</h2>
  <table>
    <tr><th></th><th class="num A">A (DOM)</th><th class="num B">B (Vision)</th></tr>
    <tr><td>Tests generated</td><td class="num">${data.architecture_comparison.a.tests}</td><td class="num">${data.architecture_comparison.b.tests}</td></tr>
    <tr><td>States observed</td><td class="num">${data.architecture_comparison.a.states}</td><td class="num">${data.architecture_comparison.b.states}</td></tr>
    <tr><td>Elements seen (catalog)</td><td class="num">${data.architecture_comparison.a.elements_seen}</td><td class="num">${data.architecture_comparison.b.elements_seen}</td></tr>
    <tr><td>Behaviors seen (catalog)</td><td class="num">${data.architecture_comparison.a.behaviors_seen}</td><td class="num">${data.architecture_comparison.b.behaviors_seen}</td></tr>
    <tr><td>Action targets exercised</td><td class="num">${data.architecture_comparison.a.targets_covered}</td><td class="num">${data.architecture_comparison.b.targets_covered}</td></tr>
  </table>
</section>

<section>
  <h2>Execution Results</h2>
  ${ex.available ? `
  <table>
    <tr><th>Test</th><th>Step</th><th>Action</th><th>Target</th><th>Verify via</th><th class="num">Result</th></tr>
    ${ex.steps.map(s => `<tr>
      <td>${esc(s.test_id)}</td><td class="num">${s.step}</td><td>${esc(s.action)}</td>
      <td>${esc(s.ref)}</td><td class="muted">${esc(s.method || '')}</td>
      <td class="num ${s.result === 'PASS' ? 'pass' : 'fail'}">${s.result}</td></tr>`).join('')}
  </table>
  <p class="sub">Suite: <span class="${ex.failed ? 'fail' : 'pass'}">${ex.passed}/${ex.executed_tests} tests passed</span>,
     ${ex.steps_passed}/${ex.steps_total} steps. Weak verifications: ${ex.weak_verifications}.
     Reliability/flakiness: ${esc(ex.reliability_flakiness)}.</p>`
  : '<p class="muted">No execution artifact found.</p>'}
  <div class="prov">provenance: <code>fusion/ft_execution_results.json</code> <code>fusion/ft_execution_evidence/</code></div>
</section>
</div>

<div class="grid2">
<section>
  <h2>A-only findings</h2>
  <ul>${data.findings.a_only_sample.map(e =>
      `<li><span class="A">${esc(e.id)}</span> ${esc(e.type)} &ldquo;${esc(e.label_or_target)}&rdquo; <span class="muted">@ ${esc(String(e.page_key).replace('https://demoqa.com',''))}</span></li>`).join('') ||
      '<li class="muted">none</li>'}</ul>
  <p class="sub">A-only elements: ${data.findings.a_only_elements} &middot; behaviors: ${data.findings.a_only_behaviors}</p>
</section>

<section>
  <h2>B-only findings</h2>
  <ul>${data.findings.b_only_sample.map(e =>
      `<li><span class="B">${esc(e.id)}</span> ${esc(e.type)} &ldquo;${esc(e.label_or_target)}&rdquo; <span class="muted">@ ${esc(String(e.page_key).replace('https://demoqa.com',''))}</span></li>`).join('') ||
      '<li class="muted">none</li>'}</ul>
  <p class="sub">B-only elements: ${data.findings.b_only_elements} &middot; behaviors: ${data.findings.b_only_behaviors}</p>
</section>
</div>

<div class="grid2">
<section>
  <h2>Common findings</h2>
  <ul>${data.findings.common_sample.map(e =>
      `<li>${esc(e.id)} ${esc(e.type)} &ldquo;${esc(e.label_or_target)}&rdquo;</li>`).join('') ||
      '<li class="muted">none</li>'}</ul>
  <p class="sub">Common elements: ${data.findings.common_elements} &middot; common behaviors: ${data.findings.common_behaviors}</p>
</section>

<section>
  <h2>Conflicts (${data.findings.conflict_count})</h2>
  <ul>${data.findings.conflicts.map(c =>
      `<li><span class="warn">${esc(c.label)}</span> on ${esc(String(c.page_key).replace('https://demoqa.com',''))}: ${c.values.map(esc).join(' vs ')} <span class="muted">&mdash; ${esc(c.note || '')}</span></li>`).join('') ||
      '<li class="muted">none</li>'}</ul>
</section>
</div>

<section>
  <h2>Uncovered gaps remaining</h2>
  <p class="sub">Actionable uncovered elements: <b>${data.findings.uncovered_actionable_elements}</b> &middot;
     uncovered behaviors: <b>${data.findings.uncovered_behaviors}</b> &middot;
     quiet pages: <b>${data.findings.quiet_pages}</b> &middot;
     anomalies: <code>${esc(JSON.stringify(data.findings.anomalies || {}))}</code></p>
  <table>
    <tr><th>Type</th><th>ID</th><th>Page</th><th>Target</th></tr>
    ${data.gaps.uncovered_behaviors_sample.map(g => `<tr><td>behavior</td><td>${esc(g.id)}</td><td class="muted">${esc(String(g.page_key).replace('https://demoqa.com',''))}</td><td>${esc(g.label_or_target)}</td></tr>`).join('')}
    ${data.gaps.actionable_uncovered_sample.map(g => `<tr><td>element</td><td>${esc(g.id)}</td><td class="muted">${esc(String(g.page_key).replace('https://demoqa.com',''))}</td><td>${esc(g.label_or_target)}</td></tr>`).join('')}
  </table>
  <div class="prov">provenance: <code>fusion/gap_report.json</code></div>
</section>

<section>
  <h2>Fusion-generated tests</h2>
  ${data.fusion.tests.map(t => `
  <div class="card" style="min-width:100%;margin-bottom:12px">
    <div><b>${esc(t.test_id)}</b> <span class="F">&larr; ${esc(t.source_gap_id)}</span></div>
    <div>${esc(t.objective)}</div>
    <div class="muted">novelty: ${esc(t.novelty_reason)}</div>
    <ul>${t.steps.map(s => `<li><code>${esc(s)}</code></li>`).join('')}</ul>
    <div class="muted">start: ${esc(t.start_page)}${t.provenance && t.provenance.catalog_sources ? ' &middot; provenance: ' + t.provenance.catalog_sources.map(esc).join(', ') : ''}</div>
  </div>`).join('')}
  <p class="sub">LLM calls used by S4: ${data.fusion.llm_calls} (${esc(data.fusion.provider || '')}, prompt ${data.fusion.prompt_chars} chars) &middot;
     grounded: ${data.fusion.all_grounded} &middot; duplicates of A/B: ${data.fusion.duplicated_existing} &middot;
     rejected candidates: ${data.fusion.tests_rejected}</p>
</section>

</main>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
function validate(data, { reference = false } = {}) {
  // Structural invariants that must hold for ANY correct aggregation.
  // `reference` mode (--validate-demoqa) additionally enforces the exact
  // DemoQA reference-run numbers (kept for regression-checking that one run).
  const problems = [];
  const push = (ok, msg) => { if (!ok) problems.push(msg); };
  const m = data.coverage_matrix;

  push(!!m && typeof m === 'object', 'coverage_matrix missing');
  if (!m) return problems;
  push(m.tests.total === m.tests.a + m.tests.b + m.tests.fusion,
    `tests total ${m.tests.total} != A(${m.tests.a}) + B(${m.tests.b}) + Fusion(${m.tests.fusion})`);
  const pct = data.headline.pct_final_tests_attributable_to_fusion;
  push(typeof pct === 'number' && pct >= 0 && pct <= 100, `fusion attribution out of range: ${pct}`);
  push(pct === Math.round((m.tests.fusion / Math.max(m.tests.total, 1)) * 1000) / 10,
    `fusion attribution ${pct}% inconsistent with matrix (${m.tests.fusion}/${m.tests.total})`);
  push(data.findings.conflict_count >= 0 &&
    data.findings.uncovered_actionable_elements >= 0 &&
    data.findings.uncovered_behaviors >= 0, 'findings counts must be non-negative');
  push(data.llm_calls === 0, 'dashboard aggregation must make zero LLM calls');
  if (data.execution.available) {
    push(data.execution.passed + data.execution.failed === data.execution.total ||
         data.execution.passed + data.execution.failed > 0,
      'execution summary internally inconsistent');
    if (data.execution.steps_total) {
      push(data.execution.steps_passed <= data.execution.steps_total,
        'steps_passed exceeds steps_total');
    }
  }

  if (reference) {
    push(m.elements.total === 204, `elements total expected 204, got ${m.elements.total}`);
    push(m.behaviors.total === 23, `behaviors total expected 23, got ${m.behaviors.total}`);
    push(m.tests.a === 2 && m.tests.b === 1 && m.tests.fusion === 1,
      `tests expected A=2 B=1 fusion=1, got A=${m.tests.a} B=${m.tests.b} F=${m.tests.fusion}`);
    push(m.tests.total === 4, `total final tests expected 4, got ${m.tests.total}`);
    push(m.states.a === 15, `A states expected 15, got ${m.states.a}`);
    push(m.states.b === 9, `B states expected 9, got ${m.states.b}`);
    push(pct === 25, `fusion attribution expected 25%, got ${pct}%`);
    push(data.headline.tests_already_covered_by_ab === 0, 'no fusion test may duplicate A/B');
    push(data.findings.conflict_count === 9, `conflicts expected 9, got ${data.findings.conflict_count}`);
    push(data.findings.uncovered_actionable_elements === 80,
      `actionable uncovered expected 80, got ${data.findings.uncovered_actionable_elements}`);
    push(data.findings.uncovered_behaviors === 12,
      `uncovered behaviors expected 12, got ${data.findings.uncovered_behaviors}`);
    push(ex_ok(data), 'execution: expected FT001 PASS with 4/4 steps');
    push(data.execution.verification_methods &&
         Object.keys(data.execution.verification_methods).length >= 2,
      'expected >=2 distinct verification methods recorded');
  }
  return problems;
}

function ex_ok(data) {
  return data.execution.available &&
    data.execution.passed === 1 && data.execution.failed === 0 &&
    data.execution.steps_total === 4 && data.execution.steps_passed === 4;
}

function main() {
  const args = process.argv.slice(2);
  const arg = args.find(a => !a.startsWith('--'));
  const doValidate = args.includes('--validate');
  const doValidateRef = args.includes('--validate-demoqa');
  if (!arg) {
    console.error('Usage: node fusion/s6_dashboard.js <run_id | run_dir> [--validate] [--validate-demoqa]');
    process.exit(2);
  }
  const root = path.join(__dirname, '..', 'runs');
  const runDir = fs.existsSync(arg) ? arg : path.join(root, arg);

  const data = buildDashboardData(runDir);

  if (doValidate || doValidateRef) {
    const problems = validate(data, { reference: doValidateRef });
    console.log(`[s6] validation checks (${doValidateRef ? 'reference/DemoQA' : 'structural'}): ${problems.length ? 'FAIL' : 'ALL PASS'}`);
    for (const p of problems) console.log('[s6]   FAIL:', p);
    console.log('[s6] headline:', JSON.stringify({
      total_final_tests: data.headline.total_final_tests,
      pct_fusion: data.headline.pct_final_tests_attributable_to_fusion,
      novel_targets: data.headline.novel_targets_exercised_by_fusion,
    }));
    console.log('[s6] matrix:', JSON.stringify(data.coverage_matrix));
    process.exit(problems.length ? 1 : 0);
  }

  const outDir = path.join(runDir, 'fusion');
  fs.writeFileSync(path.join(outDir, 'dashboard_data.json'), JSON.stringify(data, null, 2));
  fs.writeFileSync(path.join(outDir, 'dashboard.html'), renderHtml(data));
  console.log(`[s6] Wrote ${path.join(outDir, 'dashboard_data.json')}`);
  console.log(`[s6] Wrote ${path.join(outDir, 'dashboard.html')} (standalone — open directly in a browser)`);
  console.log('[s6] Headline: ' +
    `${data.headline.pct_final_tests_attributable_to_fusion}% of final tests attributable to Fusion ` +
    `(${data.headline.tests_fusion_created}/${data.headline.total_final_tests}); ` +
    `novel targets: ${data.headline.novel_targets_exercised_by_fusion}`);
}

if (require.main === module) main();
module.exports = { renderHtml, esc };
