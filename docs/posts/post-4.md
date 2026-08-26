# POST 4 - Sites 21-40: bot-walls are data, and the guards held

Tier 3 aimed the pipeline at popular production sites: Wikipedia, GitHub
Trending, Hacker News, Reddit, StackOverflow. The pre-registered success bar
was six complete pipelines out of ten, written down before launch - along
with the policy that a blocked site is a valid result, not a missing one.

The internet disagreed with our ambitions in specific, measurable ways.
StackOverflow returned hard 403s on every probe. IMDb served a 202 bot-check.
npmjs was already walled. Reddit login-redirects anonymous visitors. Goodreads
rendered byte-identical blank white screenshots twice. Magento sat behind a
Cloudflare 526 origin-SSL failure for three hours. Six BLOCKED rows, each
with a multi-probe evidence trail - and zero quota burned forcing any of them.

The batch still cleared real targets. Hacker News produced a suite that was
100% fusion-created after Architecture A timed out; its live score of 1/8
traced to a single root cause (navigation to bare `/item` without its `?id`
parameter) rather than eight different failures. Guru99 became the proof that
a mid-campaign budget fix worked: with `ARCH_A_TIMEOUT_MS=1500000`,
Architecture A completed 25 steps and 20 states where the old cap would have
timed out.

The purity discipline earned its keep. Four contamination attempts were caught
before publication - foreign test cases swept into Magento's run, a Magento
page key inside EvilTester's tree, practica artifacts in Techlistic's, and a
late-campaign recurrence on W3Schools. Every one registered as DO-NOT-CITE
contamination evidence, kept on disk, cited nowhere.

Two honesty datapoints deserve their own sentence: archive.org's JS-bootstrap
rendered nothing, S4 offered zero tests, and the executor refused to run an
empty suite - recorded as a thin-run, not a pass. And two different windows
producing runs against single-widget table pages (#38, #39) got byte-for-byte
identical outcome shapes: FT 1/1, fusion 14.3%.

Final scoreboard across all 40 sites: 29 cleared/scored rows, 7 blocked-
honest, 4 DO-NOT-CITE contamination-evidence rows. The D11 final batch went
13-for-18 executed fused tests (72.2%), audited after an earlier miscount.

Lesson learned: write success criteria before you launch, then let blocked
and empty results count as data - a scoreboard you can trust beats one that
flatters you.
