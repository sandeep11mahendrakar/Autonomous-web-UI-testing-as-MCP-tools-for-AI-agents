# SITE TEST REPORT - SahiTest Demo - Tier-2 #17 fresh re-run (D9 replacement lane)

## 1. Metadata

| Field | Value |
|---|---|
| Site | Sahi Test Demo |
| URL | `http://www.sahitest.com/demo/` |
| Test date | 2026-08-26 |
| Unified run ID | `run_20260826_010716` |
| Run folder | `runs/run_20260826_010716/` |
| Repo state | branch `after-tier-2` @ `93a010f` |
| Explorer | replacement worker / ox-alpha (opencode) |
| Trimmed env | MAX_STEPS=25, MAX_STATES=20, ARCH_A_TIMEOUT_MS=1500000 |
| Report status | FINAL - fresh guard-guarded re-run behind all D9 guards |

## 2. Verdict snapshot

| Stage | Result |
|---|---|
| Overall run | SUCCESS (A success 201s, B success 95s at execution stage) |
| Purity | **PURE 4/4** (`folder_purity.js`, exclusive lock window) |
| A exploration | completed: 8 steps / 8 states / 4 unique URLs, 4 fills + 2 clicks, 0 errors |
| A test generation | 1 test case (TC001, 7-step fill/click workflow) |
| B exploration + execution | max_depth_reached in exploration; replay 0/1 FAIL - verification method `none` (**honest fail**, no oracle satisfied), 1 stale-coordinate prevented |
| S1 catalog | elements=131 behaviors=12 pages=5 conflicts=3 |
| S4 synthesis | offered=3 accepted=3 grounded=true (0 rejections) |
| FT live execution | **3/3 PASS** (steps 9/9), targets_preverified=1, warnings=0 |
| Dashboard | total_final_tests=5 (A1/B1/fusion3), pct_fusion=**60%**, novel_targets=4 |

## 3. Architecture results

### A (DOM): clean completion - exercised the demo's form flows (4 fills,
2 clicks across 4 pages) and produced a 7-step recorded workflow replay test.

### B (vision): exploration hit max_depth on the demo's frame-heavy structure;
its generated replay executed but could not satisfy ANY verification oracle -
recorded as an honest FAIL (verification method `none`), exactly the kind of
weak-evidence transparency the campaign requires. One stale-coordinate
prevention fired (fuzzy matcher working).

### Fusion: the star of this run - composed 3 tests from the gap report, all
accepted, and ALL THREE passed live execution (9/9 steps). Fusion-attributable
share 60% with 4 novel targets exercised.

## 4. SITE bugs detected

None claimed - SahiTest is a deliberately simple demo property; the B-side
replay failure reflects oracle/frame limitations of the pipeline, not a
demonstrated site defect.

## 5. PIPELINE notes from this run

1. Prior quarantined-era attempt (`run_20260825_194511`, cited at 33.3% in
   the old INDEX row) predates the strict-attribution hardening and was
   voided for re-run by Master directive; this fresh run supersedes it.
   Old folder kept on disk.
2. Full D9 protocol: availability HTTP 200 pre-flight; `.campaign.lock`
   held end-to-end by testing/tier3_repl.cjs; extended #24 collector guard
   active (zero rejects needed under exclusive lock); purity PURE before any
   report patching.

## 6. Where the project lagged

- Frame-based demos remain hard for vision exploration (max_depth reached).
- A single-arch dependency risk: had fusion not composed passing tests, the
  site would have carried only weak/honest-fail evidence.

## 7. Assets and reproduction

All artifacts under `runs/run_20260826_010716/`:

```bash
node testing/tier3_repl.cjs sahitest_demo http://www.sahitest.com/demo/
node testing/folder_purity.js run_20260826_010716   # pure:true 4/4
```

Extract snapshot: `testing/extract_run_20260826_010716.json`.
