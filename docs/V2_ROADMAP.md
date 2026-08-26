# V2 ROADMAP — ranked post-campaign architecture & process work

**Created:** T614 (AGENT-3, 2026-08-27), per D14 spec. Merges
IMPROVEMENT_BACKLOG majors, RETROSPECTIVE_TIER2 §4/§5,
RETROSPECTIVE_TIER3 §4/C4, AUDIT_REPORT findings, and the consolidated
suggestion table in `docs/SYSTEM_IMPROVEMENTS.md`.
**Ranking principle:** evidence strength (each item cites the incident(s)
that prove it) × trust-per-effort. Nothing here is speculative.

---

## Tier 1 — land first (mechanically closes proven failure classes)

### 1. Shared campaign-lock helper + runBoth-level singleton lock (PARALLEL_SPEC D2+D3)
- **Evidence:** overnight stitching produced the entire quarantine round;
  site-31/32/34/#40 contamination all trace to concurrent unlocked launches;
  duplicate-launch incidents ×3.
- **Scope:** `lib/campaignLock.js` (PID-liveness + TTL steal, pattern already
  in `testing/campaign_lock.js`), named per-worker locks, runBoth takes a
  process-wide singleton as its first act.
- **Effort:** ~3 h. **Risk:** low — behavior-preserving for single-flight use.

### 2. Dynamic port allocation for vision services (D1)
- **Evidence:** `freeVisionPorts()` taskkilled *live* concurrent pipelines
  (ECONNREFUSED/EADDRINUSE class); INDEX row 14 PORT-CONFLICT.
- **Scope:** replace reap-path with allocate-from-base + bind-hold; env names
  already exist end-to-end.
- **Effort:** ~half day. **Risk:** low (fallback to static ports).

### 3. Session-scoped vision storage (structural end of the stitching class)
- **Evidence:** F4-05 fail-open confirmed live (site-40); shared outputs dir
  contaminated runs even with distinct run dirs (#32).
- **Scope:** per-session subdirs under `vision/storage/outputs/` keyed by
  run id from birth; extend PROVENANCE_FILE_RE to test_cases_*/visual_dom/
  exploration_history; session-id matching beats url matching.
- **Effort:** ~1 day. **Risk:** medium (touches collector paths) — do after 1–2.

### 4. DEFECT #25 fix — wrap href-goto in the external-domain policy guard
- **Evidence:** practica run genuinely navigated to luma.com
  (`runs/run_20260826_003258`); guard only covers candidate-based navigates.
- **Scope:** one guard call in `web/src/llmClient.js executeAction()` click
  branch + regression test using the recorded repro.
- **Effort:** ~2 h. **Risk:** trivial.

## Tier 2 — honesty upgrades (make every number mean what it says)

### 5. Verification-strength gating (PARALLEL_SPEC D5)
PASS_WEAK excluded from headline rates; STRONG/MEDIUM decomposition of every
PASS recomputable from artifacts. Evidence: mutation study ceiling + weak-signal
passes on guru99/dynamic_loading replays. ~1 day.

### 6. Value-oracle synthesis (top research item; spec = T615 deliverable)
Expected-value predicates at generation time; executor assertion stage above
the ladder; capability flags at S1 feed it. Converts "actions work" into
"values correct". Largest research payoff. ~2–3 days.

### 7. S4 parameterized-href resolution
Resolve bare `/item` → `?id=N` before offering cross-page navigates. Would
likely flip most of hackernews' 7 honest fails on a cheap re-run. ~half day.

### 8. HTTP-status awareness in the semantic ladder
Capture response status at navigate steps so navigation-to-error is visible
(404 bodies pass body-text checks today). ~half day.

### 9. Parse-quality gate completion (D4 remainder)
Manifest fields for parse-failure counts + 25% quality gate in s8; INDEX shows
degraded runs as degraded. ~half day (first slice already landed @2ed3d91).

## Tier 3 — capability expansion

### 10. SPA extraction + hydration wait (A4)
Role-attribute selectors, scroll-and-settle, hash-aware fingerprints,
network-idle settle heuristic keyed on background traffic + DOM size
(guru99/dynamic_loading vs archive.org/goodreads delta proves the split).
~2 days. Prerequisite for any Tier-4-class site.

### 11. Blank-render preflight probe
5-second headless screenshot check in preflight before quota spend
(goodreads ×2 + archive.org evidence). ~2 h.

### 12. Recorded-login replay propagation (A7)
Catalog behaviors → FT executor auto-performs RECORDED login sequences.
Removes seed-only regression path. ~1 day.

### 13. Shared token-bucket rate limiter (A6) + quota ledger artifact
Token-bucket in llmProvider across A/B/fusion children; daily budget line in
s8. Prevents A-starvation that shrinks executable gap space. ~half day.

### 14. Identity reconciler (A5)
Same page + normalized label + compatible type-map → `likely_same` marking
without merging. Turns "common ≈ 0 everywhere" into honest overlap estimates.
~1 day. Do after numbers stabilize (items 1–9).

## Process / intercom (parallel track, zero code risk)

15. Claims must LAND ON THE BOARD before launch; drivers accept `--claim <id>`
    and verify it (three duplicate-launch incidents prove the need).
16. Board row edits via script helper (`board.js set-row`) with retry.
17. Census/scoreboard wording generated from INDEX rows by script (F5-01/F7-02
    class elimination).
18. Per-agent worktrees as documented default; integrator-only main pushes.
19. Global STOP-file kill switch honored by all drivers (M15).
20. External-link policy decision: record-and-stay vs block for foreign links
    (pairs with #25 fix).

---

**Sequencing rationale:** Tier 1 removes the corruption class mechanically and
makes everything after safely testable in parallel; Tier 2 converts honesty
upgrades into capability; Tier 3 expands coverage; the process track costs
almost nothing and prevents the coordination incidents that dominated
incident reports.

**Non-goals (decided):** multi-host distribution, service mesh, removing
Windows-specific cleanup (complementary T102 plan), any change that inflates
metrics by suppressing honest failure rows.
