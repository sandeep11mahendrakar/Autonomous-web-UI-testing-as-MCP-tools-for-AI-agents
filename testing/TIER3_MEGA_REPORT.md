# TIER-3 MEGA REPORT — Sites 21–30 (Night Campaign 2026-08-26)

**Task:** Tier-3 consolidation (per Master request) · **Author:** serial-B / ox-alpha CLI window
**Branch:** `after-tier-2` · **Status:** FINAL for the data as it stands — one
gate-blocker (F5-01, site 27) explicitly carried open. Every number pulled via
`node testing/extract_run.js <run_id>` from each site's registered run on
2026-08-26. Nothing estimated.

---

## 1. PRE-STATE

Tier-3 launched after T401 gate audit PASS (FT 37/60 = 61.7% recomputed exact,
zero QUARANTINED markers, suites 143/143). Pre-registration
(`testing/CAMPAIGN_PLAN.md`) froze sites 21–30 light-first, policies:
read-only public pages, no logins/posts/purchases, consent auto-dismiss
recorded once, bot-wall/CAPTCHA = honest BLOCKED (valid data), Chrome UA only.
D6 assigned pairs; D7 approved mega-DOM budget (ARCH_A_TIMEOUT_MS=1500000);
D9 opened replacement rows 31–35 after four honest BLOCKEDs.

Known risks entering Tier-3: (1) ox-alpha pool congestion (429 backoffs ×6),
(2) multi-worker concurrency vs the sequential-only rule — the exact failure
mode that caused the Tier-2 night-chain incident, (3) A-side 900s cap on
mega-DOMs.

## 2. EXECUTION STORY

