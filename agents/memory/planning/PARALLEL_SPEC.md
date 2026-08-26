# PARALLEL_SPEC — engineering spec for safe pipeline parallelism

Status: DESIGN ONLY — implementation is POST-DEADLINE per MASTER_PLAN §0.6
(zero user-visible benefit before review, nonzero regression risk).
Author: serial1/ox-alpha, 2026-08-25. Task T103.

## 0. Problem statement (evidence, not conjecture)

1. Vision services bind fixed ports **5000–5004** (`vision/runVision.js:29`
   gateway default 5000; `runBoth.js:123` hardcodes the full list).
2. `freeVisionPorts()` (`runBoth.js:111–144`) probes those ports and
   **`taskkill`s whatever listens on them** (`runBoth.js:137`). Two concurrent
   pipelines therefore do not fail fast — the second one *kills the first
   one's YOLO/OCR/merge/browser services mid-run*.
3. This produced the disclosed ECONNREFUSED contamination incident
   (`testing/tier2_notes_2.js:8`; REPEATABILITY.md disclosure).
4. Lock coverage is inconsistent: `.campaign.lock` exists in
   `testing/rerun_starved.js:43`, `testing/rerun_quarantine.js` (holdLock),
   `testing/night_chain.js:100` — but **not** in
   `testing/run_repeatability.js` nor `mutation/run_detection.js`.
5. `parseAction()` failure is silently absorbed:
   `web/src/llmClient.js:135–136` returns `action:'done', reason:'parse_failed'`,
   indistinguishable from a legitimate done downstream
   (`web/explore.js:124`, `web/src/engine.js:185`; vision analogue
   `vision/src/llm.js:138`).
6. No verification-strength gate on PASS: `fusion/s8_campaign_eval.js:152,191`
   counts FT passes by count/regex only; the STRONG/MEDIUM/WEAK taxonomy lives
   only in `testing/vision_test_quality.js:19–35` and never gates anything.

## 1. D1 — dynamic port allocation

**Design.** A coordinator-free probe scheme (no daemon to babysit):

- New helper `lib/portalloc.js`: `allocateVisionPorts({size:5})` scans from
  `VISION_BASE_PORT` (default 5000) upward, returning the first 5 consecutive
  free ports using the existing `isPortOpen()` probe (`runBoth.js:111–120`),
  then *immediately binds* a temporary socket on each to hold them until
  services spawn (TOCTOU guard).
- `runBoth.js` injects them as env: `VISION_GATEWAY_PORT`,
  `YOLO_SERVICE_PORT`, `OCR_SERVICE_PORT`, `MERGE_SERVICE_PORT`,
  `BROWSER_SERVICE_PORT` (vision/.env already carries these names — the env
  plumbing exists end-to-end).
- `freeVisionPorts()` (`runBoth.js:122–144`) is REPLACED by allocation. The
  netstat+taskkill path (`runBoth.js:128–137`) survives only behind an
  explicit `--reap-stray-ports` maintenance flag.
- `vision/src/serviceManager.js` threads its configured port env into each
  Python service spawn (services already accept port args — Flask dev
  servers); the gateway URL consumer (`vision/runVision.js:29`) needs no change.
- Process-tree cleanup (`serviceManager.js:41`, `runVision.js:67`,
  `runBoth.js:186`) keeps working unchanged because PIDs are tracked per spawn.

**Effort:** EASY-MEDIUM (~half day incl. tests). **Risk:** LOW (fallback to
static 5000–5004 preserves current behavior if allocation fails).

## 2. D2 — per-worker lockfiles

**Design.** Replace the single sentinel with a lock directory:

- `testing/.locks/<owner>.lock` where owner ∈ {site key, study name}.
  Content: `{pid, host, acquiredAt}` JSON.
- Acquire via `fs.openSync(..., 'wx')` — O_EXCL gives atomicity on NTFS.
- Stale detection: holder PID dead (`process.kill(pid, 0)` throws) OR
  `acquiredAt` older than 45 min TTL → steal + log loudly.
- Every launcher routes through one shared helper `lib/campaignLock.js`
  (`acquire(owner,{waitMs})` / `release()`), replacing:
  - `rerun_starved.js:43–45`, `night_chain.js:100ff.`,
    `rerun_quarantine.js holdLock()` — behavior preserved;
  - `run_repeatability.js` and `mutation/run_detection.js` — locks ADDED
    (they have none today; repeatability was the contaminated study).

