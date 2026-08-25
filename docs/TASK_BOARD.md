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
| T101 paper prose | RUNNING | ox-alpha CLI (Agent 3) | 2026-08-25 16:12 | - | - |
| T102 cross-platform assessment | OPEN | - | - | - | - |
| T103 parallel-safety spec | OPEN | - | - | - | - |
| T104 presentation outline | OPEN | - | - | - | - |
| T105 MCP wiring phase 1 (fork) | RUNNING | ox-alpha CLI (serial 2) | 2026-08-25 16:12 | - | - |
| T201 quarantine re-runs 13-20 | RUNNING | ox-alpha (CLI serial-1) | 16:11 | - | - |
| T202 reports 14/15 B-side rewrite | OPEN | - | - | - | - |
| T301 Tier-3 launch | OPEN | - | - | - | - |
| T401 gate audit | OPEN | - | - | - | - |
| T402 final freeze | OPEN | - | - | - | - |

Status vocabulary: OPEN -> CLAIMED -> RUNNING -> DONE / BLOCKED(reason)

## COMMS LOG (newest first)
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
