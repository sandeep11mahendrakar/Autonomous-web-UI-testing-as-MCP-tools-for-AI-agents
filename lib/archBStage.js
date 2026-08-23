'use strict';

/**
 * lib/archBStage.js — pure decision helpers for the unified runner's
 * Architecture-B stage. Extracted from runBoth.js so they can be tested
 * offline without spawning browsers, services or LLM calls.
 *
 * Semantics (mirrors runBoth.js):
 *  - B MUST run in --explore mode (multi-page); one-shot mode never selected.
 *  - Only exploration test-case files created during THIS run qualify
 *    (mtime >= sinceMs). There is NEVER a stale-file fallback: the single
 *    newest matching file is considered and nothing else.
 *  - A file that is missing, unparseable, or contains zero usable cases
 *    (each case needs id + steps[]) is treated as "no test cases".
 */

const fs = require('fs');
const path = require('path');

const EXPLORATION_TC_RE = /^test_cases_(run_\d+)_exploration\.json$/;

/** True when the JSON file parses to a non-empty array of usable cases. */
function isValidExplorationTestCases(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed) || parsed.length === 0) return false;
    return parsed.every(tc => tc && tc.id && Array.isArray(tc.steps) && tc.steps.length > 0);
  } catch (_) {
    return false;
  }
}

/**
 * Select THE newest exploration test-case file produced during this run.
 * Returns { selected, valid, reason }:
 *   selected: { runId, full, t } | null
 *   valid:    boolean (content check; false → caller must NOT execute)
 *   reason:   'ok' | 'no-exploration-output' | 'empty-or-invalid'
 */
function selectExplorationTestCases(outputsDir, sinceMs) {
  let entries = [];
  try {
    entries = fs.readdirSync(outputsDir);
  } catch (_) {
    return { selected: null, valid: false, reason: 'no-exploration-output' };
  }

  const candidates = entries
    .map((f) => {
      const m = f.match(EXPLORATION_TC_RE);
      if (!m) return null;
      const full = path.join(outputsDir, f);
      let t = 0;
      try { t = fs.statSync(full).mtimeMs; } catch (_) { return null; }
      return { runId: m[1], full, t };
    })
    .filter(Boolean)
    .filter((x) => x.t >= sinceMs)
    .sort((a, b) => b.t - a.t);

  const newest = candidates[0] || null;
  if (!newest) {
    return { selected: null, valid: false, reason: 'no-exploration-output' };
  }
  if (!isValidExplorationTestCases(newest.full)) {
    return { selected: newest, valid: false, reason: 'empty-or-invalid' };
  }
  return { selected: newest, valid: true, reason: 'ok' };
}

/**
 * Map the three B stages onto the final manifest record.
 * @param {{status:string, duration_ms:number, exitCode?:number}} gen
 * @param {{selected:{runId:string}, valid:boolean}|null} sel
 * @param {{status:string, duration_ms:number, exitCode:number}|null} exec
 */
function archBOutcome({ gen, sel, exec }) {
  if (gen.status !== 'success') {
    return { ...gen, stage: 'exploration', collected: [] };
  }
  if (!sel || !sel.selected || !sel.valid) {
    return {
      status: 'partial_success',
      stage: 'exploration-produced-no-test-cases',
      duration_ms: gen.duration_ms,
      collected: [],
    };
  }
  const status = exec.status === 'success'
    ? 'success'
    : (exec.status === 'timeout' ? 'timeout' : 'partial_success');
  return {
    status,
    stage: 'execution',
    vision_run_id: sel.selected.runId,
    exit_code: exec.exitCode,
    duration_ms: gen.duration_ms + exec.duration_ms,
    collected: [],
  };
}

module.exports = {
  EXPLORATION_TC_RE,
  isValidExplorationTestCases,
  selectExplorationTestCases,
  archBOutcome,
};
