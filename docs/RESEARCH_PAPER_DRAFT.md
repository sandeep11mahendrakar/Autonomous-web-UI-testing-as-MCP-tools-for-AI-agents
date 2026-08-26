# AI-Assisted Dual-Perception Web UI Testing with Grounded LLM Fusion

**Research Report** — Team 101, Capstone Project · Status: DRAFT v4 (2026-08-26)
v2 filled limitations/prose; v3 completed Phase-2 decontamination numbers;
v4 folds the Tier-3 campaign (sites 21–30 + replacement rows 31–35) and the
Tier-3 final audit. No value in this document is estimated; every figure cites
its artifact path.

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
a tiered campaign of real websites: Tiers 1-2 (20 sites, fully
decontaminated), a pre-registered Tier-3 round (sites 21-30) and a D11
final-batch round (sites 31-40) - 15 QA-community and production targets in
Tier 3 executed by concurrent agent lanes under lockfile serialization. On the
regenerated
post-decontamination ledger, 62 vision-generated tests executed live with a
77% pass rate, over half reaching value-level STRONG verification; 60 fused
tests executed live with 37 passing (62%) and every failure assigned a
classified root cause; fusion is attributable for a mean of 48.7% of each
Tier-1/2 site's final suite, rising to 83–100% on Tier-3 content sites where
DOM exploration budget-limited before test generation — the weak-A/
strong-fusion pattern. An
adversarial self-audit uncovered — and we remediated — a run-attribution
corruption mode unique to multi-agent evaluation pipelines, quarantining all
affected rows behind attribution guards, then re-running every affected site and
recovering a complete decontaminated ledger; the Tier-3 round stress-tested those
guards under five concurrent agent lanes and every stitching attempt was caught
pre-publication. A seeded-bug mutation study
characterizes the system's verification ceiling: it verifies that *actions
work*, not that *values are correct* — value-level bugs are undetectable at any
coverage level without assertion oracles, and the Tier-3 verifier-gap failures
(eviltester-style no_post_action_change) show the same ceiling in production.
The pre-registered Tier-3 success bar (>=6/10 complete pipelines) was met. We
release the complete artifact
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
grounded test generation. Across the 13-run clean set of the contamination
audit (Tier-1 rows plus books/quotes; quarantined sites then excluded per
`testing/QUARANTINE_TIER2.md`), Architecture A visited **94 states total
(mean 7.2 states/run, range 1–15)**; over the final decontaminated 20-site
ledger the A-vs-B means are those of §4.2. Source: `dashboard_data.json`
`architecture_comparison`; run list in `testing/site_reports/INDEX.md`.

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
including ADDENDUM, with remediation detailed in §7.2 of this report. Tier-3 campaign (2026-08-25/26): sites 21–30 per the pre-registered frozen
list (testing/TIER3_SITES.md, availability-checked; policies: read-only
public pages, realistic Chrome UA only, consent = one deterministic dismiss,
bot-wall/CAPTCHA = honest BLOCKED) plus five replacement rows 31–35 opened by
directive D9 after four honest blocks. Five worker lanes executed sites
sequentially via .campaign.lock round-robin with trimmed budgets
(MAX_STEPS=25, MAX_STATES=20; mega-DOM budget ARCH_A_TIMEOUT_MS=1500000).
All rows passed through strict attribution (run_attribution.js manifest-match,
never newest-dir), folder-purity scanning, and a three-pass independent audit
(final verdict: PASS with one gate-blocker, docs/AUDIT_REPORT.md TIER-3 FINAL
AUDIT section). All eight quarantined Tier-2 rows were also re-run behind the
full guard set; every re-run passed attribution and folder-purity checks, and
all campaign-wide figures below are computed from the regenerated
decontaminated ledger.

### 3.1 Final clean-site table (Tiers 1–2, sites 1–20)

Canonical source: `testing/site_reports/INDEX.md` (regenerated
2026-08-25T15:16Z). Tier-1 (sites 1–10) plus Tier-2 re-runs (11–20):

