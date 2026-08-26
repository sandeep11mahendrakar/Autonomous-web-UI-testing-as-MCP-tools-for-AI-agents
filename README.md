# AI-Assisted Test Case Generation for Web UI

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-capstone%20final-brightgreen)

Two autonomous agents explore websites and a fusion layer merges their
findings into grounded, live-executed test cases. Team 101, PES University.

## Architecture

| Component | What it does |
|---|---|
| **Architecture A** (`web/`) | Playwright DOM extraction → state-machine exploration → selector-grounded test generation |
| **Architecture B** (`vision/`) | Screenshot → YOLO ScreenParser + OCR → visual DOM → coordinate-based tests |
| **Fusion** (`fusion/`) | S1 catalog → S2 gap report → S4 grounded LLM synthesis → FT live execution → S6 dashboard |
| **Campaign** (`testing/`) | 40-site evaluation harness with run-attribution guards and folder-purity gates |

The two architectures never share a perception space (A sees selectors, B sees
pixels — element overlap stays near zero), which is exactly why merging them
finds workflows neither could compose alone.

## Results (40-site campaign, 2026-08)

Fusion-attributable coverage by site:

![Fusion attribution by site](docs/artifacts/fusion_attribution_by_site.svg)

Live fusion-test pass rates:

![FT pass rates](docs/artifacts/ft_pass_rates.svg)

Verification-strength rubric (STRONG / MEDIUM / WEAK):

![Quality rubric](docs/artifacts/quality_rubric.svg)

Perception asymmetry — what each architecture alone sees:

![Perception asymmetry](docs/artifacts/perception_asymmetry.svg)

Key findings: fusion value grows with site realism; B sees ~16–22× more
elements than A while A generates more executable tests; the system verifies
that actions work, not that values are correct (proven by seeded-bug mutation
study) — assertion oracles are the top future item. Full data:
`testing/TIER2_MEGA_REPORT.md`, `testing/TIER3_MEGA_REPORT.md`,
`testing/D11_FINAL_BATCH_MEGA_REPORT.md`, `testing/CAMPAIGN_EVALUATION.md`.

## Quickstart

Prerequisites: **Node.js 18+**, Python 3.10+ with the vision requirements,
and LLM API keys in `vision/.env` (never committed).

```bash
# 1. Run both architectures against any URL
node runBoth.js https://your-target-site.com

# 2. Build the fusion chain on the attributed run
node fusion/s1_build_catalog.js <run_id>
node fusion/s2_gap_report.js     <run_id>
node fusion/s4_fusion_synthesis.js <run_id>
node fusion/execute_fusion_tests.js <run_id>
node fusion/s6_dashboard.js       <run_id>

# 3. Open the dashboard
runs/<run_id>/fusion/dashboard.html
```

Run the offline test suites:

```bash
node --test "test/*.test.js" "fusion/test/*.test.js" "web/test/*.test.js"
```

> **Note:** every run folder carries a purity gate (`testing/folder_purity.js`)
> proving its artifacts belong to the requested site. Runs that fail the gate
> are kept as evidence and excluded from all reported numbers.

## License

[MIT](LICENSE) © Team 101, PES University, 2026
