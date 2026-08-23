# SITE TEST REPORT TEMPLATE

> Copy this file for every site test. Naming: `<sitename>_<YYYY-MM-DD>.md`
> (lowercase site name, no spaces). Register every report in `INDEX.md`.
> EVERY number must come from a real artifact file — never estimate.
> Asset paths are relative to the repo root.

---

## 1. Metadata

| Field | Value |
|---|---|
| Site | `<human name>` |
| URL | `https://...` |
| Test date | YYYY-MM-DD |
| Unified run ID | `run_YYYYMMDD_HHMMSS` |
| Run folder | `runs/<run_id>/` |
| LLM provider / model (A, B, Fusion) | e.g. openrouter / stealth/ox-alpha (reasoning=low) |
| Repo state | branch + HEAD + committed/uncommitted |
| Explorer | `<agent name>` |
| Report status | DRAFT / FINAL |

## 2. Verdict snapshot

| Stage | Status | Headline number | Artifact source |
|---|---|---|---|
| A exploration | ✅/⚠️/❌ | N steps / N states / N URLs | `runs/<id>/dom/exploration_summary.json` |
| A test generation | ✅/❌ | N grounded tests | `runs/<id>/dom/test_cases.json` |
| B exploration | ✅/⚠️/❌ | N steps / N states / N URLs | `runs/<id>/vision/outputs/*_exploration_result.json` |
| B test execution | ✅/❌ | pass/fail of replay suite | `runs/<id>/vision/outputs/execution_results.json` |
| S1 catalog | ✅/❌ | N obs → N elements / N behaviors / N pages | `runs/<id>/fusion/catalog.json` |
| S2 gap report | ✅/❌ | uncovered elements / behaviors / conflicts | `runs/<id>/fusion/gap_report.json` |
| S4 fusion synthesis | ✅/❌ | gaps offered → accepted / rejected, all grounded? | `runs/<id>/fusion/fusion_report.json` |
| FT live execution | ✅/❌ | N/N PASS | `runs/<id>/fusion/ft_execution_results.json` |
| S6 dashboard | ✅/❌ | % fusion-attributable | `runs/<id>/fusion/dashboard_data.json` |

One-paragraph verdict: did the full pipeline work end-to-end on this site?

## 3. Architecture results

### 3.1 Architecture A (DOM)
- Flow taken (pages in order), step counts, termination reason.
- Test cases generated: id + objective + steps count.
- Anomalies observed (loops, wrong fills, fallbacks used).

### 3.2 Architecture B (vision)
- States/steps, what it could and could not perceive (OCR quality notes).
- Generated tests + replay execution result with failure classification.

### 3.3 A/B comparison notes
What each architecture uniquely saw/did; conflicts worth noting.

## 4. SITE bugs detected

For each: symptom, which stage caught it, evidence path.
Also list known/seeded site bugs NOT caught and why (coverage gap).

## 5. PIPELINE bugs & fixes found during this test

For each: symptom → root cause → fix applied → files touched → verified how.
(If nothing was fixed during the run, say "none — clean run".)

## 6. Where the project lagged

Honest limitations observed on this site (perception, coverage, flakiness,
cost/time). Separate *product-of-design* limits from *defects*.

## 7. Metrics table

Fill real numbers only:

```
A: steps=_ states=_ urls=_ clicks=_ fills=_ errors=_
B: steps=_ states=_ urls=_ generated_tests=_ replay=_pass/_fail
S1: observations=_ elements=_ behaviors=_ pages=_ conflicts=_
S2: el common/_ a_only/_ b_only/_ uncovered=_ ; bh uncovered=_ ; conflicts=_
S4: offered=_ candidates=_ accepted=_ rejected=_ grounded=true/false
FT: total=_ passed=_ failed=_ steps _/_
Dashboard: total_tests=_ (A=_ B=_ fusion=_) ; pct_fusion=_%
Offline suites after run: _/_ PASS
Duration: A=_s B=_s S4 call=_s FT exec=_s
```

## 8. Asset index

| Asset | Path |
|---|---|
| Run manifest | `runs/<id>/run_manifest.json` |
| A memory log | `runs/<id>/dom/memory_log.json` |
| A states / transitions | `runs/<id>/dom/states.json`, `transitions.json` |
| A screenshots | `runs/<id>/dom/screenshots/` |
| A test cases | `runs/<id>/dom/test_cases.json` |
| B visual DOMs | `runs/<id>/vision/outputs/state_*_visual_dom.json` |
| B exploration history | `runs/<id>/vision/outputs/*_exploration_history.json` |
| B generated tests | `runs/<id>/vision/outputs/test_cases_*_exploration.json` |
| B execution results | `runs/<id>/vision/outputs/execution_results.json` |
| S1 catalog | `runs/<id>/fusion/catalog.json` |
| S2 gap report | `runs/<id>/fusion/gap_report.json` |
| S4 fusion tests / report | `runs/<id>/fusion/fusion_tests.json`, `fusion_report.json` |
| S4 raw LLM response | `runs/<id>/fusion/fusion_raw_response.txt` |
| FT execution results | `runs/<id>/fusion/ft_execution_results.json` |
| FT evidence screenshots | `runs/<id>/fusion/ft_execution_evidence/FT*/` |
| Dashboard (open in browser) | `runs/<id>/fusion/dashboard.html` |
| Dashboard data | `runs/<id>/fusion/dashboard_data.json` |

## 9. Recommendations for next runs

Concrete next actions (reruns, code changes, different limits).

## 10. Reproduction commands

```bash
node runBoth.js <url>
node fusion/s1_build_catalog.js <run_id>
node fusion/s2_gap_report.js <run_id>
node fusion/s4_fusion_synthesis.js <run_id>
node fusion/execute_fusion_tests.js <run_id>
node fusion/s6_dashboard.js <run_id>
```
