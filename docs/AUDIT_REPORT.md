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

---

## ADDENDUM (2026-08-25 ~16:00 IST) — Reconciliation of raw-data vs report integrity

Appended by Master coordinator on behalf of the independent auditor's follow-up probes.

### Finding: artifacts authentic, folder composition broken
Individual JSON artifacts are authentic browser sessions (real LLM calls, no doctored
values). The damage came from runBoth's mtime-window collector stitching artifacts
from TWO different sessions into ONE folder:

```
run_20260825_060707 (Gutenberg):   B explore #1: http://127.0.0.1:50172  <- fixture
                                   B explore #2: https://www.gutenberg.org  <- genuine
run_20260825_062152 ("WeatherSpark"): manifest+A = saucedemo.com
                                      B explore #1: https://weatherspark.com  <- real, wrong folder!
                                      B explore #2: https://www.saucedemo.com
run_20260825_053921 (LambdaTest):  B explore #1: http://127.0.0.1:58621    <- fixture
                                   B explore #2: lambdatest.com             <- genuine
```

### Refined per-site verdicts (supersedes coarse quarantine where stricter)
- Sites 13-15: quarantine stands (conservative but justified). A-sides and FT stages
  DID hit live targets (testmuai.com is a legitimate LambdaTest property, verified;
  docs.python.org and gutenberg.org confirmed live). Untrustworthy cells: B-side
  replay/quality + fixture-sourced gap/novel-target counts.
- Sites 16-20: hard quarantine fully confirmed (A-level wrong-site evidence).
- Books(11)/Quotes(12): independently re-confirmed clean.

### Independent strict recount (auditor classifier: any localhost/foreign host = dirty,
testmuai whitelisted for lambdatest):
```
Clean-only Vision quality: 68 tests, 52 passed (76%), 34 STRONG, 96 fills
Master's claim was:        76 tests, 57 passed (75%), 36 STRONG
```
Delta (+/-8 tests) is boundary definition only (catalogs merely RECORDING external
links are Tier-1 scope-leak observations, not wrong-site runs). Either way the claim
survives: ~75% pass, roughly half value-level STRONG.

