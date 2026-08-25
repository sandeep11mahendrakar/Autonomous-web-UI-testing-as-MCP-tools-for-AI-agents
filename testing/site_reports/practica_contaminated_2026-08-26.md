# SITE TEST REPORT - PractiTest Practice Automation Pages — CONTAMINATION-SKIP

## 1. Metadata

| Field | Value |
|---|---|
| Site | Practice Test Automation (practice pages) |
| URL | `https://practicetestautomation.com/practice/` |
| Test date | 2026-08-26 |
| Unified run ID | `run_20260826_003258` (KEPT ON DISK AS EVIDENCE — DO NOT CITE) |
| Run folder | `runs/run_20260826_003258/` |
| Explorer | W3 / ox-alpha CLI (serial-C) via `testing/tier3_w3.cjs` |
| Report status | FINAL — verdict: **CONTAMINATED (foreign-host visit), skipped per protocol** |

## 2. Verdict

🚫 **CONTAMINATION — folder_purity NOT pure (3/4 checks).** NO numbers from
this run are citable. INDEX carries the contamination marker; run dir kept as
evidence.

## 3. Evidence & root cause (NEW DEFECT CANDIDATE #25)

- `testing/folder_purity.js run_20260826_003258` → `pure:false`
- Failing check: `visited_urls_hosts_match_manifest` — A's visited set contains
  **`https://luma.com/d3b2s20o`**.
- memory_log confirms a REAL navigation: `from_title` = "AI for Test
  Automation: A Live, Hands-On Workshop — Luma" — i.e., the practice page
  advertises an external Luma event and **A clicked through to it**.
- Mechanism: `web/src/llmClient.js` `executeAction()` click branch follows
  `href` with a direct `page.goto(href)` when the href is absolute http(s).
  That path **bypasses the external-domain navigation guard**, which is only
  applied to candidate-based navigate decisions. This is distinct from the
  storage-stitching class of #31/#32: here the explorer genuinely left the
  target site and the honesty gate caught it.
- Passing checks (for the record): manifest host ✅, B start_url ✅, catalog
  page_keys 12/12 ✅.

## 4. Duplicate-launch context

A second window launched the same site via a lock-watcher while my claimed
run was mid-chain (board entry posted; my claim landed first). Their run dir
is theirs to disposition; BOTH runs must pass purity independently before any
INDEX patch for #35.

## 5. Disposition

- Site #35 remains claimable for a clean re-run AFTER defect #25 fix (guard
  must wrap the href-goto path too) or an explicit external-link allow/deny
  policy at S1 recording level.
- Defect #25 candidate logged on TASK_BOARD for Master triage. PARKED during
  campaign per standing no-pipeline-changes decision.
- Evidence retained: run dir + `testing/tier3_w3.log`.

## 6. Reproduction

```bash
node testing/folder_purity.js run_20260826_003258   # -> pure:false (luma.com in visited_urls)
Select-String -Path runs/run_20260826_003258/dom/memory_log.json -Pattern "luma"
```
