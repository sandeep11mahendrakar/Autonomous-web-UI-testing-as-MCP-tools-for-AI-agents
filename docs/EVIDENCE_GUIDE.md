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

---

## f) Forensics walkthrough — how contaminated runs were caught and quarantined

This chapter is a worked example of the project auditing *itself*. In August
2025 an independent audit found that some published run folders contained
evidence from the **wrong websites**. Here is exactly what happened, how it was
detected using only the files on disk, and how you can re-trace every step.
Sources: `docs/AUDIT_REPORT.md` (+ its ADDENDUM) and
`testing/QUARANTINE_TIER2.md`.

### f-1. What went wrong, in one paragraph

Two studies were running at the same time on the same machine: the Tier-2
website campaign and some local-server test tooling. The tool that assembles a
run folder (`runBoth.js`) collects whatever artifact files are newest within a
time window — so when two processes finished near each other, it stitched
artifacts from **two different browser sessions into ONE run folder**. Worse,
some Architecture-B explorations had been pointed at local fixture servers
(`http://127.0.0.1:<port>/index.html`) instead of the live website. The
individual JSON files were all authentic sessions — nothing was doctored — but
the *folder composition* lied about which site they belonged to.

### f-2. How TWO explorations ended up in one folder (see it yourself)

Worked example: `runs/run_20260825_060707/` (published as Project Gutenberg,
site #15).

1. Open the folder `runs/run_20260825_060707/vision/outputs/` and list the
   `*_exploration_result.json` files. There are **two**, not one:
   - `run_1787618210405_exploration_result.json`
   - `run_1787618236369_exploration_result.json`
   Two different session IDs = two separate B explorations landed here.
2. Open each file and read its `"start_url"` field:
   - Session …210405: `"start_url": "http://127.0.0.1:50172/index.html"`
     ← a **local fixture server** on this machine, not Gutenberg.
   - Session …236369: `"start_url": "https://www.gutenberg.org"` ← genuine.
3. Now open `runs/run_20260825_060707/run_manifest.json` and read which URL
   the run *claims* to be about: `https://www.gutenberg.org`.

The mismatch between what the manifest claims and where exploration #1 actually
went is the whole finding. The same pattern (with different ports/hosts) shows
in `run_20260825_053921` (LambdaTest: fixture + genuine lambdatest.com) and
`run_20260825_062152` ("WeatherSpark": manifest+A = saucedemo.com while B
exploration #1 hit real weatherspark.com — a *real* session filed in the wrong
folder).

### f-3. The host-check method (how the audit proved it)

The ground truth needs no special tools — only comparing two hostnames:

| Artifact | Field to read | What it tells you |
|---|---|---|
| `runs/<id>/run_manifest.json` | `url` | which site the run *claims* to test |
| `runs/<id>/vision/outputs/*_exploration_result.json` | `start_url` | which site B *actually* explored |
| `runs/<id>/dom/memory_log.json` / `states.json` | visited URLs | which site A *actually* explored |
| `runs/<id>/fusion/ft_execution_results.json` | per-step target URLs | whether the final tests ran against the live site |

Rule applied by the auditor classifier: **any `localhost` / `127.0.0.1` /
foreign host ≠ manifest host ⇒ that artifact is dirty for that run.** One
nuance: for LambdaTest (#13), B exploring `testmuai.com` turned out to be
correct after all — the company rebranded LambdaTest's playground to TestMu AI
(verified via HTTP 301 redirect), so it is whitelisted.

Running this comparison over every INDEX row produced
`testing/QUARANTINE_TIER2.md` (generated by `testing/quarantine_audit.js`) —
the table listing each site, its run ID, verdict, and the exact offending
file. That table is machine-checked evidence, not opinion.

### f-4. What the quarantine correctly did NOT blame

Per the AUDIT_REPORT ADDENDUM's refined verdicts:

- **Sites 13–15**: the A-side explorations and the Fusion FT stage DID hit the
  live sites (live URLs verified in `ft_execution_results.json`). Only the
  B-side replay/quality numbers and any gap counts fed by the fixture
  exploration are untrustworthy. Quarantine stands anyway — conservative.
- **Sites 16–20**: fully confirmed contamination — even the A side explored the
  wrong site (e.g. "Open Library" 3/3 FT PASS actually clicked
  demoblaze.com/cart.html).
- **Sites 11–12** (Books, Quotes): independently re-confirmed clean.

### f-5. The fix, and how to verify a site is decontaminated today

Every re-run must now pass three guards before its folder is accepted
(codified in `testing/run_attribution.js`):

1. **Strict attribution** — run folder matched by manifest birthtime + URL,
   never "newest folder wins".
2. **assertVisionStartUrls** — every `vision/outputs/*exploration_result.json`
   must carry a `start_url` whose host equals the manifest URL host. This makes
   the f-2 stitch-up impossible to publish silently again.
3. **assertCatalogDomains** — every catalog `page_key` host ⊆ target host.

You can check any cleared/re-run site yourself: open its new run folder and
repeat the two reads from §f-2 (manifest URL vs each exploration result's
`start_url`). If they match, the folder contains exactly one story.

Quarantined rows may only leave QUARANTINED status with: (a) guard-passing
re-run, (b) domain assertion log, (c) report narrative rewritten solely from
the new run's artifacts — old numbers kept on disk as evidence of the failure
mode, never deleted.
