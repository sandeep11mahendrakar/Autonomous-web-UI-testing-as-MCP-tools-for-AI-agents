'use strict';

/**
 * overnight_scheduler.js — wait for LLM quota reset, then finish the
 * mutation campaign (3 remaining variants) and run the repeatability study.
 *
 * Launched detached; polls the OpenRouter key endpoint instead of trusting
 * wall-clock alone, so an early reset starts work early.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');

function log(m) {
  const line = `[scheduler ${new Date().toISOString()}] ${m}`;
  console.log(line);
  fs.appendFileSync(path.join(__dirname, 'scheduler.log'), line + '\n');
}

/** Read RESET time + remaining from OpenRouter key endpoint. Never prints keys. */
function quotaCheck() {
  return new Promise((resolve) => {
    let key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      for (const f of ['web/.env', 'vision/.env', '.env']) {
        try {
          const txt = fs.readFileSync(path.join(ROOT, f), 'utf8');
          const m = txt.match(/^OPENROUTER_API_KEY=(.+)$/m) || txt.match(/^ARCH_A_LLM_API_KEY=(.+)$/m);
          if (m) { key = m[1].trim(); break; }
        } catch (_) {}
      }
    }
    if (!key) { resolve({ known: false }); return; }
    const req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/key',
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
      timeout: 15000,
    }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        try {
          const d = JSON.parse(body).data || {};
          resolve({
            known: true,
            remaining: d.rate_limit?.requests ?? null,
            reset: d.rate_limit?.reset ?? null,
          });
        } catch (_) { resolve({ known: false }); }
      });
    });
    req.on('error', () => resolve({ known: false }));
    req.on('timeout', () => { req.destroy(); resolve({ known: false }); });
    req.end();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitForQuota() {
  // Hard fallback: 05:30 IST = 00:00 UTC daily reset
  const now = new Date();
  const hardReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (now.getUTCHours() >= 0 ? 1 : 0), 0, 5, 0);
  let waited = false;
  for (;;) {
    const q = await quotaCheck();
    if (q.known && q.reset) {
      const ms = new Date(q.reset).getTime() - Date.now();
      if (ms <= 0) { log('quota window reset (per key endpoint)'); return; }
      log(`waiting ${(ms / 60000).toFixed(0)} min for quota reset (endpoint)`);
      awaited(ms);
      waited = true;
      await sleep(Math.min(ms + 120000, 60 * 60 * 1000));
    } else if (!waited) {
      const ms = hardReset - Date.now();
      log(`key endpoint unavailable — falling back to UTC-midnight schedule (${(ms / 3600000).toFixed(1)}h)`);
      awaited(ms);
      if (ms > 0) await sleep(ms);
      return;
    } else {
      await sleep(10 * 60 * 1000);
    }
  }
  function awaited() {}
}

function runStep(label, script, args) {
  log(`START ${label}`);
  try {
    const out = execSync(`node ${script} ${args}`, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 6 * 60 * 60 * 1000,
      maxBuffer: 64 * 1024 * 1024,
    });
    log(`DONE ${label}: ${out.split('\n').slice(-4).join(' | ').slice(0, 300)}`);
  } catch (e) {
    log(`FAIL ${label}: ${String(e.message).slice(0, 300)}`);
  }
}

(async () => {
  log('overnight scheduler started');
  await waitForQuota();

  // 1. finish mutation campaign (remaining variants only)
  runStep(
    'mutation remaining variants',
    'mutation/run_detection.js',
    '--variants bad_validation,missing_required,dead_button --skip-baseline',
  );

  // 2. repeatability study (9 full pipeline runs, sequential)
  runStep('repeatability study', 'testing/run_repeatability.js', '--runs 3');

  log('overnight scheduler finished');
})().catch((e) => log('FATAL ' + e.message));
