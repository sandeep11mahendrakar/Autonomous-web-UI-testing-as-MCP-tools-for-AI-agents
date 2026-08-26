# agents/ — agent coordination memory (read this first)

Any new agent joining this repo reads this folder BEFORE touching anything.

## What lives here

| Path | What it is |
|---|---|
| `memory/PROJECT_HANDOFF.md` | project identity, structure, provider status, continuation rules |
| `memory/MASTER_AGENT_BRIEFING.md` | session briefing: how multi-agent windows coordinate |
| `memory/TASK_BOARD_archive_<date>.md` | point-in-time snapshots of `docs/TASK_BOARD.md` |
| `memory/comms/*.md` | per-agent append-only comms mirrors |
| `memory/planning/*.md` | superseded internal plans (kept for history, not active) |

## Rules every agent follows

1. Read `memory/PROJECT_HANDOFF.md` + the newest `docs/TASK_BOARD.md` comms
   entries before your first action.
2. Claim work on the board BEFORE starting; update the board after EVERY
   completed item.
3. Never touch files another window owns (check board lanes first).
4. Offline suites must be green before any commit
   (`node --test test/*.test.js fusion/test/*.test.js web/test/*.js`).
5. Push only to the `backup` remote. Never push to Neonishh. Never commit
   keys or `.env` contents.
6. English-only in all committed files.
7. If the board stops syncing via git, mirror your entries through a tracked
   file under `agents/memory/comms/` and note it on the board.

## Historical context in one paragraph

Two architectures (A = DOM state machine in `web/`, B = vision YOLO+OCR in
`vision/`) explore sites independently; a fusion layer (`fusion/`) merges
their catalogs, finds gaps, synthesizes tests, executes them live, and
reports. The campaign ran 40 sites across three tiers with quarantine,
attribution guards (`testing/run_attribution.js`, `testing/folder_purity.js`)
and full audit trail. Start from `README.md`, then `docs/EVIDENCE_GUIDE.md`.
