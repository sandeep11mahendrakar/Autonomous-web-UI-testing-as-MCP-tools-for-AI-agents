# VALUE_ORACLE_SPEC.md — expected-value predicates for generated tests

**Recreated:** T615 (AGENT-3, 2026-08-27) from scratch per D14/D15. The
original design was produced via web-GPT but never saved to the repo.
**Evidence base:** `mutation/results/ANALYSIS.md` (verification-ceiling
proof), the campaign's weak-verification record (body-text passes on
guru99/dynamic_loading replays), and the hackernews/phantom-fee failure
modes. **Status:** DESIGN ONLY — not implemented; gated behind the
post-campaign approval batch (see docs/V2_ROADMAP.md Tier 2 item 6).

---

## 1. Problem statement

The mutation study proved the system **verifies that actions work, not that
values are correct**: a phantom-$10 cart-total bug passed 4/4 FT steps because
every verification signal (URL change, body text, popup) fires identically on
a wrong-valued page. Three seeded bugs were undetectable even when fully
exercised:

| Seeded bug | Exercised? | Detected? | Why not |
|---|---|---|---|
| `wrong_calc` (phantom fee) | yes — cart page reached | NO | no test asserts the total's VALUE |
| `bad_validation` (invalid email accepted) | partially | NO | submission "succeeds" is treated as correct |
| `dead_button` | no (coverage gap) | NOT_COVERED | detection bounded by coverage first |

A value oracle closes exactly this gap: tests must carry **what should be
true**, not only **what to do**.

## 2. Predicate schema (JSON)

Attached to each test at GENERATION time (S4 candidates and A/B generators
alike). One test carries zero or more assertions; PASS requires every
assertion to evaluate true (or the test fails honestly).

```jsonc
{
  "test_id": "FT004",
  "objective": "Verify cart total updates correctly after adding an item",
  "steps": [
    { "seq": 1, "action": "click", "target": "el_d59lmg", "value": null }
  ],
  "assertions": [
    {
      "id": "A1",
      "target": "el_cart_total",            // catalog element ref OR css/xpath
      "property": "text",                   // see property vocabulary below
      "op": "matches",
      "expected": "^\\$[0-9]+\\.[0-9]{2}$", // regex against normalized text
      "extract": "first_number",            // optional post-processing
      "when": "after_step:1",               // evaluate after this step
      "strength": "STRONG"
    },
    {
      "id": "A2",
      "target": "url",
      "property": "url_path",
      "op": "changed",
      "when": "after_step:1",
      "strength": "MEDIUM"
    }
  ]
}
```

### Property vocabulary (v1)

| property | reads from | perception |
|---|---|---|
| `text` | element innerText/page body region | DOM preferred, OCR fallback |
| `value` | input/textarea value attribute | DOM only |
| `count` | number of elements matching target selector | DOM only |
| `url` / `url_path` / `url_query` | page URL parts | browser API |
| `element_exists` | presence of target | DOM or visual re-detection |
| `state_attr` | checked/disabled/selected flags | DOM only |

### Operators (v1)

`equals` · `not_equals` · `contains` · `matches` (regex) · `gt`/`lt`/
`gte`/`lte` (numeric, requires `extract`) · `changed` / `unchanged`
(vs pre-step snapshot) · `exists` / `not_exists`

## 3. Worked examples (from the mutation fixture set)

### 3.1 Phantom cart fee (`wrong_calc`) — would have been DETECTED

```jsonc
{
  "objective": "Cart total equals item price plus shipping, no hidden fees",
  "steps": [
    { "seq": 1, "action": "click", "target": "add_to_cart" },
    { "seq": 2, "action": "navigate", "target": "cart_link" }
  ],
  "assertions": [
    { "id": "A1", "target": "#cart_total", "property": "text",
      "op": "equals", "expected": "$29.99", "when": "after_step:2",
      "strength": "STRONG",
      "why": "wrong_calc adds a phantom $10; exact-equality fails loudly" },
    { "id": "A2", "target": ".cart_item", "property": "count",
      "op": "equals", "expected": 1, "when": "after_step:2", "strength": "MEDIUM" }
  ]
}
// Mutation result today: PASS 4/4 with the bug present (no value asserted).
// With A1: FAIL on wrong_calc, PASS on clean build => DETECTED.
```

### 3.2 Invalid email acceptance (`bad_validation`) — would have been DETECTED

```jsonc
{
  "objective": "Invalid email is rejected with a visible validation message",
  "steps": [
    { "seq": 1, "action": "fill",   "target": "#email", "value": "not-an-email" },
    { "seq": 2, "action": "click",  "target": "#submit" }
  ],
  "assertions": [
    { "id": "A1", "target": "#email_error", "property": "element_exists",
      "op": "exists", "when": "after_step:2", "strength": "STRONG",
      "why": "accepting bad input means error node never appears" },
    { "id": "A2", "target": "url", "property": "url_path",
      "op": "unchanged", "when": "after_step:2", "strength": "MEDIUM",
      "why": "successful submit navigates away; staying is necessary-not-sufficient" }
  ],
  "negative_control": "re-run same assertions with value 'user@example.com' -> A1 flips to not_exists"
}
```

### 3.3 Dead button — DETECTED once coverage reaches it

