'use strict';

/**
 * run_repeatability.js — flakiness mini-study orchestrator.
 *
 * Runs the SAME site N times with an identical configuration and reports
 * variance across three SEPARATED dimensions (they are not the same thing):
 *
 *   1. exploration variability  — steps/states/elements per run
 *   2. test execution flakiness — same generated tests passing/failing
 *   3. model/API variability    — LLM call counts / provider hiccups
 *
 * Usage:
 *   node testing/run_repeatability.js [--runs 3] [--sites a,b,c]
 *
 * Default sites: saucedemo, demoblaze, globalsqa (Tier-1 representatives).
 * Output: testing/REPEATABILITY.md + repeatability_data.json
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SITES = {
  saucedemo: 'https://www.saucedemo.com',
  demoblaze: 'https://www.demoblaze.com',
  globalsqa: 'https://www.globalsqa.com/demo-site/',
};

function log(m) { console.log(`[repeat] ${m}`); }
function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function run(cmd, args, cwd, logFile, timeoutMs) {
  return new Promise((resolve) => {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    const stream = fs.createWriteStream(logFile, { flags: 'a' });
    stream.write(`\n===== ${cmd} ${args.join(' ')} @ ${new Date().toISOString()} =====\n`);
    const child = spawn(cmd, args, { cwd, shell: process.platform === 'win32' });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
        else child.kill();
      } catch (_) {}
    }, timeoutMs);
    child.stdout.on('data', (d) => stream.write(d));
    child.stderr.on('data', (d) => stream.write(d));
    child.on('close', (code) => {
      clearTimeout(timer);
      stream.end();
      resolve({ code, timedOut });
    });
  });
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}

function latestRunDir(runsRoot, minMs) {
  const dirs = fs.readdirSync(runsRoot)
    .filter((d) => d.startsWith('run_') && fs.statSync(path.join(runsRoot, d)).mtimeMs >= minMs)
    .sort();
  return dirs[dirs.length - 1] || null;
}

async function oneRun(siteKey, url, outDir, i) {
  log(`${siteKey} run ${i + 1}: starting`);
  const startedAt = Date.now() - 5000;
  await run('node', ['runBoth.js', url], ROOT,
    path.join(outDir, `pipeline_run${i + 1}.log`), 45 * 60 * 1000);
  const runId = latestRunDir(path.join(ROOT, 'runs'), startedAt);
  if (!runId) return { run: i + 1, error: 'no run dir produced' };
  const runDir = path.join(ROOT, 'runs', runId);

  // fusion chain so every repetition is scored identically to campaign sites
  for (const s of ['s1_build_catalog.js', 's2_gap_report.js', 's4_fusion_synthesis.js', 'execute_fusion_tests.js']) {
    await run('node', [`fusion/${s}`, runId], ROOT, path.join(outDir, `fusion_run${i + 1}.log`), 15 * 60 * 1000);
  }

  const manifest = readJson(path.join(runDir, 'run_manifest.json')) || {};
  const aSummary = readJson(path.join(runDir, 'dom', 'exploration_summary.json')) || {};
  const dd = readJson(path.join(runDir, 'fusion', 'dashboard_data.json'));
  const bExec = readJson(path.join(runDir, 'vision', 'outputs', 'execution_results.json'));
  const ftExec = readJson(path.join(runDir, 'fusion', 'ft_execution_results.json'));
  // exploration_summary schema: totals.{steps,states,...}, visited_urls[]
  const aTotals = aSummary.totals || {};

  return {
    run: i + 1,
    run_id: runId,
    overall_status: manifest.overall_status || null,
    exploration: {
      a_steps: aTotals.steps ?? null,
      a_states: aTotals.states ?? null,
      a_urls: aTotals.unique_urls ?? (Array.isArray(aSummary.visited_urls) ? aSummary.visited_urls.length : null),
      b_steps: bExec ? bExec.summary?.total ?? null : null,
    },
    tests: {
      a_test_cases: (readJson(path.join(runDir, 'dom', 'test_cases.json')) || []).length || null,
      b_pass_rate: bExec ? bExec.summary.pass_rate : null,
      ft_total: ftExec ? ftExec.summary.total : 0,
      ft_passed: ftExec ? ftExec.summary.passed : 0,
    },
    fusion_pct: dd?.headline?.pct_final_tests_attributable_to_fusion ?? null,
    llm_calls: dd?.llm_calls ?? null,
    duration_min: manifest.architecture_a && manifest.architecture_b
      ? Number(((manifest.architecture_a.duration_ms + manifest.architecture_b.duration_ms) / 60000).toFixed(1))
      : null,
  };
}

function stats(nums) {
  const v = nums.filter(Number.isFinite);
  if (!v.length) return 'not recorded';
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((n, x) => n + (x - mean) ** 2, 0) / v.length);
  return `${v.join('/')} (mean ${mean.toFixed(1)}, sd ${sd.toFixed(1)})`;
}

function writeReport(data) {
  const lines = [
    '# Repeatability Study',
    '',
    `- Generated: ${new Date().toISOString()}`,
    '- Same configuration re-run N times per site. BLOCKED/failed repetitions are',
    '  reported as-is; variance over missing values is "not recorded".',
    '- Dimensions reported SEPARATELY: exploration variability, execution flakiness,',
    '  model/API variability.',
    '',
  ];
  for (const [site, runs] of Object.entries(data)) {
    lines.push(`## ${site}`);
    lines.push('');
    lines.push('| Run | Run ID | Status | A steps | A states | B tests | B pass rate | FT pass | Fusion % | LLM calls | Duration (min) |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of runs) {
      if (r.error) { lines.push(`| ${r.run} | — | ERROR (${r.error}) | — | — | — | — | — | — | — | — |`); continue; }
      lines.push(`| ${r.run} | ${r.run_id} | ${r.overall_status} | ${r.exploration.a_steps} | ${r.exploration.a_states} | ${r.tests.a_test_cases} | ${r.tests.b_pass_rate ?? '—'} | ${r.tests.ft_passed}/${r.tests.ft_total} | ${r.fusion_pct ?? '—'} | ${r.llm_calls ?? '—'} | ${r.duration_min ?? '—'} |`);
    }
    lines.push('');
    lines.push(`- A steps variance: ${stats(runs.map((r) => r.exploration?.a_steps))}`);
    lines.push(`- FT pass counts:   ${stats(runs.map((r) => r.tests?.ft_passed))}`);
    lines.push(`- LLM calls:        ${stats(runs.map((r) => r.llm_calls))}`);
    const stableFt = runs.every((r) => r.tests && r.tests.ft_passed === runs[0].tests?.ft_passed);
    lines.push(`- Execution stability: ${stableFt ? 'FT outcomes identical across runs' : 'FT outcomes VARY across runs (flaky)'}`);
    lines.push('');
  }
  const outMd = path.join(__dirname, 'REPEATABILITY.md');
  fs.writeFileSync(outMd, lines.join('\n'));
  fs.writeFileSync(path.join(__dirname, 'repeatability_data.json'),
    JSON.stringify(data, null, 2));
  log(`Report: ${outMd}`);
}

(async () => {
  const args = process.argv.slice(2);
  const rIdx = args.indexOf('--runs');
  const nRuns = rIdx >= 0 ? Math.max(1, Number(args[rIdx + 1])) : 3;
  const sIdx = args.indexOf('--sites');
  const keys = sIdx >= 0 ? args[sIdx + 1].split(',') : Object.keys(SITES);

  const data = {};
  for (const key of keys) {
    const url = SITES[key];
    if (!url) { log(`unknown site key ${key}`); continue; }
    const outDir = path.join(__dirname, 'repeatability_runs', `${key}_${ts()}`);
    fs.mkdirSync(outDir, { recursive: true });
    const runs = [];
    for (let i = 0; i < nRuns; i++) {
      // sequential by design: vision service ports (5000-5004) are shared
      runs.push(await oneRun(key, url, outDir, i));
      log(`${key} run ${i + 1}: done -> ${runs[i].run_id || runs[i].error}`);
    }
    data[key] = runs;
    // incremental save so partial studies still produce data
    fs.writeFileSync(path.join(__dirname, 'repeatability_data.json'), JSON.stringify(data, null, 2));
  }
  writeReport(data);
})().catch((e) => { console.error('[repeat] FATAL:', e.message); process.exit(1); });
