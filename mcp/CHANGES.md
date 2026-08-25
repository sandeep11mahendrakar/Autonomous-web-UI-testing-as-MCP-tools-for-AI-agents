# mcp/CHANGES.md — changes made in this fork's MCP work

Constraint honored: **no algorithm changes in `src/`**. All changes are
confined to `mcp/`, `package.json`, and this documentation.

## mcp/tools.js

1. **`run_test` wired (was a -32006 stub).** Spawns
   `node src/executeTests.js <test_cases_<run_id>_exploration.json> <start_url>`
   with the run's own artifacts, streams executor progress through the same
   log sink as explore_site, then parses the final verdict for the requested
   test from `storage/outputs/execution_results.json`. The executor exits 1
   when a test ends ERROR (not FAIL); the handler reads the record either way
   and only reports a typed STAGE_FAILED when no record exists.

2. **Shared campaign lock.** `explore_site` and `run_test` now hold one
   `campaignBusy` lock (previously `exploreBusy`, explore-only). A live
   browser + the Vision services must not contend; the second caller gets the
   typed `-32005 busy`.

3. **Per-tool timeout for run_test** (`MCP_RUN_TEST_TIMEOUT_MS`, default
   15 min) with full process-tree kill on expiry (Windows `taskkill /T /F`,
   matching runVision's own shutdown behavior).

4. **Secret/path redaction (`redact`/`safeTail`).** Log tails and error
   details returned to callers now scrub anything shaped like
   `*_KEY=.../*_TOKEN=.../*_SECRET=.../*_PASSWORD=...` and replace the user
   home directory prefix with `~`. Defense in depth — handlers already avoid
   embedding secrets, but tails come from child stderr and could in principle
   echo environment content.

5. **Child-env fixes for two .env pitfalls (`buildChildEnv`)** — see below.
   Both fixes normalize values *in the spawned child's environment only*;
   `.env` itself is untouched.

6. **`get_evidence` extended** with `step_screenshots` (per-step after-screens
   + failure screenshot recorded by the executor) so agents can fetch evidence
   paths without reading execution_results.json themselves.

7. **BUGFIX: child 'close' → 'exit' (hang fix, both heavy tools).** The
   pipeline children spawn their own services with `shell:true`
   (cmd.exe → python/node grandchildren). Those grandchildren inherit our
   stdio pipe handles and can keep them open indefinitely after the direct
   child has exited, so Node's `close` event (which waits for stdio to drain)
   never fires and the MCP call hangs forever. Observed live with run_test:
   the executor printed "Suite finished" and exited while the server waited
   indefinitely. Switched both handlers to the `exit` event (fires on process
   termination regardless of inherited handles) and destroy our ends of
   stdout/stderr afterwards.

## mcp/server.js

7. Loads `.env` via dotenv before dispatching tools (children load their own
   copy too); needed so tools.js can see `YOLO_MODEL_PATH`/`TESSERACT_CMD`
   when building child envs. Version string bumped to 1.0.0. Internal error
   responses now pass through the same redaction as tool payloads.

## mcp/verify_run_test.js (new verification client)

8. **BUGFIX: `return` → `continue` in the stdout message loop.** JSON-RPC
   notifications and responses can arrive in a single stdin chunk; aborting
   chunk processing on the first notification silently drops any response
   sharing that chunk (observed live: run_test responses were lost whenever
   they followed a pipeline-log notification in the same chunk, making the
   client hang forever on a healthy server).

## Environment bugs found (NOT fixed by editing src/ or .env)

These broke every exploration until worked around at the spawn layer:

| Symptom | Root cause | Workaround (mcp/tools.js) |
|---|---|---|
| YOLO service dies: `FileNotFoundError: services\yolo-service\screenparser_best.pt` | `.env` sets `YOLO_MODEL_PATH` repo-relative, but `detect.py` runs with cwd=`services/yolo-service`; its built-in default (BASE_DIR-relative) would have worked | resolve relative `YOLO_MODEL_PATH` against the repo root before spawning |
| OCR 500: `TesseractNotFoundError` | `.env` sets `TESSERACT_CMD=tesseract` (bare), shadowing ocr.py's working absolute default; `tesseract` is not on PATH | if the bare value cannot be resolved via `where`, fall back to the well-known install path |

Suggested upstream fix (for the morning review): drop both lines from `.env`,
or store absolute paths. Both services already have correct defaults.

## Transient issue observed (not fixed, documented)

- One out of three explorations aborted with a Playwright
  `Page.captureScreenshot: Unable to capture screenshot` protocol error on
  the very first capture; an immediate retry succeeded. Looks like a flaky
  headless-Chromium/GPU interaction on this machine, upstream of the MCP
  layer. The explorer correctly records it as `fatal_error: ...` termination
  and exits 0, which the MCP layer surfaces verbatim as `termination_reason`.
