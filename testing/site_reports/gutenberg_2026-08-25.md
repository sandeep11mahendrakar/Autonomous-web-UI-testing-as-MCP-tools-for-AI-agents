# SITE TEST REPORT - Project Gutenberg

## 1. Metadata

| Field | Value |
|---|---|
| Site | Project Gutenberg |
| URL | https://www.gutenberg.org |
| Test date | 2026-08-25 |
| Unified run ID | `run_20260825_060707` |
| Run folder | `runs/run_20260825_060707/` |
| LLM (A/B) exploration | Groq gpt-oss-120b / gpt-oss-20b (TPM/TPD-paced night run) |
| LLM (S4/FT) completion | OpenRouter stealth/ox-alpha, reasoning=low, FUSION_MAX_TOKENS=4000 |
| Repo state | branch capstone-tier2-prep |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Result |
|---|---|
| Overall run | SUCCESS |
| A exploration | success (24 steps / 15 states / 11 urls; termination: max_states_reached) |
| A test generation | 3 test case(s) |
| B execution | pass_rate=1 (1 test(s)); weak_verifications=0 |
| S1 catalog | elements=319 behaviors=30 pages=17 conflicts=13 |
| S2 gaps | common=- a_only=- b_only=- uncovered=- bh_uncovered=- |
| S4 synthesis | offered=28 candidates=8 accepted=6 rejected=2 grounded=true |
| FT live execution | 6/6 PASS (9/9 steps) |
| Dashboard | pct_fusion=54.5% novel_targets=16 |

**Verdict:** First full SUCCESS-status Tier-2 site: both archs green, 6/6 Fusion FTs PASSED, 54.5% attribution, 16 novel targets - largest novel-target count of the campaign.

## 3. Architecture results

### A (DOM): Healthy exploration: 24 steps / 15 states, terminated max_states_reached.

### B (vision): Replay passed 1/1.

### A/B comparison: Biggest behavior space so far (30 behaviors); validator rejected 2 cross-page-ref candidates, keeping grounding strict.

## 4. SITE bugs detected

None claimed.

## 5. PIPELINE bugs and fixes during this test

none - clean run.

## 6. Where the project lagged

Search-heavy site means many quiet pages; several gaps unusable by design.

## 7-10. Assets and reproduction

All artifacts under runs/run_20260825_060707/ per standard tree (TEMPLATE section 8).

```bash
node runBoth.js https://www.gutenberg.org
node fusion/s1_build_catalog.js run_20260825_060707
node fusion/s2_gap_report.js run_20260825_060707
node fusion/s4_fusion_synthesis.js run_20260825_060707
node fusion/execute_fusion_tests.js run_20260825_060707
node fusion/s6_dashboard.js run_20260825_060707
```

## Re-run (post-quarantine)

- **New run:** `run_20260825_165819` (replaces quarantined `run_20260825_060707`; old run kept on disk as evidence of the failure mode — see testing/QUARANTINE_TIER2.md)
- **Manifest status:** PARTIAL_FAILURE
- **Guards passed:** findRunDir(manifest-url match) + assertCatalogDomains + assertVisionStartUrls (audit addendum)
- **FT summary:** `4/4 PASS (100%)`
- **Narrative policy:** figures above come ONLY from the new run's artifacts.
