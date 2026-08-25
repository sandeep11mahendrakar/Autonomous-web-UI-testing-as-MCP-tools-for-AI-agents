# PROJECT_MEMORY.md — single source of truth

Last updated: 2026-08-24 (evening — Tier-2 prep: fuzzy matcher, mutation
harness, campaign evaluator, repeatability runner; quota-gated work scheduled).

---

## 0. SESSION RESULT (2026-08-24 evening, branch `capstone-tier2-prep`)

Branch created off `capstone-final-integrated`; ALL work below committed and
pushed to the `backup` remote
(`github.com/sandeep11mahendrakar/mcp-for-the-testing-temp-`).
**The Neonishh origin remote was REMOVED from git config by user instruction —
never push there from this clone.**

1. **A2 fuzzy matcher DONE**: `lib/fuzzyMatch.js` (containment -> windowed
   edit-distance <=2 -> token overlap >=0.6) wired into B's replay
   `resolveTarget` as tier between exact text match and proximity fallback.
   Fixes bstackdemo/AutomationExercise OCR-variance replay failures.
2. **Mutation harness BUILT + RUN (3 rounds)** (`mutation/`): deterministic
   fixture app with 5 seeded bugs, detection analyzer with honest
   DETECTED/NOT_DETECTED/NOT_COVERED taxonomy. Round-3 headline finding:
   **the system verifies actions-work, not values-correct** — wrong-calc /
   missing-validation / dead-button undetectable even when fully exercised
   (FT 4/4 PASS on the buggy cart page). Full analysis:
   `mutation/results/ANALYSIS.md`. New V2 P1 item: assertion/value-oracle
   synthesis. Rounds 1-2 archived honestly (server-close bug; default depth).
3. **s8 campaign evaluator DONE** (`fusion/s8_campaign_eval.js`, zero LLM):
   aggregates INDEX ledger + per-run dashboard_data/manifests ->
   `testing/CAMPAIGN_EVALUATION.md` (summary, SUCCESS/PARTIAL/BLOCKED matrix,
   confidence heuristic column, A-vs-B means, fusion contribution quality,
   curated defect/discovery/limitation ledgers, cost/time). Implements the
   ChatGPT-report review items approved by the user.
4. **Repeatability runner READY** (`testing/run_repeatability.js`): N runs/site,
   separates exploration variability vs execution flakiness vs API variance.
5. **QUOTA INCIDENT + overnight scheduler**: ox-alpha key = 1000 req/DAY
   (not near-unlimited); exhausted mid-round-3 at ~18:20 IST. Last 3 mutation
   variants have fused=NO_REPORT (quota casualties). `testing/
   overnight_scheduler.js` polls the key endpoint and auto-runs remaining
   variants + repeatability study after the 00:00 UTC reset.

Offline suites after changes: **116 tests PASS** (was 91).

Code changes this session (all on `capstone-tier2-prep`, pushed to backup):
`lib/fuzzyMatch.js` (+tests), `vision/src/executeTests.js` (matcher wiring +
exports), `mutation/*` (fixtures/server/analyze/run_detection + results +
ANALYSIS), `fusion/s8_campaign_eval.js` (+tests),
`testing/{CAMPAIGN_EVALUATION.md, run_repeatability.js,
overnight_scheduler.js}`, backlog priority updates.

NEXT: verify overnight scheduler output in the morning -> finish scorecard ->
Tier-2 campaign sites 11-20 (list to be availability-checked at runtime;
~50-60 LLM calls/site fits within a daily 1000 budget if paced).

---

## 0a. PREVIOUS SESSION RESULT (2026-08-23, saucedemo.com)

First full-pipeline validation on a site OTHER than DemoQA, using the
`stealth/ox-alpha` OpenRouter model (free, reasoning effort=low):

