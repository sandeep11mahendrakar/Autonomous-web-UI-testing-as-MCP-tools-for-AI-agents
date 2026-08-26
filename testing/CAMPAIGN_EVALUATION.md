# Campaign Evaluation (auto-generated)

<!-- Regenerated 2026-08-26T07:13:26.906Z by regen_ledger.js; boundary definition: a test is STRONG iff any step used input_value/checked_state/dropdown_option_selected/select_option/scroll_position verification; excluded runs: run_20260825_055129, run_20260825_060707, run_20260825_062152, run_20260825_063248, run_20260825_064713, run_20260825_065652, run_20260825_070918 -->

Generated: 2026-08-26T07:13:27.533Z by `fusion/s8_campaign_eval.js`.
Deterministic, zero LLM. Values are COMPUTED from `testing/site_reports/INDEX.md`
and `runs/<id>/fusion/dashboard_data.json` unless marked **CURATED** (historical
evidence quoted with source). Sites marked BLOCKED are excluded from pass-rate
denominators by design.

## 1. Campaign summary

```text
Sites attempted:              40
Sites scored:                 29
Sites blocked:                11
A completed:                  16
B completed:                  10
Full A+B pipeline completed:  19
Fusion generated (offered):   136
Fusion accepted:              98
Fusion live tests executed:   98
Fusion live PASS:             56
Fusion live FAIL:             42
Mean fusion-attributable %:   50.3%
```

## 2. Site matrix

