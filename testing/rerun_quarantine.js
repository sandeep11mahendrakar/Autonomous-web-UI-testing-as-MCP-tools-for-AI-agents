'use strict';
/** rerun_quarantine.js — T201: re-run the 8 quarantined Tier-2 sites (13-20)
 * behind FULL attribution guards, then patch reports/index on success.
 *
 * Usage:
 *   node testing/rerun_quarantine.js pipeline <siteKey> [siteKey...]  # runBoth only
 *   node testing/rerun_quarantine.js post <siteKey>                   # fusion+guards+reports
 *
 * Site keys match TIER2_SITES.md / QUARANTINE_TIER2.md rows 13-20.
 * books_toscrape + quotes_toscrape are CLEAN and deliberately NOT here.
 *
 * Guards per site (all must pass before any report is patched):
 *   1. findRunDir strict — run dir created this attempt AND manifest url matches
 *   2. assertCatalogDomains — catalog page_key hosts ⊆ {target ∪ visited}
 *   3. assertVisionStartUrls — every B exploration start_url host == manifest host
 *      (AUDIT ADDENDUM guard, added 2026-08-25)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { findRunDir, assertCatalogDomains, assertVisionStartUrls } = require('./run_attribution');

const ROOT = path.join(__dirname, '..');
const REPORTS = path.join(ROOT, 'testing', 'site_reports');

// [key, url, indexRowNumber, reportFile]
const SITES = [
  ['lambdatest_playground', 'https://www.lambdatest.com/selenium-playground/', 13, 'lambdatest_playground_2026-08-25.md'],
  ['docs_python', 'https://docs.python.org/3/', 14, 'docs_python_2026-08-25.md'],
  ['gutenberg', 'https://www.gutenberg.org', 15, 'gutenberg_2026-08-25.md'],
  ['weathersparks', 'https://weatherspark.com', 16, 'weathersparks_2026-08-25.md'],
  ['sahitest', 'http://www.sahitest.com/demo/', 17, 'sahitest_2026-08-25.md'],
  ['theinternet_spare_pages', 'https://the-internet.herokuapp.com/status_codes', 18, 'theinternet_spare_pages_2026-08-25.md'],
  ['phptravels', 'https://phptravels.com/demo/', 19, 'phptravels_2026-08-25.md'],
  ['openlibrary', 'https://openlibrary.org', 20, 'openlibrary_2026-08-25.md'],
];

// Trimmed budget per MASTER_PLAN §0.2/T201 (quota discipline)
const TRIMMED_ENV = {
  MAX_STEPS: '25',
  MAX_STATES: '20',
  EXPLORE_MAX_STEPS: '25',
  EXPLORE_MAX_STATES: '20',
};

function log(m) {
  const line = `[rerun_q ${new Date().toISOString()}] ${m}`;
  console.log(line);
  fs.appendFileSync(path.join(__dirname, 'rerun_quarantine.log'), line + '\n');
}

function siteByKey(key) {
  const s = SITES.find(([k]) => k === key);
  if (!s) throw new Error(`unknown site key "${key}" (not a quarantined site?)`);
  return s;
}

function holdLock(fn) {
  const lock = path.join(__dirname, '.campaign.lock');
  if (fs.existsSync(lock)) { log('lock held by someone else — aborting'); process.exit(2); }
  fs.writeFileSync(lock, String(process.pid));
  const done = (code) => { try { fs.unlinkSync(lock); } catch (_) {} process.exit(code); };
  try { fn(); } catch (e) { log(`FATAL: ${String(e.message).slice(0, 300)}`); done(1); }
}

function runBoth(key, url) {
  const startedAt = Date.now();
  log(`START pipeline ${key} (${url}) env=${JSON.stringify(TRIMMED_ENV)}`);
  try {
    execSync('node runBoth.js ' + url, {
      cwd: ROOT, encoding: 'utf8', timeout: 40 * 60 * 1000,
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, ...TRIMMED_ENV },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    log(`DONE pipeline ${key} took=${Math.round((Date.now() - startedAt) / 60000)}min`);
  } catch (e) {
    log(`FAIL pipeline ${key}: ${String(e.message).slice(0, 200)}`);
  }
  // STRICT attribution: no newest-dir fallback ever.
  const runDir = findRunDir({ url, sinceMs: startedAt });
  if (!runDir) {
    log(`GUARD-FAIL ${key}: no run dir created this attempt with manifest url=${url}`);
    return null;
  }
  log(`attributed ${key} -> ${runDir}`);
  return runDir;
}

function fusionChain(runId, key) {
  for (const [label, script, mins] of [
    ['s1', 'fusion/s1_build_catalog.js', 10],
    ['s2', 'fusion/s2_gap_report.js', 10],
    ['s4', 'fusion/s4_fusion_synthesis.js', 15],
    ['ft', 'fusion/execute_fusion_tests.js', 20],
    ['s6', 'fusion/s6_dashboard.js', 10],
  ]) {
    log(`START ${label} ${key} (${runId})`);
    try {
      execSync(`node ${script} ${runId}`, {
        cwd: ROOT, encoding: 'utf8', timeout: mins * 60 * 1000,
        maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'],
      });
      log(`DONE ${label} ${key}`);
    } catch (e) {
      log(`FAIL ${label} ${key}: ${String(e.message).slice(0, 200)}`);
      return false;
    }
  }
  return true;
}

function guards(runId, url) {
  const cat = assertCatalogDomains(runId, url);
  const vis = assertVisionStartUrls(runId, url);
  log(`guards ${runId}: catalog ok=${cat.ok}${cat.foreignHosts.length ? ` foreign=[${cat.foreignHosts.join(', ')}]` : ''}; visionStartUrls checked=${vis.checked} ok=${vis.ok}${vis.violations.length ? ` violations=${JSON.stringify(vis.violations).slice(0, 300)}` : ''}`);
  return cat.ok && vis.ok;
}

function manifestStatus(runId) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'runs', runId, 'run_manifest.json'), 'utf8')).overall_status || '?';
  } catch (_) { return '?'; }
}

function ftSummary(runId) {
  // Best-effort FT pass summary from dashboard data (zero LLM).
  try {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'runs', runId, 'fusion', 'dashboard_data.json'), 'utf8'));
    const ft = d.ft_summary || d.fusion_tests || {};
    return JSON.stringify(ft).slice(0, 400);
  } catch (_) { return 'n/a'; }
}

function patchReport(key, num, reportFile, oldRunId, runId) {
  const p = path.join(REPORTS, reportFile);
  let md = fs.readFileSync(p, 'utf8');
  const section = [
    '',
    '## Re-run (post-quarantine)',
    '',
    `- **New run:** \`${runId}\` (replaces quarantined \`${oldRunId}\`; old run kept on disk as evidence of the failure mode — see testing/QUARANTINE_TIER2.md)`,
    `- **Manifest status:** ${manifestStatus(runId)}`,
    `- **Guards passed:** findRunDir(manifest-url match) + assertCatalogDomains + assertVisionStartUrls (audit addendum)`,
    `- **FT summary:** \`${ftSummary(runId)}\``,
    `- **Narrative policy:** figures above come ONLY from the new run's artifacts.`,
    '',
  ].join('\n');
  fs.writeFileSync(p, md.replace(/\s*$/, '\n') + section, 'utf8');
  log(`patched report ${reportFile}`);

  // Clear INDEX QUARANTINED marker + swap run id (node fs utf8 only).
  const ip = path.join(REPORTS, 'INDEX.md');
  let idx = fs.readFileSync(ip, 'utf8');
  const lines = idx.split(/\r?\n/);
  let patched = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`| ${num} |`) && lines[i].includes('QUARANTINED')) {
      lines[i] = lines[i].replace('🚫 QUARANTINED-WRONG-SITE · ', '').replace(oldRunId, runId);
      patched = true;
      break;
    }
  }
  if (!patched) { log(`WARN: no QUARANTINED INDEX row found for #${num}`); return; }
  fs.writeFileSync(ip, lines.join('\n'), 'utf8');
  log(`cleared INDEX QUARANTINED marker for #${num}`);
}

function main() {
  const [, , mode, ...keys] = process.argv;
  if (!mode || !['pipeline', 'post'].includes(mode)) {
    console.error('usage: node testing/rerun_quarantine.js <pipeline|post> <siteKey> [...]');
    process.exit(1);
  }
  const targets = keys.length ? keys.map(siteByKey) : SITES;

  holdLock(() => {
    for (const [key, url, num, reportFile] of targets) {
      const oldRunId = ({ 13: 'run_20260825_053921', 14: 'run_20260825_055129', 15: 'run_20260825_060707', 16: 'run_20260825_062152', 17: 'run_20260825_063248', 18: 'run_20260825_064713', 19: 'run_20260825_065652', 20: 'run_20260825_070918' })[num];
      if (mode === 'pipeline') {
        const runId = runBoth(key, url);
        if (!runId) continue; // quota death or guard failure — next window resumes from here
        log(`${key} PIPELINE OK -> ${runId}. Run "post ${key}" after fusion chain or include in next batch.`);
      } else {
        // post mode: attribute the most recent qualifying run, then chain+guard+patch
        const sinceMs = Date.now() - 3 * 60 * 60 * 1000; // within last 3h
        const runId = findRunDir({ url, sinceMs });
        if (!runId) { log(`post ${key}: no qualifying run dir in window — skipping`); continue; }
        log(`post ${key}: using ${runId}`);
        if (!fusionChain(runId, key)) continue;
        if (!guards(runId, url)) { log(`CONTAMINATION: ${key} (${runId}) failed guards — NOT patching reports`); continue; }
        patchReport(key, num, reportFile, oldRunId, runId);
        log(`${key} POST OK (${manifestStatus(runId)})`);
      }
    }
    log('batch finished');
  });
}

main();