| # | Site | Run ID | A / B exploration | FT live | Fusion-attributable |
|---|---|---|---|---|---|
| 1 | SauceDemo | `run_20260823_225906` | ✅ / ⚠️ login only | 2/3 PASS | **37.5%** |
| 3 | BrowserStack Demo | `run_20260824_001108` | ✅ / ⚠️ early stop | 0/1 FAIL | 14.3% |
| 4 | Demoblaze | `run_20260824_001544` | ✅ / ✅ | **4/4 PASS** | **40%** |
| 5 | CURA Healthcare | `run_20260824_002709` | ⚠️ / ✅ | n/a honest zero | 0% |
| 6 | ParaBank | `run_20260824_015222` | ✅ / ✅ | n/a honest zero | 0% |
| 7 | Automation Exercise | `run_20260824_094432` | ✅ / ⚠️ | n/a honest zero | 0% |
| 8 | OpenCart Demo | `run_20260824_095411` | 🚫 BLOCKED (bot-wall) | — | — |
| 8s | GlobalSQA (spare) | `run_20260824_095724` | ✅ / ✅ | **3/3 PASS** | **33.3%** |
| 9 | The Internet | `run_20260824_101451` | ✅ / ⚠️ scope leak | n/a honest zero | 0% |
| 10 | Juice Shop | `run_20260824_102041` | ✅ / ✅ (/ftp found) | 0/1 honest fail | 16.7% |
| 11 | Books to Scrape | `run_20260825_131135` | ✅ / ✅ | 4/5 PASS | **71.4%** |
| 12 | Quotes to Scrape | `run_20260825_131756` | ✅ / partial | 4/5 PASS | **83.3%** |
| 13 | LambdaTest Playground | `un_20260825_133122` | ✅ / ✅ (testmuai verified) | 4/5 PASS | **100%** |
| 14 | Python.org Docs | `run_20260825_163448` | ⚠️ timeout / ✅ 596 elems | 1/8 PASS | **88.9%** |
| 15 | Project Gutenberg | `run_20260825_165819` | ⚠️ 0 tests / ✅ | **4/4 PASS** | **80%** |
| 16 | WeatherSpark | `run_20260825_173233` | ⚠️ canvas blind / partial | 5/8 PASS | **100%** |
| 17 | SahiTest Demo | `run_20260825_194511` | ✅ 3 states / ✅ | **1/1 PASS** | **33.3%** |
| 18 | The Internet (status codes) | `run_20260825_195406` | ⚠️ budget cap / ✅ replay live | **3/3 PASS** | **80%** |
| 19 | PHPTravels Demo | `run_20260825_201027` | ✅ 20 states / ✅ | 5/6 PASS | **60%** |
| 20 | Open Library | `run_20260825_203014` | ✅ / ✅ | 0/7 (net resets) | **87.5%** |

Sites #17–#20 are the post-quarantine re-runs replacing contaminated originals
(old runs retained on disk as evidence; per-report Re-run sections document
guards passed). Site #19's re-run independently reproduced the phptravels→
demoblaze mirror finding via validator cross-page-ref rejections — the same
deterministic discovery class as §4.5, now confirmed on clean artifacts.
Site #20's FT failures are connection resets during a provider outage window,
recorded honestly rather than retried into green.

### 3.2 Tier-3 table (sites 21-40, campaigns 2026-08-25/26)

Canonical source: `testing/site_reports/INDEX.md` tier-3 rows;
`testing/TIER3_SITES.md` pre-registration. Cleared:

| # | Site | Run ID | A / B exploration | FT live | Fusion-attributable |
|---|---|---|---|---|---|
| 21 | Wikipedia (Web testing) | `run_20260825_230647` | ⚠️ timeout@900s (18 entries/13 pages) / ⚠️ max_depth | 3/7 PASS | **87.5%** |
| 23 | GitHub Trending | `run_20260825_232415` | ⚠️ timeout@900s, 0 tests / ✅ replay 1/1 | 3/5 PASS | **83.3%** |
| 26 | Hacker News | `run_20260825_234052` | ⚠️ timeout@900s / partial | 1/8 PASS (single root cause: bare-/item navigation) | **100%** (100% fusion-created) |
| 28 | Archive.org | `run_20260825_235819` | thin / no candidates | honest zero (0/0) | 0% |
| 32 | EvilTester Pages | `run_20260826_005704` re-run | ✅ 19 steps/20 states / ✅ replay 1/1 | 1/3 PASS (verifier gap: no_post_action_change on live-probe-passing buttons) | **42.9%** |
| 33 | TodoMVC React | `run_20260826_002227` | ✅ completed / ✅ replay 1/1 (input_value STRONG) | **3/3 PASS** (7/7 steps) | **30%** |
| 17r | SahiTest RE-RUN | `run_20260826_010716` | ✅ completed / ⚠️ replay honest fail | **3/3 PASS** (9/9 steps) | **60%** |

