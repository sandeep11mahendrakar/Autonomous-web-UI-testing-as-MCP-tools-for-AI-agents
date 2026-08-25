# NEXT SESSION HANDOFF — READ THIS FIRST

_Last updated: 2026-08-25 ~10:45 IST. Branch `after-tier-2` @ commit after s8 fixes.
This file is the FIRST PROMPT for the next session. Everything below is verified
state, not plans-that-may-have-changed._

---

## 1. WHAT THIS PROJECT IS

**AI-Assisted Test Case Generation for Web/Mobile UI (Team 101, PES University capstone).**
Two independent architectures explore websites and a fusion layer merges them:

- **Arch A** (`web/`) — DOM + state-machine exploration, selector-grounded tests
- **Arch B** (`vision/`) — screenshots → YOLO ScreenParser + OCR → visual DOM → coordinate tests
- **Fusion** (`fusion/`) — S1 catalog → S2 gaps → S4 grounded LLM synthesis → FT live execution → S6 dashboard
- Campaign: **50-site evaluation**, results in `testing/site_reports/`, aggregate in `testing/CAMPAIGN_EVALUATION.md`

Repo: `C:\Users\sandeep\pes\vs code\Capstone-Project`
(NEVER use the old clone at `C:\Users\sandeep\pes\CAPSTONE\Capstone-Project`)

## 2. GIT STATE (verified)

- Current branch: **`after-tier-2`** — all work below is committed & pushed
- Parent branch `capstone-tier2-prep`, tag `pre-tier3-cleanup`
- Remote `backup` = https://github.com/sandeep11mahendrakar/mcp-for-the-testing-temp-
  → **PUSH ONLY TO `backup`. The Neonishh origin was REMOVED from git config by user instruction. NEVER push to Neonishh.**
- Offline test suites: 121/121 PASS (`node --test "test/*.test.js" "fusion/test/*.test.js" "web/test/*.test.js"`)

## 3. LLM PROVIDER LANDSCAPE (hard-won knowledge — trust this table)

| Pool | Limit | Notes |
|---|---|---|
| OpenRouter `stealth/ox-alpha` | **1000 req/day, GLOBAL** (shared across every key/account) | Resets 00:00 UTC / **05:30 IST**. Keys in play: `sk-or-v1-e5318...`(in .env), `sk-or-v1-47c9...`(temp). New keys do NOT bypass the pool |
| Groq (console.groq.com key `gsk_***REDACTED-see-user-or-.env***`) | **8000 TPM + 200k TPD PER MODEL** (separate buckets) | `openai/gpt-oss-120b` + `gpt-oss-20b` verified clean JSON. qwen leaks `<think>` — unusable for JSON |
| Zen gateway `https://opencode.ai/zen/v1` (key `sk-ibSIB...`) | small undisclosed caps | `x-preview-f-free` IS ox-alpha's route but 503s under load; `big-pickle`/`hy3-free`/`laguna-s-2.1-free` work |

**Current `.env`:** all three archs → OpenRouter stealth/ox-alpha with key2.
**REQUIRED env for S4:** `FUSION_LLM_REASONING=low` + `FUSION_MAX_TOKENS=4000`
(the stealth model burns 1500 tokens on visible reasoning before any JSON otherwise).
These live in untracked `vision/.env`.

## 4. CAMPAIGN STATUS: 20/50 sites DONE

### Tier 1 (sites 1–10): ✅ complete
11/11 runnable end-to-end, FT pass 77%, 19 pipeline defects fixed.

### Tier 2 (sites 11–20): ✅ complete — reports FINAL in `testing/site_reports/`
FT live aggregate **26/37 = 70%**. Headlines:
- 🏆 lambdatest 5/5 PASS @ **100% fusion**, 11 novel targets (best run ever)
- docs.python 7/7 PASS @77.8% · gutenberg 6/6 PASS @54.5% (16 novel targets, record)
- books 3/3 @75% · quotes 1/2 · openlibrary 3/3 @60%
- weathersparks 1/3 (canvas blind spot) · sahitest 0/2 (frames unsupported)
- **phptravels: demo redirects to demoblaze mirror** — real site issue discovered autonomously

### ⚠️ IMMEDIATE NEXT ACTION (first thing next session, before ANY LLM use)
**The P1a decontamination re-runs FAILED** — ox-alpha pool was already drained by the
night chain. All 4 runs (run_20260825_092206/093928/095650/101411) hit 429 walls and timed out.

