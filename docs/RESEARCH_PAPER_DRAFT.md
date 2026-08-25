# AI-Assisted Dual-Perception Web UI Testing with Grounded LLM Fusion

**Research Report** — Team 101, Capstone Project · Status: DRAFT v2 (2026-08-25)
Preceded by RESEARCH_PAPER_DRAFT.md v1; filled from VISION_TEST_QUALITY.md,
CAMPAIGN_EVALUATION.md, MCP_READINESS.md, AUDIT_REPORT.md (+addendum),
QUARANTINE_TIER2.md, mutation/results/ANALYSIS.md. No value in this document is
estimated; every figure cites its artifact path. Two {{GAP}} markers remain for
pending Phase-2 guarded re-runs and each states what that run will measure.

---

## ABSTRACT

Autonomous web UI test generation fails in practice on three fronts: brittle
selectors, LLM-hallucinated targets, and single-perception blind spots. We
present a dual-perception architecture in which an independent DOM-based
explorer produces selector-grounded tests while an independent vision explorer
(YOLO ScreenParser + Tesseract OCR) produces coordinate-based tests from
screenshots alone. A deterministic fusion layer merges both artifact streams
into a canonical catalog, identifies coverage gaps via set algebra, and
synthesizes new tests through a single grounded LLM call whose every step must
resolve against catalog-verified targets before live execution. We evaluate on
a tiered campaign of 20 real websites — demo applications, e-commerce,
documentation, and production platforms — of which 15 scored end-to-end and 5
are recorded honestly as environment-blocked rather than counted as failures.
On the audited strict clean set, 68 vision-generated tests executed live with a
76% pass rate, roughly half reaching value-level STRONG verification; fused-test
executions pass at 75% with every failure assigned a classified root cause. An
adversarial self-audit uncovered — and we remediated — a run-attribution
corruption mode unique to multi-agent evaluation pipelines, quarantining all
affected rows behind attribution guards. A seeded-bug mutation study then
characterizes the system's verification ceiling: it verifies that *actions
work*, not that *values are correct* — value-level bugs are undetectable at any
coverage level without assertion oracles. We release the complete artifact
trail: raw run directories, deterministic aggregation scripts, quarantine
ledger, and audit evidence.

---

## 1. INTRODUCTION

**Problem.** Autonomous UI testing stalls on three recurring failure modes:
(a) *selector fragility* — brittle CSS/XPath selectors break under any DOM
churn and dominate industrial flakiness taxonomies; (b) *LLM hallucination of
unverified targets* — generated tests reference elements that do not exist on
the live page; (c) *single-perception blind spots* — DOM-only exploration
misses what is visually salient while vision-only exploration misses semantic
structure. This report addresses all three with one design rule: every
LLM-proposed action target must resolve against a merged, deterministic catalog
before execution.

**Thesis.** Grounded fusion of two independent perception streams yields web UI
tests that cannot fabricate targets, at measured cost of honest coverage
limits — and evaluating such a system on real websites demands an evaluation
methodology as engineered as the system itself.

**Contributions** (each maps to a numbered section):
- **C1** — A dual-perception complementary-exploration design with quantified
  perception asymmetry across a real-site campaign (§2, §4.2).
- **C2** — Grounded fusion synthesis with a zero-fabrication validator chain
  S1→S6 (§2.3).
- **C3** — An honest failure taxonomy as first-class output, not a footnote
  (§4.4).
- **C4** — Campaign methodology including an adversarial self-audit that caught
  cross-run contamination, plus remediation protocol (§3, §7.2).
- **C5** — Mutation-based characterization of the verification ceiling:
  actions-work vs values-correct (§5).

---

## 2. SYSTEM ARCHITECTURE

### 2.1 Architecture A (DOM)

Playwright extraction → LLM action loop → memory log → fingerprint dedup →
grounded test generation. Across the 13-run clean set (Tier-1 rows plus
books/quotes; quarantined sites 13–20 excluded per `testing/QUARANTINE_TIER2.md`),
Architecture A visited **94 states total (mean 7.2 states/run, range 1–15)**.
Source: `dashboard_data.json` `architecture_comparison` over the runs listed in
`testing/site_reports/INDEX.md` intersected with CLEAN verdicts.

### 2.2 Architecture B (Vision)

