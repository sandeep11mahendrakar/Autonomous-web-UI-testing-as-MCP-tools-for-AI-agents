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

### Final scoreboard (all registered rows)

| # | Site | Verdict | FT live | Fusion-attributable |
|---|---|---|---|---|
| 1 | SauceDemo | CLEARED | 2/3 | 37.5% |
| 3 | BrowserStack Demo | CLEARED | 0/1 | 14.3% |
| 4 | Demoblaze | CLEARED | 4/4 | 40% |
| 5 | CURA Healthcare | CLEARED | n/a | 0% |
| 6 | Parasoft ParaBank | CLEARED | n/a (honest zero) | 0% |
| 7 | Automation Exercise | CLEARED | n/a | 0% |
| 8 | OpenCart Demo | BLOCKED-honest | — | — | <sub>no executable tests</sub>
| 9 | The Internet (Heroku) | CLEARED | n/a | 0% |
| 10 | OWASP Juice Shop | CLEARED | 0/1 | 16.7% |
| 11 | Books to Scrape | CLEARED | 4/5 | 71.4% |
| 12 | Quotes to Scrape | CLEARED | 4/5 | 83.3% |
| 13 | LambdaTest Playground | CLEARED | 4/5 | 100% |
| 14 | Python.org Docs | CLEARED | 1/8 | 88.9% |
| 15 | Project Gutenberg | CLEARED | 4/4 | 80% |
| 16 | WeatherSpark | CLEARED | 5/8 | 100% |
| 17 | SahiTest Demo | CLEARED | 3/3 | 60% |
| 18 | The Internet (status codes) | CLEARED | 4/4 | 80% |
| 19 | PHPTravels Demo | CLEARED | 5/6 | 60% |
| 20 | Open Library | CLEARED | 0/7 | 87.5% |
| 22 | StackOverflow Questions | BLOCKED-honest | - | — |
| 24 | IMDb Chart Top | BLOCKED-honest | - | — |
| 29 | npmjs Packages | BLOCKED-honest | - | — |
| 21 | Wikipedia (Web testing) | CLEARED | 3/7 | 87.5% |
| 23 | GitHub Trending | CLEARED | 3/5 | 83.3% |
| 26 | Hacker News | CLEARED | 1/8 | 100% |
| 27 | 🚫 BBC News | DO-NOT-CITE | - | — | <sub>contaminated folder — evidence only</sub>
| 32 | EvilTester Test Pages | CLEARED | 1/3 | 42.9% |
| 35 | Practice Test Automation | CLEARED | - | — |
| 37 | GlobalSQA Example Pages Hub | CLEARED | 7/8 | 66.7% |
| 28 | Archive.org (Internet Archive) | CLEARED | ➖ not executable (no fusion tests) | 0% |
| 25 | Goodreads Lists | BLOCKED-honest | - | — |
| 30 | Reddit Public (old.reddit) | BLOCKED-honest | - | — |
| 31 | Magento Luma (softwaretestingboard) | BLOCKED-honest | - | — |
| 33 | TodoMVC React (TS) | CLEARED | 3/3 | 30% |
| 34 | Techlistic (Selenium practice) | DO-NOT-CITE | - | — | <sub>contaminated folder — evidence only</sub>
| 36 | Guru99 Bank demo | CLEARED | 4/8 | 66.7% |
| 38 | Dynamic Loading Example 2 | CLEARED | 1/1 | 14.3% |
| 39 | The Internet: Tables | BLOCKED-honest | 1/1 | 14.3% |
| 40 | W3Schools <input> reference | BLOCKED-honest | - | — |

_Verdicts: CLEARED = guard-passing run on-target; BLOCKED-honest = environment/bot-wall recorded without quota burn; MIRROR-EVIDENCE / DO-NOT-CITE = see QUARANTINE_TIER2.md. Rows without FT data are exploration-only or exploration-thin runs._

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
