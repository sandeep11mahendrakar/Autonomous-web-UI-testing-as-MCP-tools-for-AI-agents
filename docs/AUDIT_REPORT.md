# AUDIT_REPORT.md — Independent Adversarial Audit (AUDITOR-3)

**Project:** AI-assisted web UI test generation (Team 101, PES University)
**Repo:** `C:\Users\sandeep\pes\vs code\Capstone-Project`, audited on branch state
`vision-final-work-2026-08-25` (working tree of 2026-08-25 ~15:30 IST; several
ledger files had uncommitted worker edits — noted where relevant).
**Auditor:** AUDITOR-3 (independent, read-only except this file +
`docs/audit_evidence/`). All findings below were recomputed from RAW artifacts
under `runs/<id>/`, not from derived markdown.

---

## Executive verdict

The campaign's *arithmetic* is trustworthy and its honesty culture is real:
every aggregate number in `CAMPAIGN_EVALUATION.md` that I recomputed from raw
artifacts (FT 49 executed / 35 PASS / 14 FAIL, fusion 70 offered / 49 accepted,
A-vs-B means over n=19, mean fusion-attributable 41.2%, total wall time 219.5
min) reproduces **exactly**, and failures are classified honestly wherever the
pipeline actually ran on the intended site. However, the audit found **CRITICAL
data contamination**: 5 of the 19 scored sites (Tier-2 #16 WeatherSpark,
#17 SahiTest, #18 Internet-status-codes, #19 PHPTravels, #20 Open Library) are
registered against unified runs whose raw manifests, exploration logs, catalogs
and FT step URLs prove they **executed against different sites**
(saucedemo.com / demoblaze.com / localhost mirrors) because three workloads
(tier-2 chain, mutation study, repeatability study) ran **concurrently
overnight** and the chain attributed fusion artifacts to whatever run directory
was newest. Site reports then wrapped these artifacts in plausible,
site-specific narratives ("canvas invisible to OCR", "legacy frames") that the
raw data does not support. Until those five rows are quarantined and re-run,
the Tier-2 headline ("fusion value explodes on real sites", 41.2% mean
attribution, 70% FT pass) is built partly on wrong-site data. Verdict for
production use: **NOT-READY** (see Audit F).

---

## Findings table

| ID | Audit | Severity | Description | Evidence |
|---|---|---|---|---|
| F-01 | A/D | **CRITICAL** | Registered runs for Tier-2 sites #16–#20 executed against the WRONG sites. run_…_062152 (claimed WeatherSpark) explored saucedemo.com; run_…_063248 (SahiTest) = saucedemo.com; run_…_064713 (Internet status codes) = demoblaze.com; run_…_065652 (PHPTravels) = pure demoblaze.com (never loaded phptravels); run_…_070918 (Open Library) has A-side=demoblaze, B-side=openlibrary, catalog merging both hosts, and its "3/3 FT PASS" clicked demoblaze.com/cart.html | `audit_evidence/E1_run_ground_truth_20260825.json`, `E6_openlibrary_run070918_ft_demoblaze.json`, `E7_openlibrary_catalog_merge.json` |
| F-02 | D | **CRITICAL** | Root cause: concurrency + mis-attribution. `scheduler.log` proves the mutation study ran 00:05–00:51 UTC **inside** the tier-2 chain window, and the repeatability study 00:51–02:42 UTC overlapped sites #16–20. `night_chain.log` shows each pipeline step finishing into run dir X while the fusion chain writes into a *different*, seconds-newer run dir Y created by the concurrent process. Post-hoc guards (`run_attribution.js`, `assertCatalogDomains`) exist in code now, but the published ledger was never corrected | `E3_night_chain_attribution_split.txt`, `E4_scheduler_concurrent_studies.log` |
| F-03 | A/D | **HIGH** | Architecture-B test replays for docs.python (#14) and Gutenberg (#15) ran against **localhost snapshots** (`http://127.0.0.1:49205/index.html`, `:50172/index.html`) — stray runs from the concurrently-running local-server tooling. The FT stage did hit the live sites (verified live URLs in `ft_execution_results.json`), but the INDEX "B expl OK 1/1 PASS" cells for these two sites are not live-site evidence, and no report discloses the localhost replay | `E1_run_ground_truth_20260825.json` (rows 055110/055129/060644/060707); grep of both site reports finds zero mention of localhost/snapshot |
| F-04 | E | **HIGH** | Malformed LLM output silently terminates exploration: `web/src/llmClient.js:136` returns `{action:'done', reason:'parse_failed'}` when all JSON repair strategies fail. Engine records an honest-looking early `llm_done` termination instead of an error. INDEX itself notes "early `llm_done` (4 steps)" for bstackdemo — likely this path. Degraded coverage with zero error signal | `web/src/llmClient.js:101-137` |
| F-05 | E | **HIGH** | Vision services use fixed ports 5000–5004 with health-check-then-spawn (TOCTOU race). Two concurrent starters both spawn → `EADDRINUSE` crash. Proven inside the *registered* Open Library run (`run_generate.log`: ports 5000, 5003, 5004 all collide). Child processes spawned with `stdio:'ignore'`, hiding their crashes | `vision/src/serviceManager.js:18-74`, `E5_eaddrinuse_run070918_vision.txt` |
| F-06 | A | **MED** | Ledger selection bias: failed sibling attempts are silently dropped. CURA attempt `run_20260824_002017` (same night) had **FT 0/4 ALL FAILED**; INDEX registers only the friendlier `run_20260824_002709` ("n/a"). Similar pattern for juiceshop fatal-timeout attempt 101812. Keeping failed runs in `runs/` mitigates, but the ledger never mentions them | `E8_cura_unregistered_run002017_ft_0of4.json` |
| F-07 | E | **MED** | Verification ladder bottoms out at PASS-on-body-text>100-chars (`executeTests.js:287,583-602`); status initializes to `'PASS'` (line 370) and only specific checks flip it. Consistent with the team's own mutation-study ceiling finding ("verifies actions-work, not values-correct"), but it means most green checks are weak evidence | `vision/src/executeTests.js` |
| F-08 | D | **MED** | Undocumented failure modes: (a) the port-collision crashes above were reported downstream as "transient ECONNRESET"/PARTIAL, not as concurrency defects; (b) VISION_TEST_QUALITY.md aggregates **all** runs including wrong-site and localhost-snapshot tests into campaign quality numbers; (c) the "phptravels redirect discovery" narrative conflated a genuine redirect (real attempt 064941) with full wrong-site runs (065652) | `E5`, `tier2_notes_3.js:43-50`, INDEX row 19 |
| F-09 | E | **MED** | `testing/night_chain.js:35` builds commands by string interpolation `node ${script} ${args}` where `args` is a URL parsed from `TIER2_SITES.md`. Shell-metacharacter injection is possible if a table row is edited (repo-local trust boundary, but the repo explicitly expects multiple agents editing files) | `testing/night_chain.js:32-47` |
| F-10 | E | **LOW** | In the automated chain, every `ft` step failed immediately after `s4` reported writing `fusion_tests.json` ("No fusion_tests.json — run S4 first"); all published FT results came from later manual re-runs. A write-visibility/race defect worth fixing | `night_chain.log` lines 112-114, 128-130, 144-146, 176-178, 192-194 |
| F-11 | A | **LOW** | VISION_TEST_QUALITY rubric classes (STRONG/MEDIUM/WEAK) are derived by a classifier not stored in raw artifacts; independent recomputation from `verification_strength` fields yields STRONG 40 / WEAK 9 / MEDIUM 0 vs claimed 39/34/8 — the MEDIUM class must come from verification-method inference. Numbers also drift (+1) because the file aggregates every run including post-generation ones. Reproducible only by re-running the generator | `audit_evidence/E2`, `testing/vision_test_quality.js` |

Severity bar applied: CRITICAL = headline claim wrong or data contaminated
(F-01, F-02); HIGH = silent corruption risk / reproducibility failure (F-03,
F-04, F-05); MED = degraded honesty or coverage (F-06..F-09); LOW = polish
(F-10, F-11).

---

## AUDIT A — Claim recomputation (12 samples, deterministic)

Method: parsed `runs/<id>/run_manifest.json`, `dom/states.json`,
`dom/run_explore.log`, `vision/outputs/execution_results.json`,
`fusion/{ft_execution_results,fusion_report,catalog,dashboard_data}.json`.
Scoped aggregates computed over exactly the 19 runs referenced by
`INDEX.md`.

| # | Source | Claim | Recomputed from raw | Verdict |
|---|---|---|---|---|
| 1 | CE §1 | FT live executed 49 / PASS 35 / FAIL 14 | 49 / 35 / 14 (exact, scoped to ledger runs) | **VERIFIED arithmetically; inputs contaminated for 5 runs (F-01)** |
| 2 | CE §4 | Fusion offered 70 / accepted 49 | 70 / 49 (exact sum of `fusion_report.accepted_count`) | VERIFIED (same contamination caveat) |
| 3 | CE §3 | A vs B means n=19: tests 2.7/1.2, states 7.4/6.1, elements 8.3/138.3, behaviors 8.7/4.9, targets 6.2/5.1 | identical to 1 decimal | VERIFIED |
| 4 | CE §1/§10 | Mean fusion-attributable 41.2% | 41.2% exact over the 19 dashboard values | VERIFIED (contaminated rows included) |
| 5 | INDEX #15 | Gutenberg `run_…_060707` FT 6/6 PASS | raw `ft_execution_results.summary {total:6,passed:6}`; all step URLs live `gutenberg.org` | VERIFIED (but B-side replay was localhost — F-03) |
| 6 | INDEX #13 | LambdaTest `run_…_053921` FT 4/5 PASS | raw `{total:5,passed:4,failed:1}`, FT001 FAIL selector_not_found | VERIFIED. NOTE: the audit brief's "5/5 PASS" is **wrong**; INDEX is honest |
| 7 | INDEX #11/#12 | Books 3/3 PASS; Quotes 1/2 PASS | raw 3/3 and 1/2 | VERIFIED |
| 8 | INDEX #14 | PythonDocs 7/7 PASS @77.8% | raw 7/7; FT URLs live docs.python.org; dashboard pct 77.8 | VERIFIED (B-replay localhost caveat, F-03) |
| 9 | INDEX #16 | WeatherSpark 1/3 PASS, "canvas invisible to OCR" | run explored **saucedemo.com**; FT steps on saucedemo | **CONTAMINATED (F-01)** |
| 10 | INDEX #17 | SahiTest 0/2, "legacy frames" story | run explored **saucedemo.com** (its own log even shows saucedemo add-to-cart LLM calls). Real sahitest run `_063220` sits unregistered next to it | **CONTAMINATED (F-01)** |
| 11 | INDEX #18/#19/#20 | status-codes 1/2; PHPTravels 0/4 "redirect"; OpenLibrary 3/3 | runs are demoblaze / pure-demoblaze / demoblaze-A+openlibrary-B; OpenLibrary's passes are demoblaze cart clicks | **CONTAMINATED (F-01)** |
| 12 | CE §8 | Total wall time 219.5 min over 19 sites | per-site manifest durations match table values (spot-check Gutenberg 18.4 = 796s+306s); sum 219.4≈219.5 | VERIFIED |

Also checked: VTQ fill_actions 115 = raw sum exactly; stale-prevented 11 and
unresolved 21 match exactly (see F-11 for class-mapping caveat).

---

## AUDIT B — Live replay spot-check: **SKIPPED-LOCKED**

`testing/.campaign.lock` held throughout the audit window by PID 18592
(`node testing/rerun_starved.js`, started 13:11 IST 2026-08-25 — confirmed via
`Get-CimInstance`). Per coordination rules no browser pipeline was started.
Static substitute: the raw FT evidence for the two named claims was fully
re-read instead — gutenberg 6/6 (live URLs, per-step screenshots committed under
`fusion/ft_execution_evidence/FT001..006`) and lambdatest 4/5 are internally
consistent, but *re-execution* reproducibility remains untested.

## AUDIT C — Adversarial edge probes: **SKIPPED-LOCKED**

Same lock constraint. Not executed. (Note for whoever runs these: probe 3 is
partially answered statically — phptravels.com/demo genuinely redirects toward
a demoblaze-style app per unregistered run `_064941`, whose A-side states show
phptravels.com pages while the mirror serves demoblaze content.)

## AUDIT D — Limitation-vs-evidence cross-check

§9 limitations sampled: bot-wall BLOCKED handling (opencart report exists,
recorded honestly ✓), Herokuapp nondeterminism (✓ plausibly evidenced),
single-execution flakiness bounds (REPEATABILITY.md exists ✓), identity-space
non-merger (consistent with tiny `common_elements` in gap reports ✓),
body-text-fallback weakness (✓ code + VTQ weak class). **Not documented
anywhere**: the overnight concurrency collision and its EADDRINUSE crashes
(F-02/F-05/F-08), the localhost B-side replays (F-03), the unregistered failed
siblings (F-06). Log sweep over 108 run dirs flagged 29 lines; severe patterns
are itemized in the sweep output embedded in the evidence folder.

## AUDIT E — Architecture stress review (top 5 risks)

1. **Cross-run attribution/concurrency (HIGH)** — orchestration layer picks
   "newest run dir"; combined with any second process creating run dirs, data
   from site X is fused, executed and reported as site Y. This is not
   theoretical: it happened at scale overnight (F-01/F-02). Current guards
   (`findRunDir(url,sinceMs)`, `assertCatalogDomains`) close the loop **only**
   in `night_chain.js`; `overnight_scheduler.js`, `rerun_starved.js`, mutation
   and repeatability drivers do not all share the same mutex discipline.
2. **Malformed-LLM → silent stop (HIGH)** — `parseAction` ends in
   `action:'done',reason:'parse_failed'` (`llmClient.js:136`); exploration ends
   looking successful. Same philosophy appears in B-side JSON repair chains
   (`vision/src/llm.js:122-126`) which return undefined through catch{} chains.
3. **Service lifecycle races (HIGH)** — fixed ports + health-probe-then-spawn
   + `stdio:'ignore'` (`serviceManager.js`) → EADDRINUSE storms under
   concurrency, invisible child failures, Windows-only `taskkill /T /F`
   semantics elsewhere (`runBoth.js:137`).
4. **Weak oracle ceiling (MED)** — PASS-by-default status and >100-char
   body-text fallback mean "green" rarely implies "correct" (matches the
   team's own mutation analysis; no value/assertion oracles anywhere).
5. **Shell-string orchestration (MED)** — `execSync('node '+script+' '+args)`
   with markdown-derived URLs (`night_chain.js:35`); plus secrets handled
   acceptably (env/.env borrowing, never printed — no hardcoded keys found),
   and URLs reach Playwright APIs rather than shells elsewhere, so injection
   surface is limited to the orchestrators.

## AUDIT F — Production readiness verdict: **NOT-READY**

As handed to me ("dev-tool MCP for production testing") I would not ship it.
The core idea (catalog → gap → fusion synthesis → grounded live execution with
evidence screenshots) is sound and the honest-failure culture is genuinely
better than typical capstone work — but the system cannot yet tell which site
its own results belong to, and a testing tool that can silently test the wrong
application is worse than no tool.

Three changes that would most raise trust:
1. **Quarantine & re-run sites #16–#20** with the new attribution guards;
   correct INDEX/CE/reports; add a CI-style invariant: *manifest.url must equal
   the requested URL AND every catalog page_key host must belong to the target
   or a visited redirect chain* — enforced before any report generation.
2. **One mutex for everything** — lockfile acquisition inside mutation,
   repeatability, scheduler and chain drivers alike, plus dynamic port
   allocation (or single shared service daemon) for the vision stack.
3. **Fail loudly, verify values** — turn `parse_failed` into a retryable error
   not `done`; require at least MEDIUM (state-change) verification for a PASS;
   start the deferred assertion-oracle work so green means correct.

---

## Reproducibility appendix — exact commands/queries run by the auditor

All scripts were run from `C:\Users\sandeep\AppData\Local\Temp\opencode\audit\`
(nothing outside `docs/audit_evidence/` was written in-repo):

```
node auditA.js     # aggregate recomputation over all runs/<id>/fusion/*.json
node urls.js       # vision execution_results source_url per run + CURA probes
node probe2.js     # execution_results details for 062152/063248 + gutenberg exploration_result.start_url
node probe3.js     # dom/states.json URLs + explore.log heads for 062152/063248
node probe4.js     # manifest.url for all 19 INDEX runs + FT step target_urls
node probe5.js     # ground truth table: manifest url vs A-loaded vs B-source (Aug 25)
node probe6.js     # catalog pages seen_by + FT after_urls for 064941/065652/070445/070918
node scoped.js     # CE claims recomputed over exactly the 19 ledger runs
node sweep.js      # fatal/error pattern sweep over runs/*/dom + vision logs
node evidence.js   # wrote docs/audit_evidence/E1..E8 from raw artifacts
Select-String ...  # disclosure greps for 127.0.0.1|localhost|snapshot|mirror in site_reports
Get-CimInstance Win32_Process -Filter "ProcessId=18592"   # lock holder identification
git remote -v; git branch --show-current; git status --porcelain
```

Evidence copies: see `docs/audit_evidence/E1` … `E8` (JSON/TXT, generated
directly from raw artifacts; `E4` is a verbatim copy of `scheduler.log`).

*— AUDITOR-3, 2026-08-25*
