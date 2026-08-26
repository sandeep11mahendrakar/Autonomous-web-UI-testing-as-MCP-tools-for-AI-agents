# POST 5 - From pipeline to MCP: five tools an AI agent can call

A pipeline that only I can run is a demo. The goal was to make the vision
explorer callable by any AI agent, which in 2026 means MCP - the Model
Context Protocol that lets clients discover and invoke tools over a standard
wire format.

The fork exposes five tools. `explore_site(url)` spawns the real vision
explorer against a target and streams progress back as JSON-RPC notifications,
returning a run_id plus a summary. The other four are read-only over stored
artifacts: `get_visual_dom(run_id, state?)` serves the merged YOLO-plus-OCR
element view for any captured state; `list_tests(run_id)` enumerates the
generated tests; `get_evidence(run_id, test_id)` returns per-step execution
evidence including screenshots; and `run_test` executes a test live. Transport
is stdio JSON-RPC 2.0, so integration is a child process, not a service mesh.

The design decision I would defend in any review: typed error contracts.
Every failure mode maps to a specific code instead of a string - `-32001`
run_not_found, `-32002` test_not_found (with known_ids attached so the client
can recover), `-32003` STAGE_FAILED carrying a log tail, `-32005` BUSY when
the pipeline is already occupied. These were verified against real failures,
not happy paths. When the YOLO weights file was missing, the client received
a clean STAGE_FAILED with the actual Python traceback tail, not a silent hang.

That weights incident taught its own lesson about packaging: git-lfs had
stored a 134-byte pointer where the ~153 MB `screenparser_best.pt` model
should be, and the pipeline died with an UnpicklingError until the real file
was copied into place. Post-install checks now fail loudly on missing weights
or absent Tesseract.

The first end-to-end roundtrip ran against example.com in 15.1 seconds using
stubbed LLM responses - zero quota, full tool path exercised. Later passes
wired all read-only tools over real artifacts and closed the last stub on
`run_test`, with the auditor confirming zero stubs remaining and an offline
verification harness in place.

The payoff is composability: any MCP-capable agent can now point the explorer
at a URL, enumerate what was discovered, and pull step-level evidence with
screenshots - without knowing a Playwright process from a YOLO checkpoint.

Lesson learned: expose failures as precisely as you expose capabilities -
typed errors and evidence trails make a tool trustworthy to machines in a way
that success-only APIs never are.