Five workers ran round-robin through `.campaign.lock`. The lock worked — but
**pipeline windows still overlapped**, because runBoth's collector copies from
the SHARED `vision/storage/outputs` dir by mtime. Result: a new contamination
class distinct from Tier-2's. The extended provenance guard (commit `97a29cb`,
defect #24 fix) rejects foreign `exploration_result` files — and those
rejections worked every time (CONTAMINATION_REJECTS.json in each affected run)
— but sibling artifacts (`test_cases_*`, `execution_results.json`,
`exploration_history`) still swept through when another worker's session was
live. Three runs were purity-failed by this class (31, 34, and bbc #27), all
caught by `folder_purity.js` BEFORE any report patch. Zero contaminated rows
entered the ledger — the gate held.

A second coordination class appeared: two double-claims (#33 todomvc, resolved
by earlier-landed-claim rule; #25 goodreads blank-run attempt). Both were
resolved on-board without duplicate reporting.

## 3. PER-SITE FINAL RESULTS TABLE (21–30)

| # | Site | Registered run | Verdict | Overall | A side | B side / replay | S4 acc/off | FT live | Fusion % | Novel |
|---|---|---|---|---|---|---|---|---|---|---|
| 21 | Wikipedia (Web testing) | `run_20260825_230647` | CLEARED | PARTIAL_FAILURE | timeout@900s | B success; replay per report | 7/39 | **3/7 PASS** (6/14 steps) | 87.5%* | 16 |
| 22 | StackOverflow Questions | none — BLOCKED pre-gate | 🚫 BLOCKED | — | HTTP 403 bot-wall (preflight + claim-time re-check); zero quota burned | — | — | — | — | — |
| 23 | GitHub Trending | `run_20260825_232415` | CLEARED | PARTIAL_FAILURE | timeout@900s after 23 steps/20 states/20 URLs, 0 A tests | B no_candidates_remaining; replay 1/1 PASS (weak disclosed) | 5/46 (perfect round, 0 rejections) | **3/5 PASS** (10/12 steps) | 83.3%* | 12 |
| 24 | IMDb Chart Top | none — BLOCKED pre-gate | 🚫 BLOCKED | — | HTTP 202 bot-check (dual-probed) | — | — | — | — | — |
| 25 | Goodreads Lists | `run_20260825_232334` + retry | BLOCKED-honest | BLANK result attempt-1 (consent-wall class); recorded per W5 comms | — | — | — | — | — | — |
| 26 | Hacker News | `run_20260825_234052` | CLEARED (honest FAILED manifest) | FAILED | timeout@900s (17 entries/9 states) | B partial_success | 8/33 | **1/8 PASS** (9/16 steps) | 100%* | 17 |
| 27 | BBC News | `run_20260826_000112` | ⚠️ **UNREGISTERED — F5-01 gate-blocker** | PARTIAL_FAILURE | A success-flow until orchestrator 15-min cap (16 steps/17 states, all on-domain) | B success 8 steps/9 states, replay TC01 PASS live (weak verif disclosed) | chained 7/? | chain executed live post-handoff | 77.8%* | 16 |
| 28 | Archive.org | `run_20260825_235819` | CLEARED-thin | PARTIAL_FAILURE | A success | B partial_success; honest zero from fusion (0 offered) | 0/0 (honest zero) | n/a | 0% | 0 |
| 29 | npmjs Packages | none — BLOCKED pre-gate | 🚫 BLOCKED | — | hard HTTP 403 bot-wall | — | — | — | — | — |
| 30 | Reddit Public (old.reddit) | none — BLOCKED pre-gate | 🚫 BLOCKED | — | anon-access blocked at pre-gate | — | — | — | — | — |

\* Same denominator caveat as Tier-2: A-timeout removes A tests from the final
suite, inflating attribution %. HN is the extreme case: 100% of an 8-test suite
that passed 1/8. Read absolute FT pass rates first.

### Site 27 special note (F5-01, OPEN)
The handed-off pipeline was clean at collect time (3 foreign exploration
results REJECTED), but I chained it during a concurrent window and the catalog
ingested a foreign `execution_results.json` → page_keys poisoned →
folder_purity FAIL. Per protocol I did NOT register row 27: no INDEX verdict,
no report patch. Run kept on disk as contamination evidence. F5-01 stays the
single MED gate-blocker (auditor census: 14/15 registered) until a clean
sequential re-run (recommend post-quota-reset, lock held end-to-end).

## 4. INSIGHTS

### Positive
1. **The purity gate never blinked**: across 15 Tier-3 rows and 4+ contaminated
   run folders, zero contaminated data reached reports or INDEX. The audit's
   mandated invariant works under real concurrency.
2. **Defect #24 went from wound to fix to verified** within hours: extended
   provenance guard (`97a29cb`) rejected every foreign exploration_result;
   residual sweep-through of sibling artifacts produced three documented repro
   cases instead of silent corruption.
3. **Honest-zero behavior generalized**: archive.org's fusion returned 0
   offered candidates rather than fabricating work off a thin catalog.
4. **Verifier-gap evidence accumulated deliberately**: eviltester re-run FT
   1/3 with both fails classified `no_post_action_change` on live-probe-passing
   targets — exactly the assertion-oracle gap the mutation study predicted,
   now reproduced on QA-community targets.

### Negative
1. **Concurrency remains unfixable at process level** — the shared outputs dir
   means ANY overlap can poison sibling artifacts. Three of my four pipeline
   launches this window overlapped someone else's; two died to it.
2. **A-timeout dominated outcomes**: of 6 cleared sites, 4 hit the A cap (even
   at the raised mega-DOM budget where applied). Fusion-% figures are
   systematically inflated by this; the paper must quote absolute FT passes.
3. **Bot-walls took 5 of 15 rows** (stackoverflow 403, imdb 202-check, npmjs
   403, reddit anon-block, goodreads consent-blank): "public" web surfaces are
   ~2/3 accessible to polite automation.
4. **Claims must land before pipelines start** — the #33 conflict was benign
   only because both sides stopped at the purity/report gates.

## 5. PROBLEMS FACED & SOLUTIONS

| Problem | Symptom | Root cause | Fix/Disposition | Verification |
|---|---|---|---|---|
| Defect #24 (collector sweep) | Foreign page_keys in catalogs (sites 31, 34, bbc-chain) | mtime-window collector checks exploration_result only; test_cases_*/execution_results/exploration_history sweep through shared outputs dir | Extended guard `97a29cb` rejects exploration_results (worked every time); folder_purity catches the rest; full fix = extend check to ALL session-id artifacts (3 repro cases attached) | CONTAMINATION_REJECTS.json in each run + purity FAIL blocks registration |
| Double-claim #33 | Two workers ran same URL | Claim drafted but not landed on board before launch | Earlier-landed-claim rule; loser leaves run on disk, patches nothing | Board entries 03:1x vs 03:55; my defer comms `8a109b6` |
| Goodreads blank run | Attempt-1 produced BLANK artifacts | Consent-wall class environment | Honest BLOCKED-honest verdict, spare promoted | W5 comms + INDEX row 25 |
| ox-alpha congestion | 429 storms throughout (up to 5/6 attempts) | Upstream stealth-pool overload overnight | Existing wait-and-retry absorbed; no quota-death abandonment | Pipeline logs show retries succeeding |
| F5-01 bbc unregistered | 14/15 INDEX rows; T301 "15/15" overstated | Hand-off run chained during concurrent window → purity FAIL | NOT registered (this window); gate-blocker kept open with closure recipe | This report §3 note + board comms `c0ebd41` |

## 6. WHERE WE STAND

| Category | Sites | Count |
|---|---|---|
| CLEARED (purity PURE, registered) | 21 wikipedia, 23 github_trending, 26 hackernews, 28 archive_org (+ D9 spares 32 eviltester-rerun, 33 todomvc, 17 sahitest-rerun) | 4/10 core (+3 spare/rerun clears) |
| BLOCKED honest | 22 stackoverflow, 24 imdb, 25 goodreads, 29 npmjs, 30 reddit | 5 |
| UNREGISTERED (F5-01 open) | 27 bbc_news | 1 |

**Scoreboard: 4 core cleared + 5 honest blocked + 1 pending clean re-run.**
Against the pre-registered success bar (≥6/10 complete pipelines) the campaign
is borderline-met only if spares count toward completions (board currently
scores 6 cleared / 6 blocked / 2 skip / 1 pending including D9 rows).

**Honest scope statement.** Tier-3 proved the integrity system rather than the
crawler: more than half the candidate list was walled, A-timeouts capped most
of the rest, and yet every number that reached the ledger traces to a
manifest-verified, purity-PURE run. The one row that failed purity was caught
and excluded — by design, not luck. The remaining work is small and precise:
one clean sequential bbc re-run closes F5-01 and completes the dataset.

---
*Generated by serial-B. Sources: extract_run.js per registered run;
testing/site_reports/INDEX.md; docs/AUDIT_REPORT.md Tier-3 section (F5-01);
docs/TASK_BOARD.md D6–D9 directives; commits cited inline.*
