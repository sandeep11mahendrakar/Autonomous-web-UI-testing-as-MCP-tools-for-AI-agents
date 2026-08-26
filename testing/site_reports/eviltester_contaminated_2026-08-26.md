# SITE TEST REPORT - EvilTester Test Pages — CONTAMINATION-SKIP

## 1. Metadata

| Field | Value |
|---|---|
| Site | EvilTester Test Pages (element zoo) |
| URL | `https://testpages.eviltester.com/styled/index.html` |
| Test date | 2026-08-26 |
| Unified run ID | `run_20260826_000247` (KEPT ON DISK AS EVIDENCE — DO NOT CITE) |
| Run folder | `runs/run_20260826_000247/` |
| Explorer | W3 / ox-alpha CLI (serial-C) via `testing/tier3_w3.cjs` |
| Report status | FINAL — verdict: **CONTAMINATED, skipped per protocol** |

## 2. Verdict

🚫 **CONTAMINATION — folder_purity NOT pure (3/4 checks).** Per D6/D9 protocol
step 4 the site is marked CONTAMINATION-skip: NO numbers from this run are
citable, no Re-run section patched, INDEX carries the contamination marker.

## 3. Evidence

- `testing/folder_purity.js run_20260826_000247` → `pure:false`
- Failing check: `page_keys_belong_or_visited` — catalog contains page_key
  `https://magento.softwaretestingboard.com`, a host neither targeted nor
  visited.
- Provenance of the foreign key: **B-side** visual DOM artifacts
  (`vision/outputs/run_1787682825594_exploration_history.json` + 9 state
  files, 338 observations, seen_by=B).
- Passing checks (for the record): manifest host ✅, A visited URLs 18/18 ✅,
  B start_url ✅ — i.e., the EXPLORATION was clean; the CONTAMINATION entered
  through shared `vision/storage/outputs` during fusion input collection.

## 4. Root cause (mechanism, not blame)

Concurrent pipelines: `run_20260826_000204` (todomvc, another worker) has a
manifest timestamped the SAME MINUTE as my run; two further dirs
(`run_20260826_001601`, `run_20260826_001836`) were created inside my lock
window with no manifests yet. The audit-addendum vector repeats verbatim:
**shared storage + mtime-window collection stitches artifacts across run
dirs when two pipelines are live.** The `.campaign.lock` was held by THIS
window for the entire cycle — the concurrent launches did not honor/attempt
it. This is the third independent confirmation that the sequential-only rule
(S0.3) is load-bearing and that purity gating works.

## 5. Disposition & resume point

- Site #32 remains claimable for a clean re-run ONCE single-pipeline discipline
  holds (guards will pass a clean run — all three attribution checks passed
  here; only catalog page_keys failed).
- Recommended before any retry: enforce lock at runBoth level (PARALLEL_SPEC
  D3 singleton) so driver discipline becomes mechanical.
- Evidence retained: this run dir + `testing/tier3_w3.log`.

## 6. Reproduction

```bash
node testing/folder_purity.js run_20260826_000247   # -> pure:false
node testing/run_attribution.js                     # guard definitions
```
