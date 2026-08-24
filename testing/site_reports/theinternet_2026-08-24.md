# Site Test Report — The Internet (Heroku) — 2026-08-24

## 1. Metadata

| Field | Value |
|---|---|
| Site | The Internet — edge-case zoo (Sauce Labs) |
| URL | `https://the-internet.herokuapp.com` |
| Test date | 2026-08-24 |
| Unified run ID | `run_20260824_101451` |
| Repo state | `capstone-final-integrated`; external-domain guard added this session |
| Explorer | ox-alpha (opencode) |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Status | Headline number |
|---|---|---|
| A exploration | ✅ | 6 steps / 5 states across abtest, add_remove_elements, basic_auth, broken_images, challenging_dom |
| A test generation | ✅ | 5 grounded tests (external link x2, edit/delete hash links, dynamic buttons) |
| B exploration | ⚠️ **scope leak** | 12 steps / 9 states — followed footer links to github.com AND filled a GitHub login form |
| B test execution | ❌ replay FAIL | step 4 `no_elements_in_current_state` (safe failure) |
| S1 catalog | ✅ | **273 elements / 17 behaviors / 10 pages / 32 conflicts** |
| S2 gap report | ✅ | element coverage 2% (267 vision-only); bh coverage 24%; 32 conflicts |
| S4 fusion synthesis | ✅ honest zero | 3 candidates all rejected (`action_mismatch` ×2, `no_actionable_step`) |
| FT live execution | — | none to execute |
| S6 dashboard | ✅ | **0% fusion-attributable** (0 of 6 tests) |

## 3. Pipeline findings during this test

| # | Finding | Outcome |
|---|---|---|
| 1 | **External-domain guard WORKS on A**: attempted navigation to elementalselenium.com blocked twice mid-flow (`⛔ External domain — out of scope, going back`); no out-of-scope state adopted | Feature verified live |
| 2 | **UUID-id selectors crash**: challenging_dom generates ids starting with digits (`#9a2f…`); `querySelectorAll('#9a2f…')` throws SyntaxError | FIXED immediately in `domExtractor.js`: non-CSS-valid ids now emit `[id="…"]` attribute selectors |
| 3 | **Architecture B has NO external-domain guard**: it wandered to github.com/saucelabs/the-internet and typed seeded-style values into GitHub's login form | Backlog item elevated: port the origin guard into B's explorer before any Tier-2/3 runs (typing credentials into third-party forms is unacceptable) |
| 4 | S4 honest zero: quiet-page gaps were pure navigation targets | Correct behavior |

## 4. SITE bugs detected

None new — the site IS the bug zoo; our pipeline handled hovers/DOM challenges
without crashing. Challenging-DOM buttons exercised via fixed attribute
selectors post-fix (validated by suites).

## 5. Metrics table

```
A: steps=6 states=5 urls=5 errors=2(selector SyntaxErrors pre-fix) ; external guard fired 2x
B: steps=12 states=9 urls=6 generated_tests=1 replay=0_pass/1_fail ; SCOPE LEAK to github.com
S1: observations=583 elements=273 behaviors=17 pages=10 conflicts=32
S2: el uncovered_actionable=170 (cov 2%) ; bh cov 24% ; conflicts=32
S4: offered=5 candidates=3 accepted=0 grounded=true (honest zero)
Dashboard: total_tests=6 (A=5 B=1 fusion=0) ; pct_fusion=0%
Offline suites: 91/91 PASS after UUID-selector fix
```

## 6. Recommendations

1. **Port external-domain guard to Architecture B (HIGH priority)** — credential-typing on third-party sites must be impossible.
2. Re-test challenging_dom with the attribute-selector fix for full button coverage.

## 7. Reproduction commands

```bash
node runBoth.js https://the-internet.herokuapp.com
node fusion/s1_build_catalog.js run_20260824_101451
node fusion/s2_gap_report.js run_20260824_101451
node fusion/s4_fusion_synthesis.js run_20260824_101451
node fusion/s6_dashboard.js run_20260824_101451 --validate
```
