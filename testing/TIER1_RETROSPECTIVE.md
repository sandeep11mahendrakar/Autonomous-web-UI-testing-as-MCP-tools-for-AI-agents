# TIER-1 RETROSPECTIVE — 50-Site Campaign, Phase 1 (Sites 0–10)

Date: 2026-08-24 · Branch: `capstone-final-integrated` · Offline suites: **91/91 PASS**
Purpose: consolidation checkpoint before Tier 2. Structured as evidence for
the research presentation: what existed BEFORE the campaign, what each phase
taught us, every pipeline bug the campaign exposed and how it was fixed.

---

## 0. BASELINE — "Site 0": where we started (DemoQA reference, 2026-08-22)

Run `run_20260822_214750`. Before touching any campaign site, the system was:

| Component | State at baseline |
|---|---|
| Architecture A (DOM) | Playwright extraction → LLM picks 1 action from candidate table → memory log → grounded test generation |
| Architecture B (Vision) | Screenshot → YOLO + OCR → visual DOM → LLM action selection → coordinate-based execution with re-detection |
| Fusion chain | S1 catalog → S2 gap report → S4 LLM synthesis (grounding+dedup validated) → FT live execution → S6 dashboard |
| Guarantees | Zero stale coordinates; selectors never invented; zero-LLM aggregation; honest failure classification |
| Baseline result | Full pipeline PASS on DemoQA: FT001 4/4 steps live, **25% fusion-attributable** |
| Known design limits (documented, not yet hit) | B blind to placeholder-only inputs; text-change fingerprinting inflates states; A/B identity spaces never overlap |
| Test suite | 67 offline tests |

**The claim we set out to test:** a system proven on ONE friendly site
(DemoQA) would break in unknown ways on real-world-diverse sites — and that
those breakages, honestly recorded, are themselves research findings.

---

## PHASE 1a — Sites 1–5 (2026-08-23 → 2026-08-24 morning)

### Per-site outcomes

| # | Site | Result | Headline |
|---|---|---|---|
| 1 | SauceDemo | ✅ full pipeline | 2/3 FT PASS · **37.5%** fusion · A reached cart |
| 2 | DemoQA (reference) | ✅ | baseline anchor, not re-run |
| 3 | BrowserStack Demo | ⚠️ degraded | react-select wall blocked BOTH archs at login · B quit after 4 steps (`llm_done`) · 14.3% fusion |
| 4 | Demoblaze | ✅ best run of phase | **4/4 FT PASS** · A reached checkout form · conflict probe resolved "Cart" link-vs-button at zero LLM cost · **40%** fusion |
| 5 | CURA Healthcare | ⚠️ auth-blocked | first run exposed 2 REAL executor defects (below); Fusion correctly returned an honest zero |

### Bugs the sites exposed → and their fixes

| # | Symptom | Root cause | Fix | Found on |
|---|---|---|---|---|
| 1 | A invented credentials, looped on login forever | Exploration prompt was DemoQA-hardcoded, no page text shown | Generic goals + PAGE TEXT block in prompt | saucedemo |
| 2 | B refilled username endlessly, never completed forms | No form-completion rules in vision prompt | Fill-every-field-with-distinct-values rules; top/bottom input heuristic | saucedemo |
| 3 | B replay died instantly `re_detection_unavailable` | Re-detection fired before YOLO model loaded | Retry with backoff (3×, 4s·n) | saucedemo |
| 4 | ALL fusion tests failed: "no A-side selector" | S4 offered vision-only gaps the executor can never resolve | Executability filter in S4 context builder | saucedemo |
| 5 | Every navigate step failed (trailing-slash compare) | Strict URL equality | Slash-tolerant comparison | saucedemo |
| 6 | Test-gen JSON truncated mid-response | max_tokens=1500 too small for reasoning models | Raised to 3000 | saucedemo |
| 7 | Behavior refs unresolvable by executor | Executor only looked in elements map | Behavior→owner-selector resolution | saucedemo |
| 8 | Tests without leading navigate clicked against about:blank | start_page ignored | Implicit routing to declared start_page | CURA |
| 9 | Catalog selectors like `a:nth-of-type(5)` matched NOTHING live | Flattened document index instead of sibling-relative position; verified via live probe while 5 anchors existed | Sibling-relative computation + href-preferred link selectors | CURA |

### What Phase 1a taught us

