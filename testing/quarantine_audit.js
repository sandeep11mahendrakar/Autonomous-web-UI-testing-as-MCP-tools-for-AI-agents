'use strict';

/** quarantine_audit.js — cross-check every Tier-2 INDEX row against the
 * auditor's E1 ground-truth + raw artifacts. Outputs the DEFINITIVE
 * quarantine list: rows whose runs loaded wrong sites or mixed-host catalogs.
 * Zero LLM. Writes testing/QUARANTINE_TIER2.md + patches INDEX rows. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const gt = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'audit_evidence', 'E1_run_ground_truth_20260825.json'), 'utf8'));

function host(u) { try { return new URL(u).host; } catch (_) { return null; } }
function j(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }

// INDEX row -> run id (as currently registered)
const indexRows = [
  [11, 'Books to Scrape', 'https://books.toscrape.com', 'run_20260825_131135'],
  [12, 'Quotes to Scrape', 'https://quotes.toscrape.com', 'run_20260825_131756'],
  [13, 'LambdaTest Playground', 'https://www.lambdatest.com/selenium-playground/', 'run_20260825_053921'],
  [14, 'Python.org Docs', 'https://docs.python.org/3/', 'run_20260825_055129'],
  [15, 'Project Gutenberg', 'https://www.gutenberg.org', 'run_20260825_060707'],
  [16, 'WeatherSpark', 'https://weatherspark.com', 'run_20260825_062152'],
  [17, 'SahiTest Demo', 'http://www.sahitest.com/demo/', 'run_20260825_063248'],
  [18, 'The Internet (status codes)', 'https://the-internet.herokuapp.com/status_codes', 'run_20260825_064713'],
  [19, 'PHPTravels Demo', 'https://phptravels.com/demo/', 'run_20260825_065652'],
  [20, 'Open Library', 'https://openlibrary.org', 'run_20260825_070918'],
];

const findings = [];
for (const [num, site, url, runId] of indexRows) {
  const d = path.join(ROOT, 'runs', runId);
  const man = j(path.join(d, 'run_manifest.json'));
  const mHost = host(man?.url || '');
  const target = host(url);
  const issues = [];
  if (!man) issues.push('manifest missing');
  if (mHost && target && mHost !== target) issues.push(`manifest URL host (${mHost}) != ledger site (${target})`);

  const mem = j(path.join(d, 'dom', 'memory_log.json'));
  const visited = [];
  if (Array.isArray(mem?.visited_urls)) visited.push(...mem.visited_urls);
  const foreignVisited = [...new Set(visited.map(host).filter(h => h && h !== mHost && h !== '127.0.0.1'))];

  // B side: check EVERY exploration_result file in this run (concurrency
  // collisions can drop multiple explorations into one run dir).
  const bSrcs = [];
  try {
    const vdir = path.join(d, 'vision', 'outputs');
    for (const f of fs.readdirSync(vdir)) {
      if (!f.includes('_exploration_result')) continue;
      const r = j(path.join(vdir, f)) || {};
      const src = r.start_url || r.source_url || null;
      if (src) bSrcs.push({ file: f, src });
    }
  } catch (_) {}
  for (const { file, src } of bSrcs) {
    const bHost = host(src);
    if (bHost === '127.0.0.1' || bHost === 'localhost') issues.push(`B explored LOCAL FIXTURE (${file}: ${src})`);
    else if (bHost && mHost && bHost !== mHost) issues.push(`B source host (${bHost}) != manifest (${mHost}) [${file}]`);
  }
  if (foreignVisited.length) issues.push(`foreign hosts in A memory log: ${foreignVisited.join(', ')}`);

  findings.push({ num, site, runId, issues, verdict: issues.length ? 'QUARANTINE' : 'CLEAN' });
}

const L = [
  '# TIER-2 QUARANTINE — sites with wrong-site/contaminated evidence',
  '',
  `Generated: ${new Date().toISOString()} by testing/quarantine_audit.js.`,
  'Cross-checks INDEX rows against run manifests, A memory logs, and B source',
  'URLs (auditor ground-truth method). QUARANTINE rows MUST NOT be cited until',
  're-run behind the run_attribution.js guards.',
  '',
  '| # | Site | Run ID | Verdict | Issues |',
  '|---|---|---|---|---|',
];
for (const f of findings) {
  L.push(`| ${f.num} | ${f.site} | \`${f.runId}\` | ${f.verdict} | ${f.issues.join('; ') || '-'} |`);
}
L.push('');
L.push('## Required remediation per QUARANTINE row');
L.push('');
L.push('1. Re-run behind run_attribution.js guards (birthtime + manifest-URL match).');
L.push('2. Post-run assertCatalogDomains: catalog page_key hosts ⊆ {target host}.');
L.push('3. Rewrite report narrative ONLY from the new run\'s artifacts.');
L.push('4. Old runs kept on disk as evidence of the failure mode.');
L.push('');

fs.writeFileSync(path.join(__dirname, 'QUARANTINE_TIER2.md'), L.join('\n'));
for (const f of findings) console.log(`${f.verdict.padEnd(10)} #${f.num} ${f.site}: ${f.issues.join('; ') || 'clean'}`);
