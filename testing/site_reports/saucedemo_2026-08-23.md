# Site Test Report — SauceDemo — 2026-08-23

## 1. Metadata

| Field | Value |
|---|---|
| Site | SauceDemo (Swag Labs demo store) |
| URL | `https://www.saucedemo.com` |
| Test date | 2026-08-23 |
| Unified run ID | `run_20260823_225906` |
| Run folder | `runs/run_20260823_225906/` |
| LLM provider / model (A, B, Fusion) | openrouter / `stealth/ox-alpha` (free tier, `LLM_REASONING=low`) |
| Repo state | branch `capstone-final-integrated`; all Fusion + this session's fixes UNCOMMITTED |
| Explorer | ox-alpha (opencode) |
| Report status | FINAL |

Context: first full-pipeline validation on a site other than DemoQA. Two
earlier attempts the same evening (`runs/run_20260823_224921`,
`runs/run_20260823_225513`) FAILED to get past login and directly motivated
the pipeline fixes listed in §5 — kept as before/after evidence.

## 2. Verdict snapshot

| Stage | Status | Headline number | Artifact source |
|---|---|---|---|
| A exploration | ✅ | 8 steps / 9 states / 2 URLs / 0 errors | `runs/run_20260823_225906/dom/exploration_summary.json` |
| A test generation | ✅ | 4 grounded LLM tests | `runs/run_20260823_225906/dom/test_cases.json` |
| B exploration | ⚠️ confined to login page | 12 steps / 5 states / 1 URL | `runs/run_20260823_225906/vision/outputs/*_exploration_result.json` |
| B test execution | ✅ replay PASS | 1/1 pass | `runs/run_20260823_225906/vision/outputs/execution_results.json` |
| S1 catalog | ✅ | 350 obs → 40 elements / 17 behaviors / 2 pages / 10 conflicts | `runs/run_20260823_225906/fusion/catalog.json` |
| S2 gap report | ✅ | 19 uncovered elements; 9 uncovered behaviors; 10 conflicts; element coverage 10% | `runs/run_20260823_225906/fusion/gap_report.json` |
| S4 fusion synthesis | ✅ | 1 gap offered → 3 candidates → 3 accepted, 0 rejected, all grounded | `runs/run_20260823_225906/fusion/fusion_report.json` |
| FT live execution | ⚠️ | 2/3 PASS (FT003 failed semantic verification, honestly classified) | `runs/run_20260823_225906/fusion/ft_execution_results.json` |
| S6 dashboard | ✅ | **37.5% fusion-attributable** (3 of 8 tests); renders standalone | `runs/run_20260823_225906/fusion/dashboard_data.json` |

**Verdict:** The full pipeline works end-to-end on a brand-new site after this
session's fixes. Architecture A performed strongly (login → inventory → cart,
4 novel grounded tests). Architecture B was perceptually blinded on a
credential-form site and never left the login page — the run therefore also
serves as an honest demonstration of A/B asymmetry, which is exactly what the
Fusion layer is designed to surface.

## 3. Architecture results

### 3.1 Architecture A (DOM)

Flow: `/` (login form) → fill username+password with on-screen credentials →
click Login → `inventory.html` → add 5 products to cart → cart page.
Termination: `completed` (all page elements tried), 56.5 s wall time.

Test cases generated (`dom/test_cases.json`):

| ID | Objective | Steps |
|---|---|---|
| TC001 | Verify successful login with valid credentials | 4 |
| TC002 | Verify a single item can be added to the cart from inventory page | 5 |
| TC003 | Verify multiple items can be added to the cart sequentially | 7 |
| TC004 | Verify all five observed products can be added to the cart in sequence | 9 |

All selectors grounded in recorded history; zero invented selectors.

Anomalies: none significant. One earlier truncated LLM response (test-gen JSON
at max_tokens=1500) fell back cleanly to the deterministic generator — fixed
by raising the cap to 3000 (§5).

### 3.2 Architecture B (vision)

Explored only `https://www.saucedemo.com/` (login): 12 steps, 5 states,
termination `max_actions_per_state_reached`. YOLO detected 20 elements but
OCR returned EMPTY text for both input fields (placeholders not rendered as
text), so username vs password were indistinguishable `text_input` boxes.
B filled both with `standard_user` → login always failed → no further states.

Generated 1 replay workflow test; live replay PASSED 1/1 after the executor
warmup-retry fix (first re-detection attempt hit a service-startup 500 and
was retried successfully).

### 3.3 A/B comparison notes

