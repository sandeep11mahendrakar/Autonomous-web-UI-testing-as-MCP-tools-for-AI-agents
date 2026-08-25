# vision-mcp

Stdio MCP server (JSON-RPC 2.0, zero dependencies) exposing the Vision
architecture as five tools. **PHASE 1: `explore_site` is fully wired** â€” it
spawns `node runVision.js --explore <url>`, streams pipeline logs as
`notifications/message`, and returns the run's `run_id` + summary. The other
four tools are still stubs returning the typed error `-32006`. **PHASE 2: the three read-only tools are now wired** (zero quota, no browser): `get_visual_dom`, `list_tests`, `get_evidence` read storage/outputs + storage/screenshots artifacts. Only `run_test` remains a stub (needs live browser + campaign lock).

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

## Roundtrip verification (no manual speaking needed)

```bash
STUB_LLM=true node mcp/verify_roundtrip.js https://example.com
```

Runs initialize -> tools/list -> stub call (-32006) -> a real `explore_site`
pass, asserting each step. With `STUB_LLM=true` the exploration makes no LLM
API calls; without it the inherited `.env` provider/key/quota is used.

Environment knobs:
- `MCP_EXPLORE_TIMEOUT_MS` â€” wall-clock cap per explore_site call (default 30 min)
- `MCP_VERIFY_TIMEOUT_MS` â€” cap for verify_roundtrip.js (default 25 min)
- `EXPLORE_MAX_STEPS` / `max_steps` arg â€” explorer step limit

## Tools

| Tool | Purpose | Args |
|---|---|---|
| `explore_site` | Screenshot â†’ YOLO+OCR explore of a URL; returns run_id | url (required), max_steps |
| `get_visual_dom` | Visual DOM elements + screenshot ref for one state | run_id (required), state |
| `list_tests` | Tests generated in a run | run_id (required) |
| `run_test` | Execute one test live; typed failure taxonomy on fail | run_id, test_id (required) |
| `get_evidence` | Screenshots + raw record for an executed test | run_id, test_id (required) |

## Error codes

`-32001` run_not_found Â· `-32002` test_not_found Â· `-32003` stage_failed Â·
`-32004` quota_exhausted Â· `-32005` busy (lock held) Â· `-32006` not_implemented.
Standard JSON-RPC codes for transport/schema problems.
