# SITE TEST REPORT - GlobalSQA Example Pages Hub

## 1. Metadata

| Field | Value |
|---|---|
| Site | GlobalSQA Example Pages Hub |
| URL | https://www.globalsqa.com/examplepages/ |
| Test date | 2026-08-26 (D11 final batch) |
| Unified run ID | `run_20260826_023441` |
| Run folder | `runs/run_20260826_023441/` |
| Worker | serial-B / ox-alpha CLI window (Tier-3 final batch) |
| Env budget | MAX_STEPS=25 MAX_STATES=20 ARCH_A_TIMEOUT_MS=1500000 (per D7/D11) |
| Report status | FINAL — purity PURE |

## 2. Verdict snapshot

| Stage | Result |
|---|---|
| Overall run | **SUCCESS** (both archs) |
| A exploration | success: 25 steps / 18 states / 11 urls (max_steps_reached); ext-nav guard blocked github/gitlab/bitbucket/drive 4×; one honest download-link goto abort (git-cheatsheet.pdf) |
| A test generation | 1 test case (TC001, 8-step workflow replay) |
| B exploration + execution | success stage; replay 0/1 honest FAIL (verification skipped ×1, unresolved target ×1) |
| S1 catalog | elements=112 behaviors=31 pages=13 conflicts=2 |
| S2 gaps | quiet-page + actionable candidates per gap_report.json |
| S4 synthesis | offered=26 candidates=10 accepted=8 rejected=2 (strict grounding) |
| FT live execution | **7/8 PASS** (16/17 steps), targets_preverified=9 |
| Dashboard | pct_fusion=66.7% (8/12 final tests fusion-created; 3 A + 1 B) · novel_targets=17 |
| folder_purity | **PURE 4/4** — manifest host / visited urls / start_url / all 13 page_keys = www.globalsqa.com |

**Verdict:** strongest D11-batch result — both architectures healthy, fusion
composed 8 grounded tests of which 7 passed live against the real site.

## 3. Architecture results

### A (DOM): Full-budget completion at the trimmed step cap (25). Five fill
actions exercised hub search/subscribe inputs; external navigation attempts to
github/gitlab/bitbucket/google-drive were each blocked by the scope guard and
recorded honestly rather than followed.

### B (vision): Exploration succeeded; the single recorded replay FAILED live
honestly (one skipped verification, one unresolved target — no fake pass).

### A/B comparison: A contributed 3 final tests, B contributed 1, fusion added
8 — the complementary mix Tier-1/Tier-2 documented, with fusion carrying the
majority share on a link-dense hub page.

## 4. SITE bugs detected

None claimed — hub pages behaved per spec. External download links (PDF
cheatsheet) abort page.goto by design; recorded as environment behavior.

## 5. PIPELINE bugs and fixes during this test

none — clean run under the extended #24 provenance guard (97a29cb lineage);
zero CONTAMINATION_REJECTS this time (sequential window held).

## 6. Where the project lagged

B's single unresolved target keeps vision-only coverage bounded; coordinate
execution remains V2 backlog #1.

## 7-10. Assets and reproduction

All artifacts under `runs/run_20260826_023441/`.

```bash
node runBoth.js https://www.globalsqa.com/examplepages/
node fusion/s1_build_catalog.js run_20260826_023441
node fusion/s2_gap_report.js run_20260826_023441
node fusion/s4_fusion_synthesis.js run_20260826_023441
node fusion/execute_fusion_tests.js run_20260826_023441
node fusion/s6_dashboard.js run_20260826_023441
```
