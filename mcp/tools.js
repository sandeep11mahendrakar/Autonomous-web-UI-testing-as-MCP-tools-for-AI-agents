'use strict';

/**
 * mcp/tools.js — tool schemas + handlers for the Vision MCP server.
 *
 * PHASE 1 WIRING: exactly one tool is real —
 *   explore_site(url, max_steps?) spawns `node runVision.js --explore <url>`
 *   in this repo root, streams its stdout/stderr lines to a caller-installed
 *   log sink (server.js forwards them as JSON-RPC notifications), and
 *   resolves with the run_id + summary parsed from the run's
 *   storage/outputs/<run_id>_exploration_result.json.
 *
 * The other four tools (get_visual_dom, list_tests, run_test, get_evidence)
 * are still stubs returning the typed error -32006. See docs/MCP_READINESS.md
 * (main Capstone repo) for the full gap analysis and contract design.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const VISION_ROOT = path.join(__dirname, '..');
const RUN_VISION = path.join(VISION_ROOT, 'runVision.js');
const OUTPUT_DIR = path.join(VISION_ROOT, 'storage', 'outputs');

/** Wall-clock cap per exploration. Override with MCP_EXPLORE_TIMEOUT_MS. */
const EXPLORE_TIMEOUT_MS =
  Number(process.env.MCP_EXPLORE_TIMEOUT_MS) || 30 * 60 * 1000;

/** How many trailing log lines to attach to failure payloads. */
const TAIL_LINES = 60;

const TOOLS = [
  {
    name: 'explore_site',
    description:
      'Explore a URL with the vision architecture (screenshot -> YOLO+OCR -> ' +
      'visual DOM -> generated tests). Heavy: minutes of wall clock and LLM ' +
      'quota. Returns a run_id usable with the other tools.',
    inputSchema: {
      type: 'object',
      required: ['url'],
      properties: {
        url: { type: 'string', format: 'uri', description: 'http(s) URL to explore' },
        max_steps: { type: 'integer', minimum: 1, maximum: 60, default: 25 },
      },
    },
  },
  {
    name: 'get_visual_dom',
    description:
      'Return the visual DOM (YOLO+OCR elements with bboxes and confidences) ' +
      'for one captured state of a run, plus a screenshot reference.',
    inputSchema: {
      type: 'object',
      required: ['run_id'],
      properties: {
        run_id: { type: 'string' },
        state: { type: 'string', description: 'state name; defaults to the initial state' },
      },
    },
  },
  {
    name: 'list_tests',
    description: 'List the tests generated for a run.',
    inputSchema: {
      type: 'object',
      required: ['run_id'],
      properties: { run_id: { type: 'string' } },
    },
  },
  {
    name: 'run_test',
    description:
      'Execute one generated test against the live site. On failure returns ' +
      'the typed failure taxonomy (failure_stage/class) from the FT executor.',
    inputSchema: {
      type: 'object',
      required: ['run_id', 'test_id'],
      properties: { run_id: { type: 'string' }, test_id: { type: 'string' } },
    },
  },
  {
    name: 'get_evidence',
    description:
      'Fetch the evidence bundle for an executed test: final/per-step ' +
      'screenshot paths and the raw execution record.',
    inputSchema: {
      type: 'object',
      required: ['run_id', 'test_id'],
      properties: { run_id: { type: 'string' }, test_id: { type: 'string' } },
    },
  },
];

/** Typed JSON-RPC error payloads per docs/MCP_READINESS.md cross-cutting rules. */
const ERRORS = {
  RUN_NOT_FOUND: { code: -32001, message: 'run_not_found' },
  TEST_NOT_FOUND: { code: -32002, message: 'test_not_found' },
  STAGE_FAILED: { code: -32003, message: 'stage_failed' },
  QUOTA_EXHAUSTED: { code: -32004, message: 'quota_exhausted' },
  BUSY: { code: -32005, message: 'busy: another exploration/execution holds the lock' },
  NOT_IMPLEMENTED: { code: -32006, message: 'not implemented (MCP skeleton)' },
};

/** Caller-installed sink for streamed pipeline logs: fn(lineString). */
let logSink = null;

/** Only one exploration at a time inside this server process. */
let exploreBusy = false;

function setLogSink(fn) {
  logSink = typeof fn === 'function' ? fn : null;
}

function emitLog(line) {
  if (logSink) {
    try {
      logSink(line);
    } catch (_) {
      /* a broken sink must never kill the pipeline */
    }
  }
}

/** Split raw chunks into complete lines (handles partial line boundaries). */
function lineStreamer(onLine) {
  let buf = '';
  return (chunk) => {
    buf += chunk.toString('utf8');
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, '');
      buf = buf.slice(idx + 1);
      if (line) onLine(line);
    }
  };
}

/** Best-effort full-tree kill (runVision's service children use shell:true). */
function killTree(proc) {
  if (!proc || proc.exitCode !== null) return;
  try {
    if (process.platform === 'win32' && proc.pid) {
      spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      proc.kill('SIGTERM');
    }
  } catch (_) {
    /* ignore */
  }
}

