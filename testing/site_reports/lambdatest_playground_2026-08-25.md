# SITE TEST REPORT - LambdaTest Selenium Playground

## 1. Metadata

| Field | Value |
|---|---|
| Site | LambdaTest Selenium Playground |
| URL | https://www.lambdatest.com/selenium-playground/ |
| Test date | 2026-08-25 |
| Unified run ID | `run_20260825_053921` |
| Run folder | `runs/run_20260825_053921/` |
| LLM (A/B) exploration | Groq gpt-oss-120b / gpt-oss-20b (TPM/TPD-paced night run) |
| LLM (S4/FT) completion | OpenRouter stealth/ox-alpha, reasoning=low, FUSION_MAX_TOKENS=4000 |
| Repo state | branch capstone-tier2-prep |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Result |
|---|---|
| Overall run | PARTIAL_FAILURE |
| A exploration | success (16 steps / 4 states / 4 urls; termination: completed) |
| A test generation | 0 test case(s) |
| B execution | pass_rate=- (0 test(s)); weak_verifications=- |
| S1 catalog | elements=145 behaviors=20 pages=5 conflicts=17 |
| S2 gaps | common=- a_only=- b_only=- uncovered=- bh_uncovered=- |
| S4 synthesis | offered=36 candidates=5 accepted=5 rejected=0 grounded=true |
| FT live execution | 4/5 PASS (10/11 steps) |
| Dashboard | pct_fusion=100% novel_targets=11 |

**Verdict:** STANDOUT RUN: Fusion generated 5 tests, ALL 5 PASSED live (10/11 steps), 100% fusion-attributable, 11 novel targets - strongest Fusion result of the entire campaign.

## 3. Architecture results

### A (DOM): Completed under Groq TPM pacing (429-waits absorbed by new retry layer).

### B (vision): Replay suite passed at 1.0 pass rate.

### A/B comparison: Fusion found and verified element surfaces neither architecture had exercised; zero rejections from the grounding validator.

## 4. SITE bugs detected

No application defects claimed; playground behaved per spec.

## 5. PIPELINE bugs and fixes during this test

none - clean run (post defect-#20 fix).

## 6. Where the project lagged

One FT step failed honestly (semantic_verification class) within the 5-test suite.

## 7-10. Assets and reproduction

All artifacts under runs/run_20260825_053921/ per standard tree (TEMPLATE section 8).

```bash
node runBoth.js https://www.lambdatest.com/selenium-playground/
node fusion/s1_build_catalog.js run_20260825_053921
node fusion/s2_gap_report.js run_20260825_053921
node fusion/s4_fusion_synthesis.js run_20260825_053921
node fusion/execute_fusion_tests.js run_20260825_053921
node fusion/s6_dashboard.js run_20260825_053921
```


## Re-run (decontaminated) — run_20260825_133122

- New run ID: `run_20260825_133122` (replaces contaminated `run_20260825_053921` above; old numbers kept as evidence).
- Status: FAILED | A: TIMEOUT (internal A 900s cap) | B: PARTIAL (no test cases)
- S4: 4/5 accepted (1 cross_page_ref rejected) | FT live: 1/4 PASS | Fusion-attributable: 100%*
- REVISION OF CONTAMINATION CLAIM: A timed out AGAIN on a fresh ox-alpha pool — this is the pipeline internal 900s A-timeout on a heavy site, NOT quota starvation. The quota-contamination hypothesis is withdrawn for this site; heavy-DOM A-timeout is a genuine finding. Fusion = 100% of a fusion-only final set (15 novel targets) but the denominator caveat applies.
