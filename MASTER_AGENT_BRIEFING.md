# MASTER AGENT BRIEFING - NEXT SESSION (created 2026-08-25 ~19:30 IST)

> READ THIS FIRST, then docs/TASK_BOARD.md (comms), then PROJECT_HANDOFF.md.
> All agents are under SLEEP ORDER posted on TASK_BOARD at 19:20 IST.
> User will paste NEW API keys this session (see section 3).

## 1. WHERE WE ARE (verified state)
Branch after-tier-2, all work pushed to 'backup' remote (Neonishh forbidden).
Campaign: 20 sites attempted; CLEAN evidence: tier-1 (10) + books(11) +
quotes(12) + lambdatest(13, cleared via testmuai rebrand verification) +
docs_python(14, cleared run_20260825_163448 all-guards-green). QUARANTINED
pending re-runs: gutenberg(15 - rerun done run_20260825_165819 PARTIAL,
needs domain assertion + fusion chain completion), weathersparks(16),
sahitest(17), statuscodes(18), phptravels(19 = permanent MIRROR-EVIDENCE),
openlibrary(20).

## 2. IMMEDIATE QUEUE (in order)
1. Complete gutenberg clearance: run fusion chain (s4+ft+s6) on
   run_20260825_165819, assert catalog domains, patch report + INDEX.
2. Re-run remaining quarantined: weathersparks, sahitest, statuscodes,
   openlibrary (phptravels skipped forever). Use testing/rerun_quarantine.js
   pattern (it exists and holds .campaign.lock properly).
3. After each clear: patch report + INDEX marker + regen s8 + regen
   VISION_TEST_QUALITY (update its exclusion set per clearance).
4. Then Tier-3 launch per pre-registration in CAMPAIGN_PLAN.md
   (TIER3_SITES.md has the availability-checked list; wikipedia attempt was
   killed earlier - restart it first).
5. Gate audit (AUDITOR-style recomputation) before any headline claims.

## 3. API KEY ACQUISITION LIST (user pasting keys this session)
Ask user for keys from these providers (all free tiers verified 2026-08-25):
| Provider | Get key at | Free budget | Use for |
|---|---|---|---|
| Google AI Studio | aistudio.google.com | ~1500 req/day Gemini Flash | exploration fallback, paper polish |
| Cerebras | cloud.cerebras.ai | 1M tokens/day, gpt-oss-120b | A-side exploration (big bucket!) |
| GitHub Models | github.com/marketplace/models | mixed free models | coding tasks |
| Mistral | console.mistral.ai | experimental high-volume | batch work |
| Cloudflare Workers AI | dash.cloudflare.com | 10k neurons/day | misc |
Already owned: OpenRouter keys x3 (global stealth pool), Groq (per-model
buckets), Zen gateway. Wire new keys via ARCH_*_LLM_* env pattern in .env;
llmProvider supports any OpenAI-compatible endpoint via <PREFIX>LLM_BASE_URL.

## 4. TASK BOARD STATE (as of sleep order)
DONE: T101(partial), T102, T103, T104, T105(+P2 read-only tools), T502.
RUNNING-at-sleep: T503 value-oracle spec (serial-4), T202 #15 gated,
T201 window-2 mid-flight (gutenberg done, 16/17/18/20 remain).
OPEN: T501 fork MCP wiring p2, T504 paper related-work, T301 Tier-3 launch,
T401 gate audit, T402 freeze.

## 5. KEY LEARNINGS THIS SESSION (do not repeat)
- Concurrent studies/pipelines FORBIDDEN: caused the 8-site contamination.
  Lockfile (.campaign.lock) is mandatory; rerun_starved/rerun_quarantine
  hold it correctly.
- Run attribution by newest-mtime is BROKEN: always use
  testing/run_attribution.js (birthtime + manifest URL match) +
  assertCatalogDomains post-run check. Domain allowlist: testmuai.com is
  legit for lambdatest (rebrand verified live: 301 redirect).
- ox-alpha stealth pool is GLOBAL across accounts: new keys do not bypass.
  Groq buckets are per-model and per-account (fresh account = fresh pools).
- PowerShell Add-Content mangles unicode: write markdown via node fs utf8.
- Multiple agents committing concurrently = branch divergence churn. Agents
  must commit to after-tier-2 directly and pull --rebase before push.

## 6. CAPSTONE DELIVERABLES STATUS
- Vision test quality report: DONE (testing/VISION_TEST_QUALITY.md, clean-set)
- Campaign evaluation: DONE (regenerate after each clearance:
  node fusion/s8_campaign_eval.js)
- Research paper draft: docs/RESEARCH_PAPER_DRAFT.md (GAP markers cite paths;
  fill after quarantine clears; Related Work + polish = T504)
- Evidence guide: docs/EVIDENCE_GUIDE.md (+T502 forensics chapter)
- MCP readiness: docs/MCP_READINESS.md (+T102 GO-post-review verdict)
- Fork: vision-fork pushed (vision-standalone branch, git-lfs for weights);
  MCP skeleton phase-1 wired (explore_site); phase-2 read-only tools wired

---
# OVERNIGHT SESSION UPDATE (2026-08-25 23:10 IST)

## KEY ROTATION (active state)
- Pipelines (.env): OpenRouter key ending 81c2ad (NEW, verified: intermittent upstream 429s, retries absorb)
- Groq fallback (.env GROQ_API_KEY): NEW key ending 99G - gpt-oss-120b verified clean JSON
- Zen gateway key ReUj...7kxV: RESERVED for tomorrow morning work - DO NOT use tonight
- Old keys 1/2 (47c9..., d8af...) DISCARDED by user
- Old 3cca13 key: reserved for agent sessions only, removed from pipeline .env

## OVERNIGHT ASSIGNMENTS (directive D5 on TASK_BOARD)
- W1-W4 (already prompted): Tier-3 sites #21 hn / #22 text.npr / #23 lite.ddg / #24 archive.org, then self-serve #25-30. Round-robin via .campaign.lock release between sites.
- W5 (prompt below): self-serve overflow + quota-death recovery worker.
- W6 (prompt below): MCP BUILD in C:\\Users\\sandeep\\pes\\vs code\\new mcp testing ground (isolated clone of vision fork). Local commits ONLY - no pushes tonight. Morning: Master reviews then merges.
- T604/T605 capability-flags work: PARKED until morning review.

## MORNING CHECKLIST (in order)
1. Review W6 local commits in new mcp testing ground; merge to vision-fork/after-tier-2 as approved; push.
2. Verify Tier-3 overnight results: folder_purity on every new run dir, INDEX rows, s8 regen.
3. Gate audit T401 over final clean dataset.
4. Fill RESEARCH_PAPER_DRAFT gaps from final numbers (web-SOTA task).
5. GitHub cleanup: README rewrite, MIT LICENSE file, artifact graphs (coverage curves, fusion-% per site, quality rubric distribution), repo description/topics.
6. Retrospective incorporation: docs/RETROSPECTIVE_TIER2.md section 4 major-change approval decisions.

## REMAINING TO FINAL PROJECT (MIT-licensed, hands-off)
1. Tier-3 completion (overnight) -> ~26-30 sites total
2. T401 gate audit pass
3. MCP end-to-end verified (run_test live) + merged
4. Paper GAPs filled + final polish (external AI)
5. README/LICENSE/graphs/artifacts cleanup
6. Final tag campaign-v2-end + push
