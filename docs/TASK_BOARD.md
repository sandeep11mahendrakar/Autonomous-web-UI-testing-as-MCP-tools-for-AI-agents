# TASK BOARD - attendance + comms channel
Agents: claim tasks here BEFORE working. Update on every state change.
Newest comms entries at TOP of the log.

## SERIAL ASSIGNMENTS (user says: your task is N)
SERIAL 1 = T201 quarantine re-runs (CLI agent, ox-alpha)
SERIAL 2 = T105 MCP wiring phase 1 (CLI agent, vision fork)
SERIAL 3 = T101 research paper completion (+T104 outline if early)
SERIAL 4 = T103 parallel-safety spec + T102 cross-platform assessment

## STATUS SHEET
| Task ID | Status | Agent | Started (IST) | Finished (IST) | Commit |
|---|---|---|---|---|---|
| T101 paper prose | DONE (3/6 gaps fillable now; 3 blocked on Phase 2) | ox-alpha CLI (Agent 3) | 2026-08-25 16:12 | 2026-08-25 16:32 | 0ca676a |
| T102 cross-platform assessment | DONE | ox-alpha CLI (serial 2, 2nd task) | 16:41 | 17:05 | this commit |
| T103 parallel-safety spec | DONE | ox-alpha serial-1 (2nd task) | 16:42 | 16:52 | 061caa3 |
| T104 presentation outline | DONE | ox-alpha CLI (Agent 3) | 2026-08-25 16:36 | 2026-08-25 16:44 | - |
| T105 MCP wiring phase 1 (fork) | DONE | ox-alpha CLI (serial 2) | 2026-08-25 16:12 | 2026-08-25 16:25 | fork 41ce4c1 |
| T201 quarantine re-runs 13-20 | RUNNING (window-2: sites 14-20; 13 stays SITE-MOVED-EVIDENCE) | ox-alpha (CLI serial-1, window-2) | 2026-08-25 16:47 | - | - |
| T202 reports 14/15 B-side rewrite | RUNNING (PREP done: docs/T202_REWRITE_PLAN.md; rewrite gated on T201 artifacts for #14/#15) | ox-alpha CLI serial-2 | 16:55 | - | - |
| T301 Tier-3 launch | OPEN | - | - | - | - |
| T401 gate audit | OPEN | - | - | - | - |
| T402 final freeze | OPEN | - | - | - | - |

Status vocabulary: OPEN -> CLAIMED -> RUNNING -> DONE / BLOCKED(reason)

## COMMS LOG (newest first)
[2026-08-25 17:35 IST] [serial2/ox-alpha] T202 PREP DONE -> docs/T202_REWRITE_PLAN.md
(rewrite itself stays gated on T201 artifacts). Pinned per-report: every tainted
cell (B execution rows, B narrative paras, "both archs green", A/B comparison
B-half) with exact locations + rewrite-source artifact paths; A-sides and FT
stages confirmed live-valid per audit F-03/addendum and marked DO-NOT-TOUCH.
Flagged: existing docs_python 134803 re-run section predates host-check guards -
must re-validate before trusting its B numbers. No pipeline, no lock, no quota.
Read-only except new plan file + board.
[2026-08-25 17:25 IST] [serial2/ox-alpha] T202 PREP DONE while T201 window-2
runs: testing/T202_REWRITE_CHECKLIST.md committed. Maps EVERY B-contaminated
field in docs_python + gutenberg reports to its replacement artifact source.
KEY findings for whoever executes T202: (1) gutenberg's "First full SUCCESS"
status and "16 novel targets record" claim were earned on contaminated B data
- must NOT be carried over; re-decided from new run only. (2) docs_python
already has a first-decon section (run_134803, A-timeout, FT 2/8) - keep it,
new post-quarantine section supersedes. (3) S1/S4/FT numbers are B-DERIVED via
catalog chain, not just the obvious B rows - all get replaced. (4) Old numbers
append-only, never deleted. Rewrite itself stays gated on rerun_quarantine.js
post guards passing for each site.
[2026-08-25 16:50 IST] [serial1/ox-alpha] MASTER DIRECTIVE received: hard stop
WAIVED, keep working; all agent notes go on this board only. T201 resumed as
primary lane. Status: site 14 docs_python pipeline mid-run (launched ~16:35,
trimmed env); B FT suite done (0/1 honest unresolved-target FAIL), A still
navigating. Plan: strict attribution + 3 guards -> fusion chain via
rerun_quarantine.js post -> report+INDEX patch only if ALL guards green ->
regen vision_test_quality + s8 -> commit per site -> continue sites 15-20.
Note for Master: board timestamps show clock drift between agents (serial2
entries stamped 17:05 vs local 16:4x) - normalize before T401 audit trail.
[2026-08-25 17:20 IST] [serial2/ox-alpha] T102 amendment: explicit GO/NO-GO
verdict line appended to MCP_READINESS ADDENDUM (GO strictly post-review;
items 1-4 free, item 5 bundled with T103). Amendment commit e5c7c97 pushed to
backup. Original assessment @ 3aac2f9 stands; task remains DONE.
[2026-08-25 16:47 IST] [serial1/ox-alpha window-2] CLAIMED T201 (sites 14-20
resume; phptravels #19 stays MIRROR-EVIDENCE per Master, lambdatest #13 stays
SITE-MOVED-EVIDENCE). MASTER RULING logged: testmuai.com IS approved host for
lambdatest entries -> adding to assertVisionStartUrls allowlist. Found stale
.campaign.lock (PID 25664 dead) - removing. run_20260825_163448 (prev-window
site-14 attempt) has NO manifest -> unattributable, will re-run fresh.
Order: docs_python, gutenberg, weathersparks, sahitest, theinternet,
openlibrary. Hard stop 17:47 IST.
[2026-08-25 17:05 IST] [serial2/ox-alpha] T102 DONE -> MCP_READINESS.md
ADDENDUM. Inventory: taskkill tree-kill x6 sites (2 UNGUARDED in runBoth.js:137,186
- would leak all services on POSIX), shell:true win32 spawns (DEP0190 observed
live in T105 run), bare 'python' cmd + no venv support, hardcoded Windows
Tesseract path (ocr.py:18) with no fail-loud preflight, ports 5000-5004 static.
CLEAN findings: path separators already portable everywhere; NO PowerShell
dependencies exist anywhere - earlier concern reduces to cmd.exe+taskkill.
Port plan (5 items, design-only): detached process groups + POSIX kill(-pid),
drop shell:true, VISION_PYTHON env for venv/interpreter, tesseract preflight,
dynamic ports DEFERRED to T103 spec. VERDICT: EASY-MEDIUM ~1.5-2 days total,
LOW risk post-deadline; order 2->1->3->4, item 5 only with T103 lockfile work.
Suites green pre-commit: 123/123 PASS. Shutting down - both my tasks (T105,
T102) DONE, nothing left in-lane (T202/T301 gated on T201).
[2026-08-25 16:53 IST] [serial1/ox-alpha] T103 DONE @ 061caa3.
docs/PARALLEL_SPEC.md: D1 dynamic ports (replace freeVisionPorts()
runBoth.js:122-144 which currently TASKKILLS concurrent runs services;
env plumbing already exists), D2 per-worker .locks/ + PID-liveness staleness
(run_repeatability + mutation/run_detection have NO lock today - gap found),
D3 runBoth.js singleton runtime-lock as load-bearing rule, D4 parse_failed
returns real action instead of fake done (llmClient.js:136) + 25% gate,
D5 verification-strength PASS_WEAK downgrade in s8. Effort total ~2-2.5d
post-deadline. FINDING for Master/Master-recon: freeVisionPorts() is not
just a collision risk, it actively kills other live pipelines services -
explains ECONNREFUSED incidents better than passive port clash.
[2026-08-25 16:42 IST] [serial2/ox-alpha] CLAIMED T102 (Master approved "pick
any task"; T103 already claimed by serial1). Read-only: enumerate Windows-only
bits + port plan -> append to docs/MCP_READINESS.md. No pipeline, no lock, no
quota. Hard stop 17:12 IST.
[2026-08-25 16:42 IST] [serial1/ox-alpha] CLAIMED T103 (Master approved "pick
other task" - T201 continues in background: site 14 docs_python pipeline
running, lock held). Deliverable: docs/PARALLEL_SPEC.md design-only spec:
dynamic vision ports + per-worker lockfiles + shared study mutex + fail-loudly
parse_failed + min verification-strength for PASS, citing exact functions.
[2026-08-25 16:55 IST] [serial1/ox-alpha] T201 window-end report. DONE this
window: (1) testing/rerun_quarantine.js driver committed (d299e8d/3b8317f/
f4f942f): 8 sites 13-20, trimmed env MAX_STEPS=25 MAX_STATES=20 (+EXPLORE_*),
STRICT attribution no newest-dir fallback, pipeline/post modes, lock held,
report+INDEX patcher dry-run-verified. (2) NEW GUARD assertVisionStartUrls
in run_attribution.js per audit addendum - validated: rejects known-bad
run_20260825_053921 (127.0.0.1 fixture), passes clean books run. Suites
123/123 green pre-commit. RUNS: site 13 lambdatest -> run_20260825_161515
FAILED, root cause REAL SITE CHANGE: lambdatest.com/selenium-playground now
redirects to www.testmuai.com (KaneAI property); both archs blocked by
external-domain guard; 4 steps/1 state/0 tests. QUARANTINE NOT CLEARED -
INDEX marker stays; recommend #13 marked SITE-MOVED-EVIDENCE + spare swap
(same precedent as #19 phptravels). Report patched with evidence section.
RESUME POINT next window: sites 14-20 pending. Quota note: multiple 429
bursts mid-run - pool under pressure; consider Groq-first pacing or wait
for 05:30 reset. Command: node testing/rerun_quarantine.js pipeline docs_python
then node testing/rerun_quarantine.js post docs_python. Lock released.
[2026-08-25 16:26 IST] [serial2/ox-alpha] T105 DONE (fork vision-standalone
@ 41ce4c1, pushed backup). explore_site wired to runVision --explore: spawn,
logs streamed as JSON-RPC notifications/message, returns run_id + summary
from <run_id>_exploration_result.json; typed BUSY(-32005)/STAGE_FAILED(-32003)
with log tail; other four tools still stubs (-32006). Roundtrip VERIFIED:
initialize -> tools/list -> stub -32006 -> real explore_site @ example.com
(STUB_LLM=true, zero quota) -> run_id=run_1787655204165 in 15.1s. Harness:
mcp/verify_roundtrip.js in fork.
FINDINGS for all agents: (1) Fork's screenparser_best.pt is a 134-byte git-LFS
POINTER, not the model - pipeline dies UnpicklingError until you copy the real
153MB file from main repo vision/services/yolo-service/. I copied it locally +
added *.pt to fork .gitignore; NOT committed (binary). Any agent running the
fork must do this copy first. (2) Held testing/.campaign.lock during both
verification passes; released cleanly. (3) Bonus proof: the first pass failed
on the LFS pointer and the MCP layer surfaced a clean typed -32003 with the
YOLO traceback tail - error taxonomy works on real failures. Shutting down,
well ahead of 17:12 hard stop.
[2026-08-25 16:45 IST] [AGENT3/ox-alpha] T101 DONE @ 0ca676a + T104 DONE
(docs/PRESENTATION_OUTLINE.md, this commit). T101 findings for Master:
(1) Filled paper gaps from artifacts ONLY - clean-set FT live = 24 executed /
18 PASS (75%), failure classes no_post_action_change x3, label_mismatch x1,
selector_not_visible x1, selector_readonly x1; A-side clean-set states total
94 across 13 runs (mean 7.2, range 1-15); consolidated citable run list into
paper section 10. Sources: runs/<id>/fusion/ft_execution_results.json +
dashboard_data.json over INDEX rows intersected with QUARANTINE_TIER2 CLEAN.
(2) REMAINING GAPS in RESEARCH_PAPER_DRAFT.md are Phase-2-gated and must NOT
be filled until T201 re-runs land: abstract finalization, section 3
clean-site table, section 4.3 decontaminated fusion %. Whoever closes T201:
regen s8, then fill those three.
(3) WARNING for T104 consumers: CAMPAIGN_EVALUATION.md aggregates
(mean fusion 42.5%) are PRE-quarantine - outline flags this on every slide
that cites campaign-wide numbers; regenerate before Gate (T401).
(4) Offline suites green pre-commit: 123/123 PASS (count grew from 121 -
another agent added tests). No pipeline runs, no lock contention, zero quota
used. Note: memory.json knowledge-graph file has a JSON parse error at line 2
(non-blocking, flagging for Master). Shutting down ~16:46 IST, ahead of the
17:12 hard stop.
[2026-08-25 16:14 IST] [serial1/ox-alpha] CLAIMED T201. Plan: adapt rerun_starved.js list to 8 quarantined URLs (sites 13-20), trimmed env MAX_STEPS=25 MAX_STATES=20, hold testing/.campaign.lock, per-site guards: run_attribution.js + assertCatalogDomains + new start_url-host check (audit addendum). Patch reports + clear QUARANTINED markers on success. Hard stop 17:11 IST.
[2026-08-25 16:13 IST] [AGENT3/ox-alpha] CLAIMED T101 (paper prose). Reading
RESEARCH_PAPER_DRAFT.md gaps now; plan: fill each {{GAP}} from cited artifacts
only, no new numbers; then T104 outline if time allows before hard stop 17:12.
Will not touch night_chain.js / untracked testing files.
[2026-08-25 16:13 IST] [serial2/ox-alpha] CLAIMED T105. Fork verified:
CAPSTONE_BACKUPS\vision-fork-2026-08-25 @ 44b633d (MCP skeleton), branch
vision-standalone, remote backup only. Starting explore_site wiring now.
[2026-08-25 15:58 IST] [MASTER] Serial assignments issued. Session rule: complete assigned task, mark DONE/BLOCKED, push, then may claim another OPEN task in-lane. HARD STOP ~1 hour from start: finish current work, update board, push, shut down cleanly.
[2026-08-25 15:55 IST] [MASTER] Board live. Read docs/MASTER_PLAN_2DAYS.md
for full context. Claim by editing your row + adding a comms line. P0 note:
books(131135 SUCCESS) + quotes(131756 PARTIAL) already clean from first batch;
T201 covers sites 13-20 only. ox-alpha key ending ...57217 is live in .env.
