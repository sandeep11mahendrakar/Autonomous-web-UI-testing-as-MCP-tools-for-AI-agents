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

### Re-run: CURA with capability upgrades

| Site | Date | Run ID | Note |
|---|---|---|---|
| CURA Healthcare (re-run) | 2026-08-24 | `run_20260824_093124` | **B LOGGED IN via seeded creds → appointment page reached for the first time**; S4 composed 3 executable tests (was honest zero); FT 0/3 but all honest failures that drove the fill/select_option executor branches + readonly fast-fail; dashboard 33.3% fusion. See `cura_rerun_2026-08-24.md`. |

### Post-capability-upgrade re-test (bstackdemo with auth-seed + select_option)

| Site | Date | Run ID | Note |
|---|---|---|---|
| BrowserStack Demo (re-run) | 2026-08-24 | `run_20260824_012649` | **A LOGGED IN via new select_option action** (react-select demouser/password) → authenticated /favourites /orders /offers; catalog 53→78 elements; FT001 now PASSES with FT-executor auth-seed. Details in session log; full report pending re-run after FT-auth fix landed mid-session. |

## Tier-1 running aggregate (checkpoint C2 tracking)

| Metric | Value |
|---|---|
| Full-pipeline success (no stage crash) | 9/9 runnable sites (1 bot-walled site excluded: OpenCart BLOCKED) |
| FT live pass rate (executed tests) | 10/12 = 83% (CURA re-run 3 honest failures included) |
| Fusion-attributable coverage | mean ≈ 21% across scored sites (range 0–40%); 33% on both post-upgrade runs |
| Auth-gated sites reached post-login | 3 of 3 attempted (bstackdemo-A via select_option, CURA-B via seeded vision prompt, ParaBank-A via seeded DOM fill) |
| Pipeline defects found & fixed during campaign | 14 total (+FT fill branch, readonly probe, S4 select_option vocabulary, external-domain leak logged as backlog) |

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
