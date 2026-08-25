# T202 REWRITE CHECKLIST — sites 14/15 B-side decontamination

_Prep by serial-2 agent while T201 window-2 runs. The actual rewrite happens
ONLY after `testing/rerun_quarantine.js post <site>` succeeds for each site;
every replacement value MUST come from the NEW run's artifacts (newest run
wins; older sections stay verbatim as evidence of the contamination)._

## Ground truth for the gate

| Site | Old (contaminated) run | Why B is invalid | First-decon run (superseded too) |
|---|---|---|---|
| 14 docs.python | `run_20260825_055129` | B source host `127.0.0.1:49205` != manifest `docs.python.org` | `run_20260825_134803` (A-timeout, FT 2/8 — kept as evidence) |
| 15 gutenberg | `run_20260825_060707` | B source host `127.0.0.1:50172` != manifest `www.gutenberg.org` | none (first batch skipped it) |

A-side data in BOTH old runs is VALID (A explored the real site); only
B-sourced and B-derived numbers get rewritten.

## docs_python_2026-08-25.md

| Section / field | Action when new run lands |
|---|---|
| §1 metadata `Unified run ID` / `Run folder` | KEEP old row; new section carries its own IDs |
| §2 `B execution pass_rate=1 (1 test)` | **REPLACE** — fixture-sourced. Source: `<new_run>/vision/storage/outputs/<b_run>_exploration_result.json` totals + replay record |
| §2 `FT live execution 7/7 PASS`, `Dashboard pct_fusion/novel_targets`, `S1/S2/S4` rows | **REPLACE** — B-derived inputs contaminate catalog→synthesis chain. Source: `<new_run>/fusion/dashboard_data.json` (`ft.passed/pass_total`, `pct_fusion`, `novel_targets`) |
| §2 Verdict sentence | **REWRITE** from new numbers only |
| §3 `### B (vision)` paragraph | **REWRITE** from new B artifacts |
| §3 `### A/B comparison` | **REWRITE** only the B-half claims; A claims stand |
| §5/§6 port-conflict narrative | **KEEP** — true history of the OLD run; add new-run findings as separate bullets |
| Existing `## Re-run (decontaminated) 134803` section | **KEEP verbatim**; append new `## Re-run (post-quarantine)` section above INDEX-marker removal |

## gutenberg_2026-08-25.md

| Section / field | Action when new run lands |
|---|---|
| §2 `B execution pass_rate=1 (1 test)` | **REPLACE** — fixture-sourced (same rule as docs_python) |
| §2 `S1 elements=319 behaviors=30 pages=17 conflicts=13`, `S4 offered/candidates/accepted`, `FT 6/6`, `pct_fusion=54.5% novel_targets=16` | **REPLACE** from `<new_run>/fusion/dashboard_data.json`; the "16 novel targets record" claim is INVALID until re-proven |
| §2 Verdict sentence ("First full SUCCESS…") | **DO NOT carry over** — SUCCESS status was earned by a contaminated run; new status decided purely by new artifacts |
| §3 `### B (vision): Replay passed 1/1.` | **REPLACE** |
| §3 `### A (DOM): 24 steps / 15 states…` | **KEEP** (valid A evidence) unless new run supersedes naturally |
| §6 lagged narrative | Generic site observation — **KEEP**, no B dependency |

## Cross-report obligations (from T201 protocol)

1. INDEX rows 14/15: swap run ID to the new one, remove QUARANTINED marker
   ONLY if all three guards passed (strict findRunDir + assertCatalogDomains
   + assertVisionStartUrls).
2. Regen `VISION_TEST_QUALITY.md` and update its QUARANTINED set.
3. Regen `CAMPAIGN_EVALUATION.md` via s8 — campaign-wide means change, so
   flag any slide/paper citing them (Agent 3 already flagged this in T101/T104).
4. Never delete old numbers — append-only history, contamination stays auditable.

## Hard rule reminder

If the new B run for either site FAILS or is BLOCKED (bot-wall, quota death):
rewrite NOTHING; leave the GAP/quarantine marker and log honestly on
TASK_BOARD. Absence of data beats fabricated presence of data.
