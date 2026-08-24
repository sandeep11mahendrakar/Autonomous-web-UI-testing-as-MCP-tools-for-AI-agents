# Site Test Report — OpenCart Demo — BLOCKED — 2026-08-24

## 1. Metadata

| Field | Value |
|---|---|
| Site | OpenCart demo store |
| URL | `https://demo.opencart.com` |
| Test date | 2026-08-24 |
| Unified run ID | `run_20260824_095411` |
| Repo state | `capstone-final-integrated` @ `a65c6dd` |
| Explorer | ox-alpha (opencode) |
| Report status | FINAL (BLOCKED) |

## 2. Verdict

**BLOCKED — Cloudflare bot-verification challenge served to both
architectures.** Per campaign rules ("skip on CAPTCHA/bot-wall and record
honestly as blocked"), no further attempts were made and the run is kept as
evidence.

## 3. What actually happened

Both A and B loaded only the Cloudflare challenge interstitial:
- A: 8 steps / 8 states, all on the challenge page + its outbound
  Cloudflare marketing links; LLM correctly identified "no login form or
  meaningful elements" but deterministic fallback clicked through challenge-
  page links (Cloudflare / customer-story tabs).
- B: 9 steps / 9 states / 1 URL, same challenge page. Replay PASS 1/1 —
  but it replays clicks on a bot-wall, so the pass is meaningless.

## 4. Findings for the pipeline

| # | Finding | Class |
|---|---|---|
| 1 | Bot-wall detection is implicit (LLM says done) but there is no explicit "challenge page" classifier that would abort the run EARLY with status=blocked | Backlog: add challenge-page heuristic (title/body contains "Verify you are human", "Checking your browser", cloudflare challenge markers) → terminate with `bot_wall_blocked`, mark INDEX row BLOCKED automatically |
| 2 | Deterministic fallback navigated OFF-SITE to cloudflare.com from the challenge page | Same external-domain-guard backlog item as GlobalSQA's GitLab leak |

## 5. Metrics

```
A: steps=8 states=8 urls=2 (target + cloudflare.com) ; NO site content seen
B: steps=9 states=9 urls=1 replay=1_pass/0_fail (meaningless)
S1/S2/S4/FT/S6: not run — nothing to catalogue
```

## 6. Disposition

Site remains on the Tier-1 list for a future re-attempt only if a
challenge-free mirror appears; otherwise replace permanently with the next
spare (GlobalSQA was used as the immediate spare this session).