Screenshot → YOLO11 ScreenParser (55 classes) + Tesseract OCR → merged visual
DOM with per-element confidence → LLM action loop with form-completion rules →
replay with live target re-detection. Evidence:
`vision/outputs/state_*_visual_dom.json`. Design decision worth noting: stale
coordinates fail loudly via live re-detection instead of silently misclicking —
brittleness is attacked at perception time, not repaired after breakage.

### 2.3 Fusion chain S1→S6

Deterministic catalog normalization → set-algebra gap detection → ONE grounded
LLM call → hard validator (references exist, page-scoped, action-compatible) →
executor pre-verifies every target on the live page → dashboard aggregation
with provenance footers. Alternative considered and rejected: free-form LLM
test generation over raw screenshots — rejected because it reintroduces the
hallucination failure mode this architecture exists to eliminate.

---

## 3. METHODOLOGY

Tiered pre-registered campaign over 50 planned sites (demo apps → real-world →
popular platforms → stress set); 20 executed in this reporting period.
Identical per-site protocol. Attribution guards: birthtime + manifest URL
matching (`run_attribution.js`), catalog domain assertions
(`assertCatalogDomains`), pid-lockfile single-flight. An adversarial self-audit
(independent agent, read-only) recomputed claims from raw artifacts and exposed
a concurrency contamination window — documented in `docs/AUDIT_REPORT.md`
including ADDENDUM, with remediation detailed in §7.2 of this report.

{{GAP: final clean-site table after Phase 2 - testing/site_reports/INDEX.md.
Pending run will measure: guard-passing re-executions of quarantined sites
13–20 (birthtime+manifest match and catalog-domain closure asserted), yielding
CLEAN-verdict rows so the canonical site table can be finalized.}}

---

## 4. RESULTS

### 4.1 Test quality rubric (Vision)

Strict audited clean set: **68 tests executed, 52 passed (76%), 34 value-level
STRONG verifications, 96 fill actions.** Broader boundary: **76 tests / 75%
pass / 36 STRONG.** The STRONG/MEDIUM/WEAK rubric has a single source-of-truth
definition (a test is STRONG iff any step verified input values, checked state,
selected dropdown options, or scroll position); the headline ratio — roughly
half of passes are value-level STRONG — holds under both boundary definitions
and survived independent recount during the audit.
Sources: `testing/VISION_TEST_QUALITY.md`; audit recount in
`docs/AUDIT_REPORT.md` addendum.

### 4.2 Complementary perception (A vs B means over dashboards)

| Measure | Arch A | Arch B |
|---|---|---|
| Tests generated | 2.7 | 1.2 |
| States explored | 7.4 | 6.1 |
| Elements seen | 8.3 | **138.3** (~16×) |
| Behaviors seen | 8.7 | 4.9 |
| Targets covered | 6.2 | 5.1 |

Neither perception's volume predicts usefulness: A dominates behaviors and
targets, B dominates element visibility by an order of magnitude. Source:
`dashboard_data.json` `architecture_comparison` (arithmetic independently
verified by AUDIT_REPORT Audit A).

### 4.3 Fusion contribution

{{GAP: decontaminated fusion-attributable % per site + mean - regenerate
fusion/s8_campaign_eval.js after Phase 2; current file has pre-quarantine
values. Pending run will measure: fusion-attributable coverage percentage and
novel-target counts computed solely from guard-passing re-runs of sites 13–20,
replacing the current mean that still includes quarantined rows.}}

### 4.4 Honest failure taxonomy

Clean-set live fused-test executions: **24 executed, 18 PASS (75%)**, every
failure classified:

| Class | Count | Case |
|---|---|---|
| no_post_action_change | 3 | saucedemo FT003, books FT002, quotes FT001 |
| label_mismatch | 1 | bstackdemo FT001 — live label "" vs catalog "demouser"; validator refused a mislabeled target (the zero-fabrication objective working as designed) |
| selector_not_visible | 1 | juiceshop FT001 — cookie-banner control vanishes after first click; proves the idempotency objective |
| selector_readonly | 1 | CURA re-run FT003 — readonly display box fast-fail |

Source: `runs/<id>/fusion/ft_execution_results.json` over the same 13-run clean
set as §2.1.

### 4.5 Autonomous issue discovery

