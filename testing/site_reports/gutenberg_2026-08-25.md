# SITE TEST REPORT - Project Gutenberg

## 1. Metadata

| Field | Value |
|---|---|
| Site | Project Gutenberg |
| URL | https://www.gutenberg.org |
| Test date | 2026-08-25 |
| Unified run ID | `run_20260825_060707` |
| Run folder | `runs/run_20260825_060707/` |
| LLM (A/B) exploration | Groq gpt-oss-120b / gpt-oss-20b (TPM/TPD-paced night run) |
| LLM (S4/FT) completion | OpenRouter stealth/ox-alpha, reasoning=low, FUSION_MAX_TOKENS=4000 |
| Repo state | branch capstone-tier2-prep |
| Report status | FINAL |

## 2. Verdict snapshot

> **SCOPE NOTE (T202, 2026-08-25):** the original run's B exploration #1 hit a
> localhost fixture (`127.0.0.1:50172`, audit finding F-03), so every cell below
> that was fed by Architecture-B evidence (B execution, S1/S2 catalog-gap
> counts, S4 synthesis inputs, Dashboard attribution/novel-target counts) is
> QUARANTINED EVIDENCE — kept verbatim for transparency, NOT citable. The
> A-side rows and the FT live-execution row remain valid (live gutenberg.org
> URLs verified in `ft_execution_results.json` by the audit). Superseding data:
> see "## Re-run (post-quarantine)" at the end of this report.

| Stage | Result |
|---|---|
| Overall run | SUCCESS |
| A exploration | success (24 steps / 15 states / 11 urls; termination: max_states_reached) |
| A test generation | 3 test case(s) |
| B execution | pass_rate=1 (1 test(s)); weak_verifications=0 |
| S1 catalog | elements=319 behaviors=30 pages=17 conflicts=13 |
| S2 gaps | common=- a_only=- b_only=- uncovered=- bh_uncovered=- |
| S4 synthesis | offered=28 candidates=8 accepted=6 rejected=2 grounded=true |
| FT live execution | 6/6 PASS (9/9 steps) |
| Dashboard | pct_fusion=54.5% novel_targets=16 |

**Verdict (original run, B-side superseded):** first full SUCCESS-status Tier-2
site by A-side + FT evidence (6/6 Fusion FTs PASSED live). The "both archs
green" claim is RETRACTED for this run: the B replay behind it ran against a
localhost fixture, not Gutenberg. See re-run section for decontaminated B data.

## 3. Architecture results

### A (DOM): Healthy exploration: 24 steps / 15 states, terminated max_states_reached. *(A-side unaffected by contamination — valid.)*

### B (vision): ~~Replay passed 1/1.~~ **RETRACTED** — replay #1 explored `http://127.0.0.1:50172/index.html` (fixture), only exploration #2 hit live gutenberg.org; neither was disclosed at publish time (audit F-03). Decontaminated result: see Re-run section.

### A/B comparison: A-side behavior-space claims stand; the B-half of this line was fixture-fed and is superseded by the re-run data below.

## 4. SITE bugs detected

None claimed.

## 5. PIPELINE bugs and fixes during this test

none - clean run.

## 6. Where the project lagged

Search-heavy site means many quiet pages; several gaps unusable by design.

## 7-10. Assets and reproduction

All artifacts under runs/run_20260825_060707/ per standard tree (TEMPLATE section 8).

```bash
node runBoth.js https://www.gutenberg.org
node fusion/s1_build_catalog.js run_20260825_060707
node fusion/s2_gap_report.js run_20260825_060707
node fusion/s4_fusion_synthesis.js run_20260825_060707
node fusion/execute_fusion_tests.js run_20260825_060707
node fusion/s6_dashboard.js run_20260825_060707
```

## Re-run (post-quarantine) — run_20260825_165819

- **New run:** `run_20260825_165819` (replaces quarantined `run_20260825_060707`;
  old run kept on disk as evidence of the failure mode — see
  testing/QUARANTINE_TIER2.md). Manifest status: PARTIAL_FAILURE.
- **Guards passed:** findRunDir (manifest-url match) + assertCatalogDomains +
  assertVisionStartUrls; independently re-verified by the T202 agent before
  this rewrite: visionStartUrls checked=1, 0 violations, 0 foreign catalog hosts.
- **Narrative policy:** figures below come ONLY from the new run's artifacts.

| Stage | Result |
|---|---|
| Manifest | `https://www.gutenberg.org`, started 2026-08-25T11:28:19Z |
| B exploration | success on LIVE site (`start_url: https://www.gutenberg.org`): 3 steps / 4 states / 4 unique urls, 0 action errors, 1 test generated; terminated early — `fatal_error: page.screenshot protocol error` (honest short-exploration limitation) |
| B replay (TC01) | **1/1 PASS**; verification method `body_text_fallback` → weak_verifications=1 (flagged, not hidden); 0 unresolved targets, 0 stale-coordinate blocks |
| S1 catalog | elements=207 behaviors=8 pages=7 conflicts=8 |
| S2 gaps | deterministic (llm_calls=0); totals per gap_report.json summary |
| S4 synthesis | offered=11 candidates generated=5 accepted=4 rejected=1 (`cross_page_ref`: donate-page element vs /about context) grounded=true |
| FT live execution | **4/4 PASS (4/4 steps)**, targets preverified=2, warnings=4 |
| Dashboard | total_final_tests=5 (0 A + 1 B + 4 Fusion) → **pct_fusion=80%**, novel_targets=7 |

**Narrative:** Architecture-B, now provably against live gutenberg.org,
explored a compact but clean workflow (homepage → *Pride and Prejudice* →
reader) and its recorded replay passed with a weak-but-disclosed
text-presence check. The decontaminated catalog is smaller than the original
fixture-inflated one (207 vs 319 elements), and fusion synthesis accepted 4/5
offered candidates after rejecting one cross-page candidate — grounding stayed
strict. All four fusion tests PASSED live. Net effect vs the retracted
original: attribution rises to 80% and every number in this section traces to
`runs/run_20260825_165819/` artifacts.

Sources: `runs/run_20260825_165819/run_manifest.json`,
`vision/outputs/run_1787657304373_exploration_result.json`,
`vision/outputs/execution_results.json`,
`fusion/catalog.json`, `fusion/gap_report.json`,
`fusion/fusion_report.json`, `fusion/ft_execution_results.json`,
`fusion/dashboard_data.json`.