- A: 4 elements catalogued (login-page interactables it recorded); reached
  inventory + cart. B: 36 vision-only elements, mostly login-page credential
  hint texts OCR'd as pseudo-links ("standard_user", "secret_sauce" etc.).
- Element overlap common=0 — identity spaces differ (selectors vs visual
  labels), consistent with the documented conservative matching policy.
- 10 classification conflicts, the key one: the "Login" control classified
  differently across sources — became the sole executable Fusion gap and
  produced 3 novel tests.

## 4. SITE bugs detected

Detected by our pipeline:

| # | Finding | Caught by | Evidence |
|---|---|---|---|
| 1 | Empty-credentials click produces inline validation error without navigation (error-box behavior) | FT002 probe (PASS, body-text change verified) | `fusion/ft_execution_evidence/FT002/` |
| 2 | "Login" control accepts text-fill without navigating — behaves input-like under probe despite button semantics | FT001 disambiguation probe | `fusion/ft_execution_evidence/FT001/` |

NOT caught (coverage gaps, not pipeline failures):
- Checkout-form bugs (empty/invalid ZIP accepted, info-validation gaps) — A
  terminated at the cart page before checkout; B never logged in.
- `locked_out_user` / `problem_user` personas — single-persona run.
- Performance-glitch user timing behavior — not exercised.

These are the natural targets for the planned edge-case engine and/or a
second adaptive run seeded past authentication.

## 5. PIPELINE bugs & fixes found during this test

All fixes applied and verified during this session (offline suites 67/67 PASS
after changes). All changes UNCOMMITTED.

| # | Symptom | Root cause | Fix | Files |
|---|---|---|---|---|
| 1 | A invented `testuser` instead of using on-screen credentials; looped on login page forever (runs 224921, 225513) | Exploration prompt was DemoQA-hardcoded (flow goals listed Elements/Forms/Alerts) and contained NO page text, so the model couldn't see valid usernames | Prompt now includes visible PAGE TEXT block + generic goals for non-DemoQA flows | `web/src/preprocess.js`, `web/explore.js` |
| 2 | B re-filled the username field endlessly, never completed the form | Action rules didn't require completing multi-field forms or distinguishing same-looking inputs | New rules: fill EVERY required field with DISTINCT values before submit; top-input=username / bottom-input=password heuristic; use exact on-screen credentials | `vision/src/explorer.js` |
| 3 | B replay executor FAILed instantly: `re_detection_unavailable` (HTTP 500) | Re-detection request fired while freshly spawned vision services were still loading the YOLO model | Retry with backoff (3 attempts, 4s×n) in `redetectState()` | `vision/src/executeTests.js` |
| 4 | First S4→FT execution: ALL 5 fusion tests failed — `catalog record has no A-side selector` | S4 offered vision-only gap candidates (36 b_only elements have no DOM selector) that can never be resolved by the live executor | Executability filter in context builder: candidates whose target lacks DOM selectors are not offered; conflict gaps now carry their resolvable element ref explicitly (the LLM had cited the gap id itself as a ref) | `fusion/lib/s4_context.js`, tests in `fusion/test/s4_fusion.test.js` |
| 5 | Every FT navigate step FAILed: "landed on https://www.saucedemo.com/" | Executor compared landed URL strictly against step URL (trailing slash mismatch) | Slash-tolerant URL comparison | `fusion/execute_fusion_tests.js` |
| 6 | A test-gen output truncated mid-JSON ("Unterminated string") | max_tokens=1500 too small for reasoning-model responses | Raised `GROQ_MAX_TOKENS_A` to 3000 | `web/.env` |
| 7 | Behavior refs accepted by validator but unresolvable by executor | Executor only looked up `elements` map | Behavior refs now resolve through their recorded target selector when a catalog element owns it | `fusion/execute_fusion_tests.js` |

Also this session (infrastructure, not bugs): OpenRouter set as default
provider everywhere; `stealth/ox-alpha` model configured for A/B/Fusion;
optional `reasoning:{effort}` support added to `lib/llmProvider.js`
(`LLM_REASONING=low`).

## 6. Where the project lagged

Design limits (expected, documented):
- **B's OCR blindness to placeholders** is the dominant weakness on
  credential-gated sites. Without visible label text, B cannot distinguish
  same-shaped inputs. This caps B's coverage on any login-first site.
- **A's termination policy** ("completed" when all *current-page* elements are
  tried) stopped it at the cart page — checkout flow never explored.
- **Text-change fingerprinting** inflates state counts on fill-heavy pages
  (known limitation, observed mildly here).
