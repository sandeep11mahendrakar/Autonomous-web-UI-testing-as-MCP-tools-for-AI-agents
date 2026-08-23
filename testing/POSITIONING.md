# POSITIONING — V1 vs V2 direction analysis

Created 2026-08-23. Input to the team's final call; not a decision by itself.

---

## The three framings on the table

| Framing | What it means | Strengths | Weaknesses |
|---|---|---|---|
| A. Capstone project | Finish, document, present | Required anyway (PES deliverable); zero extra risk | "A testing project" carries no market weight — correct observation |
| B. Research project | Frame as *autonomous dual-perception UI testing with LLM fusion*, publish evaluation data | The 50-site dataset + fusion-attributable metric + conflict-probe method are genuinely novel enough to claim research value; strengthens capstone AND any paper/poster | Research alone doesn't ship to users; no distribution |
| C. Product (MCP server / plugin) | Wrap the pipeline as an MCP server ("explore site → return tested suite + coverage dashboard") or Playwright/CI plugin | MCP is the highest-leverage wedge right now: AI IDEs/agents (Claude, opencode, Cursor...) consume tools instantly; "give your agent a self-testing browser" is a one-line pitch; our architecture is ALREADY tool-shaped (deterministic stages, JSON artifacts, zero-framework dashboard) | Needs packaging, auth/quota handling for other people's keys, docs, stability bar much higher than capstone-grade |

## Recommendation (my opinion — final call is the team's)

**Do both, in sequence: B inside A for V1, C as V2.**

1. **V1 = A + B merged.** Complete as a capstone but WRITE IT AS RESEARCH:
   - Headline = the evaluation dataset from this 50-site campaign
     (fusion-attributable coverage, bug-detection scorecard, repeatability).
   - The arch doc already identified the strongest possible evidence:
     mutation testing (seed known bugs in demo sites, measure detection rate
     per architecture and fused). Add 3–5 seeded-bug demos to Tier-1/2 runs.
   - Deliverables: report + demo video + the dashboard. This costs nothing
     extra beyond what we're already doing and makes "just a project" into
     "research with reproducible data".

2. **V2 = MCP server first, plugin second.**
   - Why MCP over generic plugin: distribution is instant (any MCP client can
     use it day one), the engineering delta is small (our stages are already
     CLI tools with JSON I/O — an MCP wrapper is thin), and it positions us
     in the fastest-growing ecosystem instead of competing with established
     test frameworks.
   - Natural tool surface: `explore_site(url)`, `get_coverage(run_id)`,
     `generate_tests(run_id)`, `execute_tests(run_id)`, `open_dashboard`.
   - Plugin (Playwright test-generator extension / CI action) becomes V2.1
     once the MCP proves demand.

## What NOT to do

- Don't start V2 before the 50-site dataset exists — the data IS the moat;
  without it V2 is another untested AI-testing wrapper.
- Don't pivot the architecture for product reasons mid-campaign.
- Don't chase SaaS/multi-tenant hosting in V2 phase one — local MCP server,
  user's own API keys.

## Immediate next actions (unchanged by positioning)

Run Tier-1 sites per CAMPAIGN_PLAN.md; every checkpoint C-review feeds both
the capstone report and the future V2 spec.
