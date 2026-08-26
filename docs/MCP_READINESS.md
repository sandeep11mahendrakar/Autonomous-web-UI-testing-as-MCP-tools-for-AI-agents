# MCP READINESS — honest production gap analysis

_Question answered here: if we productize this project as an MCP server —
"give your AI agent a self-testing browser" — what breaks first?_
_Audit date: 2026-08-25. Citations point at real code on branch_
`after-tier-2` lineage (vision standalone fork mirrors these paths one level up).

**Verdict up front:** the pipeline itself is validated end-to-end on 20+ real
sites, and its *evidence model* (per-step screenshots, failure taxonomy,
grounding validators) is genuinely MCP-friendly. But the current codebase is a
single-tenant research runner, not a service. There are 3 BLOCKER-class gaps
(single global LLM key, Windows-only process cleanup, no per-call isolation of
the live-browser context) that must close before any multi-user deployment.

---

## Dimension-by-dimension audit

### 1. Packaging & install — severity: HIGH · effort: 2–3 days
- **Current:** the vision fork (`CAPSTONE_BACKUPS/vision-fork-2026-08-25/package.json`)
  is `private: true`, installs via `npm install` plus TWO Python environments
  (`services/yolo-service/requirements.txt`: torch/ultralytics;
  `services/ocr-service/requirements.txt`: pytesseract + a system Tesseract
  binary). YOLO weights (`screenparser_best.pt`) are gitignored and must be
  re-downloaded from HuggingFace. Node ≥18 assumed (global `fetch` in
  `lib/llmProvider.js`). No versioned releases, no lockfile guarantees across
  machines for the Python side.
- **Production requirement:** `npx @scope/vision-mcp` style install with
  postinstall checks that FAIL LOUDLY (weights missing, tesseract absent,
  python version) rather than failing mid-run.
- **Gap:** no installer validation, no weight bootstrap script, dual-language
  runtime makes distribution inherently harder.

### 2. Auth & per-user key handling — severity: BLOCKER · effort: 3–5 days
- **Current:** ONE key per process, read from environment/.env at startup:
  `lib/llmProvider.js` `resolveLLMConfig()` reads `<PREFIX>LLM_API_KEY`
  (falling back to legacy `GROQ_API_KEY`) — `vision/src/llm.js` calls it once
  at module load. Keys never appear in logs or error messages (tested in
  `test/llmProvider.test.js`), which is good.
- **Production requirement:** per-caller credentials (MCP auth header /
  OAuth-style flow), keys held per-request not per-process, spend accounting
  per caller.
- **Gap:** there is exactly one identity: whoever owns `.env`. Any MCP client
  would burn the SAME ox-alpha/Groq pool (1000 req/day global for the stealth
  pool — see PROJECT_HANDOFF §3). No key rotation, no revocation.

### 3. Input validation — severity: HIGH · effort: 1–2 days
- **Current:** `vision/gateway/app.js` accepts `{url | image_path | image_b64}`
  and throws a 400 ONLY when all three are missing
  (`throw ... statusCode: 400`); URLs are passed straight to Playwright
  (`page.goto(url)`). No scheme allowlist (file://, localhost, internal IPs all
  reachable), no size cap beyond express's 50mb JSON limit, no domain guard on
  the vision explorer side (A-side has an external-domain guard; B leaked to
  github.com in run_20260824_101451 — recorded in INDEX row 9).
- **Production requirement:** URL allowlist/scheme check, SSRF protection,
  payload size limits, schema-validated tool arguments (JSON Schema comes free
  with MCP tool definitions).
- **Gap:** an MCP caller could make the server navigate anywhere, including
  the host's own network.

### 4. Timeout & quota management — severity: HIGH · effort: 2–3 days
- **Current:** step-level timeouts exist and are honored:
  `STEP_TIMEOUT_MS = 15000` (`vision/src/executeTests.js:288`), navigation
  timeouts of 45000 ms throughout, gateway→service health probes at 3000 ms.
  LLM 429s wait-and-retry honoring provider-suggested delay
  (`lib/llmProvider.js`, `LLM_429_RETRIES`, default 6). Per-run call counts are
  recorded (`dashboard_data.json.llm_calls`; token usage now appended to
  `logs/llm_usage.jsonl` by `logUsageToJSONL`).
- **Production requirement:** wall-clock budgets per TOOL CALL (an exploration
  can run minutes), hard caps on LLM tokens/requests per caller per day,
  cancellation propagation (MCP clients abort mid-tool), and queueing instead
  of concurrent stampedes.
- **Gap:** nothing enforces a ceiling — retries can multiply waits
  (~110 s worst case just in 429 backoff), and a long exploration cannot be
  cancelled cleanly.

