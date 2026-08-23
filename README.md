# Capstone Project — AI-Assisted Test Case Generation for Mobile and Web UI/UX Applications

Team 101, PES University.

| Folder | Architecture |
|---|---|
| `web/`    | Architecture A — DOM + Memory Log (selector-based, text LLM) |
| `vision/` | Architecture B — Vision (screenshot → ScreenParser YOLO + OCR → visual DOM → coordinate-based tests) |
| `mobile/` | Mobile exploration (Appium) |

Each architecture is independent; see the README inside each folder.

## Unified Web Demo

Run both web architectures against the SAME URL in parallel under one shared run ID:

```bash
node runBoth.js
# Enter website URL:
# > https://demoqa.com
```

- One URL, one run ID (`run_YYYYMMDD_HHMMSS`).
- Architecture A and Architecture B start simultaneously and stay technically
  independent (separate pipelines, separate outputs).
- Results are separated into one run folder:

```
runs/<run_id>/
├── run_manifest.json   statuses, timings, artifact lists
├── dom/                Architecture A: memory_log.json, screenshots/, ...
└── vision/             Architecture B: screenshots/evidence, visual DOMs,
                        generated test cases, execution results
```

If one architecture fails, the other still runs to completion and the failure is
recorded in the manifest (`overall_status`: SUCCESS / PARTIAL_FAILURE / FAILED).

## LLM Provider Configuration

Each architecture has its OWN independently configurable LLM provider. The two
configurations never mix: Architecture A reads only `ARCH_A_*` variables,
Architecture B reads only `ARCH_B_*` variables.

```bash
# Architecture A (web/)
ARCH_A_LLM_PROVIDER=groq
ARCH_A_LLM_MODEL=openai/gpt-oss-120b
ARCH_A_LLM_API_KEY=<your_arch_a_key>

# Architecture B (vision/) — can use a completely different provider/model
ARCH_B_LLM_PROVIDER=openrouter
ARCH_B_LLM_MODEL=openai/gpt-oss-20b:free
ARCH_B_LLM_API_KEY=<your_openrouter_key>
```

- Supported providers: `groq`, `openrouter` (any OpenAI-compatible endpoint via
  `<PREFIX>LLM_BASE_URL` override).
- Legacy variables (`GROQ_API_KEY`, `GROQ_MODEL_A/B`, `GROQ_MODEL`) are still
  honoured when the `ARCH_*_LLM_*` equivalents are absent.
- API keys live only in untracked `.env` files (`web/.env.example`,
  `vision/.env.example` document all options). Keys are never printed.
- `STUB_LLM=true` runs both architectures fully offline without any key.
