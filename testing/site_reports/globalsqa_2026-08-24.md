# Site Test Report — GlobalSQA (Tier-1 spare, replaces OpenCart) — 2026-08-24

## 1. Metadata

| Field | Value |
|---|---|
| Site | Global Software QA — demo site / practice hub |
| URL | `https://www.globalsqa.com/demo-site/` |
| Test date | 2026-08-24 |
| Unified run ID | `run_20260824_095724` |
| Repo state | `capstone-final-integrated` @ post-session (select_option in S4 vocabulary + FT executor) |
| Explorer | ox-alpha (opencode) |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Status | Headline number |
|---|---|---|
| A exploration | ✅ max_states hit | **16 steps / 15 states** — about pagination, cheatsheets, contact form fills, testers-hub; leaked to external GitLab site |
| A test generation | ✅ | 5 grounded tests |
| B exploration | ✅ | 10 steps / 6 states / 3 URLs (demo-site, accordion-and-tabs, cheatsheets) |
| B test execution | ✅ replay PASS | 1/1 |
| S1 catalog | ✅ | **183 elements / 24 behaviors / 15 pages / 23 conflicts** (736 observations) |
| S2 gap report | ✅ | element coverage 8%; behavior coverage 58% |
| S4 fusion synthesis | ✅ | 5 offered → 3 accepted, 2 rejected (`missing_value`), all grounded |
| FT live execution | ✅ | **3/3 PASS, 8/8 steps** — incl. a cross-site composed workflow (GlobalSQA → git-cheat-sheet → GitLab nav probe) and two dropdown-menu conflict probes |
| S6 dashboard | ✅ | **33.3% fusion-attributable** (3 of 9 tests); 6 novel targets |

## 3. Architecture results

### Architecture A
About-page pagination, full cheatsheets traversal, contact form
(`#comment_name`, `#email` filled with seeded email), free-ebooks,
testers-hub. Followed an external GitLab link and explored about.gitlab.com
(scope leak — see §5). Termination: `max_states_reached`.

### Architecture B
Demo-site → accordion-and-tabs widget page → cheatsheets. Clean multi-page
visual exploration; replay PASS.

### Fusion highlight
FT003 composed a **cross-site workflow**: navigate cheatsheets → click GIT
Cheat Sheet (new page opened, verified via popup detection) → navigate
GitLab → click Resources menu. All grounded in catalog records across both
sites' page keys. This is the first multi-origin composed test of the
campaign.

## 4. SITE bugs detected

None new (content site, no transactional flows beyond the comment form).

## 5. PIPELINE findings during this test

| # | Finding | Outcome |
|---|---|---|
| 1 | **External-domain scope leak**: A navigated off-site (gitlab.com) mid-flow and kept exploring there | Backlog item: external-domain guard — after the first external navigation, either abort flow or mark observations `out_of_scope` so S1 can exclude them |
| 2 | S4 validator rejected valid `select_option` candidates as `invalid_action` | FIXED immediately: `select_option` added to S4 vocabulary (`s4_validate.js`, prompt in `s4_context.js`); select_option execution branch added to FT executor (native `<select>` via `page.selectOption`, custom widgets via control-click + option pick); suites re-verified 91/91 |
| 3 | 2 candidates rejected `missing_value` on select_option steps without values | Correct gate behavior |

## 6. Metrics table

```
A: steps=16 states=15 urls=~10 clicks=9 fills=2 errors=0
B: steps=10 states=6 urls=3 generated_tests=1 replay=1_pass/0_fail
S1: observations=736 elements=183 behaviors=24 pages=15 conflicts=23
S2: el a_only=16 b_only=167 uncovered_actionable=125 (cov 8%) ; bh cov 58% ; conflicts=23
S4: offered=5 candidates=5 accepted=3 rejected=2(missing_value x2) grounded=true
FT: total=3 passed=3 failed=0 steps 8/8 targets_preverified=4
Dashboard: total_tests=9 (A=5 B=1 fusion=3) ; pct_fusion=33.3% ; novel_targets=6
```

## 7. Reproduction commands

```bash
node runBoth.js https://www.globalsqa.com/demo-site/
node fusion/s1_build_catalog.js run_20260824_095724
node fusion/s2_gap_report.js run_20260824_095724
node fusion/s4_fusion_synthesis.js run_20260824_095724
node fusion/execute_fusion_tests.js run_20260824_095724
node fusion/s6_dashboard.js run_20260824_095724 --validate
```
