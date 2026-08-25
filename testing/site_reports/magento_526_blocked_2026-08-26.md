# SITE TEST REPORT - Magento Luma (softwaretestingboard) - Tier-3 D9 #31

## Verdict: BLOCKED-HONEST (site down - Cloudflare 526 origin-SSL failure at run time)

## 1. Metadata

| Field | Value |
|---|---|
| Site | Magento Luma demo store |
| URL | `https://magento.softwaretestingboard.com/` |
| Test date | 2026-08-26 |
| Unified run ID | `run_20260826_004650` (full protocol executed; artifacts kept) |
| Repo state | branch `after-tier-2` @ `f9586ea` |
| Explorer | replacement worker / ox-alpha (opencode) |
| Trimmed env | MAX_STEPS=25, MAX_STATES=20, ARCH_A_TIMEOUT_MS=1500000 |
| Report status | FINAL (BLOCKED-honest; NO coverage numbers citable) |

## 2. Why BLOCKED and not CLEARED

The site's origin has an invalid SSL certificate, so Cloudflare fronts every
request with its **526 error page**. The run is provenance-PURE but the page
both architectures explored was Cloudflare's error landing, not Luma:

- Plain HTTP probes returned **526 four times today** spanning ~3h
  (serial-B 2x ~03:1x-03:5x IST during their contamination-skip window;
  this lane at claim time, at pre-flight, and post-run) -> persistent
  misconfiguration class, not a transient blip.
- Pipeline-grade evidence agrees: A's warnings show 5 navigation attempts to
  `cloudflare.com/5xx-error-landing?...errorcode_526` /
  `developers.cloudflare.com/.../error-526/` - links that exist only on
  Cloudflare's error page. The external-domain guard correctly blocked them.
- B exploration terminated `no_valid_candidate_selected` in 32s (an error
  page offers nothing testable).
- Manifest overall: PARTIAL_FAILURE (A `success` on the error-page DOM,
  B `partial_success`).

Per the #25 goodreads blank-render precedent ("A reports success/completed -
silently useless run"), a run whose render target is an error page is
recorded as valid data of the OUTAGE, never as site coverage.

## 3. What the run actually measured (NOT citable for magento)

For the audit trail only: S1 cataloged the error-page DOM (30 elements,
4 behaviors, 1 page, 5 conflicts); S4 offered 10 / accepted 5 fusion tests
(1 duplicate_in_batch rejection); FT executed them against the same error
page 4/5 PASS (8/9 steps). These numbers describe Cloudflare's 526 landing
page and MUST NOT be cited in any magento aggregate. Dashboard headline
pct_fusion=100% / novel_targets=8 inherits the same caveat.

## 4. Guard/provenance notes (the reason this lane exists)

- Single-pipeline window under `.campaign.lock` held by testing/tier3_repl.cjs
  for the whole cycle: `folder_purity.js` verdict **pure=true, checks 4/4**,
  zero CONTAMINATION_MARKER.
- This run is the first full protocol on the EXTENDED collector guard
  (`97a29cb`: test_cases_* + execution_results.json provenance filter). With
  the lock held there was nothing foreign to reject - consistent with the
  root cause being concurrent unlocked pipelines, not the site.
- Supersedes serial-B's contaminated `run_20260826_000335` (kept on disk as
  failure-mode evidence). That folder failed purity on foreign
  eviltester/todomvc/bbc artifacts; this one is clean AND shows the site
  itself is down.

## 5. Re-run conditions

Retry only after an HTTP probe returns non-526 (origin cert fixed by the
demo host). Until then #31 stays BLOCKED-honest in INDEX; it is a real-site
availability finding, equivalent in validity to the campaign's other
blocked rows.

## 6. Reproduction

```bash
node testing/tier3_repl.cjs magento_luma https://magento.softwaretestingboard.com/
# artifacts: runs/run_20260826_004650/  extract: testing/extract_run_20260826_004650.json
node testing/folder_purity.js run_20260826_004650   # pure:true
```
