# RESEARCH DATA PACK — AI-Assisted Dual-Perception Web UI Testing

**Purpose:** single consolidated reference of every final number, table, and
finding in this project, each with its artifact path — formatted so an
external writer (human or AI) can produce the final paper without re-reading
raw artifacts.

**Rules honored** (per yzhao062/cs-paper-checklist discipline): every number
traces to a raw artifact; negative results are disclosed, not omitted; metrics
are defined at first use; nothing here is estimated.

**Last updated:** 2026-08-27 by W4/serial-D (T610; v1.1 post-freeze addendum below). Canonical ledgers:
`testing/site_reports/INDEX.md` (per-site), `testing/CAMPAIGN_EVALUATION.md`
(Tiers 1–2 aggregate), `testing/VISION_TEST_QUALITY.md` (vision rubric).

---

## 0. GLOSSARY (define before use)

- **Architecture A ("DOM")**: Playwright DOM extraction + LLM action loop → selector-grounded tests (`web/`)
- **Architecture B ("Vision")**: screenshot → YOLO11 ScreenParser + Tesseract OCR → visual DOM → coordinate-based tests with live target re-detection (`vision/`)
- **Fusion chain S1→S6**: S1 catalog build → S2 gap report → S4 grounded LLM synthesis → FT live execution → S6 dashboard (`fusion/`)
- **FT**: fused test — a fusion-generated test executed against the live site
- **STRONG / MEDIUM / WEAK**: verification-strength rubric. STRONG = any step verified input values / checked state / selected dropdown option / scroll position; MEDIUM = state change; WEAK = body-text heuristic. Single source of truth: `testing/vision_test_quality.js`
- **fusion-attributable %**: share of a site's final test suite created by the fusion layer (from `dashboard_data.json.headline.pct_final_tests_attributable_to_fusion`)
- **purity**: folder_purity.js verdict that a run directory contains only artifacts belonging to its manifest URL

---

## 1. CAMPAIGN SCOPE

| Tier | Sites | Window | Outcome |
|---|---|---|---|
| Tier 1 | 1–10 | 2026-08-23/24 | 9 scored + 1 BLOCKED (OpenCart bot-wall) |
| Tier 2 | 11–20 | 2026-08-25 | all cleared post-decontamination |
| Tier 3 | 21–30 | 2026-08-25/26 | 5 cleared (+1 thin-run honest), 6 blocked-honest, contamination-skips caught |
| D11 final batch | 31–35, 36–40 | 2026-08-26 | rows 31–35: 1 cleared + skips; rows 36–40: 4 cleared + 1 skip |

Total distinct sites processed: **40**. Success bar for Tier-3 (≥6/10 complete pipelines): **met**.

---

## 2. HEADLINE NUMBERS (Tiers 1–2, decontaminated ledger)

Source: `testing/CAMPAIGN_EVALUATION.md` regenerated 2026-08-25T15:16Z;
arithmetic gate-audited (docs/AUDIT_T401_REPORT.md).

```text
Sites attempted:              20
Sites scored:                 19        (OpenCart BLOCKED excluded by design)
Full A+B pipeline completed:  13
Fusion offered / accepted:    86 / 60   (all grounded)
Fusion live executed:         60
Fusion live PASS / FAIL:      37 / 23   (61.7% pass)
Mean fusion-attributable %:   48.7%     (n=19 incl. site-moved lambdatest row;
                                         n=18 denominator note recorded)
Novel targets exercised:      95
```

Vision quality rubric (`testing/VISION_TEST_QUALITY.md`, same regen):

```text
Executed: 62   Passed: 48 (77%)
STRONG 33 · MEDIUM 25 · WEAK 4
```

A-vs-B perception means over n=18 runs (`CAMPAIGN_EVALUATION.md` §3):
tests 2.7 vs 0.9 · states 7.8 vs 5.9 · elements seen 8.8 vs 170.6 (~19×) ·
behaviors 9.0 vs 6.0 · targets covered 5.4 vs 4.3.

---

## 3. PER-SITE RESULTS

### 3.1 Tiers 1–2 (sites 1–20)

Canonical: INDEX.md rows; full table reproduced in paper §3.1. Cleared-row
highlights:

