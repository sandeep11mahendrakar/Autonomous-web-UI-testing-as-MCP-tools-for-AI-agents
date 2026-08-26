# STUDENT_NOTES.md — Owner's Master Notes

> **Purpose:** the ONE file that lets you answer any interview/viva question
> about this project. Every number traces to a raw artifact (see
> `docs/RESEARCH_DATA_PACK.md`); every claim here was gate-audited.
> Read top-to-bottom once, then use as a lookup.
>
> Project: **AI-Assisted Dual-Perception Web UI Test Generation & Fusion**
> (Team 101, PES University capstone). Frozen at tag `campaign-v2-end`.

---

## 1. Architecture Walkthrough

### 1.1 The big idea

Two INDEPENDENT agents explore the same website with different perception
modalities, then a fusion layer merges what each saw into a stronger test
suite than either could produce alone:

```
                    ┌──────────────────────────────┐
   URL ────────────►│  runBoth.js (unified runner) │  one URL -> ONE run ID
                    └──────────┬─────────┬─────────┘
                     ┌─────────▼──┐   ┌──▼──────────┐
                     │ Arch A web/│   │ Arch B vision/
                     │ DOM + LLM  │   │ screenshot-> │
                     │ loop       │   │ YOLO+OCR     │
                     └─────────┬──┘   └──┬──────────┘
              runs/<id>/dom/*  │         │  runs/<id>/vision/*
                     ┌─────────▼─────────▼─────────┐
                     │ FUSION chain (fusion/)      │
                     │ S1 catalog -> S2 gaps ->    │
                     │ S4 LLM synthesis -> FT live │
                     │ execution -> S6 dashboard   │
                     └─────────────────────────────┘
```

### 1.2 Architecture A — "DOM" (`web/`)

- **Perception:** Playwright drives a real browser; `domExtractor` pulls
  interactable elements (deduped, meaningful-only filter) into a compact DOM
  summary.
- **Brain:** an LLM action loop (`web/src/llmClient.js`). Each step the LLM
  receives current state + history and returns a JSON action
  (click/fill/navigate/scroll/done). `parseAction()` repairs malformed JSON;
  since fix `2ed3d91` a total parse failure returns honest `parse_failed`,
  never a fake `done`.
- **Output:** `runs/<id>/dom/{states.json, transitions.json, memory_log.json,
  test_cases.json}` — selector-grounded tests (CSS selectors that actually
  resolve).
- **Guard:** external-domain guard blocks candidate navigates off-target;
  records blocked hops honestly.

### 1.3 Architecture B — "Vision" (`vision/`)

- **Perception pipeline:** full-page screenshot → **YOLO11 ScreenParser**
  (`screenparser_best.pt`, torch/ultralytics) detects UI elements visually →
  **Tesseract OCR** reads text → merged "visual DOM" with element boxes,
  labels, confidences.
- **Tests:** coordinate-based tests whose targets are RE-DETECTED live before
  clicking (not blind coordinates). Step timeout 15 s
  (`executeTests.js:288`), navigation timeout 45 s, gateway health probe 3 s.
- **Services** (auto-started by `vision/src/serviceManager.js`, ports fixed):

| Port | Service | Role |
|---|---|---|
| 5000 | gateway | entry point / orchestrator |
| 5001 | yolo-service | element detection (heavy model load) |
| 5002 | ocr-service | text recognition |
| 5003 | merge | fuses YOLO boxes + OCR text |
| 5004 | browser-service | holds live Playwright pages |

- **Verification ladder:** status starts PASS; specific checks flip it.
  STRONG = verified input_value / checked_state / dropdown_option_selected /
  scroll_position; MEDIUM = state change; WEAK = body-text >100-chars
  heuristic. Rubric single-source: `testing/vision_test_quality.js`.

### 1.4 Fusion layer (`fusion/`)

