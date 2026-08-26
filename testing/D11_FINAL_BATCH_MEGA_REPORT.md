# TIER-3 FINAL BATCH (D11) MEGA REPORT — Sites 36–40

**Task:** D11 final-batch consolidation · **Author:** serial-B / ox-alpha CLI window
**Branch:** `after-tier-2` · **Status:** FINAL. Directive D11 closed site
claiming permanently after these rows. All numbers via
`node testing/extract_run.js <run_id>` against each registered run; purity
verdicts from `testing/folder_purity.js`.

---

## 1. CONTEXT

D11 (Master, 21:30 IST 2026-08-26) opened the last five rows ever:
guru99_bank · globalsqa_hub · dyn_loading · heroku_tables · w3schools_inputs —
all QA-community/permissive targets. Mandatory availability pre-check before
any pipeline quota. Workers self-served per row; MCP handover protocol
attached (@MCP-LEAD after each site closes). Hard stop 90 min per worker.

## 2. PER-SITE FINAL RESULTS TABLE (36–40)

| # | Site | Registered run | Verdict | Overall | A side | B side | S4 acc/off | FT live | Fusion % | Novel |
|---|---|---|---|---|---|---|---|---|---|---|
| 36 | Guru99 Bank demo (`demo.guru99.com/V4/`) | `run_20260826_020711` | CLEARED — purity PURE 4/4 | SUCCESS both archs | success (W1; D7 mega-DOM budget exercised) | success | 8/18 | **4/8 PASS** (15/19 steps) | **66.7%** | 16 |
| 37 | GlobalSQA Example Pages Hub | `run_20260826_023441` | CLEARED — purity PURE 4/4 (serial-B, this window) | SUCCESS both archs | success: 25 steps/18 states/11 urls at step cap; ext-nav guard ×4 honest | exploration success; replay 0/1 honest FAIL (skipped verif + unresolved target) | 8/10 | **7/8 PASS** (16/17 steps), targets_preverified=9 | **66.7%** | 17 |
| 38 | Dynamic Loading Example 2 (`the-internet.herokuapp.com/dynamic_loading/2`) | `run_20260826_022742` | CLEARED — purity PURE 4/4 (W3) | SUCCESS both archs | success, completed in 87s with 5 grounded tests | replay 1/1 PASS | 1/2 | **1/1 PASS** | 14.3% | 1 |
| 39 | The Internet: Tables (`the-internet.herokuapp.com/tables`) | `run_20260826_023111` | CLEARED — purity PURE (W4) | SUCCESS both archs | success | success | 1/4 | **1/1 PASS** | 14.3% | 1 |
| 40 | W3Schools input tag (`w3schools.com/tags/tag_input.asp`) | `run_20260826_023102` | ⚠️ CONTAMINATION-SKIP honest (FINAL-BATCH lane): purity FAIL — foreign globalsqa page_keys leaked via url-less test_cases (fail-open class F4-05) + state_visual_dom/exploration_history outside guard scope, from an immediately-preceding adjacent-window run | — | not citable | not citable | — | — | — | — |

## 3. BATCH SCOREBOARD

| Outcome | Count | Rows |
|---|---|---|
| CLEARED (purity PURE, registered) | **4 of 5** | 36, 37, 38, 39 |
| CONTAMINATION-SKIP honest | 1 | 40 w3schools (defect #24 residual class: fail-open url-less test_cases + guard-scope gap on state_visual_dom/history files) |
| BLOCKED (unreachable) | 0 | — (every row passed STEP 0 pre-check) |

FT aggregate over cleared rows: **13/18 executed tests PASS (72.2%)**,
33 steps passed / 38 attempted. Fusion share: 66.7% / 66.7% / 14.3% / 14.3%
— high where catalogs were rich (guru99 bank flows, globalsqa hub), minimal
where pages were single-purpose micro-surfaces (dynamic_loading, tables).

## 4. INSIGHTS

### Positive
1. **First batch with zero BLOCKEDs and zero quota waste** — all five URLs
   passed STEP 0; the pre-check discipline paid for itself.
2. **4/5 cleared with purity PURE across four different workers** — the
   lock + strict attribution + extended provenance guard stack held under
   real round-robin.
3. **Micro-site honesty pattern**: dynamic_loading and tables each produced
   tiny catalogs and fusion refused to inflate (S4 accepted 1 of 2–4 offered);
   14.3% attribution is what an honest single-element page looks like.
4. **Verifier-gap evidence continued**: guru99's 4 FT fails and globalsqa's
   B-replay honest FAIL extend the assertion-oracle evidence base.

### Negative
1. **Defect #24 residual class struck once more** (#40): url-less test_cases
   entries pass the provenance check vacuously (fail-open), and
   state_visual_dom/exploration_history files remain outside guard scope —
   the complete fix recommendation in TIER3_REPLACEMENT_MEGA_REPORT.md §3
   stands, now with a fourth repro case.
2. **Adjacent-window contamination is timing-sensitive**: #40's sweep came
   from a run that finished moments earlier — even near-miss overlaps leak.
3. **Small-sample FT suites** (1 test on 38/39) bound conclusions; "cleared"
   means attributed-and-pure, not deeply exercised.

## 5. PROBLEMS FACED & SOLUTIONS

| Problem | Symptom | Root cause | Fix/Disposition | Verification |
|---|---|---|---|---|
| #40 contamination sweep | Foreign globalsqa page_keys in w3schools catalog | url-less test_cases fail-open (F4-05 class) + state_visual_dom/exploration_history outside guard scope | CONTAMINATION-skip honest; run kept as evidence; no report patch; defect #24 repro case 4 logged | folder_purity FAIL output + FINAL-BATCH comms |
| Batch-claim ambiguity | W1 claimed "rows 36-40" but executed only #36 first; later workers needed clarity on #37 | Board claim granularity vs per-row execution | Per-row landed claims enforced; my #37 claim posted with conflict-check note | Board 02:05 vs 22:1x entries; no double-execution |
| Download-link goto abort | globalsqa PDF cheat-sheet link aborted page.goto | Browser downloads file instead of navigating | Recorded honestly as environment behavior; guard kept session on-domain | A warnings array, run_…_023441 |

## 6. WHERE WE STAND

**Final batch closes the Tier-3 campaign: claiming is permanently shut after
row 40.** Final-batch tally: **4/5 cleared**, 1 contamination-skip, 0 blocked.
Combined with core (21–30) and replacement (31–35) lanes, the full Tier-3
dataset is 13 cleared / 6 blocked-honest / 2 contaminated-do-not-cite / 1
gate-blocker pending (bbc #27 F5-01, closure recipe posted).

**Honest scope statement.** The last five sites added three genuinely new
micro/macro surface classes (bank demo, example-page hub, dynamic-content
loader) and one more proof that the purity gate catches what the collector
misses. Every cleared number traces to a manifest-verified run; every failed
purity check kept its data out of the ledger. What remains open project-wide:
F5-01 bbc re-run, and the defect-#24 collector fix (now 4 repro cases).

---
*Generated by serial-B (also executor of row 37). Sources: extract_run.js per
registered run; INDEX.md rows 36–40; folder_purity outputs; board D11
directive + FINAL-BATCH/W1/W3/W4 comms.*
