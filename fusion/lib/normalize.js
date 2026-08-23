'use strict';

/**
 * fusion/lib/normalize.js — Fusion S1 deterministic normalization.
 *
 * Converts Architecture A (dom/) and Architecture B (vision/) run artifacts
 * into a neutral observation schema, then clusters them into canonical
 * page / element / behavior records with full provenance.
 *
 * NO LLM calls. Deterministic: identical inputs always produce identical
 * catalogs. Neither architecture's internal pipeline is modified.
 */

// ── generic helpers ──────────────────────────────────────────────────────────

function normText(t) {
  return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Comparable page key: origin + path, no trailing slash, no query/hash. */
function pageKey(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname.replace(/\/$/, '')}`;
  } catch (_) {
    return normText(url);
  }
}

function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// ── Architecture A (dom/) → observations ─────────────────────────────────────

function normalizeAStates(states) {
  return states.map(st => ({
    kind: 'state',
    architecture: 'A',
    source: 'dom/states.json',
    page_url: st.url,
    page_key: pageKey(st.url),
    title: st.title || '',
    ref_id: st.state_id,
    parent_ref: st.parent_state_id || null,
    fingerprint: st.fingerprint || null,
    timestamp: st.timestamp || null,
    attrs: { elements_observed: st.elements_observed ?? null },
  }));
}

function normalizeATransitions(transitions, states) {
  const urlOf = {};
  for (const s of states) urlOf[s.state_id] = s.url;
  return transitions.map((t, i) => ({
    kind: 'action',
    architecture: 'A',
    source: 'dom/transitions.json',
    page_url: urlOf[t.from_state] || '',
    page_key: pageKey(urlOf[t.from_state] || ''),
    action_type: (t.action && t.action.type) || 'unknown',
    target: (t.action && t.action.target) || '',
    value: (t.action && t.action.value) || null,
    result: t.result,
    ref_id: `T${String(i + 1).padStart(3, '0')}`,
    parent_ref: t.from_state,
    to_ref: t.to_state,
    timestamp: t.timestamp || null,
    attrs: {},
  }));
}

// ── Architecture B (vision/) → observations ──────────────────────────────────

/** Map YOLO/visual-DOM types onto the neutral element-type vocabulary. */
function mapBType(t) {
  const s = normText(t);
  if (!s) return 'unknown';
  // Compound class names first: ScreenParser says "Text Button"/"Text Input".
  if (s.includes('button')) return 'button';
  if (s.includes('input') || s.includes('field')) return 'input';
  if (s.includes('link')) return 'link';
  if (s.includes('select') || s.includes('dropdown')) return 'select';
  if (s.includes('checkbox') || s.includes('radio')) return 'choice';
  if (s.includes('image') || s.includes('picture')) return 'image';
  if (s.includes('list')) return 'list';
  if (s.includes('text') || s.includes('paragraph')) return 'text';
  return s;
}

function normalizeVisualDom(vdom, sourceFile) {
  const url = vdom.source_url || vdom.url || '';
  const els = Array.isArray(vdom.elements) ? vdom.elements : [];
  return els.map((el, i) => {
    const bbox = el.bbox || el.box || null;
    return {
      kind: 'element',
      architecture: 'B',
      source: sourceFile,
      page_url: url,
      page_key: pageKey(url),
      element_type: mapBType(el.type),
      label: String(el.text || el.label || '').slice(0, 120),
      confidence: typeof el.confidence === 'number' ? el.confidence : null,
      center: bbox
        ? { x: Math.round((bbox[0] + bbox[2]) / 2), y: Math.round((bbox[1] + bbox[3]) / 2) }
        : null,
      ref_id: el.id || `elem-${i}`,
      timestamp: vdom.timestamp || null,
      attrs: {},
    };
  });
}

function normalizeExecutionResults(execJson, sourceFile) {
  const results = Array.isArray(execJson.results) ? execJson.results : [];
  return results.map(r => ({
    kind: 'test_result',
    architecture: 'B',
    source: sourceFile,
    page_url: execJson.source_url || '',
    page_key: pageKey(execJson.source_url || ''),
    test_id: r.test_id || r.id || '',
    status: r.status,
    verification_strength: r.verification_strength || null,
    steps: (r.steps || []).map(s => ({
      action: s.action,
      target_label: (s.resolved_element && (s.resolved_element.text || s.resolved_element.type)) ||
        s.target_text || '',
      verification: s.verification || null,
      resolution_via: s.resolution_via || null,
      re_detected: s.re_detected ?? null,
    })),
    ref_id: r.test_id || r.id || '',
    timestamp: execJson.finished_at || null,
    attrs: {},
  }));
}

// ── Architecture B exploration history → observations ────────────────────────

/**
 * Per-state visual DOMs often lack source_url; the exploration history maps
 * each state_id (== visual-DOM filename prefix) to its URL. Deterministic.
 */
function buildBStateUrlMap(history) {
  const map = {};
  for (const s of ((history && history.states) || [])) {
    if (s.state_id && s.url) map[s.state_id] = s.url;
  }
  // Repeated-state re-detections are saved as visual DOMs but never become
  // history states; they belong to the page they were re-detected ON.
  for (const t of ((history && history.transitions) || [])) {
    if (t.to_state && !map[t.to_state] && map[t.from_state]) {
      map[t.to_state] = map[t.from_state];
    }
  }
  return map;
}

function normalizeBHistoryStates(history, sourceFile) {
  return ((history && history.states) || []).map(st => ({
    kind: 'state',
    architecture: 'B',
    source: sourceFile,
    page_url: st.url,
    page_key: pageKey(st.url),
    title: '',
    ref_id: st.state_id,
    parent_ref: st.parent_state_id || null,
    fingerprint: st.fingerprint || null,
    timestamp: st.timestamp || null,
    attrs: {
      screenshot: st.screenshot || null,
      merged_evidence: st.merged_evidence || null,
      leading_action: st.leading_action || null,
    },
  }));
}

/** B transitions carry label-based targets (`elementType:text`), never selectors. */
function normalizeBHistoryTransitions(history, sourceFile) {
  const states = ((history && history.states) || []);
  const urlOf = {};
  for (const s of states) urlOf[s.state_id] = s.url;
  return ((history && history.transitions) || []).map((t, i) => ({
    kind: 'action',
    architecture: 'B',
    source: sourceFile,
    page_url: urlOf[t.from_state] || '',
    page_key: pageKey(urlOf[t.from_state] || ''),
    action_type: (t.action && t.action.action) || 'unknown',
    // Neutral, conservative identity: label-based, clearly distinct from
    // Architecture A's CSS-selector targets (no aggressive merging).
    target: [(t.action && t.action.elementType) || '', (t.action && t.action.elementText) || '']
      .filter(Boolean).join(':') || '(unnamed)',
    value: (t.action && t.action.value) || null,
    result: t.result,
    ref_id: `BT${String(i + 1).padStart(3, '0')}`,
    parent_ref: t.from_state,
    to_ref: t.to_state,
    timestamp: t.timestamp || null,
    attrs: {
      x: t.action ? t.action.x : null,
      y: t.action ? t.action.y : null,
    },
  }));
}

// ── deterministic clustering into the catalog ────────────────────────────────

function clusterObservations(observations) {
  const pages = new Map();   // page_key -> page record
  const elements = new Map(); // element key -> element record
  const behaviors = new Map(); // behavior key -> behavior record
  const conflicts = [];
  let skippedNoPage = 0;

  const touchPage = (obs) => {
    if (!obs.page_key) { skippedNoPage += 1; return; }
    let p = pages.get(obs.page_key);
    if (!p) {
      p = {
        page_id: `pg_${hashStr(obs.page_key)}`,
        page_key: obs.page_key,
        titles: [],
        seen_by: [],
        observation_count: 0,
        provenance: [],
      };
      pages.set(obs.page_key, p);
    }
    p.observation_count += 1;
    if (obs.title && !p.titles.includes(obs.title)) p.titles.push(obs.title);
    if (!p.seen_by.includes(obs.architecture)) p.seen_by.push(obs.architecture);
    if (!p.provenance.includes(obs.source)) p.provenance.push(obs.source);
    return p;
  };

  const touchElement = (obs) => {
    if (!obs.page_key) { skippedNoPage += 1; return; }
    // Canonical element identity: page + type + normalized label.
    const label = normText(obs.label).slice(0, 80);
    const key = `${obs.page_key}|${obs.element_type}|${label}`;
      let e = elements.get(key);
      if (!e) {
        e = {
          element_id: `el_${hashStr(key)}`,
          page_key: obs.page_key,
          element_type: obs.element_type,
          label: obs.label,
          occurrences: 0,
          max_confidence: null,
          centers: [],
          seen_by: [],
          sources: [],
          a_selectors: [],
        };
        elements.set(key, e);
      }
    e.occurrences += 1;
    if (typeof obs.confidence === 'number' &&
        (e.max_confidence === null || obs.confidence > e.max_confidence)) {
      e.max_confidence = obs.confidence;
    }
    if (obs.center &&
        !e.centers.some(c => Math.abs(c.x - obs.center.x) <= 4 && Math.abs(c.y - obs.center.y) <= 4)) {
      e.centers.push(obs.center); // distinct positions where this element was seen
    }
    if (!e.seen_by.includes(obs.architecture)) e.seen_by.push(obs.architecture);
    if (!e.sources.includes(obs.source)) e.sources.push(obs.source);
    // Preserve A's CSS-selector identity for downstream test-coverage matching.
    if (obs.attrs && typeof obs.attrs.selector === 'string' && obs.attrs.selector &&
        !e.a_selectors.includes(obs.attrs.selector)) {
      e.a_selectors.push(obs.attrs.selector);
    }

    // Conflict: identical NON-EMPTY label on one page mapped to DIFFERENT
    // types by different observations (deterministic disagreement signal).
    if (label) {
      for (const [otherKey, other] of elements) {
        if (otherKey === key) continue;
        if (other.page_key === e.page_key && other.label === e.label &&
            other.element_type !== e.element_type &&
            !conflicts.some(c =>
              c.subject === 'element_type' &&
              c.page_key === e.page_key && c.label === e.label)) {
          conflicts.push({
            subject: 'element_type',
            page_key: e.page_key,
            label: e.label,
            values: [other.element_type, e.element_type],
            note: 'same page+label clustered under different element types',
          });
        }
      }
    }
    void obs;
  };

  const touchBehavior = (obs) => {
    if (obs.kind !== 'action') return;
    const key = `${obs.page_key}|${obs.action_type}|${normText(obs.target)}`;
    let b = behaviors.get(key);
    if (!b) {
      b = {
        behavior_id: `bh_${hashStr(key)}`,
        page_key: obs.page_key,
        action_type: obs.action_type,
        target: obs.target,
        attempts: 0,
        successes: 0,
        results: {},
        to_refs: [],
        seen_by: [],
        sources: [],
        provenance: [],
      };
      behaviors.set(key, b);
    }
    b.attempts += 1;
    b.results[obs.result] = (b.results[obs.result] || 0) + 1;
    if (obs.result === 'success' || obs.result === 'executed') b.successes += 1;
    if (obs.to_ref && !b.to_refs.includes(obs.to_ref)) b.to_refs.push(obs.to_ref);
    if (!b.seen_by.includes(obs.architecture)) b.seen_by.push(obs.architecture);
    if (!b.sources.includes(obs.source)) b.sources.push(obs.source);
    if (!b.provenance.includes(obs.source)) b.provenance.push(obs.source);
  };

  for (const o of observations) {
    touchPage(o);
    if (o.kind === 'element') touchElement(o);
    if (o.kind === 'action') touchBehavior(o);
  }

  return {
    pages: [...pages.values()],
    elements: [...elements.values()],
    behaviors: [...behaviors.values()],
    conflicts,
    skipped_no_page: skippedNoPage,
  };
}

function assignObsIds(observations) {
  return observations.map((o, i) => ({
    ...o,
    obs_id: `obs_${hashStr(`${o.architecture}:${o.kind}:${o.source}:${o.ref_id}:${i}`)}`,
  }));
}

module.exports = {
  normText,
  pageKey,
  hashStr,
  mapBType,
  normalizeAStates,
  normalizeATransitions,
  normalizeVisualDom,
  normalizeExecutionResults,
  buildBStateUrlMap,
  normalizeBHistoryStates,
  normalizeBHistoryTransitions,
  clusterObservations,
  assignObsIds,
};
