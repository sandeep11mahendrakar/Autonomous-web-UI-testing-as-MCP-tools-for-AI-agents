# mcp/FINAL_REPORT.md — overnight MCP build status

Date: 2026-08-25 (overnight session) · Branch: `vision-standalone`
**Local commits only — nothing pushed** (morning review pending).

## Works ✅

1. **MCP server end-to-end**: stdio JSON-RPC 2.0; initialize / tools/list /
   tools/call roundtrip verified against a live spawned server
   (`STUB_LLM=true node mcp/verify_roundtrip.js https://example.com` → ALL
   CHECKS PASSED; full transcript in mcp/VERIFICATION.md).
2. **All five tools wired**:
   - `explore_site` — spawns runVision --explore, streams pipeline logs as
     notifications/message, returns run_id + summary.
   - `list_tests` — parses storage/outputs test_cases_*_exploration.json via
     the run's exploration_result.json (verified: TC01 with 4 actions from a
     demoqa.com stub exploration).
   - `get_evidence` — execution record + step/failure screenshot paths +
     exploration screenshots; typed -32002 for unknown test ids.
   - `run_test` — NEW: spawns src/executeTests.js replay of the run's suite,
     shares the campaign lock, per-call timeout (MCP_RUN_TEST_TIMEOUT_MS),
     parses the final verdict from execution_results.json. Verified over the
     live MCP protocol: TC01 on run_1787680388863 replayed 4/4 steps OK →
     PASS in 10.3s with screenshot paths returned (`RUN_TEST+GET_EVIDENCE
     CHECKS PASSED`, exit 0).
   - `get_visual_dom` — unchanged from phase 2 (re-verified via typed-error
     path in smoke test).
3. **Hardening**: one heavy operation at a time (`-32005 busy` verified by
   overlapping calls); wall-clock timeouts with full process-tree kill;
   malformed URL → `-32602`; unknown method → `-32601`; missing args /
   unknown tool → `-32602`; domain errors typed (-32001/-32002/-32003);
   redaction of key/token/secret-shaped strings and home-dir paths in every
   payload and log tail (unit-verified).
4. **Two hangs diagnosed and fixed during verification** (CHANGES.md #7/#8):
   - server-side: child `close` never fires when shell:true grandchildren
     inherit stdio pipes → switched to `exit` + stream destroy;
   - client-side: `return` instead of `continue` dropped responses sharing a
     stdout chunk with notifications.
5. **Two environment bugs diagnosed and worked around at the spawn layer**
   (YOLO_MODEL_PATH repo-relative; TESSERACT_CMD bare) — details and
   suggested upstream fix in mcp/CHANGES.md. No src/ changes were needed.
6. **Packaging**: `bin: {"vision-test-mcp": "mcp/server.js"}`, npm scripts
   `mcp` / `mcp:verify`, README quickstart with Claude Code + opencode
   registration snippets.

## Doesn't work / flaky ⚠️

- **Playwright first-capture flake**: ~1 in 3 explorations dies with
  `Page.captureScreenshot: Unable to capture screenshot` on the very first
  capture; retry succeeds. Upstream of the MCP layer (headless Chromium on
  this machine); explorer records it as `fatal_error` termination and exits
  cleanly, surfaced verbatim as `termination_reason`.
- **example.com yields zero generated tests** (expected): no in-scope
  multi-step workflow exists there, so `list_tests` after the mission's
  example.com E2E returns count=0. demoqa.com (stub mode) produces tests.
- **Port contention under parallel agents**: Vision services bind fixed
  ports 5000-5004; if another process holds them, executeTests adopts
  whatever answers `/vision/health`. Single-user runs are unaffected.

## Known limits

- `run_test` executes the whole generated suite file (executor behavior) but
  reports only the requested test's record — acceptable for small suites;
  per-test filtering would need an executor flag (src change, out of scope).
- Verification strength on demoqa replays is often `weak`
  (body_text_fallback) because heuristic stub clicks rarely produce strong
  observable signals; this is executor semantics, not an MCP defect.
- Redaction is pattern-based (KEY/TOKEN/SECRET/PASSWORD assignments +
  home-dir prefix); free-form secrets echoed verbatim in child logs would
  not be caught.
- Python services must be installed (`pip install -r services/*/requirements.txt`)
  or every explore/run_test fails at service health-check (surfaced as
  -32003 stage_failed with log tail).

## Verification artifacts

- mcp/smoke_test.js — fast protocol checks (no pipeline)
- mcp/verify_roundtrip.js — initialize→tools→explore→list_tests, asserted
- mcp/verify_run_test.js — live run_test + get_evidence over stdio
- mcp/VERIFICATION.md — actual outputs from tonight's runs

## Commits (local only)

See `git log vision-standalone`; final commit includes all mcp/ changes,
docs, package.json bin entry. `.env` untouched and untracked (gitignored).

---

## T609 SHIP-POLISH VERIFICATION (2026-08-27, serial-B)

| Check | Result |
|---|---|
| master-v1 merge state | HEAD 863275 final-review-pass; tree clean except local-only model-weight edit (screenparser_best.pt, gitignored class *.pt but historically tracked) + untracked presentation/ dir (morning-review material, not shipped) |
| npm pack dry-run | OK — capstone-vision-architecture-1.0.0.tgz, 1.9 MB, 69 files, all five mcp/ tool files included |
| .env safety | .env gitignored (line 6) AND untracked; pack contains only .env.example placeholders — **no secret leak** |
| bin entry | ision-test-mcp -> mcp/server.js resolves from repo root; POSIX shebang present (#97f2de4) |
| FINAL_REPORT freshness | this section = T609 stamp; content above unchanged and still accurate |

Verdict: **BETA-ready for morning merge review.** No code changes required by T609.
