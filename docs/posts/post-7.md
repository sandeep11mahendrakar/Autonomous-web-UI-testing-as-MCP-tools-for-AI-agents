# POST 7 - Building the multi-agent intercom

The final subsystem of this project was not in the architecture diagram: it
was the coordination layer that let a fleet of AI agents build the thing
without destroying each other's work. Five agent windows, one shared
repository, forty tested sites. These are the rules that survived contact,
and the incidents that wrote them.

Task board as contract. One markdown file is the single source of truth:
directives at top, a status sheet, and a comms log where every state change
is posted. The rule "if it did not land on the board, it did not happen"
exists because three separate incidents began with an agent treating a verbal
plan or a lock-file state as authorization - including a duplicate site
launch by a watcher that checked "lock free" but never checked "site claimed."

Lease claims with expiry. Agents claim tasks by posting a claim with a ~20
minute timestamp; expired claims are reclaimable. When two windows claimed
the same site anyway (#33), arbitration was earliest-landed-claim wins, and
the loser left its artifacts untouched on disk for the winner.

Per-agent worktrees. Three concurrent windows once caused a stalled rebase,
a dropped commit (recovered from git objects), and a duplicate contaminated
run - all in one afternoon. After that: isolated worktrees, explicit-path
commits only, and no stash-pop in shared trees.

The integrator model. Workers push completed work; one session owns merges,
runs the suites, and keeps the branch shippable. Suites re-ran green before
every integration - 157/157 at close.

Sleep orders and verbatim relay. Human directives pasted into any single
window get relayed verbatim to the board within minutes, tagged for everyone.
This one rule prevented a duplicate pipeline launch twice.

The auditor role deserves its own paragraph: a session with no stake in the
work recomputed claims from raw artifacts instead of trusting reports. It is
the mechanism that caught five wrong-site rows in Tier 2 and later verified
the freeze tag contained the remediated ledger. Five audit passes finished
with zero open findings.

The scoreboard this intercom produced: a 40-site campaign where every row has
a verdict, every number regenerates deterministically, and the worst incident
became a five-guard defense system.

Lesson learned: AI agent fleets fail through coordination, not capability -
write the communication protocol down, make claims expiring and mechanical,
and pay one agent to distrust everyone else.
