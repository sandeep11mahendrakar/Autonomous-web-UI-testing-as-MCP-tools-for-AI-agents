'use strict';

/**
 * testing/tier3_preflight.js — ZERO-QUOTA availability check for Tier-3
 * candidate sites (T301 prep). Plain HTTP GET of one homepage per site with a
 * realistic Chrome UA string (campaign policy: UA only, no stealth stack).
 * No browser, no LLM, no campaign.lock needed — read-only public pages.
 *
 * Output: markdown-ready classification table on stdout.
 * Classifications:
 *   OK           200 OK at the expected host
 *   REDIRECTED   reachable but landed on a different host (record where)
 *   BOT_WALL     403/406/429/503 or Cloudflare interstitial markers
 *   UNREACHABLE  DNS/network error or timeout
 */

const CANDIDATES = [
  // light first (MASTER_PLAN T301 ordering)
  { url: 'https://news.ycombinator.com', tier: 'light' },
  { url: 'https://archive.org', tier: 'light' },
  { url: 'https://lite.duckduckgo.com/lite/', tier: 'light-spare' },
  { url: 'https://text.npr.org', tier: 'light-spare' },
  { url: 'https://en.wikipedia.org/wiki/Main_Page', tier: 'light' },
  { url: 'https://www.npmjs.com/packages', tier: 'light' },
  // risky last
  { url: 'https://stackoverflow.com/questions', tier: 'risky' },
  { url: 'https://github.com/trending', tier: 'risky' },
  { url: 'https://www.imdb.com/chart/top/', tier: 'risky' },
  { url: 'https://www.goodreads.com/list', tier: 'risky' },
  { url: 'https://www.bbc.com/news', tier: 'risky' },
  { url: 'https://old.reddit.com', tier: 'risky-spare' },
  { url: 'https://www.reddit.com', tier: 'risky' },
];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const TIMEOUT_MS = Number(process.env.PREFLIGHT_TIMEOUT_MS) || 15000;
const DELAY_MS = Number(process.env.PREFLIGHT_DELAY_MS) || 1200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function classify(res, bodyHead, expectedHost) {
  const finalHost = new URL(res.url).host.replace(/^www\./, '');
  const expHost = expectedHost.replace(/^www\./, '');
  const botMarkers = [
    'just a moment',
    'cf-browser-verification',
    'attention required',
    'checking your browser',
    'enable javascript and cookies to continue',
    'verify you are a human',
  ];
  const looksBot = botMarkers.some((m) => bodyHead.toLowerCase().includes(m));
  if ([403, 406, 429, 503].includes(res.status) || looksBot) return 'BOT_WALL';
  if (finalHost !== expHost) return 'REDIRECTED';
  if (res.status === 200) return 'OK';
  return `HTTP_${res.status}`;
}

async function check(entry) {
  const u = new URL(entry.url);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(u, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    let bodyHead = '';
    try {
      bodyHead = (await res.text()).slice(0, 4000);
    } catch (_) {}
    return {
      ...entry,
      status: res.status,
      final_url: res.url,
      ms: Date.now() - started,
      verdict: classify(res, bodyHead, u.host),
    };
  } catch (err) {
    return {
      ...entry,
      status: null,
      final_url: null,
      ms: Date.now() - started,
      verdict: 'UNREACHABLE',
      detail: err.name === 'AbortError' ? `timeout>${TIMEOUT_MS}ms` : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log('| Candidate | Tier | Verdict | HTTP | Final URL | ms |');
  console.log('|---|---|---|---|---|---|');
  for (let i = 0; i < CANDIDATES.length; i++) {
    const r = await check(CANDIDATES[i]);
    const detail = r.detail ? ` (${r.detail})` : '';
    console.log(
      `| ${CANDIDATES[i].url} | ${entry_tier(r.tier)} | ${r.verdict}${detail} | ${r.status ?? '-'} | ${r.final_url ?? '-'} | ${r.ms} |`
    );
    if (i < CANDIDATES.length - 1) await sleep(DELAY_MS);
  }
}
const entry_tier = (t) => t;

main().catch((e) => {
  console.error('preflight failed:', e.message);
  process.exit(1);
});
