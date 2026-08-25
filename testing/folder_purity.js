'use strict';

/**
 * folder_purity.js — provenance guard for a single run directory.
 *
 * Detects the Jan-2026 concurrency contamination pattern where runBoth's
 * mtime-window collector stitched artifacts from DIFFERENT websites into the
 * same runs/<run_id>/ folder (see docs/AUDIT_REPORT.md ADDENDUM and
 * testing/QUARANTINE_TIER2.md).
 *
 * Checks performed on runs/<run_id>/:
 *   1. dom/exploration_summary.json  — every visited_urls host must match the
 *      run_manifest.json URL host (redirect aliases allowed via ALIASES).
 *   2. vision/outputs/*_exploration_result.json — start_url (or source_url)
 *      host must match, OR be a localhost fixture and get FLAGGED.
 *   3. fusion/catalog.json — every page_key host must match the manifest host
 *      OR appear in visited_urls of this run (actually visited external
 *      navigation, e.g. footer links). Anything else = CONTAMINATION.
 *
 * Usage:
 *   node testing/folder_purity.js <run_id>
 *
 * Output: JSON verdict { pure, checks, contamination, flags } to stdout.
 * When impure, writes CONTAMINATION_MARKER inside the run directory.
 * Exit code: 0 if pure, 1 if not, 2 on usage/IO error.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Host aliases treated as the SAME property after verified rebrands/redirects.
// 'www.lambdatest.com' -> testmuai.com: LambdaTest rebranded to TestMu AI on
// Jan-12-2026; https://www.lambdatest.com/selenium-playground/ issues a live
// 301 to https://www.testmuai.com/selenium-playground/ (verified 2026-08-25,
// see testing/QUARANTINE_TIER2.md addendum "Row 13 CLEARED").
const ALIASES = {
  'www.lambdatest.com': ['testmuai.com', 'www.testmuai.com'],
};

function normalizeHost(host) {
  return String(host || '').toLowerCase().replace(/^www\./, '');
}

function hostMatches(manifestHost, candidateHost) {
  const m = normalizeHost(manifestHost);
  const c = normalizeHost(candidateHost);
  if (!m || !c) return false;
  if (m === c) return true;
  return (ALIASES[manifestHost] || []).some((a) => normalizeHost(a) === c);
}

function extractHost(rawUrl) {
  try {
    return new URL(rawUrl).host;
  } catch (_) {
    return null;
  }
}

function isLocalhostHost(host) {
  if (!host) return false;
  let h = String(host).toLowerCase().replace(/^\[|\]$/g, '');
  // strip :port for IPv4/hostname forms without breaking IPv6 like ::1
  const colon = h.lastIndexOf(':');
  if (colon > -1 && !h.includes('::') && /^\d+$/.test(h.slice(colon + 1))) h = h.slice(0, colon);
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '::1' || h.startsWith('::1')) return true;
  return /^127\.\d+\.\d+\.\d+$/.test(h);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function listExplorationResults(runDir) {
  const dir = path.join(runDir, 'vision', 'outputs');
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('_exploration_result.json')).sort();
  } catch (_) {
    return [];
  }
}

function collectVisitedUrls(domSummary, visionResults) {
  const urls = new Set();
  for (const u of (domSummary && domSummary.visited_urls) || []) urls.add(u);
  for (const r of visionResults) {
    for (const u of r.visited_urls || []) urls.add(u);
  }
  return [...urls];
}

/**
 * Assert provenance purity of one run directory.
 * @param {string} runId
 * @param {{root?: string}} [opts]
 * @returns {{pure: boolean, run_id: string, checks: Array, contamination: Array, flags: Array}}
 */