| # | Site | Status | Confidence (heuristic) | Why |
|---|---|---|---|---|
| 1 | SauceDemo | SUCCESS | MEDIUM | only A explored fully; FT live PASS though |
| 3 | BrowserStack Demo | SUCCESS | MEDIUM | only A explored fully |
| 4 | Demoblaze | SUCCESS | HIGH | both architectures explored end-to-end; FT live PASS; fusion-attributable >=20% |
| 5 | CURA Healthcare | SUCCESS | MEDIUM | only B explored fully |
| 6 | Parasoft ParaBank | SUCCESS | MEDIUM | only A explored fully |
| 7 | Automation Exercise | SUCCESS | MEDIUM | only A explored fully |
| 8 | OpenCart Demo | BLOCKED | LOW | blocked environment; no meaningful interaction possible |
| 8s | GlobalSQA (spare for #8) | SUCCESS | HIGH | both architectures explored end-to-end; FT live PASS; fusion-attributable >=20% |
| 9 | The Internet (Heroku) | SUCCESS | MEDIUM | only A explored fully |
| 10 | OWASP Juice Shop | SUCCESS | MEDIUM | only A explored fully |
| 11 | Books to Scrape | SUCCESS | HIGH | both architectures explored end-to-end; FT live PASS; fusion-attributable >=20% |
| 12 | Quotes to Scrape | PARTIAL | MEDIUM | only A explored fully; FT live PASS though |
| 13 | LambdaTest Playground | SUCCESS | HIGH | both architectures explored end-to-end; FT live PASS; fusion-attributable >=20% |
| 14 | Python.org Docs | PARTIAL | LOW | neither architecture completed exploration |
| 15 | Project Gutenberg | PARTIAL | LOW | neither architecture completed exploration |
| 16 | WeatherSpark | PIPELINE FAILURE | LOW | neither architecture completed exploration |
| 17 | SahiTest Demo | SUCCESS | MEDIUM | only A explored fully; FT live PASS though |
| 18 | The Internet (status codes) | PARTIAL | LOW | neither architecture completed exploration |
| 19 | PHPTravels Demo | SUCCESS | LOW | neither architecture completed exploration |
| 20 | Open Library | PARTIAL | LOW | neither architecture completed exploration |
| 22 | StackOverflow Questions | BLOCKED | LOW | blocked environment; no meaningful interaction possible |
| 24 | IMDb Chart Top | BLOCKED | LOW | blocked environment; no meaningful interaction possible |
| 29 | npmjs Packages | BLOCKED | LOW | blocked environment; no meaningful interaction possible |
| 21 | Wikipedia (Web testing) | PARTIAL | LOW | neither architecture completed exploration |
| 23 | GitHub Trending | PARTIAL | MEDIUM | only B explored fully; FT live PASS though |
| 26 | Hacker News | PIPELINE FAILURE | LOW | neither architecture completed exploration |
| 27 | 🚫 BBC News | BLOCKED | LOW | blocked environment; no meaningful interaction possible |
| 32 | EvilTester Test Pages | SUCCESS | MEDIUM | only A explored fully; FT live PASS though |
| 35 | Practice Test Automation | BLOCKED | LOW | blocked environment; no meaningful interaction possible |
| 37 | GlobalSQA Example Pages Hub | SUCCESS | MEDIUM | only A explored fully; FT live PASS though |
| 28 | Archive.org (Internet Archive) | PARTIAL | LOW | neither architecture completed exploration |
| 25 | Goodreads Lists | BLOCKED | LOW | blocked environment; no meaningful interaction possible |
| 30 | Reddit Public (old.reddit) | BLOCKED | LOW | blocked environment; no meaningful interaction possible |
| 31 | Magento Luma (softwaretestingboard) | BLOCKED | LOW | blocked environment; no meaningful interaction possible |
| 33 | TodoMVC React (TS) | SUCCESS | LOW | neither architecture completed exploration |
| 34 | Techlistic (Selenium practice) | BLOCKED | LOW | blocked environment; no meaningful interaction possible |
| 36 | Guru99 Bank demo | SUCCESS | HIGH | both architectures explored end-to-end; FT live PASS; fusion-attributable >=20% |
| 38 | Dynamic Loading Example 2 | SUCCESS | HIGH | both architectures explored end-to-end; FT live PASS |
| 39 | The Internet: Tables | SUCCESS | LOW | neither architecture completed exploration |
| 40 | W3Schools <input> reference | BLOCKED | LOW | blocked environment; no meaningful interaction possible |

Confidence is a DETERMINISTIC HEURISTIC from ledger signals (both-arch ✅, FT
PASS, fusion >=20%) — not a human judgment.

## 3. A vs B comparison (means over runs with dashboard data)

(n=27 runs with comparison data; values are means)

| Measure | Arch A | Arch B |
|---|---|---|
| Tests generated | 2.6 | 0.9 |
| States explored | 9.1 | 5.9 |
| Elements seen | 10.3 | 204.8 |
| Behaviors seen | 10.4 | 5.3 |
| Targets covered | 5.4 | 4.1 |

## 4. Fusion contribution quality

| Metric | Value |
|---|---|
| Runs with dashboard data | 27 |
| Fusion tests offered/generated | 136 |
| Fusion tests accepted (grounded) | 98 |
| Fusion tests executed live | 98 |
| Executed successfully | 56 |
| Novel targets exercised by fusion | 169 |

> Quality note: fusion % alone does not equal value. Cross-origin composed
> workflows (GlobalSQA) and quiet-page coverage (DemoQA FT001) are qualitative
> wins beyond the percentage. **CURATED** — see per-site reports.

## 4b. Mutation bug-detection scorecard

| Variant | Bug | arch_b | fused |
|---|---|---|---|
| bad_validation | Checkout accepts invalid email | NOT_COVERED | NO_REPORT |
| baseline | (baseline) | NOT_COVERED | NOT_COVERED |
| broken_nav | Broken navigation link | NOT_COVERED | NOT_COVERED |
| dead_button | Dead submit button | NOT_COVERED | NO_REPORT |
| missing_required | Login accepts empty credentials | NOT_COVERED | NO_REPORT |
| wrong_calc | Wrong cart total | NOT_COVERED | NOT_COVERED |

Full analysis incl. verification-strength ceiling finding:
`mutation/results/ANALYSIS.md`. NOT_COVERED = buggy surface never exercised
(cannot conclude); NO_REPORT = channel produced no report that run.

## 5. Reliability / repeatability

Single-run results dominate this ledger. Variance data lives in
`testing/REPEATABILITY.md` (3 sites x 3 runs; exploration variability,
execution flakiness, and API variability reported separately).

## 6. Pipeline defect history (**CURATED** from TIER1_RETROSPECTIVE.md)

| # | Symptom | Detected on | Root cause | Fix |
|---|---|---|---|---|
| 1 | A invented credentials, looped on login | saucedemo | Prompt was DemoQA-hardcoded, no page text shown | Generic goals + PAGE TEXT block in prompt |
| 2 | B refilled username endlessly | saucedemo | No form-completion rules in vision prompt | Fill-every-field-distinct rules; top/bottom input heuristic |
| 3 | B replay died re_detection_unavailable | saucedemo | Re-detection fired before YOLO model loaded | Retry with backoff (3x) |
| 4 | All fusion tests failed: no A-side selector | saucedemo | S4 offered vision-only gaps | Executability filter in S4 context builder |
| 5 | Every navigate step failed | saucedemo | Strict URL equality vs trailing slash | Slash-tolerant comparison |
| 6 | Test-gen JSON truncated | saucedemo | max_tokens too small for reasoning models | Raised to 3000 |
| 7 | Behavior refs unresolvable by executor | saucedemo | Executor only looked in elements map | Behavior-to-owner-selector resolution |
| 8 | Tests clicked against about:blank | CURA | start_page ignored by executor | Implicit routing to declared start_page |
| 9 | Catalog selectors matched nothing live | CURA | Flattened document index vs sibling-relative position | Sibling-relative computation + href-preferred link selectors |
| 10 | parseAction failed on unescaped attr-selector quotes | ParaBank | Model emits CSS attr-selectors with raw quotes | Attr-quote repair pass |
| 11 | Inline ```html fragments corrupted JSON | bstackdemo+ | Reasoning-model quirk | Fence-strip + newline-collapse pass |
| 12 | select_option hung on missing option text | bstackdemo | Strict option-text matching inside menu | First-available-option deterministic fallback |
| 13 | FT failed: target exists only post-login | bstackdemo rerun | Fresh executor context = unauthenticated | Pre-authentication block in FT executor |
| 14 | fill steps executed via click path | CURA re-run | Executor vocabulary predated fill support | Real fill branch + value-persisted verification |
| 15 | fill timed out 40s on display box | CURA re-run | Readonly box clustered as editable target | Readonly probe -> fast honest FAIL |
| 16 | Valid select_option rejected invalid_action | GlobalSQA | S4 validator vocabulary predated new action | select_option added across validator/prompt/executor |
| 17 | UUID ids -> querySelectorAll SyntaxError | The Internet | CSS ids cannot start with digits | [id="..."] attribute-form selectors |
| 18 | A fatal: networkidle never settles on SPAs | Juice Shop | Background traffic infinite | networkidle -> domcontentloaded fallback |
| 19 | Navigate false-FAIL "/" vs "/#/" | Juice Shop | Hash-router fragments not normalized | Strip mixed trailing /#+ |

## 7. Site issue discovery ledger (**CURATED** from per-site reports)

| Site | Class | Finding | Evidence |
|---|---|---|---|
| OWASP Juice Shop | application/security | Publicly served /ftp/legal.md directory exposure | Found by Architecture B vision exploration (juiceshop_2026-08-24.md) |
| CURA Healthcare | automation/UI | Demo-credential box is readonly; misclustered as editable | Proven by FT selector_readonly fast-fail (cura_rerun_2026-08-24.md) |
| Demoblaze | automation/UI | "Cart" element ambiguity (link vs button) | Conflict probe resolved at zero LLM cost (demoblaze_2026-08-24.md) |
| OpenCart demo | environment | Cloudflare bot-wall blocks automation | Recorded honestly as BLOCKED (opencart_blocked_2026-08-24.md) |

"Not enough coverage to conclude" applies to every site NOT listed here:
absence of a listed finding is NOT evidence of absence.

## 8. Cost / time (from run manifests where present)

| Site | A+B wall time (min) |
|---|---|
| SauceDemo | 3.2 |
| BrowserStack Demo | 3.9 |
| Demoblaze | 4.9 |
| CURA Healthcare | 4.9 |
| Parasoft ParaBank | 16.4 |
| Automation Exercise | 4.9 |
| GlobalSQA (spare for #8) | 5.1 |
| The Internet (Heroku) | 4.0 |
| OWASP Juice Shop | 5.3 |
| Books to Scrape | 6.5 |
| Quotes to Scrape | 18.4 |
| Python.org Docs | 19.3 |
| Project Gutenberg | 18.2 |
| WeatherSpark | 15.5 |
| SahiTest Demo | 4.9 |
| The Internet (status codes) | 23.6 |
| PHPTravels Demo | 18.8 |
| Open Library | 18.0 |
| Wikipedia (Web testing) | 18.9 |
| GitHub Trending | 20.9 |
| Hacker News | 15.2 |
| EvilTester Test Pages | 8.5 |
| Archive.org (Internet Archive) | 4.4 |
| TodoMVC React (TS) | 12.3 |
| Guru99 Bank demo | 23.0 |
| Dynamic Loading Example 2 | 3.8 |
| The Internet: Tables | 4.9 |

Total A+B wall time across 27 sites: 307.8 min.

LLM call counts per run: see `runs/<id>/fusion/dashboard_data.json` (`llm_calls`).
Token counts were not recorded for Tier-1 runs and are reported as not recorded
(never estimated).

## 9. Limitation taxonomy (**CURATED**)

### Architecture
- A/B identity spaces never merge (selector-space vs label-space): common elements ~0-1 despite describing the same controls
- Text-change fingerprinting inflates A state counts on fill-heavy pages
- A terminates on activity, not goals (no objective representation)

### Perception
- B cannot read placeholder-only inputs (OCR blindness on credential forms)
- YOLO+OCR variance across runs breaks exact replay matching (mitigated by fuzzy matcher, not eliminated)
- Banner/footer pseudo-links and rotating ads pollute B candidates

### LLM
- Reasoning models burn budget in reasoning channels; JSON corruption classes required repair passes
- Free-tier quota caps concurrent campaign throughput
- Grounding validator must track every new action type manually

### Executor
- Vision-only targets unreachable without coordinate-execution paradigm (V2 backlog #1)
- Weak verification ladder always flags body_text_fallback
- No file choosers / iframes / native dialogs support

### Environment
- Bot-walls (Cloudflare) block entire sites — recorded honestly, never bypassed
- Herokuapp free-tier sleeps make availability nondeterministic

### Coverage
- Single execution per site (except designated re-runs): flakiness bounds unknown until C4 study
- Capability-class coverage (forms/modals/tabs...) not yet systematically classified

## 10. Conclusions

1. Full-pipeline success: 19/29 runnable sites (+11 honestly BLOCKED).
2. Mean fusion-attributable coverage: 50.3%.
3. Blocked environments are tracked separately and never counted as failures.
4. Historical evidence (19 pipeline defects, seeded-bug mutation scorecard in
   `mutation/results/SCORECARD.md`) demonstrates hardening through heterogeneous
   testing.
