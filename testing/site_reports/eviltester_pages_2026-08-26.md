# SITE TEST REPORT - EvilTester Test Pages - Tier-3 D9 #32

## 1. Metadata

| Field | Value |
|---|---|
| Site | EvilTester Test Pages (styled index) |
| URL | `https://testpages.eviltester.com/styled/index.html` |
| Test date | 2026-08-26 |
| Unified run ID | `run_20260826_005704` |
| Run folder | `runs/run_20260826_005704/` |
| Repo state | branch `after-tier-2` @ `8bcc47f` |
| Explorer | replacement worker / ox-alpha (opencode) |
| Trimmed env | MAX_STEPS=25, MAX_STATES=20, ARCH_A_TIMEOUT_MS=1500000 |
| Report status | FINAL - supersedes `eviltester_contaminated_2026-08-26.md` |

## 2. Verdict snapshot

| Stage | Result |
|---|---|
| Overall run | SUCCESS (A success 379s, B success 132s at execution stage) |
| Purity | **PURE 4/4** (`folder_purity.js`, single-pipeline lock window) |
| A exploration | max_states_reached: 19 steps / 20 states / 19 unique URLs, 0 errors, 15 navigations |
| A test generation | 3 test cases (TC001-TC003, recorded-workflow replays) |
| B exploration + execution | llm_done; replay 1/1 PASS - verification body_text_fallback x1 (**weak-class, disclosed**) |
| S1 catalog | elements=616 behaviors=25 pages=24 conflicts=95 |
| S4 synthesis | offered=5 accepted=3 grounded=true (0 rejections) |
| FT live execution | 1/3 PASS (steps 4/7); both failures `no_post_action_change` on live-verified targets |
| Dashboard | total_final_tests=7 (A3/B1/fusion3), pct_fusion=**42.9%**, novel_targets=5 |

## 3. Architecture results

### A (DOM): deep clean crawl - hit the 20-state cap across 19 distinct pages
with zero errors and zero external-domain interventions (all navigation stayed
on testpages.eviltester.com). Contributed 3 selector-grounded workflow replays.

### B (vision): explored and executed 1 generated test end-to-end; replay
passed but through the weakest oracle class (body_text_fallback) - recorded
as-is per the STRONG/WEAK boundary definition, not inflated.

### Fusion: composed 3 cross-page tests neither arch produced; all 3 grounded,
zero rejections this round (cleanest S4 round of Tier-3 alongside #23's 5/5).

## 4. SITE bugs detected

None claimed. The two FT FAILs are pipeline-verifier limitations, not
demonstrated site defects: in both cases the target button passed a full
live probe (exists / visible / enabled / label matches catalog: "Click Me"
#button1, "Add Another Attribute" #add-attribute-button) but no URL change,
new page, or body-text delta was observable after the click. Notably FT002's
second click shows scroll_y jump 0->539, suggesting the action DID have an
effect (added attribute rows shifting layout) that the current
popup_or_dom_response oracle cannot see - concrete evidence for the known
missing-value-oracle gap (#1 architectural gap, deferred to V2 by freeze rule).

## 5. PIPELINE notes from this run

1. **Contamination fully cleared**: prior attempt run_20260826_000247 failed
   purity via a foreign magento page_key stitched from shared storage while
   concurrent unlocked pipelines ran. This re-run held `.campaign.lock` for
   the entire cycle and is PURE 4/4 with zero provenance rejects needed.
   First D9 re-run executed on the EXTENDED collector guard (commit 97a29cb:
   test_cases_* + execution_results.json now provenance-filtered).
2. W3's prediction confirmed: "a 20-min clean win" - ~8 min wall clock
   pipeline-to-purity once the lock was exclusive.

## 6. Where the project lagged

- Weak-oracle reliance on the B side (body_text_fallback) keeps B's PASS
  evidence WEAK-class even when the replay succeeds.
- Post-click change detection remains blind to same-page DOM additions
  (both FT failures) - feeds the V2 value-oracle work.

## 7. Assets and reproduction

All artifacts under `runs/run_20260826_005704/`:

```bash
node testing/tier3_repl.cjs eviltester_pages https://testpages.eviltester.com/styled/index.html
node testing/folder_purity.js run_20260826_005704   # pure:true 4/4
```

Extract snapshot: `testing/extract_run_20260826_005704.json`.
Contaminated predecessor `run_20260826_000247` kept on disk as failure-mode
evidence only - DO NOT CITE.
