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
