# Site Test Report — CURA Healthcare RE-RUN (post auth-seed) — 2026-08-24

## 1. Metadata

| Field | Value |
|---|---|
| Site | CURA Healthcare Service appointment demo |
| URL | `https://katalon-demo-cura.herokuapp.com` |
| Test date | 2026-08-24 |
| Unified run ID | `run_20260824_093124` |
| Repo state | `capstone-final-integrated` @ `a65c6dd` (auth-seed, select_option, anti-laziness, FT pre-login) |
| Explorer | ox-alpha (opencode) |
| Report status | FINAL |

Purpose: validate the capability upgrades against the site that motivated
them (original run `run_20260824_002709`: Fusion honest-zero, nothing
executable, B stuck on login).

## 2. Verdict snapshot

| Stage | Status | Headline number |
|---|---|---|
| A exploration | ⚠️ filled creds, never clicked Login | 6 steps / 3 states (#4 termination issue persists) |
| B exploration | ✅ **LOGGED IN** | 12 steps / 9 states / 3 URLs — clicked Login → landed `/#appointment` (booking page reached for the FIRST time in the campaign) |
| B test execution | ✅ replay PASS | 1/1 |
| S1 catalog | ✅ | 97 elements / 15 behaviors / 2 canonical pages / 11 conflicts |
| S2 gap report | ✅ | common=**1** (first A/B element overlap of the campaign!); bh coverage 13% |
| S4 fusion synthesis | ✅ | 5 candidates → 3 accepted, 2 rejected (`action_mismatch`), all grounded |
| FT live execution | ❌ 0/3 — ALL HONEST failures | see §5 |
| S6 dashboard | ✅ | **33.3% fusion-attributable** (3 of 9 tests); 4 novel targets |

## 3. What changed vs the original run

| Aspect | Original (002709) | Re-run (093124) |
|---|---|---|
| Auth wall | Blocked both architectures | **B passed it** (seeded creds in vision prompt) |
| Appointment page | Never seen | Reached & explored |
| S4 | Honest zero | 3 executable Fusion tests composed |
| Catalog | 69 elements | 97 elements |
| A/B overlap | common=1 behavior-space only | common=**1 ELEMENT** |

## 4. SITE bugs detected

None new. The appointment form itself was reached but not submitted by any
architecture (B explored its surface visually; A never left the login page).

## 5. PIPELINE findings during this test

FT failures were all correctly-classified honest failures that exposed real
executor gaps — two of which were fixed immediately:

| # | Symptom | Root cause | Outcome |
|---|---|---|---|
| 1 | FT003 fill step timed out 20s+ then failed | Target `el_1evqh5f` is CURA's READONLY demo-credential display box ("John Doe") mis-clustered with the login username input (shared label space) | Executor now probes `readonly` and fails fast with `selector_readonly` → `semantic_verification`. Honest FAIL is CORRECT: the catalogued target genuinely isn't editable. S4 candidate-quality filtering = backlog item |
| 2 | FT executor had NO fill branch — fill steps executed via click path | Executor vocabulary predated fill support | Added real fill branch: existence/visible/enabled/readonly probe → `page.fill` (multi-selector, ID-first, reload-retry) → value-persisted verification (`input_value_persisted`) |
| 3 | FT001 Login anchor unclickable | Hidden behind hamburger menu (`#menu-toggle`) — single-step gap test can't reach nested nav elements | Not fixed; noted for goal-driven frontier work |

## 6. Metrics table

```
A: steps=6 states=3 ; creds filled, Login NOT clicked (termination policy)
B: steps=12 states=9 urls=3 generated_tests=1 replay=1_pass/0_fail ; LOGIN ACHIEVED -> #appointment
S1: observations=640 elements=97 behaviors=15 pages=2 conflicts=11
S2: el common=1 a_only=5 b_only=91 uncovered_actionable=47 (cov 5%) ; bh cov 13% ; conflicts=11
S4: offered=7 candidates=5 accepted=3 rejected=2(action_mismatch x2) grounded=true
FT: total=3 passed=0 failed=3 (all honest: click_threw / no_post_change / selector_readonly)
Dashboard: total_tests=9 (A=5 B=1 fusion=3) ; pct_fusion=33.3% ; novel_targets=4
Offline suites: 91/91 PASS after executor changes
```

## 7. Recommendations

1. S4 executability filter should exclude readonly/display-only targets
   (probe at context-build time).
2. Goal-driven frontier (#4): A must click submit when creds are seeded —
   "fill every field" should imply "then submit".
3. Appointment-flow submission remains THE untested high-value flow.

## 8. Reproduction commands

```bash
node runBoth.js https://katalon-demo-cura.herokuapp.com --auth "John Doe" ThisIsNotAPassword
node fusion/s1_build_catalog.js run_20260824_093124
node fusion/s2_gap_report.js run_20260824_093124
node fusion/s4_fusion_synthesis.js run_20260824_093124
$env:SEED_USERNAME='John Doe'; $env:SEED_PASSWORD='ThisIsNotAPassword'
node fusion/execute_fusion_tests.js run_20260824_093124
node fusion/s6_dashboard.js run_20260824_093124 --validate
```
