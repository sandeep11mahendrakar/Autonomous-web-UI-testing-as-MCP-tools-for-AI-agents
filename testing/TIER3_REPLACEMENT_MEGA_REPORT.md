# TIER-3 REPLACEMENT (D9) MEGA REPORT — Sites 31–35

**Task:** D9 replacement-lane consolidation · **Author:** serial-B / ox-alpha CLI window
**Branch:** `after-tier-2` · **Status:** FINAL. Rows 31–35 were opened by
Master directive D9 after four honest BLOCKEDs in the core Tier-3 list. All
numbers via `node testing/extract_run.js <run_id>`; contamination verdicts
cross-checked against `folder_purity.js` output and CONTAMINATION_REJECTS.json.

---

## 1. WHAT ROWS 31–35 WERE FOR

QA-community/permissive targets chosen for low bot-wall risk, replacing the
walled core rows toward the ≥6/10 campaign success bar:
magento_luma (e-commerce demo) · eviltester_pages (element zoo) ·
todomvc_react (SPA toy) · techlistic_form (long practice form) ·
practica_login (login suite).

## 2. PER-SITE FINAL RESULTS TABLE (31–35)

| # | Site | Registered run | Verdict | Overall | Key numbers (extract_run.js) |
|---|---|---|---|---|---|
| 31 | Magento Luma | `run_20260826_004650` (replacement lane re-run; supersedes my contaminated `run_20260826_000335`) | CLEARED-BY-RERUN — purity PURE 4/4 | PARTIAL_FAILURE (honest: A success, B partial_success no-test-cases) | S1 30 el · S4 5/10 accepted · FT live **4/5 PASS** (8/9 steps), targets_preverified=6 · **fusion 100%*** · 8 novel targets |
| 32 | EvilTester Test Pages | `run_20260826_005704` (re-run on extended #24 guard; supersedes contaminated `run_20260826_000247`) | CLEARED-BY-RERUN — purity PURE 4/4, full lock cycle | SUCCESS both archs | S1 616 el · S4 3/3 accepted, zero rejections · FT live **1/3 PASS** — both fails `no_post_action_change` on live-probe-passing targets (verifier-gap evidence) · fusion 42.9% · 5 novel |
| 33 | TodoMVC React (TS) | `run_20260826_002227` (W4/serial-D; my duplicate run deferred & left unchained) | CLEARED — purity PURE, manifest SUCCESS both archs | SUCCESS | S1 309 el · S4 3/10 accepted (strict grounding) · FT live **3/3 PASS** (7/7 steps) · fusion 30% · 4 novel |
| 34 | Techlistic practice form | `run_20260826_002500` (mine) + later lane attempt | BLOCKED-CONTAMINATED — DO NOT CITE (registered per D8(e)) | — | My run: A healthy (17 urls all on-domain) but catalog swept foreign practica page_keys → purity FAIL → never patched |
| 35 | Practice Test Automation | `run_20260826_003258` — DO NOT CITE | ⚠️ CONTAMINATED verdict registered (W3's attempt caught by gate); site itself verified HTTP 200 | — | — |

\* Magento's 100% fusion is again denominator-inflation: B produced no test
cases and A none either, so the final suite is fusion-only. Absolute FT = 4/5.

## 3. THE META-FINDING: DEFECT #24, FULLY CHARACTERIZED

Rows 31–35 produced the campaign's most valuable engineering artifact — three
independent reproductions of a single collector defect:

1. **Mechanism**: `runBoth.js collectArchitectureB` copies from the shared
   `vision/storage/outputs` dir using an mtime window. When two workers'
   pipelines overlap, the OTHER session's artifacts fall inside the window.
2. **Partial fix that worked**: extended provenance guard (`97a29cb`) rejects
   foreign `exploration_result` files — it fired correctly in ALL THREE cases
   (CONTAMINATION_REJECTS.json present in each run, naming bbc.com /
   todomvc.com / testpages.eviltester.com / practica hosts).
3. **Residual gap**: sibling artifacts — `test_cases_*`, `execution_results.json`,
   `exploration_history` — carry session ids but are NOT checked, so they still
   sweep through. S1 then ingests them into catalogs → poisoned page_keys →
   folder_purity FAIL.
4. **Why nothing leaked**: the purity gate blocked registration in every case.
   Contaminated data reached evidence folders only, never reports or INDEX.
5. **Complete fix (recommended)**: extend collectArchitectureB to verify EVERY
   vision/outputs artifact carrying a session id against the manifest URL, and/
   or per-worker isolated outputs dirs. Until then: sequential-only across all
   workers is load-bearing — every contamination event coincided with an
   overlapping pipeline window.

## 4. WHERE ROWS 31–35 LEAVE THE CAMPAIGN

| Outcome | Sites | Count |
|---|---|---|
| CLEARED | 32 eviltester (re-run), 33 todomvc, 31 magento (re-run) | 3 |
| CONTAMINATED-verdict registered | 34 techlistic, 35 practica | 2 |

Plus the sahitest (#17) re-run cleared in this lane (`run_20260826_010716`,
SUCCESS both archs, FT **3/3 PASS** 9/9 steps, S4 3/3 zero rejects,
fusion 60%) — superseding the earlier `run_20260825_194511`.

Net: the D9 spares delivered **+3 clean sites**, enough (with core clears) for
the board's scoreboard to record the pre-registered success bar as MET
(6 cleared / 6 blocked-honest / 2 skip / 1 pending across 15 rows).

## 5. HONEST SCOPE STATEMENT

The replacement lane did its job — QA-community targets mostly behaved, and
three of five became clean ledger rows. But the lane's real product is the
#24 characterization: we now know exactly where the collector's immunity ends,
we have three pinned repro cases with named foreign hosts, and the gate that
kept every one of them out of the ledger was tested under fire and held. A
testing tool that can be told "you tested the wrong site" by its own purity
check — and refuses to file the report — is doing its job.

---
*Generated by serial-B. Sources: extract_run.js per registered run;
INDEX.md rows 31–35; folder_purity outputs; board comms D6–D9; commits
97a29cb (guard), f64e578/8a109b6/6031a56 (lane records).*