function assertPurity(runId, opts = {}) {
  const root = opts.root || ROOT;
  const runDir = path.join(root, 'runs', runId);
  const checks = [];
  const contamination = [];
  const flags = [];

  const manifest = readJson(path.join(runDir, 'run_manifest.json'));
  if (!manifest || !manifest.url) {
    checks.push({ file: 'run_manifest.json', check: 'manifest_readable', ok: false, detail: 'missing or has no url field' });
    return { pure: false, run_id: runId, checks, contamination, flags };
  }
  const manifestHost = extractHost(manifest.url);
  checks.push({
    file: 'run_manifest.json',
    check: 'manifest_host_parsed',
    ok: Boolean(manifestHost),
    detail: manifestHost ? `manifest url=${manifest.url} host=${manifestHost}` : `cannot parse host from ${manifest.url}`,
  });

  // --- Check 1: DOM exploration stayed on the target site -------------------
  const domSummary = readJson(path.join(runDir, 'dom', 'exploration_summary.json'));
  const domForeign = [];
  for (const u of (domSummary && domSummary.visited_urls) || []) {
    const h = extractHost(u);
    if (!h || (!hostMatches(manifestHost, h) && !isLocalhostHost(h))) domForeign.push(u);
  }
  checks.push({
    file: 'dom/exploration_summary.json',
    check: 'visited_urls_hosts_match_manifest',
    ok: domForeign.length === 0,
    detail: domForeign.length ? `foreign hosts in visited_urls: ${domForeign.join(', ')}` : `${((domSummary && domSummary.visited_urls) || []).length} urls OK`,
  });
  if (domForeign.length) {
    contamination.push({ file: 'dom/exploration_summary.json', check: 'visited_urls_hosts_match_manifest', urls: domForeign });
  }

  // --- Check 2: each vision B-exploration session started on target site ----
  const visionFiles = listExplorationResults(runDir);
  const visionResults = [];
  let visionMismatch = false;
  for (const f of visionFiles) {
    const res = readJson(path.join(runDir, 'vision', 'outputs', f));
    if (!res) {
      checks.push({ file: `vision/outputs/${f}`, check: 'start_url_matches_manifest', ok: false, detail: 'unreadable JSON' });
      visionMismatch = true;
      continue;
    }
    visionResults.push(res);
    const startUrl = res.start_url || res.source_url || null;
    const h = extractHost(startUrl);
    if (isLocalhostHost(h)) {
      flags.push({ file: `vision/outputs/${f}`, url: startUrl, reason: 'localhost fixture replay — not live-site evidence' });
    } else if (!hostMatches(manifestHost, h)) {
      visionMismatch = true;
      contamination.push({ file: `vision/outputs/${f}`, check: 'start_url_matches_manifest', urls: [startUrl] });
    }
    checks.push({
      file: `vision/outputs/${f}`,
      check: 'start_url_matches_manifest',
      ok: hostMatches(manifestHost, h) || isLocalhostHost(h),
      flagged: isLocalhostHost(h),
      detail: startUrl ? `start_url host=${h}${isLocalhostHost(h) ? ' (localhost fixture flagged)' : ''}` : 'no start_url/source_url field',
    });
  }

  // --- Check 3: catalog pages belong to target OR were actually visited ----
  const catalog = readJson(path.join(runDir, 'fusion', 'catalog.json'));
  if (!catalog || !Array.isArray(catalog.pages)) {
    checks.push({ file: 'fusion/catalog.json', check: 'page_keys_belong_or_visited', ok: false, detail: 'missing or malformed catalog (no pages array)' });
    contamination.push({ file: 'fusion/catalog.json', check: 'page_keys_belong_or_visited', urls: [] });
  } else {
    const visited = new Set(collectVisitedUrls(domSummary, visionResults).map((u) => {
      try { const h = extractHost(u); return h ? normalizeHost(h) : null; } catch (_) { return null; }
    }).filter(Boolean));
    const stray = [];
    for (const page of catalog.pages) {
      const h = extractHost(page.page_key);
      if (!h) { stray.push(page.page_key); continue; }
      const known = hostMatches(manifestHost, h)
        || isLocalhostHost(h)
        || visited.has(normalizeHost(h));
      if (!known) stray.push(page.page_key);
    }
    checks.push({
      file: 'fusion/catalog.json',
      check: 'page_keys_belong_or_visited',
      ok: stray.length === 0,
      detail: stray.length ? `catalog hosts neither target nor visited: ${stray.join(', ')}` : `${catalog.pages.length} page_keys OK`,
    });
    if (stray.length) {
      contamination.push({ file: 'fusion/catalog.json', check: 'page_keys_belong_or_visited', urls: stray });
    }
  }

  const pure = checks.every((c) => c.ok) && contamination.length === 0 && !visionMismatch;
  return { pure, run_id: runId, checks, contamination, flags };
}

function writeContaminationMarker(root, verdict) {
  const markerPath = path.join(root, 'runs', verdict.run_id, 'CONTAMINATION_MARKER');
  fs.writeFileSync(markerPath, JSON.stringify(verdict, null, 2) + '\n');
  return markerPath;
}

function main() {
  const runId = process.argv[2];
  if (!runId || runId.startsWith('-')) {
    console.error('Usage: node testing/folder_purity.js <run_id>');
    process.exit(2);
  }
  // FOLDER_PURITY_ROOT lets tests point the CLI at fixture trees.
  const root = process.env.FOLDER_PURITY_ROOT || ROOT;
  const verdict = assertPurity(runId, { root });
  console.log(JSON.stringify(verdict, null, 2));
  if (!verdict.pure) {
    writeContaminationMarker(root, verdict);
    process.exit(1);
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { assertPurity, ALIASES, hostMatches, extractHost, isLocalhostHost };
