'use strict';
/** rerun_starved.js — P1a: re-run the 4 A-starved Tier-2 sites on a healthy
 * ox-alpha budget, sequentially, then regenerate fusion chains + dashboards. */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITES = [
  ['books_toscrape', 'https://books.toscrape.com'],
  ['quotes_toscrape', 'https://quotes.toscrape.com'],
  ['lambdatest_playground', 'https://www.lambdatest.com/selenium-playground/'],
  ['docs_python', 'https://docs.python.org/3/'],
];

function log(m) {
  const line = `[rerun ${new Date().toISOString()}] ${m}`;
  console.log(line);
  fs.appendFileSync(path.join(__dirname, 'rerun_starved.log'), line + '\n');
}

function run(label, script, args, timeoutMs) {
  log(`START ${label}`);
  try {
    const out = execSync(`node ${script} ${args}`, {
      cwd: ROOT, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024,
    });
    log(`DONE ${label}`);
    return out;
  } catch (e) {
    log(`FAIL ${label}: ${String(e.message).slice(0, 200)}`);
    return null;
  }
}

function latestRun() {
  const dirs = fs.readdirSync(path.join(ROOT, 'runs')).filter((d) => d.startsWith('run_')).sort();
  return dirs[dirs.length - 1];
}

(async () => {
  // lockfile so nothing else starts a campaign concurrently
  const lock = path.join(__dirname, '.campaign.lock');
  if (fs.existsSync(lock)) { log('lock exists — aborting'); process.exit(2); }
  fs.writeFileSync(lock, String(process.pid));

  try {
    for (const [key, url] of SITES) {
      const startedAt = Date.now();
      run(`${key} pipeline`, 'runBoth.js', url, 40 * 60 * 1000);
      const latest = latestRun();
      const status = (() => {
        try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'runs', latest, 'run_manifest.json'), 'utf8')).overall_status; } catch (_) { return '?'; }
      })();
      run(`s1 ${key}`, 'fusion/s1_build_catalog.js', latest, 10 * 60 * 1000);
      run(`s2 ${key}`, 'fusion/s2_gap_report.js', latest, 10 * 60 * 1000);
      run(`s4 ${key}`, 'fusion/s4_fusion_synthesis.js', latest, 15 * 60 * 1000);
      run(`ft ${key}`, 'fusion/execute_fusion_tests.js', latest, 20 * 60 * 1000);
      run(`s6 ${key}`, 'fusion/s6_dashboard.js', latest, 10 * 60 * 1000);
      log(`${key} COMPLETE: ${latest} status=${status} took=${Math.round((Date.now() - startedAt) / 60000)}min`);
    }
    log('all re-runs finished');
  } finally {
    fs.unlinkSync(lock);
  }
})();
