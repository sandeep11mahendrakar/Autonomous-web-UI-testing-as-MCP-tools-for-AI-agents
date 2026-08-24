'use strict';

/**
 * analyze.js — deterministic bug-detection scoring for the mutation harness.
 *
 * Detection channels (V1):
 *   - arch_b : Architecture B's execution report (storage/outputs/execution_results*.json
 *              collected into runs/<id>/vision/outputs/)
 *   - fused  : Fusion FT execution report (runs/<id>/fusion/ft_execution_report.json)
 *
 * A channel DETECTS a seeded bug when any executed step/test that targets a
 * bug-related element or URL FAILED. If bug-related elements were exercised
 * and everything passed -> NOT_DETECTED. If nothing touched them ->
 * NOT_COVERED ("not enough coverage to conclude" — never reported as a pass).
 *
 * Architecture A generates tests but does not execute them; its only runtime
 * signal arrives through Fusion FTs grounded in its catalog, so A has no
 * standalone channel in V1. This is stated in every scorecard output.
 */

const MAX_WALK_DEPTH = 24;

function isFailStatus(v) {
  return typeof v === 'string'
    && /fail|error|mismatch|mismatched|invalid/i.test(v)
    && !/no_failures|fail_count|failed_steps":\s*0/.test(v);
}

/** Collect text/url-ish strings near any boolean/string status in a JSON tree. */
function collectSignals(node, out = [], depth = 0) {
  if (depth > MAX_WALK_DEPTH || node == null) return out;
  if (Array.isArray(node)) {
    for (const n of node) collectSignals(n, out, depth + 1);
    return out;
  }
  if (typeof node !== 'object') return out;

  let status = null;
  for (const k of ['status', 'outcome', 'result', 'verification_status']) {
    if (typeof node[k] === 'string' && node[k].length < 80) { status = node[k]; break; }
  }
  if (typeof node.passed === 'boolean' || typeof node.success === 'boolean') {
    status = (node.passed ?? node.success) ? 'pass' : 'fail';
  }

  const texts = [];
  const urls = [];
  const grab = (v) => {
    if (typeof v === 'string' && v.length < 300) texts.push(v);
    else if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (typeof v.text === 'string') texts.push(v.text);
      if (typeof v.label === 'string') texts.push(v.label);
      if (typeof v.expected_result === 'string') texts.push(v.expected_result);
    }
  };
  grab(node.target);
  for (const k of ['label', 'selector', 'description', 'name', 'expected_result', 'reason', 'error']) {
    grab(node[k]);
  }
  const urlScan = (v) => {
    if (typeof v === 'string') urls.push(v);
    else if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const k2 of ['url', 'from_url', 'to_url', 'page_url']) urlScan(v[k2]);
    }
  };
  urlScan(node);

  if (status != null) {
    out.push({
      failed: status === 'fail' ? true : isFailStatus(status),
      texts,
      urls,
    });
  } else {
    // keep walking children so nested steps are found even without own status
    for (const k of Object.keys(node)) collectSignals(node[k], out, depth + 1);
    return out;
  }
  for (const k of Object.keys(node)) {
    if (['steps_executed', 'steps', 'results'].includes(k)) {
      collectSignals(node[k], out, depth + 1);
    }
  }
  return out;
}

function loadJsonSafe(file, fsMod = require('fs')) {
  try {
    return JSON.parse(fsMod.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

/**
 * Score one channel.
 * @param {object|null} report parsed execution report JSON
 * @param {{targets:string[], detect_urls:string[]}} bug BUGS[id]
 * @returns {'DETECTED'|'NOT_DETECTED'|'NOT_COVERED'|'NO_REPORT'}
 */
function scoreChannel(report, bug) {
  if (!report) return 'NO_REPORT';
  const signals = collectSignals(report);
  if (!signals.length) return 'NO_REPORT';

  const hay = signals.map((s) => ({
    failed: s.failed,
    text: [...s.texts, ...s.urls].join(' ').toLowerCase(),
  }));

  let relevant = 0;
  let failedRelevant = 0;
  for (const h of hay) {
    const hitTarget = bug.targets.some((t) => h.text.includes(t.toLowerCase()));
    const hitUrl = bug.detect_urls.some((u) => h.text.includes(u.toLowerCase()));
    if (!hitTarget && !hitUrl) continue;
    relevant++;
    if (h.failed) failedRelevant++;
  }
  if (!relevant) return 'NOT_COVERED';
  return failedRelevant > 0 ? 'DETECTED' : 'NOT_DETECTED';
}

/**
 * Full per-variant analysis.
 * @param {object} paths {bExecutionReport, ftExecutionReport} absolute paths
 */
function analyzeVariant(bugDef, paths, fsMod = require('fs')) {
  const bReport = loadJsonSafe(paths.bExecutionReport, fsMod);
  const ftReport = loadJsonSafe(paths.ftExecutionReport, fsMod);
  return {
    arch_b: scoreChannel(bReport, bugDef),
    fused: scoreChannel(ftReport, bugDef),
    // A has no standalone runtime channel in V1 (see module header).
    arch_a: 'NOT_APPLICABLE_V1',
  };
}

module.exports = { collectSignals, scoreChannel, analyzeVariant, isFailStatus };
