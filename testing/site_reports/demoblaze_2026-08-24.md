# Site Test Report — Demoblaze — 2026-08-24

## 1. Metadata

| Field | Value |
|---|---|
| Site | Demoblaze (demo electronics store) |
| URL | `https://www.demoblaze.com` |
| Test date | 2026-08-24 |
| Unified run ID | `run_20260824_001544` |
| Run folder | `runs/run_20260824_001544/` |
| LLM provider / model (A, B, Fusion) | openrouter / `stealth/ox-alpha` (reasoning=low) |
| Repo state | branch `capstone-final-integrated`; all work uncommitted |
| Explorer | ox-alpha (opencode) |
| Report status | FINAL |

**Best full-pipeline result of the campaign so far.**

## 2. Verdict snapshot

| Stage | Status | Headline number |
|---|---|---|
| A exploration | ✅ | 11 steps / 8 states — product page → cart → **checkout modal form filled** |
| A test generation | ✅ | 5 grounded tests incl. end-to-end purchase flow |
| B exploration | ✅ | 9 steps / 2 URLs, product + login modal interactions |
| B test execution | ✅ replay PASS | 1/1 pass |
| S1 catalog | ✅ | 118 elements / 17 behaviors / 12 conflicts |
| S2 gap report | ✅ | 44 uncovered elements; 8 uncovered behaviors; 12 conflicts |
| S4 fusion synthesis | ✅ | 5 candidates → 4 accepted, 1 rejected (`duplicate_in_batch`), all grounded |
| FT live execution | ✅ | **4/4 PASS, 10/10 steps, 4 targets preverified** |
| S6 dashboard | ✅ | **40% fusion-attributable** (4 of 10 tests); 6 novel targets |

**Verdict:** Complete end-to-end success. Both architectures contributed,
Fusion found genuinely novel targets (login/signup entry points from cart,
Cart-link classification conflict resolved by live probe proving it
navigates to cart.html), and every Fusion test passed live.

## 3. Architecture results

### Architecture A
Flow: home → navigate "Samsung galaxy s6" → prod.html?idp_=1 → Cart →
Place Order modal → filled #name, #country, #city, #card (checkout!).
Termination `completed`. Tests: TC001 add-to-cart from PDP, TC002 product
appears in cart, TC003 checkout form with valid details, TC004 **full
purchase flow (7 steps)**, TC005 nav-menu return home.

### Architecture B
Product click, Login modal open/fill attempts, About-us modal — 9 steps,
max_depth termination. Replay workflow PASSED live (multi-modal SPA).

### A/B comparison
A reached the money flow (checkout); B mapped modal-heavy navigation.
Complementary with zero overlap again — and this time Fusion successfully
composed across both.

## 4. SITE bugs detected

| # | Finding | Caught by |
|---|---|---|
| 1 | "Cart" header element's classification was ambiguous in the catalog — live probe proved it NAVIGATES to cart.html (link-like), resolving the conflict empirically at zero LLM cost | FT003 conflict probe (PASS) |
| 2 | Login and Sign-up modals are reachable from cart page state — entry points never exercised by A/B tests | FT001/FT002 gap tests |

Not caught: actual purchase completion (A filled the form but no test
submitted the final dialog), signup validation rules, session persistence.

## 5. PIPELINE bugs & fixes found during this test

None new — clean run. Dedup correctly rejected 1 in-batch duplicate
(`duplicate_in_batch`) during S4, demonstrating the dedup gate works on real data.

## 6. Where the project lagged

- Element coverage still 8% (44 uncovered actionable elements, mostly
  vision-only carousel/product-grid items without DOM selectors).
- Neither architecture completed an actual purchase (final Confirm click not
  part of any generated test).
- B still cannot read input labels inside modals reliably (filled empty).

## 7. Metrics table

```
A: steps=11 states=8 urls=2 clicks=5 fills=5 errors=0
B: steps=9 urls=2 generated_tests=1 replay=1_pass/0_fail
S1: elements=118 behaviors=17 conflicts=12
S2: el a_only=11 b_only=107 uncovered=44 ; bh uncovered=8 ; conflicts=12
S4: candidates=5 accepted=4 rejected=1 grounded=true
FT: total=4 passed=4 failed=0 steps 10/10
Dashboard: total_tests=10 (A=5 B=1 fusion=4) ; pct_fusion=40% ; novel_targets=6
```

## 8. Asset index

| Asset | Path |
|---|---|
| A artifacts + tests | `runs/run_20260824_001544/dom/` |
| A screenshots | `runs/run_20260824_001544/dom/screenshots/` |
| B outputs + evidence | `runs/run_20260824_001544/vision/outputs/`, `vision/storage/screenshots/run_1787510748838/` |
| S1/S2/S4 artifacts | `runs/run_20260824_001544/fusion/{catalog,gap_report,fusion_report}.json` |
| FT results + evidence | `runs/run_20260824_001544/fusion/ft_execution_results.json`, `ft_execution_evidence/FT001..FT004/` |
| Dashboard | `runs/run_20260824_001544/fusion/dashboard.html` |

## 9. Recommendations

1. Extend A's test generator to close flows that end mid-purchase (add the
   confirm step when the target exists in catalog).
2. demoblaze is a strong regression anchor for future pipeline changes.
3. Modal-aware perception for B would unlock login flows here.

## 10. Reproduction commands

```bash
node runBoth.js https://www.demoblaze.com
node fusion/s1_build_catalog.js run_20260824_001544
node fusion/s2_gap_report.js run_20260824_001544
node fusion/s4_fusion_synthesis.js run_20260824_001544
node fusion/execute_fusion_tests.js run_20260824_001544
node fusion/s6_dashboard.js run_20260824_001544
```
