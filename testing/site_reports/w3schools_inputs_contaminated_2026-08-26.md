# SITE TEST REPORT - W3Schools <input> tag reference — CONTAMINATION-SKIP — 2026-08-26

## 1. Metadata

| Field | Value |
|---|---|
| Site | W3Schools `<input>` tag reference |
| URL | `https://www.w3schools.com/tags/tag_input.asp` |
| Test date | 2026-08-26 |
| Attempted run | `run_20260826_023102` — **NOT CITABLE (purity FAIL)** |
| Repo state | branch `after-tier-2` (D11 final-batch window) |
| Explorer | FINAL-BATCH worker lane (opencode) |
| Report status | FINAL (CONTAMINATION-SKIP — no citable numbers) |

## 2. Verdict

**CONTAMINATION-SKIP — folder_purity returned `pure: false`.** Per the D9/D11
protocol, the run was NOT patched into any report numbers and this page
carries no citable metrics. The attempt is registered here and in INDEX row
40 as honest data about the failure mode.

## 3. What actually happened

1. Pre-check passed (HTTP 200, read-only reference page).
2. Pipeline ran under the batch window; artifacts collected into
   `runs/run_20260826_023102/`.
3. folder_purity Check `page_keys_belong_or_visited` FAILED: the S1 catalog
   contains **2 foreign globalsqa.com page_keys**
   (`https://www.globalsqa.com`, `https://www.globalsqa.com/cheatsheets`)
   alongside w3schools pages — stitched from serial-B's concurrently-running
   #37 globalsqa_hub pipeline via the shared `vision/storage/outputs`
   directory.
4. Root cause class matches defect #24: the collector's provenance guard
   covers `exploration_result` / `test_cases_*` / `execution_results.json`,
   but url-less `test_cases` files fail open (F4-05 warn path) and
   `state_*_visual_dom.json` / `exploration_history` files remain outside
   guard scope. Status-sheet note for this skip cites exactly these gaps.
5. Per protocol: CONTAMINATION declared, no fusion chain results cited,
   evidence kept on disk.

## 4. Findings for the pipeline

| # | Finding | Class |
|---|---|---|
| 1 | Third purity-gate catch of the campaign (after #34 techlistic, #35 practica) plus this one — every instance was a concurrent-lane overlap, none reached publication | Guard effectiveness validated; serialization discipline remains load-bearing |
| 2 | Residual guard gap: url-less test_cases fail open + visual-DOM/history files unguarded | Defect #24 follow-up: extend provenanceGuard to stamp session ids at WRITE time in vision explorer, not at collect time |

## 5. Metrics

```
A/B/S2/S4/FT/S6 numbers from run_20260826_023102: NOT CITABLE
Quota spent: pipeline ran within the batch window (LLM calls consumed)
Evidence: runs/run_20260826_023102/ retained as failure-mode record
```

## 6. Disposition

Row 40 registered in INDEX as CONTAMINATED / DO-NOT-CITE. Re-run is possible
(serialized behind the lock with the extended post-97a29cb collector guard)
but was not executed in this window; the site is a low-value static reference
page and the campaign success bar was already met without it.
