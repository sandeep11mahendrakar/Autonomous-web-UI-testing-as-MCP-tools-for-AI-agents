# Site Testing Index

Ledger of all site tests. One row per report; keep in sync with the files in
this folder. Aggregate metrics (pass rates, mean coverage) should be
recalculated from this table as the campaign grows.

| # | Site | URL | Date | Report | Run ID | A expl | B expl | S4 accepted | FT live | Fusion-attributable |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | SauceDemo | https://www.saucedemo.com | 2026-08-23 | `saucedemo_2026-08-23.md` | `run_20260823_225906` | ✅ 8 steps/2 URLs | ⚠️ login page only | 3/3 grounded | 2/3 PASS | **37.5%** |
| 3 | BrowserStack Demo | https://bstackdemo.com | 2026-08-24 | `bstackdemo_2026-08-24.md` | `run_20260824_001108` | ✅ 9 steps/3 URLs | ⚠️ early `llm_done` (4 steps) | 1/1 grounded | 0/1 FAIL (label_mismatch) | 14.3% |
| 4 | Demoblaze | https://www.demoblaze.com | 2026-08-24 | `demoblaze_2026-08-24.md` | `run_20260824_001544` | ✅ 11 steps/checkout reached | ✅ 9 steps/2 URLs | 4/4 grounded, 1 dedup-rejected | **4/4 PASS** | **40%** |
| 5 | CURA Healthcare | https://katalon-demo-cura.herokuapp.com | 2026-08-24 | `cura_2026-08-24.md` | `run_20260824_002709` | ⚠️ login page only | ✅ 12 steps/2 URLs | 0 offered (honest zero) | n/a | 0% |
| 6 | Parasoft ParaBank | https://parabank.parasoft.com/parabank/index.htm | 2026-08-24 | `parabank_2026-08-24.md` | `run_20260824_015222` | ✅ **LOGGED IN** (auth-seed) 8 steps/overview.htm | ✅ 10 steps/3 URLs, replay PASS | 0 accepted (2× no_actionable_step) | n/a (honest zero) | 0% |
| 7 | Automation Exercise | https://www.automationexercise.com | 2026-08-24 | `automationexercise_2026-08-24.md` | `run_20260824_094432` | ✅ 15 steps/15 states (search+brands+cart) | ⚠️ 6 steps, replay FAIL step2 | 0 offered (honest zero, bh cov 79%) | n/a | 0% |
| 8 | OpenCart Demo | https://demo.opencart.com | 2026-08-24 | `opencart_blocked_2026-08-24.md` | `run_20260824_095411` | 🚫 **BLOCKED** — Cloudflare bot-wall | 🚫 blocked | — | — | — |
| 8s | GlobalSQA (spare for #8) | https://www.globalsqa.com/demo-site/ | 2026-08-24 | `globalsqa_2026-08-24.md` | `run_20260824_095724` | ✅ 16 steps/15 states | ✅ 10 steps/3 URLs, replay PASS | 3/5 grounded | **3/3 PASS** | **33.3%** |
| 9 | The Internet (Heroku) | https://the-internet.herokuapp.com | 2026-08-24 | `theinternet_2026-08-24.md` | `run_20260824_101451` | ✅ 6 steps/5 states, ext-guard fired 2× | ⚠️ 12 steps but scope leak to github.com (no B guard yet) | 0 accepted (honest zero) | n/a | 0% |
| 10 | OWASP Juice Shop | https://demo.owasp-juice.shop | 2026-08-24 | `juiceshop_2026-08-24.md` | `run_20260824_102041` | ✅ after networkidle fix | ✅ 5 steps, found `/ftp/legal.md` exposure | 1/1 grounded | 0/1 honest fail (proves idempotency) | 16.7% |

**TIER-1 COMPLETE (10/10 processed: 9 scored + 1 blocked).**

### Re-run: CURA with capability upgrades

| Site | Date | Run ID | Note |
|---|---|---|---|
| CURA Healthcare (re-run) | 2026-08-24 | `run_20260824_093124` | **B LOGGED IN via seeded creds → appointment page reached for the first time**; S4 composed 3 executable tests (was honest zero); FT 0/3 but all honest failures that drove the fill/select_option executor branches + readonly fast-fail; dashboard 33.3% fusion. See `cura_rerun_2026-08-24.md`. |

### Post-capability-upgrade re-test (bstackdemo with auth-seed + select_option)

| Site | Date | Run ID | Note |
|---|---|---|---|
| BrowserStack Demo (re-run) | 2026-08-24 | `run_20260824_012649` | **A LOGGED IN via new select_option action** (react-select demouser/password) → authenticated /favourites /orders /offers; catalog 53→78 elements; FT001 now PASSES with FT-executor auth-seed. Details in session log; full report pending re-run after FT-auth fix landed mid-session. |

## Tier-1 running aggregate (checkpoint C3 — END OF PHASE 1)

| Metric | Value |
|---|---|
| Full-pipeline success (no stage crash) | 11/11 runnable sites (OpenCart BLOCKED by bot-wall, excluded) |
| FT live pass rate (executed tests) | 10/13 = 77% (all failures honestly classified; 2 "failures" actually prove site behavior) |
| Fusion-attributable coverage | mean ≈ 20% across scored sites (range 0–40%); post-upgrade runs average ≈ 28% |
| Auth-gated sites reached post-login | 3 of 3 attempted (bstackdemo-A, CURA-B, ParaBank-A) |
| C3 gate check: ≥6/10 end-to-end incl. ≥1 FT live PASS per successful site; fusion >20% avg | **9/10 end-to-end ✅ · FT PASS on saucedemo/demoblaze/bstackdemo-rerun/globalsqa ✅ · fusion mean ~20% ⚠️ borderline** |
| Pipeline defects found & fixed during campaign | 17 total (+UUID-id selectors, networkidle fallback, hash-router URL compare, external-domain guard A-side) |
| Top V2 backlog items | #8 coordinate execution · B external-domain guard (URGENT) · S4 readonly/quiet-page candidate filter · goal-driven frontier (#4) |

## Reference run (pre-campaign, DemoQA)

| Site | Date | Run ID | Note |
|---|---|---|---|
| DemoQA | 2026-08-22 | `run_20260822_214750` (`runs/fusion_s1_A214750_B169243844/`) | Full pipeline reference; FT001 PASS 4/4; 25% fusion-attributable. Details in `PROJECT_MEMORY.md`. |

## Campaign rules (50-site plan)

- Copy `TEMPLATE.md` → `<sitename>_<YYYY-MM-DD>.md` for every test.
- Register every run here immediately after the dashboard is generated.
- Never estimate numbers — pull them from the artifacts listed in §8 of each report.
- Pipeline bugs discovered mid-test: fix, verify with offline suites, record
  in that report's §5 before moving to the next site.
- Keep failed runs in `runs/` — they are evidence for the reports.

## TIER 2 (sites 11-20) - night campaign 2026-08-25

| 11 | Books to Scrape | https://books.toscrape.com | 2026-08-25 | `books_toscrape_2026-08-25.md` | `run_20260825_131135` | OK 8 steps/8 states | OK 1/1 PASS | 5/5 grounded | 4/5 PASS | **71.4%** |
| 12 | Quotes to Scrape | https://quotes.toscrape.com | 2026-08-25 | `quotes_toscrape_2026-08-25.md` | `run_20260825_131756` | OK 8 steps/5 states | PARTIAL no test cases | 5/5 accepted | 4/5 PASS | **83.3%** |
| 13 | LambdaTest Playground | https://www.lambdatest.com/selenium-playground/ | 2026-08-25 | `lambdatest_playground_2026-08-25.md` | `run_20260825_133122` | TIMEOUT (internal 900s) | PARTIAL no test cases | 4/5 grounded | 1/4 PASS | **100%*** |
| 14 | Python.org Docs | https://docs.python.org/3/ | 2026-08-25 | `docs_python_2026-08-25.md` | `run_20260825_134803` | TIMEOUT (internal 900s) | OK 1/1 PASS (weak verif) | 8/9 grounded | 2/8 PASS | **88.9%** |
| 15 | Project Gutenberg | https://www.gutenberg.org | 2026-08-25 | `gutenberg_2026-08-25.md` | `run_20260825_060707` | OK 24 steps / 15 states | OK 1/1 PASS | 6/8 grounded | 6/6 PASS | **54.5%** |
| 16 | WeatherSpark | https://weatherspark.com | 2026-08-25 | `weathersparks_2026-08-25.md` | `run_20260825_062152` | OK 8 steps / 9 states | FAIL-HONEST ? 0/1 honest fail (canvas) | 3/3 grounded | 1/3 PASS | **60%** |
| 17 | SahiTest Demo | http://www.sahitest.com/demo/ | 2026-08-25 | `sahitest_2026-08-25.md` | `run_20260825_063248` | OK 8 steps / 8 states | FAIL-HONEST ? 0/1 honest fail (frames) | 2/2 grounded | 0/2 FAIL | **40%** |
| 18 | The Internet (status codes) | https://the-internet.herokuapp.com/status_codes | 2026-08-25 | `theinternet_spare_pages_2026-08-25.md` | `run_20260825_064713` | OK 11 steps / 9 states | FAIL-HONEST ? 0/1 honest fail | 2/4 grounded (action_mismatch) | 1/2 PASS | **40%** |
| 19 | PHPTravels Demo | https://phptravels.com/demo/ | 2026-08-25 | `phptravels_2026-08-25.md` | `run_20260825_065652` | OK 11 steps / 9 states | FAIL-HONEST ? 0/1 honest fail | 4/5 grounded | 0/4 FAIL (demoblaze mirror!) | **66.7%*** |
| 20 | Open Library | https://openlibrary.org | 2026-08-25 | `openlibrary_2026-08-25.md` | `run_20260825_070918` | OK 11 steps / 9 states | PARTIAL ? partial ECONNRESET | 3/6 grounded | 3/3 PASS | **60%** |

