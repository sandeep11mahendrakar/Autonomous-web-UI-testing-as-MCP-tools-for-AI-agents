# SITE TEST REPORT - Archive.org (Internet Archive)

## 1. Metadata

| Field | Value |
|---|---|
| Site | Archive.org (Internet Archive) |
| URL | `https://archive.org` |
| Test date | 2026-08-26 |
| Unified run ID | `run_20260825_235819` |
| Run folder | `runs/run_20260825_235819/` |
| LLM provider / model (A, B, Fusion) | openrouter / stealth/ox-alpha (S4 reasoning=low; 1 S4 call, 372 prompt tokens) |
| Repo state | branch `after-tier-2` @ W3 window (tier3_w3.cjs hardened same commit) |
| Explorer | W3 / ox-alpha CLI (serial-C) via `testing/tier3_w3.cjs` |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Status | Headline number | Artifact source |
|---|---|---|---|
| A exploration | ⚠️ thin | memory log empty → 0 test cases generated | `runs/run_20260825_235819/dom/exploration_summary.json`, `dom/test_cases.json` |
| A test generation | ❌ | 0 (generator refused: "Memory log is empty") | `runs/run_20260825_235819/dom/test_cases.json` |
| B exploration | ⚠️ partial_success | minimal candidates on JS-heavy landing | `runs/run_20260825_235819/vision/outputs/*_exploration_result.json` |
| B test execution | ⚠️ | 0 tests to execute | `runs/run_20260825_235819/vision/outputs/execution_results.json` |
| S1 catalog | ✅ | 76 elements / 1 behavior / 2 pages | `runs/run_20260825_235819/fusion/catalog.json` |
| S2 gap report | ✅ | deterministic, zero-LLM | `runs/run_20260825_235819/fusion/gap_report.json` |
| S4 fusion synthesis | ✅ ran honestly | **0 gaps offered → 0 accepted** (1 LLM call @ 372 tokens; nothing executable to fuse) | `runs/run_20260825_235819/fusion/fusion_report.json` |
| FT live execution | ➖ not executable | no fusion_tests.json (S4 accepted 0) — executor correctly refused | `fusion/execute_fusion_tests.js` output |
| S6 dashboard | ✅ | 0 final tests, 0% (0/0) — honest zero | `runs/run_20260825_235819/fusion/dashboard_data.json` |

**Verdict:** THIN-RUN (honest). Pipeline completed end-to-end mechanically
(folder_purity PURE 4/4) but archive.org's landing page yielded almost nothing
to either architecture: catalog collapsed to 76 elements / 2 pages and the
executability filter offered S4 zero gap candidates. Zero tests were produced
by anyone — recorded as an honest zero, NOT a failure of the guards. This is
valid campaign data per Tier-3 policy ("blocked IS data" applies equally to
thin renders).

## 3. Architecture results

### 3.1 Architecture A (DOM)
- Exploration produced an empty memory log ("Memory log is empty — cannot
  generate test cases"); manifest records A=success but with no usable steps.
- Consistent with a JS-bootstrapped landing page: static HTML at load time
  carries little interactive content before hydration.

### 3.2 Architecture B (vision)
- partial_success: visual pipeline captured the landing but found no
  confident actionable candidates; no replay suite was generated.

### 3.3 A/B comparison notes
- Both architectures starved simultaneously — rare; usually one side sees
  something. Points at client-rendered content gating rather than
  architecture-specific blindness.

## 4. SITE bugs detected

None claimed against archive.org. The thin render is consistent with a
bot-challenge/heavy-JS bootstrap (compare goodreads attempt-1 blank-render,
W5's finding) — recorded as environment behavior, not a site defect.

## 5. PIPELINE bugs & fixes found during this test

- **Driver robustness (fixed):** `execute_fusion_tests.js` exits nonzero when
  `fusion_tests.json` is absent; `tier3_w3.cjs` treated that as fatal and
  crashed BEFORE s6/purity could run. Fixed in-driver: missing-fusion-tests is
  now a SOFT-FAIL — FT skipped, s6/purity/extract still run so the run lands
  in the ledger honestly. Files touched: `testing/tier3_w3.cjs`. Verified:
  manual completion of this run's chain (below) + reuse for #32.

## 6. Where the project lagged

- No SPA-hydration wait strategy exists pre-exploration (backlog A4 class);
  both archs depend on post-load content.
- S4's executability filter correctly refused to fabricate candidates from an
  untestable catalog — the honesty mechanism worked as designed.

## 7. Metrics table

```
A: steps=0(memory log empty) states=- urls=1 errors=0
B: partial_success, 0 generated tests, replay n/a
S1: elements=76 behaviors=1 pages=2 conflicts=(see catalog)
S2: deterministic pass, no uncovered-actionable set worth offering
S4: offered=0 candidates=0 accepted=0 rejected=0 grounded=n/a (llm_calls=1)
FT: not executable (no fusion_tests.json) - executor refusal correct
Dashboard: total_tests=0 ; pct_fusion=0% (0/0 honest)
folder_purity: PURE 4/4 checks
Offline suites after run: 143/143 PASS
Duration: pipeline=3min total cycle=~3min
```

## 8. Asset index

Standard tree under `runs/run_20260825_235819/`; extract snapshot
`testing/extract_run_20260825_235819.json`.

## 9. Recommendations for next runs

1. Pre-extraction hydration wait (network-idle + settle) would likely unlock
   this site class; belongs with backlog A4 (PARKED post-campaign).
2. If re-attempted, go direct to a content page (e.g. a details/collection
   URL) rather than the JS-heavy landing.
3. Driver soft-fail path proven; keep it.

## 10. Reproduction commands

```bash
node testing/tier3_w3.cjs archive_org https://archive.org
# manual equivalent + completion after soft-fail:
node fusion/s6_dashboard.js run_20260825_235819
node testing/folder_purity.js run_20260825_235819
node testing/extract_run.js run_20260825_235819
```
