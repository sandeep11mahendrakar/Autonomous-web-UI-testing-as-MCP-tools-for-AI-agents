# Mutation Detection Scorecard

- Generated: 2026-08-24T12:06:04.492Z
- Harness started: 2026-08-24T11:44:50.643Z
- Channels: `arch_b` = Architecture B replay execution · `fused` = Fusion FT live execution.
  Architecture A has NO standalone runtime channel in V1 (it generates tests;
  its runtime signal arrives through Fusion).

| Variant | Bug | Run ID | arch_b | fused |
|---|---|---|---|---|
| baseline | (baseline) | run_20260824_171450 | NOT_COVERED | NOT_COVERED |
| broken_nav | Broken navigation link | run_20260824_171828 | NOT_COVERED | NOT_COVERED |
| wrong_calc | Wrong cart total | run_20260824_172248 | NOT_COVERED | NOT_COVERED |
| bad_validation | Checkout accepts invalid email | run_20260824_172642 | NOT_COVERED | NOT_COVERED |
| missing_required | Login accepts empty credentials | run_20260824_172950 | NOT_COVERED | NOT_COVERED |
| dead_button | Dead submit button | run_20260824_173308 | NOT_COVERED | NOT_COVERED |

Legend: DETECTED / NOT_DETECTED / NOT_COVERED (cannot conclude) / NO_REPORT.
