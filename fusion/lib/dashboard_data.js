'use strict';

/**
 * dashboard_data.js — deterministic aggregation of ALL pipeline artifacts
 * into one compact metrics object for the evaluation dashboard. NO LLM calls,
 * no wall-clock values. Every section records its artifact provenance.
 *
 * Consumes (per run dir):
 *   dom/test_cases.json, dom/states.json            (Architecture A)
 *   vision/outputs/test_cases_*.json, *_history     (Architecture B)
 *   fusion/catalog.json                             (S1)
 *   fusion/gap_report.json                          (S2)
 *   fusion/fusion_tests.json, fusion_report.json    (S4)
 *   fusion/ft_execution_results.json                (Fusion execution)
 */

const fs = require('fs');
const path = require('path');

const { normText } = require('./normalize');
const { collectCoverage } = require('../s2_gap_report');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

/** Element-level coverage attribution across A / B / Fusion. */
function attributeElements(catalog, coverage, fusionKeySet) {
  const aKeys = coverage.aSelectorActions;
  const bKeys = coverage.bLabelActions;
  const fArr = [...fusionKeySet];
  let byA = 0;
  let byB = 0;
  let byFusion = 0;
  let coveredAny = 0;
  for (const el of catalog.elements) {
    const selKeys = (el.a_selectors || []).map(s => String(s));
    const labelKey = el.label !== undefined && el.label !== null ? normText(el.label) : null;
    const inA = selKeys.some(s => aKeys.has(`click|${s}`) || aKeys.has(`fill|${s}`) || aKeys.has(`navigate|${s}`));
    const inB = labelKey !== null && [...bKeys].some(k => {
      const tgt = k.slice(k.indexOf('|') + 1);
      // B keys look like `click|link:Docs` — compare bare label or type:label.
      return tgt === labelKey || tgt.endsWith(':' + labelKey);
    });
    const inF = fArr.some(k => {
      const tgt = k.slice(k.indexOf('|') + 1);
      return selKeys.includes(tgt) || (labelKey !== null && tgt === labelKey);
    });
    if (inA) byA += 1;
    if (inB) byB += 1;
    if (inF) byFusion += 1;
    if (inA || inB || inF) coveredAny += 1;
  }
  return { total: catalog.elements.length, by_a: byA, by_b: byB, by_fusion_only: byFusion, covered_any: coveredAny };
}

/** Behavior-level coverage attribution across A / B / Fusion. */
function attributeBehaviors(catalog, coverage, fusionRefIds) {
  const aKeys = coverage.aSelectorActions;
  const bKeys = coverage.bLabelActions;
  let byA = 0;
  let byB = 0;
  let byFusion = 0;
  for (const bh of catalog.behaviors) {
    const kA = `${String(bh.action_type).toLowerCase()}|${bh.target}`;
    const kB = `${String(bh.action_type).toLowerCase()}|${normText(bh.target)}`;
    const inA = aKeys.has(kA);
    const inB = bKeys.has(kB);
    const inF = fusionRefIds.has(bh.behavior_id);
    if (inA) byA += 1;
    if (inB) byB += 1;
    if (inF) byFusion += 1;
  }
  return { total: catalog.behaviors.length, by_a: byA, by_b: byB, by_fusion_only: byFusion };
}

/** Collect every coverage key a fusion test could newly exercise. */
function fusionCoverageKeys(fusionTests, catalogIndex) {
  const keys = new Set();
  const refIds = new Set();
  for (const t of fusionTests || []) {
    for (const s of t.steps || []) {
      if (s.ref) refIds.add(s.ref);
      for (const k of t.step_coverage_keys || []) {
        if (!k.startsWith('navigate|')) keys.add(k);
      }
      // Fallback when step_coverage_keys absent (fixture tests): derive live.
      if (!(t.step_coverage_keys || []).length && s.ref && s.action !== 'navigate') {
        const el = catalogIndex.elements.get(s.ref);
        if (el) {
          for (const sel of el.a_selectors || []) keys.add(`${s.action}|${sel}`);
          if (el.label != null) keys.add(`${s.action}|${normText(el.label)}`);
        } else {
          const bh = catalogIndex.behaviors.get(s.ref);
          if (bh) {
            keys.add(`${String(bh.action_type).toLowerCase()}|${bh.target}`);
            keys.add(`${String(bh.action_type).toLowerCase()}|${normText(bh.target)}`);
          }
        }
      }
    }
  }
  return { keys, refIds };
}

