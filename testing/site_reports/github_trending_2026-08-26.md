# SITE TEST REPORT - GitHub Trending

## 1. Metadata

| Field | Value |
|---|---|
| Site | GitHub Trending |
| URL | `https://github.com/trending` |
| Test date | 2026-08-26 |
| Unified run ID | `run_20260825_232415` |
| Run folder | `runs/run_20260825_232415/` |
| LLM provider / model (A, B, Fusion) | openrouter / stealth/ox-alpha (S4 reasoning=low; A timeout was budget-cap, not quota) |
| Repo state | branch `after-tier-2` @ `b206ecb`+ (W3 window) |
| Explorer | W3 / ox-alpha CLI (serial-C) via `testing/tier3_w3.cjs` |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Status | Headline number | Artifact source |
|---|---|---|---|
| A exploration | ⚠️ timeout@900s budget cap | 23 steps / 20 states / 20 URLs, `max_states_reached` | `runs/run_20260825_232415/dom/exploration_summary.json` |
| A test generation | ❌ | 0 grounded tests (budget exhausted before generation stage) | `runs/run_20260825_232415/dom/test_cases.json` |
| B exploration | ⚠️ minimal | 0 multi-page steps (`no_candidates_remaining`) | `runs/run_20260825_232415/vision/outputs/*_exploration_result.json` |
| B test execution | ✅ | 1/1 PASS (weak signal: body_text_fallback ×1, disclosed) | `runs/run_20260825_232415/vision/outputs/execution_results.json` |
| S1 catalog | ✅ | 564 elements / 28 behaviors / 23 pages / 67 conflicts | `runs/run_20260825_232415/fusion/catalog.json` |
| S2 gap report | ✅ | el: 0 common / 23 a_only / 541 b_only; bh: 0 / 23 / 5 | `runs/run_20260825_232415/fusion/gap_report.json` |
| S4 fusion synthesis | ✅ | 46 offered → 5 candidates → **5 accepted / 0 rejected**, all grounded | `runs/run_20260825_232415/fusion/fusion_report.json` |
| FT live execution | ✅ | **3/5 PASS** (10/12 steps) | `runs/run_20260825_232415/fusion/ft_execution_results.json` |
| S6 dashboard | ✅ | **83.3%** fusion-attributable, 12 novel targets | `runs/run_20260825_232415/fusion/dashboard_data.json` |

**Verdict:** full pipeline completed end-to-end with folder_purity PURE 4/4.
GitHub Trending is a heavy real-world SPA-style page: A hit its 900 s budget
cap after mapping the space deeply (20 states), B stayed near-single-page but
landed an honest replay pass, and Fusion carried the value — a perfect-acceptance
S4 round (5/5, zero rejections) executed live at 3/5 with two honest
no-post-action-change failures. Attribution percentage is high partly for the
structural reason documented in RETROSPECTIVE_TIER2 §5b (A generated 0 tests
→ tiny denominator); read it together with the absolute FT score.

## 3. Architecture results

### 3.1 Architecture A (DOM)
- 23 steps / 20 unique states / 20 URLs; termination `max_states_reached`
  (trimmed Tier-3 cap MAX_STATES=20 reached — healthy deep-nav behavior).
- Mix: 20 navigates / 3 clicks / 0 fills; 4 repeat-states skipped; 1 error.
- External navigations blocked by policy and recorded honestly:
  `docs.github.com`, `github.blog`.
- One honest click failure: "Show 12 more topics" button resolved to 6
  elements, first match not visible → Playwright retry loop → 8 s timeout
  (recorded as step error, no crash).
- Test cases generated: 0 — the 900 s orchestrator cap expired during
  exploration; deterministic generation stage never started.

### 3.2 Architecture B (vision)
- Exploration ended immediately: `no_candidates_remaining` on the landing
  state (repo cards are dense composite tiles — few standalone OCR-clean
  targets above the confidence bar).
