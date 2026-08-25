# mcp/CROSS_PLATFORM.md — T102 addendum mapped onto the MCP layer

Assessment ONLY — implementation is post-deadline per Master Plan 0.6.
Source inventory: `docs/MCP_READINESS.md` ADDENDUM (T102) in the main
Capstone repo (W1–W7). This file maps each construct onto the code that
actually lives in `mcp/`.

## W1 — Process-tree kill via `taskkill /T /F`

- `mcp/tools.js killTree()`: win32-guarded, POSIX fallback is
  `proc.kill('SIGTERM')` = **direct child only**. Same caveat as
  serviceManager's fallback: on POSIX a Playwright Chromium grandchild can
  orphan. The MCP layer inherits this risk through its children rather than
  adding new instances of it.
- Mitigations that DO exist here: wall-clock timeouts call killTree on expiry
  (`MCP_EXPLORE_TIMEOUT_MS`, `MCP_RUN_TEST_TIMEOUT_MS`), so a wedged child
  cannot hold an MCP call open forever.
- Related Windows-specific hang FIXED in this layer (CHANGES.md #7):
  shell:true grandchildren inherit stdio pipes and keep `'close'` from ever
  firing; both heavy-tool handlers now use `'exit'` + stream destroy. On
  POSIX the same fix is harmless (exit fires normally there too).

## W2 — `shell: true` on win32 for service spawns

- mcp/tools.js spawns NEVER use shell:true — plain argv arrays with
  explicit `process.execPath`. No DEP0190 warnings originate from this layer.
- Our CHILDREN (runVision.js, src/executeTests.js) still use shell:true on
  win32; consequences are contained as described under W1.

## W3 — Interpreter name `python`

- Not an mcp/ concern directly: if `python` is missing (Debian/macOS),
  runVision fails its service health-checks and exits non-zero; the MCP
  layer surfaces this correctly as `-32003 stage_failed` with the child's
  log tail ("YOLO service did not become ready"). Typed-error path verified.
- A `VISION_PYTHON` env override would be the minimal post-deadline fix;
  belongs in runVision/serviceManager, not mcp/.

## W4 — Hardcoded Tesseract binary path

- ocr.py's default is a Windows path; `.env`'s `TESSERACT_CMD=tesseract`
  (bare) shadows it. mcp/tools.js `buildChildEnv()` currently resolves the
  bare value via `where` (Windows) and falls back to the Windows default
  path — **this helper is Windows-biased**. If ported: probe `which` on
  POSIX before falling back, and treat an unresolvable value loudly
  (fail health-check early) instead of dying mid-pipeline.

## W5 — Fixed ports 5000–5004

- Single-instance limitation confirmed live during verification: under
  parallel agents a second Vision stack adopts whatever answers
  `/vision/health`, or fails health-wait (surfaced as -32003).
- Cross-cutting with T103's dynamic-port spec; no mcp/-local fix — the
  server passes URLs/ports through to children verbatim by design.

## W6 / W7 — Path separators, PowerShell assumptions

- No defects found at either layer (T102 finding stands): all mcp/ file
  handling uses `path.join`; artifact paths are normalized to forward
  slashes before being returned to callers (`withinRepo`,
  `path.relative(...).replace(/\\/g,'/')`). No .ps1 invocations anywhere.

## Summary table

| T102 item | mcp/ exposure | Status |
|---|---|---|
| W1 taskkill | killTree win32-guarded; POSIX orphan caveat inherited | documented |
| W2 shell:true | absent in mcp/; children mitigated ('exit' fix) | fixed/documented |
| W3 python naming | surfaces as typed -32003 with log tail | documented |
| W4 tesseract path | buildChildEnv fallback is Windows-biased | flagged |
| W5 fixed ports | single-instance; pass-through by design | documented |
| W6/W7 | clean | n/a |
