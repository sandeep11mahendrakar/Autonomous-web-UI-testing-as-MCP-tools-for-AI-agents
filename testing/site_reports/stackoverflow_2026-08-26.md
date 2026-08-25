# SITE TEST REPORT - StackOverflow Questions

## 1. Metadata

| Field | Value |
|---|---|
| Site | StackOverflow Questions |
| URL | https://stackoverflow.com/questions |
| Test date | 2026-08-26 (D6 Tier-3 launch window) |
| Unified run ID | n/a — **BLOCKED, no pipeline launched** |
| Run folder | none (zero quota burned, by design) |
| Worker | serial-B / ox-alpha CLI window (Tier-3 W2) |
| Report status | FINAL — BLOCKED |

## 2. Verdict snapshot

| Stage | Result |
|---|---|
| Availability re-check @ claim time | **HTTP 403 Forbidden** (hard bot-wall), verified twice: 2026-08-25 ~17:55 IST preflight (`testing/TIER3_PREFLIGHT.md`) and again at D6 claim time |
| A exploration | not attempted — blocked IS valid data per CAMPAIGN_PLAN policy; burning quota against a 403 wall produces nothing |
| B exploration | not attempted |
| Fusion | n/a |
| FT live execution | n/a |
| Dashboard | n/a |

**Verdict: 🚫 BLOCKED — environment-class.** Cloudflare-grade anti-bot
protection rejects non-interactive clients at the edge before any content is
served. Recorded honestly per campaign rules; never bypassed. This matches
the OpenCart precedent from Tier-1 (`opencart_blocked_2026-08-24.md`).

## 3. Architecture results

Not applicable — no architecture reached the page.

## 4. SITE bugs detected

None claimable. A 403 edge-wall is an environment property, not an
application defect.

## 5. PIPELINE bugs and fixes during this test

none — no pipeline ran.

## 6. Where the project lagged

Bot-walls remain outside scope by policy. npmjs (#29, W4's pair) hit the same
403 class in preflight; imdb returns a 202 bot-check. Three of ten Tier-3
candidates are walled — worth a paper sentence on real-world accessibility of
"public" web surfaces to automation.

## 7-10. Assets and reproduction

No run folder. Reproduction of the block itself:

```bash
curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126" -I https://stackoverflow.com/questions
# -> HTTP/2 403
```

Per TIER2_SITES/TIER3 policy: if a spare becomes available later in the
window and quota allows, Master may promote one; otherwise #22 stays BLOCKED
in the dataset as honest data.
