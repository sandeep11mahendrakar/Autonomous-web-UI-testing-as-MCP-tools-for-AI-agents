# RETROSPECTIVE_TIER2.md — Engineering retrospective: campaign sites 1–20

**Author:** serial-C (ox-alpha CLI window). Task T602, Master directive D2,
completed after T201 finished clearing sites 17–20 (2026-08-25 evening).
**Status:** FINAL for the 1–20 campaign scope. All numbers below are read from
regenerated artifacts (`s8_campaign_eval.js` @ 2026-08-25T15:16Z, per-run
`dashboard_data.json`, quarantine/re-run logs) — nothing estimated.

---

## 0. Where the campaign stands (final 11–20 scoreboard)

| # | Site | Final run | Verdict | FT live | Fusion attr. |
|---|---|---|---|---|---|
| 11 | Books to Scrape | `run_20260825_131135` | CLEAN | 3/3 PASS | 75% |
| 12 | Quotes to Scrape | `run_20260825_131756` | CLEAN | 1/2 PASS (honest semantic FAIL) | 66.7% |
| 13 | LambdaTest Playground | re-run `run_…161515` | SITE-MOVED-EVIDENCE (301→testmuai.com, verified rebrand) | 4/5 PASS | 100% |
| 14 | Python.org Docs | `run_20260825_163448` | CLEARED-BY-RERUN | 1/8 PASS (A-timeout structural) | 88.9% |
| 15 | Project Gutenberg | `run_20260825_165819` | CLEARED-BY-RERUN | 4/4 PASS | 80% |
| 16 | WeatherSpark | `run_20260825_173233` | CLEARED-BY-RERUN | 5/8 PASS | 100% |
| 17 | SahiTest Demo | `run_20260825_194511` | CLEARED-BY-RERUN | 1/1 PASS | 33.3% |
| 18 | The Internet (status codes) | `run_20260825_195406` | CLEARED-BY-RERUN | 4/4 PASS | 80% |
| 19 | PHPTravels Demo | `run_20260825_201027` | CLEARED-BY-RERUN | 5/6 PASS | 60% |
| 20 | Open Library | `run_20260825_203014` | CLEARED-BY-RERUN | 0/7 (all honest no-signal FAILs) | 87.5% |

Campaign-wide (s8 regenerated): 19 scored + 1 blocked; fusion offered 86 /
accepted 60; FT live 37/60 PASS; **mean fusion-attributable 48.7%**.

Every QUARANTINED row was cleared behind the three attribution guards +
folder-purity checks. Zero quarantined markers remain in INDEX.

---

## 1. Problems faced on sites 11–20 — root causes and resolutions

### Class A — Attribution corruption (the defining failure of the campaign)

**What happened:** sites 13–20 were originally registered against unified
runs that had physically executed against OTHER sites (saucedemo, demoblaze,
localhost fixtures) because three workloads ran concurrently overnight and the
collector stitched artifacts into whichever run directory was newest (mtime
windows). Reports then wrapped wrong-site data in plausible narratives.