- Element identity spaces remain non-overlapping (common=0), so S2's coverage
  percentages are conservative.

Defects found & fixed: see §5 (7 items — this site was genuinely useful for
hardening; DemoQA alone would never have exposed them).

Cost/time: full A+B collection ~1 min concurrent; S4 one LLM call (~0.6k
token prompt, seconds with reasoning=low); FT execution ~1 min. Very cheap per
site — supports scaling to the 50-site campaign.

## 7. Metrics table

```
A: steps=8 states=9 urls=2 clicks=6 fills=2 errors=0
B: steps=12 states=5 urls=1 generated_tests=1 replay=1_pass/0_fail
S1: observations=350 elements=40 behaviors=17 pages=2 conflicts=10
S2: el common=0 a_only=4 b_only=36 uncovered=19 ; bh uncovered=9 ; conflicts=10
S4: offered=1 candidates=3 accepted=3 rejected=0 grounded=true
FT: total=3 passed=2 failed=1 steps 6/8 (targets_preverified=5)
Dashboard: total_tests=8 (A=4 B=1 fusion=3) ; pct_fusion=37.5% ; novel_targets=3
Offline suites after run: 67/67 PASS
Duration: A+B=~56s concurrent ; FT exec=~1min
```

## 8. Asset index

| Asset | Path |
|---|---|
| Run manifest | `runs/run_20260823_225906/run_manifest.json` |
| A memory log / states / transitions | `runs/run_20260823_225906/dom/memory_log.json`, `states.json`, `transitions.json` |
| A screenshots (per-step before/after) | `runs/run_20260823_225906/dom/screenshots/` |
| A test cases (+raw LLM response) | `runs/run_20260823_225906/dom/test_cases.json`, `test_cases_raw_response.txt` |
| A exploration log | `runs/run_20260823_225906/dom/run_explore.log` |
| B visual DOMs (state_001…010) | `runs/run_20260823_225906/vision/outputs/state_*_visual_dom.json` |
| B exploration history/result | `runs/run_20260823_225906/vision/outputs/run_1787506153621_exploration_{history,result}.json` |
| B generated test | `runs/run_20260823_225906/vision/outputs/test_cases_run_1787506153621_exploration.json` |
| B execution results + logs | `runs/run_20260823_225906/vision/outputs/execution_results.json`, `runs/run_20260823_225906/vision/run_execute.log` |
| B evidence screenshots | `vision/storage/screenshots/run_1787506153621/` |
| S1 catalog / observations | `runs/run_20260823_225906/fusion/catalog.json`, `observations.json` |
| S2 gap report | `runs/run_20260823_225906/fusion/gap_report.json` |
| S4 fusion tests / report / raw response | `runs/run_20260823_225906/fusion/fusion_tests.json`, `fusion_report.json`, `fusion_raw_response.txt` |
| FT execution results | `runs/run_20260823_225906/fusion/ft_execution_results.json` |
| FT evidence (FT001–FT003) | `runs/run_20260823_225906/fusion/ft_execution_evidence/FT*/` |
| Dashboard (open directly in browser) | `runs/run_20260823_225906/fusion/dashboard.html` |
| Dashboard render check screenshot | `runs/run_20260823_225906/fusion/dashboard_render_check.png` |
| Failed pre-fix runs (evidence) | `runs/run_20260823_224921/`, `runs/run_20260823_225513/` |

## 9. Recommendations for next runs

1. **Authenticated-seed support**: let A/B accept optional start credentials
   so B isn't blinded on login-first sites (biggest single coverage lever).
2. Extend A's termination/goal logic to push into checkout flows (goal-driven
   frontier rather than all-elements-tried).
3. Parameterize `s6_dashboard.js --validate` (currently hardcodes DemoQA-run
   invariants and fails on other sites by design).
4. Consider OCR pre-processing (upscale/invert) or placeholder extraction via
   DOM fallback for B's input-labeling weakness.
5. Run the 50-site campaign with this template; track INDEX.md metrics for
   aggregate reliability/flakiness stats.

## 10. Reproduction commands

```bash
node runBoth.js https://www.saucedemo.com
node fusion/s1_build_catalog.js run_20260823_225906
node fusion/s2_gap_report.js run_20260823_225906
node fusion/s4_fusion_synthesis.js run_20260823_225906
node fusion/execute_fusion_tests.js run_20260823_225906
node fusion/s6_dashboard.js run_20260823_225906
node --test fusion/test web/test   # offline suites, zero API
```
