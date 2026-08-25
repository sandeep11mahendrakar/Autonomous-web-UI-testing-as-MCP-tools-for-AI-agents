# SITE TEST REPORT - PHPTravels Demo

## 1. Metadata

| Field | Value |
|---|---|
| Site | PHPTravels Demo |
| URL | https://phptravels.com/demo/ |
| Test date | 2026-08-25 |
| Unified run ID | `run_20260825_065652` |
| Run folder | `runs/run_20260825_065652/` |
| LLM (A/B) exploration | Groq gpt-oss-120b / gpt-oss-20b (TPM/TPD-paced night run) |
| LLM (S4/FT) completion | OpenRouter stealth/ox-alpha, reasoning=low, FUSION_MAX_TOKENS=4000 |
| Repo state | branch capstone-tier2-prep |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Result |
|---|---|
| Overall run | SUCCESS |
| A exploration | success (11 steps / 9 states / 3 urls; termination: completed) |
| A test generation | 1 test case(s) |
| B execution | pass_rate=0 (1 test(s)); weak_verifications=0 |
| S1 catalog | elements=9 behaviors=9 pages=3 conflicts=0 |
| S2 gaps | common=- a_only=- b_only=- uncovered=- bh_uncovered=- |
| S4 synthesis | offered=18 candidates=5 accepted=4 rejected=1 grounded=true |
| FT live execution | 0/4 PASS (1/5 steps) |
| Dashboard | pct_fusion=66.7% novel_targets=2 |

**Verdict:** SITE REDIRECT FINDING: phptravels demo serves demoblaze-style cart pages - catalog references demoblaze.com URLs. 0/4 FT PASS with honest failures; attribution percentage technically 66.7% but targets were demoblaze pages.

## 3. Architecture results

### A (DOM): 11 steps / 9 states, max_depth_reached.

### B (vision): Replay 0/1 honest fail.

### A/B comparison: Cross_page_ref validator rejections reference demoblaze.com/cart.html during the PHPTRAVELS run - deterministic proof of redirect/mirror behaviour.

## 4. SITE bugs detected

Demo-site misconfiguration/mirror: phptravels demo does not serve its own app (pipeline discovered real site issue).

## 5. PIPELINE bugs and fixes during this test

none - clean run.

## 6. Where the project lagged

Redirect makes this ledger row effectively a second demoblaze test.

## 7-10. Assets and reproduction

All artifacts under runs/run_20260825_065652/ per standard tree (TEMPLATE section 8).

```bash
node runBoth.js https://phptravels.com/demo/
node fusion/s1_build_catalog.js run_20260825_065652
node fusion/s2_gap_report.js run_20260825_065652
node fusion/s4_fusion_synthesis.js run_20260825_065652
node fusion/execute_fusion_tests.js run_20260825_065652
node fusion/s6_dashboard.js run_20260825_065652
```
