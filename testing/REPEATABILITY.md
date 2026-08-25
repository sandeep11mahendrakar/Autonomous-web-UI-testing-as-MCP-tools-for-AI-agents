# Repeatability Study

- Generated: 2026-08-25T02:20:16.754Z (regenerated from run artifacts)
- Same configuration re-run 3x per site. Dimensions reported SEPARATELY:
  exploration variability, test-execution flakiness, model/API variability.
- NOTE: these runs executed on Groq free tier during its daily-token window;
  several runs degraded to deterministic fallback mid-exploration and/or hit
  TPD exhaustion — that degradation IS the API-variability dimension being
  measured, reported honestly rather than excluded.

## saucedemo

| Run | Run ID | Status | A steps | A states | A test cases | B pass rate | FT pass | Fusion % | Duration (min) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | run_20260825_062152 | SUCCESS | 8 | 9 | 1 | 0 | 1/3 | 60 | 13.7 |
| 2 | run_20260825_063248 | SUCCESS | 8 | 8 | 1 | 0 | 0/2 | 40 | 11.3 |
| 3 | run_20260825_063932 | SUCCESS | 7 | 8 | 1 | 1 | 0/0 | — | 11.4 |

- A steps variance:  8/8/7 (mean 7.7, sd 0.5)
- A states variance: 9/8/8 (mean 8.3, sd 0.5)
- FT pass counts:    1/0 (mean 0.5, sd 0.5)
- B execution stability: VARIES across runs (flaky)
- API variability: see Status column — PARTIAL_FAILURE rows indicate LLM quota/fallback interference during the study window.

## demoblaze

| Run | Run ID | Status | A steps | A states | A test cases | B pass rate | FT pass | Fusion % | Duration (min) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | run_20260825_064941 | SUCCESS | 16 | 15 | 2 | 0 | 0/0 | — | — |
| 2 | run_20260825_070445 | PARTIAL_FAILURE | — | — | 0 | 0 | 0/0 | — | — |
| 3 | run_20260825_070918 | PARTIAL_FAILURE | 11 | 9 | 1 | 0 | 3/3 | 60 | 13.2 |

- A steps variance:  16/11 (mean 13.5, sd 2.5)
- A states variance: 15/9 (mean 12.0, sd 3.0)
- FT pass counts:    3 (mean 3.0, sd 0.0)
- B execution stability: identical pass rate across runs
- API variability: see Status column — PARTIAL_FAILURE rows indicate LLM quota/fallback interference during the study window.

## METHODOLOGY NOTE (contamination disclosure)

The repeatability runner overlapped with the Tier-2 night chain during part
of its window: both spawn vision services (ports 5000-5004) and drew from
the same Groq TPD budget. Effects: PARTIAL_FAILURE statuses above, forced
deterministic fallbacks mid-run, and possible service restarts. Treat these
variance numbers as a LOWER BOUND on stability; a clean C4 re-run should
execute without any concurrent pipeline activity.

