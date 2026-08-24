'use strict';

/**
 * fuzzyMatch.js — shared fuzzy text matching for target re-resolution.
 *
 * Used by Architecture B's replay executor (and any other consumer) to
 * tolerate OCR noise / case / ordering variance between a recorded step
 * target and the text observed on the CURRENT state.
 *
 * Matching tiers inside fuzzyTextMatch():
 *   1. normalized containment (either direction)
 *   2. Levenshtein edit distance <= 2 on the shorter-vs-window basis
 *   3. token overlap >= 0.6 (order-independent, handles glued OCR words)
 */

function normalizeText(t) {
  return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Classic Wagner-Fischer edit distance (fine for short UI labels). */
function levenshtein(a, b) {
  a = normalizeText(a);
  b = normalizeText(b);
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Jaccard overlap of token sets; 0 when either side is empty. */
function tokenOverlap(a, b) {
  const ta = new Set(normalizeText(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

/**
 * Decide whether recorded text `want` and observed text `have` refer to the
 * same UI label. Returns { match, via, editDistance, overlap }.
 * Empty `want` never matches.
 */
function fuzzyTextMatch(have, want, opts = {}) {
  const maxEdit = opts.maxEdit != null ? opts.maxEdit : 2;
  const minOverlap = opts.minOverlap != null ? opts.minOverlap : 0.6;

  const w = normalizeText(want);
  const h = normalizeText(have);
  const dist = levenshtein(h, w);
  const overlap = tokenOverlap(h, w);

  if (!w) return { match: false, via: 'empty_wanted_text', editDistance: dist, overlap };
  if (h === w || h.includes(w) || w.includes(h)) {
    return { match: true, via: 'containment', editDistance: dist, overlap };
  }
  // Sliding-window edit distance: tolerate OCR junk prepended/appended
  // around the wanted label rather than only whole-string comparison.
  if (w.length >= 4 && h.length >= w.length - maxEdit) {
    const minWin = Math.max(1, w.length - maxEdit);
    const maxWin = w.length + maxEdit;
    for (let start = 0; start < h.length; start++) {
      for (let win = minWin; win <= maxWin && start + win <= h.length; win++) {
        if (levenshtein(h.slice(start, start + win), w) <= maxEdit) {
          return { match: true, via: 'windowed_edit', editDistance: dist, overlap };
        }
      }
    }
  }
  if (dist <= maxEdit && Math.min(h.length, w.length) >= 4) {
    return { match: true, via: 'edit_distance', editDistance: dist, overlap };
  }
  if (overlap >= minOverlap) {
    return { match: true, via: 'token_overlap', editDistance: dist, overlap };
  }
  return { match: false, via: 'no_tier_matched', editDistance: dist, overlap };
}

module.exports = { normalizeText, levenshtein, tokenOverlap, fuzzyTextMatch };
