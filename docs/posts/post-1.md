# POST 1 - Introducing the v0 architecture

Every web UI test suite starts life the same way: an engineer reads the DOM,
writes selectors, and hopes the site never changes. My capstone started from a
different question: what if two agents explored the same website through
completely different senses, and a third layer merged what each one saw?

The v0 architecture is dual-perception. Architecture A drives a real browser
through Playwright, extracts the DOM, and lets an LLM action loop wander the
site step by step, producing selector-grounded tests. Architecture B never
reads the DOM at all: it takes full-page screenshots, runs a YOLO screen-
parser plus Tesseract OCR over them, and builds a "visual DOM" of element
boxes and labels, producing coordinate-based tests whose targets are re-
detected live before every click. Neither knows the other exists.

Why bother with the second pair of eyes? Because DOM-only testing has blind
spots you cannot fix by trying harder. Canvas-heavy layouts, image-button
flows, and pixel-positioned dashboards simply do not expose themselves as
friendly selector trees. The vision side sees what a human sees; the DOM side
knows things no screenshot can show, like which input carries which form
field name.

The proof-of-concept was one reference run against DemoQA
(`run_20260822_214750`). It proved the loop could close end to end: both
explorers produced artifacts, the fusion layer built a combined catalog, and
a composed test executed live with all four steps passing. What it did NOT
prove was scale. One friendly practice site tells you nothing about bot-walls,
quota exhaustion, or your own pipeline's ability to attribute results to the
right website. Fusion-attributable coverage on that first run was just 25% -
most tests still came from the individual explorers, not from the merge.

The most important early signal was negative space: across later sites, the
element overlap between the two architectures stayed between 0 and 1 items
while their combined catalogs held 78 to 273 elements. Two agents looking at
the same page were seeing almost entirely different things. That number is
the reason the rest of the project exists.

Lesson learned: a proof-of-concept proves the mechanism works, not that the
system survives contact with reality - design the campaign before you trust
the demo.
