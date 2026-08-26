# Site Test Report — npmjs Packages — BLOCKED — 2026-08-26

## 1. Metadata

| Field | Value |
|---|---|
| Site | npmjs package registry listing |
| URL | `https://www.npmjs.com/packages` |
| Test date | 2026-08-26 |
| Unified run ID | none — no pipeline launched (quota-preservation rule) |
| Repo state | `after-tier-2` @ `574ea30` (W4 claim commit) |
| Explorer | W4 / ox-alpha serial-D (opencode) |
| Report status | FINAL (BLOCKED) |

## 2. Verdict

**BLOCKED — hard HTTP 403 Forbidden bot-wall served to plain
authenticated-UA HTTP at launch re-check.** Per Tier-3 policy ("CAPTCHA or
bot-wall = record BLOCKED honestly and move on; blocked IS valid data"), no
pipeline was launched and zero LLM quota was burned.

## 3. What actually happened

Two-probe evidence trail:
1. **Preflight (2026-08-25, testing/TIER3_PREFLIGHT.md):** `BOT_WALL` hard 403;
   preflight report explicitly listed it under "Known BLOCKED going in (do not
   burn quota)".
2. **Launch re-check (2026-08-26 ~00:5x IST, realistic Chrome UA):**
   `HTTP 403 Forbidden` again — deterministic, not transient. npmjs serves an
   anti-automation wall to non-browser clients; a Playwright visit would at
   best explore the block page.

This matches the OpenCart precedent (Tier-1 site #8): the environment refuses
automation, which is itself a valid campaign datapoint, not a pipeline failure.

## 4. Findings for the pipeline

| # | Finding | Class |
|---|---|---|
| 1 | npmjs joins stackoverflow as a known hard-403 registry-class site; both were correctly excluded from quota spend by the preflight gate working as designed | Process validation: preflight gate saved ~15-20 min of pipeline time + LLM quota per avoided site |

## 5. Metrics

```
A/B/S1/S2/S4/FT/S6: not run - blocked at pre-flight gate by design
Quota spent: 0 requests, 0 tokens (policy: do not burn quota on known walls)
Evidence: two independent HTTP probes (preflight 403 + launch re-check 403)
```

## 6. Disposition

Site stays registered as honestly BLOCKED in INDEX row #29. Per C5 checkpoint
this counts toward the campaign's blocking-rate statistic. No spare promotion
was needed: D6 assigns W4 exactly these two sites; both are reported, keeping
the worker lane complete with honest data.
