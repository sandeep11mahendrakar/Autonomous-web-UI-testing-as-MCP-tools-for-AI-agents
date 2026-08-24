'use strict';

/**
 * s4_validate.js — S4 Fusion grounding + dedup validation. Deterministic.
 *
 * Validates LLM-generated test candidates against the S1 catalog:
 *   schema        — required fields, step shape, action vocabulary
 *   grounding     — every ref must exist in the catalog index; every
 *                   navigate URL must be a known catalog page_key
 *   gap binding   — source_gap_id must be one of the offered candidates
 *   page scoping  — refs must live on the current page of the workflow
 *   dedup         — reject exact duplicates in-batch and tests whose steps
 *                   are all already covered by existing A/B test coverage
 */

const { normText } = require('./normalize');

const VALID_ACTIONS = new Set(['click', 'fill', 'navigate', 'select_option']);
const FILLABLE_ELEMENT_TYPES = new Set(['input', 'textarea', 'select', 'text_input']);
const NON_TEXT_ELEMENT_TYPES = new Set([
  'button', 'a', 'link', 'input', 'select', 'textarea', 'checkbox',
  'radiobox', 'tab', 'menu', 'list_item', 'choice', 'image', 'toggle',
]);
const MAX_STEPS = 12;

/** Extract the first JSON object/array from an LLM response (fence-tolerant). */
function extractJson(text) {
  if (typeof text === 'object' && text !== null) return text;
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  const attempts = [trimmed,
    trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim()];
  for (const a of attempts) {
    try { return JSON.parse(a); } catch (_) {}
  }
  const greedy = trimmed.match(/\{[\s\S]*\}/);
  if (greedy) { try { return JSON.parse(greedy[0]); } catch (_) {} }
  return null;
}

/** All coverage keys a step could map to (A selector space + B label space). */
function stepCoverageKeys(step, index) {
  const action = String(step.action || '').toLowerCase();
  const keys = [];
  if (step.ref_kind === 'element' || (!step.ref_kind && index.elements.has(step.ref))) {
    const el = index.elements.get(step.ref);
    if (el) {
      for (const sel of el.a_selectors || []) keys.push(`${action}|${sel}`);
      if (el.label !== undefined && el.label !== null) keys.push(`${action}|${normText(el.label)}`);
    }
  } else if (step.ref_kind === 'behavior' || (!step.ref_kind && index.behaviors.has(step.ref))) {
    const bh = index.behaviors.get(step.ref);
    if (bh) {
      const act = VALID_ACTIONS.has(String(bh.action_type).toLowerCase())
        ? String(bh.action_type).toLowerCase() : action;
      keys.push(`${act}|${bh.target}`);
      keys.push(`${act}|${normText(bh.target)}`);
    }
  }
  return keys;
}

function testSignature(test, index) {
  const keys = new Set();
  for (const s of test.steps || []) {
    if (s.action === 'navigate' && s.url) { keys.add(`navigate|${s.url}`); continue; }
    for (const k of stepCoverageKeys(s, index)) keys.add(k);
  }
  return [...keys].sort();
}

/**
 * @param {Object} opts
 * @param {Object}   opts.response        parsed LLM response ({tests:[...]})
 * @param {Array}    opts.candidates      gap candidates from s4_context
 * @param {Object}   opts.index           catalog index from s4_context
 * @param {Set}      opts.coveredA        A selector-action keys (from S2)
 * @param {Set}      opts.coveredB        B label-action keys (from S2)
 * @param {Array}    opts.acceptedSigs    signatures of already-accepted tests
 * @param {Number}   [opts.maxTests]
 */
