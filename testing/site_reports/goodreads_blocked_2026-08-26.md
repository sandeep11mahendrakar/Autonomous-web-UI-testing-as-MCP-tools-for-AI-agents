# Site Test Report — Goodreads Lists — BLOCKED (blank-render) — 2026-08-26

## 1. Metadata

| Field | Value |
|---|---|
| Site | Goodreads List / tag: best |
| URL | `https://www.goodreads.com/list/tag/best` |
| Test date | 2026-08-25 → 2026-08-26 (overnight window) |
| Unified run ID | `run_20260825_232334` (attempt 1), `run_20260825_235717` (attempt 2) |
| Repo state | `after-tier-2` @ `46a7561` (W5 lane) |
| Explorer | W5 / ox-alpha serial-E (opencode) |
| Report status | FINAL (BLOCKED — 2 deterministic attempts) |

## 2. Verdict

**BLOCKED — persistent blank render served to the automated browser.** Both
architectures received a 100%-white 1280x900 page on two independent
pipeline attempts (~4h apart in campaign time, different lock windows).
Per Tier-3 policy ("CAPTCHA or bot-wall = record BLOCKED honestly and move
on; blocked IS valid data"), the site is recorded BLOCKED after the
pre-declared single retry. Quota burn was near-zero (no candidates → no
action loop → no test-generation calls).

## 3. What actually happened

Two-probe evidence trail:

1. **Plain-HTTP pre-checks (realistic Chrome UA, zero quota):**
   `HTTP 200` with FULL valid HTML both times ("Best Book Lists" title +
   description meta present). The site serves real content to non-browser
   clients — this is NOT an HTTP-level bot-wall.
2. **Attempt 1 — `run_20260825_232334` (23:23 IST):** browser render blank.
   A: 0 elements extracted, 0 steps, termination=completed. B: YOLO
   detections=0, OCR words=0, full_text="" (visual DOM empty), 0 steps,
   termination=no_candidates_remaining. Screenshot `dom/screenshots/1_initial.png`
   = 5288 bytes, uniformly white (visually verified).
3. **Attempt 2 — `run_20260825_235717` (23:57 IST, different lock window):**
   byte-identical failure signature — screenshot again exactly 5288 bytes,
   0 detections / 0 OCR words / 0 elements. Not transient.

Interpretation: Goodreads serves real HTML but the headless-browser session
gets a blank shell (client-side bot-detection / challenge that renders
nothing rather than a visible CAPTCHA). Classification: **blank-render
bot-wall** — a bot-wall variant with no visible interstitial.

## 4. Findings for the pipeline

| # | Finding | Class |
|---|---|---|
| 1 | Blank-render walls are INVISIBLE to current bot-wall detection: manifest says A `status=success`, termination `completed` — a silently useless run looks healthy. Only the 0-element + blank-screenshot signature reveals it. | Backlog: add blank-render heuristic (element_count==0 AND OCR words==0 AND screenshot entropy low → status `bot_wall_blank`, do NOT report as success) |
| 2 | Plain-HTTP 200-with-content vs browser blank is a useful differential: cheap preflight CANNOT catch this wall class; only a render probe can. | Backlog: optional 1-screenshot render probe before spending LLM quota |

## 5. Metrics

Numbers via `node testing/extract_run.js <run_id>` (both runs):

```
A: steps=0 states=1 urls=1 clicks=0 fills=0 errors=0 (termination=completed)
B: steps=0 states=1 urls=1 detections=0 ocr_words=0 (no_candidates_remaining)
S1: elements=0 behaviors=0 pages=1 conflicts=0
S4: offered=0 candidates=0 accepted=0 rejected=0
FT: not run (no fusion tests exist)
S6/dashboard: none
Quota spent: ~2 flow-discovery calls total across both attempts (no action-loop calls)
Duration: attempt1 A=14.4s B=10.0s ; attempt2 A=45.0s B=10.2s
```

## 6. Disposition

Both run dirs retained in `runs/` as evidence. INDEX row #25 registered as
BLOCKED. Re-attempt only worthwhile behind a real-user browser session
(consistent with the goodreads Cloudflare-era protections); counts toward
the C5 blocking-rate statistic, which is itself a reported result.
