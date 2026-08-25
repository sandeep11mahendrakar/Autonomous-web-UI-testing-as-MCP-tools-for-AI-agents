# Research Paper Draft - AI-Assisted Dual-Perception Web UI Testing with LLM Fusion
STATUS: DRAFT v1 (2026-08-25). Gaps are marked {{GAP:...}} and each cites the
exact artifact path(s) that hold the final numbers. Filler agents must NOT invent
values; pull them from the cited paths or leave the GAP in place.
Target venue-style: capstone research report + extendable to workshop paper.

## ABSTRACT
{{GAP: finalize after Phase 2/3 - one paragraph: dual-perception exploration
(DOM + vision), deterministic fusion with grounding validation, N-site campaign,
headline findings}}
Draft abstract text: We present a dual-perception architecture for autonomous web
UI test generation: an independent DOM-based explorer produces selector-grounded
tests while an independent vision explorer (YOLO ScreenParser + OCR) produces
coordinate-based tests from screenshots alone. A deterministic fusion layer
merges both artifact streams into a canonical catalog, identifies coverage gaps,
and synthesizes new tests via a single grounded LLM call whose every step is
validated against the catalog before live execution. We evaluate across a tiered
campaign of real websites spanning demo applications, e-commerce, documentation,
and production platforms, reporting test quality via a verification-strength
rubric, fusion-attributable coverage, honest failure taxonomy, and an adversarial
audit that uncovered - and remediated - a run-attribution corruption mode unique
to multi-agent evaluation pipelines.

## 1. INTRODUCTION
Problem: autonomous UI testing stalls on (a) selector fragility, (b) LLM
hallucination of unverified targets, (c) single-perception blind spots.
Contributions: C1 dual-perception complementary-exploration design with quantified
perception asymmetry; C2 grounded fusion synthesis with zero-fabrication validator;
C3 honest failure taxonomy as first-class output; C4 campaign methodology including
adversarial self-audit that caught cross-contamination; C5 mutation-based
verification-ceiling characterization.

## 2. SYSTEM ARCHITECTURE
### 2.1 Architecture A (DOM)
Playwright extraction -> LLM action loop -> memory log -> fingerprint dedup ->
grounded test generation. Across the 13-run clean set (Tier-1 rows plus
books/quotes; quarantined sites 13-20 excluded per testing/QUARANTINE_TIER2.md),
Architecture A visited 94 states total (mean 7.2 states/run, range 1-15).
Source: dashboard_data.json architecture_comparison over the runs listed in
testing/site_reports/INDEX.md intersected with CLEAN verdicts.
### 2.2 Architecture B (Vision)
Screenshot -> YOLO11 ScreenParser (55 classes) + Tesseract OCR -> merged visual
DOM with per-element confidence -> LLM action loop with form-completion rules ->
replay with live target re-detection. Evidence: vision/outputs/state_*_visual_dom.json
### 2.3 Fusion chain S1->S6
Deterministic catalog normalization; set-algebra gaps; ONE grounded LLM call;
hard validator (refs exist, page-scoped, action-compatible); executor pre-verifies
every target on the live page; dashboard aggregates with provenance footers.

## 3. METHODOLOGY
Tiered 50-site pre-registered campaign (demo apps -> real-world -> popular
platforms -> stress set). Identical per-site protocol. Attribution guards:
birthtime+manifest URL matching, catalog domain assertions, lockfile single-flight.
Adversarial self-audit (independent agent) recomputed claims from raw artifacts
and exposed a concurrency contamination window - documented in
docs/AUDIT_REPORT.md incl. ADDENDUM. {{GAP: final clean-site table after
Phase 2 - testing/site_reports/INDEX.md}}

