# AI-Assisted Dual-Perception Web UI Testing with Grounded LLM Fusion

**Team 101, PES University — Capstone Final Report**
Status: FINAL v1.1 (2026-08-27). Dataset frozen at tag `campaign-v2-end`
(40/40 sites registered: 39 numbered INDEX rows + 1 pre-campaign reference).
Supersedes RESEARCH_PAPER_DRAFT.md v4.
Every figure traces to a raw artifact; sources cite `runs/<id>/` paths,
`testing/site_reports/INDEX.md`, `testing/CAMPAIGN_EVALUATION.md`, or
`docs/RESEARCH_DATA_PACK.md`. Nothing is estimated; negative results are
disclosed, not omitted.

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
resolve against catalog-verified targets before live execution. We evaluated
the system across a four-round campaign of 40 real websites spanning demo
applications, e-commerce, documentation, QA practice targets, and production
platforms. On the fully decontaminated ledger, fused tests passed 72.2%
live (13/18) in the final batch and 61.7% campaign-wide (37/60); vision-
generated tests passed at 77% with roughly half of passes carrying value-level
STRONG verification; fusion was attributable for a mean of 48.7% of each
site's final suite, rising to 83–100% precisely where DOM exploration was
budget-limited. A seeded-bug mutation study establishes the system's
verification ceiling: it verifies that *actions work*, not that *values are
correct*. An adversarial self-audit uncovered a run-attribution corruption
mode unique to multi-agent evaluation pipelines; we quarantined, remediated,
re-ran every affected site behind attribution guards, and the guards then
caught every subsequent stitching attempt pre-publication. We release the
complete artifact trail: raw run directories, deterministic aggregation
scripts, quarantine ledger, and independent audit evidence.

---

## 1. INTRODUCTION

**Campaign census.** 40 sites registered: 39 numbered INDEX rows (sites
1, 3–40 — numbering skips 2) plus site #2 DemoQA as the pre-campaign
reference run. Final dispositions: **29 cleared/scored** (including thin-run
archive_org and the sahitest/Tier-2 re-runs), **7 blocked-honest**
(OpenCart CF-wall, stackoverflow 403, imdb 202 bot-check, goodreads
blank-render, npmjs 403, reddit login-wall, magento Cloudflare 526), and
**4 DO-NOT-CITE contamination-evidence rows** (bbc_news retracted per audit
F7-01, techlistic, practica, w3schools). Dataset frozen at tag
`campaign-v2-end` after post-freeze re-audit sign-off (zero open findings
across five audit passes).

**Problem.** Autonomous UI testing stalls on three recurring failure modes:

(a) *Selector fragility* — brittle CSS/XPath selectors break under any DOM
churn and dominate industrial flakiness taxonomies;

(b) *LLM hallucination of unverified targets* — generated tests reference
elements that do not exist on the live page;

(c) *Single-perception blind spots* — DOM-only exploration misses what is
visually salient; vision-only exploration misses semantic structure.

This report addresses all three with one design rule: **every LLM-proposed
action target must resolve against a merged, deterministic catalog before
execution.**

**Thesis.** Grounded fusion of two independent perception streams yields web
UI tests that cannot fabricate targets, at the measured cost of honest
coverage limits — and evaluating such a system on real websites demands an
evaluation methodology as engineered as the system itself.

**Contributions** (each maps to a numbered section):

| ID | Contribution | Section |
|---|---|---|
| C1 | Dual-perception complementary exploration with quantified perception asymmetry | §2, §4.2 |
| C2 | Grounded fusion synthesis with zero-fabrication validator chain S1→S6 | §2.3 |
| C3 | Honest failure taxonomy as first-class output | §4.4 |
| C4 | Campaign methodology with adversarial self-audit that caught cross-run contamination, plus remediation validated under concurrency | §3, §7.2 |
| C5 | Mutation-based characterization of the verification ceiling | §5 |

---

## 2. SYSTEM ARCHITECTURE

### 2.1 Architecture A (DOM)

