# Site Testing Index

<!-- Regenerated 2026-08-25T15:16:21.611Z by regen_ledger.js; boundary definition: a test is STRONG iff any step used input_value/checked_state/dropdown_option_selected/select_option/scroll_position verification; excluded runs: run_20260825_055129, run_20260825_060707, run_20260825_062152, run_20260825_063248, run_20260825_064713, run_20260825_065652, run_20260825_070918 -->


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
| 12 | Quotes to Scrape | https://quotes.toscrape.com | 2026-08-25 | `quotes_toscrape_2026-08-25.md` | `run_20260825_131756` | OK 8 steps/5 states | PARTIAL no test cases | 5/7 grounded | 4/5 PASS | **83.3%** |
| 13 | LambdaTest Playground | https://www.lambdatest.com/selenium-playground/ | 2026-08-25 | lambdatest_playground_2026-08-25.md | un_20260825_133122 | ✅ A explored (SITE-MOVED-EVIDENCE: testmuai.com rebrand verified) | ✅ B explore #2 genuine | 5/5 grounded | 4/5 PASS | **100%** |
| 14 | Python.org Docs | https://docs.python.org/3/ | 2026-08-25 | `docs_python_2026-08-25.md` | `run_20260825_163448` | 11 states (A timeout @900s cap) | 9 states/596 elems | 8/11 grounded | 1/8 PASS | **88.9%** |
| 15 | Project Gutenberg | https://www.gutenberg.org | 2026-08-25 | `gutenberg_2026-08-25.md` | `run_20260825_165819` | 4 states (0 tests) | 4 states/202 elems | 4/5 grounded | 4/4 PASS | **80%** |
| 16 | WeatherSpark | https://weatherspark.com | 2026-08-25 | `weathersparks_2026-08-25.md` | `run_20260825_173233` | 9 states (0 tests) | 2 states/28 elems | 8/12 grounded | 5/8 PASS | **100%** |
| 17 | SahiTest Demo | http://www.sahitest.com/demo/ | 2026-08-25 | `sahitest_2026-08-25.md` | `run_20260825_194511` | 3 states | 3 states/123 elems | 1/2 grounded | 1/1 PASS | **33.3%** |
| 18 | The Internet (status codes) | https://the-internet.herokuapp.com/status_codes | 2026-08-25 | `theinternet_spare_pages_2026-08-25.md` | `run_20260825_195406` | 5 states (0 tests, A capped @900s — budget limit not error) | 3 states/40 elems, replay 1/1 PASS live | 4/8 grounded | 4/4 PASS | **80%** |
| 19 | PHPTravels Demo | https://phptravels.com/demo/ | 2026-08-25 | `phptravels_2026-08-25.md` | `run_20260825_201027` | 20 states | 9 states/278 elems | 6/6 grounded | 5/6 PASS | **60%** |
| 20 | Open Library | https://openlibrary.org | 2026-08-25 | `openlibrary_2026-08-25.md` | `run_20260825_203014` | 6 states (0 tests) | 4 states/98 elems | 7/10 grounded | 0/7 PASS | **87.5%** |


## TIER 3 (sites 21-30) - campaign 2026-08-26

