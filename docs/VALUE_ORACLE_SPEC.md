# VALUE_ORACLE_SPEC.md — Assertion/Value-Oracle Synthesis for the Fusion Pipeline

**Task:** T615 (recreation) · **Author:** serial-B / ox-alpha CLI window · 2026-08-27
**Evidence base:** `mutation/results/ANALYSIS.md` (rounds 2–4), audit F-07
(PASS-by-default ladder), D11 verifier-gap production instances
(`no_post_action_change` on live-probe-passing targets, eviltester #32),
retro Tier-2 §4 approval batch. Zero LLM calls used to write this spec.

---

## 0. Problem statement

The mutation study proved the pipeline **verifies that actions work, not that
values are correct**: `wrong_calc` passed 4/4 through a phantom-$10 cart total;
`bad_validation` and `missing_required` steps "passed" under a ladder whose
floor is body-text >100 chars. Production echoed it — eviltester FT fails were
`no_post_action_change` on targets that passed live probes. Raising detection
honestly requires **expected-value predicates carried by tests themselves**
(generated in S4/A, checked at execution), not analyzer tricks.

## 1. Predicate schema

Every generated test gains an optional `assertions[]` array alongside `steps[]`.
One assertion = one predicate over post-step observable state:

```jsonc
{
  "id": "ASR_<n>",
  "after_step": 3,                    // step index this assertion follows
  "kind": "value | presence | absence | state_diff | navigation | count",
  "target": {                          // same selector grammar as steps
    "selector": "[data-testid=\"cart-total\"]",
    "origin": "catalog",               // catalog | derived(step output) | literal
    "element_id": "el_7f2a"            // grounding ref for validator
  },
  "predicate": {
    "op": "equals | matches_regex | contains | gt | lt | in_range | not_equals",
    "expected": "$129.50",             // or number / regex source / range object
    "normalize": "strip_currency | trim | lowercase | parse_int"   // ordered chain
  },
  "source": "llm_inferred | user_hint | catalog_invariant | mutation_seed",
  "strength": "strong",                // strong = value-level; weak = presence/diff-only
  "on_fail": "fail_test | warn"        // fail_test default; warn for exploratory asserts
}
```

Design rules:

1. **Grounded targets only.** `target.selector` must resolve via the existing
   catalog grounding path (same as S4 steps); ungrounded assertions are
   rejected at generation, never silently dropped.
2. **Normalize before compare.** Currency/thousands-separators/casing killed
   naive compares during the mutation rounds; the normalize chain is applied
   to both observed and expected values.
3. **Strength is honest.** Only `value`/`count` kinds with concrete
   `expected` are STRONG; `presence`/`state_diff` stay WEAK and keep the
   current `body_text_fallback` disclosure discipline.

## 2. Three worked examples (from the actual mutation variants)

### Example 1 — wrong_calc (phantom $10 cart total) → DETECTED

```jsonc
// S4 generates alongside the add-to-cart steps:
{
  "id": "ASR_1", "after_step": 3, "kind": "value",
  "target": { "selector": ".cart-total", "origin": "catalog" },
  "predicate": { "op": "matches_regex", "expected": "^\\$\\d+\\.\\d{2}$",
                 "normalize": "strip_currency" },
  // arithmetic invariant: total == sum(line items)
  "derived_check": {
    "expr": "abs(total - sum(line_items)) < 0.01",
    "binds": { "total": ".cart-total", "line_items": ".cart-line .price" }
  },
  "source": "llm_inferred", "strength": "strong", "on_fail": "fail_test"
}
```

Execution: after step 3 the executor reads `.cart-total`, extracts line-item
prices, evaluates the invariant → phantom $10 breaks it → step FAIL
`semantic_value_mismatch`. Round-3's false PASS becomes a true DETECTED.

### Example 2 — missing_required (empty credentials accepted) → DETECTED

```jsonc
{
  "id": "ASR_1", "after_step": 2, "kind": "absence",
  "target": { "selector": ".dashboard, .welcome-message", "origin": "catalog" },
  "predicate": { "op": "not_exists" },
  "precondition": { "step": 1, "expectation": "fields_submitted_empty" },
  "source": "llm_inferred", "strength": "strong", "on_fail": "fail_test"
}
```

Semantics: *after submitting an empty form, no authenticated surface may
appear.* The current ladder passes because content exists; the absence
predicate fails the test correctly.

### Example 3 — broken_nav (About → fixture 404) → DETECTED

```jsonc
{
  "id": "ASR_1", "after_step": 1, "kind": "navigation",
  "target": { "selector": "nav a[href=\"/about\"]", "origin": "catalog" },
  "predicate": { "op": "not_matches_regex", "expected": "(404|not.?found|error)",
                 "applies_to": "title_and_body_head" },
  "source": "catalog_invariant", "strength": "weak", "on_fail": "warn"
}
```

Navigation-to-error becomes visible without fabricating expected content —
a WEAK-strength tripwire that at least flags what round 3 missed.

## 3. Validator rules (S4 generation-time)

The grounding validator (`fusion/s4`) enforces, in order:

1. **V-ORACLE-001 (grounding):** every `target.element_id` must exist in the
   catalog for the assertion's page context — else reject candidate
   (`ungrounded_assertion`), mirroring cross_page_ref handling.
2. **V-ORACLE-002 (schema):** unknown `kind`/`op`/`normalize` tokens → reject
   (`invalid_predicate_schema`). Vocabulary is closed; additions require an
   executor branch first (lesson from defects #12/#14/#16).
3. **V-ORACLE-003 (self-consistency):** `expected` must be derivable — either
   present in catalog text, computed by `derived_check` bindings, or tagged
   `user_hint`. Pure invention is rejected (`unsourced_expectation`).
4. **V-ORACLE-004 (budget):** max 3 assertions per test (token + execution
   cost bound); overflow → `max_assertions_reached` rejection.
5. **V-ORACLE-005 (dedup):** identical `(target, predicate)` pairs within a
   batch → `duplicate_assertion`.

## 4. Executor paths (execution-time)

`vision/src/executeTests.js` (and the fusion FT executor) gain one post-step
hook:

1. After the step's existing verification (unchanged ladder), run
   `assertions.filter(a => a.after_step === i)` in order.
2. Resolution: selector probe (exists/visible) → value read
   (`textContent`/`value`) → normalize chain → predicate evaluate.
3. Outcomes append to the result record:
   `assertion_results: [{ id, kind, op, expected_norm, observed_norm, pass }]`.
4. Test status: any `on_fail: fail_test` assertion failing ⇒ step FAIL class
   `semantic_value_mismatch` (new failure class in the taxonomy below);
   `warn` failures attach warnings only.
5. Unresolvable selector ⇒ assertion FAIL `assertion_target_unresolved`
   (never skipped silently — the skipped-verification lesson from docs_python).
6. Dashboard/VTQ: STRONG classification now requires ≥1 passing strong
   assertion OR (legacy) input_value/checked_state/select verification —
   preserving comparability while raising the ceiling.

## 5. Failure-taxonomy additions

| New class | Meaning | Maps to |
|---|---|---|
| `semantic_value_mismatch` | observed value violated a strong predicate | wrong_calc class |
| `semantic_absence_violated` | forbidden surface appeared | missing_required class |
| `semantic_navigation_error` | navigation landed on error surface | broken_nav class |
| `assertion_target_unresolved` | assertion selector never resolved | target_resolution family |
| `assertion_schema_rejected` | candidate rejected at V-ORACLE-002 (generation-side, appears in rejections[]) | grounding family |

Existing classes are unchanged; the ladder remains backward-compatible
(assertions are additive — a test with zero assertions behaves exactly as today).

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| LLM invents wrong expected values → false FAILs on correct sites | V-ORACLE-003 sourcing rule; `on_fail: warn` default for `llm_inferred` until per-site precision measured; mutation harness is the acceptance test |
| Assertion selectors go stale between catalog and execution | reuse stale-coordinate/preverify machinery; `targets_preverified` extended to assertions |
| Cost explosion (extra reads per step) | V-ORACLE-004 budget; reads are cheap relative to LLM calls |
| Metric discontinuity vs historical runs | dual reporting: legacy ladder result AND oracle-augmented result kept side-by-side in dashboard_data for N runs before switchover |
| Grounding vocabulary drift | V-ORACLE-002 closed-vocabulary rule + shared schema module imported by validator/prompt/executor (defect #16 lesson: define once) |

## 7. Acceptance criteria (measured on the mutation harness)

Re-run rounds 2–3 variants with oracles enabled:

1. `wrong_calc`: DETECTED (≥1 `semantic_value_mismatch`) — currently false-PASS.
2. `bad_validation` / `missing_required`: DETECTED when surfaces are covered;
   NOT_COVERED honestly retained where exploration still misses them.
3. Baseline variant: zero new false FAILs across all existing PASSing tests.
4. No regression in the 157-test offline suite; new unit tests cover
   V-ORACLE-001..005 and all five taxonomy classes.

---

*Spec basis: mutation/results/ANALYSIS.md (verified findings quoted verbatim),
audit F-07/A3, D11 production verifier-gap instances. This document is the
T615 deliverable; implementation order per V2_ROADMAP R4.*