Playwright extraction → LLM action loop → memory log → fingerprint dedup →
grounded test generation (`web/`). Design decisions: generic goals plus a
PAGE-TEXT prompt block (defect #1 fix), slash-tolerant URL comparison,
hash-router normalization, external-domain guard blocking off-site
navigation.

### 2.2 Architecture B (Vision)

Screenshot → YOLO11 ScreenParser (55 classes) + Tesseract OCR → merged visual
DOM with per-element confidence → LLM action loop with form-completion rules →
replay with **live target re-detection** (`vision/`). Stale coordinates fail
loudly instead of silently misclicking: brittleness is attacked at perception
time, not repaired after breakage.

### 2.3 Fusion chain S1→S6

Deterministic catalog normalization (S1) → set-algebra gap detection (S2) →
ONE grounded LLM call (S4) → hard validator rejecting any reference that does
not exist, is not page-scoped, or is not action-compatible → executor that
pre-verifies every target on the live page (FT) → dashboard aggregation with
provenance footers (S6).

*Alternative considered and rejected:* free-form LLM test generation over raw
screenshots — rejected because it reintroduces the hallucination failure mode
this architecture exists to eliminate.

---

## 3. CAMPAIGN METHODOLOGY

Four rounds, identical per-site protocol, pre-registration before launch
(`testing/CAMPAIGN_PLAN.md`, frozen site lists in `testing/TIER3_SITES.md`):

| Round | Sites | Dates |
|---|---|---|
| Tier 1 | 1–10 | 2026-08-23/24 |
| Tier 2 (+ Phase-2 decontamination re-runs) | 11–20 | 2026-08-25 |
| Tier 3 | 21–30 (+ spares 31–35, directive D9) | 2026-08-25/26 |
| D11 final batch | 36–40 | 2026-08-26 |

**Guards (mandatory per run).** Strict attribution
(`testing/run_attribution.js`: birthtime + manifest-URL match, never
newest-dir), catalog domain closure (`assertCatalogDomains`),
vision session-identity (`assertVisionStartUrls`), folder-purity scan
(`testing/folder_purity.js`) which MUST return PURE, pid-lockfile
single-flight, trimmed budgets (MAX_STEPS=25, MAX_STATES=20;
ARCH_A_TIMEOUT_MS=1500000 for mega-DOMs per directive D7).

**Policies.** Read-only public pages only; no logins/posts/purchases;
realistic Chrome UA only; consent banner = one deterministic dismiss,
recorded; bot-wall/CAPTCHA = honest BLOCKED (blocked IS valid data);
numbers only from `testing/extract_run.js`.

**Adversarial self-audit.** Independent read-only agents recomputed claims
from raw artifacts (`docs/AUDIT_REPORT.md`, three Tier-3 passes, and the
T401 full-campaign gate audit: verdict trajectory NO-GO → REMEDIATED →
GATE-READY). All eight quarantined Tier-2 rows were re-run behind the full
guard set; every re-run passed. Two contaminated attempts in later rounds
were caught by folder-purity *before publication* and registered as evidence
only (rows 34/35 class; row 40; see §7.2).

### 3.1 Tiers 1–2 results table (sites 1–20)

Canonical source: `testing/site_reports/INDEX.md`. Cleared rows:

| # | Site | Primary run ID | FT live | Fusion-attributable |
|---|---|---|---|---|
| 1 | SauceDemo | run_20260823_225906 | 2/3 PASS | 37.5% |
| 3 | BrowserStack Demo | run_20260824_001108 (+re-run 012649) | 0/1 FAIL | 14.3% |
| 4 | Demoblaze | run_20260824_001544 | 4/4 PASS | 40% |
| 5 | CURA Healthcare | run_20260824_002709 (+093124) | honest zero | 0% |
| 6 | ParaBank | run_20260824_015222 | honest zero | 0% |
| 7 | Automation Exercise | run_20260824_094432 | honest zero | 0% |
| 8 | OpenCart Demo | run_20260824_095411 | BLOCKED (bot-wall) | — |
| 8s | GlobalSQA (spare) | run_20260824_095724 | 3/3 PASS | 33.3% |
| 9 | The Internet | run_20260824_101451 | honest zero | 0% |
| 10 | OWASP Juice Shop | run_20260824_102041 | 0/1 honest fail | 16.7% |
| 11 | Books to Scrape | run_20260825_131135 | 4/5 PASS | 71.4% |
| 12 | Quotes to Scrape | run_20260825_131756 | 4/5 PASS | 83.3% |
| 13 | LambdaTest Playground | un_20260825_133122 | 4/5 PASS | 100% |
| 14 | Python.org Docs | run_20260825_163448 | 1/8 PASS | 88.9% |
| 15 | Project Gutenberg | run_20260825_165819 | 4/4 PASS | 80% |
| 16 | WeatherSpark | run_20260825_173233 | 5/8 PASS | 100% |
| 17 | SahiTest Demo | run_20260826_010716 (final; supersedes 194511) | 3/3 PASS | 60% |
| 18 | The Internet (status codes) | run_20260825_195406 | 3/3 PASS | 80% |
| 19 | PHPTravels Demo | run_20260825_201027 | 5/6 PASS | 60% |
| 20 | Open Library | run_20260825_203014 | 0/7 (connection resets) | 87.5% |

Notes on honest rows: CURA/ParaBank/AutomationExercise/The-Internet are
honest zeros where the validator correctly offered nothing executable. Row 20's
fails were connection resets during an outage window — recorded, not retried
into green. Row 19's re-run independently reproduced the phptravels→demoblaze
mirror finding via validator rejections.

### 3.2 Tier-3 results (sites 21–30)

Cleared:

| # | Site | Run ID | FT live | Fusion-attributable |
|---|---|---|---|---|
| 21 | Wikipedia | run_20260825_230647 | 3/7 PASS | 87.5% |
| 23 | GitHub Trending | run_20260825_232415 | 3/5 PASS | 83.3% |
| 26 | Hacker News | run_20260825_234052 | 1/8 PASS | 100% (100% fusion-created) |
| 28 | Archive.org | run_20260825_235819 | honest zero | 0% |

Blocked-honest 6: stackoverflow (403), imdb (HTTP 202 bot-check), goodreads
(blank-render), npmjs (403), reddit (login-wall), magento (Cloudflare 526).
Contamination-skips caught by folder-purity before publication: techlistic
(DO-NOT-CITE), practica attempt-1. Pre-registered success bar (≥6/10 complete
pipelines): **met** (6 cleared).

Two structural findings dominate Tier 3:

1. **Weak-A/strong-fusion pattern.** On content-heavy sites (wikipedia,
   github-trending, hackernews), Architecture A exhausted its exploration
   budget before generating tests, yet fusion composed executable suites from
   B-side perception alone — attribution reached 83–100% precisely where raw
   exploration was weakest. Hacker News produced the campaign's first
   100%-fusion-created suite.

2. **Verifier-gap class.** EvilTester's two FT failures passed live probes
   but changed nothing observable (`no_post_action_change`) — actions-work
   verification cannot distinguish a working button from a silent one without
   an oracle. This is §5's ceiling observed in production.

### 3.3 D11 final batch (sites 31–35, 36–40)

| # | Site | Run ID | Outcome | FT live | Fusion-attributable |
|---|---|---|---|---|---|
| 32 | EvilTester Pages (re-run) | run_20260826_005704 | SUCCESS both archs | 1/3 PASS (verifier gap) | 42.9% |
| 33 | TodoMVC React | run_20260826_002227 | SUCCESS both archs | 3/3 PASS | 30% |
| 36 | Guru99 Bank demo | run_20260826_020711 | SUCCESS both archs (D7 budget validated) | 4/8 PASS | 66.7% |
| 37 | GlobalSQA Hub | un_20260826_023441 | SUCCESS both archs | 7/8 PASS | 66.7% (17 novel targets) |
| 38 | Dynamic Loading 2 | run_20260826_022742 | SUCCESS both archs | 1/1 PASS | 14.3% |
| 39 | The Internet: Tables | run_20260826_023111 | SUCCESS both archs | 1/1 PASS | 14.3% |

Skips/blocked: #31 magento (Cloudflare 526; full protocol still executed,
purity PURE), #34 techlistic DO-NOT-CITE, #35 practica attempt rejected,
#40 w3schools purity-FAIL (DO-NOT-CITE; report
`w3schools_inputs_contaminated_2026-08-26.md`).