| Site | Run ID | FT live | Fusion-attrib |
|---|---|---|---|
| SauceDemo | run_20260823_225906 | 2/3 | 37.5% |
| Demoblaze | run_20260824_001544 | 4/4 | 40% |
| GlobalSQA | run_20260824_095724 | 3/3 | 33.3% |
| Books to Scrape | run_20260825_131135 | 4/5 | 71.4% |
| Quotes to Scrape | run_20260825_131756 | 4/5 | 83.3% |
| LambdaTest (testmuai) | un_20260825_133122 | 4/5 | 100% |
| Python.org Docs | run_20260825_163448 | 1/8 | 88.9% |
| Project Gutenberg | run_20260825_165819 | 4/4 | 80% |
| WeatherSpark | run_20260825_173233 | 5/8 | 100% |
| SahiTest (re-run) | run_20260826_010716 | 3/3 | 60% |
| PHPTravels (re-run) | run_20260825_201027 | 5/6 | 60% |
| Open Library | run_20260826_203014* | 0/7 (net resets) | 87.5% |

\* INDEX lists `run_20260825_203014`. Honest-zero sites (fusion offered
nothing executable): CURA, ParaBank, Automation Exercise, The Internet.
Honest-failure classes on cleared sites: no_post_action_change ×3,
label_mismatch ×1 (validator refused mislabeled target),
selector_not_visible ×1 (idempotency proof), selector_readonly ×1.

### 3.2 Tier 3 (sites 21–30)

Cleared:

| Site | Run ID | FT live | Fusion-attrib |
|---|---|---|---|
| Wikipedia | run_20260825_230647 | 3/7 | 87.5% |
| GitHub Trending | run_20260825_232415 | 3/5 | 83.3% (S4 5/5 perfect round) |
| Hacker News | run_20260825_234052 | 1/8 | 100% (100% fusion-created) |
| Archive.org | run_20260825_235819 | honest zero | 0% |

Blocked-honest 6: stackoverflow (403), imdb (HTTP 202 bot-check), goodreads
(blank-render), npmjs (403), reddit (login-wall), magento (Cloudflare 526).
Contamination-skips: techlistic (DO-NOT-CITE), practica attempt-1 rejected.

### 3.3 D11 final batch (sites 31–35 + 36–40)

| # | Site | Run ID | FT live | Fusion-attrib |
|---|---|---|---|---|
| 33 | TodoMVC React | run_20260826_002227 | 3/3 | 30% |
| 32 | EvilTester (re-run) | run_20260826_005704 | 1/3 | 42.9% |
| 36 | Guru99 Bank | run_20260826_020711 | 4/8 | 66.7% |
| 37 | GlobalSQA Hub | un_20260826_023441 | 7/8 | 66.7% (17 novel targets) |
| 38 | Dynamic Loading 2 | run_20260826_022742 | 1/1 | 14.3% |
| 39 | The Internet: Tables | run_20260826_023111 | 1/1 | 14.3% |

Skips/blocked: #31 magento (Cloudflare 526, protocol still executed
purity-PURE), #34 techlistic DO-NOT-CITE, #35 practica attempt rejected,
#40 w3schools purity-FAIL (foreign globalsqa page_keys; report:
`w3schools_inputs_contaminated_2026-08-26.md`).

Tier-3 FT aggregate across cleared rows: 29 executed / 14 PASS (48%) for
rows 21–30 clears; D11 adds 13 executed / 12 PASS (92%).

---

## 4. KEY FINDINGS (each with evidence path)

1. **Weak-A/strong-fusion pattern** (Tier 3): where A's exploration budget
   expired pre-generation (wikipedia/github/hackernews), fusion composed
   suites at 83.3–100% attribution from B-side perception alone; hackernews's
   suite was 100% fusion-created. Evidence: INDEX tier-3 rows +
   `runs/run_20260825_234052/fusion/dashboard_data.json`.
2. **Perception asymmetry**: B sees ~19× more elements than A, but neither
   volume predicts usefulness (A leads behaviors/targets). Evidence:
   CE §3 n=18 means.
3. **Verification ceiling**: mutation study proves the system verifies
   actions-work, not values-correct — wrong_calc was fully exercised (FT 4/4
   PASS on the buggy cart) yet undetected. Production echo: eviltester
   no_post_action_change fails on live-probe-passing buttons. Evidence:
   `mutation/results/ANALYSIS.md`; eviltester INDEX row.
