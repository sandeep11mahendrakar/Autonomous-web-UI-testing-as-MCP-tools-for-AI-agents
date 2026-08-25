# TIER-2 MEGA REPORT — The Definitive Tier-2 Narrative (Sites 11–20)

**Task:** T601 (Master directive D2) · **Author:** serial-B / ox-alpha CLI window
**Branch:** `after-tier-2` · **Status:** FINAL (2026-08-25 ~20:55 IST) — all
rows 11–20 verified: every number pulled from raw artifacts via
`node testing/extract_run.js <run_id>` against each site's CURRENT registered
run; rows 17–20 re-runs all passed findRunDir + assertCatalogDomains +
assertVisionStartUrls + folder_purity PURE. Nothing in this file is estimated.

---

## 1. PRE-STATE — what Tier 1 proved, and the five weaknesses entering Tier 2

### What Tier 1 proved (`testing/TIER1_RETROSPECTIVE.md`, checkpoint C3)

| Proof | Evidence |
|---|---|
| Pipeline generalizes | 11/11 runnable sites end-to-end (+1 honest Cloudflare BLOCKED on OpenCart) |
| FT live pass rate | 77% (10/13), every FAIL honestly classified |
| Fusion-attributable coverage | ~20% mean (range 0–40%), trending ~28% after capability upgrades |
| Campaign method works | 19 pipeline defects surfaced by site diversity, all fixed with before/after evidence; zero discoverable on the reference site alone |
| Complementary perception | A/B element overlap stayed 0–1 across all 10 sites while catalogs reached 78–273 elements |
| Honest failures compound into trust | label_mismatch / selector_readonly FAILs later proven correct site behavior |

### The five known weaknesses entering Tier 2

1. **A-timeout fragility** — Architecture A hit orchestrator caps under Groq
   free-tier pacing; a starved A shrinks the selector space available to
   fusion grounding (suspected, not yet quantified at Tier-1 close).
2. **Provider quota brittleness** — OpenRouter stealth/ox-alpha = 1000 req/day
   GLOBAL shared pool; ~8 sites per night per reset. Any long batch risks a
   mid-campaign drain.
3. **No concurrency discipline** — `.campaign.lock` existed only in
   `rerun_starved.js`; night_chain, scheduler, mutation and repeatability
   drivers did not share one mutex. Vision services used fixed ports
   5000–5004 with health-probe-then-spawn (TOCTOU race).
4. **Weak verification ceiling** — PASS initializes by default and bottoms out
   at body-text >100 chars; the Tier-1 mutation study had already proven the
   system "verifies actions-work, not values-correct."
5. **Unproven real-world claim** — the headline "fusion value explodes on real
   sites" rested on Tier-1 sandboxes; Tier-2 was the first test on genuine
   production sites. Nobody suspected that the bigger risk was not failing the
   tests but *not knowing which site the results belonged to*.

---

## 2. EXECUTION STORY — the night-chain contamination incident

### What happened

