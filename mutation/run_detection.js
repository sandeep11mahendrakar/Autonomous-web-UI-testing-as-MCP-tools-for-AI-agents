'use strict';

/**
 * run_detection.js — mutation-testing orchestrator.
 *
 * For each seeded bug variant (plus the clean baseline):
 *   1. serve the fixture app locally
 *   2. run the full unified pipeline (`node runBoth.js http://127.0.0.1:<port>/`)
 *   3. run the fusion chain (S1 -> S2 -> S4 -> FT execution)
 *   4. score bug detection per channel (arch_b, fused)
 *   5. write mutation/results/<variant>/score.json + a campaign summary MD
 *
 * Usage:
 *   node mutation/run_detection.js [--variants id1,id2|all] [--skip-baseline]
 *
 * Detection semantics are HONEST:
 *   DETECTED     a relevant executed step failed on live verification
 *   NOT_DETECTED relevant surface exercised, everything passed
 *   NOT_COVERED  the buggy surface was never exercised ("cannot conclude")
 *   NO_REPORT    the channel produced no parseable report this run
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const ROOT = path.join(__dirname, '..');
const RESULTS_DIR = path.join(__dirname, 'results');
const { BUGS } = require('./fixtures');
const { createFixtureServer } = require('./server');
const { analyzeVariant } = require('./analyze');

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function log(msg) {
  console.log(`[mutation] ${msg}`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

/** Spawn a command, stream output to a log file + console. Resolve on exit. */
function run(cmd, args, cwd, logFile, timeoutMs = 30 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    const stream = fs.createWriteStream(logFile, { flags: 'a' });
    stream.write(`\n===== ${cmd} ${args.join(' ')} @ ${new Date().toISOString()} =====\n`);
    const child = spawn(cmd, args, { cwd, shell: process.platform === 'win32' });
    const timer = setTimeout(() => {
      try { if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']); else child.kill(); } catch (_) {}
      stream.end();
      reject(new Error(`timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', (d) => { stream.write(d); });
    child.stderr.on('data', (d) => { stream.write(d); });
    child.on('close', (code) => {
      clearTimeout(timer);
      stream.end(`\n===== exited code=${code} =====\n`);
      resolve(code);
    });
    child.on('error', (e) => { clearTimeout(timer); stream.end(); reject(e); });
  });
}

function findFirst(dir, prefix) {
  if (!fs.existsSync(dir)) return null;
  const hit = fs.readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
    .sort()
    .pop();
  return hit ? path.join(dir, hit) : null;
}

async function runVariant(id, bugs, startedAt) {
  log(`=== variant "${id}" (${bugs.length} bug(s)) ===`);
  const variantDir = path.join(RESULTS_DIR, id);
  fs.mkdirSync(variantDir, { recursive: true });

  const port = await freePort();
  const url = `http://127.0.0.1:${port}/index.html`;
  const srv = await createFixtureServer(bugs, port);

  // 1+2. unified pipeline against the local fixture
  let runId = null;
  try {
    const code = await run('node', ['runBoth.js', url], ROOT,
      path.join(variantDir, 'pipeline.log'), 40 * 60 * 1000);
    if (code !== 0) log(`runBoth exited ${code} (may still have artifacts)`);
    const runs = fs.readdirSync(path.join(ROOT, 'runs'))
      .filter((d) => d.startsWith('run_') && fs.statSync(path.join(ROOT, 'runs', d)).mtimeMs >= startedAt)
      .sort();
    runId = runs[runs.length - 1] || null;
  } finally {
    await new Promise((r) => srv.close(r));
  }

  if (!runId) {
    const score = { variant: id, run_id: null, error: 'no run dir produced', ...{ arch_b: 'NO_REPORT', fused: 'NO_REPORT', arch_a: 'NOT_APPLICABLE_V1' } };
    fs.writeFileSync(path.join(variantDir, 'score.json'), JSON.stringify(score, null, 2));
    return score;
  }
  log(`unified run: ${runId}`);
  const runDir = path.join(ROOT, 'runs', runId);

  // 3. fusion chain
  await run('node', ['fusion/s1_build_catalog.js', runId], ROOT, path.join(variantDir, 'fusion.log'));
  await run('node', ['fusion/s2_gap_report.js', runId], ROOT, path.join(variantDir, 'fusion.log'));
  await run('node', ['fusion/s4_fusion_synthesis.js', runId], ROOT, path.join(variantDir, 'fusion.log'));
  await run('node', ['fusion/execute_fusion_tests.js', runId], ROOT, path.join(variantDir, 'fusion.log'));

  // 4. score. B's executor writes vision/storage/outputs/ during the run and
  // runBoth copies it into the unified tree; prefer the unified copy.
  const bReport = findFirst(path.join(runDir, 'vision', 'outputs'), 'execution_results')
    || findFirst(path.join(ROOT, 'vision', 'storage', 'outputs'), 'execution_results');
  const score = {
    variant: id,
    bug_name: bugs.length === 1 ? BUGS[bugs[0]].name : '(baseline)',
    run_id: runId,
    url,
    analyzed_at: new Date().toISOString(),
    ...analyzeVariant(
      bugs.length === 1 ? BUGS[bugs[0]] : { targets: [], detect_urls: [] },
      {
        bExecutionReport: bReport,
        ftExecutionReport: findFirst(path.join(runDir, 'fusion'), 'ft_execution_results'),
      },
    ),
  };
  fs.writeFileSync(path.join(variantDir, 'score.json'), JSON.stringify(score, null, 2));
  log(`${id}: arch_b=${score.arch_b} fused=${score.fused}`);
  return score;
}

function writeSummary(scores, startedAtIso) {
  const lines = [
    '# Mutation Detection Scorecard',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Harness started: ${startedAtIso}`,
    '- Channels: `arch_b` = Architecture B replay execution · `fused` = Fusion FT live execution.',
    '  Architecture A has NO standalone runtime channel in V1 (it generates tests;',
    '  its runtime signal arrives through Fusion).',
    '',
    '| Variant | Bug | Run ID | arch_b | fused |',
    '|---|---|---|---|---|',
  ];
  for (const s of scores) {
    lines.push(`| ${s.variant} | ${s.bug_name || '(baseline)'} | ${s.run_id || '—'} | ${s.arch_b} | ${s.fused} |`);
  }
  lines.push('', 'Legend: DETECTED / NOT_DETECTED / NOT_COVERED (cannot conclude) / NO_REPORT.', '');
  fs.writeFileSync(path.join(RESULTS_DIR, 'SCORECARD.md'), lines.join('\n'));
}

(async () => {
  const args = process.argv.slice(2);
  const vIdx = args.indexOf('--variants');
  const skipBaseline = args.includes('--skip-baseline');
  const ids = vIdx >= 0 && args[vIdx + 1] !== 'all'
    ? args[vIdx + 1].split(',')
    : Object.keys(BUGS);
  const variants = skipBaseline ? ids : ['baseline', ...ids];

  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();
  const scores = [];
  for (const v of variants) {
    const bugs = v === 'baseline' ? [] : [v];
    scores.push(await runVariant(v, bugs, startedAt - 5000));
  }
  writeSummary(scores, startedAtIso);
  log(`Done. Scorecard: ${path.join(RESULTS_DIR, 'SCORECARD.md')}`);
})().catch((e) => {
  console.error('[mutation] FATAL:', e.message);
  process.exit(1);
});
