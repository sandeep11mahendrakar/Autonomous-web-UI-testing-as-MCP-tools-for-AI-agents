'use strict';

/**
 * s4_context.js — S4 Fusion deterministic context builder. NO LLM calls.
 *
 * Consumes the S1 catalog + S2 gap report and produces:
 *   - gap candidates with DETERMINISTIC gap_ids (the only source_gap_id values
 *     the Fusion LLM is allowed to reference)
 *   - compact catalog index (id -> record) used for grounding validation
 *   - a COMPACT structured prompt payload (no raw DOM/OCR/screenshots)
 *
 * Gap id scheme (stable, derived from S2 output order):
 *   gap_<element_id>            actionable uncovered element
 *   gap_bh_<behavior_id>        uncovered behavior
 *   gap_conflict_<index>        classification conflict (S2 order)
 *   gap_quiet_<page_id>         quiet page (no successful outgoing behavior)
 */

const { normText } = require('./normalize');

const MAX_ELEMENT_GAPS = Number(process.env.FUSION_MAX_ELEMENT_GAPS) || 30;

function buildGapCandidates(gapReport) {
  const candidates = [];
  for (const el of gapReport.elements.actionable_uncovered || []) {
    candidates.push({
      gap_id: `gap_${el.id}`,
      kind: 'uncovered_actionable_element',
      page_key: el.page_key,
      ref_kind: 'element',
      ref_id: el.id,
      type: el.type,
      label_or_target: el.label_or_target,
      occurrences: el.occurrences,
    });
  }
  for (const bh of gapReport.behaviors.uncovered || []) {
    candidates.push({
      gap_id: `gap_bh_${bh.id}`,
      kind: 'uncovered_behavior',
      page_key: bh.page_key,
      ref_kind: 'behavior',
      ref_id: bh.id,
      type: bh.type,
      label_or_target: bh.label_or_target,
    });
  }
  (gapReport.conflicts || []).forEach((c, i) => {
    candidates.push({
      gap_id: `gap_conflict_${i}`,
      kind: 'classification_conflict',
      page_key: c.page_key,
      label: c.label,
      values: c.values,
      note: c.note,
    });
  });
  for (const p of gapReport.opportunities.quiet_pages_no_successful_outgoing_behavior || []) {
    candidates.push({
      gap_id: `gap_quiet_${p.page_id}`,
      kind: 'quiet_page',
      page_key: p.page_key,
      seen_by: p.seen_by,
    });
  }
  return candidates;
}

function buildCatalogIndex(catalog) {
  const elements = new Map();
  const behaviors = new Map();
  const pages = new Map();          // page_key -> page record
  const pageIds = new Map();        // page_id  -> page record
  for (const el of catalog.elements) elements.set(el.element_id, el);
  for (const bh of catalog.behaviors) behaviors.set(bh.behavior_id, bh);
  for (const pg of catalog.pages) { pages.set(pg.page_key, pg); pageIds.set(pg.page_id, pg); }
  return { elements, behaviors, pages, pageIds };
}

/** Records actually referenced by candidates — keeps the prompt minimal. */
function referencedRecords(candidates, index) {
  const els = [];
  const bhs = [];
  const pageKeys = new Set();
  const seenEl = new Set();
  const seenBh = new Set();
  for (const c of candidates) {
    pageKeys.add(c.page_key);
    if (c.ref_kind === 'element' && !seenEl.has(c.ref_id)) {
      seenEl.add(c.ref_id);
      const rec = index.elements.get(c.ref_id);
      if (rec) {
        els.push({
          id: rec.element_id,
          pid: (index.pages.get(rec.page_key) || {}).page_id || null,
          type: rec.element_type,
          label: rec.label,
          selectors: (rec.a_selectors || []).slice(0, 3),
        });
      }
    }
    if (c.ref_kind === 'behavior' && !seenBh.has(c.ref_id)) {
      seenBh.add(c.ref_id);
      const rec = index.behaviors.get(c.ref_id);
      if (rec) {
        bhs.push({
          id: rec.behavior_id,
          pid: (index.pages.get(rec.page_key) || {}).page_id || null,
          action: rec.action_type,
          target: rec.target,
          successes: rec.successes,
        });
      }
    }
  }
  // Quiet-page / conflict gaps also need their page context available.
  const pagesOut = [...pageKeys]
    .map(k => index.pages.get(k))
    .filter(Boolean)
    .map(p => ({ pid: p.page_id, url: p.page_key }));
  return { pages: pagesOut, elements: els, behaviors: bhs };
}

/**
 * Build the full prompt payload + everything the validator needs.
 * `existingTests` = [{source:'A'|'B', objective}] for dedup awareness.
 *
 * EXECUTABILITY FILTER: the live executor resolves every non-navigate step
 * through an S1 catalog element's a_selectors (DOM selectors). Gap candidates
 * whose target cannot be resolved that way (vision-only elements, behaviors
 * targeting unselector-able visuals, conflicts on selector-less elements) are
 * EXCLUDED from what is offered to the LLM — proposing them would only
 * produce tests that fail at target resolution.
 */
