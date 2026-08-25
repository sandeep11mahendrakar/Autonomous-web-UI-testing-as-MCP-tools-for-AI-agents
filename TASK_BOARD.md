# TASK_BOARD — MCP build coordination

> Comms convention: append entries tagged `@MCP-LEAD` (worker→lead) or
> `@WORKER-<n>` (lead→worker). One entry per post: timestamp, owner, status.
> LOCAL COMMITS ONLY tonight — no pushes.

---

## @MCP-LEAD — 2026-08-26 00:40 — KICKOFF / STATE OF THE BOARD

Baseline landed on `vision-standalone`: commits `c9a36a2` (feat) + `ac4efaf`
(docs). All five tools wired & verified end-to-end; transcripts in
`mcp/VERIFICATION.md`, status in `mcp/FINAL_REPORT.md`, checklist in
`mcp/TASKS.md`, bugfix log in `mcp/CHANGES.md`.

**Work packages below are OPEN for Tier-3 workers finishing their rows.
Claim by posting here, then assist. Lead has final say on what lands in mcp/.**

---

## WP-1 [CLOSED by lead 00:55] — Packaging tests

- [x] `npm pack` — mcp/* included; `.env`/`storage/`/`node_modules/` NOT
- [x] Install tarball into clean temp dir → bin `vision-test-mcp` responds
      to initialize + tools/list (serverInfo verified)
- [x] Shebang added to mcp/server.js line 1 (`#!/usr/bin/env node`)
- [x] npm scripts `mcp` / `mcp:verify` present and functional

## WP-2 [CLOSED by lead 01:05] — README quickstart validation

- [x] Both config snippets parse (`mcpServers` Claude Code shape,
      `mcp`/`type:local` opencode shape) — automated via mcp/check_readme.js
- [x] All four "Run"-section example JSON-RPC lines valid; lines 1-3
      executed against live server with responses matching docs
      (initialize serverInfo + 5-tool tools/list); line 4 explore_site
      covered by verify_roundtrip ALL-PASSED run
- [x] Every env knob documented exists in code: MCP_EXPLORE_TIMEOUT_MS
      (tools.js:37), MCP_RUN_TEST_TIMEOUT_MS (tools.js:39),
      MCP_VERIFY_TIMEOUT_MS (verify_roundtrip.js), EXPLORE_MAX_STEPS
      (src/explorer.js LIMITS.MAX_STEPS)

## WP-3 [CLOSED by lead 00:58] — Input-validation edge cases

- [x] wrong TYPES (`run_id: 123`, `max_steps: -1`) → `-32602` (schema
      type/range validation added to server.js validateArgs)
- [x] `tools/call` with `arguments` missing entirely → `-32602`
- [x] run_id bypass attempts (`run_../../etc`, 500-char) → typed `-32001`,
      nothing leaks
- [x] binary garbage / broken JSON on stdin → `-32700` per line, server
      stays alive, subsequent requests answered
- [x] concurrent-lock over protocol: verified earlier via live overlapping
      explore_site calls (`-32005`); direct-callTool path also covered

## WP-4 [CLOSED by lead 01:15] — Cross-platform notes (T102 mapping)

- [x] `mcp/CROSS_PLATFORM.md` written: W1–W7 mapped onto the MCP layer
      (killTree POSIX orphan caveat; 'exit'-fix cross-ref; python-naming
      surfaces as typed -32003; buildChildEnv Windows bias flagged;
      fixed-port single-instance note; W6/W7 clean). Assessment only.

---

## LOG

- 2026-08-26 00:40 @MCP-LEAD — board created; WP-1..WP-4 open; baseline
  c9a36a2+ac4efaf verified (roundtrip ALL PASSED; run_test TC01 4/4 PASS
  over live stdio).
- 2026-08-26 00:50 @MCP-LEAD — pre-flight for WP-1 done by lead:
  `npm pack --dry-run` surface is CLEAN (no .env/storage/node_modules; all
  mcp/* included). Found+fixed missing shebang on mcp/server.js (bin entry
  requires it for POSIX global installs); smoke re-passes. WP-1 remaining
  scope: npm link smoke + npm run scripts check.
- 2026-08-26 00:55 @MCP-LEAD — **WP-1 CLOSED by lead** (executed while open):
  packed tarball installs into a clean temp dir (88 pkgs), mcp/server.js
  present, .env correctly ABSENT from package, installed bin
  `vision-test-mcp` answers initialize with correct serverInfo.
- 2026-08-26 00:58 @MCP-LEAD — **WP-3 CLOSED by lead**: schema type/range
  validation added to server.js validateArgs (wrong-typed args now -32602
  instead of leaking as domain errors); smoke_test.js extended with:
  wrong types, out-of-range max_steps, missing arguments object,
  run_id traversal/oversize bypass attempts, binary-garbage stdin
  resilience (-32700 per bad line, server stays alive, ping still works).
  ALL SMOKE CHECKS PASSED.
- 2026-08-26 01:05 @MCP-LEAD — **WP-2 CLOSED by lead**: README snippets
  machine-checked (mcp/check_readme.js), example lines executed live,
  env knobs grep-verified. WP-4 remains OPEN for a worker; lead will
  start drafting CROSS_PLATFORM.md if unclaimed by next checkpoint.
- 2026-08-26 01:15 @MCP-LEAD — **WP-4 CLOSED by lead** (unclaimed):
  mcp/CROSS_PLATFORM.md written mapping T102 W1-W7 onto mcp/.
  ALL FOUR WORK PACKAGES NOW CLOSED. Board remains open for worker
  reports/reviews; final review pass pending before morning handoff.
