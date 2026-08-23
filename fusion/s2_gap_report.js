'use strict';

/**
 * s2_gap_report.js — deterministic coverage/gap analysis over the S1 catalog.
 * ZERO LLM calls. Byte-identical output for identical inputs.
 *
 * Consumes runs/<run_dir>/fusion/{catalog.json,observations.json} plus the
 * run's generated test cases (A: dom/test_cases.json selector-based,
 * B: vision/outputs/test_cases_*_exploration.json label/coordinate-based).
 *
 * Produces fusion/gap_report.json:
 *   elements  : common / A-only / B-only / actionable-uncovered
 *   behaviors : common / A-only / B-only / uncovered
 *   conflicts : element classification disagreements (from S1)
 *   anomalies : rare, low-confidence, multi-position observations
 *   opportunities : uncovered states/transitions (leaf states, quiet pages)
 *   summary   : compact counts + percentages for a future Fusion LLM
 */

const fs = require('fs');
const path = require('path');

const { normText } = require('./lib/normalize');

const ACTIONABLE_A_TAGS = new Set(['button', 'a', 'input', 'select', 'textarea']);
const ACTIONABLE_B_TYPES = new Set(['button', 'link', 'input', 'select', 'choice', 'checkbox', 'radiobox', 'tab', 'menu']);

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

/** Coverage keys derived from generated test steps. */
function collectCoverage(runDir) {
  const aSelectorActions = new Set(); // `${action}|${selector}`
  const bLabelActions = new Set();    // `${action}|${type}:${text}`

  const aCases = readJson(path.join(runDir, 'dom', 'test_cases.json')) || [];
  for (const tc of Array.isArray(aCases) ? aCases : []) {
    for (const s of (tc.steps || [])) {
      if (s.selector) aSelectorActions.add(`${String(s.action).toLowerCase()}|${s.selector}`);
      else if (s.target && typeof s.target === 'string') aSelectorActions.add(`${String(s.action).toLowerCase()}|${s.target}`);
    }
  }

  const visionOut = path.join(runDir, 'vision', 'outputs');
  if (fs.existsSync(visionOut)) {
    for (const f of fs.readdirSync(visionOut).sort()) {
      if (!/^test_cases_.*\.json$/.test(f)) continue;
      const cases = readJson(path.join(visionOut, f));
      for (const tc of (Array.isArray(cases) ? cases : [])) {
        for (const s of (tc.steps || [])) {
          const t = s.target;
          if (t && typeof t === 'object' && t.type !== undefined) {
            bLabelActions.add(`${String(s.action).toLowerCase()}|${normText(`${t.type}:${t.text || ''}`)}`);
          } else if (typeof s.action === 'string') {
            bLabelActions.add(`${s.action.toLowerCase()}|`);
          }
        }
      }
    }
  }
  return { aSelectorActions, bLabelActions };
}

