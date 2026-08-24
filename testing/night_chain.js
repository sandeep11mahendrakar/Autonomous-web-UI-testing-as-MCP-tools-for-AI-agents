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
  const rows = fs.readFileSync(sitesFile, 'utf8').split(/\r?\n/)
    .filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((l) => ({ key: l.split('|')[2]?.trim(), url: l.split('|')[3]?.trim() }))
    .filter((r) => r.key && r.url);

  log(`${rows.length} tier-2 sites queued`);

  for (const site of rows) {
    log(`=== TIER-2 ${site.key} (${site.url}) ===`);
    const startedAt = Date.now();
    const out = runStep(`tier2 ${site.key} pipeline`, 'runBoth.js', site.url, 50 * 60 * 1000);

    const runsRoot = path.join(ROOT, 'runs');
    const dirs = fs.readdirSync(runsRoot).filter((d) => d.startsWith('run_')).sort();
    const latest = dirs[dirs.length - 1];
    let status = null;
    try {
      status = JSON.parse(fs.readFileSync(path.join(runsRoot, latest, 'run_manifest.json'), 'utf8')).overall_status;
    } catch (_) {}

    if (!out || status === 'FAILED') {
      log(`STOPPING tier-2: ${site.key} produced FAILED/crashed pipeline (${latest}) — fix required before next site`);
      break;
    }

    // fusion chain
    runStep(`s1 ${site.key}`, 'fusion/s1_build_catalog.js', latest, 10 * 60 * 1000);
    runStep(`s2 ${site.key}`, 'fusion/s2_gap_report.js', latest, 10 * 60 * 1000);
    runStep(`s4 ${site.key}`, 'fusion/s4_fusion_synthesis.js', latest, 15 * 60 * 1000);
    runStep(`ft ${site.key}`, 'fusion/execute_fusion_tests.js', latest, 20 * 60 * 1000);
    // dashboard for completeness
    runStep(`s6 ${site.key}`, 'fusion/s6_dashboard.js', latest, 10 * 60 * 1000);

    log(`tier2 ${site.key} COMPLETE: ${latest} status=${status} took=${Math.round((Date.now() - startedAt) / 60000)}min`);
  }

  // final aggregate refresh
  runStep('s8 campaign evaluation', 'fusion/s8_campaign_eval.js', '');
  log('night chain finished');
})().catch((e) => log('FATAL ' + e.message));
