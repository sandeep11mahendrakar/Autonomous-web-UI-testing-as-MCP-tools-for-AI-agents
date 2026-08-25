# mcp/TASKS.md — W6 mission checklist & status

Mission: complete the vision-fork MCP server end-to-end. Hard stop honored;
**local commits only** (final: `c9a36a2`, nothing pushed).

## 1. npm install; server starts + initialize/tools/list roundtrip ✅ DONE

- [x] `npm install` → 87 packages
- [x] Roundtrip verified via spawned server (`mcp/verify_roundtrip.js`)
- [x] Clean-install test: `npm ci` → smoke test re-passes

## 2. explore_site hardening ✅ DONE

- [x] Timeout handling — `MCP_EXPLORE_TIMEOUT_MS` (default 30 min), full
      process-tree kill on expiry
- [x] Malformed URL → typed `-32602`; non-http(s) protocol → typed `-32602`
- [x] Concurrent-call rejection → `-32005 busy` (verified live by overlapping
      calls); lock now shared with run_test (campaign lock)

## 3. Wire remaining tools ✅ DONE

- [x] `list_tests(run_id)` — parses storage/outputs
      `test_cases_<run_id>_exploration.json` via the run's result file;
      verified over protocol (TC01, 4 actions)
- [x] `get_evidence(run_id, test_id)` — execution record + step/failure
      screenshot paths + exploration screenshots; `-32002` for unknown ids;
      new `step_screenshots` field
- [x] `run_test(run_id, test_id)` — spawns src/executeTests.js replay,
      streams progress as notifications/message, returns final JSON verdict
      parsed from execution_results.json; per-call timeout
      (`MCP_RUN_TEST_TIMEOUT_MS`, default 15 min)
      → verified over live MCP protocol: TC01 replayed 4/4 steps → PASS
        in 10.3s, screenshot paths returned

## 4. Input validation everywhere ✅ DONE

- [x] Typed JSON-RPC errors: -32602 invalid params (missing args, unknown
      tool, malformed URL), -32601 unknown method, domain codes
      -32001/-32002/-32003/-32005
- [x] No stack traces to callers (message-only internal errors)
- [x] Redaction: KEY/TOKEN/SECRET/PASSWORD assignments + home-dir paths
      scrubbed from every payload and log tail (unit-verified)

## 5. Packaging ✅ DONE

- [x] package.json `bin`: `vision-test-mcp` → mcp/server.js
- [x] npm scripts: `mcp`, `mcp:verify`
- [x] README quickstart with Claude Code + opencode config snippets

## 6. End-to-end verification ✅ DONE

- [x] start server → initialize → tools/list → explore_site
      https://example.com (STUB_LLM=true) → list_tests → ALL CHECKS PASSED
- [x] Bonus coverage: demoqa.com stub exploration → list_tests/get_evidence/
      run_test over live stdio → RUN_TEST+GET_EVIDENCE CHECKS PASSED
- [x] Everything documented with actual outputs in mcp/VERIFICATION.md

## Bugfixes made during the night (details: mcp/CHANGES.md)

| # | Where | What |
|---|---|---|
| 1 | tools.js | child `'close'` → `'exit'`: shell:true grandchildren inherit stdio pipes and kept `close` from firing (infinite hang) |
| 2 | verify_run_test.js | `'return'` → `'continue'`: responses sharing a stdout chunk with notifications were dropped |
| 3 | tools.js | child-env normalization: repo-relative YOLO_MODEL_PATH, bare TESSERACT_CMD (no `.env`/`src/` edits) |

## Constraints honored

- [x] LOCAL COMMITS ONLY — nothing pushed
- [x] No algorithm changes in src/ (zero needed)
- [x] Keys only in .env (gitignored, never printed/committed)
- [x] One heavy operation at a time (campaign lock)

## Known limits (see FINAL_REPORT.md)

- Playwright first-capture flake (~1-in-3 explorations; retry succeeds)
- example.com yields 0 generated tests (site too shallow — expected)
- Vision services bind fixed ports 5000-5004 (contention under parallel agents)
