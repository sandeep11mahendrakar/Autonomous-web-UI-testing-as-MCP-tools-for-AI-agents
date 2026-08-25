'use strict';

/**
 * run_attribution.js — verified run-directory attribution + contamination guard.
 *
 * ROOT CAUSE (P1b, fixed 2026-08-25): night_chain.js / rerun_starved.js /
 * run_repeatability.js attributed pipeline results to "the newest runs/run_*
 * directory" after launching. When two chains interleaved overnight, openlibrary
 * was credited with a demoblaze repeatability run (and vice versa), silently
 * contaminating catalogs and reports.
 *
 * Rule now: a run dir may only be claimed if
 *   (a) it was created after the launch timestamp, AND
 *   (b) its run_manifest.json url MATCHES the launched URL.
 * If no dir qualifies -> CONTAMINATION error, fail loudly.
 */

const fs = require('fs');
const path = require('path');

const RUNS_ROOT = path.join(__dirname, '..', 'runs');

function normalizeUrl(u) {
  if (!u) return '';
  return String(u).trim().replace(/\/+$/, '').toLowerCase();
}

function readManifest(runId) {
  try {
    return JSON.parse(fs.readFileSync(path.join(RUNS_ROOT, runId, 'run_manifest.json'), 'utf8'));
  } catch (_) {
    return null;
  }
}

/**
 * Find the run dir produced by launching `url` no earlier than `sinceMs`.
 * Prefers the newest matching dir created after sinceMs; falls back to the
 * newest matching dir overall ONLY when allowRecentFallback is false... (it is
 * NOT: fallback is disallowed by default to keep attribution strict).
 */
function findRunDir({ url, sinceMs }) {
  const want = normalizeUrl(url);
  let dirs;
  try {
    dirs = fs.readdirSync(RUNS_ROOT).filter((d) => d.startsWith('run_')).sort();
  } catch (_) {
    return null;
  }
  const candidates = dirs.filter((d) => {
    const m = readManifest(d);
    if (!m || !m.url) return false;
    if (normalizeUrl(m.url) !== want) return false;
    try {
      return fs.statSync(path.join(RUNS_ROOT, d)).birthtimeMs >= sinceMs - 5000;
    } catch (_) {
      return false;
    }
  });
  return candidates[candidates.length - 1] || null;
}

/**
 * Post-run contamination guard for fusion/catalog.json:
 * every page_key host must be either (a) the target site's host or
 * (b) a host the run's own dom/memory_log.json shows it actually visited
 * (legitimate redirects, e.g. phptravels -> demoblaze mirror).
 * Anything else means artifacts leaked across runs.
 *
 * @returns {{ok: boolean, foreignHosts: string[], allowedHosts: string[]}}
 */
function assertCatalogDomains(runId, url) {
  const out = { ok: true, foreignHosts: [], allowedHosts: [] };
  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(path.join(RUNS_ROOT, runId, 'fusion', 'catalog.json'), 'utf8'));
  } catch (_) {
    return out; // no catalog yet -> nothing to guard here (s1 not run)
  }

  const targetHost = (() => { try { return new URL(url).host.toLowerCase(); } catch (_) { return ''; } })();
  const allowed = new Set([targetHost]);

  // Hosts the run itself navigated through are legitimate.
  try {
    const memlog = JSON.parse(fs.readFileSync(path.join(RUNS_ROOT, runId, 'dom', 'memory_log.json'), 'utf8'));
    for (const step of memlog) {
      for (const k of ['from_url', 'to_url', 'url_after']) {
        if (step && step[k]) {
          try { allowed.add(new URL(step[k]).host.toLowerCase()); } catch (_) {}
        }
      }
    }
  } catch (_) {}

  out.allowedHosts = [...allowed];
  const entries = Array.isArray(catalog)
    ? catalog
    : (Array.isArray(catalog.pages) ? catalog.pages : Object.values(catalog).flat().filter((x) => x && x.page_key));
  for (const e of entries || []) {
    const pk = e && e.page_key;
    if (!pk) continue;
    let host = '';
    try { host = new URL(pk).host.toLowerCase(); } catch (_) { continue; }
    if (!allowed.has(host) && !out.foreignHosts.includes(host)) out.foreignHosts.push(host);
  }
  out.ok = out.foreignHosts.length === 0;
  return out;
}

module.exports = { findRunDir, assertCatalogDomains, normalizeUrl, readManifest, assertVisionStartUrls };

/**
 * Post-run guard per AUDIT ADDENDUM (2026-08-25): every B-side exploration
 * result under runs/<id>/vision/outputs/ must have started at the manifest
 * URL's host. Local-fixture hosts (127.0.0.1 / localhost) or any foreign
 * host means wrong-site evidence -> the run dir must be rejected.
 *
 * @returns {{ok: boolean, checked: number, violations: Array<{file: string, host: string, url: string}>}}
 */
function assertVisionStartUrls(runId, url) {
  const out = { ok: true, checked: 0, violations: [] };
  const manifest = readManifest(runId);
  const mHost = (() => { try { return new URL(manifest.url).host.toLowerCase(); } catch (_) { return ''; } })();
  if (!mHost) { out.ok = false; out.violations.push({ file: 'run_manifest.json', host: '', url: 'manifest missing or unparseable' }); return out; }
  const vdir = path.join(RUNS_ROOT, runId, 'vision', 'outputs');
  let files = [];
  try {
    files = fs.readdirSync(vdir).filter((f) => f.includes('_exploration_result'));
  } catch (_) {}
  for (const f of files) {
    let r = null;
    try { r = JSON.parse(fs.readFileSync(path.join(vdir, f), 'utf8')); } catch (_) { continue; }
    const src = r.start_url || r.source_url || null;
    if (!src) continue;
    out.checked += 1;
    const h = (() => { try { return new URL(src).host.toLowerCase(); } catch (_) { return ''; } })();
    if (!h || h !== mHost) {
      out.violations.push({ file: f, host: h || '(unparseable)', url: String(src).slice(0, 120) });
    }
  }
  out.ok = out.violations.length === 0;
  return out;
}
