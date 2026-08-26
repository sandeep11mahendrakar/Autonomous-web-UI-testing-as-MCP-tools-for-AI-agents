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

> **Scope note (T202):** the table and verdict line below describe the ORIGINAL
> run `run_20260825_055129`, whose B side was fixture-sourced (host mismatch,
> QUARANTINE_TIER2 row 14). They are kept verbatim as contamination evidence
> and are NOT citable. The current authoritative figures are in
> [Re-run (post-quarantine)](#re-run-post-quarantine) at the bottom of this
> report, from `run_20260825_163448` (all attribution guards green).

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

### B (vision): Post-quarantine re-run (`run_20260825_163448`): exploration
terminated shallowly (`max_depth_reached`; 2 states observed — the docs tree is
link-dense but visually static, so YOLO+OCR surfaced few actionable targets).
The single generated replay test FAILED live: 1 step's verification method was
skipped and 1 target unresolved, while the stale-coordinate guard correctly
prevented 2 out-of-date clicks (weak_verifications=0 — no fake passes). The
original run's B row in §2 is quarantined evidence (fixture-sourced host) and
is no longer citable.

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

## Re-run (post-quarantine)

- **New run:** `run_20260825_163448` (replaces quarantined `run_20260825_055129`; old run kept on disk as evidence of the failure mode — see testing/QUARANTINE_TIER2.md)
- **Manifest status:** PARTIAL_FAILURE
- **Guards passed:** findRunDir(manifest-url match) + assertCatalogDomains + assertVisionStartUrls (audit addendum)
- **FT summary:** `1/8 PASS (12.5%)`
- **Narrative policy:** figures above come ONLY from the new run's artifacts.

### Full stage results (all values from `testing/extract_run.js run_20260825_163448`)

| Stage | Result |
|---|---|
| Overall run | PARTIAL_FAILURE |
| A exploration | timeout again at the internal 900s cap (third occurrence on this mega-DOM site) |
| A test generation | 0 test case(s) |
| B execution | 0/1 PASS (FAILED live; verification skipped x1, unresolved target x1, stale-coordinate guard blocked x2, weak_verifications=0) |
| B exploration | `max_depth_reached`, 2 states observed, source_url verified `https://docs.python.org/3/` |
| S1 catalog | elements=605 behaviors=17 pages=17 conflicts=56 |
| S4 synthesis | offered=19 candidates=11 accepted=8 rejected=3 (2× max_tests_reached, 1× action_mismatch; grounding strict) |
| FT live execution | 1/8 PASS (9/16 steps), targets_preverified=1 |
| Dashboard | pct_fusion=88.9% novel_targets=10 |

### Narrative

Fusion attribution is high (88.9%) for a structural reason: A timed out and
contributed zero tests, so nearly every executed fusion test is novel by
construction. The honest headline is the absolute FT pass rate: 1/8 against
the original contaminated run's 7/7. Under A-timeout conditions the fusion
chain loses A's grounded candidates and leans on vision-only targets whose
live verification mostly fails — consistent with the decontaminated pattern
first seen in `run_20260825_134803` (2/8). B's own replay failure (skipped
verification + unresolved target, with two stale clicks prevented by the
guard) is recorded as a real finding about visually-static documentation
sites, not retried into a pass. Report status stays PARTIAL_FAILURE; no
QUARANTINE marker remains because all three attribution guards passed on
artifacts whose hosts match the manifest.