4. **Autonomous issue discovery**: Juice Shop public `/ftp` exposure;
   phptravels demoblaze mirror (reproduced deterministically via validator
   rejections on clean re-run run_20260825_201027); CURA readonly credential
   box; goodreads blank-render; magento Cloudflare 526. Evidence: CE §7 +
   per-site reports.
5. **Evaluation-integrity finding** (methodological): multi-agent evaluation
   pipelines sharing run directories suffer mtime-window stitching;
   adversarial audit caught it (docs/AUDIT_REPORT.md F-01/F-02), remediation
   (attribution guards + folder_purity) then caught 4+ further instances
   during Tier-3/D11 concurrent operations — zero contaminated rows published.
   Defect #24 guard fix @ commit `97a29cb`; minor fixes @ `0df6786`.
6. **D7 budget fix validated in production**: guru99 (#36) was the first run
   where A used its full extended budget productively (25 steps/20 states,
   3 grounded tests). Evidence: INDEX row 36.

---

## 5. HONEST LIMITATIONS (disclosed, not omitted)

- Verification ceiling: no assertion oracles; green ≠ correct (§ finding 3).
- Contamination incident: 5 wrong-site + 3 localhost-replay Tier-2 rows
  quarantined and re-cleared; residual guard gaps documented (defect #24).
- Provider pacing: Groq ~8k TPM, OpenRouter 1000 req/day free pools;
  exploration budgets were quota-driven. Token usage for Tier-1 not recorded.
- Single-run dominance except designated repeats; repeatability study exists
  but is methodology-contaminated (disclosed in testing/REPEATABILITY.md).
- Windows-leaning ops (taskkill tree-kill, bare python, hardcoded Tesseract
  path); cross-platform port assessed EASY-MEDIUM, deferred.
- bbc_news row 27 registered CONTAMINATION-EVIDENCE / DO-NOT-CITE (audit
  F7-01 CRITICAL — remediation pending before T402 freeze).
- D11 FT aggregate correction per audit F7-02: 13/18 = 72.2% (not 13/17).

---

## 6. DEFECT LEDGER (pipeline hardening)

Defects #1–#19: docs/AUDIT_REPORT.md §6 table. #20 behavior-ref executor
crash. #21 reasoning-token starvation → invalid JSON. #22 run-attribution
corruption mode (adversarial audit). #23 null page_key (fixed in s1 builder).
#24 collector provenance-guard scope gap (fixed @ `97a29cb`). Audit minor
fixes F3-03/F4-05 @ `0df6786`. Offline suites: **157/157 PASS**
(`node --test "test/*.test.js" "fusion/test/*.test.js" "web/test/*.test.js"`).

---

## 7. ARTIFACT MAP (where every number lives)

```
testing/site_reports/INDEX.md          one row per site (run IDs, FT, fus%)
testing/CAMPAIGN_EVALUATION.md         Tiers 1-2 aggregates (zero LLM, regen-able)
testing/VISION_TEST_QUALITY.md         vision rubric + per-test ledger
runs/<run_id>/run_manifest.json        statuses, timings
runs/<id>/dom/exploration_summary.json A-side totals/termination
runs/<id>/vision/outputs/*             B-side explorations/tests
runs/<id>/fusion/dashboard_data.json   headline, coverage matrix, execution
runs/<id>/fusion/ft_execution_results.json  per-step FT records
docs/AUDIT_REPORT.md                   adversarial audit + Tier-3 audits
docs/AUDIT_T401_REPORT.md              full-campaign gate audit
docs/RESEARCH_PAPER_DRAFT.md           v4 narrative (all numbers match this pack)
mutation/results/ANALYSIS.md           verification-ceiling study
```

Regeneration commands (deterministic, zero LLM):

```bash
node testing/vision_test_quality.js
node fusion/s8_campaign_eval.js
node --test "test/*.test.js" "fusion/test/*.test.js" "web/test/*.test.js"
```

---

## 11. POST-FREEZE ADDENDUM (v1.1, 2026-08-27)

Dataset frozen at git tag `campaign-v2-end` after the post-freeze re-audit
was signed off (zero open findings across five audit passes). Final census:
**40 sites = 39 numbered INDEX rows + 1 pre-campaign reference (DemoQA,
site #2)**. Dispositions: 29 cleared/scored, 7 blocked-honest, 4
DO-NOT-CITE contamination-evidence (bbc F7-01 retraction, techlistic,
practica, w3schools). D11 FT aggregate stands at the audited 13/18 = 72.2%.