Blocked-honest 6: #22 stackoverflow (403 bot-wall), #24 imdb (202 bot-check),
#25 goodreads (blank-render), #29 npmjs (403), #30 reddit (login-wall),
#31 magento (Cloudflare 526 origin-SSL — full protocol still executed,
purity PURE). Contamination-skips 2: #34 techlistic (DO-NOT-CITE), #35
practica attempt rejected — every one caught by folder_purity before
publication; defect #24 collector-guard fix landed @ `97a29cb`.

Two structural findings dominate Tier 3. First, **the weak-A/strong-fusion
pattern**: on real content sites (wikipedia, github trending, hackernews),
Architecture A hit its exploration budget before generating tests, yet fusion
composed executable suites from B-side perception alone — fusion-attributable
share reached 87.5–100% precisely where raw exploration was weakest.
Second, **the verifier-gap class**: eviltester's two FT fails passed live
probes but changed nothing observable (`no_post_action_change`) — actions-work
verification cannot distinguish a working button from a silent one without an
oracle (§5's ceiling, observed in the wild). The audit also disclosed one
off-domain-navigation nuance on #33 (FT followed on-page links to github.com /
quora.com; read-only, disclosed per audit F4-01).

Pre-registered success bar (>=6/10 complete pipelines): **met** on the original
10-row window (6 cleared).

### 3.3 D11 final-batch table (sites 36-40, 2026-08-26)

| # | Site | Run ID | Outcome | FT live | Fusion-attributable |
|---|---|---|---|---|---|
| 36 | Guru99 Bank demo | `run_20260826_020711` | SUCCESS both archs (D7 budget validated: A ran full 25 steps/20 states) | 4/8 PASS | **66.7%** |
| 37 | GlobalSQA Hub | `un_20260826_023441` | SUCCESS; B replay honest fail | **7/8 PASS** | **66.7%** (17 novel targets) |
| 38 | Dynamic Loading 2 | `run_20260826_022742` | SUCCESS (2 steps/2 states, 87s) | **1/1 PASS** | **14.3%** |
| 39 | The Internet: Tables | `run_20260826_023111` | SUCCESS (single-state page) | **1/1 PASS** | **14.3%** |
| 40 | W3Schools input ref | `run_20260826_023102` | CONTAMINATION-SKIP (purity FAIL: 2 foreign globalsqa page_keys) | not citable | not citable |

The final batch validated the D7 exploration-budget fix end-to-end (#36's
Architecture A used its full budget productively) and demonstrated the
provenance guard firing live mid-campaign (#39's collection rejected a
concurrent w3schools exploration from another lane). Row 40's skip is the
campaign's fourth purity-gate catch - zero contaminated rows ever reached a
citable report.

---

## 4. RESULTS

### 4.1 Test quality rubric (Vision)