The batch validated the D7 budget fix end-to-end (#36: A used its full
25-step budget productively for the first time) and captured the provenance
guard firing live (#39's collector rejected a concurrent w3schools
exploration from another lane).

---

## 4. RESULTS

### 4.1 Test quality rubric (Vision)

Regenerated decontaminated ledger for Tiers 1–2
(`testing/VISION_TEST_QUALITY.md` @ 2026-08-25T15:16Z):
**62 tests executed, 48 passed (77%); strength mix STRONG 33 / MEDIUM 25 /
WEAK 4.** During the contamination window the same ledger read 68/52/76%/34
STRONG (strict boundary) and 76/75%/36 STRONG (broader boundary); the headline
ratio held under all three boundary definitions and survived adversarial
recount.

Fused-test (FT) execution aggregates by round, from per-run
`ft_execution_results.json` over guard-passing runs only:

| Round | Executed | Passed | Pass rate |
|---|---|---|---|
| Tiers 1–2 (decontaminated) | 60 | 37 | 61.7% |
| Tier-3 clears (incl. #17 re-run) | 29 | 14 | 48.3% |
| D11 final batch (36–39) | 18 | 13 | 72.2% |

The Tier-3 dip decomposes into two honest classes: hackernews's
single-root-cause composition bug (7 fails from bare-/item navigation — one
S4 defect, not seven site defects) and eviltester's verifier-gap pair. The
D11 recovery to 72.2% is consistent with healthy-A shape producing
better-grounded compositions. Every failure carries a classified root cause.

### 4.2 Complementary perception (A vs B means, n=18 runs)

| Measure | Arch A | Arch B |
|---|---|---|
| Tests generated | 2.7 | 0.9 |
| States explored | 7.8 | 5.9 |
| Elements seen | 8.8 | **170.6** (~19×) |
| Behaviors seen | 9.0 | 6.0 |
| Targets covered | 5.4 | 4.3 |

Neither perception's volume predicts usefulness: A leads behaviors and
targets, B leads element visibility by an order of magnitude. Pre-
decontamination means (n=19: elements 8.3 vs 138.3, ~16×) show the conclusion
is stable under both ledgers. Source: `dashboard_data.json`
`architecture_comparison`; arithmetic verified by audit.

### 4.3 Fusion contribution

Tiers 1–2: **86 offered / 60 accepted (all grounded) / 60 executed live /
37 PASS; mean fusion-attributable coverage 48.7% (n=19); 95 novel targets
exercised that neither explorer reached alone.** Per-site range 0–100%;
zeros are honest zeros where the validator offered nothing executable.
Tier 3 strengthens the structural finding: attribution peaked (83–100%) on
the sites where A was budget-limited, and hackernews delivered the first
100%-fusion-created suite. D11 added 66.7% shares with high novel-target
counts (#37: 17 novel targets). Fusion % alone does not equal value:
cross-origin composed workflows (GlobalSQA) and quiet-page coverage are
qualitative wins beyond the percentage.

### 4.4 Honest failure taxonomy

Every fused-test failure carries a classified root cause
(`failure_classification[].class` in `runs/<id>/fusion/ft_execution_results.json`).
Representative classes observed across the campaign:

| Class | Count | Example case |
|---|---|---|
| no_post_action_change | 3+ | books FT002; eviltester pair on live-probe-passing buttons (verifier gap) |
| label_mismatch | 1 | bstackdemo FT001 — validator refused a mislabeled target |
| selector_not_visible | 1 | juiceshop FT001 — cookie banner vanishes after first click (idempotency proof) |
| selector_readonly | 1 | CURA re-run FT003 — readonly display box fast-fail |
| selector_not_found | 7 | hackernews — one composition bug (bare-/item nav), honestly attributed |
| connection_reset | 7 | Open Library outage window — recorded, not retried into green |

Zero-fusion sites are reported as honest zeros, never as failures of the
fusion layer.

### 4.5 Autonomous issue discovery

- Juice Shop public `/ftp` directory exposure — found by vision exploration
  with zero hints (`juiceshop_2026-08-24.md`).
- PHPTravels demo serving a demoblaze mirror — discovered deterministically
  via validator cross-page-ref rejections and **reproduced on the clean
  guarded re-run** `run_20260825_201027`.
- CURA readonly credential display — proven by selector_readonly fast-fail.
- Magento origin serving Cloudflare 526 (site-down) and goodreads
  blank-render — environment-integrity findings recorded rather than bypassed.

Absence of a finding on other sites is not evidence of absence.

---

## 5. THE VERIFICATION CEILING (MUTATION STUDY)

Seeded-bug harness: broken navigation, wrong cart calculation, invalid-input
validation accepted, missing required field, dead submit button. Four rounds
(round 1 invalidated by harness fault and archived; round 3 partially
quota-limited; round 4 TPM-paced).

**Headline finding.** Round 3 proved the pipeline reaches every buggy surface:
in the wrong_calc variant, Architecture A visited all five fixture URLs
(21 steps / 11 states), fusion accepted 4 tests, and live execution passed
4/4 including the buggy cart page — yet the phantom $10 total error was never
flagged, because no test asserts expected values. broken_nav showed the same
ceiling differently: navigation to a fixture 404 page was judged PASS because
body-text verification only checks non-trivial content. dead_button stayed
NOT_COVERED — a bug nothing touches cannot be scored.

**Conclusion.** The system verifies that *actions work*, not that *values are
correct*. Value-level bugs require an oracle the architecture deliberately
does not fabricate. Raising detection honestly requires expected-value
predicates at generation time (the top V2 item), not analyzer tricks.
Evidence: `mutation/results/ANALYSIS.md`; production echo in the eviltester
verifier-gap failures (§3.2).

---

## 6. PIPELINE HARDENING THROUGH HETEROGENEOUS TESTING

Testing against heterogeneous real sites surfaced defect classes no local
test suite predicted: bot-walls, hash-router URL normalization, SPA
network-idle hangs, digit-leading CSS ids, cross-pipeline shared-storage
stitching, and reasoning-model JSON corruption.

Defect ledger: #1–#19 in `docs/AUDIT_REPORT.md` §6; #20 executor crash on
behavior refs; #21 reasoning-token starvation → invalid JSON; #22
run-attribution corruption mode (adversarial audit); #23 null page_key
(fixed in S1 builder); #24 collector provenance-guard scope gap (fixed @
`97a29cb`, verified live by the Tier-3 final audit); minor audit fixes
F3-03/F4-05 @ `0df6786`. Offline suites: **157/157 PASS**.

---

## 7. LIMITATIONS AND THREATS TO VALIDITY

### 7.1 Verification ceiling: actions-work vs values-correct

Section 5 bounds every bug-detection claim. Detection requires both coverage
of the buggy surface AND an oracle asserting expected value; the architecture
deliberately fabricates neither. Green-check results in §4 are action-success
evidence, not correctness proofs.

### 7.2 Contamination incident: scope, detection, remediation, residual risk

**Scope.** Concurrent overnight workloads (tier-2 chain + mutation +
repeatability studies, 2026-08-25) caused an mtime-window folder collector to
stitch artifacts from different browser sessions into single run folders.
Five registered Tier-2 rows held wrong-site evidence; three carried
localhost-fixture B-side replays. Individual artifacts were authentic —
folder composition was broken.

**Detection.** An independent adversarial auditor recomputed every aggregate
from raw artifacts; arithmetic reproduced exactly while ground-truth probing
of manifest-vs-catalog-vs-step URLs exposed the wrong-site rows (findings
F-01/F-02 CRITICAL, F-03 HIGH).

**Remediation.** Quarantine ledger (`testing/QUARANTINE_TIER2.md`); guards
shipped (birthtime+manifest matching, catalog domain closure, vision
session-identity, folder-purity); all eight affected sites re-run and
cleared; contaminated runs retained as evidence only.

**Residual risk — stress-tested.** Later concurrent operations (D9/D11)
produced four further shared-storage stitching attempts; folder-purity caught
every one pre-publication, and the recurrence exposed defect #24 (guard did
not cover `test_cases_*`/visual-DOM classes), fixed and verified live.
bbc_news (row 27) was initially registered from a purity-FAIL directory —
caught by the full-campaign gate audit (F7-01 CRITICAL) and retracted to
DO-NOT-CITE CONTAMINATION-EVIDENCE status; the gate flipped to GATE-READY
only after remediation. Twice-learned lesson: multi-agent pipelines sharing
run directories need identity assertions at artifact acceptance time AND a
driver-level mutex — operator discipline is not a control.