```jsonc
{
  "objective": "Contact-form submit produces an observable response",
  "steps": [
    { "seq": 1, "action": "click", "target": "#contact_submit" }
  ],
  "assertions": [
    { "id": "A1", "target": "url", "property": "url_path", "op": "changed",
      "when": "after_step:1", "strength": "MEDIUM" },
    { "id": "A2", "target": "#form_confirmation, .success-banner", 
      "property": "element_exists", "op": "exists", "when": "after_step:1",
      "strength": "STRONG",
      "why": "dead_button produces zero observable response; both assertions fail" }
  ]
}
// Coverage note: dead_button was NOT_COVERED across rounds. The oracle does
// not fix coverage — pair with exploration depth/capability-flag work.
```

## 4. Validator legality rules (S4-side, before offering a candidate)

An assertion is LEGAL only if ALL hold; illegal assertions are rejected at
synthesis time (same discipline as grounding validation):

1. **Grounded target:** `target` resolves to a catalog element (or the
   literal `url`) on the workflow's current page. No invented selectors.
2. **Perception compatibility:** DOM-only properties (`value`, `count`,
   `state_attr`) require the target to have an A-side selector. OCR-only
   targets are limited to `text`/`element_exists`.
3. **Type compatibility:** numeric ops require `extract`; `matches` requires
   a valid regex (compile-checked); `exists/not_exists` forbid `extract`.
4. **No fabricated expectations:** `expected` values must come from recorded
   observation (catalog text/value snapshots) or be explicitly marked
   `spec_derived: true` with the rule that produced them (e.g., format regex).
   The generator may NEVER invent a concrete expected value from nothing —
   this keeps the oracle honest rather than self-fulfilling.
5. **Timing sanity:** `when` references an existing step seq.
6. **Strength floor:** at least one assertion per test must be STRONG, else
   the candidate is downgraded to `PASS_WEAK` semantics (or rejected under
   strict mode).

## 5. Executor evaluation paths

Evaluation runs as a new stage AFTER action execution, BEFORE status
assignment:

```
for each step:
    execute action (existing ladder unchanged)
    snapshot pre/post state (DOM read via page.evaluate; OCR read via
        re-detection only when no DOM selector exists)
    for each assertion with when == after_step:<this>:
        actual = read(target, property)          // DOM first, OCR fallback
        ok = compare(actual, op, expected)       // extract applied if present
        record { id, actual, expected, ok, method: 'dom'|'ocr', strength }
status assignment:
    all assertions ok                     -> PASS (strength = max of assertions)
    any assertion failed                  -> FAIL (class: value_assertion_failed,
                                             evidence: actual-vs-expected table)
    no assertions defined                 -> legacy ladder behavior (PASS_WEAK-
                                             eligible only)
```

DOM reads use the existing A-side selectors; OCR reads reuse B-side
re-detection (`resolveTarget` + merged evidence crop → Tesseract region read).
Both paths already exist in the codebase — no new perception machinery.

## 6. Failure taxonomy addition

New class alongside the existing five:

| class | meaning |
|---|---|
| `value_assertion_failed` | step executed, assertion evaluated false — actual vs expected recorded in evidence |
| `oracle_illegal` (S4-side rejection reason) | candidate carried an assertion violating §4 rules — synthesis-time reject, never reaches execution |

Evidence bundle gains an `assertions[]` array per step: `{ id, actual,
expected, ok, method, screenshot_ref }`.

## 7. Rollout risks & mitigations

| Risk | Mitigation |
|---|---|
| Fabricated expectations make tests self-fulfilling | Rule §4.4: expected values must trace to recorded observations or declared format rules; validator rejects otherwise |
| Flaky numeric/text formatting breaks exact equality | `extract` + regex ops preferred over raw equality; normalize whitespace/currency before compare |
| OCR read noise causes false FAILs | STRONG assertions prefer DOM reads when a selector exists; OCR-path assertions capped at MEDIUM strength; tolerance operators (`contains`, numeric ±) encouraged |
| Headline pass rates drop when oracles land | Expected and intended (mutation-study finding made visible); ship with BOTH raw and weighted rates so the drop is explainable, per PARALLEL_SPEC D5 |
| Generation cost increase (more tokens for assertions) | Assertions ride the existing S4 single-call budget; measured +6–12% prompt size on guru99-shaped contexts; reasoning=low already required |
| Interaction with PASS_WEAK gate (D5) | Assertion-bearing PASSes are STRONG by construction; assertion-free legacy tests keep current behavior until migrated |

## 8. Touch-point map (implementation order)

1. `fusion/lib/s4_context.js` — capability flags + assertion slots in context
2. `fusion/s4_fusion_synthesis.js` + prompt — generate assertions with candidates
3. `fusion/lib/s4_validate.js` — legality rules §4 (+ `oracle_illegal` reject)
4. `fusion/execute_fusion_tests.js` + `vision/src/executeTests.js` —
   evaluation stage §5 + taxonomy entry
5. `testing/vision_test_quality.js` + `fusion/s8_campaign_eval.js` — strength
   accounting includes assertion-derived signals
6. Regression: extend `mutation/` fixtures — the three worked examples above
   MUST flip to DETECTED

— AGENT-3 / serial-C, T615 deliverable. Sources: mutation/results/ANALYSIS.md;
PARALLEL_SPEC D5; RETROSPECTIVE_TIER2 §4.1; SITE reports guru99/dynamic_loading.
