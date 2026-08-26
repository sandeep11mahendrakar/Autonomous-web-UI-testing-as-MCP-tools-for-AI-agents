# SITE TEST REPORT - The Internet: Dynamic Loading Example 2

## 1. Metadata

| Field | Value |
|---|---|
| Site | The Internet — Dynamic Loading Example 2 (WebDriver-wait demo) |
| URL | `https://the-internet.herokuapp.com/dynamic_loading/2` |
| Test date | 2026-08-26 |
| Unified run ID | `run_20260826_022742` |
| Run folder | `runs/run_20260826_022742/` |
| LLM provider / model (A, B, Fusion) | openrouter / stealth/ox-alpha (S4 reasoning=low) |
| Repo state | branch `after-tier-2` @ W3 final-batch window |
| Explorer | W3 / ox-alpha CLI (serial-C) via `testing/tier3_w3.cjs` |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Status | Headline number | Artifact source |
|---|---|---|---|
| A exploration | ✅ SUCCESS | 2 steps / 2 states / 1 URL, `completed`, 0 errors (87 s) | `runs/run_20260826_022742/dom/exploration_summary.json` |
| A test generation | ✅ | **5 grounded test cases** (TC001–TC005) | `runs/run_20260826_022742/dom/test_cases.json` |
| B exploration | ⚠️ late fatal on screenshot | captureScreenshot protocol error after execution stage (known gutenberg-class issue); states_observed=3 pre-fatal | `runs/run_20260826_022742/vision/outputs/*_exploration_result.json` |
| B test execution | ✅ | 1/1 PASS (weak signal ×1 disclosed; 1 stale-coordinate prevented) | `runs/run_20260826_022742/vision/outputs/execution_results.json` |
| S1 catalog | ✅ | 14 elements / 6 behaviors / 1 page / 1 conflict | `runs/run_20260826_022742/fusion/catalog.json` |
| S2 gap report | ✅ | deterministic pass | `runs/run_20260826_022742/fusion/gap_report.json` |
| S4 fusion synthesis | ✅ | 2 offered → 2 candidates → **1 accepted / 1 honest reject** (action_mismatch: navigate-behavior proposed as click — validator strictness working) | `runs/run_20260826_022742/fusion/fusion_report.json` |
| FT live execution | ✅ | **1/1 PASS** (1/1 steps, target preverified) | `runs/run_20260826_022742/fusion/ft_execution_results.json` |
| S6 dashboard | ✅ | 7 final tests (A=5, B=1, fusion=1) → **14.3%** fusion-attributable, 1 novel target | `runs/run_20260826_022742/fusion/dashboard_data.json` |

**Verdict:** CLEAN END-TO-END RUN, folder_purity PURE 4/4, manifest SUCCESS on
both architectures. This site is the async-hydration demo ("Hello World!"
appears only after a server-side delay) — the direct probe of the
hydration-starvation class that produced archive.org's thin run. Result:
**no starvation.** A clicked Start, waited through the delay, fingerprinted
the post-load state, and grounded 5 test objectives on what it saw; the
healthy A-side is why fusion attribution is a modest-but-honest 14.3%
(A-dominant denominator — the opposite structural shape of #21/#26).
External footer link (elementalselenium.com) correctly BLOCKED by policy and
recorded as a warning without polluting visited URLs.

## 3. Architecture results

### 3.1 Architecture A (DOM)
- Navigate → click Start → captured delayed-content state; termination
  `completed`; 87 s wall (well under budget — no mega-DOM stress here).
- 5 grounded test cases: TC001 trigger-hidden-element (core behavior),
  TC002 repeated-click robustness, TC003 external footer link,
  TC004 combined load+follow flow, TC005 direct-nav preserves loader.
- One policy block recorded: elementalselenium.com external navigation.

### 3.2 Architecture B (vision)
- Execution stage succeeded: 1 multi-step replay PASS.
- Verification method: body_text_fallback (WEAK class — disclosed per
  taxonomy; the delayed "Hello World!" text has no input/state signal to
  verify strongly).
- 1 stale-coordinate prevented (guard fired during dynamic re-layout).
- Exploration tail hit the known `Page.captureScreenshot` protocol error
  AFTER the useful captures — same class as gutenberg's B-side note; did not
  affect artifacts used downstream.

### 3.3 A/B comparison notes
- Both archs observed the delayed content — first hydration-class site where
  neither side starved. The difference vs archive.org is page simplicity
  (single widget, no background traffic), supporting the scroll-and-settle/
  network-idle hypothesis in backlog A4.
- 1 classification conflict (link-vs-behavior) recorded, not merged.

## 4. SITE bugs detected

None — demo page behaves exactly as labelled (that IS its purpose).

## 5. PIPELINE bugs & fixes found during this test

none — clean run (driver soft-fail path untested here; FT executed normally).

## 6. Where the project lagged

- Weak verification on the only B replay (body-text class): the value-oracle
  gap again — "Hello World!" appearing is assertable but nothing asserts its
  VALUE.
- B exploration's trailing screenshot fatal remains open (gutenberg-class).

## 7. Metrics table

```
A: steps=2 states=2 urls=1 clicks=1 fills=0 errors=0 (completed, 87s)
B: states_observed=3 generated_tests=1 replay=1_pass/0_fail (weak x1, stale-prevented x1)
S1: elements=14 behaviors=6 pages=1 conflicts=1
S4: offered=2 candidates=2 accepted=1 rejected=1 (action_mismatch, honest) grounded=true
FT: total=1 passed=1 failed=0 steps 1/1 (targets_preverified=1)
Dashboard: total_tests=7 (A=5 B=1 fusion=1) ; pct_fusion=14.3% novel_targets=1
folder_purity: PURE 4/4 checks
Offline suites after run: 143/143 PASS baseline
Duration: pipeline=2min (A=87s B=144s)
```

## 8. Asset index

Standard tree under `runs/run_20260826_022742/`; extract snapshot
`testing/extract_run_20260826_022742.json`.

## 9. Recommendations for next runs

1. Use this run as the POSITIVE control for backlog A4: simple async pages
   work today; complex ones (archive.org) do not — the delta is background
   traffic + DOM size, so the settle heuristic should key on those.
2. B-side screenshot fatal: add retry-once on Page.captureScreenshot
   protocol error (post-freeze minor fix candidate).

## 10. Reproduction commands

```bash
node testing/tier3_w3.cjs dynamic_loading https://the-internet.herokuapp.com/dynamic_loading/2
node testing/folder_purity.js run_20260826_022742
node testing/extract_run.js run_20260826_022742
```
