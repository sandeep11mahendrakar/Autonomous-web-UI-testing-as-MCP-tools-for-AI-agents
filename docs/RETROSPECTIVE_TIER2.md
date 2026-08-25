# RETROSPECTIVE_TIER2.md — Engineering retrospective of the campaign so far

**Author:** serial-C (ox-alpha CLI window). Task T602, Master directive D2.
**Scope:** sites 1–20 (Tier 1 + Tier 2 + quarantine re-runs), plus the mutation
study, repeatability study, adversarial audit (AUDITOR-3), and the overnight
coordination campaign of 2026-08-25.
**Status:** DRAFT pending sites 18/19/20 clearance — final-aggregate slots are
marked `[PENDING 11-20]` and will be filled from artifacts only before Gate
(T401).

---

## 1. Architecture problems faced (full defect catalog)

Sources: `testing/CAMPAIGN_EVALUATION.md` §6 (defects #1–#19),
`PROJECT_MEMORY.md` §0b (#20, #21-class), `docs/AUDIT_REPORT.md` F-01…F-11 +
DEFECT #23, `testing/IMPROVEMENT_BACKLOG.md` A1–A7. Grouped by failure CLASS,
because the classes — not the individual bugs — are the lesson.

### 1a. Perception limits (what the sensors cannot see)

| Defect | Symptom | Root cause | Disposition |
|---|---|---|---|
| #1 | A invented credentials, looped on login (saucedemo) | Prompt was DemoQA-hardcoded; no page text shown to LLM | Fixed: generic goals + PAGE TEXT block |
| #2 | B refilled username endlessly (saucedemo) | OCR cannot read input placeholders → username/password indistinguishable | Partially fixed (fill-every-field rules); remains a documented vision limit on credential forms |
| A4 backlog | SPA blindness (Juice Shop): product grid invisible | domExtractor queries only `button,input,a,select,textarea` at rest; no scroll-and-settle; hash missing from fingerprint | OPEN (P2, blocks Tier-4-class sites) |
| #16-site | WeatherSpark canvas blind spot: B produced 0 test cases | Charts are canvas pixels — YOLO/OCR see nothing actionable | Honest FAIL recorded; fusion still delivered via A-side |
| sahitest | Frames unsupported | Vision pipeline does not traverse iframes | Documented honest limit |
| OCR variance | Replay targets mismatch ("Leam more" vs "Learn more") | Tesseract noise across runs | Mitigated by `lib/fuzzyMatch.js`; never fully eliminated |

**Lesson:** every perception gap eventually became a *grounding* problem
downstream — an element one side cannot see produces gaps/conflicts that look
like coverage but are sensor artifacts.

### 1b. Attribution-corruption class (the campaign's defining failure)

| Defect | Symptom | Root cause | Disposition |
|---|---|---|---|
| F-01/F-02 (**CRITICAL**) | Sites #16–#20 registered runs executed against saucedemo/demoblaze/localhost mirrors | Three workloads ran concurrently overnight; collector stitched artifacts by mtime windows into the newest run dir; reports then wrapped wrong-site data in plausible narratives | Quarantined (QUARANTINE_TIER2); guards built (`findRunDir` strict, `assertCatalogDomains`, `assertVisionStartUrls`, folder_purity); re-run protocol per site |
| F-03 | B-side replays for #14/#15 hit localhost fixtures, undisclosed | Same mtime-window stitching | Addendum refined verdicts; reports rewritten append-only |
| F-06 | Failed sibling runs silently dropped from ledger (CURA 0/4 attempt unregistered) | Ledger selection bias | Audit evidence E8; ledger discipline added |
| DEFECT #23 | Literal null `page_key` recorded in catalog (weatherspark re-run) | Catalog builder had no null-guard on `from_url` | FIXED: null-guard in S1 + normalize.js (commit 05baac6) |
| run_165105 incident | Duplicate-window docs_python run contaminated by a gutenberg artifact sweeping through SHARED `vision/storage/outputs` | Concurrent pipelines share one outputs dir even with distinct run dirs | Guard caught it (rejected as site-14 evidence); sequential-only rule proven load-bearing |

**Lesson:** the system could not originally tell *which site its own results
belonged to*. Every guard now exists because a specific incident proved the
need; none was added speculatively.

### 1c. Provider-quota class

| Defect | Symptom | Root cause | Disposition |
|---|---|---|---|
| #21-class | S4 returned starved/no JSON on ox-alpha (reasoning consumed token budget) | reasoning=high burned FUSION_MAX_TOKENS=1500 before emitting JSON | FIXED: reasoning=low + 4000 tokens |
| Quota incident (mutation r3) | Last 3 variants fused=NO_REPORT mid-campaign | ox-alpha key = 1000 req/DAY global, not near-unlimited | Honest NO_REPORT rows; overnight_scheduler gates on key endpoint |
| Groq dead / TPM pacing | gpt-oss burned budget in reasoning channel; 8k TPM made runs uneconomical | Per-model free-tier buckets | Round-4 SKIPPED-after-3-rounds honesty rule for dead variants |
| A6 backlog | 429 storms handled ad-hoc per call site; deterministic fallback masked degradation | No shared rate limiter | Partially mitigated (llmProvider 429 wait-and-retry ×6 honoring provider delay); shared limiter still OPEN |

**Lesson:** quota failures must produce *distinguishable artifacts*
(NO_REPORT, quota-blocked log markers), never silent degradation — this held.

### 1d. Executor-vocabulary class (the pipeline couldn't SAY what it meant)

| Defect | Symptom | Root cause | Disposition |
|---|---|---|---|
| #14 | fill steps executed via click path (CURA) | Executor predated fill support | Real fill branch + value-persisted verification |
| #15 | fill timed out 40 s on readonly display box | Readonly box clustered as editable | Readonly probe → fast honest FAIL |
| #16 | Valid select_option rejected invalid_action (GlobalSQA) | Validator vocabulary predated new action | select_option added across validator/prompt/executor |
| #12 | select_option hung on missing option text | Strict option-text matching | First-available-option fallback |
| #20 | FT executor crashed `catalog is not defined` resolving behavior refs | CATALOG_INDEX.elements is a Map | FIXED (iterate .values()) |
| #17 | UUID ids → querySelectorAll SyntaxError | CSS ids cannot start with digits | [id="..."] attribute-form selectors |
| #10/#11 | parseAction died on unescaped attr quotes / inline fences | Reasoning-model JSON quirks | Repair ladder (de-fence, attr-quote normalize, greedy brace match) |
| F-04 | **parse_failed silently became `done`** — malformed LLM output terminated exploration looking successful | llmClient returned action:'done',reason:'parse_failed' | Design fix specified (PARALLEL_SPEC D4); code-level fix landed by serial-C — see §3 |

**Lesson:** executor/validator/prompt vocabularies must be defined ONCE and
shared; every "new action" bug was the same bug in three places.

---

## 2. What the architecture got right

1. **Honest failure taxonomy end-to-end.** FT results carry a deterministic
   classification (`fusion_generation | catalog_grounding | target_resolution |
   browser_execution | semantic_verification`) with per-step failure stages,
   screenshots, and warnings. AUDITOR-3 independently recomputed every headline
   number from raw artifacts and they reproduced EXACTLY — the arithmetic was
   never the problem; the *inputs' identity* was.
2. **Domain assertions (the contamination guards) actually caught live
   failures.** `assertCatalogDomains` + `assertVisionStartUrls` rejected
   run_165105 (gutenberg artifact in a docs_python tree) within seconds during
   real operations, and validated clean runs positively. Guards were written
   AFTER the audit found the wound, but they fired correctly the very next
   time the wound tried to reopen.
3. **Grounding validator rejections over silent acceptance.** S4 rejects
   un-groundable candidates (step refs must exist in catalog, URLs must be
   exact page_keys, duplicate-of-existing rejection, executability filter).
   CURA's readonly-box FT003 failed honestly instead of passing vacuously.
4. **Mutation study told the truth against itself.** The system's own
   scorecard proved it "verifies actions-work, not values-correct" (wrong_calc
   passed 4/4 through a phantom-$10 total). Publishing your own weakest
   result as the headline research finding is the strongest integrity signal
   in the whole campaign.
5. **Evidence discipline.** Raw responses persisted (`fusion_raw_response.txt`),
   per-step screenshots, provenance arrays in dashboard data, append-only
   report rewrites ("old numbers kept verbatim below"), quarantine kept on disk
   as evidence rather than deleted.
6. **Coordination culture converged under fire.** After two duplicate-launch
   incidents, the board converged on claims-before-work, human-directive
   verbatim relay, per-site ownership, and lock discipline — the same day.

---

## 3. Minor fixes applied NOW (code-level, low-risk, suite-verified)

Each fix: separate commit, offline suites green, one comms line on TASK_BOARD.

| Fix | File(s) | Status |
|---|---|---|
| pageKey null-guard in S1 catalog builder (DEFECT #23) | `fusion/s1_build_catalog.js`, `fusion/lib/normalize.js` | ALREADY DONE — commit `05baac6` (cited, not redone) |
| PID-liveness check for stale `.campaign.lock` | driver lock acquisition paths | see commit below |
| parse_failed NEVER converts to done | `web/src/llmClient.js` | see commit below |
| Explicit-path-only commits note | process note, this file + board | noted |

### 3a. PID-liveness for stale `.campaign.lock`

The audit itself was blocked for hours by a lock whose holder (PID 18592) was
long gone, and a later window found "stale .campaign.lock (PID 25664 dead)".
A lockfile containing a dead PID should be stolen loudly, never honored.
Implemented in the acquisition path of the rerun drivers: read pid, probe
liveness, steal+log if dead, abort only if genuinely alive.

### 3b. parse_failed no longer masks as done

Verified current behavior first: `web/src/llmClient.js:136` still returned
`{action:'done', reason:'parse_failed'}` — confirming AUDIT F-04 /
PARALLEL_SPEC D4. Downstream (`web/explore.js` decideAction, `web/src/engine.js`)
treat any non-matching/unchosen decision via the deterministic-fallback path,
so returning `action:'parse_failed'` preserves behavior where untried
candidates exist (fallback still fires) while making the termination reason
honest when exploration truly ends on garbage output — no longer
indistinguishable from a legitimate `done`.

---

## 4. Major changes REQUIRING USER APPROVAL (design only — NOT implemented)

1. **Value/assertion-oracle synthesis** (answers the mutation ceiling).
   Summary of the design direction: expected-value predicates attached to test
   objectives AT GENERATION TIME — S4 context carries per-gap capability flags
   (readonly/editable/type), candidates propose assertions of form
   `{target, property, expected}` (input echo, URL change, count delta, state
   toggle); executor gains an assertion-evaluation stage ABOVE the current
   verification ladder; PASS requires ≥1 STRONG or value assertion;
   `PASS_WEAK` class for body-text-only passes excluded from headline rates
   (PARALLEL_SPEC D5 gate). Touch points: `fusion/s4_context.js`,
   `fusion/execute_fusion_tests.js`, `vision/src/executeTests.js`,
   `fusion/s8_campaign_eval.js`. This changes headline pass rates DOWNWARD for
   some sites — that is the point, and why it needs sign-off.
2. **Dynamic ports for the vision stack** (T103 D1 + T102 item 5):
   replace `freeVisionPorts()` (which actively taskkills concurrent pipelines'
   services) with allocation-from-base + bind-hold; env plumbing already
   exists end-to-end; bundle with the shared runtime-lock work as one reviewed
   change.
3. **Identity reconciliation across A/B spaces** (backlog A5): same page +
   normalized-label + compatible type-map → `likely_same` marking WITHOUT
   merging; would convert the "common elements ≈ 0 everywhere" artifact into
   honest overlap estimates. Conservative-by-default; touches S1/S2 semantics
   and therefore every downstream number once enabled.

---

## 5. Ranked recommendations for post-campaign architecture work

1. **One mutex for everything + dynamic ports** (D2+D3 then D1): closes the
   entire attribution-corruption class mechanically rather than by discipline.
   ~3 h + half day. Highest trust-per-effort.
2. **Fail-loud parse quality** (D4, now started) + manifest schema fields:
   finish the 25% parse-quality gate so degraded runs are visible in INDEX.
3. **Verification-strength gating in s8** (D5): PASS_WEAK exclusion from
   headline rates; recomputable decomposition of every PASS.
4. **Value-oracle synthesis** (§4.1): converts the mutation finding from a
   documented ceiling into lifted capability. Largest research impact.
5. **SPA extraction** (A4) before any Tier-4-class site: role-attribute
   selectors, scroll-and-settle, hash-aware fingerprints.
6. **Shared rate limiter** (A6): token-bucket in lib/llmProvider across
   A/B/Fusion children; telemetry counter in summaries.
7. **Recorded-login replay propagation** (A7): catalog behaviors → FT executor
   auto-login, removing the seed-only regression path.
8. **Identity reconciler** (A5, §4.3): after 1–4 stabilize the numbers.
9. **Board/tooling hygiene**: per-agent worktrees, script-based board row
   edits, UTC timestamps, quota ledger — earned suggestions from the field.

---

*[PENDING 11-20] Final Tier-2 aggregates (FT pass, fusion-attributable mean,
per-site verdicts for #17–#20) to be inserted here from regenerated s8 output
once all four clearance runs complete. This retrospective is not citable until
that block lands.*

— serial-C, 2026-08-25
