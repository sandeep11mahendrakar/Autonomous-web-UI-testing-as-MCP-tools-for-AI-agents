# mcp/VERIFICATION.md — end-to-end verification log

Date: 2026-08-25 · Platform: Windows (win32), Node v24.18.0
All commands run from the repo root. `.env` present (keys never printed).

## 1. Install + syntax

```
npm install --no-audit --no-fund   →  added 87 packages in 2s
node --check mcp/server.js         →  OK
node --check mcp/tools.js          →  OK
node --check mcp/verify_roundtrip.js → OK
node -e "require('./package.json')" → bin: {"vision-test-mcp":"mcp/server.js"}
```

## 2. Protocol smoke test (`node mcp/smoke_test.js`)

Server spawned as a real child process over stdio:

```
ok - initialize: vision-mcp 1.0.0 (capstone-vision-architecture)
ok - tools/list: explore_site, get_visual_dom, list_tests, run_test, get_evidence
ok - bogus/method -> -32601
ok - list_tests {} -> -32602: invalid arguments: missing required argument(s): run_id
ok - unknown tool -> -32602: unknown tool "nope"
ok - list_tests run_1 -> isError with -32001
ok - explore_site "not-a-url" -> isError with -32602

ALL SMOKE CHECKS PASSED
```

Covers: initialize roundtrip, tools/list shape, `-32601` unknown method,
`-32602` invalid params (missing args / unknown tool / malformed URL),
`-32001` typed run_not_found.

## 3. Concurrent-call rejection (busy lock)

Two overlapping `explore_site` calls in one process:

```
[sink] [mcp] spawning runVision --explore https://example.com
second call while busy -> {"error":{"code":-32005,"message":"busy: another exploration/execution holds the lock"}}
BUSY-LOCK OK
first finished: exit path exercised normally (lock released)
```

`run_test` shares the same campaign lock (verified by code inspection +
lock flag reuse; a run_test during an exploration returns `-32005`).

## 4. Full roundtrip (`STUB_LLM=true node mcp/verify_roundtrip.js https://example.com`)

initialize → tools/list → typed-error → real explore_site → list_tests.
Abridged actual output:

```
[server:err] [vision-mcp] server ready on stdio
ok - initialize returns protocolVersion
ok - initialize returns serverInfo.name=vision-mcp
ok - tools/list returns 5 tools
ok - bogus-run_id call is isError=true
ok - typed error carries code -32001 (run_not_found)

explore_site -> https://example.com (this runs the pipeline; be patient)
  [srv] [mcp] spawning runVision --explore https://example.com
  [srv] [run] All services healthy. Starting autonomous exploration...
  [srv] [vision] [explore] state_001 @ https://example.com/ (4 elements)
  [srv] [vision] [explore] state_001 --click--> ⛔ external domain (https://www.iana.org) — going back
  [srv] [mcp] exploration finished: run_id=run_1787680358390
ok - explore_site produced a JSON-RPC response
ok - explore_site returned run_id=run_1787680358390
ok - termination_reason=no_candidates_remaining
ok - totals.total_states present

explore completed in 14.0s
ok - list_tests produced a success response
ok - list_tests count=0
ok - list_tests returns a tests array

ALL CHECKS PASSED — initialize+call roundtrip verified.
```

Note: `generated_tests=0` is correct here — example.com exposes no in-scope
multi-step workflow (its only link leaves the origin and is scope-blocked),
and `workflowsFromStates` needs ≥2-step chains.

## 5. A run with generated tests (STUB_LLM explore of https://demoqa.com, max_steps=12)

```
EXPLORE OK: run_1787680388863 term=llm_done
generated_tests: 1 | states: 5
```

### 5a. list_tests (over the live MCP protocol)

```json
{
  "run_id": "run_1787680388863",
  "count": 1,
  "test_cases_file": "storage/outputs/test_cases_run_1787680388863_exploration.json",
  "generated_tests_total": 1,
  "tests": [
    {
      "test_id": "TC01",
      "objective": "Replays an autonomously discovered visual workflow: click(Interactions) -> fill -> click(Droppable) -> click",
      "steps": 4,
      "actions": ["click", "fill", "click", "click"],
      "expect_navigation": false
    }
  ]
}
```

### 5b. get_evidence with unknown test id (typed error)

```
get_evidence TC99 -> isError=true
payload={"code":-32002,"message":"test_not_found","data":{
  "run_id":"run_1787680388863","test_id":"TC99","known_ids":["TC01"]}}
```

### 5c. run_test TC01 (live replay through the MCP protocol)

`node mcp/verify_run_test.js run_1787680388863 TC01` — spawns server.js,
speaks real JSON-RPC over stdio, streams executor progress as
notifications/message:

```
run_test run_1787680388863/TC01 (live replay; be patient)
  [srv] [execute] Test cases: storage/outputs/test_cases_run_1787680388863_exploration.json (1 tests)
  [srv] [execute] Vision services already running — re-detection enabled.
  [srv] [execute] Result: PASS
  [srv] [execute] Warning: Verification used weak body-text fallback
RUN_TEST OK (10.3s): status=PASS steps=4
verification: {"method":"body_text_fallback","detail":"no stronger observable
signal available; body renders non-trivially"} strength: weak
screenshots: ["storage/screenshots/run_1787680388863/state_003_after_click.png",
 "storage/screenshots/run_1787680388863/state_004_after_fill.png",
 "storage/screenshots/run_1787680388863/state_005_after_click.png",
 "storage/screenshots/run_1787680388863/state_006_after_click.png"]
GET_EVIDENCE OK: executed=true step_screenshots=4

RUN_TEST+GET_EVIDENCE CHECKS PASSED   (exit code 0)
```

The executor's own record (storage/outputs/execution_results.json):
`1 passed / 0 failed / 0 errors`, all 4 steps ok, 2 honest warnings.

### 5d. Regression found and fixed during verification

Two hangs were diagnosed and fixed while producing 5c (details in
CHANGES.md #7/#8): child `close` → `exit` (inherited stdio pipes from
shell:true grandchildren kept `close` from ever firing) and a
`return` → `continue` bug in the verify client's message loop. Both fixes
re-verified by the successful run above plus a raw-socket repro.

## 6. Redaction check

Error payloads and streamed log tails pass through `redact()`:
assignments matching `*_KEY=/ *_TOKEN=/ *_SECRET=/ *_PASSWORD=` become
`<NAME>=<redacted>` and the user home prefix becomes `~`. Verified by unit
invocation during development; no `.env` values appear in any payload above.