### 5. Error contracts — severity: MEDIUM · effort: 2 days (mostly done)
- **Current:** this is the project's strongest area. Fusion FT results have a
  deterministic failure taxonomy (`failure_classification[].class`:
  fusion_generation | catalog_grounding | target_resolution |
  browser_execution | semantic_verification) with per-step `failure_stage`
  strings (`selector_not_found`, `label_mismatch`, …), evidence screenshot
  paths, and warnings arrays — see any
  `runs/<id>/fusion/ft_execution_results.json`. Provider errors carry
  `.status`. Honest PARTIAL_FAILURE statuses in `run_manifest.json`.
- **Production requirement:** map every stage failure onto typed MCP tool
  errors (code + retryable flag + evidence pointer), never raw stack traces.
- **Gap:** HTTP-layer errors from the gateway/services are ad-hoc JSON; the
  taxonomy exists at the artifact level but isn't yet a wire contract.

### 6. Service lifecycle (ports 5000–5004) — severity: BLOCKER (on non-Windows) · effort: 3–4 days
- **Current:** `vision/src/serviceManager.js` auto-starts yolo(5001),
  ocr(5002), merge(5003), browser(5004), then gateway(5000), polling each
  `/health`. Cleanup uses `execSync('taskkill /pid <pid> /T /F')`
  (serviceManager.js:41) and `spawn('taskkill', ['/pid', ..., '/T', '/F'])`
  (`vision/runVision.js:63-67`). This works reliably ON WINDOWS ONLY — on
  Linux/macOS both paths fail silently (`stdio: 'ignore'`), orphaning four
  services and a Chromium instance.
- **Production requirement:** cross-platform tree-kill (e.g. `tree-kill` pkg or
  process-group signals), port-free acquisition (dynamic ports or SO_REUSE),
  crash detection + restart with backoff, and guaranteed cleanup on SIGINT/
  SIGTERM of the MCP host.
- **Gap:** hardcoded ports mean two concurrent server instances collide by
  construction (this bit us already — INDEX row 14 "PORT-CONFLICT").

### 7. Concurrency — severity: BLOCKER · effort: 3–5 days
- **Current:** strictly one exploration at a time, by design. Two pipelines
  corrupt each other (quota pools interleave; page_keys leaked between sites —
  the documented demoblaze→phptravels/openlibrary contamination,
  PROJECT_HANDOFF §6 P1). The campaign serializes via a pid lockfile
  (`testing/.campaign.lock` in `testing/rerun_starved.js`), but the pipeline
  itself does NOT enforce it; `runVision.js`/gateway accept requests whenever
  ports are up.
- **Production requirement:** either a global mutex per browser profile with
  queued calls (simplest, honest), or full per-session isolation (browser
  context + storage dir per call — expensive: each YOLO service load is heavy).
- **Gap:** zero admission control inside the pipeline; correctness currently
  depends on operator discipline.

### 8. Statelessness between calls — severity: MEDIUM · effort: 2–3 days
- **Current:** artifacts ARE nicely stateless and content-addressable by
  run id: `storage/outputs/state_*_visual_dom.json`,
  `test_cases_run_<id>_exploration.json`, `runs/<run_id>/fusion/*` — every
  result record carries provenance (`sources` arrays in dashboard_data.json).
  BUT the browser-service holds live Playwright pages in memory
  (`open_pages_in_context` appears in FT step records), so execution state
  lives in a singleton service between calls.
- **Production requirement:** tools must be resumable purely from run ids on
  disk (they almost are) and browser sessions must be either recreated
  per-call or explicitly scoped to a session handle.
- **Gap:** after a server restart, any in-flight "current page" context is
  gone while old run artifacts remain valid — acceptable, but undocumented.

### 9. Observability/auditability — severity: LOW · effort: 1 day
- Already strong: every run leaves JSON artifacts + screenshots
  (see `docs/EVIDENCE_GUIDE.md`), token usage lands in `logs/llm_usage.jsonl`.
  Missing: structured request-level logging with correlation ids across the
  five services (each service logs to stdout independently).

---

## Summary matrix

| # | Dimension | Severity | Effort |
|---|---|---|---|
| 2 | Per-user auth & keys | **BLOCKER** | 3–5 d |
| 6 | Cross-platform service lifecycle | **BLOCKER** | 3–4 d |
| 7 | Concurrency control | **BLOCKER** | 3–5 d |
| 1 | Packaging/install | HIGH | 2–3 d |
| 3 | Input validation / SSRF | HIGH | 1–2 d |
| 4 | Timeout/quota budgets | HIGH | 2–3 d |
| 5 | Error contracts | MED | 2 d |
| 8 | Statelessness | MED | 2–3 d |
| 9 | Observability | LOW | 1 d |