function listResultFiles() {
  if (!fs.existsSync(OUTPUT_DIR)) return [];
  return fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.endsWith('_exploration_result.json'))
    .map((f) => path.join(OUTPUT_DIR, f));
}

/** Newest <run_id>_exploration_result.json written after `sinceMs`. */
function findNewestResult(sinceEpochMs) {
  const candidates = listResultFiles()
    .map((p) => ({ p, m: fs.statSync(p).mtimeMs }))
    .filter((x) => x.m >= sinceEpochMs - 2000) // small clock skew allowance
    .sort((a, b) => b.m - a.m);
  return candidates.length ? candidates[0].p : null;
}

/**
 * Real handler for explore_site. Always resolves to { result } | { error }
 * (same shape as callTool's synchronous contract) so the server wrapper can
 * render typed failures as MCP isError content.
 */
function exploreSite(args) {
  if (exploreBusy) return Promise.resolve({ error: { ...ERRORS.BUSY } });

  let parsedUrl;
  try {
    parsedUrl = new URL(args.url);
  } catch (_) {
    return Promise.resolve({
      error: { code: -32602, message: `invalid url: "${args.url}"` },
    });
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return Promise.resolve({
      error: { code: -32602, message: `unsupported protocol: "${parsedUrl.protocol}"` },
    });
  }

  const startedWallClock = Date.now();
  const tail = [];
  const pushTail = (line) => {
    tail.push(line);
    if (tail.length > TAIL_LINES) tail.shift();
  };

  return new Promise((resolve, reject) => {
    exploreBusy = true;
    emitLog(`[mcp] spawning runVision --explore ${args.url}`);

    const env = { ...process.env };
    // Callers pass API config through the inherited environment (.env is
    // loaded by runVision itself); max_steps maps to the explorer's override.
    if (args.max_steps) env.EXPLORE_MAX_STEPS = String(args.max_steps);

    const child = spawn(
      process.execPath,
      [RUN_VISION, '--explore', args.url],
      { cwd: VISION_ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    const streamOut = lineStreamer((l) => emitLog(`[vision] ${l}`));
    const streamErr = lineStreamer((l) => {
      emitLog(`[vision:err] ${l}`);
      pushTail(l);
    });
    child.stdout.on('data', streamOut);
    child.stderr.on('data', streamErr);

    const finish = (fn) => {
      exploreBusy = false;
      clearTimeout(timer);
      return fn();
    };

    const timer = setTimeout(() => {
      emitLog('[mcp] exploration timed out; killing process tree');
      killTree(child);
      resolve(
        finish(() => ({
          error: {
            ...ERRORS.STAGE_FAILED,
            data: { reason: 'timeout_ms', timeout_ms: EXPLORE_TIMEOUT_MS, log_tail: tail },
          },
        }))
      );
    }, EXPLORE_TIMEOUT_MS);

    child.on('error', (err) =>
      finish(() =>
        resolve({
          error: {
            ...ERRORS.STAGE_FAILED,
            data: { reason: 'spawn_failed', detail: err.message, log_tail: tail },
          },
        })
      )
    );

    child.on('close', (code) => {
      if (code !== 0) {
        return finish(() =>
          resolve({
            error: {
              ...ERRORS.STAGE_FAILED,
              data: { reason: 'exit_code', exit_code: code, log_tail: tail },
            },
          })
        );
      }
      const resultPath = findNewestResult(startedWallClock);
      if (!resultPath) {
        return finish(() =>
          resolve({
            error: {
              ...ERRORS.STAGE_FAILED,
              data: {
                reason: 'no_result_file',
                detail: `no *_exploration_result.json newer than run start under ${OUTPUT_DIR}`,
                log_tail: tail,
              },
            },
          })
        );
      }
      let parsed;
      try {
        parsed = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
      } catch (err) {
        return finish(() =>
          resolve({
            error: {
              ...ERRORS.STAGE_FAILED,
              data: { reason: 'result_unreadable', detail: err.message, log_tail: tail },
            },
          })
        );
      }
      emitLog(`[mcp] exploration finished: run_id=${parsed.run_id}`);
      return finish(() =>
        resolve({
          result: {
            run_id: parsed.run_id,
            start_url: parsed.start_url,
            termination_reason: parsed.termination_reason,
            duration_ms: parsed.duration_ms,
            totals: parsed.totals,
            visited_urls: parsed.visited_urls,
            screenshots_dir: parsed.screenshots_dir,
            test_cases_file: parsed.test_cases_file,
            result_file: path.relative(VISION_ROOT, resultPath).replace(/\\/g, '/'),
          },
        })
      );
    });
  });
}

/**
 * Dispatch. Synchronous for stubs; explore_site returns a Promise with the
 * same { result } | { error } shape. Argument validation against each tool's
 * inputSchema.required happens in server.js.
 */
function callTool(name, args) {
  if (!TOOLS.some((t) => t.name === name)) {
    return { error: { code: -32602, message: `unknown tool "${name}"` } };
  }
  if (name === 'explore_site') {
    return exploreSite(args || {});
  }
  return { error: { ...ERRORS.NOT_IMPLEMENTED, data: { tool: name } } };
}

module.exports = { TOOLS, ERRORS, callTool, setLogSink };