## 4. RESULTS
### 4.1 Test quality rubric (Vision)
Strict clean-set: 68 executed tests, 52 passed (76%), 34 value-level STRONG
verifications, 96 fill actions. Broader boundary: 76 tests / 75% / 36 STRONG.
Source: testing/VISION_TEST_QUALITY.md + audit recount in docs/AUDIT_REPORT.md addendum.
### 4.2 Complementary perception (A vs B means over dashboards)
Tests generated A 2.7 / B 1.2 - States 7.4 / 6.1 - Elements seen 8.3 / **138.3** -
Behaviors 8.7 / 4.9 - Targets covered 6.2 / 5.1. Source: dashboard_data.json
architecture_comparison across indexed runs.
### 4.3 Fusion contribution
{{GAP: decontaminated fusion-attributable % per site + mean - regenerate
fusion/s8_campaign_eval.js after Phase 2; current file has pre-quarantine values}}
### 4.4 Honest failure taxonomy
Failure classes with counts, clean-set live executions (24 tests executed,
18 PASS = 75%): no_post_action_change 3 (saucedemo FT003, books FT002, quotes
FT001); label_mismatch 1 (bstackdemo FT001 - live label "" did not match
catalog label "demouser", validator refusing a mislabeled target);
selector_not_visible 1 (juiceshop FT001 - cookie-banner control disappears
after its first click, an honest fail that proves the idempotency objective);
selector_readonly 1 (CURA re-run FT003). Case studies: juiceshop FT001
proving the idempotency objective; selector_readonly fast-fail proving
readonly display box. Source: runs/<id>/fusion/ft_execution_results.json
over the same 13-run clean set as section 2.1.
### 4.5 Autonomous issue discovery
Juice Shop public /ftp exposure; PHPTravels demo demoblaze mirror (deterministic
proof via validator rejections); CURA readonly credential display.

## 5. THE VERIFICATION CEILING (mutation study)
Seeded-bug harness (broken nav, wrong calc, bad validation, missing required,
dead button): detection outcomes DETECTED/NOT_DETECTED/NOT_COVERED across rounds.
Headline: the system verifies that ACTIONS WORK, not that VALUES ARE CORRECT -
value-level bugs undetectable at any coverage without assertion oracles.
Source: mutation/results/ANALYSIS.md.

## 6. PIPELINE HARDENING THROUGH HETEROGENEOUS TESTING
20 defects found & fixed during campaign (table in docs/AUDIT_REPORT.md section 6),
plus defect #20 (executor crash on behavior refs) and #21 class (reasoning-token
starvation producing invalid JSON), plus run-attribution corruption mode (#22,
found by adversarial audit).

## 7. LIMITATIONS AND THREATS TO VALIDITY
- Verification ceiling (section 5) bounds bug-detection claims
- Contamination incident: scope, detection, remediation, residual risk (docs/AUDIT_REPORT.md)
- Free-tier provider pacing constrains throughput; TPM/TPD buckets documented
- Single-run results except designated repeats; clean repeatability re-run pending
- Windows-leaning implementation details

## 8. FUTURE WORK
Value-oracle synthesis; dynamic-port parallel execution; identity reconciliation
across perception spaces; MCP production packaging (docs/MCP_READINESS.md).

## 9. REPRODUCIBILITY
All artifacts under runs/<id>/; per-site commands in each report section 10;
aggregators: fusion/s8_campaign_eval.js, testing/vision_test_quality.js,
testing/quarantine_audit.js. Offline suites: node --test "test/*.test.js"
"fusion/test/*.test.js" "web/test/*.test.js".

## 10. REFERENCE ARTIFACT INDEX
{{GAP: final list pending Phase 2 re-runs of sites 13-20 - testing/site_reports/
INDEX.md is canonical; quarantined rows must NOT be cited until guard-passing
re-runs land}}
Clean-set primary runs (citable now): saucedemo `run_20260823_225906`;
bstackdemo `run_20260824_001108` + re-run `run_20260824_012649`; demoblaze
`run_20260824_001544`; CURA `run_20260824_002709` + capability re-run
`run_20260824_093124`; parabank `run_20260824_015222`; automationexercise
`run_20260824_094432`; globalsqa `run_20260824_095724` (spare for OpenCart
bot-wall block, `run_20260824_095411`); the-internet `run_20260824_101451`;
juiceshop `run_20260824_102041`; books `run_20260825_131135`; quotes
`run_20260825_131756`; pre-campaign reference DemoQA
`runs/fusion_s1_A214750_B169243844/`. Quarantine evidence (kept, not citable
for site claims): `run_20260825_053921`..`run_20260825_070918` per
testing/QUARANTINE_TIER2.md.