### Mandated closure for re-runs of 13-20
The pipeline itself MUST assert, before a run dir is accepted: every
vision/outputs/* exploration file carries the SAME session id / start-url as the
run's manifest URL. Otherwise the mtime collector can re-stitch folders identically.

### Gate requirement
This addendum + QUARANTINE_TIER2.md are inputs to the Gate step: no quarantined row
may leave QUARANTINED status without (a) guard-passing re-run, (b) domain assertion
log, (c) rewritten narrative sourced only from the new run.

## DEFECT #23 (found by folder_purity tooling, 2026-08-25)
Weatherspark re-run run_20260825_173233 catalog.json contains a literal null
page_key (catalog builder recorded a null URL as a page). Data corruption
class: catalog-builder. Flagged by testing/folder_purity.js; needs a null-
guard in the S1 catalog builder before overnight batches.

---

# TIER-3 INTERIM AUDIT (2026-08-26)

**Auditor:** ox-alpha (independent verifier, fresh session). Read-only on the
repo except this section + `docs/audit_evidence/E-T3-*`. All numbers recomputed
from RAW artifacts under `runs/<id>/`; provenance checks mirror
`testing/folder_purity.js` logic but were executed OUTSIDE the repo (the real
tool writes CONTAMINATION_MARKER files; the auditor must not).
**Window audited:** Tier-3 campaign sites 21–30, live at audit time.
Run dirs in window: `run_20260825_230647` (#21 wikipedia), `_232334`
(#25 goodreads attempt-1), `_232415` (#23 github_trending), `_234052`
(orphan — see F3-01). `testing/.campaign.lock` was HELD throughout by live
PID 27424 (`node.exe`, started 23:58 IST) → live-replay probes skipped per
lock discipline (same substitution rule as Audit B above).

## Executive verdict

**INTERIM PASS.** Every headline number for the first cleared Tier-3 site
reproduces exactly from raw artifacts; all three attributed Tier-3 run dirs
are provenance-PURE (zero recurrence of the Tier-2 cross-run stitching
pattern — the guards + lock discipline held under concurrent workers); all
three honest-BLOCKED rows carry dual-probe evidence whose preflight probe is
independently machine-verifiable. Two MED process findings are filed (an
undocumented abandoned hackernews attempt left as an unattributable orphan
dir, and a deterministic-fallback WRITE-class action executed against a live
site during a read-only campaign) — both contained, neither corrupts data.
Tier-3 rows may continue to be trusted as they land, subject to closing the
orphan before gate audit.

## Findings table

| ID | Audit | Severity | Description | Evidence |
|---|---|---|---|---|
| F3-01 | T-C/E | **MED** | Unattributed orphan dir `run_20260825_234052`: an undocumented attempt at #26 hackernews (watcher-fired ~23:40 IST after wikipedia's lock release) died before manifest write. No manifest, no fusion chain, no board/comms record of the attempt. Artifacts are single-host `news.ycombinator.com` (NOT contaminated) but the dir is unattributable scratch of exactly the class that seeded the Tier-2 stitching incident. Must be registered as evidence-only or removed before gate audit. | `E-T3-4_orphan_234052_inspect.txt` |
| F3-02 | T-C/E | **MED** | Read-only policy breach risk: during the orphan attempt, `[ERR] parseAction: all strategies failed` → deterministic fallback executed `fill input:nth-of-type(4)` typing "add comment" into a LIVE Hacker News comment box. No submit/post followed (action histogram 16 navigate + 1 fill; vision `submit_actions: 0`) so impact is nil, but fallback can perform WRITE-class actions on third-party sites under frozen read-only pre-registration. Recommend: fallback restricted to navigation/click-class actions only. | `E-T3-4_orphan_234052_inspect.txt` |
| F3-03 | T-C | **LOW** | Guard blind spot: `folder_purity.js` Check-1 passes vacuously when `dom/exploration_summary.json` is missing — and it IS missing in the wikipedia run (Check-1 logged "0 urls OK"). Mitigated: independent sweep of `dom/states.json` shows all hosts = `en.wikipedia.org`, and Checks 2–4 (vision start_url, catalog page_keys, FT step hosts) are substantive and passed. Suggest Check-1 fail-loud when the summary file is absent from a dir that has dom artifacts. | `E-T3-1`, `E-T3-3` |
| F3-04 | T-B | **LOW** | Launch-time re-check probes (probe #2 of the dual-probe requirement) exist only as narrative with approximate timestamps ("~00:5x IST"); no raw command output committed. Probe #1 (preflight) IS independently confirmed in `TIER3_PREFLIGHT.md`: stackoverflow 403 / npmjs 403 / imdb 202 @ 2026-08-25 ~17:45 IST. Evidence requirement MET; strength of probe #2 is thinner than probe #1. | `E-T3-2_blocked_reports_check.txt` |

Counts: CRITICAL 0 · HIGH 0 · MED 2 · LOW 2.

## AUDIT T-A — Cleared-site recomputation (deterministic): PASS

Site #21 wikipedia, `run_20260825_230647`. All four claims recomputed from raw
JSON, not derived markdown:

| Claim | Raw recomputation | Verdict |
|---|---|---|
| catalog elements=790 / pages=13 | `fusion/catalog.json`: elements[] len **790**, pages[] len **13**; every page_key host = en.wikipedia.org | EXACT MATCH |
| S4 7-of-39 accepted | `fusion_report.json`: accepted_count=**7**, gap_candidates_offered=**39**, 3 honest cross_page_ref rejections, all_accepted_grounded=true | EXACT MATCH |
| FT 3/7 PASS steps 6/14 | `ft_execution_results.json` summary {total:7, passed:3}; auditor independently counted steps: **6 PASS / 14 total**; all FT step URLs live en.wikipedia.org | EXACT MATCH |
| fusion-attributable 87.5% | `dashboard_data.json.headline.pct_final_tests_attributable_to_fusion`=**87.5** (= 7/8: A=0, B=1, fusion=7) | EXACT MATCH |

INDEX row #21 matches all four values verbatim (7/39 accepted, 3/7 PASS steps
6/14, **87.5%**, run ID). Site report `wikipedia_2026-08-26.md` also consistent
with raw artifacts line-by-line. No HIGH finding.

## AUDIT T-B — Blocked-evidence verification: PASS (with LOW note)

All three required reports exist in `testing/site_reports/` and contain dual-
probe records with status codes + timestamps:
stackoverflow_2026-08-26.md (403), imdb_blocked_2026-08-26.md (202 bot-check),
npmjs_blocked_2026-08-26.md (hard 403). Probe #1 cross-checked verbatim against
committed `testing/TIER3_PREFLIGHT.md` (independent artifact). Residual thinness
of probe #2 filed as F3-04 (LOW). No MED finding triggered.

## AUDIT T-C — Contamination cross-check, all Tier-3-window run dirs: CLEAN

Method mirrors `folder_purity.js` (manifest host vs visited_urls vs vision
start_url/source_url vs catalog page_keys belong-or-visited; testmuai alias
allowed only via lambdatest entries; localhost flagged). Executed read-only
from outside the repo:

| Run dir | Manifest host | Vision start_urls | Catalog hosts | FT steps host | Verdict |
|---|---|---|---|---|---|
| run_20260825_230647 | en.wikipedia.org | en.wikipedia.org (n=1) | 13/13 en.wikipedia.org | en.wikipedia.org | **PURE** |
| run_20260825_232334 | www.goodreads.com/list/tag/best | goodreads.com (n=1) | 1/1 goodreads | n/a (no FT) | **PURE** |
| run_20260825_232415 | github.com/trending | github.com (n=1) | 23/23 github.com | github.com | **PURE** |
| run_20260825_234052 | NO MANIFEST | n/a (all-dom news.ycombinator.com) | n/a | n/a | ORPHAN → F3-01 |

Zero foreign hosts. Zero localhost fixtures explored (the 127.0.0.1:500x /
10.2.0.2:500x strings in one vision log are local YOLO/OCR *service* health
endpoints, not replayed pages). The Tier-2 failure mode did NOT recur.

## AUDIT T-D — DEFECT #24 confirmation: CONFIRMED, cosmetic-only

Precondition reproduced on wikipedia run (catalog 13 pages/790 elements > 0;
A tests = 0): `gap_report.summary` emits a zero-signal block — coverage_pct
0/0 despite a 790-element catalog (identical shape on github_trending, also
weak-A). Cosmetic-only verified: s6_dashboard does not consume gap summary;
headline recomputed exact (87.5%); S4/FT/INDEX all independent and correct.
Full chain in `E-T3-5_defect24_reproduction.txt`.

## AUDIT E — Undocumented failure scan: no new fatal patterns in window

Full-campaign sweep bucketed into known classes (F-05 service races,
F-06 juiceshop goto-timeout, captureScreenshot gutenberg nuance, honest
bot_wall_blocked terminations, openlibrary ERR_ABORTED warnings); false
positives excluded (the-internet's own "Status Code 500" test pages). Inside
the Tier-3 window the ONLY hit is the registered parse_failed class firing
LOUDLY (`[ERR]` line present — F-04 fix working as designed), in the orphan
dir already covered by F3-01/F3-02. Zero new undocumented patterns.

## Commands appendix (auditor reproducibility)

```
node <temp>/ta_recompute.js run_20260825_230647     # T-A four-claim recompute -> E-T3-1
Select-String INDEX.md -Pattern 'wikipedia|stackoverflow|imdb|npmjs'          # INDEX row check
Get-ChildItem testing/site_reports -Filter '*2026-08-26*'                     # T-B existence
Select-String testing/TIER3_PREFLIGHT.md -Pattern 'stackoverflow|imdb|npmjs'  # T-B probe#1 cross-check
node <temp>/tc_contamination.js                     # T-C purity mirror, read-only -> E-T3-3
node -e "... memory_log action histogram ..."       # T-C orphan attribution -> E-T3-4
Select-String runs/*/dom/run_explore.log,vision/*.log -Pattern <fatal-set>    # AUDIT E -> E-T3-6
git status --porcelain; git branch --show-current; git remote -v              # env sanity
```

Environment notes: branch `after-tier-2`, remote `backup` ONLY (neonish absent
— D8(d) honored). Working tree carried other lanes' uncommitted files
(logs/llm_usage.jsonl, tier3_w*.log, .campaign.lock) — untouched. Live-replay
audits (B/C-style) skipped: `.campaign.lock` held by live PID 27424 during the
audit window. memory.json knowledge-graph remains unreadable (known JSON parse
error at line 2, previously flagged on-board).

*— TIER-3 INTERIM AUDITOR (ox-alpha), 2026-08-26*

---

# TIER-3 INTERIM AUDIT — ROUND 2 (2026-08-26, post-D9 window)

**Scope:** everything landed after round-1 push `2f139cc` → audited at
`8bcc47f` (+ in-flight #32 re-run noted). Same protocol as round 1:
deterministic raw-artifact recomputation, folder_purity-mirror provenance
checks (executed read-only, outside the repo), blocked-evidence checks,
defect-fix verification, fatal-pattern sweep.

## Executive verdict

**INTERIM PASS (round 2).** The D9 window suffered a real contamination
recurrence — multiple pipelines launched WITHOUT the campaign lock, and the
shared-storage mtime collector stitched foreign artifacts into at least 5 run
dirs. However, every single incident was caught by the purity gate BEFORE
publication and is registered DO-NOT-CITE / BLOCKED-contamination with raw
evidence retained; zero contaminated numbers reached INDEX/report headlines.
The defect-#24 guard fix (`97a29cb`) was independently verified: code correct,
12 regression tests green within my own 155/155 suite re-run, and live-tested
against an actual leaked artifact (bbc's foreign `execution_results.json` →
correctly REJECTED). All newly published INDEX rows (#26, #28, #30, #31, #32,
#33, #35) reproduce from raw artifacts. Findings: one MED disclosure gap on
the cleared todomvc row, one MED conditional risk (bbc hand-off dir holds a
foreign artifact awaiting its fusion chain), one MED process finding
(unlocked-launch recurrence), two LOW.

**Round-1 dispositions verified:** F3-01 CLOSED correctly — `run_20260825_234052`
now carries manifest + full fusion chain + INDEX row #26, all four headline
numbers recomputed exact (S4 8/33, FT 1/8 with steps 9/16, dashboard 100%
fusion-created = 8/8, catalog 9 pages/102 elements). F3-02 recorded per board.
F3-03/F3-04 on T402 checklist per no-changes rule.

## Round-2 findings table

| ID | Audit | Severity | Description | Evidence |
|---|---|---|---|---|
| F4-01 | T-A′ | **MED** | Cleared row #33 todomvc (`run_20260826_002227`): FT "3/3 PASS (7/7 steps)" includes steps that navigated OFF-DOMAIN — FT001 step-2 → `github.com/remojansen`, FT002/FT003 step-2 → `petehuntsposts.quora.com` (raw `after_url`s). The report discloses A-side external *blocking* but never discloses FT-stage off-domain passes, and §6 claims coverage "concentrates on internal flows" — contradicted by raw artifacts. Inconsistent with the T401-era "on-domain FT step URLs" clearance criterion. Tests ARE grounded (on-page click targets) and navigation is read-only → disclosure gap, not corruption. Fix: one disclosure sentence in report + INDEX cell. | `E-T3-8_todomvc_ft_offdomain.txt` |
| F4-02 | T-C′ | **MED** | bbc_news #27 handed-off dir `run_20260826_000112` contains a FOREIGN `vision/outputs/execution_results.json` referencing `testpages.eviltester.com` (defect-#24-class leak; predates the guard fix). Chain NOT yet run; row unpublished. Verified the new guard rejects this exact file — but any lane chaining bbc MUST pull ≥97a29cb first or the foreign file flows into S1. Conditional risk; contained if protocol followed. | `E-T3-9_guard_verification.txt` |
| F4-03 | Process | **MED** | Unlocked-launch recurrence: ≥3 admitted S0.3 violations tonight (W4 launched runBoth directly without lock → 000204 stitch; concurrent unlocked windows during W3's lock window → 000247 stitch; W1 pre-armed watcher overlap → 001836/003816). Purity gate contained ALL of them pre-publication (system worked as designed), but containment is luck-dependent while `runBoth.js` still does not self-enforce the singleton lock (PARALLEL_SPEC D3, designed, not applied). | comms 03:5x/04:1x/00:54 IST; `E-T3-10` |
| F4-04 | Ledger | **LOW** | Site #34 techlistic has NO INDEX row and NO report — its BLOCKED-contamination verdict exists only in board prose; contaminated evidence dir `run_20260826_002500` verified on disk (foreign practica execution_results + catalog page_keys). D8(e) requires every tier-3 row to reach a FINAL verdict before gate audit → becomes gate-blocking if unresolved. Also: unregistered spare run `run_20260826_001601` (serial-B todomvc, PURE) sits unattributed-by-ledger on disk. | INDEX grep (absent); mirror output |
| F4-05 | Guard | **LOW** | `provenanceGuard.artifactBelongsToRun` fail-open: artifacts referencing NO url pass as `'no_url_fields'`. A URL-less foreign test_cases file would still sweep through. All observed leak classes embed urls (vectors covered); hardening note only. | `E-T3-9_guard_verification.txt` |

Counts round 2: CRITICAL 0 · HIGH 0 · MED 3 · LOW 2.
Process note (not a campaign defect): the repo was LIVE during this audit —
workers committed report/INDEX/manifest files mid-sweep, which produced
transient false readings (apparently-missing magento report/INDEX row/manifests
that landed minutes later via `edfb999`/`36e13a9`/`8bcc47f`). All such alarms
were re-verified against final state before findings were assigned. Recommend:
future audits pin a HEAD SHA up front and note that dirs newer than it are
in-flight.

## Per-audit detail (round 2)

### T-A′ — new cleared-row recomputation: PASS (4/4 rows exact)

| Row / claim | Raw recomputation | Verdict |
|---|---|---|
| #26 hn `234052`: S4 8/33 accepted, FT 1/8 PASS, 100% fusion-created | offered=33 accepted=8 ✔; FT {total:8,passed:1,steps 9/16} ✔; headline pct_fusion=100, fusion_created=8/8 ✔; catalog 9 pages/102 elements, hosts news.ycombinator.org…com only ✔; FT step hosts all news.ycombinator.com ✔ | EXACT |
| #28 archive `235819`: thin-run honest, S4 0→0, FT not executable | offered=0 accepted=0 ✔; no ft_execution_results.json (correctly absent) ✔ | EXACT |
| #31 magento `004650`: BLOCKED-honest (CF 526 error page rendered), purity PURE, numbers not citable | catalog hosts magento-only ✔; dom visited magento-only ✔; first full protocol on extended guard ✔ | VERIFIED |
| #33 todomvc `002227`: S4 3/10 grounded, FT 3/3 PASS steps 7/7, dashboard 30%, A 8 steps/4 states/5 tests | all recomputed exact ✔ (off-domain disclosure gap → F4-01) | EXACT (arithmetic) |

Rows #22/#24/#25/#29/#30/#32/#35 also spot-checked: blocked/contaminated
registrations match their on-disk evidence dirs and reports.

### T-B′ — new blocked-evidence checks: PASS

- `reddit_blocked_2026-08-26.md`: THREE-probe trail, each with status code +
  timestamp (preflight, claim-time, report-time 00:13 IST; identical 302 →
  `/login/?reason=lor2`). Strongest evidence standard of the campaign.
- `goodreads_blocked_2026-08-26.md`: two deterministic attempts (~4h apart,
  different lock windows), both runs cited with IDs, byte-identical white
  screenshots (5288 bytes each), honest blank-render verdict.
- `eviltester_contaminated_2026-08-26.md` / `practica_contaminated_2026-08-26.md` /
  `magento_526_blocked_2026-08-26.md`: present, DO-NOT-CITE markers consistent
  with raw contamination state.

### T-C′ — provenance mirror over the whole extended window: adjudicated

PURE (published or clean): 230647, 232334, 232415, **234052**, 235717,
**235819**, 001601, **002227**, **004650**.
CONTAMINATED, registered DO-NOT-CITE/evidence-only (mirror agrees with each
registration's stated foreign host): 000204 (eviltester→todomvc),
000247 (magento→eviltester), 000335 (eviltester→magento), 001836 + 003258 +
003816 (luma/techlistic/magento→practica), 002500 (practica→techlistic).
Full machine output: `E-T3-7_round2_purity_window.json`.

### T-D′ — defect #24 fix verification: EFFECTIVE

Code review + live rejection test + independent suite re-run (155/155) +
first field deployment clean (`004650`). Residual `no_url_fields` fail-open
filed LOW (F4-05).

### AUDIT E′ — new-window failure sweep: no new patterns

Three hits, all known classes (loud parse_failed; captureScreenshot fatal on
archive thin-run — honestly recorded; transient openrouter fetch-failed
retry). Contamination incidents caught pre-publication by the purity gate —
see `E-T3-10_round2_sweep.txt`.

## Commands appendix (round 2)

```
git log --oneline 2f139cc..HEAD ; git status --porcelain ; git rev-parse HEAD backup/after-tier-2
node <temp>/tc_round2.js                                  # mirror over whole window -> E-T3-7
node -e "... ft_execution_results step trace ..."         # todomvc off-domain -> E-T3-8
node -e "g.artifactBelongsToRun(bbcFile,'https://www.bbc.com/news')"   # -> E-T3-9
node --test "fusion/test/*.test.js" "web/test/*.test.js" "test/*.test.js"   # 155/155 reproduced
Select-String INDEX.md -Pattern 'magento|techlistic|\| 34 \|'               # ledger-gap check
Get-CimInstance Win32_Process -Filter "ProcessId=<lockpid>"                 # live-pipeline ID
```

*— TIER-3 INTERIM AUDITOR (ox-alpha), round 2, 2026-08-26*