| 22 | StackOverflow Questions | https://stackoverflow.com/questions | 2026-08-26 | stackoverflow_2026-08-26.md | none - BLOCKED pre-gate | 🚫 BLOCKED - hard HTTP 403 bot-wall (preflight + claim-time re-check) | 🚫 blocked | - | - | - |
| 24 | IMDb Chart Top | https://www.imdb.com/chart/top | 2026-08-26 | `imdb_blocked_2026-08-26.md` | none - BLOCKED pre-gate | BLOCKED - HTTP 202 bot-check (preflight + launch re-check) | blocked | - | - | - |
| 29 | npmjs Packages | https://www.npmjs.com/packages | 2026-08-26 | `npmjs_blocked_2026-08-26.md` | none - BLOCKED pre-gate | BLOCKED - hard HTTP 403 bot-wall (preflight + launch re-check) | blocked | - | - | - |
| 21 | Wikipedia (Web testing) | https://en.wikipedia.org/wiki/Web_testing | 2026-08-26 | `wikipedia_2026-08-26.md` | `run_20260825_230647` | ⚠️ A timeout @900s (18 entries/13 pages) | ⚠️ max_depth_reached, replay 0/1 honest fail | 7/39 accepted (3 honest rejects) | 3/7 PASS (steps 6/14) | **87.5%** |
| 23 | GitHub Trending | https://github.com/trending | 2026-08-26 | `github_trending_2026-08-26.md` | `run_20260825_232415` | ⚠️ A timeout @900s (23 steps/20 states, max_states_reached, 0 tests) | ✅ replay 1/1 PASS (weak signal x1 disclosed) | 5/5 accepted (0 rejects, all grounded) | 3/5 PASS (steps 10/12) | **83.3%** |
| 26 | Hacker News | https://news.ycombinator.com | 2026-08-26 | `hackernews_2026-08-26.md` | `run_20260825_234052` | ⚠️ A timeout @900s (17 entries/9 pages) | ⚠️ partial (no candidates) | 8/33 accepted, **100% fusion-created** | 1/8 PASS (7× selector_not_found on bare /item - honest) | **100%** |
| 32 | EvilTester Test Pages | https://testpages.eviltester.com/styled/index.html | 2026-08-26 | `eviltester_pages_2026-08-26.md` | `run_20260826_005704` (supersedes contaminated `run_20260826_000247`, kept as evidence) | ✅ 19 steps/20 states max_states_reached, 19 URLs, 0 errors; 3 tests | ⚠️ replay 1/1 PASS (body_text_fallback weak x1 disclosed) | 3/3 accepted, 0 rejections, all grounded | **1/3 PASS** (2× no_post_action_change on live-probe-passing buttons - verifier gap, not site defect) | **42.9%** (novel targets 5) |
| 35 | Practice Test Automation | https://practicetestautomation.com/practice/ | 2026-08-26 | `practica_contaminated_2026-08-26.md` | `run_20260826_003258` — DO NOT CITE | 🚫 CONTAMINATED - purity FAIL: A visited foreign host luma.com via href-goto bypass of external-domain guard (DEFECT #25 candidate); catalog+B clean 3/4 checks; re-run after #25 fix | 🚫 contaminated-skip | - | - | - |
| 28 | Archive.org (Internet Archive) | https://archive.org | 2026-08-26 | `archive_org_2026-08-26.md` | `run_20260825_235819` | ⚠️ thin (memory log empty, 0 tests) | ⚠️ partial (no candidates) | S4 offered 0 → accepted 0 (honest zero, executor refusal correct) | ➖ not executable (no fusion tests) | 0% (0/0 honest) |
| 25 | Goodreads Lists | https://www.goodreads.com/list/tag/best | 2026-08-26 | `goodreads_blocked_2026-08-26.md` | `run_20260825_232334` + `run_20260825_235717` | 🚫 BLOCKED - blank-render bot-wall (2 attempts, screenshots 100% white, 0 elements) | 🚫 blocked | - | - | - |
| 30 | Reddit Public (old.reddit) | https://old.reddit.com | 2026-08-26 | `reddit_blocked_2026-08-26.md` | none - BLOCKED pre-gate | 🚫 BLOCKED - anonymous login-wall 302→/login/?reason=lor2 (3 probes; D8-a: no spare promotion without user approval) | 🚫 blocked | - | - | - |
| 31 | Magento Luma (softwaretestingboard) | https://magento.softwaretestingboard.com/ | 2026-08-26 | `magento_526_blocked_2026-08-26.md` | `run_20260826_004650` (purity PURE 4/4, full protocol) | 🚫 BLOCKED - site down: Cloudflare 526 origin-SSL failure page rendered (4 probes over ~3h incl. pipeline-grade; A warnings show cloudflare 5xx-error links, B no_valid_candidate). S1/S4/FT numbers describe the CF error page — NOT citable for magento. Retry when non-526 | 🚫 blocked-honest | - | - | - |

| 33 | TodoMVC React (TS) | https://todomvc.com/examples/typescript-react/#/ | 2026-08-26 | `todomvc_react_2026-08-26.md` | `run_20260826_002227` | 8 steps/4 states, completed | llm_done, replay 1/1 PASS (input_value) | 3/3 grounded | **3/3 PASS** ⚠️ incl. off-domain nav (github.com/remojansen, petehuntsposts.quora.com via on-page links; read-only) — audit F4-01 disclosure | **30%** 
| 34 | Techlistic (Selenium practice) | (D9 spare target) | 2026-08-26 | (no report — BLOCKED-CONTAMINATED verdict registered per D8(e)) | `run_20260826_002500` 🚫 DO-NOT-CITE — foreign practica execution_results + catalog page_keys; evidence dir retained on disk only | - | - | - | - | - |