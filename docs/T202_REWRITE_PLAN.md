# T202 PREP — B-side rewrite plan for reports #14/#15

_Author: serial-2 agent · 2026-08-25 · PREP ONLY. The actual rewrites are
GATED on T201 landing clean re-run artifacts (Master Plan: "rewrite ONLY the
B-side paragraphs from re-run artifacts"). This file pins down exactly what is
tainted, what stays, and which artifacts the replacement text must cite._

## Ground truth (docs/AUDIT_REPORT.md F-03 + addendum)

B replays in `run_20260825_055129` (docs.python #14) and
`run_20260825_060707` (Gutenberg #15) explored localhost snapshots
(`http://127.0.0.1:49205/index.html`, `http://127.0.0.1:50172/index.html`) —
stray local-server tooling runs. **A-sides and FT stages DID hit live sites and
remain valid** (addendum: gutenberg FT step URLs all live gutenberg.org).
Untrustworthy cells per addendum: B-side replay/quality + fixture-sourced
gap/novel-target counts.

## Report #14 — testing/site_reports/docs_python_2026-08-25.md

| Location | Current text | Problem | Rewrite source |
|---|---|---|---|
| §2 row "B execution" | `pass_rate=1 (1 test(s))` from contaminated run | B replay was 127.0.0.1 fixture | new run `<id>/vision/execution_results.json` + start_url host check |
| §3 "### B (vision)" para | discloses ECONNREFUSED port collision but NOT the localhost replay | incomplete disclosure (audit grep found zero mention of localhost/snapshot) | new run vision logs; must disclose BOTH the old fixture replay and the new evidence |
| §3 A/B comparison line | "Catalog overwhelmingly vision-only…" derived partly from B exploration | B-side half tainted | keep A-half claims only if supported by new run's catalog |
| Existing "## Re-run …134803" section | B: OK 1/1 PASS (weak verif) | predates audit addendum; its B provenance was never host-checked | supersede or re-validate via `node testing/run_attribution.js` + assertVisionStartUrls before trusting |

## Report #15 — testing/site_reports/gutenberg_2026-08-25.md

| Location | Current text | Problem | Rewrite source |
|---|---|---|---|
| §2 row "B execution" | `pass_rate=1 (1)` | B replay #1 was 127.0.0.1:50172 fixture (explore #2 genuine) | new run vision execution_results + host check |
| §2 verdict line | "both archs green" | arch-B greenness rests on fixture replay | qualify against new run |
| §3 "### B (vision): Replay passed 1/1." | no disclosure that replay #1 hit a snapshot | F-03 non-disclosure | new run B narrative |
| §3 comparison line | behavior-space claims include B side | partially tainted | recompute from new run fusion catalog |

## Execution protocol when T201 artifacts land (per site)

1. Confirm new run dir passes ALL guards:
   `node testing/run_attribution.js findRunDir` +
   assertVisionStartUrls + assertCatalogDomains (every vision
   exploration `start_url` host MUST equal manifest URL host).
2. Rewrite ONLY the rows/paragraphs listed above. Do NOT touch:
   A-side paragraphs, FT stage results (live-site verified), §4/§5,
   metadata except run ID/folder swap.
3. Add one "## Re-run (post-quarantine)" section citing new artifacts
   by exact path (`runs/<new_id>/vision/…`, `…/fusion/ft_execution_results.json`);
   keep old numbers visible as superseded evidence.
4. Clear the INDEX QUARANTINED marker only after steps 1–3, then regen
   VISION_TEST_QUALITY (update its QUARANTINED set) + s8 eval.
5. Offline suites green before commit; push backup only.
