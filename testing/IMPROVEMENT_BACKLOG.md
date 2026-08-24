# IMPROVEMENT BACKLOG — Deep Analysis of Sites 6–10

Date: 2026-08-24. Companion to `TIER1_RETROSPECTIVE.md` (which records WHAT
happened); this file analyzes WHY at the logic/code/workflow level and what
to improve. Evidence paths point at real run artifacts.

---

## A. LOGIC-LEVEL FINDINGS

### A1. Termination policy is activity-based, not goal-based  ⚠️ HIGH
**Evidence:** CURA re-run (`runs/run_20260824_093124/dom/exploration_summary.json`):
A filled both credential fields, terminated `completed`, never clicked Login.
ParaBank (`run_20260824_015222`): stopped at overview.htm with transfer/
bill-pay forms unexplored.
**Root cause:** `decideAction` lets the LLM say `done` whenever all *visible*
elements are tried. "Nothing left to click" ≠ "goal accomplished". There is
no goal representation at all in the loop.
**Fix direction:** goal-driven frontier — a per-flow objective object
(target state predicate or feature description). `done` accepted only when
objective met OR no path remains. NOTE: the new interactive directed-testing
feature (`interactive.js`) already injects user directives into prompts;
promoting directives to *hard termination criteria* is the natural next step.
**Effort:** M · **Priority:** P1 (it caps every auth-gated site's value)

### A2. B's replay resolution is OCR-string fragile  ⚠️ HIGH
**Evidence:** bstackdemo rerun + Automation Exercise replays fail step 1/2:
`wanted type="link" text="iphone 12 pro max"` not found although the link
exists ("iPhone 12 Pro Max" — case/OCR noise). Re-detection retries fix the
500s but not the MATCHING.
**Root cause:** candidate matching compares normalized text equality-ish;
YOLO+OCR variance across runs breaks exact family matching. No fuzzy tier,
no positional fallback despite B storing bbox centers.
**Fix direction:** two-stage matcher: (1) normalized-text contains/edit-
distance ≤2, (2) same element-type within radius of recorded center.
**Effort:** M · **Priority:** P1 (B's tests are generated-but-unplayable)

### A3. S4 offers structurally doomed candidates
**Evidence:** CURA FT003 targeted a readonly display box (`el_1evqh5f`,
label "John Doe") — honest FAIL wasted a cycle. The Internet S4 offered only
navigation-only quiet-page tests → 3 rejects.
**Root cause:** executability filter checks ONLY "has an A-side selector".
No notion of editability, visibility class, or whether gap yields a *state
change* (nav-only gaps can't produce assertable outcomes).
**Fix direction:** enrich catalog elements with static capability flags at
S1 time (from A's memory-log target_element_details: readonly/disabled/input
type). Filter at context build. Score quiet-page gaps by actionable-element
count >0.
**Effort:** S-M · **Priority:** P2

### A4. SPA blindness in DOM extraction
**Evidence:** Juice Shop (`run_20260824_102041`): A saw 4 steps / homepage
only; product grid invisible. 85/87 elements vision-only.
**Root cause:** domExtractor queries only `button,input,a,select,textarea`
at rest. Juice Shop renders product cards as clickable divs w/ role=link,
and content mounts lazily on scroll/route change. Hash-route changes also
produce identical fingerprints until text changes.
**Fix direction:** add `[role=button],[role=link],[role=tab],[onclick]` to
selector set; scroll-and-settle before extraction on SPAs; include location.hash
in fingerprint (already includes pathname — hash missing).
**Effort:** M · **Priority:** P2 (critical for Tier 4)

### A5. Identity space: overlap ~0 everywhere is a modeling choice, not law
**Evidence:** common = 0–1 on all 10 sites while both sides describe THE SAME
controls (e.g., ParaBank "Username" input exists in both spaces).
**Root cause:** canonical identity = page|type|normalized-label; A labels come
from placeholder/text, B labels from OCR — near-misses never merge, and there
is no post-hoc reconciliation pass.
**Fix direction:** lightweight reconciler in S1: same page + same normalized
label + compatible type map (button↔button_class etc.) → mark `likely_same`;
report separately without merging (conservative, still improves S2 honesty).
**Effort:** M · **Priority:** P3

### A6. LLM quota storms have no coordinated backoff
**Evidence:** ParaBank run log shows repeated 429 bursts handled ad-hoc by
per-call retries; deterministic fallback masked degradation (steps executed
with generic values instead of skipping).
**Root cause:** retry policy lives inside each callLLM call site; no shared
rate-limiter/token-bucket; fallback quality differs per action type.
**Fix direction:** shared limiter in lib/llmProvider.js (min interval +
exponential backoff shared across A/B/Fusion children via advisory lock file);
telemetry counter in summary.
**Effort:** S-M · **Priority:** P2

### A7. Workflow gap: exploration knowledge doesn't inform fusion start_page
**Evidence:** Fusion FT on CURA navigated to `/orders` unauthenticated even
though the run had discovered login mechanics; executor pre-login fixed it
via seeds, but non-seeded runs regress.
**Root cause:** fusion_tests.json carries no session-auth hint; manifest has
`auth_seed_enabled` but executor ignores run history.
**Fix direction:** propagate "login flow recorded" from catalog behaviors →
FT executor auto-performs the RECORDED login sequence (not just seeded creds)
when target pages require it.
**Effort:** M · **Priority:** P2

## B. CODE HEALTH NOTES

- `web/explore.js` (615 lines) vs new `web/src/engine.js`: duplicated
  decision/fingerprint/step logic. Once `engine.js` soaks in interactive
  testing, refactor explore.js to delegate to the engine (single source).
- `vision/src/executeTests.js` re-detection: add the same two-stage matcher
  as A2 so both executors share resolution semantics.
- Selector escaping now exists in three places (domExtractor attr-form,
  llmClient repair, fusion executor multi-select) — consolidate into
  `lib/cssSel.js` helper.

## C. PRIORITY ORDER FOR TIER-2 READINESS

Updated 2026-08-24 evening after Tier-2-prep work on `capstone-tier2-prep`:

1. ~~**A2 matcher**~~ **DONE** — `lib/fuzzyMatch.js` two-stage matcher wired
   into B's replay resolution (`resolveTarget`); 14 unit tests; unblocks B value.
2. ~~A1 goal-driven done-criteria~~ **DEMOTED to P3** — auth-seed already
   unblocked gated sites; remaining cases are cosmetic vs coverage levers.
   Touching termination logic mid-campaign risks regressing green sites.
3. **A6 rate limiter** — partially mitigated by scheduler-side quota gating;
   shared limiter in lib/llmProvider.js still open (S).
4. **A3 S4 capability flags** (fewer doomed FTs) — S-M
5. **A4 SPA extraction** (before any Tier-4-like site) — M
6. **A7 recorded-login replay** — M
7. **A5 reconciler**, **B code-health consolidation** — P3

### New items from Tier-2-prep session (2026-08-24)

8. **Assertion/value-oracle synthesis** — mutation campaign PROVED the system
   verifies "actions work", not "values are correct": wrong-calc,
   missing-validation, dead-button bugs undetectable even when surfaces are
   fully exercised (see `mutation/results/ANALYSIS.md`). Highest-value V2 item:
   expected-value predicates at test-generation time. P1 for research impact.
9. **Navigation-to-error visibility** — body-text verification passes on 404
   pages; semantic ladder needs an HTTP-status/navigation-quality signal. P2.
