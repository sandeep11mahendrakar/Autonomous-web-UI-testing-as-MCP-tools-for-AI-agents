'use strict';

/**
 * s1_build_catalog.js — Fusion Phase S1 runner (deterministic, no LLM).
 *
 * Consumes one unified run's artifacts:
 *   runs/<run_id>/dom/     (Architecture A)
 *   runs/<run_id>/vision/  (Architecture B)
 *
 * Produces runs/<run_id>/fusion/:
 *   observations.json  every normalized observation with provenance
 *   catalog.json       canonical pages / elements / behaviors + conflicts
 *
 * Usage: node fusion/s1_build_catalog.js <run_id | path-to-run-dir>
 */

const fs = require('fs');
const path = require('path');

const {
  normalizeAStates,
  normalizeATransitions,
  normalizeVisualDom,
  normalizeExecutionResults,
  buildBStateUrlMap,
  normalizeBHistoryStates,
  normalizeBHistoryTransitions,
  clusterObservations,
  assignObsIds,
  pageKey,
} = require('./lib/normalize');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

function buildCatalog(runDir) {
  const domDir = path.join(runDir, 'dom');
  const visionOut = path.join(runDir, 'vision', 'outputs');

  const observations = [];

  // ---- Architecture A ----
  const states = readJson(path.join(domDir, 'states.json')) || [];
  const transitions = readJson(path.join(domDir, 'transitions.json')) || [];
  const memoryLog = readJson(path.join(domDir, 'memory_log.json')) || [];
  observations.push(...normalizeAStates(states));
  observations.push(...normalizeATransitions(transitions, states));

  // A element evidence from recorded action targets (selector identity space).
  let skippedNullPage = 0;
  for (let i = 0; i < memoryLog.length; i++) {
    const e = memoryLog[i];
    const ted = e.target_element_details;
    if (!ted || !ted.selector) continue;
    // Defect #23: null/undefined from_url produced the literal page_key
    // "null", creating a phantom catalog page. Skip unattributable entries.
    const pk = pageKey(e.from_url);
    if (!pk) { skippedNullPage++; continue; }
    observations.push({
      kind: 'element',
      architecture: 'A',
      source: 'dom/memory_log.json',
      page_url: e.from_url,
      page_key: pk,
      element_type: (ted.tag || 'unknown').toLowerCase(),
      label: ted.text || ted.selector,
      confidence: null,
      center: null,
      ref_id: ted.selector,
      timestamp: e.timestamp || null,
      attrs: { selector: ted.selector },
    });
  }
  if (skippedNullPage) {
    console.warn(`[s1] defect-23 guard: skipped ${skippedNullPage} observation(s) with unattributable page_url`);
  }

  // ---- Architecture B ----
  // The exploration history is the spine: it maps state_ids to URLs and
  // records every transition with provenance.
  let bStateUrls = {};
  let history = null;
  const histories = fs.existsSync(visionOut)
    ? fs.readdirSync(visionOut).filter(f => /^run_\d+_exploration_history\.json$/.test(f)).sort()
    : [];
  if (histories.length) {
    const newest = histories[histories.length - 1]; // newest by run id / sort
    history = readJson(path.join(visionOut, newest));
    if (history) {
      bStateUrls = buildBStateUrlMap(history);
      observations.push(...normalizeBHistoryStates(history, `vision/outputs/${newest}`));
      observations.push(...normalizeBHistoryTransitions(history, `vision/outputs/${newest}`));
    }
  }

  let bFiles = 0;
  if (fs.existsSync(visionOut)) {
    for (const f of fs.readdirSync(visionOut).sort()) {
      if (!f.includes('visual_dom')) continue;
      const vdom = readJson(path.join(visionOut, f));
      if (!vdom || !Array.isArray(vdom.elements)) continue;
      // Re-detection visual DOMs may lack source_url; resolve via state_id
      // prefix (state_NNN_*_visual_dom.json -> exploration history URL).
      if (!vdom.source_url && history) {
        const m = f.match(/^(state_\d+)_/);
        if (m && bStateUrls[m[1]]) vdom.source_url = bStateUrls[m[1]];
        else if (!m && history.start_url) vdom.source_url = history.start_url;
      }
      observations.push(...normalizeVisualDom(vdom, `vision/outputs/${f}`));
      bFiles += 1;
    }
    const exec = readJson(path.join(visionOut, 'execution_results.json'));
    if (exec) {
      observations.push(...normalizeExecutionResults(exec, 'vision/outputs/execution_results.json'));
    }
  }

  const all = assignObsIds(observations);
  const catalog = clusterObservations(all);

  // Deterministic provenance: newest input mtime, NOT wall-clock build time
  // (identical inputs must always produce byte-identical catalogs).
  const inputPaths = [
    path.join(domDir, 'states.json'),
    path.join(domDir, 'transitions.json'),
    path.join(domDir, 'memory_log.json'),
    path.join(visionOut, 'execution_results.json'),
  ];
  let newestInput = 0;
  for (const p of inputPaths) {
    if (fs.existsSync(p)) newestInput = Math.max(newestInput, fs.statSync(p).mtimeMs);
  }

  const summary = {
    run_dir: path.basename(runDir),
    built_from_inputs_at: new Date(newestInput).toISOString(),
    deterministic: true,
    llm_calls: 0,
    inputs: {
      a_states: states.length,
      a_transitions: transitions.length,
      a_memory_log_entries: memoryLog.length,
      b_visual_dom_files: bFiles,
      b_execution_results: !!readJson(path.join(visionOut, 'execution_results.json')),
      b_history_states: history ? ((history.states || []).length) : 0,
      b_history_transitions: history ? ((history.transitions || []).length) : 0,
    },
    counts: {
      observations: all.length,
      pages: catalog.pages.length,
      elements: catalog.elements.length,
      behaviors: catalog.behaviors.length,
      conflicts: catalog.conflicts.length,
      multi_arch_pages: catalog.pages.filter(p => p.seen_by.length > 1).length,
      a_only_pages: catalog.pages.filter(p => p.seen_by.length === 1 && p.seen_by[0] === 'A').length,
      b_only_pages: catalog.pages.filter(p => p.seen_by.length === 1 && p.seen_by[0] === 'B').length,
      observations_without_page: catalog.skipped_no_page || 0,
    },
  };

  return { observations: all, catalog: { ...catalog, summary } };
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node fusion/s1_build_catalog.js <run_id | run_dir>');
    process.exit(2);
  }
  const root = path.join(__dirname, '..', 'runs');
  const runDir = fs.existsSync(arg) ? arg : path.join(root, arg);
  if (!fs.existsSync(runDir)) {
    console.error(`Run dir not found: ${runDir}`);
    process.exit(2);
  }

  const { observations, catalog } = buildCatalog(runDir);
  const outDir = path.join(runDir, 'fusion');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'observations.json'), JSON.stringify(observations, null, 2));
  fs.writeFileSync(path.join(outDir, 'catalog.json'), JSON.stringify(catalog, null, 2));

  console.log('[s1] Observations:', catalog.summary.counts.observations);
  console.log('[s1] Canonical pages:', catalog.summary.counts.pages,
    `(multi-arch: ${catalog.summary.counts.multi_arch_pages})`);
  console.log('[s1] Canonical elements:', catalog.summary.counts.elements);
  console.log('[s1] Canonical behaviors:', catalog.summary.counts.behaviors);
  console.log('[s1] Conflicts:', catalog.summary.counts.conflicts);
  console.log(`[s1] Wrote ${path.join(outDir, 'observations.json')}`);
  console.log(`[s1] Wrote ${path.join(outDir, 'catalog.json')}`);
}

if (require.main === module) main();
module.exports = { buildCatalog };
