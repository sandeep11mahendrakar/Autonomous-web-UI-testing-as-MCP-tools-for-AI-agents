'use strict';
/* tier3_w3.cjs — W3 site executor (D6 pair #23 github_trending, #28 archive_org).
 * Usage: node tier3_w3.cjs <siteKey> <url>
 * Holds testing/.campaign.lock for the WHOLE site cycle, releases at end:
 *   runBoth (trimmed env) -> strict findRunDir -> s1->s2->s4->ft->s6
 *   -> folder_purity MUST be PURE -> extract_run summary saved.
 * On any failure: logs RESUME point and exits non-zero (site marked for retry,
 * never attributed loosely). Modeled on tier3_w1.cjs; adds stale-lock PID
 * liveness check via campaign_lock.js. */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { findRunDir } = require('./run_attribution');
const { lockIsFreeOrStale } = require('./campaign_lock');

const ROOT = path.join(__dirname, '..');
const [, , key, url] = process.argv;
if (!key || !url) { console.error('usage: node tier3_w3.cjs <key> <url>'); process.exit(1); }

const TRIMMED_ENV = {
  MAX_STEPS: '25', MAX_STATES: '20',
  EXPLORE_MAX_STEPS: '25', EXPLORE_MAX_STATES: '20',
  ARCH_A_TIMEOUT_MS: '1500000', // D8(b)/D7: mega-DOM budget approved
};
const LOCK = path.join(__dirname, '.campaign.lock');

function log(m) {
  const line = `[tier3w3 ${new Date().toISOString()}] ${m}`;
  console.log(line);
  fs.appendFileSync(path.join(__dirname, 'tier3_w3.log'), line + '\n');
}

if (!lockIsFreeOrStale(LOCK, log)) { log(`aborting ${key}`); process.exit(2); }
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

  // 2) STRICT attribution — never newest-dir fallback
  runId = findRunDir({ url, sinceMs: startedAt });
  if (!runId) { log(`GUARD-FAIL ${key}: no run dir created this attempt matches manifest url=${url}`); process.exit(3); }
  log(`attributed ${key} -> ${runId}`);

  // 3) fusion chain
  // NOTE: execute_fusion_tests.js exits NONZERO when fusion_tests.json is
  // absent (legitimate case: S4 accepted 0 candidates on thin catalogs).
  // Treat that specific outcome as SOFT-FAIL: skip FT, continue s6+purity+
  // extract so the run still lands honestly in the ledger.
  let ftSoftFail = false;
  for (const [label, script] of [
    ['s1', 'fusion/s1_build_catalog.js'], ['s2', 'fusion/s2_gap_report.js'],
    ['s4', 'fusion/s4_fusion_synthesis.js'], ['ft', 'fusion/execute_fusion_tests.js'],
    ['s6', 'fusion/s6_dashboard.js'],
  ]) {
    log(`START ${label} ${key} (${runId})`);
    try {
      execSync(`node ${script} ${runId}`, {
        cwd: ROOT, encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'inherit'],
      });
      log(`DONE ${label} ${key}`);
    } catch (e) {
      const out = String(e.stdout || '');
      if (label === 'ft' && /No fusion_tests\.json/.test(out)) {
        log(`SOFT-FAIL ft ${key}: no fusion_tests.json (S4 accepted 0) - continuing honestly`);
        ftSoftFail = true;
        continue;
      }
      log(`FAIL ${label} ${key}: ${String(e.message).slice(0, 200)} - aborting site cycle`);
      process.exit(5);
    }
  }

  // 4) folder_purity MUST be PURE
  const purity = JSON.parse(execSync(`node testing/folder_purity.js ${runId}`, {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  }));
  log(`purity ${runId}: pure=${purity.pure} checks=${(purity.checks || []).filter(c => c.ok).length}/${(purity.checks || []).length}`);
  if (!purity.pure) { log(`CONTAMINATION ${key} (${runId}) - NOT patching reports`); process.exit(4); }

  // 5) numbers snapshot (report patching uses ONLY these outputs)
  const ex = execSync(`node testing/extract_run.js ${runId}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(__dirname, `extract_${runId}.json`), ex);
  log(`SUCCESS ${key} (${runId}) - extract saved, ready for report patch`);
} finally {
  try { fs.unlinkSync(LOCK); } catch (_) {}
  log(`lock released after ${key} (runId=${runId || 'none'})`);
}
