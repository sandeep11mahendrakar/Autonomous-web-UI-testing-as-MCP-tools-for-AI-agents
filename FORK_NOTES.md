# Vision Standalone Fork — Notes

Created: 2026-08-25
Source: `Neonishh/Capstone-Project` branch `after-tier-2` (current code, NOT the stale Aug-22 backup zip).
This repo contains ONLY Architecture B (Vision): screenshot → YOLO ScreenParser + OCR → visual DOM → LLM-driven exploration → coordinate-based test generation → replay execution.

## What was removed vs the monorepo

- `web/`, `mobile/`, `fusion/`, `database/`, `docs/`, `mutation/`, `test/` (root), `testing/`, `runs/`, `_TEMP_BIN/`
- Root-level `interactive.js`, `runBoth.js`, `PROJECT_HANDOFF.md`, `PROJECT_MEMORY.md`
- Inside vision: `vision/storage/`, `vision/runs/` (contained fusion artifacts), `vision/temp_screenshots/`, `__pycache__/`, `node_modules/`
- Nested duplicate manifests: `gateway/package.json`, `services/browser-service/package.json`, `services/merge-service/package.json`

## Path fixes made (complete list)

| File | Old | New |
|---|---|---|
| `src/llm.js:23` | `require('../../lib/llmProvider')` | `require('../lib/llmProvider')` |
| `src/executeTests.js:173` | `require('../../lib/fuzzyMatch')` | `require('../lib/fuzzyMatch')` |

These were the ONLY two cross-boundary requires in the entire vision tree. A scripted scan confirms every relative `require()` in this fork resolves. No algorithm logic was modified.

## Layout

Flattened one level: monorepo `vision/*` content now lives at repo root.
- `lib/llmProvider.js`, `lib/fuzzyMatch.js` — copied from monorepo `lib/` (both have zero internal deps)
- `package.json` — monorepo `vision/package.json` used verbatim as the single root manifest
  (deps: axios, dotenv, express, groq-sdk, playwright)

## Setup

1. `npm install`
2. Python services (auto-started by `serviceManager.js`):
   - `pip install -r services/yolo-service/requirements.txt` (YOLO/ScreenParser, torch, ultralytics)
   - `pip install -r services/ocr-service/requirements.txt` (pytesseract + Tesseract binary; set `TESSERACT_CMD`)
3. Copy `.env.example` → `.env` and fill keys. **Keys go ONLY in `.env` (gitignored). Never print or commit them.**
   - Provider: `ARCH_B_LLM_PROVIDER=groq|openrouter`, key via `ARCH_B_LLM_API_KEY`, model via `ARCH_B_LLM_MODEL`.
   - Rate-limit headroom: `LLM_429_RETRIES` (default 6; free tiers may need 10–12).

## Run

```bash
node runVision.js --explore <url>     # exploration + test generation + execution
STUB_LLM=true node runVision.js --explore https://example.com   # no-API smoke test
```
Services auto-start: gateway :5000, YOLO :5001, OCR :5002, merge :5003, browser :5004.

## Verification performed (2026-08-25)

- `node --test test/explorer.candidates.test.js` → 4 pass / 0 fail
- `STUB_LLM=true node runVision.js --explore https://example.com` → completed, exit 0
- Real LLM explore via OpenRouter → completed cleanly (summary + graceful shutdown);
  separate run on a login form produced two correct LLM-driven `fill` actions (username/password).

## Beta release (T612, 2026-08-26)

Published to https://github.com/sandeep11mahendrakar/mcp-for-the-testing-temp-
(remote `backup`): branches `master-v1` + `vision-standalone`, tag
`v1.0.0-mcp`. Unit suite `node --test test/explorer.candidates.test.js`
→ 4/4 pass. Note: bare `node --test` auto-discovers `mcp/verify_run_test.js`
(an integration script that needs live services) and reports a spurious
failure — run the unit suite explicitly as above.

## Known external constraints (not fork defects)

- Free-tier OpenRouter models rate-limit aggressively (429). The provider retries with backoff;
  long explorations on bursty free models can exhaust retries and abort mid-run. Raise
  `LLM_429_RETRIES` or use a paid/higher-quota key for long campaigns.

## MCP server (added 2026-08-25/26 overnight)

The `mcp/` directory is a complete stdio JSON-RPC MCP server exposing five
tools: explore_site, get_visual_dom, list_tests, run_test, get_evidence.
Status, verification transcripts, bugfix log, and task checklist:

- `mcp/FINAL_REPORT.md` — works / doesn't-work / known limits
- `mcp/TASKS.md` — mission checklist with completion status
- `mcp/VERIFICATION.md` — actual outputs from end-to-end runs
- `mcp/CHANGES.md` — change + bugfix log (no src/ algorithm changes)

Quick start: `node mcp/server.js` (or `npm run mcp`), verify with
`STUB_LLM=true node mcp/verify_roundtrip.js https://example.com`.
Two `.env` pitfalls are worked around at the spawn layer — see
CHANGES.md (YOLO_MODEL_PATH repo-relative; TESSERACT_CMD bare).
