# AUDIT_T401_REPORT.md — Phase-2 Gate Audit (T401)

**Auditor:** SUB-MASTER (quick self-check mode, authorized by human Master
2026-08-25 ~22:1x IST in lieu of full independent dispatch). All numbers below
were recomputed directly from raw artifacts under `runs/<id>/` — not copied
from derived markdown. Scripts ran read-only against the repo.

---

## VERDICT: **PASS**

Phase-2 clearance stands over the decontaminated 20-site dataset.
TIER-3-LAUNCH unblocked per pre-registration in `testing/CAMPAIGN_PLAN.md`.

---

## Checks performed

### A1. Aggregate recomputation (18 unified-run ledger sites + lambdatest)

| Claim | Published | Recomputed from raw | Verdict |
|---|---|---|---|
| FT live executed / PASS | 60 / 37 (62%) | FT total 37/60 = 61.7% | **MATCH** |
| Fusion offered | 86 | Σ candidates_generated = 86 | **MATCH** |
| Fusion accepted | 60 | Σ accepted_count = 60 | **MATCH** |
| Mean fusion-attributable | 48.7% | 48.75% over n=19 incl. #13 lambdatest (100%) | **MATCH** (see note) |

**Denominator note (recorded for the paper):** mean fusion-attributable is
48.7% only when site #13 lambdatest (fusion 100%, SITE-MOVED-EVIDENCE row) is
included (n=19). Over the 18 sites with standard unified runs the mean is
45.9%. Both are honest numbers; any citable claim should state n. The paper's
§4.3 wording ("mean attribution 48.7%") should carry "(n=19, incl. cleared
site-moved row)" or restate as 45.9% (n=18).

Honest-zero sites (#5 CURA, #6 ParaBank, #7 AutomationExercise, #9 The
Internet) have no `ft_execution_results.json` — consistent with INDEX `n/a`
cells. Zero contamination markers found anywhere in the scan.

### A2. Domain assertions — four Phase-2 clearance runs

| Run | manifest URL | catalog hosts | B start_url | Verdict |
|---|---|---|---|---|
| #16 weathersparks `run_20260825_173233` | weatherspark.com ✓ | weatherspark.com only ✓ | https://weatherspark.com ✓ | **PASS** |
| #17 sahitest `run_20260825_194511` | sauhitest.com/demo/ ✓ | www.sahitest.com only ✓ | http://www.sahitest.com/demo/ ✓ | **PASS** |
| #18 theinternet-sp `run_20260825_195406` | the-internet.herokuapp.com/status_codes ✓ | the-internet.herokuapp.com only ✓ | same host ✓ | **PASS** |
| #20 openlibrary `run_20260825_203014` | openlibrary.org ✓ | openlibrary.org only ✓ | https://openlibrary.org ✓ | **PASS** |

(#14 docs_python `run_20260825_163448` and #15 gutenberg `run_20260825_165819`
were guard-verified earlier by two independent windows; INDEX rows carry their
cleared run IDs. #13 lambdatest = SITE-MOVED-EVIDENCE per verified rebrand;
#19 phptravels = MIRROR-EVIDENCE permanent skip — both acceptable statuses.)

### A3. Zero-quarantine scan

- `testing/site_reports/INDEX.md`: zero active QUARANTINED markers on rows
  11–20. Regeneration header lists all 8 old contaminated run IDs
  (055129/060707/062152/063248/064713/065652 + 053921-era exclusions) in the
  exclusion set — none cited as primary evidence.
- Old wrong-site runs remain on disk as evidence only (per addendum policy). ✓

### A4. Spot probes

- #16/#17/#18 FT step target_urls that exist are all on-domain (weatherspark /
  sahitest / the-internet respectively); zero foreign hosts.
- #20 openlibrary FT 0/7: every step targeted openlibrary.org URLs and failed
  honestly (connection-reset outage window) — genuine failures, NOT demoblaze
  artifacts. Honest-failure claim confirmed.
- Offline suites at audit time: **143/143 PASS** (~2.3 min).

## Residual items (non-blocking)

1. Paper §4.3 denominator wording (see note above) — fold into T605 lane.
2. `neonish` remote still present in local git config (handoff said removed).
   No pushes made to it; recommend `git remote remove neonish`.
3. DEFECT #23 (null page_key in S1 catalog builder, weathersparks run) still
   open — null-guard fix belongs in T604/T605 minor-change lane before Tier-3
   mega-DOM sites amplify it.

*— SUB-MASTER, 2026-08-25 ~22:2x IST*