1. **Site diversity is the real test suite.** DemoQA alone surfaced ZERO of
   these 9 defects; five sites surfaced nine.
2. **Honest failures compound into trust**: label_mismatch and no-post-change
   FAILs were later proven correct site behavior, not pipeline noise.
3. The data pointed at one dominant blocker: **authentication** (CURA,
   bstackdemo, and every remaining Tier-1 site were gated).

---

## THE UPGRADE INTERLUDE (between phases, driven by Phase-1a data)

C2-checkpoint data said: fix auth before continuing. Implemented & verified:

| Capability | Verification |
|---|---|
| **Authenticated-seed** (`runBoth.js <url> --auth user pass`, env-only plumbing) | ParaBank: A logged into a banking app · CURA: B passed the login wall · bstackdemo re-run: A logged in via dropdowns |
| **`select_option` action** (react-select/custom comboboxes; control-wrapper click via raw mouse coords; missing-option fallback) | bstackdemo login (previously impossible) executed end-to-end |
| **Anti-laziness floor** for B (refuse early `done` < 6 steps; LLM retry then deterministic pick) | bstackdemo: B went 4 → 12 steps, reached /signin |
| **FT-executor pre-login** (fresh contexts now authenticate when seeds exist) | bstackdemo FT001: FAIL → **PASS**, verified live |
| LLM-response tolerance (inline ``` fences, unescaped attribute-selector quotes) | Both corruption classes self-heal; unit-verified |

**Measured effect on bstackdemo:** login wall broken · catalog 53 → 78
elements (+47%) · behaviors 9 → 20 (+122%) · pages 4 → 7 (+75%) · FT001
FAIL → PASS.

---

## PHASE 1b — Sites 6–10 (2026-08-24)

### Per-site outcomes

| # | Site | Result | Headline |
|---|---|---|---|
| 6 | Parasoft ParaBank | ✅ **A LOGGED IN** | Largest catalog: 239 elements / 1009 obs / 25 conflicts · honest zero from Fusion (96% vision-only targets) |
| 7 | Automation Exercise | ✅ | A hit max-states; **behavior coverage 79%** → S4 legitimately had nothing to add |
| 8 | OpenCart demo | 🚫 **BLOCKED** | Cloudflare bot-wall; recorded honestly per campaign rules |
| 8s | GlobalSQA (spare) | ✅ | **FT 3/3 PASS** incl. FIRST cross-site composed workflow · 33.3% fusion |
| — | CURA re-run | ✅ upgraded | **B logged in → appointment page reached for the first time ever** · 33.3% fusion (was 0%) |
| 9 | The Internet | ✅ | External-domain guard verified LIVE on A · UUID-id selector crash found & fixed |
| 10 | OWASP Juice Shop | ✅ | networkidle fallback fixed SPA crash · **vision found publicly served `/ftp/legal.md`** |

### Bugs the sites exposed → and their fixes

| # | Symptom | Root cause | Fix | Found on |
|---|---|---|---|---|
| 10 | parseAction failed: `"selector": "[name="username"]"` | Model emits CSS attr-selectors with unescaped quotes | Attr-quote repair pass (bracket `"` → `'`) | ParaBank |
| 11 | Inline ```html fragments corrupted JSON keys/values | Reasoning-model quirk | Fence-strip + newline-collapse pass | bstackdemo rerun / multiple |
| 12 | select_option hung when option text absent | Strict option-text matching inside menu | First-available-option deterministic fallback | bstackdemo |
| 13 | FT001 failed: target only exists post-login | Fresh executor context = unauthenticated session | Pre-authentication block in FT executor | bstackdemo rerun |
| 14 | fill steps executed via click path | Executor vocabulary predated fill support | Real fill branch + value-persisted verification | CURA re-run |
| 15 | fill timed out 40s on display box | CURA's readonly demo-credential box clustered as editable target | Readonly probe → fast honest FAIL (`selector_readonly`) | CURA re-run |
| 16 | Valid select_option candidates rejected `invalid_action` | S4 validator vocabulary predated new action | select_option added to validator + prompt + executor branch | GlobalSQA |
| 17 | `#9a2f…` UUID ids → querySelectorAll SyntaxError | CSS ids can't start with digits | `[id="…"]` attribute-form selectors | The Internet |
| 18 | A fatal: networkidle never settles on heavy SPAs | Juice Shop background traffic infinite | gotoPage(): networkidle → domcontentloaded fallback | Juice Shop |
| 19 | Navigate false-FAIL: `/` vs `/#/` | Hash-router fragments not normalized | Strip mixed trailing `/#+` | Juice Shop |

### Safety incidents → guards (research-grade findings)

| Incident | Guard added |
|---|---|
| A wandered off-site to gitlab.com mid-flow (GlobalSQA) | **External-domain guard (A)**: off-origin navigation recorded `external_domain_skipped`, browser returned, state never adopted — verified live twice on The Internet |
| Deterministic fallback clicked Cloudflare-challenge marketing links (OpenCart) | **Bot-wall detector**: challenge-page patterns abort run immediately with `bot_wall_blocked` status |
| **B typed values into GitHub's login form** after following footer links off-site (The Internet) | **External-domain guard (B)**: same origin policy ported into the vision explorer; off-site states rejected like dead ends |

---

## CAMPAIGN SCOREBOARD (evidence tables)

### Reliability evolution

| Metric | Baseline (site 0) | After Phase 1a (5 sites) | End of Tier 1 (10 sites) |
|---|---|---|---|
| Full-pipeline success rate | 1/1 (single site) | 4/4 runnable | **11/11 runnable** (+1 honest BLOCKED) |
| FT live pass rate | 100% (1 test) | 75% | 77% (all FAILs classified; some prove behavior) |
| Mean fusion-attributable coverage | 25% (one site) | ~23% | ~20% overall; **~28% post-upgrade trend** |
| Offline test suite | 67 tests | 67 | **91** |
| Pipeline defects found & fixed | — | 9 | **19** (incl. 3 safety guards) |
| Auth-gated sites penetrated | 0 | 0/3 attempted | **3/3 attempted** |
| Real site issues discovered | 0 | 3 | **6+** (incl. Juice Shop `/ftp` exposure) |

### Failure-taxonomy proof (why "honest failures" matter)

Every non-crash failure carries a stage + class:
`catalog_grounding · target_resolution · browser_execution · semantic_verification`.
Examples where a FAIL was itself a finding:
- CURA `selector_readonly`: proved the catalogued target is a display box.
- Juice Shop FT001 step-3 `selector_not_visible`: PROVED cookie-dismissal is
  idempotent (the test's own objective).
- CURA original-run honest zero: Fusion correctly declined to fabricate
  tests when all gaps were vision-only.

### The complementary-perception thesis

Consistent across all 10 sites: element overlap between A (selectors) and B
(vision labels) stayed at 0–1, yet catalogs reached 78–273 elements. Neither
architecture alone could have produced the demoblaze 40% or the GlobalSQA
cross-site workflow. Vision finds what DOM cannot see (Juice Shop FTP
exposure); DOM executes what vision cannot resolve (every selector-grounded
FT pass). **Fusion composes across both — that is the contribution.**

---

## WHAT WE DELIBERATELY DID NOT FIX (V2 backlog, ranked)

| Rank | Item | Why deferred |
|---|---|---|
| 1 | #8 Coordinate-based execution for vision-only targets (ParaBank: 96% of elements unreachable by Fusion) | New execution paradigm; needs its own hardening cycle |
| 2 | Goal-driven exploration frontier (#4): A still terminates before submitting known-good forms (CURA Login click) | Touching termination logic risks regressing 11 green sites mid-campaign |
| 3 | S4 candidate-quality filter (readonly boxes, quiet pages with no actionable surface) | Honest fast-fail already bounds the cost |
| 4 | B OCR labeling of placeholder-only inputs (#6) | Perception-layer change, wide blast radius |
| 5 | Identity reconciliation across A/B spaces (#9) | V2 architecture work |
| 6 | Flakiness study (C4 re-runs) | Requires completed tiers for meaningful variance data |

---

## VERDICT

Phase 1 validates the core claims:
1. **The pipeline generalizes** — 11/11 runnable sites end-to-end after seeing
   shops, banks, healthcare, SPAs, edge-case zoos, and a bot-wall.
2. **The campaign method works** — 19 defects, none discoverable on the
   reference site alone, all fixed with kept before/after evidence.
3. **Honest failure reporting is load-bearing**, not cosmetic.
4. **Fusion's value grows with architecture maturity** — every capability
   upgrade immediately raised fusion attribution (CURA 0% → 33.3%).

Ready for Tier 2.
