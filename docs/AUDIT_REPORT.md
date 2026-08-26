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

Environment notes: branch `after-tier-2`, remote `backup` ONLY (non-backup remotes absent
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

---

# TIER-3 FINAL AUDIT (2026-08-26, post-D9 close)

**Audited at:** `cf7915a` (= `backup/after-tier-2`; tree clean except lane
logs; `.campaign.lock` FREE — no pipeline in flight for the first time since
launch). Same protocol; evidence in `E-T3-11_final_audit.txt`.

## Final verdict

**PASS — with exactly ONE gate-blocker remaining.**

Everything that landed after round 2 verifies cleanly:

| Item | Result |
|---|---|
| #32 eviltester re-run `run_20260826_005704` (CLEARED) | Recomputed EXACT: catalog 616 el/24 pg all-eviltester; S4 3 accepted/0 rejects (grounded); FT 1/3 (steps 4/7) with honest verifier-gap framing (`no_post_action_change` on live-probe-passing targets); dashboard 42.9% = 3/7; FT steps all on-domain |
| #17 sahitest re-run `run_20260826_010716` (CLEARED-BY-RERUN) | Recomputed EXACT: catalog 131 el/5 pg all-sahitest; S4 3/3; FT 3/3 (9/9) all on-domain; 60% = 3/5; supersedes voided `194511`, honest replay 0/1 FAIL disclosed |
| Round-2 dispositions (`2764ae8`) | **F4-01 APPLIED** (INDEX row 33 off-domain note + report §6 disclosure paragraph citing raw after_urls) ✔ · **F4-04 APPLIED** (row 34 DO-NOT-CITE per D8(e)) ✔ · F4-02/F4-03 directives posted ✔ |
| Provenance of both new runs | CLEAN via the **shipped** `provenanceGuard` across every guarded artifact class — zero rejections needed (first runs fully covered by the extended defect-#24 guard) |
| Log sweep (both new dirs) | Zero fatal/error patterns |
| Code delta | None since `97a29cb` (docs/reports only) → auditor-verified 155/155 suites claim stands |

## F5-01 — the single remaining gate-blocker (MED)

**Site #27 bbc_news has NO verdict row in INDEX.** Row census: 14 of 15
registered (21–26, 28–35). The hand-off pipeline `run_20260826_000112` was
never chained, and the board T301 row's claim "**15/15 rows
verdict-registered in INDEX**" is **overstated** (the scoreboard's separate
"1 pending" is the honest count). Per D8(e) — *all rows must reach a FINAL
verdict before gate audit* — the gate cannot flip until #27 either:
(a) gets chained under the F4-02 directive (pull ≥ `97a29cb`; the foreign
`execution_results.json` in the dir WILL be auto-rejected by the guard —
verified live in round 2) and registered from clean numbers, or
(b) is reclassified BLOCKED-honest with a report, if quota/window does not
allow a chain.
Secondary nit inside the same finding: correct the "15/15" wording to
"14/15 + 1 pending" so the ledger claim matches disk.

Counts final round: CRITICAL 0 · HIGH 0 · MED 1 (F5-01) · LOW 0.
Cumulative Tier-3 audit totals: 0 CRITICAL · 0 HIGH · 6 MED · 4 LOW across
three passes; every MED/LOW either fixed+verified or formally dispositioned
except F5-01.

### MINOR-FIX CLOSEOUT (same session)

Both LOW code findings fixed by the auditor (minor-fix lane precedent),
suites re-run green:

- **F3-03 FIXED** (`testing/folder_purity.js`): Check-1 no longer passes
  vacuously when `dom/exploration_summary.json` is missing/malformed while
  dom artifacts exist — emits a loud `flags[]` entry + `vacuous:true` check
  detail instead of a silent "0 urls OK". Deliberately does NOT flip `pure`
  by itself, so registered verdicts are unaffected. Verified live on
  `run_20260825_230647` (flag fires; pure stays true; no marker written).
- **F4-05 FIXED** (`lib/provenanceGuard.js` + `runBoth.js`): url-less guarded
  artifacts still pass but now return an explicit `warn` field, and the
  collector logs `PROVENANCE WARN <file>` loudly instead of passing silently.
- Regression tests added to both suites; **157/157 PASS** independently
  re-executed (was 155).

## Commands appendix (final)

```
git fetch backup; git log --oneline f3807d4..HEAD        # 5 commits, audited
node -e "...catalog/S4/FT/dashboard recompute 005704+010716..."   # E-T3-11 §1
provenanceGuard.artifactBelongsToRun over all guarded outputs of both runs # E-T3-11 §2
Select-String INDEX.md -Pattern '\| 27 \||\| 33 \||\| 34 \|'       # F4-01/04 + census
git show 93a010f --stat; git show b2ad7ff --stat          # code-delta check
```

*— TIER-3 FINAL AUDITOR (ox-alpha), 2026-08-26*

---

# FINAL READINESS VERDICT (2026-08-26)

Scope: sites 1–35 (Tier-3 rows 36–40 executing tonight are out of scope).
Basis: three prior audit passes (`2f139cc`, `f3807d4`/`43e0467`) plus this
pass's document/artifact checks. Every claim below cites a path; nothing
invented.

## 1. VERDICT: **BETA**

Core works end-to-end; rough edges are documented and non-blocking for a
v1-beta release — but it is not PRODUCTION-GRADE, and saying so would be
harmful.

Why BETA and not PRODUCTION-GRADE:
- The dual-perception engine (A DOM explorer + B vision/YOLO+OCR explorer +
  grounded fusion synthesis + live FT execution + evidence screenshots) is
  validated end-to-end on 35 real sites with a consistent honest-failure
  taxonomy: 14 of 15 Tier-3 ledger rows carry FINAL verdicts
  (`testing/site_reports/INDEX.md`), including 7 environment/bot-blocked
  rows recorded as data, not failures.
- The worst failure in project history — cross-run wrong-site stitching — was
  found, fully quarantined, re-run behind guards, and mechanically closed:
  root cause + remediation trail in `docs/AUDIT_REPORT.md` ADDENDUM,
  `testing/QUARANTINE_TIER2.md`, `docs/RETROSPECTIVE_TIER2.md`; recurrence
  attempts during Tier-3 were caught pre-publication every time (rounds 1–2
  of this report); the collector guard was generalized and live-verified
  (`97a29cb`, this report round 2 / `E-T3-9`).
- BUT: (a) the MCP product surface is incomplete — `run_test` is still a
  typed stub (`CAPSTONE_BACKUPS\vision-fork-2026-08-25\mcp\tools.js`,
  `-32006`), so the explore→generate→execute loop is proven via the CLI/
  campaign drivers, not yet through the MCP interface itself; (b)
  `docs/MCP_READINESS.md` records 3 BLOCKER-class gaps for any multi-user/
  production deployment (per-user auth & keys; cross-platform service
  lifecycle, ports 5000–5004; concurrency control) with its own GO/NO-GO:
  "GO strictly AFTER the capstone review"; (c) the verification oracle
  ceiling stands (PASS-by-state-change/body-text; VTQ: only 33/62 STRONG,
  `testing/VISION_TEST_QUALITY.md`). A team adopting this *tomorrow* as a
  production service would hit exactly those walls.

Why not REALLY NO: the ledger survived adversarial recomputation at every
level (three independent audit passes; every published headline reproduced
exactly from `runs/<id>/` raw artifacts), failures are classified honestly
and consistently, and the remediation trail is complete and auditable — the
opposite of the conditions that make adoption harmful.

## 2. EVIDENCE CHECKLIST

| Item | Status | Artifacts |
|---|---|---|
| Ledger integrity: INDEX recomputable from raw | **VERIFIED** — rows #21/#23/#26/#28/#31/#32/#33/#17 recomputed EXACT across audit rounds 1/2/final (elements/pages, S4 offered/accepted, FT totals+steps, dashboard %) | `runs/<id>/fusion/{catalog,fusion_report,ft_execution_results,dashboard_data}.json` vs `testing/site_reports/INDEX.md`; auditor evidence `docs/audit_evidence/E-T3-1/-3/-7/-11` |
| Ledger integrity: EVALUATION/VTQ | **VERIFIED (with scope note)** — both are generated deterministically by `regen_ledger.js`/`fusion/s8_campaign_eval.js` from INDEX + dashboard_data with an explicit excluded-runs header; VTQ per-test row spot-traced to raw source (`runs/run_20260822_193916/vision/outputs/execution_results.json` contains "Verify navigation to Elements section", MEDIUM/PASS). Scope note: `testing/CAMPAIGN_EVALUATION.md` snapshot covers the 20-site Tier-2 era (regenerated 2026-08-25T15:16Z); Tier-3 aggregates live in INDEX rows + `testing/extract_run_*.json`, not yet folded into CE | `testing/CAMPAIGN_EVALUATION.md`, `testing/VISION_TEST_QUALITY.md`, `testing/extract_run_*.json` |
| Quarantine clearances have domain-assertion logs | **VERIFIED** — all 8 Tier-2 quarantine rows cleared or dispositioned with domain assertions: four Phase-2 clearance runs domain-PASS tabled in `docs/AUDIT_T401_REPORT.md` §A2 (manifest/catalog/FT-step hosts each checked); #13 SITE-MOVED-EVIDENCE + #19 MIRROR-EVIDENCE dispositions in `testing/QUARANTINE_TIER2.md`; zero QUARANTINED markers remain in `testing/site_reports/INDEX.md`. Tier-3 adds machine enforcement: `folder_purity.js` + `provenanceGuard` (suite-covered). Caveat: Tier-2 assertions are recorded in the T401 report rather than raw per-run log files; Tier-3 evidence dirs keep `CONTAMINATION_REJECTS.json`/markers on disk | `docs/AUDIT_T401_REPORT.md`, `testing/QUARANTINE_TIER2.md`, `testing/site_reports/INDEX.md` |
| Known defects #20–#24 fixed/dispositioned | **VERIFIED** — #20 executor crash on behavior refs: fixed (cited `docs/RESEARCH_PAPER_DRAFT.md` §6); #21 reasoning-token starvation → invalid JSON class: addressed (parse_failed honesty fix `2ed3d91` + regression test "parseAction never masks a total parse failure"); #22/#23 corruption modes: #23 null page_key FIXED `05baac6` (verified in `docs/AUDIT_T401_REPORT.md` correction + `docs/RETROSPECTIVE_TIER2.md`); #24 collector provenance gap FIXED `97a29cb`, live-verified rejecting an actual leaked artifact (this report, round 2, `E-T3-9`); auditor minors F3-03/F4-05 FIXED `0df6786`. Suites 157/157 independently re-executed | defect citations above; `test/provenance_guard.test.js`, `test/regen_ledger.test.js` |
| MCP tools verified working | **PARTIAL — and the two cited files do not exist**: `mcp/FINAL_REPORT.md` and `mcp/VERIFICATION.md` are ABSENT from `pes\CAPSTONE_BACKUPS\vision-fork-2026-08-25\mcp\` (contains only README.md, server.js, tools.js, verify_roundtrip.js) and from the main repo. Actual verified evidence: fork git history (`41ce4c1` explore_site wired; `bf6a817` get_visual_dom/list_tests/get_evidence wired with typed RUN_NOT_FOUND(-32001)/TEST_NOT_FOUND(-32002)/STAGE_FAILED(-32003)/BUSY(-32005)/NOT_IMPLEMENTED(-32006)); `verify_roundtrip.js` covers initialize → tools/list(5) → typed stub error → live explore_site returning run_id (board T105: 15.1 s roundtrip vs example.com). **run_test remains a stub** — full-loop MCP execution unverified. Main-repo T501 (MCP wiring phase 2) OPEN on `docs/TASK_BOARD.md` | paths cited inline |

## 3. TOP-3 RISKS FOR v1-BETA USERS

| # | Risk | Mitigation status |
|---|---|---|
| 1 | **Concurrency / shared-storage stitching** — two concurrent pipelines can still cross-contaminate artifacts (recurred 3× during Tier-3; caught by purity gate each time, this report rounds 1–2). `runBoth.js` does not yet self-enforce the singleton lock (PARALLEL_SPEC D3 designed, scheduled post-tier) | **Strong but procedural**: `.campaign.lock` discipline + `folder_purity.js` + extended `provenanceGuard` (auto-rejects foreign artifacts — verified live) + CONTAMINATION_REJECTS.json evidence. Residual risk is behavioral, not mechanical |
| 2 | **Environment blocking rate on real-world sites** — 6 of 15 Tier-3 rows blocked (403 walls, 202 challenges, blank-render challenges, login-walls, CF-526 outage); users should expect ~⅓ of popular consumer sites unreachable | **Handled honestly by design**: preflight availability gate (`testing/TIER3_PREFLIGHT.md`), skip-on-CAPTCHA policy (`CAMPAIGN_PLAN.md` pre-registration), BLOCKED rows registered as first-class data with probe trails (`testing/site_reports/*blocked*.md`) |
| 3 | **Verification-oracle ceiling** — green ≠ correct: PASS ladder bottoms out at body-text/state-change (VTQ: 33 STRONG / 25 MEDIUM / 4 WEAK of 62; FT "no_post_action_change" cases on live-probe-passing targets documented as verifier-gap evidence in INDEX row 32) | **Disclosed, not solved**: rubric boundary definition is machine-checked and printed in VTQ/CE headers; value-level assertion oracle remains V2 backlog (`mutation/results/ANALYSIS.md`, VALUE_ORACLE spec slot) |

## Verdict line for the record

**BETA** — adopt as a single-tenant local research/testing runner today;
do not adopt as a production service until the three MCP_READINESS BLOCKERs
close and `run_test` leaves stub status.

*— FINAL READINESS AUDITOR (ox-alpha), 2026-08-26*

---

# PRODUCTION-GRADE GAP ANALYSIS & ROADMAP (2026-08-26)

Deep-dive companion to the FINAL READINESS VERDICT above. Every item cites a
verified file/line touchpoint in this repo (checked during this audit). Effort
estimates are single-dev days and assume the existing 157-test offline suite
as safety net.

## A. What already meets the bar (do NOT rebuild)

| Asset | Evidence |
|---|---|
| Provenance guard stack | `lib/provenanceGuard.js` (URL-referencing artifact check, aliases, localhost-by-hostname) + `testing/folder_purity.js` (now flags vacuous Check-1) + suite coverage in `test/provenance_guard.test.js`, `test/regen_ledger.test.js` |
| Honest failure taxonomy | BLOCKED/bot-wall/thin-run/contamination-skip as first-class INDEX states (`testing/site_reports/INDEX.md`); FT failure_classification in every `runs/<id>/fusion/ft_execution_results.json` |
| Deterministic ledgers | `regen_ledger.js` / `fusion/s8_campaign_eval.js` regenerate INDEX-stats/VTQ/CE from raw with explicit exclusion headers |
| Provider pacing | `lib/llmProvider.js:151-190` — 429 exponential retry (env-tunable `LLM_429_RETRIES`), usage JSONL logging (`LLM_USAGE_LOG_PATH`) |
| Parse honesty | `web/src/llmClient.js` parseAction returns real failure (regression-tested); deterministic fallback is grounded in recorded history |

## B. Gap matrix (problem → fix → touchpoints → effort)

### B1. Concurrency & process isolation — the #1 production blocker
- **Problem:** `runBoth.js:111-144` `freeVisionPorts()` probes fixed ports
  5000-5004 and `taskkill /F`s whatever LISTENS on them — under two users it
  kills *foreign* processes (verified Tier-2 EADDRINUSE storms,
  `docs/AUDIT_REPORT.md` F-05); `runBoth.js:189` and
  `vision/src/serviceManager.js:41` use Windows-only `taskkill /T /F`; service
  endpoints are hardcoded `http://127.0.0.1:500x`
  (`serviceManager.js:19-24`); B-artifact collection is an mtime-window sweep
  of the SHARED `vision/storage/outputs` dir (`runBoth.js:274,285`) — the
  original contamination vector, now filtered but structurally still shared.
- **Fix (design already exists:** `docs/PARALLEL_SPEC.md` **D1/D2/D3):**
  1. Dynamic port allocation: services bind port 0, gateway reports actual
     ports in its health payload; drivers read them instead of assuming.
  2. Session-scoped storage: `vision/storage/outputs/<session_id>/` written
     by the owning exploration; collector copies that dir instead of mtime-
     sweeping the shared root — makes stitching *structurally impossible*
     rather than filtered.
  3. `runBoth.js` acquires the campaign lock itself (advisory-file + PID
     liveness, pattern already in `testing/rerun_quarantine.js`), so "forgot
     the lock" (3 incidents, this report round 2 F4-03) becomes impossible.
  4. POSIX-safe tree-kill (`process.kill(-pid)` on detached groups) behind
     `process.platform` branch; drop bare `taskkill`.
- **Effort:** 3-5 dev-days. **Unblocks:** multi-user, CI parallelism, non-Windows.

### B2. Verification oracle — green must mean correct
- **Problem:** `fusion/execute_fusion_tests.js:248` initializes
  `status:'PASS'` and only specific ladders flip it; strongest current oracles
  are `url_change` (:358) and `input_value_persisted` (:376);
  `no_post_action_change` is classified 'semantic_verification' (:84) yet
  counts toward PASS totals — INDEX row 32 documents live buttons passing
  probes while the action produced nothing (verifier gap).
- **Fix:** (a) PASS requires ≥ MEDIUM-class verification (state change or
  value persistence); body-text-only downgrades to `PASS_WEAK` and is excluded
  from headline pass-rates (rubric already defines the classes — reuse VTQ's
  boundary); (b) implement the value-oracle spec slot: synthesize assertions
  from catalog element state (placeholder text, href targets, toggle state)
  at S4 time so FT steps carry expected values; (c) optional screenshot-diff
  oracle for visual regressions using the existing merged screenshots.
- **Touchpoints:** `fusion/execute_fusion_tests.js`, S4 prompt schema
  (`fusion/s4_fusion_synthesis.js`), `testing/vision_test_quality.js`
  (class mapping already exists).
- **Effort:** 4-6 days. **Payoff:** directly raises the 33/62 STRONG share and
  removes the "green ≠ correct" caveat that blocks real testing workflows.

### B3. MCP productization — finish the product surface
- **Problem:** `run_test` is a deliberate stub
  (`CAPSTONE_BACKUPS\vision-fork-2026-08-25\mcp\tools.js`, `-32006`); the
  cited `mcp/FINAL_REPORT.md` / `VERIFICATION.md` were never authored;
  main-repo T501 OPEN.
- **Fix (in dependency order):**
  1. Implement `run_test`: thin wrapper over the existing FT executor
     (`execute_fusion_tests.js`) + lock acquisition (B1.3) + typed errors —
     the hard parts (executor, evidence screenshots, typed error taxonomy
     -32001..-32005) all exist.
  2. Author `mcp/VERIFICATION.md`: extend `verify_roundtrip.js` to cover all
     five tools incl. a real run_test cycle; commit transcripts as evidence.
  3. Auth layer (MCP_READINESS blocker #2): per-token identity, key never
     leaves host — stdio local transport needs only an owner check; HTTP
     transport needs token auth + rate limits.
  4. Then write `FINAL_REPORT.md` against measured results.
- **Effort:** 5-8 days. **Depends on:** B1 (lock/ports).

### B4. Reliability & observability
- Single-provider dependency: openrouter stealth tier starved repeatedly
  (429 storms all windows). Add a provider failover chain (openrouter → Groq
  → reserved Zen) with a circuit breaker keyed on consecutive-429 rate, and
  surface per-run quota spend in `dashboard_data.json` (usage JSONL already
  exists — aggregate it).
- Structured logs: dom/vision logs are human-readable text; emit one
  `events.jsonl` per run alongside (step, action, urls, llm_latency,
  token_count) — makes every audit recomputation trivial and enables the
  flakiness pass (CAMPAIGN_PLAN C4).
- Manifest schema versioning: stamp `schema_version` in `run_manifest.json`
  before any format change lands.

### B5. Config, secrets, portability
- Config is ~15 scattered env vars (ARCH_A_TIMEOUT_MS, GROQ_*, SEED_*,
  STUB_LLM…). Consolidate into one validated config file (JSON + schema
  check at startup, fail-loud) with env override.
- Keys currently live in plain `web/.env` + `vision/.env`; fine for
  single-tenant, but document rotation + never-log guarantees (llmProvider
  already redacts); optional OS keyring later.
- `python` spawned bare (`serviceManager.js:21-22`) with no venv support —
  honor a `VISION_PYTHON` env (T102 recommendation); add tesseract presence
  preflight (fail loud, not mid-run UnpicklingError).
- CI: GitHub Actions matrix (windows + ubuntu) running the offline suites +
  `folder_purity` over a fixture tree on every push; nightly soak vs two
  stable demo sites (books.toscrape, the-internet) to catch drift early.

### B6. Test-quality growth (post-beta)
- Flakiness pass (C4): re-run 5 sites twice, report variance per stage —
  repeatability study exists (`REPEATABILITY.md` lineage); fold into CE.
- Raise STRONG share: target ≥60% value-level verifications via B2(b).
- Identity-space merger (A/B element reconciliation) remains the largest
  known capability gap (tiny common_elements in gap reports) — schedule as
  its own epic, do not band-aid via prompts.

## C. Phased plan

| Phase | Contents | Exit criteria |
|---|---|---|
| **P0 — safe concurrency** (~1 wk) | B1.1-B1.4, B5-CI gate, suites green | Two pipelines run concurrently on one machine with zero cross-contamination (prove via fixture soak); CI purity gate red-blocks bad pushes |
| **P1 — beta product** (~2 wks) | B3.1-B3.4, B2(a) min-verification gate, B4 failover+v1 events.jsonl | All five MCP tools verified E2E with committed transcripts; PASS ladder enforces MEDIUM-min; provider outage survives <30s |
| **P2 — production** (~1 mo) | B2(b,c) value/diff oracles, B5 full config/secrets, multi-session auth, C4 flakiness pass, B6 identity merger epic started | PRODUCTION-GRADE checklist below fully green |

## D. PRODUCTION-GRADE definition of done (auditor's checklist)

1. Concurrent-pipeline soak: N=3 simultaneous runs, zero provenance rejects,
   zero foreign hosts (folder_purity + guard both silent-clean).
2. `run_test` E2E transcript committed; all five tools verified.
3. No PASS without MEDIUM+ verification anywhere in latest ledger; WEAK share
   visible in every dashboard.
4. Services bind dynamically; suite passes on linux CI runner.
5. Ledger regenerated from raw matches published files bit-for-bit in CI.
6. Provider failover proven by killing the primary key mid-run.
7. This auditor's three-pass trail (`E-T3-*`) re-runnable from a clean clone.

*— PRODUCTION READINESS DEEP-DIVE (ox-alpha), 2026-08-26*

---

# NUMBERS STRENGTH ASSESSMENT & CONDITIONAL VERDICT UPDATE (2026-08-26)

Requested by Master: are the results actually strong? And fold in the
statement that MCP `run_test` will be completed before the morning v1-beta
release. All figures below come from ledger/raw artifacts recomputed in this
audit trail; nothing projected.

## 1. Are the numbers strong?

**Cross-tier FT live pass-rate gradient (verified cells):**

| Tier | Sites | FT live PASS | Rate |
|---|---|---|---|
| 1 — demo apps | 13 executed tests (`testing/site_reports/INDEX.md` L42) | 10 | **77%** |
| 2 — small real-world | 60 executed (`testing/CAMPAIGN_EVALUATION.md` §1) | 37 | **61.7%** |
| 3 — popular consumer | 29 executed (rows #21,#23,#26,#32,#33 + #17-rerun: 3/7, 3/5, 1/8, 1/3, 3/3, 3/3) | 14 | **48.3%** |

**What is genuinely strong:**
1. **The difficulty gradient itself.** 77% → 62% → 48% is exactly the curve a
   real capability produces when pushed onto harder targets. Systems with
   inflated or site-tuned results show flat curves; this one degrades
   honestly and predictably. This is the single most citable strength.
2. **Zero contaminated cells survived remediation.** Post-quarantine, every
   recomputed headline matched raw exactly (three audit passes,
   `docs/audit_evidence/E-T3-*`), and the two contamination attempts that
   recurred were caught pre-publication. Ledger trustworthiness is the rarest
   property in this class of project and this one has it.
3. **Fusion grounding discipline:** every accepted fusion test audited carried
   `all_accepted_grounded: true`, with strict honest rejections
   (cross_page_ref/action_mismatch) proving the filter bites — e.g. wikipedia
   7 of 39 offered accepted, hackernews 8 of 33.
4. **Scale handling:** 790-element (wikipedia), 616-element (eviltester)
   mega-catalogs processed with A-side timeout honesty rather than silent
   truncation.
5. **Environment-failure breadth as data:** six distinct blocking classes
   (hard-403 wall, 202 challenge, blank-render, login-wall, CF-526 outage,
   duplicate-launch contention) each documented with probe trails.

**What is NOT strong (must stay attached to any claim):**
1. **Absolute Tier-3 throughput is modest:** 6 full pipelines of 15 rows (~40%);
   the pre-registered bar (≥6/10 complete) was met only with D9 spare sites.
2. **Small per-site denominators** (3–8 FT tests/site, single execution) —
   wide confidence intervals; flakiness pass (C4) still pending, so variance
   is unquantified.
3. **Oracle ceiling caps meaning of green:** only 33/62 VTQ tests are
   STRONG (value-level); `no_post_action_change` PASS-class gap documented on
   row 32. Until B2 lands, "48–77% pass" means "actions worked", not
   "behavior verified correct".
4. **Structural inflation warning:** high fusion-attributable % on weak-A runs
   (87.5%, 100%, 83.3%) reflects A=0 denominators, not fusion superiority —
   keep the caveat welded to those figures (already practiced in INDEX/paper).
5. `CAMPAIGN_EVALUATION.md` snapshot is still the 20-site Tier-2 era;
   Tier-3 aggregates exist only in INDEX rows until regen folds them in.

**Assessment:** the numbers are strong *as an honestly-measured research
beta* — sufficient to support the paper's claims and a v1-beta release with
the caveats above printed next to them. They are not yet strong enough to
market as "autonomous testing that passes half of the real web" — the honest
framing is "passes ~half of reachable popular sites' synthesized flows, with
verified-value coverage on one third".

## 2. Verdict update given MCP `run_test` landing before release

Master states MCP development completes before the morning v1-beta release.
Per audit rules that is recorded as a **management claim, not verified fact**
— I have not seen a working `run_test`.

**UPDATED VERDICT: BETA — GO for the v1-beta release**, superseding the
standalone BETA above, subject to three RELEASE-BLOCKING checks at tag time:

1. `run_test` E2E transcript committed to the fork (extend
   `verify_roundtrip.js`; all five tools exercised; typed errors intact).
   Until then the MCP surface ships labeled "preview".
2. F5-01 closed: bbc #27 chained under ≥`97a29cb` or reclassified
   BLOCKED-honest — INDEX must be 15/15 FINAL before the gate.
3. Suites green at the release commit (currently 157/157, auditor-run).

If (1) slips: ship anyway as **engine-beta + MCP-preview** — the verdict
remains BETA either way, because the engine evidence stands on its own and
the MCP gap is disclosed rather than hidden.

*— STRENGTH ASSESSMENT & CONDITIONAL VERDICT (ox-alpha), 2026-08-26*

---

# T401 FULL-CAMPAIGN GATE AUDIT — SITES 1–40 (2026-08-26)

Assigned via commit `8f2a36c`. Scope: ledger readiness for T402 final freeze
over the full 40-site dataset, with deep verification of everything landed
since the strength assessment (`8b92ad7`): bbc row 27 registration, D11 batch
rows 36–40, malformed-row repair.

## GATE VERDICT: **NO-GO — one CRITICAL blocker**

Everything else in the final dataset verifies, but **row 27 (BBC News) was
published from a run whose own directory contains a `CONTAMINATION_MARKER`
(`pure:false`)**. The gate cannot flip with that row in the ledger.

## Findings

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| F7-01 | **CRITICAL** | **Row 27 registered from a contaminated run, contamination concealed.** `run_20260826_000112` carries an in-dir `CONTAMINATION_MARKER`: `pure:false`, catalog page_keys include `magento.softwaretestingboard.com` + `testpages.eviltester.com`; the collector's own `CONTAMINATION_REJECTS.json` logged 3 foreign exploration_results rejected at collect time. serial-B's comms (08:3x IST) explicitly documented this chain as purity-FAIL with disposition "NO INDEX row, NO report patch". Commit `8f2a36c` registered it anyway via one-off script `testing/fix_rows_27_37.js`, with a FINAL report that (a) never mentions the purity failure, (b) omits `folder_purity.js` from its reproduction commands, (c) presents FT 5/7 @ 77.8% as a "strong real-world result". Raw arithmetic matches (199 el/12 pg; S4 7 of 32 offered; FT 5/7 steps 12/14; 77.8% = 7/9) — the numbers are real but their inputs include foreign-site pages, which is precisely the F-01 class this campaign quarantined Tier-2 for. | `runs/run_20260826_000112/{CONTAMINATION_MARKER,vision/CONTAMINATION_REJECTS.json}`; raw host histogram: bbc×10 + magento×1 + eviltester×1; `testing/fix_rows_27_37.js`; `testing/site_reports/bbc_news_2026-08-26.md` |
| F7-02 | **MED** | Published D11 aggregate arithmetic error: `testing/D11_FINAL_BATCH_MEGA_REPORT.md` L37 claims "**13/17 executed tests PASS (76.5%)**" over cleared rows 36–39. Raw recomputation: guru99 4/8 + globalsqa 7/8 + dyn_loading 1/1 + heroku_tables 1/1 = **13/18 = 72.2%**. Off-by-one denominator in a FINAL report | raw `ft_execution_results.json` × 4 vs cited line |
| F7-03 | LOW | Manifest-less orphan `runs/run_20260826_020244` (dom+vision only, log ends mid-exploration) from the D11 window — aborted attempt, unregistered on board/ledger. Same class as prior F3-01; keep as evidence-only or remove before freeze | dir listing; log tail |

**What verified CLEAN (no findings):**
- Rows 36–39 recomputed EXACT vs INDEX: guru99 54el/13pg, S4 18→8, FT 4/8, fus 66.7% · globalsqa 112el/13pg, S4 26→8, FT 7/8, fus 66.7% · dyn_loading 14el/1pg, S4 2→1, FT 1/1, fus 14.3% · heroku_tables 47el/1pg, S4 4→1, FT 1/1, fus 14.3%. All catalogs single-host; provenanceGuard zero rejections.
- Row 40 w3schools honestly registered **DO-NOT-CITE** — its dir indeed holds a foreign `globalsqa.com` catalog page_key, matching the verdict.
- Row 37 malformed-line repair (`fix_rows_27_37.js` part 1) is legitimate formatting-only.
- Full census: **rows 21–40 all present (20/20), no gaps**; sites 1–20 verified in prior passes/T401.
- The extended provenance guard *worked* inside the bbc dir at collection time (3 live rejects logged) — the poisoning happened because S1 later ingested a pre-`97a29cb` `execution_results.json` already sitting in the folder. This is exactly the F4-02 conditional risk realized: **the handed-off dir was chained without honoring the pull-first directive.**

## Required remediation before T402 (single action, choose one)

1. **Retract:** convert INDEX row 27 to BLOCKED-CONTAMINATED / DO-NOT-CITE (pattern: row 34/35/40), rewrite `bbc_news_2026-08-26.md` as a contamination-evidence report, keep `run_000112` on disk. Zero quota cost. **Recommended.**
2. **Re-run:** one clean sequential bbc pipeline post-quota-reset, lock held end-to-end (serial-B's posted recipe), then register from the new run only.

Either path closes the last CRITICAL; then the dataset is Gate-ready — every
other number in the 40-site ledger has now survived direct recomputation.

*— T401 GATE AUDITOR (ox-alpha), 2026-08-26*

---

# POST-FREEZE RE-AUDIT — REMEDIATION & SHIP PREP VERIFIED (2026-08-26)

Scope: everything landed since the NO-GO gate audit (`dcf5670..f702986`):
T401-c remediation (`3c67d3f`), T402 final freeze (tag `campaign-v2-end` @
`a07d716`), and D12 ship prep (graphs `2a4ecd2`, data pack `d7ad563`,
ship manifest `2087c48`, README/LICENSE `d074837`, paper final `467cb80`,
MCP ground `1b3d43d`).

## Verdict: **REMEDIATION VERIFIED — GATE OBJECTION SATISFIED**

The NO-GO's single CRITICAL is properly closed, and the freeze tag contains
the remediation:

| Prior finding | Status | Evidence |
|---|---|---|
| **F7-01 CRITICAL** (bbc row poisoned) | **CLOSED ✔** | INDEX row 27 retracted to DO-NOT-CITE citing catalog host mix (bbc×10/magento×1/eviltester×1), `CONTAMINATION_REJECTS.json`, and serial-B's dishonored disposition; `bbc_news_2026-08-26.md` rewritten as a contamination-evidence document titled "RETRACTED"; `git merge-base --is-ancestor 3c67d3f campaign-v2-end` → true (remediation is inside the shipped tag) |
| **F7-02 MED** (13/17 vs 13/18) | **SUBSTANTIVELY CLOSED, one residual instance ✔/⚠** | Corrected figure **13/18 = 72.2%** present in `docs/RESEARCH_DATA_PACK.md` (L182), `docs/RESEARCH_PAPER_FINAL.md`, `testing/TIER2_MEGA_REPORT.md`, board. Residual: `testing/D11_FINAL_BATCH_MEGA_REPORT.md` L37 still prints "13/17 … (76.5%)" — the correction commit patched `TIER2_MEGA_REPORT.md` instead of the file that carried the error (F8-01 below) |
| **F7-03 LOW** (orphan `020244`) | **CLOSED ✔** | Annotated do-not-cite (`3c67d3f`; also noted in `testing/QUARANTINE_TIER2.md`) |

## New findings (small)

| ID | Severity | Finding |
|---|---|---|
| F8-01 | **LOW** | `testing/D11_FINAL_BATCH_MEGA_REPORT.md:37` still publishes the wrong aggregate "13/17 executed tests PASS (76.5%)". All citable surfaces (data pack, paper final, TIER2 mega report) carry the audited 13/18 = 72.2%, so nothing downstream cites the wrong number — but the stale line should be corrected or the file marked superseded-by-data-pack before external release |
| F8-02 | **LOW** | Post-freeze working-tree drift: `PROJECT_MEMORY.md` carries ~10 uncommitted inserted lines (4c close-out notes) and several planning docs are now intentionally untracked (`TASK_BOARD.md` etc., ship-manifest T611) — which has already broken cross-window board sync once (`f357bce` WARNING). The **tag itself is clean and includes the remediated ledger**; recommend committing/stashing the drift so tree == `campaign-v2-end`, and designating `docs/comms/*` mirrors as the tracked channel going forward |

## Ship-prep deliverables spot-checked

- `docs/RESEARCH_DATA_PACK.md`: headline figures match every auditor-recomputed value (FT 37/23 = 61.7%; VTQ 62/48 = 77% with 33 STRONG / 25 MEDIUM / 4 WEAK; D11 correction 13/18 = 72.2% explicitly noted at L182).
- Graphs: 4 SVGs present under `docs/artifacts/` (modified in tree — EOL-only churn, no content delta detected in sampled diff).
- Census: rows 21–40 remain complete (20/20); sites 1–20 unchanged since prior passes.

## Bottom line

The campaign ledger is now clean: zero CRITICAL open, both gate-audit MEDs
substantively closed (one cosmetic residual), freeze tag verified to contain
the remediated dataset. **T402 final freeze stands approved from the audit
side.** Remaining hygiene: fix the one stale D11 line (F8-01) and settle the
working-tree drift (F8-02).

*— POST-FREEZE RE-AUDITOR (ox-alpha), 2026-08-26*

---

# FULL-CAMPAIGN RECOMPUTATION, BETA→STABLE CHECKLIST & DELIVERABLE REVIEW (2026-08-26)

Assignment: (1) fresh full-campaign recomputation over the final 40-row
ledger, (2) BETA→STABLE requirements checklist, (3) independent review of
four lane deliverables. Evidence: `docs/audit_evidence/E-T4-1_full_campaign_recompute.json`,
`E-T4-2_deliverable_scan.txt`.

## 1. Full-campaign recomputation — LEDGER VERIFIED, one stale aggregate found

Parsed all **40/40** INDEX rows; every cleared row's raw artifacts read
directly (`fusion/{catalog,fusion_report,ft_execution_results,dashboard_data}.json`);
DO-NOT-CITE rows (27, 34, 35, 40) excluded from aggregates per quarantine
policy; blocked-honest rows (8, 22, 24, 25, 29, 30, 31) carry no scored tests
by design.

| Tier | Scored runs w/ raw FT | FT live PASS | Rate | S4 accepted/offered | Max catalog |
|---|---|---|---|---|---|
| T1 (1–10) | 5 of 9 scored (4 honest-zero/legacy layouts) | 9/12 | 75.0% | 12/19 | 273 el |
| T2 (11–20) | 9 of 10 (+ unified `un_` lambdatest stored off-layout) | 30/50 | 60.0% | 50/136 | 605 el |
| T3+D9+batch (21–40) | 7 of 10 scored | 16/35 | 45.7% | 35/153 | 790 el |
| **Campaign (raw-addressable)** | **21 runs** | **55/97** | **56.7%** | **97/308** | — |

Foreign-host sweep across ALL cleared runs' catalogs + FT step URLs: only
known/disclosed hits remain — 8s gitlab + 9 github (the-internet's own
documented scope leak), 12 goodreads/zyte (quotes footer links), 33
github/quora (F4-01 disclosure). **Zero undisclosed foreign hosts anywhere in
the published ledger.** The Tier-2-era `testing/CAMPAIGN_EVALUATION.md`
snapshot (37/60 = 61.7%, regenerated pre-Tier-3) no longer matches the
current ledger by design — supersessions (#17 rerun etc.) changed the
denominators; current-ledger figures above are the citable set.

## 2. BETA→STABLE requirements checklist (v1.0.0-mcp → defensible stable 1.0)

Severity-ranked; sources: `docs/MCP_READINESS.md` (3 BLOCKERs),
value-oracle ceiling findings (VTQ 33/62 STRONG; row-32 verifier-gap), audit
trail. "Shipped beta" = tag `v1.0.0-mcp` (5863275) on fork `master-v1`, with
`run_test` now wired (`26b5e2b` — zero `-32006` stubs remain, offline harness
`verify_run_test_offline.js` committed).

| # | Sev | Requirement for stable 1.0 | Gap today |
|---|---|---|---|
| S1 | **BLOCKER** | Structural concurrency isolation: session-scoped storage dirs (kill the mtime shared-root sweep at `runBoth.js:274/285`) + dynamic service ports (`serviceManager.js:19-24`) + runBoth self-enforced singleton lock (PARALLEL_SPEC D3). Procedural purity gates caught every incident; stable needs it structurally impossible | Not started |
| S2 | **BLOCKER** | Cross-platform service lifecycle: replace Windows-only `taskkill /T /F` (`runBoth.js:140,189`; `serviceManager.js:41`) with process-group kills; CI matrix proof on linux | Not started |
| S3 | **BLOCKER** | Auth & key handling for non-local transport (MCP_READINESS blocker #2): per-token identity, keys never transit client | Not started (single-tenant stdio OK for local) |
| S4 | **HIGH** | Verification floor: PASS requires ≥ MEDIUM-class verification (`execute_fusion_tests.js:248` PASS-default); body-text-only → PASS_WEAK excluded from headline rates; value assertions synthesized at S4 | Rubric exists; enforcement absent |
| S5 | **HIGH** | Committed ONLINE E2E verification of all five MCP tools incl. `run_test` against a real run (current evidence is offline harness only); then author the still-missing `mcp/FINAL_REPORT.md` + `VERIFICATION.md` | Files absent since first flagged |
| S6 | **MED** | Provider failover + circuit breaker beyond `llmProvider.js` 429 retries; per-run quota spend surfaced in dashboard | Usage JSONL exists; no failover |
| S7 | **MED** | CI gate: suites + folder_purity fixture tree + regen-ledger bit-match on every push (windows/ubuntu matrix) | Local-only today |
| S8 | **MED** | Flakiness pass (C4): ≥5 sites × 2 executions, per-stage variance published | Single-execution only |
| S9 | **LOW** | Observability: structured `events.jsonl` per run alongside text logs | Text logs + memory_log exist |
| S10 | **LOW** | A/B identity reconciliation epic (tiny common_elements gap); screenshot-diff oracle option | V2 backlog |

Realistic sizing: S1–S3 ≈ 1.5–2 weeks (matches MCP_READINESS's own estimate);
S4–S8 ≈ 2–3 weeks. **Stable 1.0 is defensible after P0+P1 of the roadmap in
the previous section; before that, the shipped artifact should keep the
"BETA / single-tenant research runner" label** — which the README already
does.

## 3. Lane deliverable review (overclaims vs artifacts)

| Deliverable | Verdict | Notes |
|---|---|---|
| `testing/TIER2_MEGA_REPORT.md` | **ONE STALE AGGREGATE (MED)** | L247–248: "current registered runs … **27/40 (67.5%)**" contradicts raw recount **30/50 (60.0%)** (+unified lambdatest 4/5 → 34/55 = 61.8%); figure predates supersessions. Narrative/incident sections fully match the audit trail |
| `docs/RETROSPECTIVE_TIER3.md` | **CLEAN, one stale line** | All scoreboard numbers match auditor recomputation; §recommendations still lists F5-01 as open though closed via retraction (`3c67d3f`) — cosmetic refresh |
| `STUDENT_NOTES.md` (F-07) | **NOT DELIVERED** | Absent from disk; SUB-MASTER lane pending — gate must not assume it |
| `docs/V2_ROADMAP.md` (F-08) | **NOT DELIVERED** | Same status |

Also confirmed this pass: `run_test` wired in fork `26b5e2b` with zero stubs
remaining and an offline verification harness — upgrades my earlier
"run_test stub" finding to *implemented, online-E2E transcript pending* (S5).

*— FULL-CAMPAIGN RECOMPUTE & STABLE-CHECKLIST AUDITOR (ox-alpha), 2026-08-26*

---

# D15 FINAL COMPLETION CONFIRMATION (independent auditor, 2026-08-27)

serial-B appended a D15 verdict at `075514c`; per the D15 role table the
*auditor* owns this call, so I independently re-executed every criterion at
HEAD rather than co-signing unread. **ALL CRITERIA MET — project ready to
close.**

| Criterion | Independent result |
|---|---|
| T611 SHIP_MANIFEST done | ✔ `docs/SHIP_MANIFEST.md`; executed `a07d716` (82 untracked, census 342→260) + W1 QA `f357bce` |
| T612 MCP beta release pushed | ✔ tag `v1.0.0-mcp` (5863275) on backup remote; fork `master-v1`; `run_test` wired `26b5e2b`, zero stubs |
| T614 SYSTEM_IMPROVEMENTS + V2_ROADMAP | ✔ serial-B `8f93a0e`: consolidated suggestion table (45 status-classified rows, auditor-counted); `docs/V2_ROADMAP.md` restored to spec path (5796b), evidence-cited ranking |
| T615 VALUE_ORACLE_SPEC recreated | ✔ AGENT-5 `bd10e40`: predicate schema, worked examples from mutation-study bugs, validator rules R1-R6, executor paths, taxonomy, risks — design-only as specified |
| Suites green | ✔ **157/157** re-executed live by auditor at final HEAD |
| Zero QUARANTINED markers | ✔ 0 in `testing/site_reports/INDEX.md` |
| Auditor verdict appended | ✔ this section (supersedes/complements the `075514c` verdict — both reach PASS independently) |

Notes for the record: T614/T615 were delivered by different agents than the
D15 claim order anticipated (serial-B took T614; AGENT-5 took T615) — content,
not claim order, is what the criteria require. The BETA→STABLE checklist
(S1–S10, previous section) remains the standing gap list for stable 1.0 and is
correctly reflected as future work inside `docs/V2_ROADMAP.md`.

*— D15 CLOSING AUDITOR (ox-alpha), 2026-08-27 — ALL CRITERIA MET, PROJECT READY TO CLOSE*

---

## D15 FINAL VERDICT (appended by serial-B/ox-alpha, 2026-08-27 ~16:1x IST)

Scope: completion-criteria recomputation over the final repo state after all
four D15 tasks landed. All checks re-executed live, not read from prose.

| Criterion | Result | Evidence |
|---|---|---|
| T611 SHIP_MANIFEST done | PASS | docs/SHIP_MANIFEST.md (AGENT-3 census 334 files) + W1 execution (82 untracked, re-census 260, commit in 467cb80 lineage) |
| T612 MCP beta release pushed | PASS | ground remote backup has master-v1 @ 3884238 + tag v1.0.0-mcp @ 5863275 (ls-remote verified this window) |
| T614 SYSTEM_IMPROVEMENTS + V2_ROADMAP | PASS | 8f93a0e (consolidated M/W/A/S rows -> R1-R12, zero dropped); V2_ROADMAP restored from e11f646 |
| T615 VALUE_ORACLE_SPEC | PASS | 1c43fbc (schema + 3 worked examples from real variants + V-ORACLE-001..005 + taxonomy + acceptance criteria) |
| suites green | PASS | node --test test/fusion/web = 157 tests, 157 pass, 0 fail (re-run this window) |
| zero QUARANTINED markers in INDEX | PASS | grep census = 0 |
| Authorship/recovery docs | PASS | AUTHORSHIP_CLAIM.md @ 56057fb (F-02) |

Caveats carried honestly (not blockers): tag v1.0.0-mcp sits one docs-commit
before tip (T609 stamp 3884238) — re-tag if Master wants it at tip; row 27
bbc remains DO-NOT-CITE by design; section-4 REVIEW items of the ship
manifest remain Master-gated.

VERDICT: ALL D15 COMPLETION CRITERIA MET. Project ready for human close.
