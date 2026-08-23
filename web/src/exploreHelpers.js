'use strict';

/**
 * exploreHelpers.js — pure, dependency-free helpers for the Architecture A
 * exploration engine. Extracted so they can be unit-tested offline
 * (web/test/) without launching a browser or calling any LLM.
 */

/** Deterministic string hash (djb2, base36) used in state fingerprints. */
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function normText(t) {
  return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Reconstruct recorded workflows from the transition edge list: consecutive
 * successful transitions chained by state continuity. Used by BOTH the
 * test-case prompt builder and the deterministic test-case fallback — these
 * are REAL observed sequences, never invented.
 */
function reconstructWorkflows(transitions, maxLen = 8) {
  const workflows = [];
  if (!Array.isArray(transitions)) return workflows;
  let chain = [];
  for (const t of transitions) {
    if (!t || t.result !== 'success') continue;
    const last = chain[chain.length - 1];
    const connected = last && t.from_state === last.to_state;
    if (!connected && chain.length) {
      if (chain.length >= 2) workflows.push(chain.slice(0, maxLen));
      chain = [];
    }
    chain.push(t);
  }
  if (chain.length >= 2) workflows.push(chain.slice(0, maxLen));
  return workflows;
}

/**
 * Build the ranked candidate table for one state. Pure: same inputs always
 * produce the same candidates. Buttons first, then inputs/selects/textareas,
 * then links; untried elements before already-tried ones.
 */
function buildCandidates(elements, triedKeys, fingerprint) {
  const tagRank = { BUTTON: 0, INPUT: 1, SELECT: 2, TEXTAREA: 3, A: 4 };
  return elements
    .filter(el => el.disabled !== true)
    .map(el => ({
      elementId: el.elementId,
      tag: el.tag,
      text: (el.text || '').slice(0, 40),
      selector: el.selector,
      href: el.href || '',
      placeholder: el.placeholder || '',
      name: el.name || null,
      isDropdown: !!el.isDropdown,
      alreadyTried: triedKeys.has(`${fingerprint}|${el.selector}`),
      _rank: tagRank[el.tag] ?? 5,
    }))
    .filter(c => !(c.text === '' && c.selector.startsWith('a:'))) // anonymous anchors out
    .sort((a, b) =>
      a.alreadyTried - b.alreadyTried || a._rank - b._rank)
    .slice(0, 20);
}

/**
 * Deterministic flow discovery: derive exploration flows from same-origin,
 * top-level section anchors on the homepage. Generic — no site-specific
 * hardcoding. Saves one LLM call per run whenever the page structure makes
 * the sections obvious; the LLM path remains the fallback for ambiguous or
 * sparse pages.
 *
 * @param {Array} elements   preprocessed homepage elements
 * @param {String} homeUrl   homepage URL (origin base)
 * @param {Number} maxFlows  cap on returned flows
 * @returns {Array} [{name, url}]
 */
function deriveFlowsFromDOM(elements, homeUrl, maxFlows = 5) {
  if (!Array.isArray(elements) || !elements.length) return [];
  let origin;
  try { origin = new URL(homeUrl).origin; } catch (_) { return []; }

  const seenPaths = new Set();
  const flows = [];
  for (const el of elements) {
    if ((el.tag || '').toUpperCase() !== 'A' || !el.href) continue;
    let u;
    try { u = new URL(el.href, homeUrl); } catch (_) { continue; }
    if (u.origin !== origin) continue;                       // external links out
    const segs = u.pathname.split('/').filter(Boolean);
    if (segs.length !== 1) continue;                          // top-level paths only
    if (u.search || u.hash) continue;                         // parametrised links out
    const path = '/' + segs[0];
    if (seenPaths.has(path)) continue;
    const text = normText(el.text || el.ariaLabel || '');
    if (!text || text.length > 40) continue;
    if (['home', 'homepage', 'logo', 'profile', 'login', 'signup', 'register', 'banner'].includes(text)) continue;
    seenPaths.add(path);
    flows.push({ name: (el.text || el.ariaLabel).trim(), url: origin + path });
    if (flows.length >= maxFlows) break;
  }
  // Require at least 2 flows before trusting the heuristic.
  return flows.length >= 2 ? flows : [];
}

module.exports = {
  hashStr,
  normText,
  reconstructWorkflows,
  buildCandidates,
  deriveFlowsFromDOM,
};
