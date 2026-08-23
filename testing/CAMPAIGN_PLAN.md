# 50-SITE TESTING CAMPAIGN PLAN

Created 2026-08-23. Companion files: `site_reports/TEMPLATE.md` (per-site
report format), `site_reports/INDEX.md` (ledger). This plan defines WHAT we
test, IN WHAT ORDER, and WHERE WE REVIEW.

---

## 1. Campaign structure — 4 tiers × ~10 sites + spares

Rationale: difficulty ramps up. Tier 1 = purpose-built demo apps (stable,
forgiving, prove correctness). Tier 2 = small real-world sites (messy DOMs,
ads, cookie banners). Tier 3 = popular consumer sites (bot detection, heavy
JS, ToS care needed). Tier 4 = stress/diversity set (SPAs, dashboards,
i18n/RTL, mobile-web).

### TIER 1 — Demo/practice apps built for this kind of work (sites 1–10)

| # | Site | URL | Auth | Why it's in the list |
|---|---|---|---|---|
| 1 | SauceDemo | saucedemo.com | none (creds on page) | ✅ DONE 2026-08-23 |
| 2 | DemoQA | demoqa.com | none | ✅ Reference run 2026-08-22 |
| 3 | BrowserStack Demo | bstackdemo.com | optional (creds on page) | Real cart→checkout flow, offers, sign-in |
| 4 | Demoblaze | demoblaze.com | signup/login built-in | Cart, purchase modal, alert()-based UX |
| 5 | CURA Healthcare | katalon-demo-cura.herokuapp.com | creds on page | Classic appointment-booking form flow |
| 6 | Parasoft ParaBank | parabank.parasoft.com | register freely | Banking flows: transfer, pay-bill, statements |
| 7 | Automation Exercise | automationexercise.com | email signup | Practice shop with documented seeded bugs |
| 8 | OpenCart Demo | demo.opencart.com | admin creds public | Catalog browsing + cart; two distinct UIs |
| 9 | The Internet (Heroku) | the-internet.herokuapp.com | none | Edge-case zoo: hovers, alerts, iframes, timeouts |
| 10 | OWASP Juice Shop | demo.owasp-juice.shop | register freely | Bug-rich by design (~100 challenges); best bug-detection testbed |

Spares (if any Tier-1 site is down/unusable): UltimateQA practice pages,
LambdaTest Selenium Playground, GlobalSQA demo site, PHPTravels demo,
Selenium Easy mirror.

### TIER 2 — Small real-world sites (sites 11–20)

Criteria: publicly reachable, no login required, low legal sensitivity.
Candidates to finalize at checkpoint C2: books.toscrape.com (book store
sandbox), quotes.toscrape.com, personal/portfolio sites, restaurant menus,
university public pages, small NGO/newsletter sites, docs sites,
webapp.fun-style toys, weather/tools utilities. Pick 10 across at least 4
industries so the catalog isn't all shops.

### TIER 3 — Popular large sites (sites 21–30)

Candidates: wikipedia.org, github.com (public repos), stackexchange,
imdb.com, goodreads, zomato/swiggy public menus, irctc public info pages,
amazon.com (browse-only!). RULES: read-only interactions where possible,
no purchases, no account creation, rate-limit friendly (single run/site),
skip on CAPTCHA/bot-wall and record honestly as "blocked". Expect A/B
perception degradation here — that's DATA, not failure.

### TIER 4 — Stress & diversity set (sites 31–40)

Heavy SPAs (React/Vue dashboards), an RTL-language site, one non-English
site, one canvas/map-heavy app (e.g., OpenStreetMap embed), one infinite-
scroll feed, one multi-step wizard SaaS trial. Purpose: find pipeline
breaking points for the V2 hardening backlog.

Sites 41–50: reserved — re-test the 5 most interesting sites from tiers 1–4
a second time (repeatability/flakiness measurement, which §5 of
PROJECT_MEMORY flags as missing) + 5 wildcard picks from checkpoint reviews.

## 2. Per-site run protocol (keep identical for comparability)

1. Fresh unified run: `node runBoth.js <url>` (same env: ox-alpha,
   reasoning=low, same MAX_* limits).
2. Fusion chain: S1 → S2 → S4 → FT execute → S6 dashboard.
3. Offline suites must pass before recording (`node --test fusion/test web/test`).
4. Fill `TEMPLATE.md` → `<sitename>_<date>.md`; add row to `INDEX.md`.
5. If a pipeline bug is found mid-run: fix + verify suites + record in §5
   BEFORE moving on (never carry silent breakage into the next site).
6. One run per site for the main ledger; re-runs only at checkpoint C4
   (flakiness pass) — keep the comparison uncontaminated.

## 3. Review checkpoints

| Checkpoint | When | What we review | Go/no-go criteria |
|---|---|---|---|
| **C1** | After every site | Report complete? INDEX row added? artifacts sane? | Report FINAL; no unresolved pipeline regression |
| **C2** | After 5 Tier-1 sites | Aggregate: stage pass-rates, fusion-attributable %, mean duration/cost; pick Tier-2 shortlist | ≥3/5 full-pipeline successes; else fix pipeline first |
| **C3** | After 10 Tier-1 sites (END OF PHASE 1) | Full retrospective vs DemoQA baseline; bug-classification quality; decide Tier-2 final list; V2 backlog draft | ≥6/10 end-to-end incl. ≥1 FT live PASS per successful site; fusion-attributable >20% average |
| **C4** | After Tier-2 (20 sites) | Real-DOM robustness; conflict-probe value; flakiness re-runs on 5 sites | Coverage doesn't collapse (>50% drop vs Tier-1 = investigate) |
| **C5** | After Tier-3 (30 sites) | Bot-wall/blocking rate; honest-failure reporting quality; decide how many Tier-3 results are presentable | Blocking rate logged; no ToS-violating interactions occurred |
| **C6** | After 50 | Final evaluation dataset: per-tier stats, repeatability scores, bug-detection scorecard → feeds capstone report AND V2 product spec | Dataset complete |

Aggregate metrics to compute at every checkpoint (script can be added later;
for now compute manually from INDEX.md):
- Stage success rates (A/B/S1/S2/S4/FT/S6)
- Mean/median fusion-attributable coverage %
- Elements/behaviors/pages per site (catalog scale curve)
- Conflicts found vs resolved via probes
- Wall-time + LLM-call budget per site
- Failure taxonomy counts (vision-blindness, bot-wall, timeout, crash)

## 4. Known risks & mitigations

| Risk | Mitigation |
|---|---|
| B blind on login-first sites (seen on saucedemo) | Prefer Tier-1 sites with on-page credentials; add authenticated-seed support before Tier 2 if ≥3 sites blocked |
| Demo sites go down / rotate (herokuapp free tier sleeps) | Spare list ready; record "site unavailable" honestly |
| LLM free-tier quota mid-campaign | ox-alpha is $0/near-unlimited; keep Groq fallback key fresh; STUB_LLM for dry-runs |
| Popular sites block automation (Tier 3) | Read-only policy; skip-on-CAPTCHA; never create accounts/purchases |
| Scope creep fixing pipeline mid-campaign | Fix only blocking bugs during a site's run; defer enhancements to checkpoint backlogs |

## 5. Positioning decision (recorded for the record)

V1 = capstone/research project completed on this architecture (current path).
V2 product direction analysis lives in `testing/POSITIONING.md`.