### 7.3 Provider-pacing constraints

Free-tier pools imposed hard ceilings: Groq ~8k TPM (made mutation round 4
uneconomical), OpenRouter 1000 requests/day global (expired mid-round-3,
leaving quota-casualty NO_REPORT rows labeled as such). HTTP 429 handling
waits per provider-suggested delay (6 retries; ~110 s worst-case backoff).
Exploration depths and repeat counts were budget-driven, not statistically
chosen. Token usage for Tier-1 runs is reported as not recorded, never
estimated.

### 7.4 Other threats to validity

- **Single-run dominance.** Most results are single executions except
  designated repeats; flakiness bounds unknown until the repeatability data
  (`testing/REPEATABILITY.md`, methodology-contaminated and disclosed) folds
  into headline aggregates.
- **Tier-3 budget ceilings.** Three Tier-3 clears had Architecture A expire
  its budget before generating tests; their A-side numbers reflect trimmed
  campaign budgets, not steady-state capability — which is why
  fusion-attributable share peaked there (§3.2).
- **Windows-leaning implementation.** `taskkill /T /F` cleanup, bare `python`,
  hardcoded Tesseract path; cross-platform port assessed EASY-MEDIUM
  (~1.5–2 days), deferred by human decision.
- **Rubric classifier provenance.** Strength classes derive from the
  generator, not stored raw fields (audit F-11); boundaries shift slightly
  under recount while the headline ratio survives.