**Effort:** EASY (~2 h). **Risk:** LOW.

## 3. D3 — shared mutex semantics across study drivers

**Design.** Two-tier policy in `lib/campaignLock.js`:

- Tier 1 (exclusive, non-negotiable): anything that spawns vision services —
  `runBoth.js` itself takes a process-wide singleton lock
  (`.locks/vision-runtime.lock`) as its FIRST act. Even if a driver script is
  buggy or new, the runtime cannot interleave. This is the load-bearing rule;
  driver-level locks become advisory.
- Tier 2 (cooperative): drivers use named locks with `--wait <seconds>`
  backoff-wait instead of hard-abort, so an overnight chain can queue behind
  a manual re-run rather than dying with exit code 2.

**Effort:** EASY once D2 lands (same helper). **Risk:** LOW-MED — the
singleton inside runBoth.js changes failure mode from "silent sabotage" to
"fast clear error", which is the intended direction.

## 4. D4 — fail loudly on parse_failed

**Design.**

- `parseAction()` (`web/src/llmClient.js:92–136`; `vision/src/llm.js:138`)
  returns `action:'parse_failed'` (NOT `'done'`) on total strategy failure.
- Explorers (`web/explore.js:124`, `web/src/engine.js:185`, vision explorer
  decision loop) treat it like any failed step: reprompt once, then record a
  `parse_failed` transition and continue; they maintain a running
  `parse_failed_count` emitted into `dom/memory_log.json` summary /
  exploration_result.
- `runBoth.js` manifest aggregation adds `architecture_{a,b}.parse_failed`
  counts. Gate: if parse failures exceed 25% of LLM decisions,
  `overall_status` becomes `FAILED_PARSE_QUALITY` — visible in INDEX tooling,
  impossible to mistake for a clean run.
- `fusion/s8_campaign_eval.js` flags any run dir whose manifest lacks the new
  fields as legacy (schema_version gate already planned in PROJECT_HANDOFF §6
  P1 item).

**Effort:** MEDIUM (~half day; touches both archs + manifest schema).
**Risk:** LOW (strictly additive fields; old artifacts remain readable).

## 5. D5 — minimum verification-strength for PASS

**Design.** Reuse the existing taxonomy (`testing/vision_test_quality.js:19–35`):

- FT executor (`fusion/execute_fusion_tests.js`) already records a
  verification `method` per step (see quality ledger inputs). Add per-test
  classification at execution time using the same `classify()` rules.
- New gate in `s8_campaign_eval.js` (alongside `ftPass`, lines 152/191):
  - a test PASSing with ONLY WEAK signals (body-text heuristics) is
    reclassified **PASS_WEAK** — reported, but excluded from the headline
    FT-live pass rate;
  - value-bearing objectives (fill/select/checked assertions) require a
    STRONG signal for full credit; MEDIUM caps at partial credit in the
    weighted rate.
- Headline metric becomes `verification_weighted_pass_rate` alongside the
  raw rate; both printed, raw kept for continuity with published numbers.
- Auditor trust item answered: every PASS in the final report decomposes into
  (signal classes present × outcome), recomputable from artifacts alone.

**Effort:** MEDIUM (~1 day: executor annotation + s8 logic + regen).
**Risk:** LOW-MED — headline numbers will move DOWN for some sites; this is
honesty, not regression, and must be footnoted at Gate (T401).

## 6. Rollout order & verdict

| # | Item | Effort | Risk | Order |
|---|---|---|---|---|
| D2+D3 | campaignLock helper + runBoth singleton | ~3 h | LOW | 1st |
| D1 | dynamic ports | ~0.5 d | LOW | 2nd |
| D4 | parse_failed loudness | ~0.5 d | LOW | 3rd |
| D5 | verification-strength gate | ~1 d | LOW-MED | 4th |

Total ≈ 2–2.5 focused days post-deadline. Sequence rationale: D2/D3 make all
later work safely testable in parallel; D1 removes the physical collision;
D4/D5 are measurement-honesty upgrades with no cross-dependency.

Non-goals: multi-host distribution, service mesh, removing Windows-specific
process cleanup (that is T102's portability plan, complementary).