function buildGapReport(catalog, coverage) {
  const { aSelectorActions, bLabelActions } = coverage;

  const splitByArch = (records) => ({
    common: records.filter(r => r.seen_by.includes('A') && r.seen_by.includes('B')),
    a_only: records.filter(r => r.seen_by.length === 1 && r.seen_by[0] === 'A'),
    b_only: records.filter(r => r.seen_by.length === 1 && r.seen_by[0] === 'B'),
  });

  const elemSplit = splitByArch(catalog.elements);
  const behSplit = splitByArch(catalog.behaviors);

  // ---- behavior test coverage ---------------------------------------------
  // A behaviors target CSS selectors; B behaviors target `type:label` pairs.
  const behaviorCovered = catalog.behaviors.filter(b => {
    const kA = `${b.action_type.toLowerCase()}|${b.target}`;
    if (aSelectorActions.has(kA)) return true;
    const kB = `${b.action_type.toLowerCase()}|${normText(b.target)}`;
    return bLabelActions.has(kB);
  });
  const behaviorUncovered = catalog.behaviors.filter(b => !behaviorCovered.includes(b));

  // ---- element coverage ----------------------------------------------------
  // A elements: covered when a generated A step targets one of their recorded
  // selectors. B elements: covered when a generated B step's label matches.
  const coveredElements = [];
  const uncoveredElements = [];
  const aCoverageValues = [...aSelectorActions];
  for (const el of catalog.elements) {
    let covered = false;
    if ((el.a_selectors || []).length) {
      covered = aCoverageValues.some(k => {
        const sel = k.slice(k.indexOf('|') + 1);
        return el.a_selectors.includes(sel);
      });
    }
    if (!covered && el.element_type !== 'text' && el.label) {
      const lbl = normText(el.label);
      covered = aCoverageValues.length >= 0 &&
        [...bLabelActions].some(k => k.endsWith(`|${lbl}`));
    }
    (covered ? coveredElements : uncoveredElements).push(el);
  }

  const actionableUncovered = uncoveredElements.filter(el => {
    if (el.seen_by.includes('A') && !el.seen_by.includes('B')) {
      return ACTIONABLE_A_TAGS.has(String(el.element_type).toLowerCase());
    }
    return ACTIONABLE_B_TYPES.has(String(el.element_type).toLowerCase());
  });

  // ---- anomalies -----------------------------------------------------------
  const rare = catalog.elements.filter(e => e.occurrences <= 1);
  const lowConfidence = catalog.elements.filter(e =>
    typeof e.max_confidence === 'number' && e.max_confidence < 0.4);
  const multiPosition = catalog.elements.filter(e => (e.centers || []).length > 1);

  // ---- state/transition opportunities -------------------------------------
  // Pages where states were observed but NO successful outgoing behavior was
  // ever recorded — unexplored territory for a future Fusion collector.
  const fromOk = new Set();
  for (const b of catalog.behaviors) {
    if (b.successes > 0 && b.page_key) fromOk.add(b.page_key);
  }
  const quietPages = catalog.pages.filter(p => !fromOk.has(p.page_key));

  // Transition targets reached at least once (for later reachability checks).
  const transitionTargetRefs = [...new Set(
    catalog.behaviors.flatMap(b => b.to_refs || [])
  )];

  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

  return {
    generated_at_input_hash: null, // determinism: no wall-clock timestamps
    elements: {
      total: catalog.elements.length,
      common: elemSplit.common.map(refOf),
      a_only: elemSplit.a_only.map(refOf),
      b_only: elemSplit.b_only.map(refOf),
      actionable_uncovered: actionableUncovered.map(refOf),
      counts: {
        common: elemSplit.common.length,
        a_only: elemSplit.a_only.length,
        b_only: elemSplit.b_only.length,
        actionable_uncovered: actionableUncovered.length,
        covered: coveredElements.length,
        coverage_pct: pct(coveredElements.length, catalog.elements.length),
      },
    },
    behaviors: {
      total: catalog.behaviors.length,
      common: behSplit.common.map(refOf),
      a_only: behSplit.a_only.map(refOf),
      b_only: behSplit.b_only.map(refOf),
      uncovered: behaviorUncovered.map(refOf),
      counts: {
        common: behSplit.common.length,
        a_only: behSplit.a_only.length,
        b_only: behSplit.b_only.length,
        uncovered: behaviorUncovered.length,
        covered: behaviorCovered.length,
        coverage_pct: pct(behaviorCovered.length, catalog.behaviors.length),
      },
    },
    conflicts: catalog.conflicts,
    conflict_count: catalog.conflicts.length,
    anomalies: {
      rare_single_observation: rare.map(refOf),
      low_confidence_lt_0_4: lowConfidence.map(refOf),
      multi_position: multiPosition.map(refOf),
      counts: { rare: rare.length, low_confidence: lowConfidence.length, multi_position: multiPosition.length },
    },
    opportunities: {
      quiet_pages_no_successful_outgoing_behavior: quietPages.map(p => ({
        page_id: p.page_id, page_key: p.page_key, seen_by: p.seen_by,
      })),
      transition_target_refs: transitionTargetRefs,
    },
    summary: {
      llm_calls: 0,
      deterministic: true,
      totals: {
        elements: catalog.elements.length,
        behaviors: catalog.behaviors.length,
        conflicts: catalog.conflicts.length,
        pages: catalog.pages.length,
        element_coverage_pct: pct(coveredElements.length, catalog.elements.length),
        behavior_coverage_pct: pct(behaviorCovered.length, catalog.behaviors.length),
      },
    },
  };
}

/** Compact reference — keeps the report machine-readable and small. */
function refOf(r) {
  return {
    id: r.element_id || r.behavior_id,
    page_key: r.page_key,
    type: r.element_type || r.action_type,
    label_or_target: r.label !== undefined ? r.label : r.target,
    occurrences: r.occurrences,
    seen_by: r.seen_by,
  };
}

module.exports = { buildGapReport, collectCoverage, refOf };

if (require.main === module) {
  const arg = process.argv[2];
  if (!arg) { console.error('Usage: node fusion/s2_gap_report.js <run_id | run_dir>'); process.exit(2); }
  const root = path.join(__dirname, '..', 'runs');
  const runDir = fs.existsSync(arg) ? arg : path.join(root, arg);
  const catalog = readJson(path.join(runDir, 'fusion', 'catalog.json'));
  if (!catalog) { console.error(`No S1 catalog at ${path.join(runDir, 'fusion')}`); process.exit(2); }
  const coverage = collectCoverage(runDir);
  const report = buildGapReport(catalog, coverage);
  const out = path.join(runDir, 'fusion', 'gap_report.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log('[gap] elements:', JSON.stringify(report.elements.counts));
  console.log('[gap] behaviors:', JSON.stringify(report.behaviors.counts));
  console.log('[gap] conflicts:', report.conflict_count);
  console.log('[gap] anomalies:', JSON.stringify(report.anomalies.counts));
  console.log('[gap] opportunities: quietPages=' + report.opportunities.quiet_pages_no_successful_outgoing_behavior.length);
  console.log(`[gap] Wrote ${out}`);
}
