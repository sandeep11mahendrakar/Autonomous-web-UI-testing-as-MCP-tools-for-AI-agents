# Site Test Report — IMDb Chart Top — BLOCKED — 2026-08-26

## 1. Metadata

| Field | Value |
|---|---|
| Site | IMDb Top Charts |
| URL | `https://www.imdb.com/chart/top` |
| Test date | 2026-08-26 |
| Unified run ID | none — no pipeline launched (quota-preservation rule) |
| Repo state | `after-tier-2` @ `574ea30` (W4 claim commit) |
| Explorer | W4 / ox-alpha serial-D (opencode) |
| Report status | FINAL (BLOCKED) |

## 2. Verdict

**BLOCKED — bot-check challenge (HTTP 202, empty body) served to plain
authenticated-UA HTTP at launch re-check.** Per Tier-3 policy ("CAPTCHA or
bot-wall = record BLOCKED honestly and move on; blocked IS valid data"), no
pipeline was launched and zero LLM quota was burned.

## 3. What actually happened

Two-probe evidence trail:
1. **Preflight (2026-08-25, testing/TIER3_PREFLIGHT.md):** `202 BOT_CHECK`
   with empty body; runbook §10 explicitly said "RE-CHECK at launch time: the
   202 may be a transient bot challenge; if it repeats, record honest BLOCKED".
2. **Launch re-check (2026-08-26 ~00:5x IST, realistic Chrome UA):**
   `HTTP 202`, content length 0 — identical challenge response. Not transient;
   the site serves a persistent bot-detection interstitial to non-browser
   clients. A full Playwright pipeline would either stall on the challenge or
   produce meaningless exploration of the interstitial.

## 4. Findings for the pipeline

| # | Finding | Class |
|---|---|---|
| 1 | HTTP-202-with-empty-body is this site's bot-wall signature; the preflight tool already classifies it (`BOT_CHECK`) but there is no in-pipeline early-abort that maps a 202 challenge page to status=blocked without spending exploration steps | Backlog: same challenge-page classifier as opencart finding #1 (title/body markers + status-code heuristic → terminate `bot_wall_blocked`) |

## 5. Metrics

```
A/B/S1/S2/S4/FT/S6: not run - blocked at pre-flight gate by design
Quota spent: 0 requests, 0 tokens (policy: do not burn quota on known walls)
Evidence: two independent HTTP probes (preflight 202 + launch re-check 202)
```

## 6. Disposition

Site stays registered as honestly BLOCKED in INDEX row #24. Re-attempt is only
worthwhile behind a residential-browser session rather than datacenter HTTP;
per C5 checkpoint this counts toward the campaign's blocking-rate statistic,
which is itself a reported result.
