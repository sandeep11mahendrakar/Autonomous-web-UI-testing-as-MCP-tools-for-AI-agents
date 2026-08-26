# MASTER PLAN - FINAL 2 DAYS (2026-08-25 15:30 IST -> 2026-08-27 evening)

> **SINGLE-SOURCE AGENT BRIEFING.** If you are an AI agent reading this file,
> this document plus the files listed in §0 CONTEXT is ALL you need. Do not
> ask the user for context before reading them.

## 0. CONTEXT - read these files IN ORDER before any task
1. PROJECT_HANDOFF.md          (project identity, provider landscape, gotchas)
2. PROJECT_MEMORY.md           (sections 0/0a/0b + end: session history)
3. testing/CAMPAIGN_PLAN.md    (campaign protocol + Tier-3 pre-registration)
4. docs/AUDIT_REPORT.md        (incl. ADDENDUM: contamination root cause)
5. testing/QUARANTINE_TIER2.md (definitive wrong-site list)
6. THIS FILE + docs/TASK_BOARD.md (claim tasks there before working)

## 0.1 HARD RULES (every agent, every task)
- Repo: C:\Users\sandeep\pes\vs code\Capstone-Project, branch after-tier-2
- Push ONLY to remote 'backup'. NEVER push to any other remote.
- API keys NEVER in committed files; live only in untracked .env files.
- Offline suites must be green before commit:
  node --test "test/*.test.js" "fusion/test/*.test.js" "web/test/*.test.js"
- Write markdown via node fs utf8 or git-friendly tools. PowerShell
  Add-Content DESTROYS unicode emoji.
- ONE pipeline at a time: hold testing/.campaign.lock while running.
- Commit to after-tier-2 directly (NOT vision-final-work-* branches).
- After finishing ANY task: update docs/TASK_BOARD.md (status + comms log).

## 0.2 QUOTA REALITY
| Pool | Budget | Best use |
|---|---|---|
| OpenRouter stealth/ox-alpha (key ending 57217 in .env) | ~1000 req/day global, resets 05:30 IST | pipeline explorations (P0 re-runs, Tier-3) |
| Groq gpt-oss-120b / gpt-oss-20b buckets | 200k TPD each, separate | fallback exploration; A->120b, B->20b split |
| Zen gateway | small caps | last resort only |
User may add MORE accounts/keys during the window: when they do, update .env
and log it in TASK_BOARD comms. Requests are precious: prefer trimmed limits
(MAX_STEPS=25 MAX_STATES=20) and never waste calls on re-explaining context.

## 0.3 PARALLELISM VERDICT (do not relitigate)
Browser pipelines: SEQUENTIAL ONLY until dynamic ports exist (ports 5000-5004
collide; proven by ECONNREFUSED incidents). Docs/coding/MCP tasks: fully
parallel with pipelines. Two agents may code simultaneously if they touch
disjoint files listed per task.

## PHASE 1 - ZERO-QUOTA WORK (start immediately, all parallel-safe)
### T101 [G2 web-SOTA] Research paper completion
Owner-file: docs/RESEARCH_PAPER_DRAFT.md (exists, sections filled where data
is final; gaps marked {{GAP:...}} with exact artifact paths). Task: replace
every GAP using cited artifact paths; polish prose; NO new numbers - if a
number is missing, leave the GAP marker and note it in TASK_BOARD.
Model preference: web SOTA (Claude/GLM/GPT-class). CLI agent fine too.
### T102 [any] Cross-platform port assessment -> append to docs/MCP_READINESS.md
Enumerate Windows-only bits (taskkill usage serviceManager.js:41 +
runVision.js:63-67, PowerShell assumptions, path separators) and produce a
port plan (child_process options instead of shell taskkill, path.join audit,
service spawn via python from venv). Verdict required: effort estimate +
risk. Implementation is POST-DEADLINE - assessment only now.
### T103 [G1 CLI] Parallel-safety engineering spec -> docs/PARALLEL_SPEC.md
Design (do NOT implement) dynamic port allocation for vision services +
per-worker lockfiles + shared mutex across study drivers + fail-loudly on
parse_failed + minimum verification-strength requirement for PASS. Cite the
exact functions to change. This answers the auditor's top trust items.
### T104 [G2 web-SOTA] Presentation asset outline
From VISION_TEST_QUALITY.md exemplars + CAMPAIGN_EVALUATION tables, produce
a 10-slide outline for the vision capstone review (slides: quality rubric,
exemplar STRONG test verbatim, dashboard screenshot cues, honest limitations).
### T105 [G1 CLI] MCP wiring phase 1 (fork)
In CAPSTONE_BACKUPS\vision-fork-2026-08-25\: wire mcp/tools.js stub
explore_site(url) to runVision --explore for real (spawn, stream logs to
caller). Other four tools stay stubs. Verify initialize+call roundtrip.

