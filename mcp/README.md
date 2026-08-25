# vision-mcp

Stdio MCP server (JSON-RPC 2.0, zero dependencies) exposing the Vision
architecture as five tools — **all fully wired**:

| Tool | Purpose | Args |
|---|---|---|
| `explore_site` | Screenshot → YOLO+OCR explore of a URL; returns run_id | url (required), max_steps |
| `get_visual_dom` | Visual DOM elements + screenshot ref for one state | run_id (required), state |
| `list_tests` | Tests generated in a run | run_id (required) |
| `run_test` | Execute one test live via the replay executor; typed failure taxonomy on fail | run_id, test_id (required) |
| `get_evidence` | Execution record + step/failure screenshot paths for an executed test | run_id, test_id (required) |

Heavy tools (`explore_site`, `run_test`) share one campaign lock — a second
concurrent call gets the typed error `-32005 busy`. Pipeline logs stream to
the client as `notifications/message`.

## Run

```bash
node mcp/server.js
```

Then speak JSON-RPC over stdin, one message per line:

```jsonc
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"explore_site","arguments":{"url":"https://example.com"}}}
```

## Quickstart: register with an MCP client

**Claude Code** (`.mcp.json` in the project root, or `claude mcp add`):

```json
{
  "mcpServers": {
    "vision-test": {
      "command": "node",
      "args": ["C:\\path\\to\\repo\\mcp\\server.js"],
      "env": { "STUB_LLM": "false" }
    }
  }
}
```

or: `claude mcp add vision-test -- node C:\path\to\repo\mcp\server.js`

**opencode** (`~/.config/opencode/opencode.json` or project
`opencode.json`):

```json
{
  "mcp": {
    "vision-test": {
      "type": "local",
      "command": ["node", "C:\\path\\to\\repo\\mcp\\server.js"]
    }
  }
}
```

The server inherits the repo's `.env` (LLM provider/key/model). Set
`STUB_LLM=true` in the env block for a no-API smoke mode. The package also
exposes a `bin` entry (`vision-test-mcp`) for global installs.

## Roundtrip verification (no manual speaking needed)

```bash
STUB_LLM=true node mcp/verify_roundtrip.js https://example.com
```

Runs initialize -> tools/list -> typed-error check -> a real `explore_site`
pass -> `list_tests` on the fresh run, asserting each step. With
`STUB_LLM=true` the exploration makes no LLM API calls; without it the
inherited `.env` provider/key/quota is used.

Live replay check (needs a run that generated tests; runs the executor):

```bash
node mcp/verify_run_test.js <run_id> TC01
```

Protocol-only smoke test (no pipeline, fast):

```bash
node mcp/smoke_test.js
```

Environment knobs:
- `MCP_EXPLORE_TIMEOUT_MS` — wall-clock cap per explore_site call (default 30 min)
- `MCP_RUN_TEST_TIMEOUT_MS` — wall-clock cap per run_test call (default 15 min)
- `MCP_VERIFY_TIMEOUT_MS` — cap for verify_roundtrip.js (default 25 min)
- `EXPLORE_MAX_STEPS` / `max_steps` arg — explorer step limit

## Error codes

`-32001` run_not_found · `-32002` test_not_found · `-32003` stage_failed ·
`-32004` quota_exhausted · `-32005` busy (campaign lock held) ·
`-32006` not_implemented (unused since all tools are wired).
Standard JSON-RPC codes for transport/schema problems (`-32602` invalid
params, `-32601` unknown method, `-32700` parse error). Error payloads and
log tails are redacted (key/token/secret assignments, home-dir paths) before
they leave the process.