Realistic total to production-grade: **~3 weeks of focused work**, of which the
three BLOCKERs are ~1.5 weeks. A single-tenant, local-machine MCP server
(one user = the .env owner, tools serialized under a lockfile) skips #2 and #7
and is achievable in **~4–5 days** — that is the recommended V1 scope.

---

## Proposed minimal MCP tool surface — VISION architecture only

Stdio transport, JSON-RPC 2.0. Five tools; all return typed errors, none block
on interactive input. Run artifacts under a per-invocation workspace dir
(`VISION_MCP_WORKSPACE`, default `./vision-mcp-workspace`).

```jsonc
// 1. Explore a site end-to-end (heavy: minutes, burns LLM quota)
{ "name": "explore_site",
  "description": "Screenshot->YOLO+OCR explore a URL; returns run_id.",
  "inputSchema": { "type":"object", "required":["url"],
    "properties": { "url":{"type":"string","format":"uri"},
                    "max_steps":{"type":"integer","minimum":1,"maximum":60,"default":25} } },
  "result": { "run_id":"string", "states":"integer", "tests_generated":"integer",
              "status":"enum[success,partial_failure,failed]" } }

// 2. Read the visual DOM of any captured state
{ "name": "get_visual_dom",
  "inputSchema": { "type":"object","required":["run_id"],
    "properties": { "run_id":{"type":"string"},
                    "state":{"type":"string","description":"state file name; default: initial"} } },
  "result": { "elements":[{"id","type","text","bbox{x1,y1,x2,y2}","confidence"}],
               "screenshot_ref":"string" } }   // path the CLIENT may read

// 3. List generated tests for a run
{ "name": "list_tests",
  "inputSchema": { "type":"object","required":["run_id"], "properties":{ "run_id":{"type":"string"} } },
  "result": { "tests":[{"test_id","objective","steps":"integer","source":"arch_b|fusion"}] } }

// 4. Execute one test against the LIVE site (typed failure taxonomy on fail)
{ "name": "run_test",
  "inputSchema": { "type":"object","required":["run_id","test_id"],
    "properties": { "run_id":{"type":"string"},"test_id":{"type":"string"} } },
  "result": { "status":"enum[pass,fail]","steps":[{"step","action","result",
               "verification_method","failure_stage?"}],
               "summary":{ "passed","failed" } } }

// 5. Fetch evidence bundle for an executed test
{ "name": "get_evidence",
  "inputSchema": { "type":"object","required":["run_id","test_id"],
    "properties": { "run_id":{"type":"string"},"test_id":{"type":"string"} } },
  "result": { "final_screenshot":"string","per_step_screenshots":["string"],
               "record":"object" } }   // the raw ft_execution_results entry
```

