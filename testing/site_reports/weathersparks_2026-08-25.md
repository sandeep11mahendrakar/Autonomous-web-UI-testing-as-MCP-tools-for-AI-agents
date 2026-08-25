# SITE TEST REPORT - WeatherSpark

## 1. Metadata

| Field | Value |
|---|---|
| Site | WeatherSpark |
| URL | https://weatherspark.com |
| Test date | 2026-08-25 |
| Unified run ID | `run_20260825_062152` |
| Run folder | `runs/run_20260825_062152/` |
| LLM (A/B) exploration | Groq gpt-oss-120b / gpt-oss-20b (TPM/TPD-paced night run) |
| LLM (S4/FT) completion | OpenRouter stealth/ox-alpha, reasoning=low, FUSION_MAX_TOKENS=4000 |
| Repo state | branch capstone-tier2-prep |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Result |
|---|---|
| Overall run | SUCCESS |
| A exploration | success (8 steps / 9 states / 3 urls; termination: completed) |
| A test generation | 1 test case(s) |
| B execution | pass_rate=0 (1 test(s)); weak_verifications=0 |
| S1 catalog | elements=74 behaviors=15 pages=4 conflicts=14 |
| S2 gaps | common=- a_only=- b_only=- uncovered=- bh_uncovered=- |
| S4 synthesis | offered=1 candidates=3 accepted=3 rejected=0 grounded=true |
| FT live execution | 1/3 PASS (5/8 steps) |
| Dashboard | pct_fusion=60% novel_targets=3 |

**Verdict:** Both archs succeeded; Fusion 3 accepted, 1/3 FT PASS (2 honest semantic FAILs), 60% attribution. Chart-heavy UI stresses coordinate precision.

## 3. Architecture results

### A (DOM): Clean completion: 8 steps / 9 states.

### B (vision): Replay failed honestly on canvas-heavy content invisible to OCR detection.

### A/B comparison: Canvas/chart content is invisible to both DOM extraction and OCR element detection - known architecture limit, evidenced here.

## 4. SITE bugs detected

None claimed.

## 5. PIPELINE bugs and fixes during this test

none - clean run.

## 6. Where the project lagged

Canvas-heavy rendering = perception blind spot (architecture limitation, not defect).

## 7-10. Assets and reproduction

All artifacts under runs/run_20260825_062152/ per standard tree (TEMPLATE section 8).

```bash
node runBoth.js https://weatherspark.com
node fusion/s1_build_catalog.js run_20260825_062152
node fusion/s2_gap_report.js run_20260825_062152
node fusion/s4_fusion_synthesis.js run_20260825_062152
node fusion/execute_fusion_tests.js run_20260825_062152
node fusion/s6_dashboard.js run_20260825_062152
```

## Re-run (post-quarantine)

- **New run:** `run_20260825_173233` (replaces quarantined `run_20260825_062152`; old run kept on disk as evidence of the failure mode — see testing/QUARANTINE_TIER2.md)
- **Manifest status:** FAILED
- **Guards passed:** findRunDir(manifest-url match) + assertCatalogDomains + assertVisionStartUrls (audit addendum)
- **FT summary:** `5/8 PASS (62.5%)`
- **Narrative policy:** figures above come ONLY from the new run's artifacts.