## PHASE 2 - LIGHT QUOTA (sequential pipeline; ONE agent holds lock)
### T201 [G1 CLI, ox-alpha] Quarantine re-runs sites 13-20
Driver: adapt testing/rerun_starved.js list to the 8 quarantined URLs
(quotes is CLEAN - skip; books CLEAN - skip). Trimmed env: MAX_STEPS=25
MAX_STATES=20. MANDATORY post-run checks per site (already coded):
testing/run_attribution.js findRunDir + assertCatalogDomains; PLUS new
guard per AUDIT addendum: every vision/outputs exploration start_url host
must equal manifest URL host - reject run dir otherwise. On success: patch
that site's report (add "## Re-run (post-quarantine)" section, rewrite
narrative from new artifacts only), clear INDEX QUARANTINED marker, regen
VISION_TEST_QUALITY (update its QUARANTINED set!), s8 eval. On quota death:
stop cleanly, log resume point, hand to next window.
### T202 [G1 CLI, after T201] Report narrative corrections for 14/15
docs/gutenberg + docs_python reports contain fixture-sourced B narratives -
rewrite ONLY the B-side paragraphs from re-run artifacts (A-sides were valid).
## PHASE 3 - HEAVIER QUOTA (only after Phase 2 clears)
### T301 [G1 CLI, ox-alpha fresh window] Tier-3 launch
Sites pre-registered in CAMPAIGN_PLAN.md Tier-3 section. Light first:
news.ycombinator.com, archive.org, lite.duckduckgo.com, text.npr.org, then
wikipedia, npmjs; risky ones (github/reddit/imdb/goodreads/bbc/stackoverflow)
attempt LAST and record honest BLOCKEDs. Same per-site protocol.
## PHASE 4 - GATE
### T401 [AUDITOR] Post-fix verification audit
Recompute ledger claims; verify quarantine clearances have domain assertion
logs; SHIP-WITH-LIMITS verdict refresh.
### T402 [Master] Final freeze: tag campaign-v2-end, push, final report.

## 0.4 MODEL PREFERENCE GROUPS
- G1 CLI coding agents: pipeline runs, surgical code changes, git ops
- G2 web SOTA (Claude/GLM/GPT web): prose, paper, slides, reviews of docs
- G3 Groq models: inside-pipeline LLM calls only (A=120b, B=20b)
Web chatbots CAN do T101/T104/T102 fully (they read repo files user pastes
or via file upload; no execution needed). CLI required for T105/T201-T301.
## 0.5 HANDOVER RISK TABLE (what to give which AI)
| Work | Risk to hand over | Preferred model group | Why |
|---|---|---|---|
| Research paper prose (T101) | LOW | G2 web-SOTA | data is frozen in draft + artifacts; prose only |
| Presentation outline (T104) | LOW | G2 | same |
| Cross-platform assessment (T102) | LOW | any | read-only analysis |
| Parallel-safety spec (T103) | LOW-MED | G1/G2 hybrid | needs code reading, no changes |
| MCP skeleton wiring (T105) | MED | G1 CLI | touches runtime; verification required |
| Quarantine re-runs (T201) | MED-HIGH | G1 CLI + ox-alpha | quota burn + guard discipline |
| Report rewrites (T202) | MED | G1 | must cite only new-run artifacts |
| Tier-3 runs (T301) | MED-HIGH | G1 CLI | bot-walls, quota pacing, honest BLOCKEDs |
| Final gate (T401/T402) | LOW | AUDITOR + Master | independent by design |

