# PROJECT_MEMORY.md — single source of truth

Last updated: 2026-08-23 (evening — first non-DemoQA end-to-end run complete).
This file MERGES and REPLACES the old `VISION_CONTEXT.md` + `AGENT_HANDOFF.md`
(both deleted). All metrics come from real saved run artifacts, none are
estimates.

---

## 0. LATEST SESSION RESULT (2026-08-23, saucedemo.com)

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
