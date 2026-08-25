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
| T102 cross-platform assessment | OPEN | - | - | - | - |
| T103 parallel-safety spec | OPEN | - | - | - | - |
| T104 presentation outline | DONE | ox-alpha CLI (Agent 3) | 2026-08-25 16:36 | 2026-08-25 16:44 | - |
| T105 MCP wiring phase 1 (fork) | DONE | ox-alpha CLI (serial 2) | 2026-08-25 16:12 | 2026-08-25 16:25 | fork 41ce4c1 |
| T201 quarantine re-runs 13-20 | RUNNING | ox-alpha (CLI serial-1) | 16:11 | - | - |
| T202 reports 14/15 B-side rewrite | OPEN | - | - | - | - |
| T301 Tier-3 launch | OPEN | - | - | - | - |
| T401 gate audit | OPEN | - | - | - | - |
| T402 final freeze | OPEN | - | - | - | - |

Status vocabulary: OPEN -> CLAIMED -> RUNNING -> DONE / BLOCKED(reason)

## COMMS LOG (newest first)
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
