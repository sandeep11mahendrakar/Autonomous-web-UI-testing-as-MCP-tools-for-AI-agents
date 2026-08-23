# Site Test Report — BrowserStack Demo (bstackdemo) — 2026-08-24

## 1. Metadata

| Field | Value |
|---|---|
| Site | BrowserStack Demo e-commerce |
| URL | `https://bstackdemo.com` |
| Test date | 2026-08-24 |
| Unified run ID | `run_20260824_001108` |
| Run folder | `runs/run_20260824_001108/` |
| LLM provider / model (A, B, Fusion) | openrouter / `stealth/ox-alpha` (reasoning=low) |
| Repo state | branch `capstone-final-integrated`; all work uncommitted |
| Explorer | ox-alpha (opencode) |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Status | Headline number |
|---|---|---|
| A exploration | ✅ | 9 steps / 7 states / 3 URLs (signin variants, contact, privacy) |
| A test generation | ✅ | 5 grounded tests (login-focused incl. negative cases) |
| B exploration | ⚠️ | 4 steps / 2 URLs, terminated `llm_done` early |
| B test execution | ❌ | replay FAIL — `no_elements_in_current_state` at step 1 |
| S1 catalog | ✅ | 53 elements / 9 behaviors / 4 pages / 5 conflicts |
| S2 gap report | ✅ | 20 uncovered elements; 3 uncovered behaviors (bh coverage 67%); 5 conflicts |
| S4 fusion synthesis | ✅ | 1 accepted / 0 rejected, all grounded (`gap_conflict_4`) |
| FT live execution | ⚠️ | 0/1 PASS — navigate PASS, target fill FAIL `label_mismatch` |
| S6 dashboard | ✅ | **14.3% fusion-attributable** (1 of 7 tests) |

**Verdict:** Pipeline ran end-to-end with zero crashes. A produced strong
login-flow tests including negatives; B quit exploration very early
(`llm_done`) and its replay could not resolve its first target. The single
Fusion probe executed but failed semantic verification honestly — the target
is a react-select combobox whose live input label is empty vs the catalog's
OCR-derived "demouser".

## 3. Architecture results

### Architecture A
Explored `/signin` (with favourites/orders query variants), `/contact`,
`/privacy`. Could NOT complete sign-in: credentials are react-select
dropdowns which A's `fill` action cannot operate (needs click-to-open +
option click). 2 execution errors recorded. Tests: TC001 valid login,
TC002 empty-credentials login blocked, TC003 invalid username fails,
TC004 orders-variant signin, TC005 repeated failed attempts stay on page.

### Architecture B
Clicked a product and Sign In, filled one dropdown, then LLM declared done
after only 4 steps. Generated 1 workflow test; live replay failed at step 1
(no matching element in re-detected state) — safe failure, no stale clicks.

### A/B comparison
Zero common elements again (selectors vs visual labels). B contributed the
bulk of raw observations (49 b_only) but little executable structure;
A contributed all runnable selectors.

## 4. SITE bugs detected

| # | Finding | Caught by |
|---|---|---|
| 1 | Sign-in uses non-standard combobox widgets that reject direct text entry — accessibility/usability smell (screen-reader/automation hostile) | FT001 live probe + A's fill failures |

Not caught: cart→checkout flows (neither architecture logged in), offer
banner behaviors, favourites persistence.

## 5. PIPELINE bugs & fixes found during this test

None new during this site (the two CURA-discovered fixes came after this run;
see cura_2026-08-24.md §5). Observed-but-deferred: react-select-style widgets
need a dedicated `select_option` action in A's vocabulary — logged as
enhancement, not fixed here.

## 6. Where the project lagged

- B's anti-laziness guard did not fire effectively: `llm_done` after 4 steps
  on an element-rich site.
- No UI-vocabulary for custom dropdown components (react-select) in either
  architecture → login wall unreached by both.
- Catalog label quality from vision (OCR) causes `label_mismatch` failures
  when executor pre-verifies labels strictly — correct behavior, but shows
  label-space fragility.

## 7. Metrics table

```
A: steps=9 states=7 urls=3 clicks=6 fills=3 errors=2
B: steps=4 states=~4 urls=2 generated_tests=1 replay=0_pass/1_fail
S1: observations=n/a elements=53 behaviors=9 pages=4 conflicts=5
S2: el common=0 a_only=4 b_only=49 uncovered=20 ; bh uncovered=3 ; conflicts=5
S4: offered=n/a candidates=1 accepted=1 rejected=0 grounded=true
FT: total=1 passed=0 failed=1 steps 1/2
Dashboard: total_tests=7 (A=5 B=1 fusion=1) ; pct_fusion=14.3% ; novel_targets=1
Offline suites: 67/67 PASS (post-session state)
```

## 8. Asset index

| Asset | Path |
|---|---|
| Run manifest | `runs/run_20260824_001108/run_manifest.json` |
| A artifacts + tests | `runs/run_20260824_001108/dom/` (memory_log.json, states.json, transitions.json, test_cases.json) |
| A screenshots | `runs/run_20260824_001108/dom/screenshots/` |
| B outputs + evidence | `runs/run_20260824_001108/vision/outputs/`, `vision/storage/screenshots/run_1787510475421/` |
| S1/S2/S4 artifacts | `runs/run_20260824_001108/fusion/{catalog,gap_report,fusion_report}.json` |
| FT results + evidence | `runs/run_20260824_001108/fusion/ft_execution_results.json`, `ft_execution_evidence/FT001/` |
| Dashboard | `runs/run_20260824_001108/fusion/dashboard.html` |

## 9. Recommendations

1. Add `select_option` action support (custom dropdowns) to both architectures.
2. Investigate B's early `llm_done` on rich pages (anti-laziness threshold).
3. Re-test after auth-seed feature exists — most value is behind sign-in.

## 10. Reproduction commands

```bash
node runBoth.js https://bstackdemo.com
node fusion/s1_build_catalog.js run_20260824_001108
node fusion/s2_gap_report.js run_20260824_001108
node fusion/s4_fusion_synthesis.js run_20260824_001108
node fusion/execute_fusion_tests.js run_20260824_001108
node fusion/s6_dashboard.js run_20260824_001108
```