## 0.6 CROSS-PLATFORM VERDICT (summary - full detail lands in T102)
Current code is Windows-leaning: taskkill /T /F for process-tree cleanup,
PowerShell-era assumptions, backslash-tolerant but not normalized paths.
Port plan is EASY-MEDIUM effort, LOW risk if done AFTER the deadline:
replace taskkill with process-group kill via child_process options or
port-based discovery; normalize with path utilities. Do NOT attempt before
the review - zero user-visible benefit, nonzero regression risk.

## 0.7 WHAT THE USER DOES
- Pastes prompts to agents (this file = context for each)
- Adds API keys/accounts when acquired -> update .env + TASK_BOARD comms
- Reviews Master reconciliation notes at checkpoints

---

# TASK BOARD (attendance + comms)
Rules: BEFORE starting a task set Status=RUNNING (your name + time).
AFTER finishing set Status=DONE (+ commit hash). If blocked: BLOCKED(reason).
Comms log at bottom: newest entry first. Format:
[YYYY-MM-DD HH:MM IST] [agent] message

## STATUS SHEET
| Task ID | Status | Agent | Started | Finished | Commit |
|---|---|---|---|---|---|
| T101 | OPEN | - | - | - | - |
| T102 | OPEN | - | - | - | - |
| T103 | OPEN | - | - | - | - |
| T104 | OPEN | - | - | - | - |
| T105 | OPEN | - | - | - | - |
| T201 | OPEN | - | - | - | - |
| T202 | OPEN | - | - | - | - |
| T301 | OPEN | - | - | - | - |
| T401 | OPEN | - | - | - | - |
| T402 | OPEN | - | - | - | - |

## COMMS LOG (newest first)
[2026-08-25 15:45 IST] [MASTER] Board created. P0 re-runs finished earlier
today: books SUCCESS(131135), quotes PARTIAL(131756), lambdatest FAILED
(133122), docs_python PARTIAL(134803) - these four were the FIRST decon batch;
Phase 2 T201 supersedes them for sites 13-20 (books+quotes stay clean).
Quarantine tooling committed (d1b0502). Audit addendum committed (9a2a1a1).
Tier-3 wikipedia attempt killed by user; restart gated behind Phase 2.
[2026-08-25 15:30 IST] [MASTER] Plan created.
## PHASE 5 - PHASE-INDEPENDENT TASKS (safe anytime; claim freely when idle)
### T501 [G1 CLI] Fork MCP wiring phase 2
In vision-fork: wire get_visual_dom(run_id), list_tests(run_id),
get_evidence(run_id,test_id) - all READ-ONLY over existing run artifacts,
zero LLM, zero pipeline contention. Verify roundtrip each.
### T502 [any] EVIDENCE_GUIDE v2 - forensics chapter
Append to docs/EVIDENCE_GUIDE.md: contamination-forensics walkthrough using
docs/AUDIT_REPORT.md ADDENDUM + testing/QUARANTINE_TIER2.md as the worked
example (how TWO explorations landed in one folder, how hosts were checked).
### T503 [G2 web-SOTA] Value-oracle design spec -> docs/VALUE_ORACLE_SPEC.md
Design-only doc for assertion/value-oracle synthesis (top V2 item): how S4
could carry expected-value predicates, validator changes, executor checks.
NO implementation.
### T504 [G2 web-SOTA] Paper Related Work + Intro polish
Independent of results. Cite classic AI-testing literature generically
(FLaky-test literature, GUI testing with vision, LLM test generation).
