'use strict';

/**
 * regen_ledger.js — single-source ledger regenerator.
 *
 * Regenerates THREE derived files from the SAME clean run set so they can
 * never disagree again (the Jan-2026 concurrency incident stitched artifacts
 * from different sites into shared run folders — see docs/AUDIT_REPORT.md
 * ADDENDUM and testing/QUARANTINE_TIER2.md):
 *
 *   1. testing/site_reports/INDEX.md   — Tier-2 table rows: ONLY numeric cells
 *      (S4 accepted / FT live / Fusion-attributable) recomputed from
 *      dashboard_data.json + run_manifest.json. All other content untouched.
 *   2. testing/CAMPAIGN_EVALUATION.md  — full regen by delegating to the
 *      existing fusion/s8_campaign_eval.js logic (spawned as a child process).
 *   3. testing/VISION_TEST_QUALITY.md  — aggregated over clean runs only,
 *      using ONE boundary definition stated here:
 *        a test is STRONG iff any step used input_value/checked_state/
 *        dropdown_option_selected/select_option/scroll_position verification.
 *
 * Every regenerated file gets this header line:
 *   Regenerated <iso> by regen_ledger.js; boundary definition: <one-liner>;
 *   excluded runs: <list>
 *
 * Usage:
 *   node testing/regen_ledger.js [--exclude <run_id>]... [--root <dir>] [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// Default quarantine list: QUARANTINE_TIER2.md rows 13-20 MINUS row 13
// (LambdaTest) which the addendum CLEARED (testmuai.com = post-rebrand
// LambdaTest property). Rows 14-15 were re-run clean under new run ids;
// these old ids stay excluded because their folders hold wrong-site /
// localhost-fixture artifacts.
const DEFAULT_QUARANTINED = [
  'run_20260825_055129', // QUARANTINE row 14 old id — localhost B fixture (49205)
  'run_20260825_060707', // QUARANTINE row 15 old id — localhost B fixture (50172)
  'run_20260825_062152', // QUARANTINE row 16 — saucedemo/weatherspark stitch
  'run_20260825_063248', // QUARANTINE row 17 — saucedemo, not SahiTest
  'run_20260825_064713', // QUARANTINE row 18 — demoblaze, not The Internet
  'run_20260825_065652', // QUARANTINE row 19 — pure demoblaze, not PHPTravels
  'run_20260825_070918', // QUARANTINE row 20 — demoblaze-A + openlibrary-B merge
];

// Single place where the verification-strength boundary lives.
const BOUNDARY_DEFINITION =
  'a test is STRONG iff any step used input_value/checked_state/' +
  'dropdown_option_selected/select_option/scroll_position verification';

const STRONG_METHODS = ['input_value', 'checked_state', 'dropdown_option_selected', 'select_option', 'scroll_position'];
const MEDIUM_METHODS = ['url_change', 'popup_opened_or_dom_response'];

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return null;
  }
}

function buildHeaderLine(iso, excludedRuns) {
  return (
    `<!-- Regenerated ${iso} by regen_ledger.js; boundary definition: ${BOUNDARY_DEFINITION}; ` +
    `excluded runs: ${excludedRuns.length ? excludedRuns.join(', ') : '(none)'} -->`
  );
}

/** Insert the regeneration header right after the H1 title line. */
function prependHeader(md, headerLine) {
  const lines = md.split(/\r?\n/);
  const insertAt = lines[0] && lines[0].startsWith('#') ? 1 : 0;
  const filtered = lines.filter((l) => !l.includes('by regen_ledger.js'));
  filtered.splice(insertAt, 0, '', headerLine);
  return filtered.join('\n');
}

// ---------------------------------------------------------------------------
// 1. INDEX.md — Tier-2 table numeric-cell updates only
// ---------------------------------------------------------------------------

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

/**
 * Apply numeric-cell updates inside the "## TIER 2" section.
 * Cells updated per row (only when dashboard_data.json yields the numbers):
 *   idx 8: S4 accepted          -> "<accepted>/<generated> grounded"
 *   idx 9: FT live              -> "<passed>/<executed> PASS" (or untouched)
 *   idx 10: Fusion-attributable -> "**<pct>%**" bold preserved
 * Rows whose run is quarantined/excluded or lacks dashboard data are left
 * byte-for-byte identical.
 */
