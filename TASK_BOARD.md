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

## WP-1 [OPEN] — Packaging tests → assignee: (claim)

Validate the package surface added in `package.json`.

- [ ] `npm pack --dry-run` — confirm `mcp/server.js`, `mcp/tools.js`,
      `package.json` are included; `.env`/`storage/`/`node_modules/` NOT
      included
- [ ] Global-link smoke: `npm link` (or `npm i -g .`) in a temp dir →
      `vision-test-mcp` on PATH responds to initialize + tools/list
- [ ] `npm run mcp` and `npm run mcp:verify` both work from repo root
- [ ] Shebang check: mcp/server.js line 1 is `#!/usr/bin/env node`
      (add if missing)
- Report results to TASK_BOARD tagged @MCP-LEAD; do not push.

## WP-2 [OPEN] — README quickstart validation → assignee: (claim)

Prove the quickstart in `mcp/README.md` actually works for a fresh user.

- [ ] Claude Code path: register server via `.mcp.json` snippet shape
      (`command`+`args`) — validate JSON parses and paths resolve
- [ ] opencode path: same for the `opencode.json` `mcp` block shape
      (`type: local`, `command` array)
- [ ] Follow the quickstart manually: start server, send the four example
      lines from "Run" section, confirm responses match what the doc claims
- [ ] Verify every env knob documented (`MCP_EXPLORE_TIMEOUT_MS`,
      `MCP_RUN_TEST_TIMEOUT_MS`, `MCP_VERIFY_TIMEOUT_MS`,
      `EXPLORE_MAX_STEPS`) actually takes effect (grep tools.js +
      verify_roundtrip.js)
- File doc fixes directly but tag @MCP-LEAD before committing.

## WP-3 [OPEN] — Input-validation edge cases → assignee: (claim)

Harden the argument surface. Add cases to `mcp/smoke_test.js` (keep it
fast/no pipeline):

- [ ] wrong TYPES: `run_id: 123`, `url: null`, `max_steps: "abc"`,
      `max_steps: -1`, `state: {}` → expect `-32602`, never a crash/hang
- [ ] extra unknown args ignored gracefully
- [ ] `tools/call` with `params.arguments` missing entirely (not just empty)
- [ ] duplicate/concurrent requests while explore_site holds lock → second
      gets `-32005` (protocol-level, not just direct callTool)
- [ ] malformed JSON line → `-32700`; binary garbage on stdin → no crash
- [ ] run_id pattern bypass attempts: `run_../../etc`, `RUN_x` uppercase,
      very long strings → clean typed errors only
- Constraint: NO changes to src/. If an edge case needs an src fix, report
  to @MCP-LEAD instead of editing.

## WP-4 [OPEN] — Cross-platform notes (T102 mapping) → assignee: (claim)

Read `../Capstone-Project/docs/MCP_READINESS.md` ADDENDUM (T102), map its
W1–W7 inventory onto `mcp/`, write `mcp/CROSS_PLATFORM.md`:

- [ ] W1 tree-kill: mcp/tools.js `killTree()` is win32-guarded w/ POSIX
      fallback — document that fallback kills direct child only
      (Playwright grandchild orphan risk, same caveat as serviceManager)
- [ ] W2 shell:true: our child spawns do NOT use shell:true (plain argv);
      but our CHILDREN (runVision/executeTests) still do → inherited-pipe
      hang already mitigated via 'exit' event (CHANGES.md #7); document
- [ ] W3 `python` vs `python3`: affects whether services start at all;
      note MCP surfaces this as -32003 stage_failed with log tail
- [ ] W4 hardcoded Tesseract default in ocr.py vs our buildChildEnv()
      fallback (Windows path constant) — flag as Windows-biased, needs
      POSIX-safe probe if ever ported
- [ ] W5 fixed ports 5000-5004: single-instance limitation observed live
      under parallel agents (FINAL_REPORT.md); cross-ref T103 dynamic-port
      spec
- Assessment ONLY — implementation post-deadline per Master Plan 0.6.

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
