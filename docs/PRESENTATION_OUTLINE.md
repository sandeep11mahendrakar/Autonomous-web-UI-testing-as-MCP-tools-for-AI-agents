# Presentation Asset Outline - Vision Capstone Review (10 slides)

STATUS: v1 (2026-08-25, Agent 3 / ox-alpha, task T104).
Sources: testing/VISION_TEST_QUALITY.md (rubric + per-test ledger),
testing/CAMPAIGN_EVALUATION.md (aggregate tables), docs/AUDIT_REPORT.md
(addendum), testing/site_reports/INDEX.md.
CAUTION: CAMPAIGN_EVALUATION.md aggregates are PRE-quarantine (mean fusion
42.5% includes quarantined rows). Slides quoting campaign-wide numbers must
either use the clean-set figures below or carry the "regeneration pending
Phase 2" footnote. Do not present quarantined-row values as results.

---

## Slide 1 - Title & Claim
- Title: "Dual-Perception Autonomous UI Testing with Grounded LLM Fusion"
- One-line thesis: two independent explorers (DOM + vision) + deterministic
  fusion = test generation that cannot fabricate targets.
- Visual cue: architecture diagram A | B -> S1..S6 chain (reuse §2.3 of paper).
- Speaker note: scope = 20 sites processed, tiered 50-site campaign design.

## Slide 2 - The Problem & Contributions
- Three failure modes of naive autonomous testing: selector fragility, LLM
  hallucinated targets, single-perception blind spots.
- Contributions C1-C5 verbatim from RESEARCH_PAPER_DRAFT.md §1.
- Cue: keep to 5 bullets; C4 (self-audit catching contamination) is the
  differentiator - tease it, details on slide 9.

## Slide 3 - How It Works (Architecture)
- Arch A: Playwright DOM extraction -> state machine -> selector-grounded tests.
- Arch B: screenshots -> YOLO11 ScreenParser (55 classes) + Tesseract OCR ->
  visual DOM -> coordinate tests with live target re-detection.
- Fusion: catalog normalization -> set-algebra gaps -> ONE grounded LLM call ->
  hard validator -> executor pre-verifies every target live.
- Screenshot cue: vision/outputs/state_*_visual_dom.json rendered side-by-side
  with the raw screenshot; demoblaze run_20260824_001544 is the best example
  (107 elements seen by B vs 11 by A).

## Slide 4 - Quality Rubric (the honest metric)
- STRONG = asserted a VALUE and matched it; MEDIUM = state-change verified;
  WEAK = body-text heuristic (counted against us).
- Rubric summary box (VISION_TEST_QUALITY.md):
  broad boundary 76 executed / 57 PASS (75%) / 36 STRONG / 33 MEDIUM / 7 WEAK;
  strict clean set (audit recount): 68 / 52 (76%) / 34 STRONG / 96 fills.
- Message: "roughly half of passes are value-level STRONG" holds under both
  boundaries.

## Slide 5 - Exemplar STRONG Test (verbatim)
- Show TC01 of run_20260823_225906 (SauceDemo login workflow, STRONG PASS,
  4 steps / 3 fills / 4 re-detections): JSON steps fill(639,176)="standard_user"
  -> fill(640,230) -> click Login button(640,326) -> fill link "standard_user".
- Point out: coordinates + live re-detected targets, no CSS selector invented
  by an LLM; objective text generated from observed behavior only.
- Alternative exemplar if a fuller flow is wanted: demoblaze TC01
  (run_20260824_001544, STRONG, 8 steps, end-to-end purchase).

## Slide 6 - Complementary Perception (A vs B)
- Means over dashboards (paper §4.2): tests 2.7 vs 1.2; states 7.4 vs 6.1;
  elements seen 8.3 vs 138.3 (~16x); behaviors 8.7 vs 4.9; targets 6.2 vs 5.1.
- Takeaway: neither perception's volume predicts usefulness; fusion merges
  them deterministically.
- Chart cue: log-scale bar chart for elements_seen; saucedemo/parabank/
  theinternet as extremes (231-267 elements seen by B alone).

## Slide 7 - Fusion Contribution & FT Live Results
- Tier-1 checkpoint: FT live pass 77% (10/13); headline sites lambdatest
  100%* (*quarantined row - EXCLUDE from final deck until re-run), demoblaze
  4/4 PASS @40% fusion, books 71.4%, quotes 83.3%, globalsqa 33.3%.
- Clean-set failure taxonomy (paper §4.4): 24 executed / 18 PASS (75%);
  failures: no_post_action_change x3, label_mismatch x1,
  selector_not_visible x1, selector_readonly x1 - each honestly classified.
- Cue: dashboard screenshot fusion/dashboard.html with provenance footer.

## Slide 8 - Autonomous Issue Discovery
- Juice Shop public /ftp exposure found without hints.
- PHPTravels demo silently redirects to a demoblaze mirror - discovered via
  validator rejections, deterministic proof.
- CURA readonly credential display (selector_readonly fast-fail).
- Message: the pipeline finds site bugs, not just its own bugs.

## Slide 9 - The Contamination Incident & Self-Audit (honesty showcase)
- Adversarial audit recomputed claims from raw artifacts; found mtime-window
  collector stitched two sessions into one folder (AUDIT_REPORT addendum).
- Remediation shipped: run_attribution.js birthtime+manifest guards,
  assertCatalogDomains, quarantine ledger, mandated session-id assertion.
- Books/quotes independently re-confirmed clean; sites 13-20 quarantined
  pending guarded re-runs (T201 in flight).
- Frame as strength: the evaluation caught and repaired itself.

## Slide 10 - Limitations & Roadmap
- Verification ceiling (mutation study): actions-work verified, values-correct
  NOT - wrong-calc/dead-button bugs undetectable without assertion oracles;
  top V2 item = value-oracle synthesis.
- Other limits: free-tier pacing, single-run results except designated
  repeats, Windows-leaning implementation, canvas/frames blind spots.
- Roadmap: dynamic-port parallelism, MCP packaging, identity reconciliation
  across perception spaces.
- Closing stat candidates (refresh after Phase 2): mean fusion-attributable %
  (clean set), total pipeline defects found & fixed (20+3 classes).
