# vision-mcp (skeleton)

Stdio MCP server (JSON-RPC 2.0, zero dependencies) exposing the Vision
architecture as five tools. **All tool calls are stubs** returning the typed
error `-32006 not_implemented` until real pipeline wiring lands.

Design contract + production gap analysis: `docs/MCP_READINESS.md`
(in the main Capstone repo).

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

## Tools

| Tool | Purpose | Args |
|---|---|---|
| `explore_site` | Screenshot → YOLO+OCR explore of a URL; returns run_id | url (required), max_steps |
| `get_visual_dom` | Visual DOM elements + screenshot ref for one state | run_id (required), state |
| `list_tests` | Tests generated in a run | run_id (required) |
| `run_test` | Execute one test live; typed failure taxonomy on fail | run_id, test_id (required) |
| `get_evidence` | Screenshots + raw record for an executed test | run_id, test_id (required) |

## Error codes

`-32001` run_not_found · `-32002` test_not_found · `-32003` stage_failed ·
`-32004` quota_exhausted · `-32005` busy (lock held) · `-32006` not_implemented.
Standard JSON-RPC codes for transport/schema problems.