| Stage | File | What it does |
|---|---|---|
| S1 catalog | `s1_build_catalog.js` + `lib/normalize.js` | merges A+B observations into one catalog (pages keyed by URL, elements deduped by page+type+label) |
| S2 gaps | `s2_gap_report.js` | finds conflicts (same label, different type) and coverage gaps each architecture left |
| S4 synthesis | `lib/s4_validate.js`, `lib/s4_context.js` | LLM composes NEW tests targeting gaps, strictly grounded in catalog facts; validator rejects `cross_page_ref`, `action_mismatch`, duplicates |
| FT execute | `execute_fusion_tests.js` | runs accepted fusion tests LIVE on the site, records per-step evidence (target_url, after_url, verification method) |
| S6 dashboard | `s6_dashboard.js` | emits `dashboard_data.json` (schema_version 1): headline stats, coverage matrix, architecture comparison |
| S8 aggregate | `fusion/s8_campaign_eval.js` | campaign-wide rollup → `testing/CAMPAIGN_EVALUATION.md` (zero LLM, regen-able) |

**Key metric — fusion-attributable %** =
share of a site's final test suite CREATED BY THE FUSION LAYER
(`dashboard_data.json.headline.pct_final_tests_attributable_to_fusion`).

### 1.5 Data flow of one run (memorize this)

```bash
node runBoth.js <url>
#  -> creates runs/run_<YYYYMMDD_HHMMSS>/  (ONE run id)
#  -> A explores  -> dom/ artifacts
#  -> B explores  -> vision/ artifacts (provenance-filtered collector)
#  you then run the post-chain:
node testing/rerun_quarantine.js post <site-key>   # or equivalent driver
#  -> S1 -> S2 -> S4 -> FT -> S6
#  -> GUARDS: run_attribution findRunDir + assertCatalogDomains +
#             assertVisionStartUrls + folder_purity (must be PURE)
#  -> extract_run.js snapshots numbers -> report + INDEX row
```

### 1.6 The integrity gates (why our numbers are trustworthy)

1. **findRunDir attribution** — matches run dir by birthtime AND manifest
   URL; never "newest dir".
2. **assertCatalogDomains** — catalog page_key hosts must ⊆ target host.
3. **assertVisionStartUrls** — every B exploration start_url must match the
   manifest domain.
4. **folder_purity.js** — 4-check verdict that a run dir contains ONLY
   artifacts belonging to its manifest URL (flags vacuous passes loudly).
5. **provenanceGuard** (`lib/provenanceGuard.js`) — collector-level auto-
   reject of foreign `test_cases_*` / `execution_results.json`
   (`CONTAMINATION_REJECTS.json` evidence).

---

## 2. Exploration End-to-End (with real examples)

### 2.1 Architecture A loop (concrete)

On SauceDemo (`run_20260823_225906`): A logged in with on-page credentials,
walked 8 steps across 2 URLs, produced 3 selector-grounded tests; FT ran 3,
2 PASSED (one honest fail). Termination is an explicit LLM `done` action or
budget cap (`MAX_STEPS=25 MAX_STATES=20` trimmed env for campaigns;
mega-DOMs later got `ARCH_A_TIMEOUT_MS=1500000`).

### 2.2 Architecture B loop (concrete)