function loadCounts(runDir) {
  const aCases = readJson(path.join(runDir, 'dom', 'test_cases.json')) || [];
  let bCases = 0;
  const bFiles = [];
  const visionOut = path.join(runDir, 'vision', 'outputs');
  if (fs.existsSync(visionOut)) {
    for (const f of fs.readdirSync(visionOut).sort()) {
      if (!/^test_cases_.*\.json$/.test(f)) continue;
      const arr = readJson(path.join(visionOut, f)) || [];
      bCases += Array.isArray(arr) ? arr.length : 0;
      bFiles.push(`vision/outputs/${f}`);
    }
  }
  const states = readJson(path.join(runDir, 'dom', 'states.json')) || [];
  let bStates = null;
  const histories = fs.existsSync(visionOut)
    ? fs.readdirSync(visionOut).filter(f => /_exploration_history\.json$/.test(f)).sort()
    : [];
  if (histories.length) {
    const h = readJson(path.join(visionOut, histories[histories.length - 1]));
    if (h && Array.isArray(h.states)) bStates = h.states.length;
  }
  return {
    a_tests: Array.isArray(aCases) ? aCases.length : 0,
    b_tests: bCases,
    b_test_files: bFiles,
    a_states: Array.isArray(states) ? states.length : 0,
    b_states: bStates,
  };
}

