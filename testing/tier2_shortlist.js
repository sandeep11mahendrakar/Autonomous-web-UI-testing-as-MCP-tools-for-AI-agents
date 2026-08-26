'use strict';

/**
 * tier2_shortlist.js — availability-check the Tier-2 candidates and write
 * testing/TIER2_SITES.md with the final ordered list of 10 sites across
 * >=4 industries. Zero LLM calls.
 *
 * Criteria (from CAMPAIGN_PLAN.md): publicly reachable, no login required,
 * low legal sensitivity, read-only exploration only.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// industry -> candidates (first reachable per row wins its slot)
const CANDIDATES = [
  { key: 'books_toscrape', url: 'https://books.toscrape.com', industry: 'e-commerce sandbox', purpose: 'catalog/pagination/cart-ish flows' },
  { key: 'quotes_toscrape', url: 'https://quotes.toscrape.com', industry: 'content/media', purpose: 'text-heavy listing + login form (documented creds admin)' },
  { key: 'ultimateqa', url: 'https://ultimateqa.com/demo/', industry: 'testing utility', purpose: 'practice form gallery' },
  { key: 'lambdatest_playground', url: 'https://www.lambdatest.com/selenium-playground/', industry: 'dev tools', purpose: 'edge-case element zoo' },
  { key: 'docs_python', url: 'https://docs.python.org/3/', industry: 'documentation', purpose: 'deep nav trees, search box' },
  { key: 'gutenberg', url: 'https://www.gutenberg.org', industry: 'library/media', purpose: 'search + browse shelves' },
  { key: 'timeanddate', url: 'https://www.timeanddate.com', industry: 'utility/reference', purpose: 'calculators, tabs, dense UI' },
  { key: 'weathersparks', url: 'https://weatherspark.com', industry: 'weather/utility', purpose: 'charts, dropdowns' },
  { key: 'webapp_fun', url: 'https://webbrowsertools.com/test-new-window/', industry: 'toy/tools', purpose: 'window/popup behaviors' },
  { key: 'sahitest', url: 'http://www.sahitest.com/demo/', industry: 'testing utility', purpose: 'classic element demos' },
  { key: 'theinternet_spare_pages', url: 'https://the-internet.herokuapp.com/status_codes', industry: 'edge-case zoo', purpose: 'status-code pages (spare)' },
  { key: 'phptravels', url: 'https://phptravels.com/demo/', industry: 'travel booking', purpose: 'wizard-ish booking demo (spare)' },
  { key: 'openlibrary', url: 'https://openlibrary.org', industry: 'library/media', purpose: 'search/facets (spare)' },
  { key: 'wttrin', url: 'https://wttr.in', industry: 'weather/utility', purpose: 'plain-text service (spare)' },
];

function probe(urlStr) {
  return new Promise((resolve) => {
    const mod = urlStr.startsWith('https') ? https : http;
    const req = mod.request(urlStr, { method: 'GET', timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0 (capstone-campaign availability check)' } }, (res) => {
      // consume enough to free the socket
      res.resume();
      resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode });
    });
    req.on('error', (e) => resolve({ ok: false, status: String(e.message).slice(0, 60) }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 'timeout' }); });
    req.end();
  });
}

(async () => {
  const picked = [];
  const industries = new Set();
  for (const c of CANDIDATES) {
    if (picked.length >= 10 && industries.size >= 4) break;
    const r = await probe(c.url);
    const line = `${r.ok ? 'OK ' : 'DEAD'} ${c.url} (${r.status})`;
    console.log(line);
    if (r.ok && picked.length < 10) {
      picked.push({ ...c, status: r.status });
      industries.add(c.industry);
    }
    await new Promise((res) => setTimeout(res, 800)); // be polite
  }

  const lines = [
    '# Tier-2 Site List (sites 11-20)',
    '',
    `Generated: ${new Date().toISOString()} by testing/tier2_shortlist.js`,
    `Selection: first ${picked.length} reachable candidates spanning ${industries.size} industries.`,
    'Protocol per CAMPAIGN_PLAN.md §2. Read-only interactions; no accounts;',
    'skip-and-record on CAPTCHA/bot-wall.',
    '',
    '| # | Key | URL | Industry | Focus |',
    '|---|---|---|---|---|',
    ...picked.map((c, i) => `| ${11 + i} | ${c.key} | ${c.url} | ${c.industry} | ${c.purpose} |`),
    '',
  ];
  fs.writeFileSync(path.join(__dirname, 'TIER2_SITES.md'), lines.join('\n'));
  console.log(`\nWrote testing/TIER2_SITES.md with ${picked.length} sites / ${industries.size} industries`);
})();
