# V2_ROADMAP.md — Consolidated Post-Campaign Backlog (ranked)

**Created:** F-08 by SUB-MASTER, 2026-08-27. Consolidates every deferred
major, defect fix, and suggestion from: `docs/RETROSPECTIVE_TIER2.md` (§4
approval batch + §5b flagged levers), `docs/RETROSPECTIVE_TIER3.md` (§4
flagged, §5 suggestions, §6 ranked), `docs/PARALLEL_SPEC.md` (D1–D5),
`docs/AUDIT_REPORT.md` (Audit E top-5 risks + F-series), and the human
decision record ("no architecture changes mid-campaign" — everything below
was deliberately parked until now).

**Ranking principle:** integrity-first (items that make results trustworthy),
then value-per-effort (cheap fixes that unlock honest wins), then research
upside. Effort: S <1 day · M 1–3 days · L >3 days.

---

## Tier A — Trust & isolation (do these first)

### R1. PARALLEL_SPEC D1–D3 bundle: dynamic ports + runBoth singleton lock + session-scoped storage
- **Source:** PARALLEL_SPEC D1/D2/D3; RETROSPECTIVE_TIER2 §4 item 2;
  RETROSPECTIVE_TIER3 §6 item 4; audit Audit-E risk #1/#3.
- **Problem it ends:** the entire stitching class (defect #24, four+ production
  catches). Fixed ports 5000–5004 collide; `runBoth.js` doesn't self-enforce
  the lock; shared `vision/storage/outputs` lets concurrent sessions sweep
  artifacts across run dirs.
- **Design already written:** replace `freeVisionPorts()` taskkill pattern
  (`runBoth.js:122-144`) with port-free acquisition; per-worker `.locks/` +
  PID-liveness; env-escape design so driver-held locks aren't double-flagged
  (see F4-03 note); session-scoped output dirs as the structural end-state.
- **Effort/risk:** M–L / medium (touches service lifecycle) — but the single
  highest-trust item on this list.

### R2. DEFECT #25 href-goto guard fix (+ regression test)
- **Source:** RETROSPECTIVE_TIER3 §1 Class A; repro:
  `runs/run_20260826_003258` (luma.com navigation).
- **Problem:** `web/src/llmClient.js executeAction()` click branch follows
  absolute hrefs via direct `page.goto()`, bypassing the external-domain
  guard.
- **Fix direction (documented):** wrap the href-follow path in the same
  policy guard; add regression test from the repro. Consider W3's policy
  question too: "record-and-stay" for foreign links may beat blocking —
  turns foreign edges into S2 coverage signals instead of purity failures.
- **Effort/risk:** S / low. Cheapest trust win on the list.

### R3. Provenance-guard scope completion + fail-closed hardening
- **Source:** audit F4-05 (LOW); w3schools #40 leak class (url-less
  test_cases fail-open + `state_visual_dom`/exploration_history outside
  guard scope); F3-03 vacuous-pass fix already shipped @ `0df6786`.
- **Fix:** extend guard coverage to remaining artifact classes; decide
  fail-closed vs warn for url-less files with a config flag.
- **Effort/risk:** S–M / low.

## Tier B — Honest value levers (raise real fusion quality)

### R4. Value/assertion-oracle synthesis  ★ top research item
- **Source:** mutation study (`mutation/results/ANALYSIS.md`) — verification
  ceiling proven (wrong_calc fully exercised yet undetected);
  RETROSPECTIVE_TIER2 §4 item 1; T503 spec slot exists
  (`docs/VALUE_ORACLE_SPEC.md`, design-only).
- **Goal:** let S4 attach expected-value predicates to composed tests;
  executor checks values, not just action success. Converts weak green into
  strong green — makes high fusion-attributable % actually MEAN something.
- **Effort/risk:** M–L / medium research risk, biggest payoff.

### R5. Capability flags in S1 + executability filter v2 (parked T604)
- **Source:** D3 approval (T604); openlibrary-class failure (7/7 accepted
  tests all failed live).
- **Goal:** S1 records static capability flags (readonly/disabled/
  input-type/has-selector); S4 filters state-change-yielding targets so
  doomed candidates stop being offered. Pure honesty upgrade, no denominator
  games.
- **Effort/risk:** S–M / low.