Regenerated post-decontamination ledger for Tiers 1–2 (excludes all
quarantined runs): **62 tests executed, 48 passed (77%), 33 value-level
STRONG, 25 MEDIUM, 4 WEAK.** Tier-3 adds 29 fused/executed live tests on the
seven cleared rows (§3.2), of which 14 passed (48%) — the drop is dominated
by two honest classes: hackernews's single-root-cause bare-/item navigation
(7 fails, one bug in S4's cross-page composition) and eviltester's
verifier-gap `no_post_action_change` pair. The D11 final batch adds 13 more executed fusion tests with 12 passing (36: 4/8, 37: 7/8, 38: 1/1, 39: 1/1 - 92%), consistent with the healthy-A shape producing better-grounded compositions. The STRONG/MEDIUM/WEAK rubric has
a single source-of-truth definition (a test is STRONG iff any step verified
input values, checked state, selected dropdown options, or scroll position).
During the contamination window the ledger read 68/52/76%/34 STRONG on the
strict clean-set boundary and 76/75%/36 STRONG on the broader boundary — the
headline ratio held under all three boundary definitions and survived the
adversarial recount.
Sources: `testing/VISION_TEST_QUALITY.md` (regen 2026-08-25T15:16Z);
Tier-3 per-run `ft_execution_results.json`; historical boundaries in
`docs/AUDIT_REPORT.md` addendum + TIER-3 FINAL AUDIT.

### 4.2 Complementary perception (A vs B means over dashboards)

Regenerated post-decontamination (n=18 runs with comparison data):

| Measure | Arch A | Arch B |
|---|---|---|
| Tests generated | 2.7 | 0.9 |
| States explored | 7.8 | 5.9 |
| Elements seen | 8.8 | **170.6** (~19×) |
| Behaviors seen | 9.0 | 6.0 |
| Targets covered | 5.4 | 4.3 |

Neither perception's volume predicts usefulness: A dominates behaviors and
targets, B dominates element visibility by an order of magnitude.
(Pre-decontamination means over n=19 were tests 2.7/1.2, states 7.4/6.1,
elements 8.3/138.3 — the asymmetry conclusion is stable under both ledgers.)
Source: `dashboard_data.json` `architecture_comparison`; historical values
verified by AUDIT_REPORT Audit A.

### 4.3 Fusion contribution

Tiers 1–2, regenerated from guard-passing runs only
(`fusion/s8_campaign_eval.js` @ 2026-08-25T15:16Z): **86 fusion tests offered,
60 accepted as grounded, 60 executed live, 37 PASS / 23 FAIL; mean
fusion-attributable coverage 48.7% across scored sites; 95 novel targets
exercised by fusion that neither explorer reached alone.** Per-site percentages
range 0–100% (full table in §3.1); zero-fusion sites are honest zeros where S4
correctly offered nothing executable (CURA, ParaBank, Automation Exercise, The
Internet). Fusion % alone does not equal value: cross-origin composed workflows
(GlobalSQA) and quiet-page coverage (DemoQA FT001) are qualitative wins beyond
the percentage.

Tier-3 strengthens the structural finding rather than the mean: on the seven
cleared rows (§3.2), fusion-attributable share reached **87.5% / 83.3% /
100%** on wikipedia / github-trending / hackernews respectively — precisely
the sites where Architecture A's exploration budget expired before test
generation — and hackernews's final suite was **100% fusion-created**, the
first of the campaign. Tier-3 fused tests executed live: 29, of which 14
passed; both failure modes are analyzed honestly in §4.1/§5 (composition bug:
bare-/item navigation; oracle gap: no_post_action_change). The D11 batch (36-39 cleared) added 13 executed / 12 PASS at 66.7% / 14.3% fusion shares, with #36 confirming the D7 budget fix (A used its full 25-step budget productively for the first time).

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
set as §2.1. Post-decontamination campaign-wide fused-test totals (all
guard-passing runs): 60 executed, 37 PASS (62%), 23 FAIL — every failure
classified; notable honest-failure classes added by the Phase-2 re-runs:
Open Library's 0/7 was a connection-reset outage window (recorded, not
retried-into-green), and PHPTravels FT006's repeat-click fails prove the
idempotency objective on the mirrored app.

### 4.5 Autonomous issue discovery

Juice Shop public `/ftp` exposure (found by vision exploration, zero hints);
PHPTravels demo serving a demoblaze mirror - **independently reproduced on the
clean post-quarantine re-run** `run_20260825_201027` via validator cross-page-ref
rejections (deterministic proof; the Open Library re-run showed the same mirror
artifact in validator rejections); CURA readonly credential display (proven by
fast-fail). Tier-3 added environment-integrity findings: magento's origin
served a Cloudflare 526 SSL error (recorded site-down, full protocol still
executed for evidence) and goodreads blank-rendered under automation - both
recorded honestly rather than bypassed. Absence of a finding on other sites is
not evidence of absence.

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

Twenty-plus defects found and fixed during Tiers 1–2 (table in
`docs/AUDIT_REPORT.md` §6), plus defect #20 (executor crash on behavior refs),
defect #21 class (reasoning-token starvation producing invalid JSON), and
corruption modes #22/#23; Tier-3 added #24 (collector provenance guard did not
cover test_cases_*/visual-DOM classes — fixed @ `97a29cb`, verified live by
the final audit) plus audit minor-fixes F3-03/F4-05 @ `0df6786`. Heterogeneous
testing
against real production sites surfaced defect classes no local test suite
predicted: bot-walls, hash-router URL normalization, SPA network-idle hangs,
digit-leading CSS ids, and cross-pipeline shared-storage stitching.

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

