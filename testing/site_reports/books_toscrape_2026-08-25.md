# SITE TEST REPORT - Books to Scrape

## 1. Metadata

| Field | Value |
|---|---|
| Site | Books to Scrape |
| URL | https://books.toscrape.com |
| Test date | 2026-08-25 |
| Unified run ID | `run_20260825_025619` |
| Run folder | `runs/run_20260825_025619/` |
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
| B execution | pass_rate=1 (1 test(s)); weak_verifications=1 |
| S1 catalog | elements=260 behaviors=5 pages=5 conflicts=21 |
| S2 gaps | common=- a_only=- b_only=- uncovered=- bh_uncovered=- |
| S4 synthesis | offered=5 candidates=4 accepted=3 rejected=1 grounded=true |
| FT live execution | 3/3 PASS (7/7 steps) |
| Dashboard | pct_fusion=75% novel_targets=4 |

**Verdict:** Full pipeline completed after quota-delayed fusion completion; Fusion delivered 75% attribution with 3/3 FT PASS - best-yet fusion result at time of run.

## 3. Architecture results

### A (DOM): Killed at the 15-min orchestrator cap mid-exploration: Groq daily token cap (200k TPD) forced slow deterministic fallbacks. Partial memory log + test cases recovered.

### B (vision): Single composed replay PASSED; verification method was body_text_fallback (weak, honestly flagged). Stale-coordinate prevention fired once.

### A/B comparison: B dominated catalog space 258:2 (A starved by timeout), yet Fusion still found executable targets from A-side selectors - complementary perception in action.

## 4. SITE bugs detected

None claimed - coverage insufficient to conclude.

## 5. PIPELINE bugs and fixes during this test

Defect #20: FT executor crashed resolving behavior refs through the elements Map; fixed by iterating CATALOG_INDEX.elements.values(). Also ox-alpha reasoning consumed FUSION_MAX_TOKENS=1500 before emitting JSON; fixed with FUSION_LLM_REASONING=low + FUSION_MAX_TOKENS=4000 (verified 0 to 3 accepted tests).

## 6. Where the project lagged

Groq free-tier TPM/TPD caps dominate unattended runs; A starvation shrank the selector space available to FT grounding.

## 7-10. Assets and reproduction

All artifacts under runs/run_20260825_025619/ per standard tree (TEMPLATE section 8).

```bash
node runBoth.js https://books.toscrape.com
node fusion/s1_build_catalog.js run_20260825_025619
node fusion/s2_gap_report.js run_20260825_025619
node fusion/s4_fusion_synthesis.js run_20260825_025619
node fusion/execute_fusion_tests.js run_20260825_025619
node fusion/s6_dashboard.js run_20260825_025619
```


## Re-run (decontaminated) — run_20260825_131135

- New run ID: `run_20260825_131135` (replaces contaminated `run_20260825_025619` above; old numbers kept as evidence).
- Status: SUCCESS | A: OK 8 steps / 8 states (no timeout) | B: OK 1/1 PASS
- S4: 5/5 grounded | FT live: 4/5 PASS | Fusion-attributable: 71.4%
- A completed fully; decontamination CONFIRMED for this site: with A healthy the pipeline finished SUCCESS. FT live 4/5, fusion-attributable 71.4% (5/7 final tests), 8 novel targets.
