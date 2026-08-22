# Vision Architecture — FINAL Project Context

This document is the authoritative handoff for the Vision Architecture (Architecture B)
of the Capstone Project. Updated after FINAL TECHNICAL VALIDATION on 2026-08-22.
All metrics below are measured from actual pipeline runs and saved result files.

---

## 1. PROJECT IDENTITY

- **Active working repository:** `C:\Users\sandeep\pes\vs code\Capstone-Project`
- **Remote URL:** `https://github.com/Neonishh/Capstone-Project.git`
- **Delivery branch:** `vision-architecture-final` (created from local `main`; do all Vision work here)
- **Final Vision commit:** see §16 GIT CHECKPOINT

### Two local clones — IMPORTANT

| Path | Role |
|------|------|
| `C:\Users\sandeep\pes\vs code\Capstone-Project` | **ACTIVE / CORRECT** — contains the current Vision implementation |
| `C:\Users\sandeep\pes\CAPSTONE\Capstone-Project` | **OLDER COPY** — do not use |

---

## 2. CAPSTONE OVERVIEW

The Capstone project is **"AI-Assisted Test Case Generation for Mobile and Web UI/UX
Applications"** by team 101 at PES University.

### Architecture A — DOM + Memory Log (text-based LLM)
Playwright extracts DOM elements; a text LLM generates selector-based action plans.
Implemented in `web/`. Independent of Architecture B.

### Architecture B — Vision Architecture ← this document
Screenshot → ScreenParser YOLO UI detection → Tesseract OCR → merge into a visual DOM
→ Groq LLM generates coordinate-based test cases → permanent Playwright executor runs
them via pixel coordinates only. Implemented in `vision/`.

---

## 3. ARCHITECTURE (FINAL)

```
Website URL
    ↓
[browser-service]  :5004  screenshot PNG (1280×900, headless Chromium)
    ↓ (parallel)
[yolo-service]     :5001  ScreenParser UI detections (bounding boxes + labels)
[ocr-service]      :5002  Tesseract words with bounding boxes
    ↓
[merge-service]    :5003  visual DOM JSON
    ↓
[gateway]          :5000  /vision/process, /vision/generate-tests
    ↓
[src/testGenerator.js] → prompt built by [src/visualDom.js]
    ↓
[src/llm.js]       Groq openai/gpt-oss-120b
    ↓
test_cases_*.json  (coordinate-based test cases)
    ↓
[src/executeTests.js]  permanent Playwright executor
    ↓
execution_results*.json
```

One-shot runner: `node runVision.js <url>` (spawns all services, generates tests,
shuts down via Windows-safe process-tree kill).

Permanent executor:
```
node src/executeTests.js <test_cases.json> <base_url> [output_path]
```

### Test-case schema (final)
```json
{
  "id": "TC01",
  "objective": "...",
  "evidence": ["visual facts used"],
  "inferred_behavior": "LLM hypothesis (may be wrong)",
  "steps": [{ "action": "click|fill|navigate", "x": N, "y": N, "value": "..." }],
  "expected_result": "runtime-verifiable outcome",
  "expect_navigation": false,
  "expected_text": null
}
```
`evidence` / `inferred_behavior` separate observable facts from hypotheses.
`expect_navigation` is honored by the executor (falls back to text heuristic for old files).
Schema remains backward compatible with earlier generated files.

### Executor verification heuristics
- `expect_navigation: true` (or legacy URL-change text) → PASS iff URL changed
- otherwise → PASS iff rendered body text > 100 chars
- unexpected mid-test navigation → warning, not failure
- optional `expected_text` miss → warning, not failure
- per-test isolation (fresh page each test), single browser, guaranteed shutdown,
  one failed test does not stop the suite

---

## 4. MODEL & CONFIGURATION (FINAL)

- **Model:** `docling-project/ScreenParser` (YOLO11-L, 55 UI classes, ~146 MB)
- **Local file:** `vision/services/yolo-service/screenparser_best.pt` (gitignored;
  re-download from Hugging Face if missing)
- **Config (.env):** `YOLO_MODEL_PATH=screenparser_best.pt`, `YOLO_CONF=0.15`,
  `YOLO_IMGSZ=640`
- OCR: Tesseract, `OCR_MIN_CONF=40`
- LLM: Groq `openai/gpt-oss-120b`, generation budget max(GROQ_MAX_TOKENS, 3000),
  temperature 0.2

---

## 5. FINAL VALIDATION RESULTS (all measured 2026-08-22)

Result files in `vision/storage/outputs/`:

