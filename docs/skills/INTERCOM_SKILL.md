# SKILL: AGENT INTERCOM ARCHITECTURE (multi-agent communication spec)

Design + operating manual for agent-to-agent and agent-to-Master
communication in this project. Written after a 6-agent day that produced
4 failed board edits, 2 rejected pushes, 1 aborted stash-pop, and 1 dropped
commit - every rule below traces to a real incident.

## 1. TOPOLOGY
        human (coordinator)
           | verbatim orders, tagged @MASTER within 1 min
           v
      MASTER / SUB-MASTER  <-- sole integrator of the main branch
       |      |      |
      W1     W2 ... Wn   <- workers push agent/<name> branches only

- Master is the ONLY writer of GATES/DIRECTIVES sections.
- Workers append ONLY to their own comms file: docs/comms/agent-N.md.
- Adding agent N+1 = create docs/comms/agent-(N+1).md. Nothing else changes
  (expandable by design).

## 2. CHANNELS
| Channel | File/medium | Use |
|---|---|---|
| Board STATUS sheet | docs/TASK_BOARD.md rows | task state transitions only |
| Per-agent comms | docs/comms/agent-N.md (append-only) | progress, findings, handoffs |
| Master directives | board DIRECTIVES block | orders, decisions, gate flips |
| Incident log | docs/comms/incidents.md | contamination/quota/crash events |

## 3. MESSAGE FORMATS
Claim:  [UTC+IST] [agent] CLAIMED T-xxx (expires +20m)
Done:   [UTC+IST] [agent] DONE T-xxx commit=<sha> result=<1 line>
        + structured block: RESULT / ARTIFACTS / RISKS / HANDOFF / FOLLOWUPS
Block:  [UTC+IST] [agent] BLOCKED T-xxx reason=<...> resume-point=<path>

## 4. LEASES AND HEARTBEATS
- Claims expire after 20 min without heartbeat; expired claims are reclaimable.
- Git operations require a git-lease line: "git-lease <window-id> until <HH:MM>".

## 5. ISOLATION RULES (the three that eliminated ~80% of friction)
1. One git worktree per agent off the remote tip - never commit from a
   shared checkout.
2. Integrator-only main branch: workers never push the integration branch;
   integrator merges with suites green.
3. Single-flight pipelines via .campaign.lock WITH PID-liveness check.

## 6. VERIFICATION DELEGATION
Workers self-verify lightly (guards + suites). Independent recomputation
audits are dispatched at gates (AUDITOR role) rather than performed
continuously by workers.

## 7. EXPANSION PROTOCOL (new agent onboarding)
New agent reads: agents/ folder -> TASK_BOARD GATES+DIRECTIVES ->
PROJECT_HANDOFF.md. Then creates its comms file, posts CLAIM for an OPEN
task, and operates under rules above. No other configuration required.

## 8. FAILURE MODES THIS DESIGN PREVENTS (all real incidents)
- Wrong-site run folders (concurrent studies + newest-dir attribution)
- Silent unicode corruption (PowerShell Add-Content on markdown)
- Duplicated tasks (claims without pushed commits)
- Lost WIP (git add -A sweeping other lanes)
- Stale-lock false aborts (age-based checks instead of PID liveness)
