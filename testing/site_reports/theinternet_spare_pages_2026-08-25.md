# SITE TEST REPORT - The Internet (status codes subset)

## 1. Metadata

| Field | Value |
|---|---|
| Site | The Internet (status codes subset) |
| URL | https://the-internet.herokuapp.com/status_codes |
| Test date | 2026-08-25 |
| Unified run ID | `run_20260825_064713` |
| Run folder | `runs/run_20260825_064713/` |
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
| S1 catalog | elements=2 behaviors=2 pages=3 conflicts=0 |
| S2 gaps | common=- a_only=- b_only=- uncovered=- bh_uncovered=- |
| S4 synthesis | offered=4 candidates=4 accepted=2 rejected=2 grounded=true |
| FT live execution | 1/2 PASS (1/2 steps) |
| Dashboard | pct_fusion=40% novel_targets=3 |

**Verdict:** Micro-catalog (2 elements) by design - status-code demo pages; 1/2 FT PASS, 40% attribution.

## 3. Architecture results

### A (DOM): 11 steps / 9 states, llm_done termination respected anti-laziness rules.

### B (vision): Replay 0/1 with honest failure classification.

### A/B comparison: Both archs agree the page is nearly action-free; Fusion composed what little was composable.

## 4. SITE bugs detected

Status-code pages behave as labelled (200/301/404 links) - no bug.

## 5. PIPELINE bugs and fixes during this test

none - clean run.

## 6. Where the project lagged

Subset URL limits scope vs the full edge-case zoo already covered in Tier 1 (#9).

## 7-10. Assets and reproduction

All artifacts under runs/run_20260825_064713/ per standard tree (TEMPLATE section 8).

```bash
node runBoth.js https://the-internet.herokuapp.com/status_codes
node fusion/s1_build_catalog.js run_20260825_064713
node fusion/s2_gap_report.js run_20260825_064713
node fusion/s4_fusion_synthesis.js run_20260825_064713
node fusion/execute_fusion_tests.js run_20260825_064713
node fusion/s6_dashboard.js run_20260825_064713
```
