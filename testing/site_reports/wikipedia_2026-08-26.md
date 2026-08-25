# Wikipedia — Web Testing article

## 1. Metadata

| Field | Value |
|---|---|
| Site | `Wikipedia (Web_testing article)` |
| URL | `https://en.wikipedia.org/wiki/Web_testing` |
| Test date | 2026-08-26 (run started 2026-08-25T17:36Z) |
| Unified run ID | `run_20260825_230647` |
| Run folder | `runs/run_20260825_230647/` |
| LLM provider / model (A, B, Fusion) | openrouter / stealth/ox-alpha (reasoning=low) |
| Repo state | branch after-tier-2 @ c55d838+ (Tier-3 W1 window) |
| Explorer | W1 / ox-alpha serial-1 (Tier-3 D6 pair #21+#26) |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Status | Headline number | Artifact source |
|---|---|---|---|
| A exploration | ⚠️ timeout @900s cap | 18 memory entries (17 navigate + 1 click), 13 pages seen | `runs/<id>/dom/memory_log.json` |
| A test generation | ❌ none | 0 grounded tests (budget exhausted pre-generation) | `runs/<id>/dom/test_cases.json` |
| B exploration | ⚠️ max_depth_reached | 0 urls recorded by summary extractor | `runs/<id>/vision/outputs/*_exploration_result.json` |
| B test execution | ✅ executed / ❌ result | 0/1 pass (honest fail: unresolved target + 2 stale-coordinate prevents) | `runs/<id>/vision/outputs/execution_results.json` |
| S1 catalog | ✅ | 790 elements / 25 behaviors / 13 pages / 62 conflicts | `runs/<id>/fusion/catalog.json` |
| S2 gap report | ✅ ran | no uncovered-summary emitted (see §6) | `runs/<id>/fusion/gap_report.json` |
| S4 fusion synthesis | ✅ | 39 offered → 7 accepted / 3 rejected, all grounded | `runs/<id>/fusion/fusion_report.json` |
| FT live execution | ✅ | **3/7 PASS** (steps 6/14) | `runs/<id>/fusion/ft_execution_results.json` |
| S6 dashboard | ✅ | **87.5% fusion-attributable** (7 of 8 final tests) | `runs/<id>/fusion/dashboard_data.json` |

One-paragraph verdict: pipeline completed end-to-end with guards green
(folder_purity PURE 4/4: manifest host, visited-URL hosts, B start_url host,
8 catalog page_keys all match `en.wikipedia.org`). This is the canonical
"weak-A / strong-fusion" datapoint of Tier-3: A burned its whole 900s budget
navigating Wikipedia's link-dense article tree and never reached test
generation, so 7 of 8 final tests were S4-fusion-created from the shared
catalog, and 3 of those 7 passed live.

## 3. Architecture results

### 3.1 Architecture A (DOM)
- 18 memory entries over ~15 min: 17 `navigate` + 1 `click`; article-tree
  crawling dominated (citation/reference links fan out per section).
- Terminated on the 900s ARCH_A_TIMEOUT cap mid-exploration → 0 test cases.
- No wrong-site drift: every visited host matched the manifest (purity check 2).

### 3.2 Architecture B (vision)
- Termination reason `max_depth_reached`; exploration itself produced usable
  visual DOMs for S1 merge.
- Generated 1 replay test; execution FAILED honestly: 1 unresolved target,
  2 stale-coordinate clicks PREVENTED (guard worked as designed), 0 weak
  verifications.

### 3.3 A/B comparison notes
- A saw breadth (13 pages / 790 elements) but ran out of time;
  B went depth-first and finished but could not ground one replay target.
- S1 merged both views into the campaign's largest Tier-3 catalog so far
  (790 elements); 62 conflicts mostly duplicate nav elements across skins.

## 4. SITE bugs detected
- None site-side (read-only encyclopedia pages behaved as expected).
- Coverage note: search-suggest widget and citation popups were cataloged but
  never exercised by any accepted test (S4 rejected cross-page candidates).

## 5. PIPELINE bugs & fixes found during this test
none — clean run. (Driver: testing/tier3_w1.cjs held .campaign.lock for the
whole cycle and released it after purity PASS.)

## 6. Where the project lagged
- **Product-of-design:** A-side 900s budget is too small for link-dense
  mega-DOMs like Wikipedia; test generation never started. Either raise the
  cap for encyclopedia-class sites or seed A with a step budget weighted to
  interactive elements over plain links.
- **Defect-flavored:** S2 gap report emitted an empty uncovered-summary block
  for this run shape (large catalog, zero A tests) — cosmetic but worth a
  follow-up so dashboards don't show blank sections.
- B's url count in the extraction is 0 despite successful exploration — the
  summary extractor misses vision-side history entries (cosmetic).

## 7. Metrics table

```
A: steps=18(17nav+1click) states=n/a(urls=13) urls=13 clicks=1 fills=0 errors=0(900s timeout)
B: steps=n/a(max_depth_reached) states=n/a urls=0 generated_tests=1 replay=0pass/1fail
S1: observations=n/a elements=790 behaviors=25 pages=13 conflicts=62
S2: el common/n-a a_only/n-a b_only/n-a uncovered=n-a ; bh uncovered=n-a ; conflicts=62
S4: offered=39 candidates=36 accepted=7 rejected=3 grounded=true
FT: total=7 passed=3 failed=4 steps 6/14
Dashboard: total_tests=8 (A=0 B=1 fusion=7) ; pct_fusion=87.5%
Offline suites after run: 143/143 PASS (pre-run baseline; regen pending Master consolidation)
Duration: A=900s(cap) B=232s S4 call=43s FT exec=52s
```

## 8. Asset index

| Asset | Path |
|---|---|
| Run manifest | `runs/run_20260825_230647/run_manifest.json` |
| A memory log | `runs/run_20260825_230647/dom/memory_log.json` |
| A screenshots | `runs/run_20260825_230647/dom/screenshots/` |
| A test cases | `runs/run_20260825_230647/dom/test_cases.json` (empty) |
| B outputs | `runs/run_20260825_230647/vision/outputs/` |
| S1 catalog | `runs/run_20260825_230647/fusion/catalog.json` |
| S4 fusion tests / report | `runs/run_20260825_230647/fusion/fusion_tests.json`, `fusion_report.json` |
| FT execution results | `runs/run_20260825_230647/fusion/ft_execution_results.json` |
| Dashboard data | `runs/run_20260825_230647/fusion/dashboard_data.json` |
| Extract snapshot | `testing/extract_run_20260825_230647.json` |

## 9. Recommendations for next runs
1. Encyclopedia/mega-DOM class: raise ARCH_A_TIMEOUT_MS to 1500s or add
   "interactive-element-first" action ranking for A.
2. Re-use this run as the Tier-3 weak-A/strong-fusion exemplar in the paper.
3. Fix S2 empty-summary emission when catalog exists but A produced 0 tests.

## 10. Reproduction commands

```bash
node testing/tier3_w1.cjs wikipedia https://en.wikipedia.org/wiki/Web_testing
# equivalent manual chain:
node runBoth.js https://en.wikipedia.org/wiki/Web_testing
node fusion/s1_build_catalog.js run_20260825_230647
node fusion/s2_gap_report.js run_20260825_230647
node fusion/s4_fusion_synthesis.js run_20260825_230647
node fusion/execute_fusion_tests.js run_20260825_230647
node fusion/s6_dashboard.js run_20260825_230647
node testing/folder_purity.js run_20260825_230647   # pure=true required
```
