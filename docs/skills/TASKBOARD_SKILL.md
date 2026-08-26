# SKILL: TASK BOARD MAINTAINER (Task-Master Manual)

Complete operating manual for any agent appointed as TASK MASTER / SUB-MASTER
responsible for creating, maintaining, and gating work via docs/TASK_BOARD.md.

## 1. WHEN TO USE THE BOARD
- Any work spanning 2+ agents or 2+ sessions
- Any work gated on quota windows, external events, or other tasks
- Never for single-agent single-session jobs (overhead > value)

## 2. BOARD ANATOMY (keep this exact structure)
```
# TASK BOARD
## GATES              <- machine-readable KEY: VALUE lines, Master-only writes
## DIRECTIVES (D-N)   <- numbered master orders, newest implied at top of log
## STATUS SHEET       <- one row per task: ID | Status | Agent | Started | Done | Commit
## COMMS LOG          <- append-only, newest-first, UTC+IST dual stamps
```

## 3. TASK CREATION PROTOCOL
1. Define: ID (T-series), scope, owner-lane files, acceptance criteria,
   dependencies, hard stop.
2. Add row to STATUS SHEET (OPEN) + spec in directive or linked doc.
3. Parallel vs serial test: two tasks are parallel-safe iff they touch
   DISJOINT files AND need no shared browser/service ports. Otherwise serial.
4. Schedule phases as gates: a phase closes only when its exit criteria are
   verifiable from artifacts (never from worker claims alone).

## 4. CLAIM / LEASE MODEL
- Worker sets Status=CLAIMED with expiry = now+20min, must heartbeat (bump
  expiry) while working. Expired claims are reclaimable by anyone.
- Master may FORCE-CLAIM stalled tasks after 1 grace reassignment.

## 5. SERIALIZATION RULES
- Browser pipelines: ALWAYS serial (shared vision ports 5000-5004). Hold
  testing/.campaign.lock during pipeline; PID-liveness check before honoring.
- Round-robin pattern: hold lock per site, release between sites so queued
  workers proceed.
- Docs/code tasks: parallel-safe in disjoint file lanes only.

## 6. GATES
Format: `NAME: YES|NO (blocking reason)`. Only the gate's owner flips it.
Never start gated work without flipping logic documented in a directive.
Example gates used: PHASE-2-CLEAR, QUOTA-FRESH, TIER-3-LAUNCH.

## 7. DIRECTIVES (D-N)
Master orders are numbered directives appended to comms: context + decision +
affected lanes + hard rules. Workers reference directive IDs instead of
re-deriving intent. Superseded directives stay in history (audit trail).

## 8. STATUS VOCABULARY
OPEN -> CLAIMED -> RUNNING -> DONE | BLOCKED(reason) | PARKED(deferred) |
CLOSED-YIELDED (duplicate/superseded) | DO-NOT-CITE (contaminated evidence).
Every terminal state requires a commit hash or evidence path.

## 9. CONFLICT RESOLUTION (observed incidents -> rules)
- Two workers editing board simultaneously: node fs re-read immediately
  before patch; never long-anchor string replace; never PowerShell
  Add-Content (destroys unicode).
- Duplicate task execution: first DONE wins; second is CLOSED-YIELDED.
- Branch divergence: integrator (Master/Sub-Master) rebases; workers push
  agent/<name> branches or use isolated worktrees off the remote tip.

## 10. ARCHIVING CADENCE
At every gate flip: move superseded comms/board sections to
agents/archive/<date>.md. The live board stays <200 lines. History lives
in git - never delete commits, only relocate prose.

## 11. ANTI-PATTERNS (all caused real incidents)
- git add -A WIP checkpoints that sweep other agents' files
- PowerShell here-string writes to markdown (unicode corruption)
- newest-mtime run-dir attribution (caused wrong-site contamination)
- claiming work without pushing the claim commit first
- silent BLOCKED (always log reason + resume point)

## 12. CLOSING A CAMPAIGN
Final freeze sequence: verify all rows terminal-state -> regen derived
ledgers from artifacts (single-source script) -> independent recomputation
audit -> tag (campaign-vN-end) -> push -> archive board.
