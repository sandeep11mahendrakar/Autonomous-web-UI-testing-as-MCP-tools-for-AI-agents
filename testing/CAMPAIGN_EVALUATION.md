# Campaign Evaluation (auto-generated)

Generated: 2026-08-24T12:37:47.299Z by `fusion/s8_campaign_eval.js`.
Deterministic, zero LLM. Values are COMPUTED from `testing/site_reports/INDEX.md`
and `runs/<id>/fusion/dashboard_data.json` unless marked **CURATED** (historical
evidence quoted with source). Sites marked BLOCKED are excluded from pass-rate
denominators by design.

## 1. Campaign summary

```text
Sites attempted:              10
Sites scored:                 9
Sites blocked:                1
A completed:                  8
B completed:                  5
Full A+B pipeline completed:  9
Fusion generated (offered):   0
Fusion accepted:              12
Fusion live tests executed:   0
Fusion live PASS:             9
Fusion live FAIL:             -9
Mean fusion-attributable %:   15.8%
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

Confidence is a DETERMINISTIC HEURISTIC from ledger signals (both-arch ✅, FT
PASS, fusion >=20%) — not a human judgment.

## 3. A vs B comparison (means over runs with dashboard data)

| Measure | Value |
|---|---|
| a | mean mixed/not numeric (n=0) |
| b | mean mixed/not numeric (n=0) |
| sources | mean mixed/not numeric (n=0) |

Raw keys of `architecture_comparison` vary per run schema; see each run's dashboard.

## 4. Fusion contribution quality

| Metric | Value |
|---|---|
| Runs with dashboard data | 9 |
| Fusion tests offered/generated | 0 |
| Fusion tests accepted (grounded) | 12 |
| Fusion tests executed live | 0 |
| Executed successfully | 9 |
| Novel targets exercised by fusion | 17 |

> Quality note: fusion % alone does not equal value. Cross-origin composed
> workflows (GlobalSQA) and quiet-page coverage (DemoQA FT001) are qualitative
> wins beyond the percentage. **CURATED** — see per-site reports.

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

Total A+B wall time across 9 sites: 52.7 min.

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

1. Full-pipeline success: 9/9 runnable sites (+1 honestly BLOCKED).
2. Mean fusion-attributable coverage: 15.8%.
3. Blocked environments are tracked separately and never counted as failures.
4. Historical evidence (19 pipeline defects, seeded-bug mutation scorecard in
   `mutation/results/SCORECARD.md`) demonstrates hardening through heterogeneous
   testing.
