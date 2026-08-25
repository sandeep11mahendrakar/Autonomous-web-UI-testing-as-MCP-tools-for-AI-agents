# SITE TEST REPORT - Python.org Documentation

## 1. Metadata

| Field | Value |
|---|---|
| Site | Python.org Documentation |
| URL | https://docs.python.org/3/ |
| Test date | 2026-08-25 |
| Unified run ID | `run_20260825_055129` |
| Run folder | `runs/run_20260825_055129/` |
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
| S1 catalog | elements=583 behaviors=14 pages=10 conflicts=48 |
| S2 gaps | common=- a_only=- b_only=- uncovered=- bh_uncovered=- |
| S4 synthesis | offered=17 candidates=8 accepted=7 rejected=1 grounded=true |
| FT live execution | 7/7 PASS (17/17 steps) |
| Dashboard | pct_fusion=77.8% novel_targets=12 |

**Verdict:** Largest real-world-docs catalog of Tier 2 (583 elements / 48 conflicts); 7/7 Fusion FTs PASSED live (17/17 steps), 77.8% attribution, 12 novel targets.

## 3. Architecture results

### A (DOM): Timed out under Groq TPD exhaustion; B fatal ECONNREFUSED:5000 - vision service port collided with the concurrently-running repeatability study (contamination disclosed in REPEATABILITY.md).

### B (vision): Could not complete replay due to service-port conflict; recorded honestly rather than retried silently.

### A/B comparison: Catalog overwhelmingly vision-only (deep nav trees); cross_page_ref validator rejection shows strict page-scoped grounding works.

## 4. SITE bugs detected

None claimed.

## 5. PIPELINE bugs and fixes during this test

Port-conflict contamination between concurrent studies - night-chain now waits for repeatability completion (fixed in chain design).

## 6. Where the project lagged

Concurrent-study interference degraded B; docs sites have few interactive behaviors by nature.

## 7-10. Assets and reproduction

All artifacts under runs/run_20260825_055129/ per standard tree (TEMPLATE section 8).

```bash
node runBoth.js https://docs.python.org/3/
node fusion/s1_build_catalog.js run_20260825_055129
node fusion/s2_gap_report.js run_20260825_055129
node fusion/s4_fusion_synthesis.js run_20260825_055129
node fusion/execute_fusion_tests.js run_20260825_055129
node fusion/s6_dashboard.js run_20260825_055129
```


## Re-run (decontaminated) — run_20260825_134803

- New run ID: `run_20260825_134803` (replaces contaminated `run_20260825_055129` above; old numbers kept as evidence).
- Status: PARTIAL_FAILURE | A: TIMEOUT (internal A 900s cap) | B: OK 1/1 PASS (weak verif)
- S4: 8/9 accepted | FT live: 2/8 PASS | Fusion-attributable: 88.9%
- Same revision as lambdatest: A hit its internal 900s cap again despite fresh quota (mega-DOM docs tree), so this run is also NOT fully decontaminated for A. FT live fell to 2/8 vs the original 7/7 — high variance under A-timeout conditions; recorded honestly as a finding.