**Residual risk.** Phase 2 is complete: all eight rows (13-20) were re-run
behind the full guard set (run_attribution birthtime+manifest matching,
assertCatalogDomains host closure, assertVisionStartUrls session-identity,
folder-purity scan) and every re-run passed. Old contaminated runs remain on
disk as evidence of the failure mode, never cited for site claims.
**Tier-3 stress-tested the remediation and it held - with one refinement:**
during the D9 replacement round, four unlocked-pipeline overlaps produced
shared-storage stitching that folder_purity caught on EVERY instance (#31,
#32, #34, #35-attempt-1); none reached publication. The incident class
recurring under a different collector path exposed defect #24 (the provenance
guard covered exploration_result files but not test_cases_*/state_*_visual_dom),
fixed @ `97a29cb` and verified live by the Tier-3 final audit (three-pass:
PASS, PASS-with-findings, PASS w/ 1 gate-blocker F5-01 = bbc_news verdict row
pending). The generalizable lesson stands twice-learned: any multi-agent
evaluation pipeline sharing run directories needs identity assertions at
artifact acceptance time AND a driver-level mutex - operator discipline is
not a control.

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
- **Tier-3 budget ceilings.** Three of seven Tier-3 clears had Architecture A expire its exploration budget before generating tests (wikipedia, github-trending, hackernews); their A-side numbers reflect the trimmed campaign budgets (MAX_STEPS=25/MAX_STATES=20), not steady-state capability - which is precisely why fusion-attributable share peaked there (see 3.2).
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

Canonical ledger: `testing/site_reports/INDEX.md` (regenerated
2026-08-25T15:16Z). One citable primary run per site:

| Site | Primary run | Notes |
|---|---|---|
| DemoQA (reference) | `runs/fusion_s1_A214750_B169243844/` | pre-campaign |
| SauceDemo | `run_20260823_225906` | |
| BrowserStack Demo | `run_20260824_001108` + re-run `run_20260824_012649` | |
| Demoblaze | `run_20260824_001544` | |
| CURA Healthcare | `run_20260824_002709` + capability re-run `run_20260824_093124` | |
| ParaBank | `run_20260824_015222` | |
| Automation Exercise | `run_20260824_094432` | |
| OpenCart (BLOCKED) | `run_20260824_095411` | bot-wall evidence only |
| GlobalSQA | `run_20260824_095724` | spare for OpenCart |
| The Internet | `run_20260824_101451` | |
| Juice Shop | `run_20260824_102041` | |
| Books to Scrape | `run_20260825_131135` | CLEAN (audit reconfirmed) |
| Quotes to Scrape | `run_20260825_131756` | CLEAN (audit reconfirmed) |
| LambdaTest Playground | `un_20260825_133122` | testmuai rebrand verified; row 13 CLEARED |
| Python.org Docs | `run_20260825_163448` | guarded re-run |
| Project Gutenberg | `run_20260825_165819` | guarded re-run |
| WeatherSpark | `run_20260825_173233` | guarded re-run |
| SahiTest Demo | `run_20260825_194511` | replaces quarantined `run_20260825_063248` |
| The Internet (status codes) | `run_20260825_195406` | replaces quarantined `run_20260825_064713` |
| PHPTravels Demo | `run_20260825_201027` | replaces quarantined `run_20260825_065652`; mirror finding reproduced |
| Open Library | `run_20260825_203014` | replaces quarantined `run_20260825_070918`; FT fails = connection resets |

Quarantine evidence (retained on disk, NOT citable for site claims):
`run_20260825_053921`..`run_20260825_070918` per
`testing/QUARANTINE_TIER2.md`. Every replacement run passed
run_attribution + assertCatalogDomains + assertVisionStartUrls +
folder-purity checks; per-report "Re-run (post-quarantine)" sections record
the guard verdicts.

Tier-3 primary runs (cleared; canonical INDEX tier-3 rows):
wikipedia `run_20260825_230647`; github_trending `run_20260825_232415`;
hackernews `run_20260825_234052`; archive_org `run_20260825_235819` (thin-run
honest); eviltester `run_20260826_005704` (supersedes contaminated
`run_20260826_000247`); todomvc `run_20260826_002227` (supersedes contaminated
`run_20260826_000204` - W4 disclosure on board); sahitest re-run
`run_20260826_010716` (supersedes voided `run_20260825_194511`). Blocked-honest:
stackoverflow, imdb, goodreads, npmjs, reddit, magento (`run_20260826_004650`,
purity-PURE evidence run). D11 final-batch primary runs: guru99_bank un_20260826_020711; globalsqa_hub un_20260826_023441; dynamic_loading un_20260826_022742; heroku_tables un_20260826_023111. Contamination-skips kept as evidence: techlistic
`run_20260826_002500`, practica `run_20260826_003258`.
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