### R6. Acceptance-rate tightening: prompt + validator (parked T605)
- **Source:** D3 approval (T605). 86 offered → 60 accepted (70%); rejection
  clusters: cross_page_ref / action_mismatch / duplicate_of_existing — two
  of three generation-time fixable via prompt constraints + workflow-page
  tracking.
- **Carry:** paper §4.3 denominator wording (n=19 vs n=18) folds into this
  lane.
- **Effort/risk:** S / low.

### R7. S4 parameterized-href resolution + hackernews cheap re-run
- **Source:** RETROSPECTIVE_TIER3 §6 item 3. Hackernews FT 1/8: seven fails,
  ONE root cause (bare `/item` navigated without `?id=`).
- **Goal:** resolve parameterized hrefs fully during cross-page composition;
  re-run hackernews (small site, cheap) to flip most of the 7 fails honestly.
- **Effort/risk:** S / low.

### R8. SPA hydration wait strategy
- **Source:** backlog A4; archive.org thin-run, goodreads blank-render,
  Juice-Shop partial-coverage class.
- **Goal:** render-wait heuristic so JS-bootstrapped pages expose their DOM;
  unlocks the blocked/thin class of sites. Pair with W3's suggestion: 5-second
  headless screenshot check in preflight to classify render-blocked sites
  BEFORE quota spend.
- **Effort/risk:** M / medium.

## Tier C — Structural research items

### R9. A/B identity reconciler
- **Source:** RETROSPECTIVE_TIER2 §4 item 4. Same real-world element seen by
  both architectures currently stays split (tiny common_elements in gap
  reports). Reconciling identities would sharpen S2 conflicts and S4 context.
- **Effort/risk:** M–L / medium research risk.

### R10. Post-chain idempotency + queue runner
- **Source:** serial-B duplicate-post incident; RETROSPECTIVE_TIER2 §4
  item 5. Drivers should refuse to re-chain an already-chained run dir
  (warning exists since `26325a8`; make it structural) + a claim-aware queue
  runner so watchers verify BOARD claims not just lock files (`--claim <id>`
  driver argument, W3 suggestion).

### R11. Cross-platform port (Windows → POSIX)
- **Source:** T102 assessment (`docs/MCP_READINESS.md` ADDENDUM): EASY-MEDIUM
  ~1.5–2 days, LOW risk post-deadline. Items: process-group kill instead of
  `taskkill /T /F` (unguarded at `runBoth.js:137,186`), drop `shell:true`
  spawns, `VISION_PYTHON` env for venv interpreters, Tesseract preflight
  fail-loud, dynamic ports (fold into R1).

### R12. Smaller polish (batch when convenient)
- S2 empty-summary block when catalog>0 but A tests=0 (cosmetic, wikipedia
  finding).
- B-side `Page.captureScreenshot` fatal retry-once (two occurrences:
  gutenberg, dynamic_loading).
- HTTP-status awareness in verification layer (W4 suggestion).
- Quota ledger as first-class artifact (serial-C suggestion; Tier-1 token
  usage unrecorded).
- Per-window run-dir prefixes `run_<worker>_<ts>` (make stitching visually
  obvious even before guards fire).
- Scoreboard/census numbers generated FROM INDEX rows by script, never typed
  by hand (F5-01 lesson).

---

## Explicitly rejected (metric gaming — do not do)

- Suppressing A/B generation to inflate fusion-attributable %.
- Counting attributed-but-failed tests toward quality headlines.
- Re-admitting quarantined/DO-NOT-CITE runs because their numbers looked
  better.
- Navigation-only quiet-page tests counted as novelty (validator correctly
  rejects these today).

## Suggested execution order

```
Sprint 1 (trust):      R2 → R3 → R1
Sprint 2 (value):      R5 → R6 → R7 → R8
Sprint 3 (research):   R4 (spec first: VALUE_ORACLE_SPEC.md) → R9
Continuous:            R10–R12 batched between sprints
Re-run queue after R1/R2 land: #27 bbc chain (guard ≥97a29cb), #31/#32/#34
under provenanceGuard + lock discipline, hackernews (after R7), #40 w3schools
```

— SUB-MASTER, F-08, 2026-08-27. Every item carries its source doc; nothing
invented. Frozen dataset reference: tag `campaign-v2-end`.
