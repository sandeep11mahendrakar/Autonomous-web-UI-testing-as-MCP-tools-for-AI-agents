# SYSTEM IMPROVEMENTS — consolidated agent suggestions

Status legend: IMPLEMENTED (landed, evidence path) / PARKED (human-deferred) /
V2-QUEUED (ranked post-campaign). Sources: MASTER (this section), serial-1..N
workers, WORKER-2, AUDITOR, SUB-MASTER. Consolidator (T614) merges worker
suggestions into this table without dropping any row.

## MASTER suggestions (from running the full campaign as coordinator)

| # | Suggestion | Category | Status | Notes |
|---|---|---|---|---|
| M1 | Single-source ledger regeneration (regen_ledger pattern) for every derived doc | process | IMPLEMENTED (testing/regen_ledger.js) | INDEX/EVALUATION/VTQ can never disagree |
| M2 | Provenance filter in artifact collection (host match vs manifest) | arch | IMPLEMENTED (runBoth.js) | rejects logged to CONTAMINATION_REJECTS.json; extend to ALL output file types (open gap: test_cases/execution_results still sweep — see magento/eviltester skips) |
| M3 | KNOWN_ALIASES redirect table with citations | perception | IMPLEMENTED (runBoth.js + folder_purity.js) | testmuai rebrand case |
| M4 | PID-liveness lockfile checks | process | IMPLEMENTED (drivers) | dead-PID false aborts eliminated |
| M5 | Quota-aware scheduler as first-class component | process | PARTIAL (ad hoc in night_chain/rerun drivers) | promote to shared lib: detect TPD/TPM patterns, budget ledger per run |
| M6 | Session-scoped vision storage (structural stitching fix) | arch | V2-QUEUED | kills the mtime-window class entirely |
| M7 | Dynamic port allocation for vision services | arch | V2-QUEUED | enables safe parallel pipelines |
| M8 | Shared mutex across ALL study drivers | process | PARTIAL (.campaign.lock exists; single-flight not universally honored) | enforce via lock helper lib |
| M9 | Fail loudly on parse_failed (never convert to done) | executor | IMPLEMENTED (llmClient honesty path verified by auditor) | keep as invariant test |
| M10 | Minimum verification-strength floor for PASS | executor | V2-QUEUED | weak-signal passes inflate quality metrics |
| M11 | Value-oracle synthesis | research | V2-QUEUED (top item) | spec pending T615 recreation |
| M12 | Clock protocol: UTC+IST dual stamps, master broadcasts canonical time in directives | process | PARTIAL (directives carry IST; drift incidents recurred) | consider relative timestamps (+12m from claim) |
| M13 | Per-agent append-only comms files replacing shared board region | intercom | IMPLEMENTED pattern (docs/comms/) | board rows stay for state only |
| M14 | Integrator-only main branch (workers push agent/<name>) | intercom | ADOPTED AD HOC by workers | make it the documented rule |
| M15 | Global STOP-file kill switch all drivers honor | process | NOT BUILT | sleep orders were manual posts |
| M16 | Repo description/topics + release assets on GitHub | ship | OPEN | web UI action, user-side |

## Consolidator instructions (T614)
Merge worker/sub-master/auditor suggestions below into ONE ranked table.
Do not drop duplicates silently - mark them as [DUP of M#]. Every row keeps
its source attribution. Rank V2-QUEUED items by evidence strength x effort.