| Specific problem (site(s)) | Root cause | Fix applied / status |
|---|---|---|
| 13–20 wrong-site catalogs & FT evidence | Orchestration picked run dirs by recency, not identity | FIXED: strict `findRunDir(manifest-url ∧ created-this-attempt)` — no newest-dir fallback anywhere |
| Fixture replays swept into foreign run trees (14, 15, 165105 incident) | Shared `vision/storage/outputs` crosses run boundaries even with distinct run dirs | MITIGATED: sequential-only rule + `assertVisionStartUrls` guard catches violations; structural fix (session-scoped storage) = approval list §4 |
| Concurrent pipelines kill each other's services | `freeVisionPorts()` **taskkills whatever listens** on ports 5000–5004 | OPEN (design-approved): dynamic port allocation, PARALLEL_SPEC D1/T103 |
| EADDRINUSE crashes hidden downstream as "ECONNRESET/PARTIAL" | Fixed ports + probe-then-spawn TOCTOU + `stdio:'ignore'` children | Same D1 work item; fail-loud preflights from T102 plan |
| Null `page_key` recorded in weatherspark re-run catalog (DEFECT #23) | Catalog builder accepted null `from_url` | FIXED: null-guard in S1 + normalize.js (`05baac6`) |
| Duplicate `post` re-ran S4/FT on the SAME run dir (site 18 second-post incident) | Post mode has no idempotency check; two watchers raced | PARTIALLY FIXED this window: warning added (see §3c); full idempotency = §4 |
| Two lock-race aborts between windows (19:54, 20:26) | Binary `.campaign.lock`, no queueing, board claims advisory-only | MITIGATED: PID-liveness staleness check (§3b); queue-runner = §4/§5 |

### Class B — Provider quota / LLM reliability

| Specific problem | Root cause | Fix / status |
|---|---|---|
| A starved on books/quotes (15-min orchestrator cap hit mid-exploration; deterministic fallback values) | Groq 200k TPD exhausted during overnight batch | Mitigated: scheduler quota-gates on key endpoint; 429 wait-and-retry honoring provider delay; remaining: shared token-bucket limiter (backlog A6) |
| S4 returned no JSON on ox-alpha (defect #21-class) | Reasoning channel consumed FUSION_MAX_TOKENS=1500 pre-JSON | FIXED: reasoning=low + 4000 tokens (verified 0→3 accepted) |
| Malformed LLM JSON silently ended exploration looking successful (AUDIT F-04) | `parseAction` returned `action:'done',reason:'parse_failed'` | **FIXED this window** (`2ed3d91`): returns honest `'parse_failed'`; deterministic fallback still fires when candidates remain |
| 429 bursts throughout clearance windows | ox-alpha stealth pool = global 1000/day shared by all windows | Paced via provider retry; quota ledger on board proposed (adopted ad hoc) |

### Class C — Perception limits (architecture-level, mostly permanent-for-now)

| Site | Problem | Root cause | Disposition |
|---|---|---|---|
| 16 WeatherSpark | B produced 0 tests (canvas blind spot) | YOLO/OCR cannot see chart-canvas actionable content | Honest weak-B datapoint; fusion delivered 100% via A-side; canvas-aware perception = V2 |
| 17 SahiTest | Legacy frame-based pages broke coordinate re-detection | Frames/iframes unsupported by both pipelines | Documented V2 limit; site kept as limited-coverage point |
| 13 LambdaTest | Site itself MOVED (301 → testmuai.com) | Real-world rebrand | Verified via live HTTP check + web sources; provenance filter applied |
| 19 PHPTravels | Demo URL serves a demoblaze-style mirror | Site misconfiguration — a genuine FINDING by the pipeline | Re-run confirmed live behavior honestly; ledger note kept |
| various | OCR variance ("Leam more") breaking replay matches | Tesseract noise across runs | Mitigated by `lib/fuzzyMatch.js`; never fully eliminable |

### Class D — Executor / vocabulary

| Problem | Root cause | Disposition |
|---|---|---|
| FT executor crash resolving behavior refs (defect #20, hit at books) | `CATALOG_INDEX.elements` is a Map; code iterated like object | FIXED (iterate `.values()`) before 11–20 batch |
| openlibrary FT 0/7 despite 87.5% attribution | S4 composed 7 novel tests; none produced observable state change (js-nav ERR_ABORTED warnings; B partial no_valid_candidate) | Honest failures recorded; feeds verification-strength gating (D5) and capability-flag filtering (backlog A3) so doomed candidates aren't offered |
| Weak-signal passes inflate green (phptravels: 4 of 14 steps verified only by body-text change) | Verification ladder bottoms out at body-text>100-chars | Known ceiling — mutation study proved it; fix = D5 + value-oracle (§4.1) |

### Class E — Process / coordination

| Problem | Root cause | Disposition |
|---|---|---|
| Overnight concurrency corrupted the ledger | No admission control inside pipeline; operator discipline only | Sequential-only rule now load-bearing + mechanically enforced by runtime locks |
| Stale `.campaign.lock` blocked windows for hours (dead PIDs 18592, 25664) | Lock honored blindly regardless of holder aliveness | **FIXED this window** (`cc5e088`): dead-PID locks stolen loudly at acquisition; validated live during site-19 operations |
| Scratch run `175558` (sahitest cancel) left unattributable | Human-cancelled mid-launch; no manifest | Kept on disk as evidence, marked do-not-cite |
| Board timestamp drift (~30 min between windows) | Host clock skew | Adopted UTC ISO alongside IST in comms |

---

## 2. What the architecture got right (guards that earned their keep)

1. **Honest failure taxonomy end-to-end.** Every FT step carries a failure
   class + stage + screenshot evidence. AUDITOR-3 recomputed every headline
   number from raw artifacts — all reproduced exactly. The arithmetic was never
   the problem; artifact *identity* was, and that got its own guard set.
2. **Domain assertions caught real contamination twice in production**
   (run_165105 gutenberg-in-docs_python tree rejected; every clean run
   positively validated). Written after the audit found the wound; fired
   correctly the very next time the wound tried to reopen.
3. **Grounding validator rejections stayed strict under pressure** —
   cross_page_ref candidates rejected on sahitest/openlibrary/phptravels
   rather than accepted to inflate numbers; action_mismatch rejections on
   quotes. Doomed candidates fail at synthesis, not silently at execution.
4. **The mutation study published the system's own weakest result** —
   "verifies actions-work, not values-correct" (wrong_calc passed 4/4 through
   a phantom-$10 total). That honesty converted a ceiling into the top-ranked
   V2 research direction.
5. **Quarantine discipline**: contaminated runs kept on disk as evidence,
   reports rewritten append-only, markers cleared only after guard-passing
   re-runs — the Gate condition defined in the audit addendum was met to the
   letter.
6. **Coordination culture converged under fire**: claims-before-work,
   verbatim human-directive relay, per-site ownership, lock queues — adopted
   the same day after two duplicate-launch incidents.

---

## 3. Minor fixes applied (auto-approved, done independently)

Each suite-verified; offline suites went 137 → 138 → **143/143 PASS**.

| # | Fix | Commit |
|---|---|---|
| a | DEFECT #23 null-guard in S1 catalog builder (pre-existing, cited) | `05baac6` |
| b | **PID-liveness for stale `.campaign.lock`**: new `testing/campaign_lock.js`; dead-PID locks stolen loudly (moved aside as evidence), live/garbage locks honored conservatively; wired into `rerun_quarantine` / `rerun_starved` / `night_chain`; +5 unit tests. Validated in production during site-19 ops (blocked a window while PID 29428 genuinely alive). | `cc5e088` |
| c | **parse_failed never masks as done** (`web/src/llmClient.js`): returns `action:'parse_failed'` per AUDIT F-04 / PARALLEL_SPEC D4; downstream deterministic-fallback behavior unchanged; +1 regression test | `2ed3d91` |
| d | Duplicate-post warning: `post <site>` logs a loud WARNING when `ft_execution_results.json` already exists for the attributed run dir (site-18 second-post incident class) — warns without blocking deliberate reconciliations | this commit |
| e | Explicit-path-only commits note: all commits in this lane use explicit file paths (`git add <paths>`), never `git add -A` — prevents sweeping other windows' uncommitted lane files into foreign commits | process, observed throughout |

---

## 4. Major changes REQUIRING USER APPROVAL (design summaries — build next)

Ranked by expected trust/capability gain. Nothing below is implemented.

1. **Value/assertion-oracle synthesis** (answers the mutation ceiling).
   Expected-value predicates `{target, property, expected}` attached to test
   objectives AT GENERATION TIME; S4 context enriched with capability flags
   (readonly/editable/type) so offered gaps can yield assertable outcomes;
   executor gains an assertion-evaluation stage above the current ladder;
   PASS requires ≥1 STRONG/value signal; `PASS_WEAK` excluded from headline
   rates (D5 gate). Touch points: `fusion/s4_context.js`,
   `fusion/execute_fusion_tests.js`, `vision/src/executeTests.js`,
   `fusion/s8_campaign_eval.js`. Headline pass rates will move DOWN — that is
   the point.
2. **Dynamic ports + single runtime mutex** (PARALLEL_SPEC D1/D2/D3):
   allocation-from-base replacing `freeVisionPorts()`'s taskkill path;
   `lib/campaignLock.js` shared helper with per-worker named locks + TTL;
   runBoth takes a process-wide singleton as its FIRST act. Mechanically closes
   the entire attribution-corruption class instead of relying on discipline.
3. **Session-scoped vision storage** (structural fix for the stitching class):
   per-run output subdirs keyed by session id so even a buggy concurrent
   collector cannot sweep foreign artifacts into a run tree; plus the
   audit-addendum invariant (every exploration file carries the manifest's
   session/start-url) enforced BEFORE a run dir is accepted.
4. **Identity reconciliation across A/B spaces** (backlog A5): same page +
   normalized label + compatible type-map → `likely_same` marking WITHOUT
   merging; converts "common elements ≈ 0 everywhere" from a modeling artifact
   into an honest overlap estimate.
5. **Post-chain idempotency + queue runner**: `post <site>` refuses
   (not just warns) re-execution on an already-chained run dir unless
   `--force`; a `testing/queue_runner.js` combines claim → lock-wait →
   pipeline → post → guards → patch in ONE command, eliminating the watcher
   race windows entirely.
6. **SPA extraction** (backlog A4) before any Tier-4-class site:
   `[role=button],[role=link],[onclick]` selectors, scroll-and-settle,
   location.hash in fingerprints.

## 5. New suggestions from serial-C (my own, beyond the existing backlog)

1. **Guard-passed flag in dashboard_data.json** — the s8 confidence heuristic
   currently marks cleared sites 17–20 LOW because it can't see decontamination;
   thread a `guards: {attribution, domains, startUrls, purity}` block from the
   post chain into dashboard artifacts so confidence reflects reality.
2. **HTTP-status awareness in the semantic ladder** — body-text verification
   passes on 404/error bodies; add response-status capture at navigate steps
   so navigation-to-error becomes visible (openlibrary's js-nav ERR_ABORTED
   cluster would then classify cleanly).
3. **Quota ledger as artifact, not chat** — append per-run request counts to
   `logs/llm_usage.jsonl` rollups and surface a daily budget line in s8, so
   pacing decisions survive window handoffs.
4. **Per-site claim files** (`.claims/<site>.claim`) checked by drivers before
   launch — makes the board's advisory ownership mechanical at zero cost.
5. **Retire-or-fold micro-sites** — site 18's status-code subset duplicated
   Tier-1 coverage; spare slots should prefer distinct interaction profiles
   (already noted in tier2_notes_3; promote it to shortlist policy).

## 6. Ranked recommendations for post-campaign architecture work

1. D2+D3 shared lock helper + runBoth singleton → 2. D1 dynamic ports →
3. Finish D4 (manifest parse-quality fields + 25% gate) → 4. D5
verification-strength gating in s8 → 5. Value-oracle synthesis (§4.1) →
6. Session-scoped storage (§4.3) → 7. SPA extraction (§4.6) → 8. Shared rate
limiter (A6) → 9. Recorded-login replay (A7) → 10. Identity reconciler (§4.4).

Sequence rationale: items 1–3 remove the corruption class mechanically and
make everything after safely testable; 4–5 convert honesty upgrades into
capability; the rest raise coverage and realism.

— serial-C / ox-alpha, 2026-08-25. Evidence: runs/<id>/fusion/*,
testing/rerun_quarantine.log, docs/AUDIT_REPORT.md (+evidence E1–E8),
testing/QUARANTINE_TIER2.md, testing/CAMPAIGN_EVALUATION.md (regenerated),
docs/MCP_READINESS.md, docs/PARALLEL_SPEC.md, mutation/results/ANALYSIS.md.
