# SITE TEST REPORT - TodoMVC React (TypeScript) - Tier-3 #33

## 1. Metadata

| Field | Value |
|---|---|
| Site | TodoMVC TypeScript-React example |
| URL | `https://todomvc.com/examples/typescript-react/#/` |
| Test date | 2026-08-26 |
| Unified run ID | `run_20260826_002227` |
| Run folder | `runs/run_20260826_002227/` |
| Repo state | branch `after-tier-2` @ `b326fec` |
| Explorer | W4 / ox-alpha serial-D (opencode) |
| Trimmed env | MAX_STEPS=25, MAX_STATES=20, ARCH_A_TIMEOUT_MS=1500000 |
| Report status | FINAL |

## 2. Verdict snapshot

| Stage | Result |
|---|---|
| Overall run | SUCCESS (A success, B success) |
| A exploration | completed: 8 steps / 4 states / 3 URLs, 0 errors; 5 external navigations correctly blocked by domain guard |
| A test generation | 5 test cases |
| B exploration + execution | llm_done after fill+clicks; replay 1/1 PASS with input_value verification, weak_verifications=0, stale_coordinates_prevented=2 |
| S1 catalog | elements=309 behaviors=15 pages=4 conflicts=27 |
| S4 synthesis | offered=10 candidates=4 accepted=3 grounded=true (1 rejection: action_mismatch) |
| FT live execution | 3/3 PASS (7/7 steps), targets_preverified=3, warnings=0 |
| Dashboard | pct_fusion=30% novel_targets=4 |

**Verdict:** clean SUCCESS on a client-rendered SPA. All three fusion tests
passed live including one composed multi-page workflow. B proved the stronger
perception here: it filled the todo input and verified the persisted value
(input_value = STRONG-class verification), while A's clicks were limited by
the external-domain guard on outbound links.

## 3. Architecture results

### A (DOM): 8 steps, terminated `completed`. Navigations dominate (7/8);
external-domain guard blocked github.com / react.dev / quora.com hops -
correct behavior per read-only policy.

### B (vision): sparse SPA shell (5 initial elements) but the form-completion
rules fired: filled "What needs to be done?" and verified value persistence.
Replay passed with zero unresolved targets and 2 stale-coordinate prevents
(the fuzzy matcher + re-detection earning their keep on a re-rendering SPA).

### A/B comparison: A contributed 5 selector-grounded tests; B contributed
1 STRONG-verified replay. Fusion composed 3 cross-page tests neither produced.

## 4. SITE bugs detected

None claimed - todomvc is a reference app; absence of findings expected and
not evidence of absence elsewhere.

## 5. PIPELINE notes from this run

1. **Contamination incident (disclosed, first attempt rejected)**:
   run_20260826_000204 was launched WITHOUT holding .campaign.lock; W3's
   eviltester pipeline overlapped by 38s; shared vision/storage/outputs let
   the mtime collector copy foreign state_*_visual_dom.json + test_cases_*
   into this folder; catalog built 574/582 elements from eviltester;
   folder_purity FAILED (pure:false). Run kept on disk as evidence, never cited.
   The provenance guard DID reject exploration_result files but does not yet
   cover state_*_visual_dom.json / test_cases_* files - FIX CANDIDATE post-freeze.
2. Clean re-run (this run) held the lock for its whole cycle: purity PURE,
   zero contamination.

## 6. Where the project lagged

- SPA shell gives OCR very little initially (5 elements); B needs the
  render-wait heuristics to see a hydrated DOM.
- External links (github/react.dev/quora) are the page's main affordances;
  read-only policy blocks them, so coverage concentrates on internal flows.

## 7. Assets and reproduction

All artifacts under `runs/run_20260826_002227/`:

```bash
node runBoth.js https://todomvc.com/examples/typescript-react/#/
node testing/run_attribution.js   # findRunDir manifest-match attribution
node fusion/s1_build_catalog.js run_20260826_002227
node fusion/s2_gap_report.js run_20260826_002227
node fusion/s4_fusion_synthesis.js run_20260826_002227
node fusion/execute_fusion_tests.js run_20260826_002227
node fusion/s6_dashboard.js run_20260826_002227
node testing/folder_purity.js run_20260826_002227   # MUST be pure:true
```

## Re-run (post-contamination) provenance

- **Clean run:** `run_20260826_002227` (supersedes contaminated
  `run_20260826_000204`, kept as evidence of the failure mode)
- **Lock:** held by W4 driver PID for entire cycle
- **Purity:** PURE (folder_purity.js `"pure": true`, contamination: [])
- **Narrative policy:** all figures above come ONLY from this run's artifacts.
