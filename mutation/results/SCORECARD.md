# Mutation Detection Scorecard

- Generated: 2026-08-24T13:05:22.030Z
- Harness started: 2026-08-24T12:39:21.083Z
- Channels: `arch_b` = Architecture B replay execution · `fused` = Fusion FT live execution.
  Architecture A has NO standalone runtime channel in V1 (it generates tests;
  its runtime signal arrives through Fusion).

| Variant | Bug | Run ID | arch_b | fused |
|---|---|---|---|---|
| baseline | (baseline) | run_20260824_180921 | NOT_COVERED | NOT_COVERED |
| broken_nav | Broken navigation link | run_20260824_181531 | NOT_COVERED | NOT_COVERED |
| wrong_calc | Wrong cart total | run_20260824_182158 | NOT_COVERED | NOT_COVERED |
| bad_validation | Checkout accepts invalid email | run_20260824_182652 | NOT_DETECTED | NO_REPORT |
| missing_required | Login accepts empty credentials | run_20260824_183056 | NOT_DETECTED | NO_REPORT |
| dead_button | Dead submit button | run_20260824_183317 | NOT_COVERED | NO_REPORT |

Legend: DETECTED / NOT_DETECTED / NOT_COVERED (cannot conclude) / NO_REPORT.
