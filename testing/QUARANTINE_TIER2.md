# TIER-2 QUARANTINE — sites with wrong-site/contaminated evidence

Generated: 2026-08-25T09:14:42.780Z by testing/quarantine_audit.js.
Cross-checks INDEX rows against run manifests, A memory logs, and B source
URLs (auditor ground-truth method). QUARANTINE rows MUST NOT be cited until
re-run behind the run_attribution.js guards.

| # | Site | Run ID | Verdict | Issues |
|---|---|---|---|---|
| 11 | Books to Scrape | `run_20260825_131135` | CLEAN | - |
| 12 | Quotes to Scrape | `run_20260825_131756` | CLEAN | - |
| 13 | LambdaTest Playground | `run_20260825_053921` | QUARANTINE | B source host (127.0.0.1:58621) != manifest (www.lambdatest.com) [run_1787616306664_exploration_result.json] |
| 14 | Python.org Docs | `run_20260825_055129` | QUARANTINE | B source host (127.0.0.1:49205) != manifest (docs.python.org) [run_1787617275840_exploration_result.json] |
| 15 | Project Gutenberg | `run_20260825_060707` | QUARANTINE | B source host (127.0.0.1:50172) != manifest (www.gutenberg.org) [run_1787618210405_exploration_result.json] |
| 16 | WeatherSpark | `run_20260825_062152` | QUARANTINE | manifest URL host (www.saucedemo.com) != ledger site (weatherspark.com); B source host (weatherspark.com) != manifest (www.saucedemo.com) [run_1787619102162_exploration_result.json] |
| 17 | SahiTest Demo | `run_20260825_063248` | QUARANTINE | manifest URL host (www.saucedemo.com) != ledger site (www.sahitest.com); B source host (www.sahitest.com) != manifest (www.saucedemo.com) [run_1787619745151_exploration_result.json] |
| 18 | The Internet (status codes) | `run_20260825_064713` | QUARANTINE | manifest URL host (www.demoblaze.com) != ledger site (the-internet.herokuapp.com); B source host (phptravels.com) != manifest (www.demoblaze.com) [run_1787620790446_exploration_result.json] |
| 19 | PHPTravels Demo | `run_20260825_065652` | QUARANTINE | manifest URL host (www.demoblaze.com) != ledger site (phptravels.com) |
| 20 | Open Library | `run_20260825_070918` | QUARANTINE | manifest URL host (www.demoblaze.com) != ledger site (openlibrary.org); B source host (openlibrary.org) != manifest (www.demoblaze.com) [run_1787621689676_exploration_result.json] |

## Required remediation per QUARANTINE row

1. Re-run behind run_attribution.js guards (birthtime + manifest-URL match).
2. Post-run assertCatalogDomains: catalog page_key hosts ⊆ {target host}.
3. Rewrite report narrative ONLY from the new run's artifacts.
4. Old runs kept on disk as evidence of the failure mode.