function applyIndexNumericUpdates(md, opts = {}) {
  const { root = ROOT, excluded = [], loadJson = readJson, nowIso = new Date().toISOString() } = opts;
  const lines = md.split(/\r?\n/);
  let inTier2 = false;
  const skipped = [];

  for (let i = 0; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) inTier2 = /^##\s+TIER 2/i.test(lines[i]);
    if (!inTier2 || !/^\|\s*\d+\s*\|/.test(lines[i])) continue;

    const cells = splitRow(lines[i]);
    const runId = (lines[i].match(/run_\d{8}_\d{6}/) || [null])[0];
    if (!runId) { skipped.push({ line: i + 1, reason: 'no run id' }); continue; }
    if (excluded.includes(runId)) { skipped.push({ line: i + 1, runId, reason: 'quarantined/excluded' }); continue; }

    const dd = loadJson(path.join(root, 'runs', runId, 'fusion', 'dashboard_data.json'));
    if (!dd) { skipped.push({ line: i + 1, runId, reason: 'no dashboard_data.json' }); continue; }

    const gen = dd.fusion && dd.fusion.tests_generated;
    const acc = dd.fusion && dd.fusion.tests_accepted;
    const exec = dd.execution && (dd.execution.executed_tests ?? dd.execution.total);
    const pass = dd.execution && dd.execution.passed;
    const pct = dd.headline && dd.headline.pct_final_tests_attributable_to_fusion;

    const out = cells.slice();
    if (Number.isFinite(gen) && Number.isFinite(acc)) out[8] = `${acc}/${gen} grounded`;
    if (Number.isFinite(pass) && Number.isFinite(exec) && exec > 0) out[9] = `${pass}/${exec} PASS`;
    if (Number.isFinite(pct)) out[10] = /\*\*/.test(cells[10]) ? `**${pct}%**` : `${pct}%`;

    lines[i] = `| ${out.join(' | ')} |`;
  }

  const headerLine = buildHeaderLine(nowIso, excluded);
  return { md: prependHeader(lines.join('\n'), headerLine), skipped };
}

// ---------------------------------------------------------------------------
// 3. VISION_TEST_QUALITY.md — same aggregation shape as vision_test_quality.js
// ---------------------------------------------------------------------------

function classifyStep(method, ok) {
  if (STRONG_METHODS.includes(method)) return 'STRONG';
  if (MEDIUM_METHODS.includes(method)) return 'MEDIUM';
  return method ? 'WEAK' : (ok ? 'MEDIUM' : 'WEAK');
}

function listRunDirs(root) {
  try {
    return fs.readdirSync(path.join(root, 'runs')).filter((d) => /^run_\d{8}_\d{6}$/.test(d)).sort();
  } catch (_) {
    return [];
  }
}

/**
 * Collect B replay results from every clean (non-excluded) run dir.
 * A run is additionally dropped if folder_purity proves it contaminated.
 */
function collectCleanRuns(root, excluded) {
  let assertPurity = null;
  try { ({ assertPurity } = require('./folder_purity')); } catch (_) { /* guard optional */ }

  const runs = [];
  for (const runId of listRunDirs(root)) {
    if (excluded.includes(runId)) continue;
    const rep = readJson(path.join(root, 'runs', runId, 'vision', 'outputs', 'execution_results.json'));
    if (!rep) continue;
    if (assertPurity) {
      const verdict = assertPurity(runId, { root });
      // Only PROVEN contamination drops a run; localhost flags / missing
      // optional artifacts do not (they are warnings, not wrong-site data).
      if (verdict.contamination.length > 0) continue;
    }
    runs.push({ runId, rep });
  }
  return runs;
}