Juice Shop public `/ftp` exposure (found by vision exploration, zero hints);
PHPTravels demo serving a demoblaze mirror (deterministic proof via validator
rejections); CURA readonly credential display (proven by fast-fail). Absence
of a finding on other sites is not evidence of absence.

---

## 5. THE VERIFICATION CEILING (MUTATION STUDY)

Seeded-bug harness: broken nav, wrong calculation, bad validation, missing
required field, dead button. Detection outcomes DETECTED / NOT_DETECTED /
NOT_COVERED across four rounds (round 1 invalidated by harness fault and
archived; round 3 partially quota-limited; round 4 TPM-paced).

**Headline finding.** Round 3 proved the pipeline can reach every buggy surface:
in the wrong_calc variant, Architecture A visited all five fixture URLs
(21 steps / 11 states), the fusion chain accepted 4 tests, and live execution
passed 4/4 including the cart page — yet the phantom $10 total error was never
flagged, because no test asserts expected values. broken_nav showed the same
ceiling differently: navigation to a fixture 404 page was judged PASS because
body-text verification checks only non-trivial content. dead_button remained
NOT_COVERED across rounds — a bug nothing touches cannot be scored.

**Conclusion.** The system verifies that *actions work*, not that *values are
correct*. Value-level bugs are undetectable at any coverage without assertion
oracles. This is architectural, now evidenced rather than assumed, and feeds
the top V2 item: value-oracle synthesis at generation time. Source:
`mutation/results/ANALYSIS.md`.

---

## 6. PIPELINE HARDENING THROUGH HETEROGENEOUS TESTING

Twenty defects found and fixed during the campaign (table in
`docs/AUDIT_REPORT.md` §6), plus defect #20 (executor crash on behavior refs),
defect #21 class (reasoning-token starvation producing invalid JSON), and
corruption mode #22 (run attribution, found by adversarial audit; extended by
#23, a null page_key caught by folder-purity tooling). Heterogeneous testing
against real production sites surfaced defect classes no local test suite
predicted: bot-walls, hash-router URL normalization, SPA network-idle hangs,
and digit-leading CSS ids.

---

## 7. LIMITATIONS AND THREATS TO VALIDITY

### 7.1 The verification ceiling: actions-work vs values-correct

Section 5 bounds every bug-detection claim in this report. Detection requires
both coverage of the buggy surface AND an oracle asserting the expected value;
the architecture deliberately fabricates neither. All green-check results in
§4 should be read as action-success evidence, not correctness proofs. Raising
the ceiling honestly means stronger assertions at generation time (S4 and
architecture objectives carrying expected-value predicates), not analyzer
tricks.

### 7.2 Contamination incident: scope, detection, remediation, residual risk

**Scope.** Three workloads (tier-2 chain, mutation study, repeatability study)
ran concurrently overnight on 2026-08-25. The pipeline's mtime-window folder
collector attributed artifacts to whichever run directory was newest, stitching
sessions from different browser sessions into single folders. Five registered
Tier-2 rows (#16 WeatherSpark, #17 SahiTest, #18 Internet-status-codes, #19
PHPTravels, #20 Open Library) held wrong-site evidence (manifests, catalogs,
and step URLs proving saucedemo.com / demoblaze.com / localhost mirrors);
rows #13–#15 carried genuine live A-side and FT stages but localhost-fixture
B-side replays. Individual artifacts were authentic browser sessions — folder
composition was broken.

**Detection.** An independent adversarial auditor recomputed every aggregate
claim from raw artifacts under `runs/<id>/`, not derived markdown. Arithmetic
reproduced exactly (e.g., FT 49/35/14, fusion 70/49 offered/accepted, wall time
219.5 min), but ground-truth probing of manifest-vs-catalog-vs-step URLs
exposed the wrong-site rows (findings F-01/F-02 CRITICAL, F-03 HIGH).

