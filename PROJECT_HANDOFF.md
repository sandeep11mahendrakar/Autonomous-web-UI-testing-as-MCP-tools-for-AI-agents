# NEXT SESSION HANDOFF — READ THIS FIRST

_Last updated: 2026-08-26 ~01:30 IST (W4/serial-D). Branch `after-tier-2`.
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
- Offline test suites: **143/143 PASS** (`node --test "test/*.test.js" "fusion/test/*.test.js" "web/test/*.test.js"`)

## 3. LLM PROVIDER LANDSCAPE (hard-won knowledge — trust this table)

| Pool | Limit | Notes |
|---|---|---|
| OpenRouter `stealth/ox-alpha` | **1000 req/day, GLOBAL** (shared across every key/account) | Resets 00:00 UTC / **05:30 IST**. Overnight Tier-3 uses NEW key ending `...81c2ad` (D5 rotation); Groq fallback `fqEvp...99G` (gpt-oss-120b). Zen key `ReUj...` RESERVED for post-campaign — do not touch |
| Groq (console.groq.com key in .env) | **8000 TPM + 200k TPD PER MODEL** (separate buckets) | `openai/gpt-oss-120b` + `gpt-oss-20b` verified clean JSON. qwen leaks `<think>` — unusable for JSON |
| Zen gateway `https://opencode.ai/zen/v1` | small undisclosed caps | `x-preview-f-free` IS ox-alpha's route but 503s under load; `big-pickle`/`hy3-free`/`laguna-s-2.1-free` work |

**Current `.env`:** all three archs → OpenRouter stealth/ox-alpha with key2.
**REQUIRED env for S4:** `FUSION_LLM_REASONING=low` + `FUSION_MAX_TOKENS=4000`
(the stealth model burns 1500 tokens on visible reasoning before any JSON otherwise).
These live in untracked `vision/.env`.

## 4. CAMPAIGN STATUS: 22/30 assigned sites processed (Tier-3 IN PROGRESS)

### Tier 1 (sites 1–10): ✅ complete
11/11 runnable end-to-end, FT pass 77%, 19 pipeline defects fixed.

### Tier 2 (sites 11–20): ✅ complete AND DECONTAMINATED
The contamination incident (5 wrong-site rows + 3 localhost-replay rows, found
by adversarial audit docs/AUDIT_REPORT.md) is FULLY RESOLVED: all eight
quarantined sites re-run behind attribution guards (run_attribution +
assertCatalogDomains + assertVisionStartUrls + folder_purity ALL GREEN).
Final decontaminated aggregates (testing/CAMPAIGN_EVALUATION.md @ regen
2026-08-25T15:16Z): fusion offered 86 / accepted 60 / FT live **37/60 = 61.7%**;
**mean fusion-attributable 48.7%** (n=19 incl. site-moved lambdatest row; n=18
denominator note recorded for T605); vision rubric 62 tests / 48 PASS (77%) /
33 STRONG. Gate audit T401 recomputed all of this from raw artifacts: PASS.

### Tier 3 (sites 21–30): 🔄 IN PROGRESS (launched 2026-08-25 ~22:45 IST per D5/D6)
Pair assignments on docs/TASK_BOARD.md directive D6; sequential via
.campaign.lock round-robin. State at last update:
- #21 wikipedia CLEARED (W1): run_20260825_230647, purity PURE, FT 3/7 live,
  fusion-attributable 87.5% (weak-A/strong-fusion exemplar)
- #22 stackoverflow BLOCKED (W2): hard 403 bot-wall confirmed, zero quota
- #24 imdb BLOCKED (W4): HTTP 202 bot-check reproduced at launch → honest BLOCKED
- #29 npmjs BLOCKED (W4): hard 403 bot-wall confirmed → honest BLOCKED
- #26 hackernews (W1), #23 github_trending/#28 archive_org (W3),
  #25 goodreads/#30 reddit (W5), #27 bbc_news (W2): claimed/running/queued
- Success bar (pre-registered): ≥6/10 complete pipelines; blocked IS data

## 5. RESEARCH FINDINGS (validated, use in capstone report)