function validateTests({ response, candidates, index, coveredA, coveredB, acceptedSigs = [], maxTests = 8 }) {
  const accepted = [];
  const rejected = [];
  const candidateIds = new Map(candidates.map(c => [c.gap_id, c]));
  const sigs = new Set(acceptedSigs);
  const covered = new Set([...(coveredA || []), ...(coveredB || [])]);

  const tests = (response && Array.isArray(response.tests)) ? response.tests : null;
  if (!tests) {
    return { accepted, rejected: [{ index: 0, reason: 'invalid_response_shape', detail: 'no tests array' }] };
  }

  tests.forEach((t, i) => {
    if (accepted.length >= maxTests) {
      rejected.push({ index: i, reason: 'max_tests_reached', detail: t.objective || '' });
      return;
    }
    const fail = (reason, detail = '') => rejected.push({ index: i, reason, detail });

    if (typeof t !== 'object' || t === null) return fail('invalid_schema', 'test not an object');
    if (typeof t.source_gap_id !== 'string' || !candidateIds.has(t.source_gap_id)) {
      return fail('unknown_source_gap_id', String(t.source_gap_id));
    }
    const gap = candidateIds.get(t.source_gap_id);
    if (typeof t.novelty_reason !== 'string' || t.novelty_reason.trim().length < 10) {
      return fail('missing_novelty_reason', t.source_gap_id);
    }
    if (typeof t.objective !== 'string' || !t.objective.trim()) return fail('missing_objective');
    if (!Array.isArray(t.steps) || t.steps.length < 1 || t.steps.length > MAX_STEPS) {
      return fail('invalid_steps', `len=${(t.steps || []).length}`);
    }

    let currentPage = gap.page_key;
    for (let s = 0; s < t.steps.length; s++) {
      const step = t.steps[s];
      const where = `step ${s + 1}`;
      if (typeof step !== 'object' || step === null) return fail('invalid_schema', where);
      const action = String(step.action || '').toLowerCase();
      if (!VALID_ACTIONS.has(action)) return fail('invalid_action', `${where}: ${step.action}`);

      if (action === 'navigate') {
        const url = typeof step.url === 'string' ? step.url : '';
        if (!index.pages.has(url)) return fail('hallucinated_url', `${where}: ${url}`);
        currentPage = url;
        continue;
      }

      const ref = typeof step.ref === 'string' ? step.ref : '';
      const refKind = index.elements.has(ref) ? 'element'
        : index.behaviors.has(ref) ? 'behavior' : null;
      if (!refKind) return fail('unknown_ref', `${where}: ${ref}`);

      const rec = refKind === 'element' ? index.elements.get(ref) : index.behaviors.get(ref);
      if (rec.page_key !== currentPage) {
        return fail('cross_page_ref', `${where}: ${ref} lives on ${rec.page_key}, current ${currentPage}`);
      }

      if (refKind === 'behavior') {
        const bAct = String(rec.action_type).toLowerCase();
        if (VALID_ACTIONS.has(bAct) && bAct !== action) {
          return fail('action_mismatch', `${where}: behavior ${ref} is ${bAct}, step is ${action}`);
        }
      } else {
        const et = String(rec.element_type).toLowerCase();
        if (action === 'fill' && !FILLABLE_ELEMENT_TYPES.has(et)) {
          return fail('action_not_applicable', `${where}: fill on ${et} ${ref}`);
        }
        if (action === 'click' && !NON_TEXT_ELEMENT_TYPES.has(et)) {
          return fail('action_not_applicable', `${where}: click on ${et} ${ref}`);
        }
      }
      if ((action === 'fill' || action === 'select_option') &&
          (typeof step.value !== 'string' || !step.value.trim())) {
        return fail('missing_value', where);
      }
    }

    // ---- dedup -------------------------------------------------------------
    const sig = testSignature(t, index).join('||');
    if (sigs.has(sig)) return fail('duplicate_in_batch', sig.slice(0, 120));

    // Navigation steps are ROUTING, not coverage — novelty comes from the
    // element/behavior targets actually exercised.
    const stepKeys = [];
    const actionKeys = [];
    for (const step of t.steps) {
      if (step.action === 'navigate') { stepKeys.push(`navigate|${step.url}`); continue; }
      const k = stepCoverageKeys(step, index);
      actionKeys.push(...k);
      stepKeys.push(...k);
    }
    if (!actionKeys.length) return fail('no_actionable_step', 'navigation-only test');
    const novelKeys = actionKeys.filter(k => !covered.has(k));
    if (stepKeys.length && novelKeys.length === 0) {
      return fail('duplicate_of_existing', 'all step targets already covered by A/B tests');
    }

    sigs.add(sig);
    accepted.push({
      source_gap_id: t.source_gap_id,
      gap: {
        kind: gap.kind,
        page_key: gap.page_key,
        ref_kind: gap.ref_kind || null,
        ref_id: gap.ref_id || null,
      },
      novelty_reason: t.novelty_reason.trim(),
      objective: t.objective.trim(),
      start_page: gap.page_key,
      expected_result: typeof t.expected_result === 'string' ? t.expected_result.trim() : '',
      steps: t.steps.map(s => ({
        action: String(s.action).toLowerCase(),
        ...(s.action !== 'navigate' ? { ref_kind: index.elements.has(s.ref) ? 'element' : 'behavior', ref: s.ref } : {}),
        ...(s.action === 'navigate' ? { url: s.url } : {}),
        ...(s.value !== undefined && s.action !== 'navigate' ? { value: s.value } : {}),
      })),
      step_coverage_keys: stepKeys,
      signature: sig,
    });
  });

  return { accepted, rejected };
}

module.exports = {
  extractJson,
  stepCoverageKeys,
  testSignature,
  validateTests,
  VALID_ACTIONS,
  MAX_STEPS,
};
