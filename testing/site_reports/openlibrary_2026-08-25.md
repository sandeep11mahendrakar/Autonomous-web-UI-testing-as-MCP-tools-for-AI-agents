# SITE TEST REPORT - Open Library

## 1. Metadata

| Field | Value |
|---|---|
| Site | Open Library |
| URL | https://openlibrary.org |
| Test date | 2026-08-25 |
| Unified run ID | `run_20260825_070918` |
| Run folder | `runs/run_20260825_070918/` |
| LLM (A/B) exploration | Groq gpt-oss-120b / gpt-oss-20b (TPM/TPD-paced night run) |
| LLM (S4/FT) completion | OpenRouter stealth/ox-alpha, reasoning=low, FUSION_MAX_TOKENS=4000 |
| Repo state | branch capstone-tier2-prep |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Result |
|---|---|
| Overall run | PARTIAL_FAILURE |
| A exploration | success (11 steps / 9 states / 3 urls; termination: completed) |
| A test generation | 1 test case(s) |
| B execution | pass_rate=0 (1 test(s)); weak_verifications=0 |
| S1 catalog | elements=41 behaviors=11 pages=5 conflicts=2 |
| S2 gaps | common=- a_only=- b_only=- uncovered=- bh_uncovered=- |
| S4 synthesis | offered=6 candidates=6 accepted=3 rejected=3 grounded=true |
| FT live execution | 3/3 PASS (6/6 steps) |
| Dashboard | pct_fusion=60% novel_targets=6 |

**Verdict:** Real production site end-to-end: 41-element catalog, 3/3 Fusion FTs PASSED live, 60% attribution, 6 novel targets. Validator rejected 3 cross-page candidates referencing demoblaze URLs (same mirror artifact as phptravels - investigation noted).

## 3. Architecture results

### A (DOM): 11 steps / 9 states, clean completion.

### B (vision): Partial success: ECONNRESET during capture (transient), honest PARTIAL status.

### A/B comparison: Production search flows worked for Fusion composition where raw element counts were modest.

## 4. SITE bugs detected

None claimed on openlibrary itself.

## 5. PIPELINE bugs and fixes during this test

Investigate why demoblaze page_keys leaked into these catalogs (likely browser-context reuse across chained runs).

## 6. Where the project lagged

Transient network reset on B side.

## 7-10. Assets and reproduction

All artifacts under runs/run_20260825_070918/ per standard tree (TEMPLATE section 8).

```bash
node runBoth.js https://openlibrary.org
node fusion/s1_build_catalog.js run_20260825_070918
node fusion/s2_gap_report.js run_20260825_070918
node fusion/s4_fusion_synthesis.js run_20260825_070918
node fusion/execute_fusion_tests.js run_20260825_070918
node fusion/s6_dashboard.js run_20260825_070918
```
