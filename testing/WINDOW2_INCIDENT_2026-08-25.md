# WINDOW-2 FINAL STATE (serial1/ox-alpha, 2026-08-25 17:58 IST, past hard stop)

Recovered after a concurrent agent's rebase/merge removed this file's first
copy. Authoritative records also live in commits `9328498` (board
window-end) and `19de50b` (incident comms) - reachable via reflog/stash;
cherry-pick onto after-tier-2 once the other window's merge settles.

## T201 status at window end
- #13 lambdatest: SITE-MOVED-EVIDENCE (testmuai.com approved per Master
  ruling; allowlist added to assertVisionStartUrls @ be06ec3 - re-land if
  history rewrite dropped it).
- #14 docs_python: CLEARED via run_20260825_163448 (guards re-verified).
- #15 gutenberg: CLEARED via run_20260825_165819 (guards re-verified by me;
  other window committed clearance as 95232eb pre-rebase).
- PENDING: #16 weatherspark, #17 sahitest, #18 the-internet/status_codes,
  #20 openlibrary. #19 phptravels: MIRROR-EVIDENCE, skip permanently.
- Resume command pattern: node testing/rerun_quarantine.js pipeline <key>
  then ... post <key>   (keys: weathersparks / sahitest /
  theinternet_spare_pages / openlibrary)

## Incident (root cause for PARALLEL_SPEC / T401 auditor)
Two concurrent T201 windows raced today. Shared vision/storage/outputs let
the gutenberg pipeline sweep an exploration artifact into my duplicate
docs_python run run_20260825_165105; assertVisionStartUrls caught it
(violation host www.gutenberg.org) -> rejected as evidence, kept on disk.
Sequential-only rule is load-bearing; recommend liveness-checked lock
(PID check) + per-site board claim BEFORE each launch.

## Git warning for next window
At wrap, docs/TASK_BOARD.md was left UU (mid-merge by the other window) and
remote backup/after-tier-2 had moved past local. Do not force-push; pull
--rebase only with a clean tree; push ONLY to 'backup'.