1. **Fusion value explodes on real sites**: ~20% (Tier 1) → **48.7% campaign mean over the fully decontaminated 20-site ledger** (was 41% pre-decontamination)
2. **Complementary perception quantified**: B sees ~170 elements/run vs A's ~9 (**~19×**, n=18 clean), but A generates 2.7 tests vs B's 0.9 — neither alone predicts usefulness
3. **Verification ceiling proven** (mutation study, `mutation/results/ANALYSIS.md`): the system verifies actions-work, not values-correct. Wrong-calc/validation/dead-button bugs undetectable even at full coverage → assertion/value-oracle synthesis is the top V2 item
4. **Autonomous issue detection works**: phptravels mirror found without human hints AND independently reproduced on the clean guarded re-run run_20260825_201027
5. **Exploration stable**: A-steps sd ±0.5 across repeats (contaminated study = lower bound)
6. **Multi-agent evaluation integrity**: run-attribution corruption mode caught by adversarial self-audit and remediated behind guards — now a first-class methodology finding (docs/AUDIT_REPORT.md + paper §7.2)

## 6. OPEN WORK QUEUE (priority order)

| Pri | Item | Where |
|---|---|---|
| P0 | Finish Tier-3 sites per D6 pairs (round-robin lock) | docs/TASK_BOARD.md D6 |
| P1 | Diagnose isolation leak: demoblaze page_keys leaked into phptravels/openlibrary catalogs during OLD contaminated runs — verify whether guarded re-runs still show it (phptravels re-run report notes mirror finding; openlibrary re-run validator rejected cross-page refs). Root-cause browser-context reuse if present | `runBoth.js` collectArchitectureB mtime window suspected |
| P1 | Add `schema_version` to dashboard_data.json; make s8 fail loudly on unknown schemas | `fusion/s6_dashboard.js`, `fusion/s8_campaign_eval.js` |
| P2 | Log token usage from provider responses going forward | `lib/llmProvider.js` (JSONL logging exists from W-2a; extend coverage) |
| P2 | T402 final freeze after Tier-3 consolidation (Master aggregates at window end, then regen s8/VTQ/INDEX) | docs/TASK_BOARD.md T402 |
| PARKED | T604 capability flags + executability filter v2; T605 acceptance-rate tightening (+paper denominator wording n=19-vs-n=18) — human decision: no arch changes during campaign | docs/TASK_BOARD.md |

~~P0 Re-run 4 starved sites~~ DONE (Phase-2 clearances landed; gate-audited).
~~P3 Pre-register Tier-3~~ DONE (CAMPAIGN_PLAN.md §Tier-3 frozen pre-launch).

## 7. TIER-3 STATUS (policies approved by user; campaign LAUNCHED)

**Sites:** see testing/TIER3_SITES.md (frozen list #21–#30) — availability-checked;
preflight results in testing/TIER3_PREFLIGHT.md.

**User-approved policies (unchanged):**
- Cookie-consent walls: deterministic auto-dismiss pre-step, recorded in manifest
- Bot stance: realistic Chrome UA string only (no full stealth stack)
- ToS: read-only public pages ONLY; no logins/posts/purchases; skip CAPTCHA/bot-walls honestly
- Pre-registered success criteria: ≥6/10 pipelines complete, blocking rate logged, zero ToS violations, A/B degradation reported as findings not failures
- Budget: heavy sites burn 60–100+ calls each → pace across 2 daily resets or trim MAX_STEPS for mega-DOMs (github/imdb/bbc: MAX_STEPS=18)

**Protocol per site (identical):** hold `.campaign.lock` → `node runBoth.js <url>`
(trimmed env MAX_STEPS=25 MAX_STATES=20) → s1→s2→s4→ft→s6 via attributed run dir
(testing/run_attribution.js findRunDir, NEVER newest-dir) → folder_purity MUST be
PURE → report per TEMPLATE (numbers only from extract_run.js) → INDEX row → suites
green → commit+push backup.

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

> Read PROJECT_HANDOFF.md fully, then docs/TASK_BOARD.md directive D6 + comms
> log (newest first). If Tier-3 is still running: take the next unclaimed site
> or assist consolidation per Master's orders. If Tier-3 is done: regen
> aggregates (vision_test_quality.js + s8_campaign_eval.js), update INDEX
> tier-3 rows, run T402 final freeze checklist, and fold final numbers into
> docs/RESEARCH_PAPER_DRAFT.md (v3) sections 3.1/4.x. Push everything to backup.