function buildFusionContext({
  catalog,
  gapReport,
  existingTests,
  coveredKeys = [],
  maxElementGaps = MAX_ELEMENT_GAPS,
}) {
  const index = buildCatalogIndex(catalog);

  // page_key|normalized-label -> element ids with at least one DOM selector
  const resolvableByLabel = new Map();
  const selectorsSet = new Set();
  for (const el of catalog.elements) {
    if ((el.a_selectors || []).length) {
      resolvableByLabel.set(`${el.page_key}|${normText(el.label)}`, el.element_id);
      for (const s of el.a_selectors) selectorsSet.add(s);
    }
  }

  let candidates = buildGapCandidates(gapReport).filter((c) => {
    if (c.kind === 'uncovered_actionable_element') {
      const rec = index.elements.get(c.ref_id);
      return Boolean(rec && (rec.a_selectors || []).length);
    }
    if (c.kind === 'uncovered_behavior') {
      const rec = index.behaviors.get(c.ref_id);
      return Boolean(rec && selectorsSet.has(rec.target));
    }
    if (c.kind === 'classification_conflict') {
      return resolvableByLabel.has(`${c.page_key}|${normText(c.label)}`);
    }
    if (c.kind === 'quiet_page') {
      // Executable only if the page hosts at least one DOM-resolvable element.
      for (const el of catalog.elements) {
        if (el.page_key === c.page_key && (el.a_selectors || []).length) return true;
      }
      return false;
    }
    return true;
  });

  // Deterministic priority: behaviors > conflicts > quiet pages > element gaps
  // (capped), so the LLM sees the highest-value gaps first.
  const byKind = k => candidates.filter(c => c.kind === k);
  candidates = [
    ...byKind('uncovered_behavior'),
    ...byKind('classification_conflict'),
    ...byKind('quiet_page'),
    ...byKind('uncovered_actionable_element').slice(0, maxElementGaps),
  ];

  const records = referencedRecords(candidates, index);

  const payload = {
    task:
      'Generate NOVEL UI test cases that Architecture A (DOM) and Architecture B ' +
      '(vision) did NOT already generate. Every step MUST reference a provided ' +
      'record id. Never invent selectors, labels or URLs.',
    rules: [
      'source_gap_id MUST be one of the gids in GAPS.',
      'Every non-navigate step MUST set ref to a provided ELEMENT/BEHAVIOR id on the CURRENT page (for gap_conflict_* entries, use the ref listed INSIDE that GAP entry — never the gid itself).',
      'navigate steps MUST use a url exactly as listed in PAGES (no invented URLs).',
      'A navigate step switches the current page; later refs must belong to it.',
      'fill steps require a non-empty value.',
      'novelty_reason must state why A/B tests do not already cover this.',
      'Prefer: uncovered behaviors, conflict disambiguation probes, composed multi-step workflows over known pages.',
      'Do NOT re-test targets already listed in COVERED_KEYS.',
    ],
    pages: records.pages,
    elements: records.elements,
    behaviors: records.behaviors,
    gaps: candidates.map(c => ({
      gid: c.gap_id,
      kind: c.kind,
      page: (index.pages.get(c.page_key) || {}).page_id || c.page_key,
      ...(c.ref_kind ? { ref: c.ref_id } : {}),
      // Conflict gaps have no direct ref — provide the DOM-resolvable element
      // id that represents the conflicting label so the LLM can cite it.
      ...(c.kind === 'classification_conflict'
        ? { ref: resolvableByLabel.get(`${c.page_key}|${normText(c.label)}`) || null }
        : {}),
      ...(c.label !== undefined ? { label: c.label } : {}),
      ...(c.values ? { types: c.values } : {}),
      ...(c.label_or_target !== undefined ? { target: c.label_or_target } : {}),
    })),
    existing_tests: (existingTests || []).map(t => ({ src: t.source, objective: t.objective })),
    covered_keys_sample: coveredKeys.slice(0, 120),
    output_schema: {
      tests: [{
        source_gap_id: '<gid from GAPS>',
        novelty_reason: '<string>',
        objective: '<string>',
        start_page: '<pid from PAGES>',
        expected_result: '<string>',
        steps: [{
          action: 'click|fill|navigate',
          ref: '<ELEMENT/BEHAVIOR id; omit for navigate>',
          url: '<PAGES url; navigate only>',
          value: '<fill only>',
        }],
      }],
    },
  };

  return { candidates, index, payload };
}

function buildPrompt(payload) {
  return JSON.stringify(payload, null, 1);
}

module.exports = {
  buildGapCandidates,
  buildCatalogIndex,
  buildFusionContext,
  buildPrompt,
  MAX_ELEMENT_GAPS,
};
