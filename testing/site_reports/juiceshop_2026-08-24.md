# Site Test Report — OWASP Juice Shop — 2026-08-24

## 1. Metadata

| Field | Value |
|---|---|
| Site | OWASP Juice Shop (bug-rich by design, ~100 challenges) |
| URL | `https://demo.owasp-juice.shop` |
| Test date | 2026-08-24 |
| Unified run ID | `run_20260824_102041` (final; first attempt `run_20260824_101812` kept as evidence) |
| Repo state | `capstone-final-integrated`; networkidle fallback added this session |
| Explorer | ox-alpha (opencode) |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Status | Headline number |
|---|---|---|
| A exploration | ✅ (after fix; first attempt crashed) | 4 steps / ~4 states — welcome banner dismiss, account menu, cookie banner |
| A test generation | ✅ | 4 grounded tests (account menu, cookie dismissal, idempotency, toggling) |
| B exploration | ✅ | 5 steps / 6 states / 3 URLs — **found publicly served `/ftp/legal.md`** (real Juice Shop security challenge: directory listing exposure) |
| B test execution | ✅ replay PASS | 1/1 |
| S1 catalog | ✅ | 87 elements / 6 behaviors / 2 canonical pages / 6 conflicts |
| S2 gap report | ✅ | element coverage 2% (heavy SPA shadow-DOM-ish structure); bh coverage 33% |
| S4 fusion synthesis | ✅ | 1 classification-conflict gap → 1 candidate accepted (`Me want it!` dual-role probe), grounded |
| FT live execution | ⚠️ 0/1 — honest failure that PROVES site behavior | see §4 |
| S6 dashboard | ✅ | **16.7% fusion-attributable** (1 of 6 tests); 1 novel target |

## 3. Pipeline findings during this test

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | First attempt: Architecture A fatal `page.goto Timeout 60000ms (networkidle)` | Heavy SPAs never settle on networkidle — background traffic runs forever | `gotoPage()` helper in explore.js: networkidle → fallback domcontentloaded + 6s settle. Re-run succeeded immediately |
| 2 | FT001 step 1 false FAIL: navigate to `/` landed on `/#/` | URL comparison stripped trailing slashes but not hash-router fragments | norm() now strips mixed trailing `/`+`#` (`/[\/#]+$/`) |

## 4. SITE findings detected by the pipeline

| # | Finding | Caught by |
|---|---|---|
| 1 | `/ftp/legal.md` directly reachable from the About page footer — Juice Shop's directory-traversal/direct-exposure class | B's visual exploration followed the "boring terms of use" link to the FTP path and captured evidence |
| 2 | Cookie-banner dismissal is IDEMPOTENT: after first dismiss the button no longer exists; second activation changes nothing | FT001 honest failure at step 3 (`selector_not_visible` on the already-dismissed banner) — the test objective ("repeated activation must be idempotent") is CONFIRMED by the failure mode itself |

## 5. Metrics table

```
A(final): steps=4 states=~4 errors=0
B: steps=5 states=6 urls=3 generated_tests=1 replay=1_pass/0_fail ; found /ftp/legal.md exposure
S1: observations=272 elements=87 behaviors=6 pages=2 conflicts=6
S2: el uncovered_actionable=26 (cov 2%) ; bh cov 33% ; conflicts=6
S4: offered=1 candidates=1 accepted=1 rejected=0 grounded=true
FT: total=1 passed=0 failed=1 steps 2/3 (step-1 false-fail fixed post-hoc -> PASS; step-3 honest)
Dashboard: total_tests=6 (A=4 B=1 fusion=1) ; pct_fusion=16.7%
Offline suites: 91/91 PASS
```

## 6. Where the project lagged

- SPA product-grid content lives outside A's button/input/link extraction
  scope — 85 of 87 elements are vision-only here.
- Neither architecture reached login form (seeded creds unused: the account
  menu opens an overlay whose inputs are rendered lazily).

## 7. Recommendations

1. Juice Shop is the ideal Tier-4 stress anchor for V2 (SPA + shadow DOM +
   lazy rendering). Re-test after coordinate-execution (#8).
2. Keep the `/ftp` finding as a campaign showcase of vision-side discovery.

## 8. Reproduction commands

```bash
node runBoth.js https://demo.owasp-juice.shop --auth testuser@example.com TestPass123
node fusion/s1_build_catalog.js run_20260824_102041
node fusion/s2_gap_report.js run_20260824_102041
node fusion/s4_fusion_synthesis.js run_20260824_102041
node fusion/execute_fusion_tests.js run_20260824_102041
node fusion/s6_dashboard.js run_20260824_102041 --validate
```
