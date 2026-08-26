# POST 3 - Sites 11-20: the overnight run that caught its own corruption

Tier 2 was the first overnight batch on real production sites - docs.python,
Gutenberg, LambdaTest, WeatherSpark. It delivered the campaign's best numbers
and its worst incident, in the same twelve hours.

The provider reality first. OpenRouter's stealth model is a 1000-request-per-
day GLOBAL pool shared across every key, resetting at 05:30 IST. Four
decontamination runs hit 429 walls and timed out mid-exploration. On top of
that, reasoning-style models burned roughly 1500 tokens on visible chain-of-
thought before emitting any JSON at all, starving S4 synthesis. The fix -
`FUSION_LLM_REASONING=low` plus `FUSION_MAX_TOKENS=4000` - took books-to-
scrape from zero accepted fusion tests to three, stable from then on.

Then the real problem. When we audited the registered runs adversarially -
recomputing every claim from raw artifacts instead of trusting our own
reports - five of the nineteen scored sites had executed against the WRONG
websites. The WeatherSpark row contained saucedemo.com data. PHPTravels rows
were pure demoblaze. Root cause: three workloads ran concurrently overnight,
the collector attributed artifacts to whichever run directory was newest, and
a shared storage folder let sessions stitch artifacts across run boundaries.
Site reports then wrapped wrong-site data in plausible narratives like "canvas
invisible to OCR." The raw manifests said otherwise.

The remediation became the most valuable engineering of the project. Five
guards, built same-day: `findRunDir` attribution matching runs by birthtime
AND manifest URL; `assertCatalogDomains`; `assertVisionStartUrls`; a collector
provenance filter that rejects foreign-host exploration files into a
CONTAMINATION_REJECTS.json evidence log (commit `57e1ffc`); and folder_purity,
a four-check verdict that a run directory belongs to its manifest. Every
affected row was quarantined, re-run behind the guards, and re-registered.
The guards immediately proved themselves by rejecting a live contaminated
run (`run_165105`).

Final ledger for the tier after remediation: fusion offered 86, accepted 60,
live pass 37/60 (61.7%), mean fusion-attributable 48.7%.

Lesson learned: never let an evaluation pipeline attribute results by folder
freshness - verify identity from immutable evidence, because plausible
narratives will otherwise decorate whatever data lands nearest.