- **Run:** `runs/run_20260823_225906/` (unified A+B on https://www.saucedemo.com)
- **Arch A:** login (standard_user) → inventory → 5 add-to-cart → cart page;
  8 steps / 9 states / 3 URLs; 4 grounded LLM test cases (login, single-add,
  multi-add, bulk-add). Prompt fixes were required to get here (see §4a).
- **Arch B:** stayed confined to the LOGIN page (12 steps / 5 states / 1 URL).
  Root cause: OCR cannot read input placeholders, so username vs password are
  indistinguishable text_input boxes; B filled BOTH with `standard_user`.
  Honest documented vision limitation on credential-form sites. B's replay
  test PASSES (after executor warmup-retry fix).
- **S1 catalog:** 350 observations → 40 elements / 17 behaviors / 2 pages /
  10 conflicts.
- **S2 gaps:** elements common=0 a_only=4 b_only=36, actionable-uncovered=19,
  coverage 10%; behaviors uncovered 9; conflicts 10.
- **S4 Fusion:** executability filter added (see §4b); 1 conflict gap offered →
  3 candidates → 3 accepted, all grounded (Login control input-vs-button
  disambiguation probes + composed workflow).
- **FT live execution: FT001 PASS, FT002 PASS, FT003 FAIL** (semantic
  verification, honestly classified; no silent pass).
- **S6 dashboard headline: 37.5% of final tests attributable to Fusion
  (3 of 8 total = 4 A + 1 B + 3 Fusion); novel targets 3; renders standalone.**
- Offline suites after changes: fusion+web 67/67 PASS (one new S4 filter test).

Code changes made this session (ALL UNCOMMITTED):
1. `lib/llmProvider.js`: optional `reasoning:{effort}` support via
   `<PREFIX>LLM_REASONING` or global `LLM_REASONING` env var.
2. `.env` files: keys/model switched to OpenRouter `stealth/ox-alpha`,
   `LLM_REASONING=low`, `GROQ_MAX_TOKENS_A=3000` (1500 truncated test-gen JSON).
3. `web/src/preprocess.js` + `web/explore.js`: exploration prompt now includes
   visible PAGE TEXT and generic goals for non-DemoQA flows (was DemoQA-
   hardcoded — A could not know valid credentials before this fix).
4. `vision/src/explorer.js`: action rules now require filling EVERY required
   form field with DISTINCT matching values before submit (B was re-filling
   username forever), top-input=username / bottom-input=password heuristic,
   exact on-screen credentials usage.
5. `vision/src/executeTests.js`: re-detection retry with backoff (services
   spawn race caused 500 → immediate FAIL; now retries 3x).
6. `fusion/lib/s4_context.js`: EXECUTABILITY FILTER — gap candidates whose
   target has no DOM selector (vision-only elements, behaviors with visual
   targets, conflicts on selector-less labels, fully-vision quiet pages) are
   no longer offered to the LLM; conflict gap entries now carry their
   resolvable element ref explicitly.
7. `fusion/execute_fusion_tests.js`: trailing-slash-tolerant navigate URL
   comparison; behavior refs resolve through their recorded target selector
   when a catalog element owns it.

Known remaining issue: `s6_dashboard.js --validate` still asserts DemoQA-run
invariants (expects 80 uncovered elements, FT001 4/4) — fails on other runs by
design; needs parameterization if used beyond the reference run.

---


## 1. PROJECT IDENTITY

- **Project:** "AI-Assisted Test Case Generation for Mobile and Web UI/UX Applications" — Team 101, PES University capstone.
- **Core idea:** Two independent web-testing architectures explore a site:
  - **Architecture A** (`web/`) — DOM + state-machine exploration (selectors, text LLM).
  - **Architecture B** (`vision/`) — screenshot → ScreenParser YOLO11-L + Tesseract OCR → Visual DOM → coordinate-based tests.
  - **Fusion layer** (`fusion/`) — deterministically merges A+B artifacts into a canonical catalog, finds coverage gaps/conflicts, uses ONE grounded LLM call to synthesize new tests, executes them live, and reports everything on a dashboard.
  - **Mobile** (`mobile/`) — Appium-based exploration (offline dry-run framework only, not production-ready).
- **Repo:** `C:\Users\sandeep\pes\vs code\Capstone-Project`
  (NEVER use older clone at `C:\Users\sandeep\pes\CAPSTONE\Capstone-Project`)
- **Remote:** https://github.com/Neonishh/Capstone-Project.git
- **Branch:** `capstone-final-integrated`. HEAD `0afd04b` "feat: finalize closed-loop vision execution". Never modify `main`; never force-push.
- **PR #5** (`capstone-final-integrated` → `main`): OPEN, not merged.
- **All Fusion-phase work is UNCOMMITTED** (fusion/, lib/, test/, web+vision changes, this file). Commit/push ONLY with explicit user authorization.
- Secrets live only in untracked `.env` files (`web/.env`, `vision/.env`). Never commit or print them. YOLO weights gitignored (re-download ScreenParser from HuggingFace on fresh clones).

## 2. STRUCTURE

```
Capstone-Project/
├── web/       = Architecture A (DOM state-machine collector)
├── vision/    = Architecture B (YOLO ScreenParser + OCR visual pipeline)
├── fusion/    = S1 catalog, S2 gaps, S4 synthesis+validator, FT executor,
│                S6 dashboard + fusion/test/
├── lib/       = llmProvider.js dual-provider transport (groq/openrouter)
├── mobile/    = Appium mobile architecture (intact, dry-run validated)
├── database/, docs/ = team assets (do not modify unless necessary)
├── runs/<run_id>/   unified outputs (gitignored):
│     dom/ (A artifacts) · vision/ (B artifacts) · fusion/ (S1/S2/S4/FT/S6)
└── runBoth.js = unified concurrent A+B orchestrator (one URL → one run ID)
```

Reference run for ALL Fusion artifacts:
`runs/fusion_s1_A214750_B169243844/` (unified run `run_20260822_214750`).

## 3. LLM PROVIDERS / API STATUS (verified 2026-08-23)

- **OpenRouter is now the DEFAULT for ALL tasks** (A, B, Fusion). Configured via
  prefixed env vars over shared `lib/llmProvider.js`:
  - `ARCH_A_LLM_PROVIDER=openrouter`, model `nvidia/nemotron-3-super-120b-a12b:free`
  - `ARCH_B_LLM_PROVIDER=openrouter`, same nemotron model
  - `FUSION_LLM_PROVIDER=openrouter`, model `google/gemma-4-31b-it:free`
- **Groq key is DEAD (401 Unauthorized)** — legacy GROQ_* vars exist but are
  overridden by ARCH_*/FUSION_* vars. Replace key if Groq is ever needed again.
- **OpenRouter limits (free tier, verified live):** 50 free-model requests/DAY
  shared across all `:free` models on the key; $0 spent; resets ~05:30 IST
  daily. Adding $10 credits unlocks 1000 free requests/day. Key check endpoint:
  `GET openrouter.ai/api/v1/key`.
- History notes: Groq org previously hit its 200k tokens/day cap;
  gpt-oss-20b burns its whole budget in the reasoning channel — prefer
  non-reasoning models (gemini/gemma flash class). The ONE successful real S4
  Fusion call used `openrouter:google/gemini-3.5-flash`.
- `STUB_LLM=true` runs everything fully offline without keys.
- Raw LLM responses always persisted (`fusion_raw_response.txt`) so failures
  are diagnosable without repeat calls.

## 4. STATUS BY COMPONENT (all validated)

### Architecture A (`web/`) — SUBSTANTIALLY COMPLETE
DOM-based autonomous state-machine collector. Headless by default (`HEADLESS=false` to show). State-machine loop: capture DOM → LLM picks ONE action → execute → fresh extraction → fingerprint (URL + tag/type/name/text + visible-text hash) → go-back vs adopt-new-state. Incremental persistence after every step; SIGINT-safe. Multi-page same-origin exploration. Grounded multi-step test generation (LLM reconstructs REAL recorded workflows only) + deterministic grounded fallback (zero LLM). Deterministic-first flow discovery (LLM only for ambiguous/sparse pages).

Latest unified run: 21 steps · 15 states · 7 URLs · 9 clicks/8 fills/4 navigates · 10 go-backs · 0 errors · termination `max_states_reached` · 2 grounded test cases (0 ungrounded selectors). Offline suite `web/test/explore.test.js`: 10/10 PASS.

Known limits (documented, not hidden): fingerprint counts every visible text change as new state (fill-heavy pages inflate state counts); deterministic fallback can re-pick low-value elements; identity space = DOM selectors vs B's labels (see §5).

### Architecture B (`vision/`) — SUBSTANTIALLY COMPLETE
Screenshot-driven: ScreenParser YOLO11-L (55 UI classes) + Tesseract OCR + merge → Visual DOM JSON with per-element confidence. Screenshot evidence for every capture/action/state. Closed-loop post-action re-detection: targets RE-RESOLVED on current state (type+OCR-text match); stale coordinates never clicked — unresolvable targets FAIL explicitly. Autonomous multi-page exploration (`runVision.js --explore`) with fingerprinted states, failure blacklist, anti-loop caps. Semantic verification ladder (strongest-first): input_value → checked_state → scroll_position → visual_state_change → url_change → body_text_fallback (weak, always flagged). Strong expectations with no signal = FAIL. Permanent Playwright executor + serviceManager auto-start/cleanup (ports 5000–5004, Windows process-tree kill). Validated: Forms 6/6 PASS, cross-page 7-URL workflow PASS, 2 stale-coordinate corrections in one run. Residual limits: banner/footer pseudo-links, rotating ads, no file choosers/iframes/native dialogs.

### Unified runner (`runBoth.js`) — COMPLETE
One URL → A and B run CONCURRENTLY and INDEPENDENTLY under one run ID; strictly separated outputs (`dom/`, `vision/`, `run_manifest.json`). Provider isolation via prefixed env. One arch failing never blocks the other (SUCCESS/PARTIAL_FAILURE/FAILED recorded honestly).

### Fusion S1 catalog (`fusion/s1_build_catalog.js` + `lib/normalize.js`) — COMPLETE
Deterministic normalization/canonicalization of A+B artifacts → neutral observations → canonical catalog: 411 observations → 204 elements, 23 behaviors, 12 pages. Per-record A/B provenance, evidence pointers, conflicts. Byte-identical rebuild verified. Tests: 14 pass (52 assertions).

### Fusion S2 gap report (`fusion/s2_gap_report.js`) — COMPLETE
Deterministic set algebra over catalog + A/B test steps: common/A-only/B-only splits; 80 actionable uncovered elements; 12 uncovered behaviors; 9 classification conflicts; rare (127)/low-confidence/multi-position (74) anomalies; quiet pages (3). NOTE: A/B behavior IDs conservative and mostly non-overlapping (A=DOM selectors, B=visual labels) — NOT artificially merged. Tests: 9 pass (61 assertions).

### Fusion S4 synthesis (`fusion/s4_fusion_synthesis.js` + `lib/{s4_context,s4_validate}.js`) — COMPLETE
Compact structured context ONLY (ids/types/labels/page keys; NO raw DOM/OCR/screenshots): 16,277 chars (~4k tokens). Deterministic gap candidates with stable IDs (`gap_el_*`, `gap_bh_*`, `gap_conflict_N`, `gap_quiet_*`) — the ONLY accepted source_gap_ids. Hard grounding validator: step refs must exist in S1 catalog; navigate URLs must be exact catalog page_keys; refs must be on workflow's current page; action/type compatibility; fill requires value + fillable type. Dedup: in-batch signature dupes rejected; tests whose targets are ALL already covered by A/B rejected (`duplicate_of_existing`); navigation counts as routing, never novelty. ONE real LLM call: 54 gaps → 1 candidate → 1 accepted (FT001), 0 rejected, all grounded, zero duplicates. FT001 = browser-windows New Tab/New Window/New Window Message — a quiet page neither A nor B tested. `--dry-run` mode available. Tests: 21 pass.

### Fusion test executor (`fusion/execute_fusion_tests.js`) — COMPLETE, PROVEN
Zero LLM calls. Resolves targets via S1 catalog selectors; verifies each target on the LIVE page (exists + visible + enabled + live label == catalog label) BEFORE clicking; coordinates captured live at execution time. Failure classification wired (fusion_generation | catalog_grounding | target_resolution | browser_execution | semantic_verification). FT001 LIVE: PASS 4/4 (new tab → demoqa.com/sample; window count 2→3; delayed popup, 119-char body). Evidence: `fusion/ft_execution_evidence/` (7 screenshots).

### Dashboard S6 (`fusion/s6_dashboard.js` + `lib/dashboard_data.js`) — COMPLETE
Deterministic aggregation of A/B/S1/S2/S4/execution artifacts → `dashboard_data.json` + standalone `dashboard.html` (data embedded, zero framework/CDN/server, renders from file://; render verified via Playwright). Shows all 14 dimensions: coverage splits, gaps, conflicts, test/exec counts, PASS/FAIL, verification strength, reliability, provenance footers. Headline metrics: total final tests 4 (A=2, B=1, Fusion=1) → **25% fusion-attributable**; 6 novel action targets only Fusion exercises. Coverage matrix: elements 83/204 covered (A=13, B=68, Fusion=3); behaviors 23 (A=11, B=0 — different identity spaces, honestly shown); states A=15/B=9/Fusion=1. `--validate` mode: ALL PASS. Tests: 12/12 pass.

### Full offline test suite
`s1(14) + s2(9) + s4(21) + s6(12) + web/explore(10) = 66/66 PASS, zero API`.
Re-run: `node --test fusion/test web/test`.

## 5. CURRENT LIMITATIONS & REMAINING WORK

The core architecture is done; project is in validation/improvement stage:

1. Broader real-site validation (only DemoQA exercised end-to-end).
2. Repeatability/flakiness measurement (dashboard honestly reports "single execution run").
3. **Edge-case generation NOT implemented** (no module exists anywhere — do not claim otherwise). Future categories: empty/invalid input, boundary values, repeat submit, back/forward, refresh mid-flow, alternate flows, missing required fields, transition edges.
4. Coverage improvement (80 uncovered actionable elements + 12 behaviors).
5. Possible A/B identity-model improvement (selector-space vs label-space matching is conservative; causes behaviors B=0).
6. Execution/retry analysis, final dashboard refinement, final evaluation/report deliverables.

## 6. MOBILE — unchanged, not production-ready

Appium pipeline wired end-to-end (`explore_mobile.py`, view-hierarchy parser,
preprocess, memory_log, llm_client, test_generator). Currently stub-mode /
placeholder execution; needs valid API key + real app target to validate.
Dry-run passes: `python mobile/dry_run.py` (needs `mobile/requirements.txt`,
`PYTHONIOENCODING=utf-8` on Windows).

## 7. SAFETY BACKUP

`C:\Users\sandeep\pes\CAPSTONE_BACKUPS\Capstone_before_archA_collection_20260822_1745.zip` (16.53 MB, pre-A-rebuild). Do not delete.

## 8. CONTINUATION RULES

1. Work on `capstone-final-integrated`; never touch `main`.
2. Commit/push only with explicit user authorization.
3. Regenerate any deterministic artifact without API cost:
   `node fusion/s6_dashboard.js fusion_s1_A214750_B169243844` (dashboard),
   S1/S2 rebuilds likewise.
4. Keep OpenRouter as default provider; remember the 50/day free-request cap
   when planning runs (a full A or B exploration makes many LLM calls — budget
   accordingly or add credits).

## 0b. SESSION RESULT (2026-08-25 morning - MEGA RUN: Tier 2 COMPLETE)

Campaign is now at **20/50 sites**. Everything below committed+pushed to
`backup` remote (branch `capstone-tier2-prep`).

1. **Provider saga resolved**: OpenRouter stealth pool = global 1000/day;
   Groq free = 8k TPM + 200k TPD per model (separate buckets per model);
   Zen gateway x-preview-f-free = ox-alpha route but flaky 503s. Final
   config: exploration on whichever pool is healthy; S4/FT on ox-alpha
   reasoning=low + FUSION_MAX_TOKENS=4000 (1500 starved reasoning -> no JSON).
2. **Defect #20 fixed**: FT executor behavior-ref resolution crashed
   (`catalog is not defined`); CATALOG_INDEX.elements is a Map.
3. **LLM hardening**: llmProvider now wait-and-retries 429 honoring the
   provider's suggested delay; A/B clients retry 5-6x w/ backoff.
4. **Repeatability study DONE** (3 sites x 3 runs): A-steps variance tiny
   (7.7 +-0.5) BUT methodology contaminated by concurrent night-chain
   (disclosed in REPEATABILITY.md); clean C4 re-run recommended.
5. **TIER-2 CAMPAIGN COMPLETE (10/10 sites, all reports FINAL in
   testing/site_reports/, INDEX rows added)**:
   - FT live aggregate 26/37 = 70% pass (all failures classified)
   - Fusion-attributable mean ~66% on Tier 2 (vs ~20% Tier 1!) - fusion
     value EXPLODES once catalogs include real-world sites
   - Standouts: lambdatest 5/5 PASS @100% fusion/11 novel targets;
     docs.python 7/7 @77.8%; gutenberg 6/6 @54.5%/16 novel targets;
     openlibrary 3/3 @60%
   - Real site issues: phptravels demo redirects to demoblaze mirror
     (recorded as site issue); sahitest frames unsupported (honest limit)
6. **s8 evaluation regenerated over 20 sites**: testing/CAMPAIGN_EVALUATION.md

REMAINING for full campaign: Tier 3 (21-30), Tier 4 (31-40), sites 41-50
(repeatability+wildcards), clean C4 repeatability re-run, capstone report.




## 0c. SESSION RESULT (2026-08-25 evening -> 2026-08-26 - DECONTAMINATION COMPLETE + TIER-3 LAUNCHED)

Branch `after-tier-2`, all work pushed to `backup` remote.

1. **PHASE-2 DECONTAMINATION COMPLETE**: all eight quarantined Tier-2 rows
   (sites 13-20) re-run behind the full guard set (run_attribution.js
   birthtime+manifest, assertCatalogDomains, assertVisionStartUrls,
   folder_purity). Replacement runs: #14 run_20260825_163448, #15 165819,
   #16 173233, #17 194511 (sahitest), #18 195406 (theinternet status codes),
   #19 201027 (phptravels), #20 203014 (openlibrary); #13 lambdatest CLEARED
   as SITE-MOVED-EVIDENCE (testmuai rebrand verified). Old contaminated runs
   retained on disk as evidence only.
2. **FINAL DECONTAMINATED AGGREGATES** (regen @2026-08-25T15:16Z):
   fusion offered 86 / accepted 60 / FT live 37/60 = 61.7%; MEAN
   FUSION-ATTRIBUTABLE 48.7% (n=19; n=18 denominator note recorded);
   vision rubric 62 tests / 48 PASS = 77% / 33 STRONG. Gate audit T401
   recomputed everything from raw artifacts: PASS (docs/AUDIT_T401_REPORT.md).
3. **PAPER v3 FINAL-NUMBERS** (docs/RESEARCH_PAPER_DRAFT.md): all gap markers
   resolved post Phase-2 - final clean-site table (20 sites), refreshed rubric/
   perception/fusion sections, full artifact index. Zero {{GAP}} markers remain.
4. **TIER-3 CAMPAIGN LAUNCHED** (D5/D6 on docs/TASK_BOARD.md): sites 21-30,
   five worker pairs, sequential via .campaign.lock round-robin, trimmed env
   MAX_STEPS=25 MAX_STATES=20 (mega-DOMs 18). Early results: #21 wikipedia
   CLEARED run_20260825_230647 purity-PURE FT 3/7 fusion-attributable 87.5%
   (weak-A/strong-fusion exemplar); honest BLOCKS confirmed by dual probes:
   #22 stackoverflow 403, #24 imdb 202 bot-check, #29 npmjs 403. Success bar:
   >=6/10 complete pipelines; blocked IS data.
5. **Key rotation (D5)**: overnight pipelines use OpenRouter key ...81c2ad;
   Groq fallback fqEvp...99G; Zen key ReUj... RESERVED for tomorrow.

4b. **TIER-3 PROGRESS + D9 REPLACEMENT ROUND (2026-08-26)**: original rows
   21-30 -> CLEARED 4 (wikipedia FT3/7 fus87.5%; github_trending FT3/5 fus83.3%
   S4 5/5 perfect round; hackernews FT1/8 honest single-root-cause 100%
   fusion-created; archive_org THIN-RUN pure) + BLOCKED-honest 5 (stackoverflow
   403, imdb 202 bot-check, goodreads blank-render, npmjs 403, reddit
   login-wall). Replacement rows 31-35 (D9): #33 todomvc_react CLEARED by W4
   (run_20260826_002227 purity PURE, FT 3/3 PASS, fus 30%); #31/#32/#34
   CONTAMINATION-skips caught by folder_purity (defect #24: collector copied
   neighbor-pipeline test_cases_*/visual DOMs during unlocked overlap); guard
   fix landed @ 97a29cb (collector now covers test_cases_* +
   execution_results.json). #27 bbc_news and #35 practica re-run were in
   flight at last update. LESSON now thrice-proven: runBoth.js does not
   self-enforce .campaign.lock - driver-level locking is load-bearing.

REMAINING for full campaign: finish Tier 3 in-flight runs (#27, #35), Master
consolidation regen at window end, Tier 4 (31-40), sites 41-50
(repeatability+wildcards), clean C4 repeatability re-run, capstone report
finalization (T402 freeze).