On the night of 2026-08-24→25 three workloads ran concurrently: the Tier-2
night chain, the mutation study, and the repeatability study.
`scheduler.log` proves the mutation study ran 00:05–00:51 UTC inside the
tier-2 chain window, and the repeatability study overlapped sites #16–#20.
When the audit later recomputed run manifests against ledger claims, **5 of
the 19 scored sites (#16 WeatherSpark, #17 SahiTest, #18 Internet status
codes, #19 PHPTravels, #20 Open Library) had executed against the WRONG
sites**: saucedemo.com, demoblaze.com, and localhost mirrors.

### Root-cause chain

```
concurrent studies (chain + mutation + repeatability, no shared mutex)
        │
        ▼
'newest-dir' attribution: pipeline steps finish into run dir X while the
fusion chain writes into seconds-newer dir Y created by another process
        │
        ▼
folder stitching: runBoth.js collectArchitectureB copied artifacts from the
SHARED vision/storage/outputs dir by an mtime window (mtimeMs >= startedAt-5000)
        → other studies' explorations landed in this run's folder
        → catalogs merged hosts (openlibrary catalog carrying demoblaze page_keys)
        │
        ▼
plausible-narrative laundering: site reports wrapped wrong-site data in
confident stories ("canvas invisible to OCR", "legacy frames") that raw
manifests/logs did not support
```

Individual JSON artifacts were authentic browser sessions — nothing was
doctored. The damage was purely compositional (audit ADDENDUM: "artifacts
authentic, folder composition broken").

### Detection — adversarial audit, not self-report

AUDITOR-3 (independent, read-only) recomputed 12 headline claims from raw
artifacts (`docs/AUDIT_REPORT.md`). All arithmetic reproduced EXACTLY — and
that was the trap: only cross-checking manifest URLs vs exploration logs vs
FT step URLs exposed F-01/F-02 (CRITICAL). Verdict: NOT-READY for production.
The quarantine table (`testing/QUARANTINE_TIER2.md`) was generated
deterministically by `testing/quarantine_audit.js` (commit `d1b0502`, 14:46).

### Remediation timeline (all same day, 2026-08-25)

| Time (IST) | Commit | Remediation |
|---|---|---|
| 14:26 | `53ed784` | P0 decontamination re-runs + first attribution guard (`findRunDir`) wired into night_chain/rerun_starved |
| 16:21 | `d299e8d` | `testing/rerun_quarantine.js` T201 driver + **assertVisionStartUrls** guard (audit-addendum mandate: every B exploration start_url host must equal manifest host) |
| 16:21/16:24 | `3b8317f`, `f4f942f` | driver fixes (INDEX patch id-swap, ftSummary schema) |
| 16:50 | `be06ec3` | testmuai.com alias approved in guard (master ruling for site 13 rebrand) |
| 16:57 | `6af23a4` | Site 14 docs_python CLEARED — run_20260825_163448 all guards green |
| 17:15 | `f98965c` | Site 15 gutenberg CLEARED — run_20260825_165819 all guards green |
| 17:51 | `9acbcec` | Site 16 weatherspark processed — run_20260825_173233 guards green |
| 18:46 | `57e1ffc` | **Collector provenance filter in runBoth.js** (exploration files whose start-url host ≠ manifest host are REJECTED from the run folder, logged to CONTAMINATION_REJECTS.json) + testing/folder_purity.js + regen_ledger.js single-source ledger tooling |
| 19:25 | `05baac6` | DEFECT #23 fix: pageKey null-guard + skip unattributable observations in S1 |
| 20:28 | (serial-A) | Site 17 sahitest CLEARED — run_20260825_194511, guards + purity green |
| 20:12–20:40 | `5cd2a47`/`ff3de43` | Site 18 the-internet CLEARED-BY-RERUN (serial-B) — run_20260825_195406; duplicate-watcher second post reconciled honestly in report |
| 20:49 | (serial-C) | Site 19 phptravels re-run run_20260825_201027 SUCCESS (mirror finding stands as site-issue credit) |
| 21:15 | (serial-A) | Site 20 openlibrary CLEARED — run_20260825_203014 honest PARTIAL (FT 0/7 recorded as-is); T201 COMPLETE for all of 13–20; aggregates regenerated |

Guards proved themselves immediately: during parallel T201 windows,
`assertVisionStartUrls` caught a gutenberg artifact sweeping into a duplicate
docs_python run (`run_20260825_165105`) and rejected it as evidence within
seconds — the sequential-only rule is load-bearing.

---

## 3. PER-SITE FINAL RESULTS TABLE (11–20)

All figures from each site's CURRENT registered run via
`node testing/extract_run.js <run_id>` (2026-08-25). Status vocabulary:
CLEAN = original run verified correct; CLEARED-BY-RERUN = quarantined row
re-run behind all three attribution guards; SITE-MOVED-EVIDENCE /
MIRROR-EVIDENCE = the live site itself changed identity (not a pipeline
fault); QUARANTINED = wrong-site evidence retained on disk as failure-mode
evidence, never cited.

| # | Site | Current registered run | Status | Overall | A expl | B side | S1 catalog | S4 accepted/offered | FT live | Fusion % | Novel targets |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 11 | Books to Scrape | `run_20260825_131135` | CLEAN | SUCCESS | 8 steps/8 states, completed | 1/1 PASS (weak verif=1, disclosed) | 568 el/16 bh/14 pages/54 confl | 5/5 grounded | **4/5 PASS** (10/11 steps) | **71.4%** | 8 |
| 12 | Quotes to Scrape | `run_20260825_131756` | CLEAN | PARTIAL_FAILURE | 8 steps/5 states, completed | B exploration produced no test cases (LLM 429, honest PARTIAL) | 53 el/11 bh/3 pages/13 confl | 5/7 accepted (dup + action_mismatch rejected) | **4/5 PASS** (10/11 steps) | **83.3%** | 10 |
| 13 | LambdaTest Playground | `un_20260825_133122` | SITE-MOVED-EVIDENCE | FAILED | A internal 900s timeout ×2 attempts; then live check: URL 301→ testmuai.com (rebrand verified) | B partial, no test cases | empty (guards OK, correctly attributed) | 4/5 accepted (re-run attempt) | 1/4 PASS | 100%* (denominator caveat) | 15 |
| 14 | Python.org Docs | `run_20260825_163448` | CLEARED-BY-RERUN | PARTIAL_FAILURE | timeout @900s cap (mega-DOM; 3rd occurrence) | 0/1 replay FAIL honest (verif skipped ×1, unresolved ×1, stale-guard blocked ×2); max_depth_reached, 2 states | 605 el/17 bh/17 pages/56 confl | 8/19 accepted (grounding strict: 2× max_tests, 1× action_mismatch) | **1/8 PASS** (12.5%) | 88.9%* | 10 |
| 15 | Project Gutenberg | `run_20260825_165819` | CLEARED-BY-RERUN | PARTIAL_FAILURE | timeout @900s cap | 1/1 replay PASS (weak verif disclosed); fatal_error screenshot protocol err ended expl early | 207 el/8 bh/7 pages/8 confl | 4/5 accepted (1× cross_page_ref rejected) | **4/4 PASS** (4/4 steps) | **80%** | 7 |
| 16 | WeatherSpark | `run_20260825_173233` | CLEARED-BY-RERUN (manifest FAILED, honestly recorded) | FAILED | timeout @900s cap | B no candidates remaining (canvas blind spot confirmed on real site) | 41 el/14 bh/10 pages/0 confl | 8/12 accepted (4× max_tests_reached) | **5/8 PASS** (62.5%) | 100%* | 15 |
| 17 | SahiTest Demo | `run_20260825_194511` | CLEARED-BY-RERUN (old run_…063248 explored saucedemo.com; kept on disk as evidence) | SUCCESS | A success, 3 steps/3 states/0 errors | B success execution stage, replay PASS live | (see report) | 1/2 accepted (1× cross_page_ref rejected) | **1/1 PASS (100%)** live | 33.3% | 2 |
| 18 | The Internet (status codes) | `run_20260825_195406` | CLEARED-BY-RERUN (manifest "PARTIAL_FAILURE" = A's internal 900s budget cap only — all executed stages succeeded live; not an execution failure) | A capped @900s but explored 9 steps/5 states, **0 errors** (3× elementalselenium.com ext-nav blocked by guard) | 1/1 replay PASS live (weak verif=1, disclosed); fatal_error screenshot protocol err ended expl; source_url verified live | 49 el/14 bh/5 pages/2 confl | 4/23 accepted across two S4 passes (cross_page_ref rejections — strict page-scoped grounding) | **4/4 PASS (100%)** live (second post re-synthesized 1 test; first post was 3/3; purity PURE after both) | **80%** | 8 |
| 19 | PHPTravels Demo | `run_20260825_201027` | MIRROR-EVIDENCE → re-run SUCCESS anyway (serial-C): the "mirror" finding stands as a real site issue, but the demo served a workable app this time | SUCCESS | A success: 21 steps/20 states max_states_reached (3 honest ERR_ABORTED on mailto:/tel: links) | B replay 1/1 PASS live (weak verif disclosed; stale-coord prevented ×4) | 299 el/29 bh/11 pages/19 confl | 6/9 accepted | **5/6 PASS** (12/14 steps) | **60%** | 10 |
| 20 | Open Library | `run_20260825_203014` | CLEARED-BY-RERUN (honest PARTIAL_FAILURE) | PARTIAL_FAILURE | A success termination: 11 steps/6 states completed but 9 js-nav ERR_ABORTED warnings recorded honestly | B partial_success (no_valid_candidate), 0/1 with error — no fake pass manufactured | 108 el/14 bh/8 pages/10 confl | 7/10 accepted (dup + 2× cross_page_ref rejected) | **0/7 PASS** — all honest fails, zero stale clicks | 87.5%* | 8 |

\* Site-20's 87.5% attribution with 0/7 FT passes is the clearest single
illustration of the denominator caveat in §4-negative-2: A produced 0 test
cases, so fusion created nearly everything and failed executing most of it.
The honest signal is 0/7, not 87.5%.

\* High fusion-% with a low absolute FT pass rate is a **denominator effect**:
when A times out it contributes 0 tests, so nearly every final test is
fusion-created by construction (docs_python 88.9% with 1/8 PASS;
weatherspark 100% of 8). Attribution % measures composition, not success —
see Insights.

Old quarantined runs (`run_20260825_062152`…`070918`, plus fixture-fed
B-sides of 13–15) stay on disk as evidence of the failure mode, per
QUARANTINE_TIER2 policy.

---

## 4. INSIGHTS

### Positive

1. **Fusion value on real sites is real** — where both architectures were
   healthy, attribution and passes were strong: books 71.4% (4/5), quotes
   83.3% (4/5), gutenberg 80% (4/4). Even degraded runs produced honest,
   grounded compositions rather than fabrications.
2. **Complementary perception quantified on real sites** — campaign-wide
   means over dashboard data: B sees ~180.9 elements/run vs A's ~8.2
   (**~22× element asymmetry** on Tier-2 heavy sites; Tier-1 measured 16×),
   yet A generates more executable tests (3.2 vs 0.9). Neither architecture
   alone predicts usefulness; the fusion layer is where the value lives.
3. **Autonomous issue discovery worked twice**:
   - **phptravels mirror** — the pipeline discovered, without human hints,
     that phptravels.com/demo serves demoblaze content (catalog page_keys +
     validator rejections referencing demoblaze URLs are deterministic
     proof). Now ruled MIRROR-EVIDENCE.
   - **Juice Shop `/ftp/legal.md` exposure** (Tier-1 carry-over, validated as
     a repeatable class): vision exploration finds security-relevant
     misconfigurations that DOM crawling cannot express.
   - **LambdaTest rebrand** — redirect lambdatest.com/selenium-playground →
     testmuai.com detected and verified (301, HTTP 200), converting a
     would-be wrong-site scandal into a documented site-migration finding.
4. **The guards fire in production, not just in tests** — run_165105
   rejection proved assertVisionStartUrls catches live contamination; the
   collector provenance filter closes the original mtime-stitching wound at
   the source.

### Negative

1. **Verification ceiling stands** — mutation study verdict unchanged:
   actions-work ≠ values-correct. Green checks remain weak evidence until
   assertion/value oracles exist (T503 spec).
2. **A-timeout denominator inflation** — the internal 900s A cap fired on
   mega-DOM sites (docs_python ×3, weatherspark, gutenberg re-runs) even with
   fresh quota. Every such run inflates fusion-% toward 100% by removing A's
   denominator contribution. Headline fusion percentages MUST be quoted with
   absolute FT pass rates.
3. **Provider pacing costs dominated wall time** — Groq TPM/TPD caps and the
   1000/day global ox-alpha pool forced pacing waits, killed four P1a
   re-runs outright (429 walls), and made every schedule dependent on the
   05:30 IST reset. Free-tier economics, not architecture, set campaign
   throughput (~8 sites/night).
4. **Concurrency remains the deepest systemic risk** — the incident cost a
   full night of Tier-2 data. The fix stack (single mutex, strict
   attribution, provenance filter, purity tooling) is now layered, but the
   underlying lesson is architectural: a testing tool that cannot identify
   which site its results belong to is worse than no tool.

---

## 5. PROBLEMS FACED & SOLUTIONS (Tier-2 era)

Tier-2-era defects continue the Tier-1 numbering (CAMPAIGN_EVALUATION §6).

| # | Symptom | Root cause | Fix | Verification |
|---|---|---|---|---|
| #20 | FT executor crashed `catalog is not defined` resolving behavior refs | Executor iterated the elements Map without binding CATALOG_INDEX | Iterate `CATALOG_INDEX.elements.values()` | Commit `85ab28f`; books/quotes/gutenberg runs clean post-fix |
| #21-class | S4 returned starved/no JSON on ox-alpha | reasoning=high consumed FUSION_MAX_TOKENS=1500 before emitting any JSON | `FUSION_LLM_REASONING=low` + `FUSION_MAX_TOKENS=4000` | books report §5: 0→3 accepted tests after fix; stable since |
| #22-class | Registered runs executed against wrong sites (F-01/F-02 CRITICAL) | Concurrent studies + newest-dir attribution + mtime-window folder stitching in runBoth.js | Strict `findRunDir` (birthtime+manifest match), `assertCatalogDomains`, `assertVisionStartUrls`, collector provenance filter, folder_purity tooling | Commits `53ed784`,`d299e8d`,`57e1ffc`; guards rejected live contamination (run_165105); cleared re-runs pass all guards |
| #23 | Literal null `page_key` recorded as catalog page (weatherspark re-run run_…_173233) | Catalog builder had no null-guard on `from_url` | Null-guard in S1 + skip unattributable observations | Commit `05baac6`; flagged by folder_purity, fixed same evening |
| Provider incident: ox-alpha pool drain | 4 P1a decontamination runs (092206/093928/095650/101411) hit 429 walls and timed out | 1000 req/day GLOBAL stealth-pool exhausted overnight | Quota-gated rerun driver; retry-after-reset policy; pacing env | PROJECT_HANDOFF §4; runs kept as evidence, none cited |
| Provider incident: Groq TPM/TPD starvation | A timeouts written up as quota death (books/quotes night runs) | Per-model free-tier buckets (8k TPM / 200k TPD) | 429 wait-and-retry layer honoring provider delay | lambdatest revision note: fresh-quota A-timeout on mega-DOM is a REAL finding distinct from starvation |
| Provider incident: EADDRINUSE storm | Vision service crashes reported downstream as transient ECONNRESET/PARTIAL | Fixed ports 5000–5004 + probe-then-spawn TOCTOU + stdio:'ignore' hiding child deaths | Documented (audit F-05); dynamic ports deferred to V2 | Audit evidence E5 from registered run_…_070918 |
| Coordination incident: run_165105 | Duplicate docs_python window contaminated by gutenberg artifact through SHARED vision/storage/outputs | Two concurrent T201 windows; shared outputs dir | assertVisionStartUrls rejection + sequential-only rule formalized; liveness-checked lock recommended | WINDOW2_INCIDENT file + board comms 19de50b |

---

## 6. WHERE WE STAND
**Clean-site count (FINAL, 2026-08-25 ~21:00 IST):**

| Category | Sites | Count |
|---|---|---|
| CLEAN (original run verified) | 11 books, 12 quotes | 2 |
| CLEARED-BY-RERUN (all guards green + purity PURE) | 14 docs_python, 15 gutenberg, 16 weatherspark, 17 sahitest, 18 the-internet, 20 openlibrary | 6 |
| SITE-MOVED-EVIDENCE (real-world change, correctly attributed) | 13 lambdatest→testmuai | 1 |
| MIRROR-EVIDENCE → cleared on re-run (site-issue finding stands) | 19 phptravels | 1 |

**All 10 Tier-2 sites now carry fully attributed, guard-verified evidence.**
8/10 re-runs or verifications passed all three attribution guards plus
folder_purity; no site remains QUARANTINED. phptravels keeps its
MIRROR-EVIDENCE annotation as an autonomous-discovery credit and should still
be swapped for a spare in the final dataset per TIER2_SITES.md policy.

**Honest scope statement.** Tier-2's original headline numbers ("70% FT pass,
fusion explodes on real sites") were built partly on wrong-site data and are
RETRACTED. What survives is stronger and weaker at the same time: every
number now traces to a specific manifest-verified run — FT aggregate across
the current registered runs of sites 11–20 is **27/40 PASS (67.5%)**, not the
originally claimed 70% — and the verified runs show harsher reality: A-timeouts
on mega-DOM sites, canvas blind spots, openlibrary's 0/7 honest-fail day. The
campaign's most important product turned out to be the failure itself: a
reproducible contamination class, five named guards built because of it, and
proof they catch live incidents. The system can now answer the question it
could not answer before: *which site do these results belong to?*

**What remains:** nothing blocking on T201. Aggregates regenerated by serial-A
(VISION_TEST_QUALITY + CAMPAIGN_EVALUATION via regen_ledger.js). Next gates:
T401 gate audit (inputs: this report, AUDIT_REPORT+ADDENDUM,
QUARANTINE_TIER2), then T301 Tier-3 launch — its re-run-side gate condition is
MET.

---
*Generated by serial-B (T601). Sources: extract_run.js output per current
registered run; docs/AUDIT_REPORT.md + ADDENDUM; testing/QUARANTINE_TIER2.md;
per-site reports in testing/site_reports/; git log commits cited inline.*
