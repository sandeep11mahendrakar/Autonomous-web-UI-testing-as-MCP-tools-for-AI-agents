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
      // VERIFIED attribution (P1b guard): manifest URL must match launched URL.
      const { findRunDir } = require('./run_attribution');
      const latest = findRunDir({ url, sinceMs: startedAt }) || latestRun();
      if (!findRunDir({ url, sinceMs: startedAt })) {
        log(`CONTAMINATION GUARD: no run dir with manifest url=${url} created this attempt; falling back to newest dir (${latest})`);
      }
      const status = (() => {
        try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'runs', latest, 'run_manifest.json'), 'utf8')).overall_status; } catch (_) { return '?'; }
      })();
      run(`s1 ${key}`, 'fusion/s1_build_catalog.js', latest, 10 * 60 * 1000);
      run(`s2 ${key}`, 'fusion/s2_gap_report.js', latest, 10 * 60 * 1000);
      run(`s4 ${key}`, 'fusion/s4_fusion_synthesis.js', latest, 15 * 60 * 1000);
      run(`ft ${key}`, 'fusion/execute_fusion_tests.js', latest, 20 * 60 * 1000);
      run(`s6 ${key}`, 'fusion/s6_dashboard.js', latest, 10 * 60 * 1000);
      // Post-run contamination guard (same policy as night_chain.js)
      const { assertCatalogDomains } = require('./run_attribution');
      const guard = assertCatalogDomains(latest, url);
      if (!guard.ok) {
        log(`CONTAMINATION: ${key} (${latest}) catalog foreign hosts [${guard.foreignHosts.join(', ')}] — investigate before trusting fusion %`);
      }
      log(`${key} COMPLETE: ${latest} status=${status} took=${Math.round((Date.now() - startedAt) / 60000)}min`);
    }
    log('all re-runs finished');
  } finally {
    fs.unlinkSync(lock);
  }
})();