| Page | Result file | YOLO | OCR words | Merged | Gen | Exec | Pass | Fail | Rate | Runtime |
|------|-------------|------|-----------|--------|-----|------|------|------|------|---------|
| DemoQA homepage | execution_results_home_v2.json | 31 | 37 | 31 | 8 | 8 | 8 | 0 | 100% | 20.6s |
| DemoQA Forms | execution_results_forms_v2.json | 57 | 65 | 57 | 8 | 8 | 7 | 1 | 87.5% | 21.3s |
| DemoQA Elements | execution_results_elements.json | 24 | 40 | 24 | 7 | 7 | 5 | 2 | 71.4% | 17.5s |
| DemoQA Widgets | execution_results_widgets.json | 21 | 31 | 21 | 9 | 9 | 8 | 1 | 88.9% | 21.1s |
| DemoQA Alerts/Frame&Windows | execution_results_alerts.json | 19 | 34 | 19 | 7 | 7 | 4 | 3 | 57.1% | 21.2s |
| DemoQA Interactions | execution_results_interactions.json | 15 | 29 | 15 | 6 | 6 | 3 | 3 | 50.0% | 15.4s |
| **TOTAL** | | | | | **45** | **45** | **35** | **10** | **77.8%** | |

### Failure analysis — every failure has ONE root cause

All 10 failures across 6 pages are the same category:
**ScreenParser low-confidence misclassification of non-navigational banner/footer
text fragments as `Link`.** The recurring offenders are `"practice."` (ad banner,
conf 0.57–0.61) and footer fragments `"RIGHTS"` (conf 0.26–0.43) /
`"RESERVED."` (conf 0.33–0.36). Because they ARE detected as links, the LLM
correctly applies its link rule and sets `expect_navigation: true`; at runtime these
elements never navigate, so the executor honestly reports FAIL.

Attribution check performed per failure:
- LLM generation: correct — followed stated evidence rules, cited element ids/confidence
- Executor: correct — assertion matched the declared expectation
- OCR / merge / coordinate mapping: not implicated (text and coordinates were accurate)
- Root cause: ScreenParser detection + inherently ambiguous UI

No failures were caused by carousel/animation issues anymore (fixed by the
evidence-based prompt rules). No executor crashes or suite aborts occurred.

---

## 6. WHAT IS COMPLETE ✅

- All 5 microservices + gateway implemented and stable
- ScreenParser integrated; COCO YOLOv8n fully removed
- Evidence-based LLM prompt (observable facts vs inferred behavior vs runtime checks;
  conservative button rules; link rules; animated-content rules; explicit
  "never infer a navigation target not present in evidence")
- Permanent coordinate-based executor (`src/executeTests.js`) committed
- Generation retry + larger generation token budget (truncated-response bug fixed)
- Windows-safe service shutdown (process-tree kill) in `runVision.js`
- Validation across **6 pages** with recorded metrics (see §5)
- Secrets untracked; `.env.example` maintained; README updated

## OPTIONAL FUTURE IMPROVEMENTS (not required)

- Suppress/filter known banner-footer pseudo-links (e.g. drop detections matching
  `practice.|RIGHTS|RESERVED.` or conf<0.65 Link detections in header/footer bands)
  — would lift pass rate but was deliberately NOT done to avoid overfitting
- Modal/dropdown-aware executor verification beyond body-text heuristic
- NMS tuning for duplicate nested detections
- Multi-page crawling/exploration
- Arch A vs Arch B comparison metrics; unit tests for merge logic
- Cleanup of stale temp_screenshots/outputs

## KNOWN LIMITATIONS

1. ScreenParser occasionally labels decorative/banner/footer text as interactive
   elements (Link/Button) at moderate confidence — the sole remaining failure cause.
2. Verification heuristics remain simple (URL-change + body-text length).
3. Detection of very small controls can be missed at conf 0.15 threshold.
4. Ports must be free before runs; `runVision.js` now kills its own process tree,
   but externally started services still occupy ports until killed manually.

---

## 16. GIT CHECKPOINT (FINAL)

- **Delivery branch:** `vision-architecture-final` (pushed to origin)
- **Branch contains:** permanent executor commit, evidence-based prompt/generation
  fixes, final reliability fixes, and this updated context file
- **Model file gitignored** — re-download `screenparser_best.pt` after fresh clone
- **Secrets live in `vision/.env`** (untracked). Never commit it.

## TRAPS TO REMEMBER

1. Two local clones exist — use ONLY the `vs code` clone.
2. Playwright Chromium must be installed separately (`npx playwright install chromium`).
3. Kill leftover processes on ports 5000–5004 before manual service starts.
4. Do not cross-wire Architecture A (`web/`) with Architecture B (`vision/`);
   keep `vision/src/llm.js` separate from `web/src/llmClient.js`.
5. Do not revert ScreenParser to COCO YOLOv8n; do not switch back to CSS selectors.
