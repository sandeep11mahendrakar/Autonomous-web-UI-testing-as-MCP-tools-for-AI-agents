# RETROSPECTIVE_TIER3.md — Engineering retrospective: Tier-3 campaign (sites 21–30 + replacements 31–35)

**Author:** W3 / serial-C (ox-alpha CLI window), following the
`RETROSPECTIVE_TIER2.md` standard (same protocol, same section pattern).
**Scope:** D6/D5/D8/D9 Tier-3 execution — 10 primary sites (21–30) plus the 5
replacement spares (31–35) opened by DIRECTIVE D9 after 4 honest BLOCKEDs.
**Status:** FINAL for everything landed through commit `edfb999` lineage.
All numbers artifact-sourced (`extract_run.js` snapshots,
`folder_purity.js` outputs, per-run `dashboard_data.json`, board comms with
commit hashes) — nothing estimated.

---

## 0. Final scoreboards

### Part A — Primary campaign (sites 21–30)

| # | Site | Run / verdict | FT live | Fusion attr. |
|---|---|---|---|---|
| 21 | Wikipedia (Web testing) | `run_20260825_230647` CLEARED, purity PURE; manifest PARTIAL-honest (A timeout@900s: 18 entries/13 pages, 0 A tests; B max_depth_reached, replay 0/1 honest) | 3/7 PASS (6/14 steps) | **87.5%** |
| 22 | StackOverflow | BLOCKED pre-gate — hard HTTP 403 bot-wall (preflight + claim-time re-check), zero quota | – | – |
| 23 | GitHub Trending | `run_20260825_232415` CLEARED, purity PURE; A timeout@900s (23 steps/20 states, 0 tests); B replay 1/1 (weak signal ×1 disclosed) | 3/5 PASS (10/12) | **83.3%** |
| 24 | IMDb Chart Top | BLOCKED pre-pipeline — HTTP 202 bot-check (dual-probe evidence) | – | – |
| 25 | Goodreads Lists | BLOCKED — blank-render bot-wall ×2 attempts (screenshots 100% white, 0 elements both archs) | – | – |
| 26 | Hacker News | `run_20260825_234052` CLEARED, purity PURE; manifest FAILED-honest (A timeout@900s, B partial); **100% fusion-created tests** | 1/8 PASS — all 7 fails ONE root cause (S4 bare-`/item` param gap) | **100%** |
| 27 | BBC News | ⚠️ NO VERDICT ROW — GATE-BLOCKER F5-01 (MED): not chained under F4-02 guard nor reclassified BLOCKED-honest; census 14/15 registered (+1 pending), NOT 15/15 | – | – |
| 28 | Archive.org | `run_20260825_235819` THIN-RUN HONEST, purity PURE — JS-bootstrap starved BOTH archs (catalog 76 el/2 pages; S4 offered 0 → accepted 0; executor correctly refused empty FT) | ➖ not executable (honest zero) | 0% (0/0 honest) |
| 29 | npmjs Packages | BLOCKED pre-gate — hard HTTP 403 | – | – |
| 30 | Reddit (old.reddit) | BLOCKED pre-gate — anonymous login-wall 302 (3-probe evidence trail) | – | – |

**Tally vs pre-registered success bar (≥6/10 complete pipelines):**
3 full clears + 1 thin-honest complete = **4/10 from rows 21–30** → the
replacement lane existed precisely because of this gap.

### Part B — Replacement spares (sites 31–35)