function buildVisionQualityMarkdown(runs, { nowIso = new Date().toISOString(), excluded = [] } = {}) {
  const rows = [];
  const exemplars = [];
  for (const { runId, rep } of runs) {
    for (const t of rep.results || []) {
      const steps = t.steps_executed || [];
      let strong = 0;
      let medium = 0;
      let weak = 0;
      for (const s of steps) {
        const c = classifyStep((s.signal && s.signal.method) || (s.verification && s.verification.method) || null, s.ok);
        if (c === 'STRONG') strong++;
        else if (c === 'MEDIUM') medium++;
        else weak++;
      }
      const cls = strong ? 'STRONG' : (medium ? 'MEDIUM' : 'WEAK');
      rows.push({ runId, id: t.id, status: t.status, steps: steps.length, cls, objective: (t.objective || '').slice(0, 100) });
      if (cls === 'STRONG' && exemplars.length < 8) exemplars.push({ runId, id: t.id, objective: t.objective, expected: t.expected_result, status: t.status });
    }
  }

  const total = rows.length;
  const passed = rows.filter((r) => r.status === 'PASS').length;
  const byCls = { STRONG: 0, MEDIUM: 0, WEAK: 0 };
  for (const r of rows) byCls[r.cls]++;

  const L = [];
  L.push('# Vision Test-Case Quality Report');
  L.push('');
  L.push(buildHeaderLine(nowIso, excluded));
  L.push('');
  L.push(`Boundary definition (single source of truth): **${BOUNDARY_DEFINITION}**.`);
  L.push('');
  L.push('## Rubric summary');
  L.push('');
  L.push('```text');
  L.push(`Total B test cases executed:   ${total}`);
  L.push(`Passed:                        ${passed} (${total ? Math.round((passed / total) * 100) : 0}%)`);
  L.push(`Verification strength:`);
  L.push(`  STRONG (value-level asserts): ${byCls.STRONG}`);
  L.push(`  MEDIUM (state-change):        ${byCls.MEDIUM}`);
  L.push(`  WEAK   (body-text fallback):  ${byCls.WEAK}`);
  L.push('```');
  L.push('');
  L.push('## Per-test ledger');
  L.push('');
  L.push('| Run | Test | Class | Status | Steps | Objective |');
  L.push('|---|---|---|---|---|---|');
  for (const r of rows.sort((a, b) => a.runId.localeCompare(b.runId))) {
    L.push(`| ${r.runId.slice(-6)} | ${r.id} | ${r.cls} | ${r.status} | ${r.steps} | ${(r.objective || '').replace(/\|/g, '/')} |`);
  }
  L.push('');
  return L.join('\n');
}

// ---------------------------------------------------------------------------
// 2. CAMPAIGN_EVALUATION.md — delegate to existing s8 logic
// ---------------------------------------------------------------------------

function regenerateCampaignEval(root) {
  const script = path.join(root, 'fusion', 's8_campaign_eval.js');
  const res = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  return { status: res.status, stderr: (res.stderr || '').trim(), stdout: (res.stdout || '').trim() };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const excluded = [...DEFAULT_QUARANTINED];
  let root = ROOT;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--exclude' && args[i + 1]) excluded.push(args[++i]);
    else if (args[i] === '--root' && args[i + 1]) root = path.resolve(args[++i]);
    else if (args[i] === '--dry-run') dryRun = true;
  }

  const nowIso = new Date().toISOString();
  const indexPath = path.join(root, 'testing', 'site_reports', 'INDEX.md');
  const cePath = path.join(root, 'testing', 'CAMPAIGN_EVALUATION.md');
  const vtqPath = path.join(root, 'testing', 'VISION_TEST_QUALITY.md');

  const indexMd = fs.readFileSync(indexPath, 'utf8');
  const { md: newIndexMd, skipped } = applyIndexNumericUpdates(indexMd, { root, excluded, nowIso });

  const runs = collectCleanRuns(root, excluded);
  const vtqMd = buildVisionQualityMarkdown(runs, { nowIso, excluded });

  console.log(`[regen_ledger] excluded runs: ${excluded.join(', ')}`);
  for (const s of skipped) console.log(`[regen_ledger] INDEX row left untouched (line ${s.line}${s.runId ? `, ${s.runId}` : ''}): ${s.reason}`);

  if (dryRun) {
    console.log('[regen_ledger] --dry-run: no files written.');
    process.exit(0);
  }

  fs.writeFileSync(indexPath, newIndexMd.endsWith('\n') ? newIndexMd : newIndexMd + '\n');
  fs.writeFileSync(vtqPath, vtqMd.endsWith('\n') ? vtqMd : vtqMd + '\n');
  console.log(`[regen_ledger] wrote ${indexPath} and ${vtqPath} (${vtqMd.split('\n').length} lines)`);

  const ce = regenerateCampaignEval(root);
  if (ce.status !== 0) {
    console.error(`[regen_ledger] s8_campaign_eval.js exited ${ce.status}: ${ce.stderr}`);
    process.exit(1);
  }
  const ceMd = fs.readFileSync(cePath, 'utf8');
  fs.writeFileSync(cePath, prependHeader(ceMd, buildHeaderLine(nowIso, excluded)));
  console.log(`[regen_ledger] regenerated ${cePath} via fusion/s8_campaign_eval.js${ce.stdout ? ` — ${ce.stdout}` : ''}`);
}

if (require.main === module) main();

module.exports = {
  DEFAULT_QUARANTINED,
  BOUNDARY_DEFINITION,
  buildHeaderLine,
  prependHeader,
  applyIndexNumericUpdates,
  classifyStep,
  collectCleanRuns,
  buildVisionQualityMarkdown,
};