**Do this after the next 05:30 IST reset, BEFORE anything else consumes ox-alpha:**
```bash
node testing/rerun_starved.js
```
Then update the reports + INDEX rows for those 4 sites with the new run IDs
(old contaminated runs stay as evidence). This de-contaminates the fusion-% claim
(A-timeouts had shrunk A's denominator).

## 5. RESEARCH FINDINGS (validated, use in capstone report)

1. **Fusion value explodes on real sites**: ~20% (Tier 1) → 41% campaign mean / 66–100% Tier-2 — *pending decontamination caveat above*
2. **Complementary perception quantified**: B sees ~138 elements/run vs A's ~8 (**16×**), but A generates 2.7 tests vs B's 1.2 — neither alone predicts usefulness
3. **Verification ceiling proven** (mutation study, `mutation/results/ANALYSIS.md`): the system verifies actions-work, not values-correct. Wrong-calc/validation/dead-button bugs undetectable even at full coverage → assertion/value-oracle synthesis is the top V2 item
4. **Autonomous issue detection works**: phptravels mirror found without human hints
5. **Exploration stable**: A-steps sd ±0.5 across repeats (contaminated study = lower bound)

## 6. OPEN WORK QUEUE (priority order)

| Pri | Item | Where |
|---|---|---|
| P0 | Re-run 4 starved sites post-reset (see §4) | `testing/rerun_starved.js` |
| P0 | Update 4 site reports + INDEX rows with new run IDs | `testing/site_reports/` |
| P1 | Diagnose isolation leak: demoblaze page_keys leaked into phptravels/openlibrary catalogs. Inspect their `dom/memory_log.json` for demoblaze URLs → trace copy path → fix + add post-run catalog-domain assertion to night-chain | `runBoth.js` collectArchitectureB mtime window suspected |
| P1 | Add `schema_version` to dashboard_data.json; make s8 fail loudly on unknown schemas | `fusion/s6_dashboard.js`, `fusion/s8_campaign_eval.js` |
| P2 | Campaign lockfile enforcement (`.campaign.lock` exists in rerun_starved.js — reuse pattern in night_chain) | `testing/night_chain.js` |
| P2 | Mark phptravels row MIRROR-EVIDENCE; swap spare into final dataset | `testing/TIER2_SITES.md` |
| P2 | Log token usage from provider responses going forward | `lib/llmProvider.js` |
| P3 | Pre-register Tier-3 criteria in CAMPAIGN_PLAN.md §Tier-3 (decided policies below) | `testing/CAMPAIGN_PLAN.md` |
| P3 | Then launch Tier 3 sites 21–30 | see §7 |

## 7. TIER-3 PLAN (approved by user, not yet started)

**Sites (availability-check at runtime, pick 10):**
wikipedia.org · stackoverflow.com/questions · github.com/trending · imdb.com/chart/top · goodreads.com/list · news.ycombinator.com · bbc.com/news · archive.org · npmjs.com/packages · reddit.com (public) — spares: lite.duckduckgo.com, old.reddit.com, text.npr.org

**User-approved policies:**
- Cookie-consent walls: deterministic auto-dismiss pre-step, recorded in manifest
- Bot stance: realistic Chrome UA string only (no full stealth stack)
- ToS: read-only public pages ONLY; no logins/posts/purchases; skip CAPTCHA/bot-walls honestly
- Pre-registered success criteria: ≥6/10 pipelines complete, blocking rate logged, zero ToS violations, A/B degradation reported as findings not failures
- Budget: heavy sites burn 60–100+ calls each → pace across 2 daily resets or trim MAX_STEPS for mega-DOMs

**Protocol per site (identical):** `node runBoth.js <url>` → s1→s2→s4→ft→s6 → suites green → report per TEMPLATE → INDEX row → commit+push backup.

## 8. GOTCHAS (learned expensively)

1. PowerShell `Add-Content` mangles unicode (✅→?) — write INDEX/markdown via node `fs` utf8 only
2. Never run two pipelines concurrently — vision ports (5000–5004) collide and quota pools interleave (contaminated the repeatability study once; disclosed in REPEATABILITY.md)
3. Stealth pool exhausts mid-campaign (~8 sites/night); night_chain has quota-aware retries but budget anyway
4. Provider errors carry `.status`; 429s are pacing signals — provider now waits-and-retries automatically
5. Commit messages follow conventional style; push only to `backup`

## 9. KEY FILES MAP

```
PROJECT_MEMORY.md            # single source of truth (session sections 0/0a/0b)
testing/CAMPAIGN_PLAN.md     # tiers, protocol, checkpoints (add Tier-3 pre-registration here)
testing/CAMPAIGN_EVALUATION.md # auto-generated aggregate (fusion/s8_campaign_eval.js)
testing/REPEATABILITY.md     # variance study (+contamination disclosure)
testing/TIER2_SITES.md       # tier-2 ledger w/ URLs
testing/run_repeatability.js # variance runner | regen_repeatability.js rebuilds MD from artifacts
testing/rerun_starved.js     # P1a re-run script (READY, quota-gated)
testing/night_chain.js       # autonomous chain (--from <site-key>, quota-aware retries)
mutation/                    # seeded-bug harness + ANALYSIS.md (verification-ceiling finding)
fusion/s7*                   # (folded into s8 section 4b — no separate s7)
fusion/s8_campaign_eval.js   # deterministic campaign aggregator
docs/superpowers/plans/      # earlier plan docs
```

## 10. SUGGESTED FIRST PROMPT FOR NEXT SESSION

> Read PROJECT_HANDOFF.md fully, then execute its §6 queue in priority order:
> first check whether the ox-alpha window is open (it resets 05:30 IST), run
> `node testing/rerun_starved.js` if so, update the four site reports + INDEX,
> then continue P1/P2 items, then pre-register Tier-3 in CAMPAIGN_PLAN.md and
> start the Tier-3 campaign per §7 policies. Push everything to backup remote.
