# POST 6 - Beta release announcement: v1.0.0-mcp

The MCP server is in beta. Tag `v1.0.0-mcp` (commit `5863275`, the
final-review-pass build) is pushed to the backup remote on branch
`master-v1`, alongside a `FORK_NOTES.md` beta-publish note and an offline
verification harness. All five tools - explore_site, get_visual_dom,
list_tests, get_evidence, and run_test - are wired with no stubs remaining;
run_test was the last, closed with its own integration verification.

What works: point an MCP client at the server over stdio JSON-RPC, call
explore_site on any reachable URL, and get back a run id with streamed
progress; then read the visual DOM, list discovered tests, pull per-test
evidence with screenshots, or execute a test live against the site. Typed
errors cover every failure mode we could provoke, including missing model
weights and mid-exploration crashes.

What does not work yet - stated plainly, because a beta without known limits
is just marketing:

Single-instance ports. The vision services bind fixed ports 5000-5004 with a
health-probe-then-spawn pattern that races under concurrency. One server
instance per machine until dynamic port allocation lands.

Capture flake. Two production runs hit a fatal `Page.captureScreenshot`
protocol error after useful captures were already taken. A retry-once wrapper
is on the shortlist; today it surfaces as an honest stage failure.

Upstream congestion. Exploration quality depends on free-tier LLM pools -
roughly 1000 requests per day globally on our primary provider, resetting at
05:30 IST. Under congestion the explorer paces down rather than failing, but
wall-clock times stretch.

What v1-stable needs, in priority order: value-oracle assertions, so tests
verify that values are correct instead of only that actions succeed - our own
mutation study showed a phantom cart-fee bug pass 4/4 while undetected.
Dynamic ports and a singleton lock to end the concurrency class entirely.
Session-scoped storage so two explorers cannot share an output directory even
by accident.

The full ranked plan lives in `docs/V2_ROADMAP.md`, consolidated from three
retrospectives and five audit passes. Release link: [VERIFY before publish -
repository URL].

If you run it against your own target, read `FORK_NOTES.md` first: copy the
real YOLO weights locally (the repo carries an LFS pointer), confirm Tesseract
is installed, and expect the preflight to fail loudly rather than guess.

Lesson learned: ship the beta with its failure modes written down - users
forgive limits they were told about and abandon tools that surprise them.