- Generated 1 replay test; execution **1/1 PASS**, verification method
  `body_text_fallback` (weak class — disclosed, counts as weak per taxonomy).

### 3.3 A/B comparison notes
- Catalog is overwhelmingly B-vision-only (541 b_only vs 23 a_only elements):
  A's DOM extraction saw the repo-card links list; B's visual DOM registered
  hundreds of text spans/buttons. Identity overlap remains ~0 by design
  (conservative canonical identity — see RETROSPECTIVE_TIER2 §4.4).
- 67 classification conflicts recorded, not artificially merged.

## 4. SITE bugs detected

None claimed against github.com itself. Observations (not defects):
- Trending page's "more topics" expander buttons are visually hidden until
  hover — automation-hostile pattern recorded honestly as an A-side click
  timeout.
- Policy-blocked external navs (docs.github.com, github.blog) behaved as
  configured.

"Coverage insufficient to conclude" applies beyond what is listed here.

## 5. PIPELINE bugs & fixes found during this test

none — clean run at the pipeline level (one 429 absorbed by provider
wait-and-retry during S4; no code changes needed this run).

## 6. Where the project lagged

- *Product-of-design:* A's fixed 900 s budget on a mega-DOM site means test
  generation never starts — exploration depth and test generation compete for
  one clock. Trimmed caps (25/20) were tuned for exactly this.
- *Product-of-design:* B's single-page behavior on dense card layouts
  (composite tiles lack OCR-clean standalone targets).
- Weak-signal pass: the only B replay pass used body-text fallback — the
  known verification ceiling (mutation-study finding), not a new defect.
- S4 offered 46 gaps from a 564-element catalog; acceptance quality was
  excellent (5/5 grounded, 3 live passes + 2 honest fails).

## 7. Metrics table

```
A: steps=23 states=20 urls=20 clicks=3 fills=0 errors=1 (timeout@900s budget)
B: states_observed=5 urls=0(explore no_candidates_remaining) generated_tests=1 replay=1_pass/0_fail (weak x1)
S1: elements=564 behaviors=28 pages=23 conflicts=67
S2: el common=0 a_only=23 b_only=541 ; bh common=0 a_only=23 b_only=5
S4: offered=46 candidates=5 accepted=5 rejected=0 grounded=true
FT: total=5 passed=3 failed=2 steps 10/12 (targets_preverified=4)
Dashboard: total_tests=6 (A=0 B=1 fusion=5) ; pct_fusion=83.3% novel_targets=12
Offline suites after run: 143/143 PASS
Duration: A=900s(cap) B=352s total pipeline=15min
folder_purity: PURE 4/4 checks
```

## 8. Asset index

Standard tree under `runs/run_20260825_232415/` per TEMPLATE section 8
(manifest, dom/*, vision/*, fusion/* incl. ft_execution_evidence/, dashboard.html).
Extract snapshot: `testing/extract_run_20260825_232415.json`.

## 9. Recommendations for next runs

1. For mega-DOM listing pages, consider splitting budget: cap exploration at
   ~600 s so deterministic test generation always runs (currently A can time
   out pre-generation, zeroing A-side tests).
2. Keep trimmed MAX_STATES=20 — it fired correctly here.
3. B-side: card-layout pages need tile-level grouping in the visual DOM before
   they yield candidates (V2 perception item, PARKED per human decision).

## 10. Reproduction commands

```bash
node testing/tier3_w3.cjs github_trending https://github.com/trending
# equivalent manual sequence:
node runBoth.js https://github.com/trending
node fusion/s1_build_catalog.js run_20260825_232415
node fusion/s2_gap_report.js run_20260825_232415
node fusion/s4_fusion_synthesis.js run_20260825_232415
node fusion/execute_fusion_tests.js run_20260825_232415
node fusion/s6_dashboard.js run_20260825_232415
node testing/folder_purity.js run_20260825_232415
```
