# EVIDENCE GUIDE — how to verify any project claim in minutes

_Audience: a non-coder (professor, reviewer, new teammate) with a file explorer
and a browser. No coding, no API keys, no test runs needed._
_All paths below were verified on disk on 2026-08-25. Repo root:_
`C:\Users\sandeep\pes\vs code\Capstone-Project`

Every number this project publishes comes from JSON files written automatically
during a run, plus screenshots. This guide shows you how to open them and check
claims yourself.

---

## 0. Where everything lives

```
runs/<run_id>/                  ← one folder per website exploration
├── run_manifest.json           ← which site, when, A/B success status
├── dom/                        ← Architecture A artifacts (DOM explorer)
│   ├── states.json, transitions.json, memory_log.json
│   ├── test_cases.json         ← tests A generated
│   └── screenshots/*.png       ← before/after evidence for every step
├── vision/                     ← Architecture B artifacts (screenshot pipeline)
│   ├── outputs/state_*_visual_dom.json   ← what the AI "saw" on screen
│   ├── outputs/test_cases_run_*.json     ← tests B generated
│   └── screenshots/run_*/state_*.png     ← the actual screenshots
└── fusion/                     ← merged layer
    ├── catalog.json            ← merged element/behavior catalog
    ├── gap_report.json         ← coverage gaps & conflicts
    ├── fusion_tests.json       ← LLM-synthesized tests + acceptance audit
    ├── ft_execution_results.json ← LIVE execution results (PASS/FAIL per step)
    ├── ft_execution_evidence/FT00X/*.png ← screenshot proof per executed test
    ├── dashboard_data.json     ← every dashboard number, machine-readable
    └── dashboard.html          ← double-click to open in any browser
```

Aggregate campaign documents: `testing/site_reports/INDEX.md` (one row per
site) and `testing/CAMPAIGN_EVALUATION.md` (auto-computed aggregate).

---

## a) Open a run's dashboard.html and read what each section proves

**Worked example:** `runs/run_20260825_025619/fusion/dashboard.html`
(Books to Scrape, 2026-08-25). Double-click it — it renders from `file://`,
no server needed.

| Dashboard section | What it proves |
|---|---|
| Headline / "final tests" | How many executable tests exist in total and who created each: Arch A, Arch B, or Fusion. In this example: 4 total = 0 A + 1 B + **3 Fusion → 75% fusion-attributable**. |
| Coverage matrix | Which catalog elements/behaviors each architecture exercised — proves the two architectures see different things (A works from DOM selectors, B from pixels+OCR). |
| Gaps & conflicts | The uncovered elements/conflicts Fusion was asked about — proves synthesis targets were *not* already covered. |
| Fusion section | Tests offered by the LLM, accepted after grounding validation, and rejected (with reasons) — proves there is an honest rejection audit, not cherry-picking. |
| Execution | Live PASS/FAIL per step with verification method (`url_change`, `input_value`, …) and weak-verification count — proves tests were actually run against the live site, and that weak checks are flagged instead of hidden. |

Every number you see has a matching field in the sibling
`dashboard_data.json` (see next section).

---

## b) Trace one number — e.g. the Books-to-Scrape "75% fusion" claim

`testing/site_reports/INDEX.md`, row 11 says Books to Scrape =
**Fusion-attributable 75%**, run ID `run_20260825_025619`. Verify it in 4 steps:

1. **Open** `runs/run_20260825_025619/fusion/dashboard_data.json` and find the
   `"headline"` object:
   ```json
   "total_final_tests": 4,
   "tests_from_architecture_a": 0,
   "tests_from_architecture_b": 1,
   "tests_fusion_created": 3,
   "pct_final_tests_attributable_to_fusion": 75
   ```
   The math: 3 ÷ 4 = 75%. It even lists its own sources.

2. **Count the raw tests yourself:**
   - A's tests: `runs/run_20260825_025619/dom/test_cases.json` → contains **0**
     test cases.
   - B's tests: `runs/run_20260825_025619/vision/outputs/test_cases_run_1787606784830_exploration.json`
     → contains **1** test case.
   - Fusion tests: `runs/run_20260825_025619/fusion/fusion_tests.json` →
     **3 accepted** tests (FT001–FT003), plus 1 rejected candidate with its
     rejection reason recorded (`action_mismatch`). Total = 0+1+3 = 4 ✓

3. **Confirm they really ran:** open
   `runs/run_20260825_025619/fusion/ft_execution_results.json` →
   `"summary": { "total": 3, "passed": 3, "failed": 0 }`.

4. **Cross-check the aggregate:** `testing/CAMPAIGN_EVALUATION.md` computes its
   means from these same per-run files via `fusion/s8_campaign_eval.js`
   (deterministic, zero LLM) — no hand-typed numbers anywhere in the chain.