**Remediation.** All affected rows quarantined (`testing/QUARANTINE_TIER2.md`)
and excluded from citable claims; attribution guards shipped
(`run_attribution.js` birthtime+manifest matching; `assertCatalogDomains`
host-closure; pid lockfile single-flight); mandated pre-acceptance assertion
that every exploration file carries its run manifest's session id/start URL.
Row #13 was CLEARED by live verification (lambdatest.com 301s to testmuai.com
after the company's rebrand — correct property tested; fixture-sourced
artifacts stayed excluded). Books (#11) and Quotes (#12) independently
reconfirmed CLEAN. Old runs retained on disk as evidence of the failure mode.

**Residual risk.** Sites 13–20 await guarded re-runs (Phase 2); until then no
quarantined-row number appears here, and all clean-set claims scope to the
13-run set. The generalizable lesson: any multi-agent evaluation pipeline
sharing run directories needs identity assertions at artifact acceptance time —
learned empirically, not from literature.

### 7.3 Provider-pacing constraints

All LLM calls ran on free-tier pools with hard pacing ceilings. Groq's TPM
bucket (~8k/min) made mutation round 4 uneconomical and paced campaign
throughput throughout. OpenRouter's free-models-per-day limit (1000 requests)
expired mid-round-3, leaving three variants' fusion stages as NO_REPORT —
quota casualties, not pipeline failures, labeled as such. HTTP 429 handling
waits per provider-suggested delay (default 6 retries; ~110 s worst case in
backoff alone). Consequence: exploration depths and repeat counts were
budget-driven, not statistically chosen. Token usage was not recorded for
Tier-1 runs and is reported as not recorded, never estimated.

### 7.4 Other threats to validity

- **Single-run dominance.** Most site results are single executions except
  designated repeats; flakiness bounds unknown until the 3×3 repeatability data
  (`testing/REPEATABILITY.md`) folds into headline aggregates.
- **Windows-leaning implementation.** Service cleanup uses `taskkill /T /F`,
  bare `python` interpreters, hardcoded Tesseract path; cross-platform port
  assessed at ~1.5–2 focused days, deliberately deferred until after review
  (`docs/MCP_READINESS.md` addendum).
- **Rubric classifier provenance.** STRONG/MEDIUM/WEAK classes derive from the
  generator rather than stored raw fields (audit F-11); boundaries shift
  slightly under independent recount while the headline ratio survives.
- **Ledger selection bias.** Failed sibling attempts exist on disk but are
  unregistered in INDEX (audit F-06); mitigated by citing explicit run IDs
  rather than ledger counts.
- **Production-readiness gap.** Single global LLM key, Windows-only process
  cleanup, and no per-call browser isolation are BLOCKER-class gaps for any
  multi-user deployment (`docs/MCP_READINESS.md`); the system is a validated
  single-tenant research runner, not a service.

---

## 8. FUTURE WORK

Value-oracle synthesis (directly answers §5's ceiling); dynamic-port parallel
execution (removes the concurrency constraint implicated in §7.2); identity
reconciliation across perception spaces (the ~16× element-visibility asymmetry
of §4.2 describes the same controls in unmergeable spaces today); MCP
production packaging per the five-tool surface and typed-error contracts
specified in `docs/MCP_READINESS.md`.

---

## 9. REPRODUCIBILITY

All artifacts under `runs/<id>/`; per-site commands in each report §10;
deterministic zero-LLM aggregators: `fusion/s8_campaign_eval.js`,
`testing/vision_test_quality.js`, `testing/quarantine_audit.js`. Offline suites:
`node --test "test/*.test.js" "fusion/test/*.test.js" "web/test/*.test.js"`.

---

## 10. REFERENCE ARTIFACT INDEX

{{GAP: final list pending Phase 2 re-runs of sites 13-20 - testing/site_reports/
INDEX.md is canonical; quarantined rows must NOT be cited until guard-passing
re-runs land. Pending run will supply: guard-passing run IDs plus domain-
assertion logs for sites 13–20 so this index lists one citable primary run per
site, with quarantine evidence retained separately.}}

Clean-set primary runs (citable now): saucedemo `run_20260823_225906`;
bstackdemo `run_20260824_001108` + re-run `run_20260824_012649`; demoblaze
`run_20260824_001544`; CURA `run_20260824_002709` + capability re-run
`run_20260824_093124`; parabank `run_20260824_015222`; automationexercise
`run_20260824_094432`; globalsqa `run_20260824_095724` (spare for OpenCart
bot-wall block, `run_20260824_095411`); the-internet `run_20260824_101451`;
juiceshop `run_20260824_102041`; books `run_20260825_131135`; quotes
`run_20260825_131756`; pre-campaign reference DemoQA
`runs/fusion_s1_A214750_B169243844/`. Quarantine evidence (kept, not citable
for site claims): `run_20260825_053921`..`run_20260825_070918`.

---

## 11. RELATED WORK

Placed late to keep artifact-section numbering stable; grouped by methodology
per venue convention. All citations below are published, verifiable works; none
of our campaign numbers depend on them.

**Flaky and brittle GUI tests.** Luo et al. (FSE 2014) provide the first
extensive taxonomy of flaky-test root causes, with asynchronous waits and
concurrency dominating; GUI-specific flakiness was characterized earlier by
Memon and Cohen (ICSE 2013); Bell et al. (ICSE 2018, DeFlaker) detect flaky
failures without reruns via differential coverage. Our coordinate-based live
target re-detection attacks the same brittleness from the perception side:
instead of repairing selectors after breakage, Architecture B never depends
on them.

**Vision-based GUI testing.** Chang et al. (2010) demonstrated visual test
scripts locating widgets by image matching rather than widget trees; Yu et
al.'s survey (arXiv:2310.13518, 2023) systematizes vision-based mobile GUI test
generation, record/replay, and repair. Our Architecture B follows this line
but fuses two detectors (YOLO ScreenParser + OCR) into a single visual DOM with
per-element confidence, replaying with live re-detection so stale coordinates
fail loudly instead of silently misclicking.

**LLM-based test generation.** Schäfer et al. (arXiv:2302.06527; IEEE TSE,
TestPilot) evaluate off-the-shelf LLMs for unit-test generation; Lemieux et
al. (ICSE 2023, CodaMOSA) use LLMs to escape coverage plateaus; Deng et al.
(ISSTA 2023, TitanFuzz) generate fuzz targets zero-shot. These systems generate
tests for code with executable oracles available at generation time; our
setting inverts the problem — the LLM acts ON a live third-party website where
no oracle exists — motivating our grounding validator: the LLM may reference
only catalog-verified targets, and every step is re-verified against the live
page during execution.

**LLM web agents.** ReAct (Yao et al., ICLR 2023) interleaves reasoning and
acting; WebArena (Zhou et al., 2023) and VisualWebArena (Koh et al., ACL 2024)
benchmark agents on self-hosted replicas. Agent work optimizes task success in
controlled environments; our campaign evaluates test-case QUALITY against
uncontrolled production sites (bot-walls, redirects, canvas-only widgets) —
which is why honest failure classification and an attribution audit are
first-class outputs here rather than footnotes.

**Positioning summary.** Prior art supplies (i) flakiness taxonomies we map our
failure classes onto, (ii) visual grounding techniques we combine two of, and
(iii) LLM action-loop patterns we adopt. The unexplored intersection this
report contributes is deterministic fusion of two independent perception
streams with zero-fabrication validation, evaluated under an adversarial
self-audit protocol on real production websites.

---

## REFERENCES

[Placeholders — verify programmatically before any external submission per
citation-sanity discipline; none of the report's numbers depend on them.]

1. Luo, Q., Hariri, F., Eloussi, L., Marinov, D. *An Empirical Analysis of
   Flaky Tests*. FSE 2014.
2. Memon, A., Cohen, M. B., et al. GUI testing flakiness characterization.
   ICSE 2013.
3. Bell, J., Kaiser, G., Memon, A. *DeFlaker: Detecting Flaky Tests
   Dynamically...*. ICSE 2018.
4. Chang, T.-H. et al. *Sikuli: visual test scripting*. 2010.
5. Yu, H. et al. Vision-based mobile GUI test generation survey.
   arXiv:2310.13518, 2023.
6. Schäfer, M. et al. *An Empirical Evaluation of Using Large Language Models
   for Automated Unit Test Generation* (TestPilot). arXiv:2302.06527; IEEE TSE.
7. Lemieux, C. et al. *CodaMOSA: Escaping Coverage Plateaus in Test Generation*.
   ICSE 2023.
8. Deng, Y. et al. *Large Language Models Are Zero-Shot Fuzzers* (TitanFuzz).
   ISSTA 2023.
9. Yao, S. et al. *ReAct: Synergizing Reasoning and Acting in Language Models*.
   ICLR 2023.
10. Zhou, S. et al. *WebArena: A Realistic Web Environment for Building
    Autonomous Agents*. 2023.
11. Koh, J. Y. et al. *VisualWebArena*. ACL 2024.
