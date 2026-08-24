# Site Test Report — Automation Exercise — 2026-08-24

## 1. Metadata

| Field | Value |
|---|---|
| Site | Automation Exercise (practice shop with seeded bugs) |
| URL | `https://www.automationexercise.com` |
| Test date | 2026-08-24 |
| Unified run ID | `run_20260824_094432` |
| Repo state | `capstone-final-integrated` @ `a65c6dd` |
| Explorer | ox-alpha (opencode) |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Status | Headline number |
|---|---|---|
| A exploration | ✅ max_states hit | **15 steps / 15 states** — search flow, 5 brand pages, cart, test-cases, API list, login page |
| A test generation | ✅ | 5 grounded tests (search, brand nav, newsletter, nav, login input) |
| B exploration | ⚠️ shallow | 6 steps / 5 states / 2 URLs, terminated `no_valid_candidate_selected` |
| B test execution | ❌ replay FAIL | step 2 unresolved target (pre-existing re-detection weakness) |
| S1 catalog | ✅ | 110 elements / 19 behaviors / 12 pages / 9 conflicts |
| S2 gap report | ✅ | element coverage 14%; **behavior coverage 79%** (best of campaign) |
| S4 fusion synthesis | ✅ honest zero | 0 gap candidates offered — A's behavior coverage left nothing executable |
| FT live execution | — | none to execute |
| S6 dashboard | ✅ | **0% fusion-attributable** (0 of 6 tests) |

## 3. Architecture results

### Architecture A
Search flow worked end-to-end: fill `#search_product` "Blue Top" → click
`#submit_search` → results page. Then systematic brand-page traversal
(Polo, H&M, Madame, Mast & Harbour, Babyhug, Allen Solly Junior), cart page
newsletter fill with seeded email, and navigation to Test Cases / API List /
Login. Filled `[name="email"]` on the login page (seeded). Termination:
`max_states_reached`.

### Architecture B
Homepage → products → category links; quit early when all candidates were
tried/low-confidence. Replay failed at step 2 (`view product` link not found
in re-detected state) — the known vision re-detection weakness, safe failure.

### A/B comparison
Zero element overlap; B added 95 catalog elements but no executable
structure. A's 15/19 behaviors covered → S4 legitimately had nothing to add.

## 4. SITE bugs detected

None new from our pipeline this run (site is designed bug-rich; reaching the
seeded bugs requires account creation + purchase flows = post-auth-seed-v2).

## 5. PIPELINE findings during this test

No new defects. Note: the site serves heavy ad/analytics content; existing
route-blocking handled it without errors.

## 6. Where the project lagged

- Signup form (name+email step 1 → details step 2) never completed: A filled
  email but the multi-step registration wizard needs goal-driven exploration.
- Element coverage still selector-bound (45 uncovered actionable elements).

## 7. Metrics table

```
A: steps=15 states=15 urls=~10 clicks=7 fills=3 errors=0
B: steps=6 states=5 urls=2 generated_tests=1 replay=0_pass/1_fail
S1: observations=283 elements=110 behaviors=19 pages=12 conflicts=9
S2: el a_only=15 b_only=95 uncovered_actionable=45 (cov 14%) ; bh cov 79% ; conflicts=9
S4: offered=0 candidates=0 accepted=0 grounded=true (honest zero)
FT: total=0
Dashboard: total_tests=6 (A=5 B=1 fusion=0) ; pct_fusion=0% ; novel_targets=0
```

## 8. Reproduction commands

```bash
node runBoth.js https://www.automationexercise.com --auth testuser@example.com TestPass123
node fusion/s1_build_catalog.js run_20260824_094432
node fusion/s2_gap_report.js run_20260824_094432
node fusion/s4_fusion_synthesis.js run_20260824_094432
node fusion/s6_dashboard.js run_20260824_094432 --validate
```