> Note: the campaign-wide headline "Mean fusion-attributable %: 41.2%" in
> CAMPAIGN_EVALUATION.md is the mean over all scored sites; individual sites
> range from 0% to 100%. Always trace a *specific site* through its own run
> folder as above.

---

## c) Visually verify a Vision element detection

Claim: *"Architecture B detects on-screen elements from screenshots using
YOLO + OCR."* Proof: pick a state file and match it against its screenshot.

**Worked example:** run `run_20260825_133122`:

1. Open `runs/run_20260825_133122/vision/screenshots/run_1787644886789/state_001_initial.png`
   — this is the raw page screenshot the AI was given.
2. Open `runs/run_20260825_133122/vision/outputs/state_001_initial_visual_dom.json`.
   Each element records **what type it thinks it is, what text OCR read, where
   it is on screen, and how confident it is**:
   ```json
   {
     "id": "elem-0", "type": "link", "yolo_label": "Link",
     "text": "iFrame Demo",
     "bbox": { "x1": 649.4, "y1": 455.3, "x2": 732.8, "y2": 473.8 },
     "confidence": { "yolo": 0.718, "ocr": 94, "combined": 0.675 }
   }
   ```
3. Check by eye: in the screenshot, ~650 px from the left and ~455 px from the
   top there should be a link reading **"iFrame Demo"**. The bounding box
   (`bbox`) frames exactly those words. Repeat for 2–3 more elements —
   e.g. `"text": "Nested Frames"` at y≈545.
4. Pairing rule: every `vision/outputs/state_XXX_*.json` matches
   `vision/screenshots/<run_id>/state_XXX_*.png` with the same state name.
   Files ending `_merged.png` show detections drawn onto the image, if present.

This also lets you audit honest failures: if `confidence.combined` is low or
the text looks garbled, that is exactly the OCR-variance limitation the reports
disclose.

---

## d) Watch a Fusion test FAIL honestly

The project never hides failures. Worked example — run
`run_20260825_064713` (The Internet, status-codes page), where FT001 FAILED:

1. Open `runs/run_20260825_064713/fusion/ft_execution_results.json`. Find
   `results[0]` (`test_id: "FT001"`, `"status": "FAIL"`) and look at its step:
   - `"failure_stage": "label_mismatch"`
   - `"detail"`: live label did not match the catalog label — the executor
     re-checked the target against the live page before clicking and refused
     to proceed on mismatch.
2. Open the failure evidence screenshot named in the record:
   `"final_screenshot": "fusion/ft_execution_evidence/FT001/01_final.png"`
   i.e. `runs/run_20260825_064713/fusion/ft_execution_evidence/FT001/01_final.png`.
   The image shows the page state at the moment of failure.
3. Cross-check the dashboard: `runs/run_20260825_064713/fusion/dashboard.html`
   shows the same FAIL with its classification — nothing was silently dropped.
4. Every failure carries a stage/class from a fixed taxonomy
   (`fusion_generation | catalog_grounding | target_resolution |
   browser_execution | semantic_verification` in earlier stages;
   `selector_not_found | label_mismatch | navigation_failed | fill_threw` at
   step level), so failures are diagnosable, not just "red".

More honest-failure examples: `run_20260825_063248` (0/2 FAIL),
`run_20260825_062152` (canvas blind spot, 1/3 PASS).

---

## e) Five-minute audit checklist (anyone can follow)

Pick any site row in `testing/site_reports/INDEX.md`, note its Run ID, then:

- [ ] **1. Manifest exists:** `runs/<run_id>/run_manifest.json` opens and names
      the right URL and date. *(A/B exploration statuses are recorded here too.)*
- [ ] **2. Dashboard renders:** double-click
      `runs/<run_id>/fusion/dashboard.html` — sections render, no console/server.
- [ ] **3. Spot-check one headline number** in
      `runs/<run_id>/fusion/dashboard_data.json` (e.g.
      `headline.pct_final_tests_attributable_to_fusion`) and recount it from
      `dom/test_cases.json` + `vision/outputs/test_cases_*.json` +
      `fusion/fusion_tests.json` (§b above).
- [ ] **4. Match one Vision element to pixels** (§c): bbox in a
      `state_*_visual_dom.json` lands on the same words in the paired PNG.
- [ ] **5. If the INDEX row shows a FAIL**, open
      `fusion/ft_execution_results.json`, find the failing `test_id`, read its
      `failure_stage`, and open its `ft_execution_evidence/<test_id>/*.png`
      screenshot (§d).
- [ ] **6. Consistency:** the INDEX row's numbers match what you counted —
      campaign rules forbid estimating; numbers must come from these artifacts.

If all six boxes tick for your sampled run, the claim chain
(raw artifact → dashboard → report → aggregate) holds for that site.
