'use strict';

/** Extract per-run report numbers from unified artifacts. Zero LLM. */
const fs = require('fs');
const path = require('path');

function j(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }

function summarize(runId, runsRoot = path.join(__dirname, '..', 'runs')) {
  const d = path.join(runsRoot, runId);
  const out = { run_id: runId };

  const man = j(path.join(d, 'run_manifest.json'));
  out.manifest = man && {
    url: man.url,
    overall: man.overall_status,
    started: man.started_at,
    finished: man.finished_at,
    a_status: man.architecture_a?.status,
    a_ms: man.architecture_a?.duration_ms,
    b_status: man.architecture_b?.status,
    b_stage: man.architecture_b?.stage,
    b_ms: man.architecture_b?.duration_ms,
  };

  const es = j(path.join(d, 'dom', 'exploration_summary.json'));
  out.A = es && {
    termination: es.termination_reason,
    totals: es.totals,
    visited_urls: es.visited_urls?.length,
    warnings: es.warnings?.slice(0, 5),
  };
  const tc = j(path.join(d, 'dom', 'test_cases.json'));
  out.A_tests = Array.isArray(tc)
    ? tc.map((t) => ({ id: t.id || t.test_id, objective: (t.objective || '').slice(0, 90), steps: t.steps?.length }))
    : null;

  const bExec = j(path.join(d, 'vision', 'outputs', 'execution_results.json'));
  out.B = bExec && {
    summary: bExec.summary,
    source_url: bExec.source_url,
  };

  const bExpl = (() => {
    const dir = path.join(d, 'vision', 'outputs');
    try {
      const f = fs.readdirSync(dir).find((x) => x.includes('_exploration_result'));
      return f ? j(path.join(dir, f)) : null;
    } catch (_) { return null; }
  })();
  out.B_expl = bExpl && {
    steps: bExpl.totalSteps ?? bExpl.steps?.length ?? null,
    states: bExpl.totalStates ?? bExpl.states?.length ?? null,
    urls: Array.isArray(bExploredUrls(bExpl)) ? bExploredUrls(bExpl).length : null,
    termination: bExpl.terminationReason || bExpl.termination_reason || null,
  };
  function bExploredUrls(x) { return x.visitedUrls || x.urls || []; }

  const cat = j(path.join(d, 'fusion', 'catalog.json'));
  out.S1 = cat && {
    observations: cat.meta?.observation_count ?? cat.observations?.length,
    elements: cat.elements?.length,
    behaviors: cat.behaviors?.length,
    pages: cat.pages?.length,
    conflicts: cat.conflicts?.length,
  };

  const gap = j(path.join(d, 'fusion', 'gap_report.json'));
  if (gap) {
    const s = gap.summary || gap;
    out.S2 = {
      el_common: s.element_common ?? s.common,
      el_a_only: s.element_a_only ?? s.a_only,
      el_b_only: s.element_b_only ?? s.b_only,
      actionable_uncovered: s.actionable_uncovered_elements ?? s.uncovered_elements,
      bh_uncovered: s.uncovered_behaviors,
      conflicts: s.conflicts,
      coverage_pct: s.coverage_pct ?? s.actionable_coverage_pct,
    };
  }

  const fr = j(path.join(d, 'fusion', 'fusion_report.json'));
  out.S4 = fr && {
    provider: fr.provider,
    offered: fr.gap_candidates_offered,
    candidates: fr.candidates_generated,
    accepted: fr.accepted_count,
    rejected: fr.rejected_count,
    rejections: fr.rejections,
  };

  const ft = j(path.join(d, 'fusion', 'ft_execution_results.json'));
  out.FT = ft && { summary: ft.summary };

  const dd = j(path.join(d, 'fusion', 'dashboard_data.json'));
  out.DASH = dd && {
    headline: dd.headline,
    llm_calls: dd.llm_calls,
  };

  return out;
}

if (require.main === module) {
  const runId = process.argv[2];
  if (!runId) { console.error('usage: node testing/extract_run.js <run_id>'); process.exit(2); }
  console.log(JSON.stringify(summarize(runId), null, 1));
}

module.exports = { summarize };
