# SITE TEST REPORT - Quotes to Scrape

## 1. Metadata

| Field | Value |
|---|---|
| Site | Quotes to Scrape |
| URL | https://quotes.toscrape.com |
| Test date | 2026-08-25 |
| Unified run ID | `run_20260825_035039` |
| Run folder | `runs/run_20260825_035039/` |
| LLM (A/B) exploration | Groq gpt-oss-120b / gpt-oss-20b (TPM/TPD-paced night run) |
| LLM (S4/FT) completion | OpenRouter stealth/ox-alpha, reasoning=low, FUSION_MAX_TOKENS=4000 |
| Repo state | branch capstone-tier2-prep |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Result |
|---|---|
| Overall run | PARTIAL_FAILURE |
| A exploration | timeout (summary not written - see notes) |
| A test generation | 0 test case(s) |
| B execution | pass_rate=1 (1 test(s)); weak_verifications=0 |
| S1 catalog | elements=83 behaviors=5 pages=3 conflicts=16 |
| S2 gaps | common=- a_only=- b_only=- uncovered=- bh_uncovered=- |
| S4 synthesis | offered=7 candidates=5 accepted=2 rejected=3 grounded=true |
| FT live execution | 1/2 PASS (6/7 steps) |
| Dashboard | pct_fusion=66.7% novel_targets=6 |

**Verdict:** Pipeline completed with quota-delayed fusion; 2 grounded Fusion tests accepted, live 1/2 PASS (one honest semantic FAIL), 66.7% fusion-attributable.

## 3. Architecture results

### A (DOM): Same Groq TPD timeout pattern as books (15-min cap hit mid-exploration); partial artifacts recovered.

### B (vision): Login fill replayed successfully with input_value verification (strong signal); 1/1 PASS.

### A/B comparison: Tiny single-page catalog; validator correctly rejected 3 candidates that clicked navigate-behaviors as click steps (action_mismatch).

## 4. SITE bugs detected

None claimed - insufficient coverage to conclude.

## 5. PIPELINE bugs and fixes during this test

none beyond shared defect #20 / reasoning-token fixes documented in books report.

## 6. Where the project lagged

A timeout again; single-page DOM limits workflow composition depth.

## 7-10. Assets and reproduction

All artifacts under runs/run_20260825_035039/ per standard tree (TEMPLATE section 8).

```bash
node runBoth.js https://quotes.toscrape.com
node fusion/s1_build_catalog.js run_20260825_035039
node fusion/s2_gap_report.js run_20260825_035039
node fusion/s4_fusion_synthesis.js run_20260825_035039
node fusion/execute_fusion_tests.js run_20260825_035039
node fusion/s6_dashboard.js run_20260825_035039
```


## Re-run (decontaminated) — run_20260825_131756

- New run ID: `run_20260825_131756` (replaces contaminated `run_20260825_035039` above; old numbers kept as evidence).
- Status: PARTIAL_FAILURE | A: OK 8 steps / 5 states | B: PARTIAL (exploration produced no test cases)
- S4: 5/5 accepted | FT live: 4/5 PASS | Fusion-attributable: 83.3%
- A fully healthy this time; PARTIAL is B-side (B exploration produced no test cases). FT live 4/5, fusion-attributable 83.3%, 10 novel targets. External navigations to goodreads.com / zyte.com blocked by policy and recorded honestly.
