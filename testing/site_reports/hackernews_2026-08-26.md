# Hacker News

## 1. Metadata

| Field | Value |
|---|---|
| Site | `Hacker News` |
| URL | `https://news.ycombinator.com` |
| Test date | 2026-08-26 (run started 2026-08-25T18:10Z) |
| Unified run ID | `run_20260825_234052` |
| Run folder | `runs/run_20260825_234052/` |
| LLM provider / model (A, B, Fusion) | openrouter / stealth/ox-alpha (reasoning=low; 429 backoff observed once) |
| Repo state | branch after-tier-2 @ f755f59+ (Tier-3 W1 window) |
| Explorer | W1 / ox-alpha serial-1 (Tier-3 D6 pair #21+#26) |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Status | Headline number | Artifact source |
|---|---|---|---|
| A exploration | ⚠️ timeout @900s cap | 17 memory entries (16 navigate + 1 fill) | `runs/<id>/dom/memory_log.json` |
| A test generation | ❌ none | 0 grounded tests (budget exhausted pre-generation) | `runs/<id>/dom/test_cases.json` |
| B exploration | ⚠️ partial_success | termination `no_candidates_remaining`, 11s execution stage | `runs/<id>/vision/outputs/*_exploration_result.json` |
| B test execution | ➖ n/a | no B replay candidates produced | `runs/<id>/vision/outputs/execution_results.json` |
| S1 catalog | ✅ | 102 elements / 17 behaviors / 9 pages / **0 conflicts** (minimal DOM as preflight predicted) | `runs/<id>/fusion/catalog.json` |
| S2 gap report | ✅ ran | fed S4 candidate pool | `runs/<id>/fusion/gap_report.json` |
| S4 fusion synthesis | ✅ | 33 offered → **8 accepted / 2 rejected**, grounded | `runs/<id>/fusion/fusion_report.json` |
| FT live execution | ✅ executed / ⚠️ result | **1/8 PASS** (steps 9/16) — see §6 for the single failure class | `runs/<id>/fusion/ft_execution_results.json` |
| S6 dashboard | ✅ | **100% fusion-attributable** (8 of 8 final tests fusion-created) | `runs/<id>/fusion/dashboard_data.json` |

One-paragraph verdict: pipeline ran end-to-end with guards green
(folder_purity PURE 4/4; every visited host + catalog page_key matched
`news.ycombinator.com`). Both explorers under-delivered on this site shape
(A burned its 900s budget crawling listing pages and never generated tests;
B found no remaining candidates after its quick pass), so the entire test
suite was S4-fusion-created from the shared catalog — the first Tier-3 run at
100% fusion attribution. One of eight passed live; all seven failures share a
single root cause documented in §6.

## 3. Architecture results

### 3.1 Architecture A (DOM)
- 17 entries over ~15 min: 16 `navigate` across front page / newest / ask /
  newcomments / item pages + 1 `fill`; terminated on ARCH_A_TIMEOUT cap.
- 0 test cases generated (same mega-budget issue as #21 wikipedia).

### 3.2 Architecture B (vision)
- `partial_success`; exploration ended `no_candidates_remaining` quickly.
- No replay suite; B contributed elements to the S1 merge only.

### 3.3 A/B comparison notes
- Zero S1 conflicts — HN's table-heavy DOM is unambiguous to both parsers,
  unlike the skin-duplicate noise seen on wikipedia.
- Both archs saw the same 9-page neighborhood; fusion had the full graph to
  compose from, which is why acceptance was high (8/33 offered).

## 4. SITE bugs detected
None site-side (HN served consistently; no consent wall, no bot check).
Coverage note: user-profile and external-article targets were cataloged but
not verifiable live this run (see §6).

## 5. PIPELINE bugs & fixes found during this test
none — clean run mechanically. Finding (not fixed in-campaign per human
freeze): fusion composed cross-page tests whose step-2 click targets live on
SPECIFIC item pages, but step-1 `navigate` used the bare `/item` URL (no id
query param), which renders a near-empty placeholder page — hence 7×
`selector_not_found`. Fix candidate post-freeze: S4 should require navigations
to carry the full resolved href (with query) when the target element lives on
a parameterized page.

## 6. Where the project lagged
- **Single-root-cause FT failure class:** 7/7 FT failures are
  `selector_not_found` on bare `/item` pages (body_text_length=13). Zero stale
  clicks, zero unresolved coordinates — the guard layer was perfect; the gap
  is in S4 cross-page URL resolution (parameterized hrefs).
- **Product-of-design:** A-side 900s budget again insufficient before test
  generation (second occurrence today — systemic for link-dense sites).
- FT001's objective (author-profile nav) is valid; only the entry URL was
  wrong — cheap re-run win once S4 fix lands.

## 7. Metrics table

```
A: steps=17(16nav+1fill) states=n/a urls=9 clicks=0 fills=1 errors=0(900s timeout)
B: steps=n/a(no_candidates_remaining) states=n/a urls=0 generated_tests=0 replay=n/a
S1: observations=n/a elements=102 behaviors=17 pages=9 conflicts=0
S2: el common/n-a a_only/n-a b_only/n-a uncovered=n-a ; bh uncovered=n-a ; conflicts=0
S4: offered=33 candidates=31 accepted=8 rejected=2 grounded=true
FT: total=8 passed=1 failed=7 steps 9/16 (all 7 fails: selector_not_found @bare /item)
Dashboard: total_tests=8 (A=0 B=0 fusion=8) ; pct_fusion=100%
Offline suites after run: 143/143 PASS (pre-run baseline; Master consolidates aggregates)
Duration: A=900s(cap) B=11s(exec stage) S4 call=44s FT exec=25s
```

## 8. Asset index

| Asset | Path |
|---|---|
| Run manifest | `runs/run_20260825_234052/run_manifest.json` |
| A memory log | `runs/run_20260825_234052/dom/memory_log.json` |
| A screenshots | `runs/run_20260825_234052/dom/screenshots/` |
| B outputs | `runs/run_20260825_234052/vision/outputs/` |
| S1 catalog | `runs/run_20260825_234052/fusion/catalog.json` |
| S4 fusion tests / report | `runs/run_20260825_234052/fusion/fusion_tests.json`, `fusion_report.json` |
| FT execution results | `runs/run_20260825_234052/fusion/ft_execution_results.json` |
| FT evidence screenshots | `runs/run_20260825_234052/fusion/ft_execution_evidence/FT*/` |
| Dashboard data | `runs/run_20260825_234052/fusion/dashboard_data.json` |
| Extract snapshot | `testing/extract_run_20260825_234052.json` |

## 9. Recommendations for next runs
1. S4 fix (post-campaign): resolve parameterized hrefs fully before composing
   cross-page steps; would likely flip most of the 7 honest fails.
2. Same A-budget remedy as #21 (raise cap or interactive-first ranking).
3. HN is otherwise an ideal light smoke-site for pipeline regression checks
   (zero conflicts, fast stages).

## 10. Reproduction commands

```bash
node testing/tier3_w1.cjs hackernews https://news.ycombinator.com
# equivalent manual chain:
node runBoth.js https://news.ycombinator.com
node fusion/s1_build_catalog.js run_20260825_234052
node fusion/s2_gap_report.js run_20260825_234052
node fusion/s4_fusion_synthesis.js run_20260825_234052
node fusion/execute_fusion_tests.js run_20260825_234052
node fusion/s6_dashboard.js run_20260825_234052
node testing/folder_purity.js run_20260825_234052   # pure=true required
```