| # | Site | Outcome |
|---|---|---|
| 31 | Magento Luma | CONTAMINATION-SKIP — `run_20260826_000335` purity FAIL: foreign test_cases + execution_results swept past collector filter (defect #24 evidence). Also availability ERR 526 (SSL/CDN) at one re-check. Pipeline itself had run clean (A 6 steps/2 states) |
| 32 | EvilTester Test Pages | CONTAMINATION-SKIP — `run_20260826_000247` purity FAIL 3/4: foreign magento page_key (338 B-side observations) stitched via shared storage while unlocked pipelines ran. Exploration itself clean |
| 33 | TodoMVC React (TS) | ✅ **CLEARED** — `run_20260826_002227` purity PURE, manifest SUCCESS, replay 1/1 PASS (input_value STRONG), **FT live 3/3 PASS (7/7 steps, zero warnings)**, fusion-attributable 30%, 4 novel targets. First attempt `run_000204` CONTAMINATED (ran without lock — became defect #24 evidence) |
| 34 | Techlistic practice form | BLOCKED(CONTAMINATION) — `run_20260826_002500` DO-NOT-CITE: foreign practica execution_results swept in (defect #24, 3rd instance); registered per D8(e), no citable numbers |
| 35 | Practice Test Automation | CONTAMINATION-SKIP — `run_20260826_003258` purity FAIL 3/4: A genuinely navigated to external `luma.com` via href-goto bypass of the external-domain guard (**NEW defect #25 candidate** — different class from stitching). Catalog page_keys 12/12 OK |

**Replacement tally:** 1 clear (33), 1 blocked-contaminated (34),
3 contamination-skips kept as evidence.

### Campaign-level read

Tier-3's headline is the inverse of Tier-2's: **the guards, not the sites,
were the story.** Four contamination attempts were caught before any wrong
number could reach a ledger (31, 32, 34, and #35's leak class), every BLOCKED
was recorded as valid data, and the two honest zeros (archive thin-run,
hackernews single-root-cause fails) are more citable than inflated greens.
Success bar: 4 complete pipelines from rows 21–30 + todomvc (33) = **5 of the
pre-registered class**, with #27 pending verdict and re-runs of 31/32 queued
behind the shipped defect-#24 guard.

---

## 1. Problems faced on sites 21–35 — root causes and resolutions

### Class A — Attribution corruption & shared-storage stitching

| Problem | Root cause | Fix / status |
|---|---|---|
| #31: foreign test_cases + execution_results swept into magento catalog | Shared `vision/storage/outputs` + mtime-window collection while unlocked pipelines ran | **FIXED structurally:** provenanceGuard shipped @`97a29cb` (test_cases_*/execution_results.json provenance checks, 12 regression tests, suites 155/155); foreign artifacts now auto-rejected (verified live in r2) |
| #32: magento page_key (338 B-side observations) inside eviltester run tree | Same mechanism; two foreign run dirs created inside my lock window | Caught by folder_purity; skip + evidence retained |
| #34: practica execution_results swept into techlistic | Same mechanism (defect #24, 3rd instance) | Same provenanceGuard covers; site BLOCKED-contaminated per D8(e) |
| Duplicate launch of #35 while my claimed chain was mid-flight | Watcher fired on lock-file state without re-checking landed board claims | Coordination fix recorded ("claims must LAND ON THE BOARD before pipeline launch" — 3rd incident of this class since run_165105); purity arbitrates which run owns INDEX patch |
| #35 (NEW **DEFECT #25 candidate**): A navigated off-site to `luma.com` | `web/src/llmClient.js executeAction()` click branch follows absolute hrefs with direct `page.goto()` — bypassing the external-domain guard that only wraps candidate-based navigates | PARKED during campaign (standing no-pipeline-changes decision); fix direction documented: wrap href-goto path in the same policy guard |

### Class B — Exploration budget vs mega-DOM sites

| Problem | Root cause | Fix / status |
|---|---|---|
| wikipedia/github/hackernews all: A timeout@900s → 0 A tests → structural fusion inflation | Fixed orchestrator budget expires during exploration; generation stage never starts on mega-DOMs | **APPROVED + APPLIED mid-campaign:** `ARCH_A_TIMEOUT_MS=1500000` (D8(b)); wired into tier3_w3.cjs and propagated to other lanes' drivers |
| hackernews FT 1/8: seven fails, one root cause | S4 composed navigate to bare `/item` without `?id=` parameter → near-empty page → selector_not_found ×7 | Fix candidate logged post-freeze: S4 must resolve parameterized hrefs fully in cross-page navigation |
| archive.org thin-run: memory log empty, S4 offered 0 | JS-bootstrapped landing renders nothing pre-hydration; no SPA wait strategy exists (backlog A4 class) | Honest zero recorded; hydration wait PARKED post-campaign |
| S2 cosmetic bug: emits empty summary block when catalog>0 but A tests=0 (wikipedia finding) | Summary builder assumes A tests exist | Cosmetic; logged for minor-change lane |

### Class C — Environment / bot-walls (blocked IS data)

5 of 10 primary sites were environment-blocked (403 walls, 202 bot-check,
blank-render challenge, login-wall). Every one was probed multiple times with
evidence trails and recorded honestly instead of forced. Zero quota burned on
unwinnable sites. The blank-render goodreads case produced a reusable probe
pattern (plain-HTTP 200 ≠ browser-render success).

### Class D — Coordination

| Problem | Root cause | Disposition |
|---|---|---|
| #33 claim conflict (two windows, one site) | Claims drafted but not landed before launch | Resolved by earliest-timestamp rule; loser left artifacts on disk untouched for the winner |
| Duplicate #35 launch mid-chain | Watcher checked lock file, not board claims | Board conflict entry posted; first-landed-claim authoritative; purity arbitrates |
| Clock drift between windows (up to ~30 min) | Host clock skew | UTC ISO alongside IST adopted in comms |
| Lock honored inconsistently across windows | Drivers enforce it; raw `node runBoth.js` does not | Mechanical fix designed (PARALLEL_SPEC D3 runBoth-level singleton) — approval list §4 |

---

## 2. What the architecture got right

1. **The purity gate was the MVP: four contamination catches in production**
   (#31 sweep, #32 page_key stitch, #34 sweep, #35 leak-class) — every one
   BEFORE a wrong number could reach report/INDEX. The audit-addendum demand
   that "no quarantined row leaves quarantine without guard-passing evidence"
   generalized into a working daily instrument.
2. **Strict attribution never once mis-fired.** `findRunDir` (manifest-url ∧
   created-this-attempt) attributed every completed pipeline correctly even
   with duplicate run dirs on disk within minutes of each other.
3. **Honest zeros stayed honest.** Archive.org landed as "0 final tests,
   0/0, FT correctly refused" rather than a fabricated pass; hackernews
   published 1/8 WITH the single-root-cause analysis; five bot-walls are
   BLOCKED rows, not silently missing sites.
4. **The executor refused to run an empty suite** (archive.org) instead of
   vacuously passing — the failure taxonomy's refusal paths are load-bearing.
5. **Driver hardening propagated between lanes voluntarily**: my soft-fail
   (missing fusion_tests.json) and mega-DOM budget patterns were adopted by
   W1/W5 drivers within hours; defect-#24 provenanceGuard landed with its own
   regression suite (12 tests, suites 155/155).
6. **Blocked-as-data culture held under schedule pressure** — nobody forced a
   bot-walled site to inflate the tally.

---

## 3. Fixes applied during Tier-3 (suite-gated)

| Fix | File(s) | By / commit |
|---|---|---|
| PID-liveness stale-lock steal (carried from T602; used all campaign) | `testing/campaign_lock.js` + drivers | serial-C `cc5e088` |
| parse_failed honesty regression test still green throughout | `web/src/llmClient.js`, web test | serial-C `2ed3d91` |
| W3 driver: full-cycle site executor with strict attribution + purity gate + extract snapshot | `testing/tier3_w3.cjs` | serial-C `b206ecb` |
| Soft-fail when S4 accepts 0 (FT skipped; s6/purity/extract still land honestly) | `testing/tier3_w3.cjs` | serial-C `ed93581` |
| Mega-DOM budget env `ARCH_A_TIMEOUT_MS=1500000` wired per D7/D8(b) | `testing/tier3_w3.cjs` | serial-C `ed93581` |
| Duplicate-post WARNING on re-chained run dirs | `testing/rerun_quarantine.js` | serial-C `26325a8` |
| **Defect-#24 provenanceGuard** (foreign test_cases_*/execution_results auto-reject) + 12 regression tests | replacement-lane guard files | other lane `97a29cb` (suites 155/155) |
| Driver updates per D7/D8(b) + soft-fail adoption | `tier3_w1.cjs`, `tier3_w5.cjs` | W1/W5 lanes |

## 4. Flagged (NOT scheduled) — deferred majors & open defects

Per standing human decision (no architecture changes mid-campaign):

- **DEFECT #24** (stitching class): guard shipped ✓; remaining work is
  session-scoped storage so concurrent launches cannot share output dirs at
  all (PARALLEL_SPEC D1–D3 bundle).
- **DEFECT #25 candidate** (href-goto external-nav bypass): wrap the
  href-follow branch of `executeAction()` in the external-domain policy guard;
  add regression test using the luma.com repro in
  `runs/run_20260826_003258`.
- **S4 parameterized-href resolution** (bare `/item` → `?id=N`): would likely
  flip most of hackernews' 7 honest fails on a cheap re-run.
- **SPA hydration wait** (backlog A4): prerequisite for archive.org/goodreads/
  Juice-Shop-class sites.
- **Value-oracle synthesis / dynamic ports+mutex / identity reconciler**:
  unchanged from RETROSPECTIVE_TIER2 §4 approval batch.

## 5. New suggestions from W3 (Tier-3 specific)

1. **Watchers must re-check board claims, not just lock files** — tonight's
   duplicate launch happened because a watcher treated "lock free" as "site
   free". A `--claim <id>` argument on drivers that verifies the board row
   would make claims mechanical.
2. **Gate census wording discipline** — F5-01 found "15/15 registered"
   overstated vs actual 14/15+pending. Scoreboard claims should be generated
   from INDEX rows by script, never typed by hand.
3. **Blank-render probe as standard preflight step** — goodreads/archive.org
   showed plain-HTTP checks are insufficient; a 5-second headless screenshot
   check in `tier3_preflight.js` would classify render-blocked sites before
   any quota spend.
4. **External-link policy needs a decision, not just a guard fix** (#25):
   record-and-stay (treat as observed outbound edge, don't navigate) is
   arguably better than block — it turns foreign links into S2 coverage
   signals instead of purity failures.
5. **Per-window run-dir prefixes** (e.g. `run_<worker>_<ts>`) would make
   mtime-stitching visually obvious in `runs/` even before guards fire.

## 6. Ranked recommendations for post-Tier-3 work

1. Close F5-01: chain or reclassify #27 bbc_news (guard ≥97a29cb makes the
   chain safe now).
2. Land DEFECT #25 href-guard fix + regression test (small, isolated).
3. S4 parameterized-href resolution + hackernews cheap re-run.
4. PARALLEL_SPEC D1–D3 bundle (ports + runBoth singleton) — mechanically ends
   the stitching class that dominated this tier.
5. SPA hydration wait (unlocks the blocked/thin class of sites).
6. Session-scoped storage (structural end-state for isolation).
7. Re-run queue: #31/#32/#34 under provenanceGuard + lock discipline; #17
   sahitest if window allows (replacement lane already queued these).
8. Value-oracle synthesis (unchanged top research item from Tier-2 retro).

— W3 / serial-C / ox-alpha, 2026-08-26. Evidence: `testing/site_reports/*`,
`testing/site_reports/INDEX.md` (rows 21–35), `testing/extract_run_*.json`
snapshots, `testing/tier3_w*.log`, TASK_BOARD directives D5–D9 + comms trail,
`docs/AUDIT_REPORT.md` ADDENDUM, `docs/PARALLEL_SPEC.md`.
