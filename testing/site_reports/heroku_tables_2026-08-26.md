# SITE TEST REPORT - The Internet: Tables - Tier-3 #39 (D11 final batch)

## 1. Metadata

| Field | Value |
|---|---|
| Site | The Internet — Tables page |
| URL | `https://the-internet.herokuapp.com/tables` |
| Test date | 2026-08-26 |
| Unified run ID | `run_20260826_023111` |
| Run folder | `runs/run_20260826_023111/` |
| Repo state | branch `after-tier-2` (post D11 batch commits) |
| Explorer | W4 / ox-alpha serial-D (opencode) |
| Trimmed env | MAX_STEPS=25, MAX_STATES=20, ARCH_A_TIMEOUT_MS=1500000 |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Result |
|---|---|
| Overall run | SUCCESS (A success, B success) |
| A exploration | completed: 3 steps / 1 state / 1 URL, 0 errors; external nav to elementalselenium.com correctly blocked by domain guard |
| A test generation | 5 test cases |
| B exploration + execution | llm_done; replay 1/1 PASS (body_text_fallback = WEAK x1, disclosed), 0 unresolved targets |
| S1 catalog | elements=47 behaviors=7 pages=1 conflicts=6 |
| S4 synthesis | offered=4 candidates=3 accepted=1 grounded=true (2 rejections: action_mismatch) |
| FT live execution | 1/1 PASS (1/1 step), targets_preverified=1 |
| Dashboard | pct_fusion=14.3% novel_targets=1 |
| folder_purity | PURE ("pure": true, contamination: []) |

**Verdict:** single-state table page with a small actionable surface. A
generated 5 selector-grounded tests covering Edit/Delete anchors and the
external footer link; fusion composed 1 additional cross-target test that
passed live. Honest notes: B's replay verification was body-text-fallback
(WEAK class); S4 rejected 2 candidates on action_mismatch rather than forcing
ungrounded tests — the validator doing its job on a thin catalog.

## 3. Architecture results

### A (DOM): minimal page → 1 state; deterministic fallbacks respected the
external-domain guard.

### B (vision): 3 states observed during execution, no stale coordinates,
no unresolved targets.

### A/B comparison: both architectures agree the page is anchor-driven;
fusion added the one gap-test neither composed alone.

## 4. SITE bugs detected

None claimed — reference practice page.

## 5. PIPELINE notes

- Provenance guard live: a w3schools exploration_result from a concurrent
  D11 lane (`run_1787691667141`) was REJECTED (foreign_host) at collection;
  two `test_cases_*` files raised PROVENANCE WARN (no_url_fields — the
  F4-05 warn path landed @ `0df6786`). folder_purity still PURE because the
  catalog built only from this run's own artifacts.
- Lock held for the whole cycle (acquired 02:31:11, released 02:34:16 IST).

## 6. Where the project lagged

Single-page sites under-fill the S2 gap algebra (pages=1), so fusion share is
naturally low; this is a shape limitation of the site class, not a defect.

## 7. Assets and reproduction

All artifacts under `runs/run_20260826_023111/`:

```bash
node runBoth.js https://the-internet.herokuapp.com/tables
node testing/run_attribution.js   # strict findRunDir attribution
node fusion/s1_build_catalog.js run_20260826_023111
node fusion/s2_gap_report.js run_20260826_023111
node fusion/s4_fusion_synthesis.js run_20260826_023111
node fusion/execute_fusion_tests.js run_20260826_023111
node fusion/s6_dashboard.js run_20260826_023111
node testing/folder_purity.js run_20260826_023111   # pure:true required
```