Same site: B screenshots the login page, YOLO detects username/password/
button boxes, OCR reads their labels, merge produces the visual DOM. Replay
re-detects each target live before acting. On guru99 bank (#36) B's replay
achieved a STRONG `input_value` verification — the strongest B signal of
Tier-3.

### 2.3 Fusion composing something neither had (the money story)

Hacker News (`run_20260825_234052`): A timed out at 900 s with 0 tests.
B perceived 17 entries / 9 pages. S4 composed **8 tests, all novel** —
100% fusion-created suite. FT went 1/8: seven fails shared ONE root cause
(S4 navigated bare `/item` without `?id=` param → empty page → honest
selector_not_found). Lesson: fusion value survived total A-failure, but
parameterized-href resolution became a V2 item.

WeatherSpark (#16): B produced 0 tests (canvas blind spot) yet fusion hit
100% attribution from A-side perception — the mirror image. Together these
prove complementarity in BOTH directions.

### 2.4 Honest failures are data

- archive.org: JS-bootstrap rendered nothing pre-hydration → catalog 76 el /
  2 pages → S4 offered 0 → executor REFUSED to run an empty suite. Recorded
  as honest thin-run, not fabricated green.
- Open Library: 9 js-nav ERR_ABORTED warnings, connection-reset outage window
  → FT 0/7 recorded honestly, never retried into green.

---

## 3. MCP Server Internals (fork repo, branch `vision-standalone`, tag `v1.0.0-mcp`)

- **Transport:** JSON-RPC 2.0 over stdio. Harness:
  `mcp/verify_roundtrip.js` (initialize → tools/list → call).
- **Five tools:**

| Tool | Status | Behavior |
|---|---|---|
| `explore_site(url)` | wired | spawns `runVision --explore`, streams logs as notifications, returns run_id + summary from `<run_id>_exploration_result.json` |
| `get_visual_dom(run_id, state?)` | wired read-only | serves visual DOM from stored artifacts |
| `list_tests(run_id)` | wired read-only | lists generated tests |
| `get_evidence(run_id, test_id)` | wired read-only | per-test step evidence + screenshots |
| `run_test(...)` | stub `-32006` | needs live browser + campaign lock |

- **Typed error taxonomy:** `-32001` run_not_found · `-32002` test_not_found
  (returns known_ids) · `-32003` STAGE_FAILED (with log tail) · `-32005`
  BUSY · `-32006` not-implemented-stub. Verified against REAL failures
  (e.g., YOLO traceback surfaced cleanly when weights were missing).
- **Known gotcha:** `screenparser_best.pt` in git is a 134-byte LFS POINTER;
  copy the real ~153 MB file locally or YOLO dies UnpicklingError.
- **Design constraints identified** (`docs/MCP_READINESS.md`): wall-clock
  budgets per tool call, cancellation propagation, map stage failures onto
  typed errors, resumability purely from run ids, serialize tools under a
  lockfile (single-user mode skips queueing).

---

## 4. Complete Tech Stack

| Layer | Technology | Where / why |
|---|---|---|
| Orchestration | Node.js (no framework) | `runBoth.js`, drivers (`tier3_w*.cjs`, `night_chain.js`, `rerun_quarantine.js`) |
| Browser automation | Playwright | BOTH architectures drive Chromium |
| A-side brain | LLM JSON action loop | `web/src/llmClient.js` |
| Object detection | YOLO11 via torch + ultralytics (Python) | `services/yolo-service/`, port 5001 |
| OCR | pytesseract + system Tesseract binary | `services/ocr-service/`, port 5002 |
| Micro-services | lightweight HTTP servers | gateway 5000 / merge 5003 / browser 5004 |
| Fusion analytics | pure Node, deterministic, zero-LLM regen | `fusion/s1..s8` |
| Testing | `node --test` | 157/157 offline suites green |
| LLM providers | OpenRouter `stealth/ox-alpha` primary (~1000 req/day GLOBAL, resets 05:30 IST) · Groq gpt-oss-120b/20b per-model buckets (200k TPD) · Zen gateway last-resort | keys live ONLY in untracked `.env`; `FUSION_LLM_REASONING=low`, `FUSION_MAX_TOKENS=4000` required for S4 |
| MCP | JSON-RPC 2.0 stdio server | fork repo `vision-standalone` |
| Artifacts/versioning | git LFS for model weights; JSON everywhere; deterministic markdown regen | `INDEX.md`, `CAMPAIGN_EVALUATION.md`, `VISION_TEST_QUALITY.md` |
| Charts | zero-dependency SVG generator | `scripts/generate_graphs.js` → `docs/artifacts/*.svg` |

---

## 5. Defect Ledger — 25 defects as stories (symptom → root cause → fix)

Sources: PROJECT_MEMORY ledgers, docs/AUDIT_REPORT.md (F-series),
RETROSPECTIVE_TIER2/TIER3, RESEARCH_DATA_PACK §6.

### Tier-1 hardening era (#1–#19, condensed — full list in PROJECT_MEMORY)

During sites 1–10 we fixed 19 pipeline defects; representative classes:

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| #1–4 | Login flows unreachable; wrong elements clicked | naive DOM extraction noise | meaningful-element filter + dedup in `domExtractor` |
| #5–7 | Tests referenced selectors that didn't exist | auto-generated selectors unstable | UUID-id selector handling; selector grounding rules |
| #8 | SPA pages "empty" | networkidle never fires on SPAs | networkidle fallback wait strategy |
| #9 | Navigation loops on routed apps | URL compare exact-match failed on hash routers | hash-router-aware URL comparison |
| #10 | A wandered off-site mid-exploration | no policy on outbound links | external-domain guard (candidate navigates), A-side |
| #11–17 | misc crashes/timeouts/flaky waits | various | each fixed same-session, suite-gated (campaign rule: never carry silent breakage forward) |

### The named defects (#20–#25)

**#20 — behavior-ref executor crash.** *Symptom:* FT executor crashed on
behavior-referencing tests. *Root cause:* behavior-ref resolution path
unhandled. *Fix:* resolver implemented + regression test (PROJECT_MEMORY
L248). Now load-bearing: behavior refs power cross-arch composition.

**#21 — reasoning-token starvation → invalid JSON.** *Symptom:* provider
returned truncated/invalid JSON mid-campaign; pipelines starved. *Root
cause:* stealth-model burned ~1500 visible reasoning tokens before any JSON.
*Fix:* mandatory env `FUSION_LLM_REASONING=low` + `FUSION_MAX_TOKENS=4000`;
provider-level wait-and-retry on 429s.

**#22 — run-attribution corruption (THE big one).** *Symptom:* Tier-2 rows
16–20 published results for the WRONG websites (saucedemo/demoblaze data
labeled as weatherspark etc.). *Root cause:* three concurrent workloads
(tier-2 chain + mutation study + repeatability study) overnight; collectors
attributed fusion artifacts to whatever run dir was newest; shared
`vision/storage/outputs` let artifacts stitch across sessions (mtime-window).
*Fix:* adversarial audit caught it (F-01/F-02 CRITICAL); ALL 8 affected rows
quarantined and re-run behind birthtime+manifest-URL attribution
(`findRunDir`) + catalog-domain + start-url guards; concurrency banned
(one-pipeline rule S0.3); old runs kept on disk as evidence.

**#23 — null page_key phantom page.** *Symptom:* catalog contained a page
whose key was the literal string "null". *Root cause:* null/undefined
`from_url` stringified during catalog build. *Fix:* null-guard in
`s1_build_catalog.js` with `skippedNullPage` counter (verified fixed; caught
by folder_purity tooling).

**#24 — collector provenance scope gap.** *Symptom:* foreign
`test_cases_*` / `execution_results.json` kept sweeping into concurrent-run
folders even after other guards existed (hit magento→eviltester,
globalsqa→techlistic, globalsqa→w3schools). *Root cause:* collector copied
by mtime-window without checking artifact origin. *Fix:* `provenanceGuard`
@ `97a29cb` — auto-reject foreign-host artifacts at collect time
(`CONTAMINATION_REJECTS.json` evidence) + 12 regression tests (suites
155/155). Verified live against a real leaked bbc artifact.

**#25 — href-goto external-navigation bypass (defect CANDIDATE).**
*Symptom:* on practica (#35) A genuinely navigated to foreign `luma.com`.
*Root cause:* `web/src/llmClient.js executeAction()` click branch follows
absolute hrefs via direct `page.goto()`, bypassing the external-domain guard
that only wraps candidate-based navigates. *Fix:* PARKED mid-campaign
(no-pipeline-changes decision); documented direction: wrap the href-follow
path in the same policy guard + regression test using the luma.com repro in
`runs/run_20260826_003258`.

### Audit-driven minors (also part of the story)

- `cc5e088`: PID-liveness stale-lock steal (dead-PID `.campaign.lock`
  stolen loudly as evidence).
- `2ed3d91`: `parse_failed` honesty (#F-04) — never mask parse death as
  graceful `done`.
- duplicate-post WARNING on re-chained run dirs (idempotency).
- `0df6786`: folder_purity Check-1 can no longer pass VACUOUSLY when
  `exploration_summary.json` is missing; provenanceGuard warns explicitly on
  url-less artifacts instead of silent fail-open.
- `97a29cb`-lineage lesson (bbc row 27, audit F7-01): chaining a PRE-GUARD
  folder defeats any guard — pull ≥ guard commit BEFORE chaining hand-offs.

---

## 6. Campaign Methodology — and why tiered

### The ladder (difficulty ramp)

| Tier | Sites | Why this tier exists | Result |
|---|---|---|---|
| Tier 1 (1–10) | purpose-built demo apps (SauceDemo, Demoblaze, Juice Shop…) | stable + forgiving: prove the PIPELINE correct | 9 scored + 1 bot-walled; 19 defects found & fixed here |
| Tier 2 (11–20) | small real-world sites (docs.python, Gutenberg…) | messy DOMs, ads, banners: prove robustness | all cleared post-decontamination; contamination incident + cure |
| Tier 3 (21–30) | popular consumer sites (wikipedia, github, hn…) | bot detection, heavy JS: find breaking points | blocked-IS-data culture born; mega-DOM budget fix |
| D11 batch (31–40) | QA-practice targets + spares | replace blocked rows; validate budget fix | 4 clears; repeatability datapoint (#38/#39 identical shapes) |

### Pre-registration (say this in interviews)

Tier-3 success criteria were WRITTEN DOWN BEFORE LAUNCH
(`testing/CAMPAIGN_PLAN.md`): ≥6/10 complete pipelines; blocking logged per
site; ZERO ToS violations; A/B degradation reported as FINDINGS not failures;
fusion-% carries denominator caveat wherever A timed out. Policies frozen:
read-only public pages only, realistic Chrome UA only (no stealth stack),
consent auto-dismiss recorded in manifest, CAPTCHA/bot-wall ⇒ honest BLOCKED,
no logins/posts/purchases/infinite-scroll abuse.

### Identical per-site protocol (comparability)

`runBoth <url>` → S1→S2→S4→FT→S6 → attribution guards MUST be green →
folder_purity PURE → numbers ONLY via extract_run.js → TEMPLATE report →
INDEX row → regen VTQ + s8 → suites green → commit (explicit paths) → push.

### Why tiered?

Ramp risk: correctness first (demo apps forgive), then robustness (real DOMs),
then adversarial environments (bot walls) where BLOCKED is valid DATA. It also
isolated variables: Tier-1 defects were pipeline bugs; Tier-2's were
evaluation-integrity bugs; Tier-3's were environment/budget bugs. Each tier's
fixes hardened the next.

### Evaluation integrity (our methodological contribution)

Multi-agent evaluation pipelines sharing run directories suffer mtime-window
artifact stitching. An adversarial audit caught 5 wrong-site + 3
localhost-replay rows; remediation (attribution + purity gates) then caught
4+ further instances DURING concurrent operations with zero contaminated rows
published. Defect ledger #20–#24 documents the class; guard `97a29cb` closes
it at collect time.

---

## 7. Top 20 Likely Interview Questions (with answers)

**Q1. What does the project do in one sentence?**
Two independent AI agents explore websites through different perception
channels (DOM vs vision), and a fusion layer merges their findings into
test suites stronger than either alone — evaluated across 40 real websites
with an audited, contamination-free ledger.

**Q2. Why TWO architectures?**
Complementary blindness. A misses canvas/visual layouts; B misses semantic
selectors and forms. Data: B sees ~19× more elements (170.6 vs 8.8 mean), A
generates more behaviors/tests. Neither volume predicts usefulness — fusion
arbitrates.

**Q3. What is "fusion-attributable %"?**
Share of a site's final executed suite created by the fusion layer
(S4-composed, not replayed from A/B). Campaign mean 48.7% over the
decontaminated 19-row ledger (45.9% if the site-moved lambdatest row is
excluded — denominator always stated).

**Q4. Walk me through one pipeline run.**
See §1.5. One URL → one run ID → A explores DOM w/ LLM action loop → B
explores screenshots w/ YOLO+OCR → fusion chain S1/S2/S4/FT/S6 → four
integrity gates → report + INDEX row.

**Q5. Your biggest failure? (Say the contamination incident.)**
Overnight concurrency caused mtime-window stitching: 5 Tier-2 rows tested
wrong sites. An adversarial audit we commissioned caught it; we quarantined,
re-ran everything behind birthtime+manifest-URL attribution, built
folder_purity + provenanceGuard, and the strengthened gates then caught 4+
recurrences during Tier-3 with zero bad rows published.

**Q6. How do you know your numbers aren't contaminated now?**
Four independent gates (findRunDir, assertCatalogDomains,
assertVisionStartUrls, folder_purity) plus collector-level provenanceGuard;
five audits including an independent recomputation from raw artifacts
(aggregates matched exactly); freeze tag contains the remediated ledger.

**Q7. What did the mutation study prove?**
The verification ceiling: the system verifies ACTIONS-WORK, not VALUES-CORRECT.
A seeded wrong-calculation bug was fully exercised (FT 4/4 PASS on the buggy
cart) yet undetected — because there are no assertion/value oracles. That's
the #1 V2 item.

**Q8. What is STRONG/MEDIUM/WEAK?**
Verification-strength rubric on B-side replays: STRONG = verified input
values/checked state/dropdown selection/scroll position; MEDIUM = state
change; WEAK = body-text heuristic. Final rubric: 62 executed, 48 PASS (77%),
33 STRONG / 25 MEDIUM / 4 WEAK.

**Q9. Tell me about a time the system found a real bug.**
OWASP Juice Shop: discovered a public `/ftp/legal.md` exposure autonomously.
Also phptravels' demo silently redirecting to a demoblaze mirror — reproduced
deterministically via validator rejections on the clean re-run.

**Q10. How did you handle sites that block bots?**
Policy: realistic Chrome UA only, no stealth plugins, CAPTCHA ⇒ skip. Five
sites blocked (stackoverflow 403, imdb 202 bot-check, goodreads blank-render,
npmjs 403, reddit login-wall, magento CF-526) — each probed multiple times
with evidence trails and recorded as BLOCKED rows. Blocked IS data; zero
quota wasted forcing unwinnable sites.

**Q11. Why did some sites score 0% fusion but still count as successes?**
archive.org: JS-bootstrap rendered nothing before hydration → S4 honestly
offered 0 → executor refused to run an empty suite. Honest zeros beat
fabricated greens; the refusal path is deliberate design.

**Q12. Explain the hackernews result.**
100% fusion-created suite while A scored zero (timeout). FT 1/8 with all 7
fails traced to ONE root cause (bare `/item` navigation missing `?id=`).
Shows fusion resilience to A-failure AND gave us a precise V2 fix
(parameterized-href resolution).

**Q13. What is folder_purity and why do you need it?**
A 4-check verdict that a run directory contains only artifacts belonging to
its manifest URL. Needed because shared storage + concurrent launches can
stitch foreign artifacts into a folder; it caught 4 contamination attempts
in production. We even patched it so it can't pass vacuously when its input
is missing.

**Q14. How does S4 avoid hallucinating tests?**
Strict grounding: candidates must reference real catalog elements; validator
rejects cross_page_ref (element lives on another page), action_mismatch,
and duplicates of existing A/B tests. Rejection reasons are recorded per
test.

**Q15. What's the MCP server?**
A JSON-RPC-over-stdio server exposing the vision pipeline as 5 tools
(explore_site, get_visual_dom, list_tests, get_evidence, run_test-stub) with
a typed error taxonomy (-32001/-32002/-32003/-32005/-32006), so any MCP
client can drive explorations and read artifacts without touching the repo.

**Q16. Tech stack, quickly.**
Node orchestration + Playwright browsers; Python side: YOLO11 (torch/
ultralytics) + Tesseract OCR as HTTP microservices on ports 5000–5004;
deterministic zero-LLM fusion analytics; `node --test` suites (157/157);
LLMs via OpenRouter/Groq with strict .env hygiene; git LFS for weights.

**Q17. How did you manage LLM costs/quota?**
Free-tier reality: ox-alpha ~1000 req/day GLOBAL (resets 05:30 IST), Groq
200k TPD per model as per-model fallback. Trimmed budgets (MAX_STEPS=25,
MAX_STATES=20), mega-DOM timeout raise to 25 min (D7/D8(b)) validated in
production on guru99, pacing via provider retry, STUB_LLM for dry-runs.

**Q18. What would you build next? (V2 roadmap.)**
Value-oracle synthesis (make green MEAN correct), dynamic ports +
session-scoped storage (structurally end stitching), href-guard fix (#25),
parameterized-href resolution, SPA hydration wait, A/B identity reconciler.
Full ranked list: `docs/V2_ROADMAP.md`.

**Q19. How was work divided / how did agents coordinate?**
Multi-agent setup with a task board as single source of truth: expiring
claims, one-pipeline-at-a-time lockfile, board edits scripted, verbatim
directive relay, earliest-landed-claim arbitration, and an independent
auditor role that verified everything from RAW artifacts rather than trusting
workers.

**Q20. What are the honest limitations?**
No assertion oracles (green ≠ correct); single-run dominance except
designated repeats (one repeatability study was methodology-contaminated and
disclosed as such); quota-driven exploration budgets; Windows-leaning ops
(taskkill, hardcoded Tesseract path — port assessed EASY-MEDIUM, deferred);
token usage for Tier-1 unrecorded. All disclosed in the paper §limitations
and RESEARCH_DATA_PACK §5.

---

## 8. Numbers Cheat-Sheet (memorize these)

### Headline (Tiers 1–2 decontaminated, gate-audited)
```
Sites attempted 20 (19 scored; OpenCart bot-walled)
Full A+B pipelines completed      13
Fusion offered / accepted         86 / 60 (all grounded)
FT live executed                  60
FT PASS                           37  (61.7%)
Mean fusion-attributable          48.7% (n=19; 45.9% n=18)
Novel targets exercised           95
Vision rubric                     62 exec / 48 PASS (77%) / 33 STRONG · 25 MED · 4 WEAK
A-vs-B means (n=18)               elements 8.8 vs 170.6 (~19x) · tests 2.7 vs 0.9
                                  states 7.8 vs 5.9 · behaviors 9.0 vs 6.0 · targets 5.4 vs 4.3
```

### Campaign totals (40 sites)
```
Census        40 = 39 numbered INDEX rows + DemoQA reference (#2)
Dispositions  29 cleared/scored · 7 blocked-honest · 4 DO-NOT-CITE
Tier-3 clears FT aggregate     29 exec / 14 PASS (48%) rows 21-30
D11 batch     13 exec / 12 PASS (92%) — audited figure (was misprinted 13/17)
Best clears   lambdatest 100% fus 4/5 FT · WeatherSpark 100% fus 5/8 ·
              globalsqa hub 7/8 FT fus 66.7% (17 novel targets) ·
              hackernews 100% fusion-created · wikipedia 87.5% fus
Suites        157/157 offline PASS
Audit record  5 passes, 0 open findings; freeze tag campaign-v2-end
Defect ledger #1-#25 (stories above); guards: 97a29cb, 0df6786, cc5e088, 2ed3d91
Wall-time example numbers: STEP_TIMEOUT_MS 15000 · nav 45000ms · ARCH_A_TIMEOUT_MS 1500000
```

### One-line zingers
- "B sees 19× more elements; A asks 3× more questions — fusion needs both."
- "Our strongest security finding (Juice Shop /ftp) came from an agent
  exploring, not from a human hint."
- "Every number in the paper regenerates deterministically from raw JSON."
- "We froze the dataset only after an auditor who never trusted us verified
  it from raw artifacts."

— Compiled by SUB-MASTER (F-07), 2026-08-27. Sources: docs/RESEARCH_DATA_PACK.md,
PROJECT_MEMORY.md, testing/TIER2_MEGA_REPORT.md, testing/D11_FINAL_BATCH_MEGA_REPORT.md,
docs/RETROSPECTIVE_TIER2.md, docs/RETROSPECTIVE_TIER3.md, docs/AUDIT_REPORT.md,
docs/MCP_READINESS.md, docs/RESEARCH_PAPER_FINAL.md, testing/CAMPAIGN_PLAN.md.