- **Ledger selection bias.** Failed sibling attempts exist on disk but may be
  unregistered; mitigated by citing explicit run IDs.
- **Production-readiness gap.** Single global key, Windows-only cleanup, no
  per-call browser isolation are BLOCKER-class for multi-user deployment
  (`docs/MCP_READINESS.md`); the system is a validated single-tenant research
  runner, not a service.

---

## 8. FUTURE WORK

1. **Value-oracle synthesis** at generation time — directly answers §5's
   ceiling and the verifier-gap production evidence.
2. **Dynamic-port parallel execution** with driver-level locking — removes
   the concurrency constraint implicated in §7.2.
3. **Identity reconciliation across perception spaces** — the ~19× element-
   visibility asymmetry describes the same controls in unmergeable spaces.
4. **MCP production packaging** per the five-tool surface and typed-error
   contracts in `docs/MCP_READINESS.md` (BETA GO recorded; see
   mcp/FINAL_REPORT.md in the MCP ground clone).

---

## 9. REPRODUCIBILITY

All artifacts under `runs/<run_id>/`; per-site reproduction commands in each
report's assets section; deterministic zero-LLM aggregators regenerate every
aggregate:

```bash
node testing/vision_test_quality.js      # vision rubric ledger
node fusion/s8_campaign_eval.js          # campaign aggregates
node testing/quarantine_audit.js         # quarantine cross-check
node --test "test/*.test.js" "fusion/test/*.test.js" "web/test/*.test.js"
```

