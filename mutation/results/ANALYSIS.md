# Mutation Detection Scorecard — Analysis

Three campaign rounds were executed on 2026-08-24:

| Round | Harness state | Result |
|---|---|---|
| 1 | Fixture server closed before fusion chain (bug) | Invalid — archived `results_invalid_server_closed_1/` |
| 2 | Fixed harness, default exploration depth | `results_round2_default_depth/` |
| 3 | Deeper exploration limits (MAX_STEPS 45 etc.) | `results/` (partial: last 3 variants lost S4/FT to daily LLM quota) |

## Round-3 findings (the real research output)

### 1. Coverage-bound detection
`dead_button` stayed NOT_COVERED across rounds: neither architecture's executed
tests exercised the contact-form submit within exploration budgets. Detection
is bounded by coverage first — a bug nothing touches cannot be scored.

### 2. Verification-strength ceiling (the headline finding)
Round 3 PROVED the pipeline can reach every buggy surface:
- wrong_calc run: A visited all 5 fixture URLs (21 steps / 11 states), S4
  accepted 4 tests, FT execution passed 4/4 INCLUDING the cart page —
  yet the phantom-$10 total was NOT flagged, because no test ASSERTS values.
- bad_validation / missing_required: surfaces exercised, steps "passed" under
  the weak verification ladder.

**The system verifies that ACTIONS WORK, not that VALUES ARE CORRECT.**
Wrong-calculation, missing-validation, and dead-button bugs require an oracle
(expected value) the current architecture deliberately does not fabricate.
This is an architecture-level limitation, now EVIDENCED rather than assumed,
and feeds V2 backlog item: assertion/value-oracle synthesis.

### 3. broken_nav nuance
B clicked About -> landed on the fixture 404 page and judged it PASS because
body-text verification only checks non-trivial content. Navigation-to-error
is invisible to the current semantic ladder. Same ceiling as (2), different
symptom.

## What detection WOULD look like
DETECTED requires a failed step whose target matches the bug surface. With
current oracles this happens only for hard execution failures. Raising the
detection rate honestly means stronger assertions at generation time (S4/A
test objectives carrying expected-value predicates), NOT analyzer tricks.

## Quota incident (round 3, variants bad_validation/missing_required/dead_button)
OpenRouter ox-alpha key hit its free-models-per-DAY limit (1000) mid-campaign;
S4 returned HTTP 429 and fusion_tests.json was never produced (executor then
correctly refused). fused=NO_REPORT rows are quota casualties, not pipeline
failures. Remaining variants are scheduled post-reset by
`testing/overnight_scheduler.js`.