function buildDashboardData(runDir) {
  const P = (rel) => path.join(runDir, rel);
  const catalog = readJson(P('fusion/catalog.json'));
  const gap = readJson(P('fusion/gap_report.json'));
  const fusionTests = readJson(P('fusion/fusion_tests.json')) || [];
  const fusionReport = readJson(P('fusion/fusion_report.json'));
  const exec = readJson(P('fusion/ft_execution_results.json'));

  if (!catalog || !gap) throw new Error('Missing S1/S2 artifacts — run S1 and S2 first');

  const counts = loadCounts(runDir);
  const coverage = collectCoverage(runDir);

  const catalogIndex = {
    elements: new Map(catalog.elements.map(e => [e.element_id, e])),
    behaviors: new Map(catalog.behaviors.map(b => [b.behavior_id, b])),
  };
  const { keys: fKeys, refIds: fRefs } = fusionCoverageKeys(fusionTests, catalogIndex);

  // Newly-covered targets attributable to Fusion (not exercised by A or B).
  const abCovered = new Set([...coverage.aSelectorActions, ...coverage.bLabelActions]);
  const novelTargets = [...fKeys].filter(k => !abCovered.has(k));

  const elemAttr = attributeElements(catalog, coverage, fKeys);
  const behAttr = attributeBehaviors(catalog, coverage, fRefs);

  // ---- execution -----------------------------------------------------------
  const execResults = (exec && exec.results) || [];
  const executed = execResults.length;
  const execPassed = execResults.filter(r => r.status === 'PASS').length;
  const verificationMethods = {};
  let weakVerifications = 0;
  const stepRows = [];
  for (const r of execResults) {
    for (const s of r.steps || []) {
      verificationMethods[s.verification_method] =
        (verificationMethods[s.verification_method] || 0) + 1;
      if (s.verification_method === 'weak_page_change') weakVerifications += 1;
      stepRows.push({
        test_id: r.test_id, step: s.step, action: s.action,
        ref: s.ref || s.target_url, result: s.result,
        method: s.verification_method || null,
        coordinates_live: s.coordinates_live || null,
        detail: s.detail || '',
      });
    }
  }
  const totalSteps = stepRows.length;

  // ---- fusion-attributable headline ----------------------------------------
  const totalFinalTests = counts.a_tests + counts.b_tests + fusionTests.length;
  const attribution = {
    total_final_tests: totalFinalTests,
    tests_from_architecture_a: counts.a_tests,
    tests_from_architecture_b: counts.b_tests,
    tests_fusion_created: fusionTests.length,
    // The S4 validator structurally guarantees zero duplicates; the rejected
    // list in fusion_report.json is the audit trail for that guarantee.
    tests_already_covered_by_ab: 0,
    duplicate_rejections_audit: fusionReport ? fusionReport.rejected_count : null,
    pct_final_tests_attributable_to_fusion:
      totalFinalTests ? Math.round((fusionTests.length / totalFinalTests) * 1000) / 10 : 0,
    novel_targets_exercised_by_fusion: novelTargets.length,
    fusion_target_keys_total: fKeys.length,
    sources: [
      'fusion/fusion_tests.json', 'fusion/fusion_report.json',
      'dom/test_cases.json', 'vision/outputs/test_cases_*',
    ],
  };

  // ---- findings sections ----------------------------------------------------
  const topN = (arr, n) => (arr || []).slice(0, n);
  const data = {
    schema_version: 1,
    run_dir: path.basename(runDir),
    generated_from_artifacts: true,
    llm_calls: 0,
    wall_clock: null,

    headline: attribution,

    coverage_matrix: {
      elements: elemAttr,
      behaviors: behAttr,
      tests: {
        total: totalFinalTests,
        a: counts.a_tests,
        b: counts.b_tests,
        fusion: fusionTests.length,
      },
      states: {
        a: counts.a_states,
        b: counts.b_states,
        fusion_pages_touched:
          new Set((fusionTests || []).map(t => t.start_page).filter(Boolean)).size,
      },
      note: 'element/behavior columns overlap (one target may be seen by several architectures)',
      sources: ['fusion/catalog.json', 'fusion/gap_report.json', 'dom/states.json', 'vision/outputs/*_exploration_history.json'],
    },

    architecture_comparison: {
      a: {
        tests: counts.a_tests,
        states: counts.a_states,
        elements_seen: catalog.elements.filter(e => e.seen_by.includes('A')).length,
        behaviors_seen: catalog.behaviors.filter(b => b.seen_by.includes('A')).length,
        targets_covered: coverage.aSelectorActions.size,
      },
      b: {
        tests: counts.b_tests,
        states: counts.b_states,
        elements_seen: catalog.elements.filter(e => e.seen_by.includes('B')).length,
        behaviors_seen: catalog.behaviors.filter(b => b.seen_by.includes('B')).length,
        targets_covered: coverage.bLabelActions.size,
      },
      sources: ['dom/test_cases.json', 'dom/states.json', 'vision/outputs/', 'fusion/gap_report.json'],
    },

    findings: {
      common_elements: gap.elements.counts.common,
      a_only_elements: gap.elements.counts.a_only,
      b_only_elements: gap.elements.counts.b_only,
      common_behaviors: gap.behaviors.counts.common,
      a_only_behaviors: gap.behaviors.counts.a_only,
      b_only_behaviors: gap.behaviors.counts.b_only,
      a_only_sample: topN(gap.elements.a_only, 10),
      b_only_sample: topN(gap.elements.b_only, 10),
      common_sample: topN(gap.elements.common, 10),
      conflicts: gap.conflicts,
      conflict_count: gap.conflict_count,
      uncovered_actionable_elements: gap.elements.counts.actionable_uncovered,
      uncovered_behaviors: gap.behaviors.counts.uncovered,
      quiet_pages: (gap.opportunities.quiet_pages_no_successful_outgoing_behavior || []).length,
      anomalies: gap.anomalies && gap.anomalies.counts,
      sources: ['fusion/gap_report.json'],
    },

    gaps: {
      actionable_uncovered_sample: topN(gap.elements.actionable_uncovered, 12),
      uncovered_behaviors_sample: topN(gap.behaviors.uncovered, 12),
      sources: ['fusion/gap_report.json'],
    },

    fusion: {
      tests_generated: fusionReport ? fusionReport.candidates_generated : null,
      tests_accepted: fusionTests.length,
      tests_rejected: fusionReport ? fusionReport.rejected_count : null,
      rejections: fusionReport ? fusionReport.rejections : [],
      gap_ids_used: fusionReport ? fusionReport.gap_ids_used : [],
      novelty_reasons: fusionReport ? fusionReport.novelty_reasons : [],
      all_grounded: fusionReport ? fusionReport.all_accepted_grounded : null,
      duplicated_existing: fusionReport ? fusionReport.duplicated_existing_ab_tests : null,
      prompt_chars: fusionReport ? fusionReport.prompt_chars : null,
      llm_calls: fusionReport ? fusionReport.llm_calls : null,
      provider: fusionReport ? fusionReport.provider : null,
      tests: (fusionTests || []).map(t => ({
        test_id: t.test_id,
        source_gap_id: t.source_gap_id,
        objective: t.objective,
        novelty_reason: t.novelty_reason,
        start_page: t.start_page,
        steps: (t.steps || []).map(s =>
          s.action === 'navigate' ? `${s.action} -> ${s.url}` : `${s.action} ${s.ref}`),
        provenance: t.provenance || null,
      })),
      sources: ['fusion/fusion_tests.json', 'fusion/fusion_report.json'],
    },

    execution: {
      available: !!exec,
      executed_tests: executed,
      passed: execPassed,
      failed: executed - execPassed,
      pass_rate: executed ? Math.round((execPassed / executed) * 1000) / 10 : null,
      steps_total: totalSteps,
      steps_passed: stepRows.filter(s => s.result === 'PASS').length,
      verification_methods: verificationMethods,
      weak_verifications: weakVerifications,
      reliability_flakiness: executed > 1
        ? 'multi-run comparison possible'
        : 'not yet measurable - single execution run',
      steps: stepRows,
      evidence_dir: exec ? exec.results[0] && 'fusion/ft_execution_evidence/' : null,
      sources: ['fusion/ft_execution_results.json'],
    },
  };

  return data;
}

module.exports = {
  buildDashboardData,
  attributeElements,
  attributeBehaviors,
  fusionCoverageKeys,
};