Consolidated numbers-with-paths reference: `docs/RESEARCH_DATA_PACK.md`.

---

## 10. REFERENCE ARTIFACT INDEX

Canonical ledger: `testing/site_reports/INDEX.md`. One citable primary run
per site (abridged; full table in `docs/RESEARCH_DATA_PACK.md` §3):

| Site | Primary run |
|---|---|
| DemoQA (pre-campaign reference) | runs/fusion_s1_A214750_B169243844/ |
| SauceDemo … Open Library (sites 1–20) | see §3.1 table (all run IDs listed) |
| Wikipedia … Archive.org (21–28) | see §3.2 table |
| EvilTester, TodoMVC (32–33) | run_20260826_005704, run_20260826_002227 |
| Guru99, GlobalSQA Hub, DynLoading, Tables (36–39) | run_20260826_020711, un_20260826_023441, run_20260826_022742, run_20260826_023111 |

Retained-as-evidence (NOT citable for site claims): quarantined Tier-2 runs
`run_20260825_053921`..`run_20260825_070918`; voided sahitest `run_20260825_194511`;
contaminated todomvc attempt `run_20260826_000204`; techlistic/practica/w3schools
skip runs; bbc_news `un_20260826_000112` (CONTAMINATION-EVIDENCE, DO-NOT-CITE).

