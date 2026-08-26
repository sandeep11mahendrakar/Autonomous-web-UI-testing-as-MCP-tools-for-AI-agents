# Mutation Detection Scorecard

- Generated: 2026-08-24T17:06:05.331Z
- Harness started: 2026-08-24T16:59:56.841Z
- Channels: `arch_b` = Architecture B replay execution · `fused` = Fusion FT live execution.
  Architecture A has NO standalone runtime channel in V1 (it generates tests;
  its runtime signal arrives through Fusion).

| Variant | Bug | Run ID | arch_b | fused |
|---|---|---|---|---|
| bad_validation | Checkout accepts invalid email | run_20260824_222956 | NOT_COVERED | NO_REPORT |
| missing_required | Login accepts empty credentials | run_20260824_223156 | NOT_DETECTED | NO_REPORT |
| dead_button | Dead submit button | run_20260824_223405 | NOT_COVERED | NO_REPORT |

Legend: DETECTED / NOT_DETECTED / NOT_COVERED (cannot conclude) / NO_REPORT.
