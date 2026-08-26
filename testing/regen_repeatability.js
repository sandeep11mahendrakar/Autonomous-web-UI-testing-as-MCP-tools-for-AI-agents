'use strict';

/** Regenerate testing/REPEATABILITY.md from repeatability_data.json
 * plus fresh per-run artifact extraction (fixes field-mapping bugs
 * without re-running pipelines). Zero LLM. */
const fs = require('fs');
const path = require('path');
const { summarize } = require('./extract_run');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'repeatability_data.json'), 'utf8'));

function stats(nums) {
  const v = (nums || []).filter(Number.isFinite);
  if (!v.length) return 'not recorded';
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((n, x) => n + (x - mean) ** 2, 0) / v.length);
  return `${v.join('/')} (mean ${mean.toFixed(1)}, sd ${sd.toFixed(1)})`;
}

const lines = [
  '# Repeatability Study',
  '',
  `- Generated: ${new Date().toISOString()} (regenerated from run artifacts)`,
  '- Same configuration re-run 3x per site. Dimensions reported SEPARATELY:',
  '  exploration variability, test-execution flakiness, model/API variability.',
  '- NOTE: these runs executed on Groq free tier during its daily-token window;',
  '  several runs degraded to deterministic fallback mid-exploration and/or hit',
  '  TPD exhaustion — that degradation IS the API-variability dimension being',
  '  measured, reported honestly rather than excluded.',
  '',
];

for (const [site, runs] of Object.entries(data)) {
  lines.push(`## ${site}`);
  lines.push('');
  lines.push('| Run | Run ID | Status | A steps | A states | A test cases | B pass rate | FT pass | Fusion % | Duration (min) |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|');
  const enriched = runs.map((r) => {
    if (r.error || !r.run_id) return { ...r, s: null };
    return { ...r, s: summarize(r.run_id) };
  });
  for (const r of enriched) {
    if (r.error || !r.s) { lines.push(`| ${r.run} | ${r.run_id || '—'} | NO DATA | — | — | — | — | — | — | — |`); continue; }
    const e = r.s.A ? (r.s.A.totals || {}) : {};
    lines.push([
      r.run,
      r.run_id,
      r.s.manifest?.overall || '—',
      e.steps ?? '—',
      e.states ?? '—',
      (r.s.A_tests || []).length || '0',
      r.s.B ? r.s.B.summary.pass_rate : '—',
      r.s.FT ? `${r.s.FT.summary.passed}/${r.s.FT.summary.total}` : '0/0',
      r.s.DASH?.headline?.pct_final_tests_attributable_to_fusion ?? '—',
      r.duration_min ?? '—',
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }
  lines.push('');
  lines.push(`- A steps variance:  ${stats(enriched.map((r) => r.s?.A?.totals?.steps))}`);
  lines.push(`- A states variance: ${stats(enriched.map((r) => r.s?.A?.totals?.states))}`);
  lines.push(`- FT pass counts:    ${stats(enriched.map((r) => r.s?.FT?.summary.passed))}`);
  const rates = enriched.map((r) => r.s?.B?.summary.pass_rate).filter(Number.isFinite);
  if (rates.length) {
    const stable = new Set(rates).size === 1;
    lines.push(`- B execution stability: ${stable ? 'identical pass rate across runs' : 'VARIES across runs (flaky)'}`);
  }
  lines.push('- API variability: see Status column — PARTIAL_FAILURE rows indicate LLM quota/fallback interference during the study window.');
  lines.push('');
}

fs.writeFileSync(path.join(__dirname, 'REPEATABILITY.md'), lines.join('\n'));
console.log('REPEATABILITY.md regenerated');
