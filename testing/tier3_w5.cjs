'use strict';
/* tier3_w5.cjs — W5 site executor (D6 pair #25 goodreads_list, #30 reddit_public).
 * Usage: node tier3_w5.cjs <siteKey> <url>
 * Holds testing/.campaign.lock for the WHOLE site cycle, releases at end:
 *   runBoth (trimmed env) -> strict findRunDir -> s1->s2->s4->ft->s6
 *   -> folder_purity MUST be PURE -> extract_run summary saved.
 * On any failure: logs RESUME point and exits non-zero (site marked for retry,
 * never attributed loosely). Pattern cloned from tier3_w1.cjs (lane-isolated). */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { findRunDir } = require('./run_attribution');

const ROOT = path.join(__dirname, '..');
const [, , key, url] = process.argv;
if (!key || !url) { console.error('usage: node tier3_w5.cjs <key> <url>'); process.exit(1); }

const TRIMMED_ENV = {
  MAX_STEPS: '25', MAX_STATES: '20',
  EXPLORE_MAX_STEPS: '25', EXPLORE_MAX_STATES: '20',
};
const LOCK = path.join(__dirname, '.campaign.lock');

function log(m) {
  const line = `[tier3w5 ${new Date().toISOString()}] ${m}`;
  console.log(line);
  fs.appendFileSync(path.join(__dirname, 'tier3_w5.log'), line + '\n');
}

if (fs.existsSync(LOCK)) { log(`lock held by someone else - aborting ${key}`); process.exit(2); }
fs.writeFileSync(LOCK, String(process.pid));
log(`=== START ${key} (${url}) ===`);

let runId = null;
try {
  // 1) pipeline
  const startedAt = Date.now();
  try {
    execSync('node runBoth.js ' + url, {
      cwd: ROOT, encoding: 'utf8', timeout: 45 * 60 * 1000, maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, ...TRIMMED_ENV }, stdio: ['ignore', 'pipe', 'inherit'],
    });
    log(`DONE pipeline ${key} took=${Math.round((Date.now() - startedAt) / 60000)}min`);
  } catch (e) {
    log(`WARN pipeline ${key} nonzero/timeout: ${String(e.message).slice(0, 200)} - continuing to attribution`);
  }

  // 2) STRICT attribution
  runId = findRunDir({ url, sinceMs: startedAt });
  if (!runId) { log(`GUARD-FAIL ${key}: no run dir created this attempt matches manifest url=${url}`); process.exit(3); }
  log(`attributed ${key} -> ${runId}`);

  // 3) fusion chain
  for (const [label, script] of [
    ['s1', 'fusion/s1_build_catalog.js'], ['s2', 'fusion/s2_gap_report.js'],
    ['s4', 'fusion/s4_fusion_synthesis.js'], ['ft', 'fusion/execute_fusion_tests.js'],
    ['s6', 'fusion/s6_dashboard.js'],
  ]) {
    log(`START ${label} ${key} (${runId})`);
    execSync(`node ${script} ${runId}`, {
      cwd: ROOT, encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    log(`DONE ${label} ${key}`);
  }

  // 4) folder_purity MUST be PURE
  const purity = JSON.parse(execSync(`node testing/folder_purity.js ${runId}`, {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  }));
  log(`purity ${runId}: pure=${purity.pure} checks=${(purity.checks || []).filter(c => c.ok).length}/${(purity.checks || []).length}`);
  if (!purity.pure) { log(`CONTAMINATION ${key} (${runId}) - NOT patching reports`); process.exit(4); }

  // 5) numbers snapshot (report patching done separately from these outputs ONLY)
  const ex = execSync(`node testing/extract_run.js ${runId}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(__dirname, `extract_${runId}.json`), ex);
  log(`SUCCESS ${key} (${runId}) - extract saved, ready for report patch`);
} finally {
  try { fs.unlinkSync(LOCK); } catch (_) {}
  log(`lock released after ${key} (runId=${runId || 'none'})`);
}
