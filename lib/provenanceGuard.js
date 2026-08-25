'use strict';

/**
 * provenanceGuard.js — per-artifact provenance guard for runBoth's collector.
 *
 * Audit ADDENDUM mandate (docs/AUDIT_REPORT.md): "every vision/outputs/* file
 * carries the SAME session id / start-url as the run's manifest URL".
 * The original guard (defect candidate #24) covered ONLY *_exploration_result
 * files; the mtime-window collector still swept foreign `test_cases_*` and
 * `execution_results.json` artifacts into run folders (site 31 magento +
 * site 32 eviltester contamination-skips, 2026-08-26). This module generalizes
 * the check to ANY artifact class that embeds a source URL.
 *
 * A file belongs to the run iff every URL it references is either:
 *   - the manifest URL's host (www-stripped compare), or
 *   - a verified alias host (rebrands/redirects, see KNOWN_ALIASES).
 * Localhost fixture hosts are ALWAYS foreign to a remote-site run.
 * Artifacts that reference no URL at all are legacy-safe and pass through.
 */

// KNOWN_ALIASES: hosts that legitimately belong to a target site (verified).
// Format: { canonicalHost: [aliasHosts...] }. Cite verification in comments.
const KNOWN_ALIASES = {
  'www.lambdatest.com': ['testmuai.com', 'www.testmuai.com'], // LambdaTest rebranded to TestMu AI 2026-01-12 (301 verified live)
};

function normalizeHost(host) {
  return String(host || '').toLowerCase().replace(/^www\./, '');
}

function hostMatchesTarget(hostA, hostB) {
  if (!hostA || !hostB) return false;
  const a = normalizeHost(hostA);
  const b = normalizeHost(hostB);
  if (a === b) return true;
  for (const [canon, aliases] of Object.entries(KNOWN_ALIASES)) {
    const set = new Set([canon, ...aliases].map(normalizeHost));
    if (set.has(a) && set.has(b)) return true;
  }
  return false;
}

/**
 * Collect every URL an artifact references. Covers the observed schema of
 * each guarded file class:
 *   - *_exploration_result.json : { start_url | source_url }
 *   - execution_results.json    : { source_url } (+ per-result url fields)
 *   - test_cases_*.json         : array (or {cases:[...]}) whose elements may
 *                                 carry start_url / page / url fields.
 */
function collectArtifactUrls(obj) {
  const urls = [];
  const push = (u) => { if (typeof u === 'string' && u) urls.push(u); };
  if (!obj || typeof obj !== 'object') return urls;

  const scanObject = (o) => {
    for (const k of ['start_url', 'source_url', 'page', 'url']) {
      const v = o[k];
      if (typeof v === 'string') push(v);
      else if (v && typeof v === 'object' && typeof v.url === 'string') push(v.url);
    }
  };

  if (Array.isArray(obj)) {
    for (const el of obj) {
      if (el && typeof el === 'object') scanObject(el);
    }
  } else if (Array.isArray(obj.cases)) {
    for (const el of obj.cases) {
      if (el && typeof el === 'object') scanObject(el);
    }
    scanObject(obj);
  } else {
    // Top-level first so a top-level verdict is possible even when nested
    // results reference legitimately visited sub-pages... they do not today:
    // ALL referenced hosts must match the manifest, so order is irrelevant.
    scanObject(obj);
    for (const key of ['results', 'pages']) {
      if (Array.isArray(obj[key])) {
        for (const el of obj[key]) {
          if (el && typeof el === 'object') scanObject(el);
        }
      }
    }
  }
  return urls;
}

function isLocalhostUrl(url) {
  try {
    return /^(127\.0\.0\.1|localhost|\[::1\])$/.test(new URL(url).hostname);
  } catch (_) {
    return false;
  }
}

/**
 * Decide whether one parsed vision-output artifact belongs to the run whose
 * manifest URL is `manifestUrl`.
 *
 * @param {*} artifact parsed JSON content (any shape)
 * @param {string} manifestUrl
 * @returns {{ok: boolean, via: string}} via explains the decision for logs
 *   and CONTAMINATION_REJECTS.json.
 */
function artifactBelongsToRun(artifact, manifestUrl) {
  const urls = collectArtifactUrls(artifact);
  if (!urls.length) return { ok: true, via: 'no_url_fields' }; // legacy files pass through
  let manifestHost = null;
  try {
    manifestHost = new URL(manifestUrl).host;
  } catch (_) {
    return { ok: true, via: 'unparseable_manifest' };
  }
  for (const src of urls) {
    let srcHost = null;
    try {
      srcHost = new URL(src).host;
    } catch (_) {
      continue; // unparseable reference cannot identify a foreign site
    }
    if (hostMatchesTarget(srcHost, manifestHost)) continue;
    // localhost fixtures are NEVER part of a remote-site run (hostname so
    // fixture ports like 127.0.0.1:58621 are classified correctly)
    let hName = null;
    try { hName = new URL(src).hostname; } catch (_) {}
    if (/^(127\.0\.0\.1|localhost|\[::1\]|::1)$/.test(hName || '')) {
      return { ok: false, via: `localhost_fixture (${src})` };
    }
    return { ok: false, via: `foreign_host (${srcHost})` };
  }
  return { ok: true, via: 'host_match' };
}

module.exports = { artifactBelongsToRun, collectArtifactUrls, hostMatchesTarget, KNOWN_ALIASES };