---

## 11. RELATED WORK

Grouped by methodology; all citations are published, verifiable works, none
load-bearing for our numbers.

**Flaky and brittle GUI tests.** Luo et al. (FSE 2014) taxonomy of flaky-test
root causes; Memon and Cohen (ICSE 2013) GUI-specific flakiness; Bell et al.
(ICSE 2018, DeFlaker) flaky-failure detection without reruns. Our coordinate
re-detection attacks brittleness from the perception side: Architecture B
never depends on selectors.

**Vision-based GUI testing.** Chang et al. (2010) image-matched widget
location; Yu et al. (arXiv:2310.13518, 2023) survey of vision-based mobile
GUI test generation. Our Architecture B fuses two detectors (YOLO + OCR) into
one visual DOM with per-element confidence and replays with live re-detection.

**LLM-based test generation.** Schäfer et al. (IEEE TSE, TestPilot); Lemieux
et al. (ICSE 2023, CodaMOSA); Deng et al. (ISSTA 2023, TitanFuzz). These
generate tests for code with executable oracles available at generation time;
our setting inverts the problem — the LLM acts on a live third-party website
where no oracle exists — hence the grounding validator.

**LLM web agents.** ReAct (Yao et al., ICLR 2023); WebArena (Zhou et al.,
2023); VisualWebArena (Koh et al., ACL 2024). Agent benchmarks optimize task
success in controlled replicas; we evaluate test-case quality against
uncontrolled production sites, which is why honest failure classification and
an attribution audit are first-class outputs.

**Positioning summary.** The unexplored intersection this report contributes:
deterministic fusion of two independent perception streams with
zero-fabrication validation, evaluated under an adversarial self-audit
protocol on real production websites.

---

## REFERENCES

Verify programmatically before external submission (titles/authors/venues
below match published works; none of the report's numbers depend on them).

1. Luo, Hariri, Eloussi, Marinov. *An Empirical Analysis of Flaky Tests.* FSE 2014.
2. Memon et al. GUI testing flakiness characterization. ICSE 2013.
3. Bell, Kaiser, Memon. *DeFlaker.* ICSE 2018.
4. Chang et al. *Sikuli: visual test scripting.* 2010.
5. Yu et al. Vision-based mobile GUI testing survey. arXiv:2310.13518, 2023.
6. Schäfer et al. TestPilot. arXiv:2302.06527; IEEE TSE.
7. Lemieux et al. *CodaMOSA.* ICSE 2023.
8. Deng et al. *TitanFuzz.* ISSTA 2023.
9. Yao et al. *ReAct.* ICLR 2023.
10. Zhou et al. *WebArena.* 2023.
11. Koh et al. *VisualWebArena.* ACL 2024.

---

## APPENDIX A — CONSOLIDATED DATA REFERENCE

Every number in this paper, with artifact paths, is consolidated in
`docs/RESEARCH_DATA_PACK.md` (T610 deliverable). Regenerate all aggregates
deterministically:

```bash
node testing/vision_test_quality.js
node fusion/s8_campaign_eval.js
node --test "test/*.test.js" "fusion/test/*.test.js" "web/test/*.test.js"
```

## APPENDIX B — AUDIT TRAIL

- `docs/AUDIT_REPORT.md` — Tier-2 contamination audit + ADDENDUM
- `docs/AUDIT_T401_REPORT.md` — full-campaign gate audit (NO-GO → REMEDIATED → GATE-READY)
- Tier-3 interim audits rounds 1–3 (E-T3-* evidence)
- `docs/RETROSPECTIVE_TIER2.md`, `docs/RETROSPECTIVE_TIER3.md`
- `testing/D11_FINAL_BATCH_MEGA_REPORT.md`

*— End of report. Prepared by serial-D/W4 (T612), 2026-08-27.*
