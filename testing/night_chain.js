'use strict';

/**
 * night_chain.js — waits for the repeatability study to finish, then runs
 * the Tier-2 campaign sites sequentially (pipeline + fusion chain), stopping
 * on the first FAILED manifest per campaign rules. Reports are written by
 * the morning session after artifact review.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPEAT_LOG = process.env.TEMP + '\\opencode\\repeat.log';

function log(m) {
  const line = `[night-chain ${new Date().toISOString()}] ${m}`;
  console.log(line);
  fs.appendFileSync(path.join(__dirname, 'night_chain.log'), line + '\n');
}

function repeatabilityDone() {
  try {
    const txt = fs.readFileSync(REPEAT_LOG, 'utf8');
    return txt.includes('[repeat] Report:');
  } catch (_) {
    return false;
  }
}

function runStep(label, script, args, timeoutMs = 60 * 60 * 1000) {
  log(`START ${label}`);
  try {
    const out = execSync(`node ${script} ${args}`, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
    });
    log(`DONE ${label}: ${out.split('\n').slice(-3).join(' | ').slice(0, 250)}`);
    return out;
  } catch (e) {
    log(`FAIL ${label}: ${String(e.message).slice(0, 250)}`);
    return null;
  }
}

(async () => {
  log('night chain started — waiting for repeatability study');
  while (!repeatabilityDone()) {
    await new Promise((r) => setTimeout(r, 120000)); // poll every 2 min
  }
  log('repeatability finished — starting Tier-2 campaign');

  const sitesFile = path.join(__dirname, 'TIER2_SITES.md');
  const fromIdx = process.argv.indexOf('--from');
  const fromKey = fromIdx >= 0 ? process.argv[fromIdx + 1] : null;
  const allRows = fs.readFileSync(sitesFile, 'utf8').split(/\r?\n/)
    .filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((l) => ({ key: l.split('|')[2]?.trim(), url: l.split('|')[3]?.trim() }))
    .filter((r) => r.key && r.url);
  const rows = fromKey ? allRows.slice(allRows.findIndex((r) => r.key === fromKey)) : allRows;

  log(`${rows.length} tier-2 sites queued`);

  for (const site of rows) {
    log(`=== TIER-2 ${site.key} (${site.url}) ===`);
    let done = false;
    for (let attempt = 1; attempt <= 4 && !done; attempt++) {
      const startedAt = Date.now();
      const out = runStep(`tier2 ${site.key} pipeline (attempt ${attempt})`, 'runBoth.js', site.url, 50 * 60 * 1000);

      const runsRoot = path.join(ROOT, 'runs');
      const dirs = fs.readdirSync(runsRoot).filter((d) => d.startsWith('run_')).sort();
      const latest = dirs[dirs.length - 1];
      let status = null;
      try {
        status = JSON.parse(fs.readFileSync(path.join(runsRoot, latest, 'run_manifest.json'), 'utf8')).overall_status;
      } catch (_) {}

      // Quota exhaustion is ENVIRONMENTAL, not a pipeline defect: wait for
      // the rolling TPD window and retry the SAME site.
      let quotaBlocked = false;
      try {
        const alog = fs.readFileSync(path.join(runsRoot, latest, 'dom', 'run_explore.log'), 'utf8');
        quotaBlocked = /tokens per day \(TPD\)/.test(alog.slice(-4000));
      } catch (_) {}

      if (!out || status === 'FAILED') {
        if (quotaBlocked && attempt < 4) {
          log(`${site.key}: quota-blocked — waiting 22 min for rolling TPD refill (attempt ${attempt}/4)`);
          await new Promise((r) => setTimeout(r, 22 * 60 * 1000));
          continue;
        }
        if (!quotaBlocked) {
          log(`STOPPING tier-2: ${site.key} genuine pipeline failure (${latest}) — fix required`);
          process.exit(1);
        }
        continue;
      }

      // fusion chain
      runStep(`s1 ${site.key}`, 'fusion/s1_build_catalog.js', latest, 10 * 60 * 1000);
      runStep(`s2 ${site.key}`, 'fusion/s2_gap_report.js', latest, 10 * 60 * 1000);
      runStep(`s4 ${site.key}`, 'fusion/s4_fusion_synthesis.js', latest, 15 * 60 * 1000);
      runStep(`ft ${site.key}`, 'fusion/execute_fusion_tests.js', latest, 20 * 60 * 1000);
      runStep(`s6 ${site.key}`, 'fusion/s6_dashboard.js', latest, 10 * 60 * 1000);

      log(`tier2 ${site.key} COMPLETE: ${latest} status=${status} took=${Math.round((Date.now() - startedAt) / 60000)}min`);
      done = true;
    }
    if (!done) log(`tier2 ${site.key}: SKIPPED after retries (quota) — recorded honestly, continue next site`);
  }

  // final aggregate refresh
  runStep('s8 campaign evaluation', 'fusion/s8_campaign_eval.js', '');
  log('night chain finished');
})().catch((e) => log('FATAL ' + e.message));