Cross-cutting rules for all five tools:
- **Typed errors only**: `-32602` invalid params (schema-enforced),
  `-32001 run_not_found`, `-32002 test_not_found`, `-32003 stage_failed`
  (data carries the `failure_stage`/`class` taxonomy), `-32004 quota_exhausted`,
  `-32005 busy` (lock held — concurrency rule #7), `-32006 not_implemented`
  (skeleton phase).
- **Every result cites its artifact path** on disk — same evidence discipline
  as `docs/EVIDENCE_GUIDE.md`.
- **No secrets in scope**: the server reads its own `.env`; tools never accept
  or return API keys.
- Serialization: `explore_site` and `run_test` share one global lock
  (campaign-lock pattern); the read-only tools (`get_visual_dom`,
  `list_tests`, `get_evidence`) are always safe concurrently.

Skeleton implementation: `mcp/server.js` in the vision standalone fork
(`CAPSTONE_BACKUPS/vision-fork-2026-08-25/mcp/`) — stdio JSON-RPC 2.0 with all
five schemas registered and stubs returning `-32006 not_implemented`.

---

# ADDENDUM (T102): Cross-platform port assessment

_Audit date: 2026-08-25 · author: serial2 agent · scope: vision architecture +
its drivers (`vision/`, `runBoth.js`, campaign runners). Assessment ONLY —_
_implementation is POST-DEADLINE by Master Plan §0.6._

## Inventory of Windows-only constructs (verified against code)

| # | Construct | Citations | POSIX impact |
|---|---|---|---|
| W1 | Process-tree kill via `taskkill /T /F` | `vision/src/serviceManager.js:40-42` (`execSync`, win32-guarded), `vision/runVision.js:64-71` (`spawn('taskkill', …)`), `testing/run_repeatability.js:57` + `mutation/run_detection.js:78` (guarded) | Guarded sites fall back to `proc.kill()` = direct child only; Playwright's Chromium grandchild can orphan. **Unguarded:** `runBoth.js:137` and `runBoth.js:186` call `execSync('taskkill …')` unconditionally — throws (caught) and leaks every service on Linux/macOS |
| W2 | `shell: true` on win32 for service spawns | `vision/runVision.js:54`, `vision/src/serviceManager.js:66` | Windows-only branch, but causes real problems AT HOME: cmd.exe wrapper forces the tree-kill dance in W1 and triggers Node deprecation DEP0190 (observed live during the T105 roundtrip run, 2026-08-25) |
| W3 | Interpreter name `python` | `vision/src/serviceManager.js:21-22` (`cmd: 'python'`), `vision/runVision.js:84-85` | Debian/Ubuntu/macOS typically ship only `python3`; bare `python` fails to spawn. No venv awareness — relies on whichever global interpreter has torch/ultralytics/pytesseract installed |
| W4 | Hardcoded Tesseract binary path | `vision/services/ocr-service/ocr.py:17-18`: default `r"C:\Program Files\Tesseract-OCR\tesseract.exe"` | Overridable via `TESSERACT_CMD`, but nothing validates it at startup — on any OS without that exact path the OCR service dies mid-pipeline instead of failing loudly |
| W5 | Hardcoded service ports 5000–5004 | `vision/src/serviceManager.js:18-23`, `vision/runVision.js:29` | Not OS-specific, but blocks concurrent instances on EVERY OS (INDEX row 14 PORT-CONFLICT). Cross-cutting with dimension 6 and T103's dynamic-port spec |
| W6 | Path separators | **No defects found.** All filesystem joins use `path.join`; artifacts normalize to forward slashes for records (`executeTests.js:65`, `explorer.js:267-268,581`) | None — this layer is already portable |
| W7 | PowerShell assumptions | **None found.** No `powershell`/`.ps1` invocation anywhere in the repo | The earlier "PowerShell-era" concern reduces to W1+W2 (cmd.exe + taskkill), both fixable in one place each |

## Port plan (design only)

1. **Tree-kill without taskkill** — spawn every long-lived service with
   `{ detached: true }` so each becomes its own process-group leader; POSIX
   cleanup becomes `process.kill(-pid, 'SIGTERM')` → `SIGKILL` after grace;
   Windows keeps the existing `taskkill /T /F` behind the platform guard (it
   is the *correct* API there — no need to remove it). Touch points:
   `serviceManager.js killTree()`, `runVision.js killProcessTree()/spawnProcess()`,
   `runBoth.js:137,186` (add guards regardless). Zero-dependency; alternatively
   the `tree-kill` npm package (~2 kB, same semantics).
2. **Drop `shell: true`** — nothing in the spawn args requires a shell
   (commands are bare names resolved via PATH, which `CreateProcess` does natively);
   removing it eliminates the cmd.exe wrapper, DEP0190, and shrinks what the
   tree-kill must reach. Re-verify Chromium grandchild handling after (Playwright
   installs its own exit hooks; abrupt parent kill still needs item 1).
3. **Interpreter injection** — honor `VISION_PYTHON` env var (default `python`)
   in `SERVICE_DEFS`/`runVision.js`; document a project `.venv` layout
   (`pip install -r services/*/requirements.txt`). Trivial effort, removes the
   `python`-vs-`python3` hazard AND pins torch-heavy deps away from system Python.
4. **Fail-loud preflights** — startup check `pytesseract.get_tesseract_version()`;
   on Windows keep the default path, elsewhere REQUIRE `TESSERACT_CMD`. Convert
   "dies mid-run" into "refuses to start with instructions" (aligns with
   MCP_READINESS dimension 1's installer-validation goal).
5. **Dynamic ports** — defer to T103's parallel-safety spec (per-worker port
   allocation solves concurrency and portability together); mechanically:
   `VISION_PORT_BASE` env → derive 5 ports → thread through service argv/env →
   replace literal ports in `explorer.js`/`executeTests.js` constants.

## Verdict

- **Effort: EASY-MEDIUM ≈ 1.5–2 focused days.** Items 1+2 ≈ half a day
  (two files + two driver touch-ups, existing offline suites cover regressions),
  item 3 ≈ 1 h, item 4 ≈ 2 h, item 5 ≈ 1 day (cross-cuts five services).
- **Risk: LOW if done after the review, MODERATE before.** Items 1–4 are
  mechanical with zero user-visible benefit pre-review — exactly the trade the
  Master Plan §0.6 verdict already priced in. Item 5 is the only piece with
  real regression surface (every service + both explorers read ports).
- **Recommended order:** 2 → 1 → 3 → 4 (safe, testable increments), 5 last and
  only alongside the T103 lockfile/port work so both land as one reviewed change.
- **GO/NO-GO: GO — but strictly AFTER the capstone review.** NO-GO before the
  deadline (zero user-visible benefit, nonzero regression risk per §0.6).
  Post-review GO applies to items 1–4 immediately; item 5 GO only when bundled
  with T103's dynamic-port work.
