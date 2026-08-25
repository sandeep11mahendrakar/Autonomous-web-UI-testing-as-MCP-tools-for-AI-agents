# Repeatability Study

- Generated: 2026-08-25T07:37:21.884Z (regenerated from run artifacts)
- Same configuration re-run N times per site. BLOCKED/failed repetitions are
  reported as-is; variance over missing values is "not recorded".
- Numbers derived from on-disk run artifacts via extract_run.summarize() —
  identical source of truth as the s8 campaign aggregator.
- Dimensions reported SEPARATELY: exploration variability, execution flakiness,
  model/API variability.

## saucedemo

| Run | Run ID | Status | A steps | A states | B tests | B pass rate | FT pass | Fusion % | LLM calls | Duration (min) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | run_20260825_062152 | SUCCESS | 8 | 9 | 1 | 0 | 1/3 | 60 | 0 | 13.7 |
| 2 | run_20260825_063248 | SUCCESS | 8 | 8 | 1 | 0 | 0/2 | 40 | 0 | 11.3 |
| 3 | run_20260825_063932 | SUCCESS | 7 | 8 | 1 | 1 | 0/0 | — | — | 11.4 |

- A steps variance: 8/8/7 (mean 7.7, sd 0.5)
- A states variance: 9/8/8 (mean 8.3, sd 0.5)
- FT pass counts:   1/0/0 (mean 0.3, sd 0.5)
- LLM calls:        0/0 (mean 0.0, sd 0.0)
- Execution stability: FT outcomes VARY across runs (flaky)
- API variability: see Status column — PARTIAL_FAILURE rows indicate LLM quota/fallback interference during the study window.

## demoblaze

| Run | Run ID | Status | A steps | A states | B tests | B pass rate | FT pass | Fusion % | LLM calls | Duration (min) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | run_20260825_064941 | SUCCESS | 16 | 15 | 2 | 0 | 0/0 | — | — | 20 |
| 2 | run_20260825_070445 | PARTIAL_FAILURE | null | null | 0 | 0 | 0/0 | — | — | 19.8 |
| 3 | run_20260825_070918 | PARTIAL_FAILURE | 11 | 9 | 1 | 0 | 3/3 | 60 | 0 | 13.2 |

- A steps variance: 16/11 (mean 13.5, sd 2.5)
- A states variance: 15/9 (mean 12.0, sd 3.0)
- FT pass counts:   0/0/3 (mean 1.0, sd 1.4)
- LLM calls:        0 (mean 0.0, sd 0.0)
- Execution stability: FT outcomes VARY across runs (flaky)
- API variability: see Status column — PARTIAL_FAILURE rows indicate LLM quota/fallback interference during the study window.

## globalsqa

| Run | Run ID | Status | A steps | A states | B tests | B pass rate | FT pass | Fusion % | LLM calls | Duration (min) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | run_20260825_072257 | SUCCESS | 16 | 15 | 2 | 1 | 2/3 | — | — | 18.4 |
| 2 | run_20260825_073812 | PARTIAL_FAILURE | null | null | 0 | 0 | 7/7 | — | — | 20.2 |
| 3 | run_20260825_075515 | FAILED | null | null | 0 | — | 0/0 | — | — | 20.2 |

- A steps variance: 16 (mean 16.0, sd 0.0)
- A states variance: 15 (mean 15.0, sd 0.0)
- FT pass counts:   2/7/0 (mean 3.0, sd 2.9)
- LLM calls:        not recorded
- Execution stability: FT outcomes VARY across runs (flaky)
- API variability: see Status column — PARTIAL_FAILURE rows indicate LLM quota/fallback interference during the study window.
