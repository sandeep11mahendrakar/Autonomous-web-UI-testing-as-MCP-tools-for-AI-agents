'use strict';

/**
 * mcp/tools.js — tool schemas + handlers for the Vision MCP server.
 *
 * PHASE 1 WIRING: explore_site(url, max_steps?) spawns
 *   `node runVision.js --explore <url>` in this repo root, streams its
 *   stdout/stderr lines to a caller-installed log sink (server.js forwards
 *   them as JSON-RPC notifications), and resolves with the run_id + summary
 *   parsed from the run's storage/outputs/<run_id>_exploration_result.json.
 *
 * PHASE 2 WIRING: three READ-ONLY tools are now real (zero quota, no browser):
 *   get_visual_dom(run_id, state?)   — YOLO+OCR elements + screenshot ref
 *   list_tests(run_id)               — tests generated for a run
 *   get_evidence(run_id, test_id)    — execution record + evidence screenshots
 * They only read files under storage/outputs + storage/screenshots.
 *
 * PHASE 3 WIRING: run_test(run_id, test_id) spawns
 *   `node src/executeTests.js <test_cases_<run_id>_exploration.json> <start_url>`
 * streams its progress lines through the same log sink, then returns the
 * final JSON verdict parsed from storage/outputs/execution_results.json.
 * One execution at a time — shares the campaign lock with explore_site.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// dotenv is loaded in server.js before tools are dispatched; requiring it
// here too keeps tools.js usable standalone (tests, smoke scripts).
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: false });

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
      'Execute one generated test against the live site (spawns the replay ' +
      'executor; minutes of wall clock). On failure returns the typed ' +
      'failure taxonomy (failure_stage/class) from the FT executor.',
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

/**
 * Redact anything that could leak environment/config values (keys, tokens,
 * absolute user paths) before a string reaches a caller. Defense in depth:
 * handlers already avoid embedding secrets in error payloads.
 */
function redact(text) {
  let s = String(text);
  // Any value assigned to a *_KEY / *_TOKEN / *_SECRET env-style assignment.
  s = s.replace(/\b([A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*)\s*=\s*\S+/gi, '$1=<redacted>');
  // Absolute paths containing the user home directory.
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) s = s.split(home).join('~');
  return s;
}

/** Trim a log/error tail and redact it before it leaves the process. */
function safeTail(lines) {
  return lines.slice(-TAIL_LINES).map(redact);
}

/**
 * Child-env fixes for known .env pitfalls (documented in mcp/CHANGES.md).
 * The .env in this workspace sets two repo-relative / bare values that break
 * child processes whose cwd differs from the repo root:
 *   - YOLO_MODEL_PATH=services/yolo-service/screenparser_best.pt breaks
 *     detect.py (cwd=services/yolo-service) -> resolve against VISION_ROOT.
 *   - TESSERACT_CMD=tesseract overrides ocr.py's working absolute default
 *     and fails when "tesseract" is not on PATH -> resolve to the well-known
 *     install location when the bare value cannot be found.
 */
function buildChildEnv(extra = {}) {
  const env = { ...process.env, ...extra };

  if (env.YOLO_MODEL_PATH && !path.isAbsolute(env.YOLO_MODEL_PATH)) {
    const absModel = path.join(VISION_ROOT, env.YOLO_MODEL_PATH);
    if (fs.existsSync(absModel)) env.YOLO_MODEL_PATH = absModel;
  }

  const TESSERACT_DEFAULT = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
  if (env.TESSERACT_CMD && !path.isAbsolute(env.TESSERACT_CMD)) {
    try {
      require('child_process').execFileSync(
        'where',
        [env.TESSERACT_CMD],
        { stdio: 'pipe' }
      );
      // resolvable on PATH — leave untouched
    } catch (_) {
      if (fs.existsSync(TESSERACT_DEFAULT)) env.TESSERACT_CMD = TESSERACT_DEFAULT;
    }
  }

  return env;
}

/** Caller-installed sink for streamed pipeline logs: fn(lineString). */
let logSink = null;

/**
 * One heavy operation at a time inside this server process. Both
 * explore_site and run_test hold the same campaign lock (a live browser +
 * the Vision services must not contend).
 */
let campaignBusy = false;

/** Wall-clock cap per test execution (run_test). */
const RUN_TEST_TIMEOUT_MS =
  Number(process.env.MCP_RUN_TEST_TIMEOUT_MS) || 15 * 60 * 1000;

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

// ── read-only artifact access (phase 2: get_visual_dom / list_tests / get_evidence)

const HISTORY_SUFFIX = '_exploration_history.json';
const EXECUTION_RESULTS = path.join(OUTPUT_DIR, 'execution_results.json');

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

/**
 * Resolve a run_id to its artifacts. Returns { result, history, tests } or
 * null when the run has no exploration_result.json (typed RUN_NOT_FOUND).
 */
function resolveRun(runId) {
  if (typeof runId !== 'string' || !/^run_[A-Za-z0-9_-]+$/.test(runId)) return null;
  const resultFile = path.join(OUTPUT_DIR, `${runId}_exploration_result.json`);
  if (!fs.existsSync(resultFile)) return null;
  const result = readJsonSafe(resultFile);
  if (!result) return null;
  const historyFile = path.join(OUTPUT_DIR, `${runId}${HISTORY_SUFFIX}`);
  const history = fs.existsSync(historyFile) ? readJsonSafe(historyFile) : null;
  let tests = [];
  if (result.test_cases_file && fs.existsSync(result.test_cases_file)) {
    const parsed = readJsonSafe(result.test_cases_file);
    if (Array.isArray(parsed)) tests = parsed;
  }
  return { result, history, tests };
}

/** Visual-DOM JSON files live flat as <state_id>_<label>_visual_dom.json. */
function findVisualDomFile(stateId) {
  if (!fs.existsSync(OUTPUT_DIR)) return null;
  const matches = fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.startsWith(`${stateId}_`) && f.endsWith('_visual_dom.json'))
    .map((f) => path.join(OUTPUT_DIR, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs); // newest first
  return matches[0] || null;
}

/** Trim a visual DOM to the fields an agent caller needs (small payloads). */
function slimElements(elements) {
  return (elements || []).map((e) => ({
    id: e.id,
    type: e.type,
    text: e.text,
    bbox: e.bbox,
    confidence: e.confidence ? e.confidence.combined ?? e.confidence.yolo : null,
  }));
}

function getVisualDom(args) {
  const run = resolveRun(args.run_id);
  if (!run) return { error: { ...ERRORS.RUN_NOT_FOUND, data: { run_id: args.run_id } } };

  const states = (run.history && Array.isArray(run.history.states))
    ? run.history.states
    : [];
  if (!states.length) {
    return {
      error: {
        ...ERRORS.STAGE_FAILED,
        data: { reason: 'no_states_recorded', run_id: args.run_id },
      },
    };
  }

  const wanted = args.state ? String(args.state) : null;
  const state = wanted
    ? states.find((s) => s.state_id === wanted || path.basename(String(s.screenshot || '')).startsWith(wanted))
    : states[0];
  if (!state) {
    return {
      error: {
        ...ERRORS.STAGE_FAILED,
        data: {
          reason: 'state_not_found',
          requested: wanted,
          available: states.map((s) => s.state_id),
        },
      },
    };
  }

  const vdomFile = findVisualDomFile(state.state_id);
  if (!vdomFile) {
    return {
      error: {
        ...ERRORS.STAGE_FAILED,
        data: {
          reason: 'no_visual_dom_file',
          state_id: state.state_id,
          detail: `no ${state.state_id}_*_visual_dom.json under storage/outputs`,
        },
      },
    };
  }

  const vdom = readJsonSafe(vdomFile);
  if (!vdom) {
    return {
      error: {
        ...ERRORS.STAGE_FAILED,
        data: { reason: 'visual_dom_unreadable', file: path.basename(vdomFile) },
      },
    };
  }

  return {
    result: {
      run_id: args.run_id,
      state_id: state.state_id,
      url: state.url,
      source_file: path.relative(VISION_ROOT, vdomFile).replace(/\\/g, '/'),
      image_size: vdom.image_size || null,
      element_count: vdom.element_count ?? (vdom.elements ? vdom.elements.length : 0),
      elements: slimElements(vdom.elements),
      screenshot_ref: state.screenshot || null,          // client-readable path
      merged_evidence_ref: state.merged_evidence || null, // detections drawn on image
    },
  };
}

function withinRepo(p) {
  const rel = path.relative(VISION_ROOT, p).replace(/\\/g, '/');
  // Artifacts moved in from elsewhere would produce ../ escapes — degrade to
  // the file name rather than handing callers a cross-repo path.
  return rel.startsWith('..') ? path.basename(p) : rel;
}

function listTests(args) {
  const run = resolveRun(args.run_id);
  if (!run) return { error: { ...ERRORS.RUN_NOT_FOUND, data: { run_id: args.run_id } } };

  return {
    result: {
      run_id: args.run_id,
      count: run.tests.length,
      test_cases_file: run.result.test_cases_file
        ? withinRepo(run.result.test_cases_file)
        : null,
      generated_tests_total: (run.result.totals && run.result.totals.generated_tests) ?? null,
      tests: run.tests.map((t) => ({
        test_id: t.id,
        objective: t.objective,
        steps: Array.isArray(t.steps) ? t.steps.length : 0,
        actions: Array.isArray(t.steps) ? t.steps.map((s) => s.action) : [],
        expect_navigation: t.expect_navigation === true,
      })),
    },
  };
}

function getEvidence(args) {
  const run = resolveRun(args.run_id);
  if (!run) return { error: { ...ERRORS.RUN_NOT_FOUND, data: { run_id: args.run_id } } };

  const test = run.tests.find(
    (t) => String(t.id).toLowerCase() === String(args.test_id).toLowerCase()
  );
  if (!test) {
    return {
      error: {
        ...ERRORS.TEST_NOT_FOUND,
        data: { run_id: args.run_id, test_id: args.test_id, known_ids: run.tests.map((t) => t.id) },
      },
    };
  }

  // Execution records (written by src/executeTests.js when a replay ran).
  const execAll = readJsonSafe(EXECUTION_RESULTS);
  const execRecords = execAll && Array.isArray(execAll.results) ? execAll.results : [];
  const record = execRecords.find(
    (r) => String(r.id).toLowerCase() === String(args.test_id).toLowerCase()
  ) || null;

  // Exploration-time evidence screenshots for context (always available).
  const screenshots = ((run.history && run.history.states) || [])
    .filter((s) => s.state_id)
    .map((s) => ({ state_id: s.state_id, screenshot: s.screenshot, merged_evidence: s.merged_evidence }));

  return {
    result: {
      run_id: args.run_id,
      test_id: test.id,
      executed: Boolean(record),
      execution_record: record, // includes status, verification{method,detail}, verification_strength, warnings
      execution_results_file: record
        ? withinRepo(EXECUTION_RESULTS)
        : null,
      note: record
        ? undefined
        : 'no execution_results.json record yet — run_test has not been called for this test',
      exploration_screenshots: screenshots,
      // Step-level evidence recorded by the executor (empty until run_test).
      step_screenshots: record ? collectTestScreenshots(record) : [],
    },
  };
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
  if (campaignBusy) return Promise.resolve({ error: { ...ERRORS.BUSY } });

  let parsedUrl;
  try {
    parsedUrl = new URL(args.url);
  } catch (_) {
    return Promise.resolve({
      error: { code: -32602, message: `invalid url: "${redact(args.url)}"` },
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
    campaignBusy = true;
    emitLog(`[mcp] spawning runVision --explore ${args.url}`);

    const env = buildChildEnv(
      args.max_steps ? { EXPLORE_MAX_STEPS: String(args.max_steps) } : {}
    );

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
      campaignBusy = false;
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
            data: { reason: 'timeout_ms', timeout_ms: EXPLORE_TIMEOUT_MS, log_tail: safeTail(tail) },
          },
        }))
      );
    }, EXPLORE_TIMEOUT_MS);

    child.on('error', (err) =>
      finish(() =>
        resolve({
          error: {
            ...ERRORS.STAGE_FAILED,
            data: { reason: 'spawn_failed', detail: redact(err.message), log_tail: safeTail(tail) },
          },
        })
      )
    );

    // NOTE: 'exit' not 'close' — runVision spawns its services with
    // shell:true, so cmd/python grandchildren inherit our stdio pipes and
    // can keep them open indefinitely after runVision itself has exited.
    // 'close' would never fire in that case (observed live); 'exit' fires
    // on process termination regardless of lingering inherited handles.
    child.on('exit', (code) => {
      child.stdout.destroy();
      child.stderr.destroy();
      if (code !== 0) {
        return finish(() =>
          resolve({
            error: {
              ...ERRORS.STAGE_FAILED,
              data: { reason: 'exit_code', exit_code: code, log_tail: safeTail(tail) },
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
                detail: `no *_exploration_result.json newer than run start under ${path.relative(VISION_ROOT, OUTPUT_DIR).replace(/\\/g, '/')}`,
                log_tail: safeTail(tail),
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
              data: { reason: 'result_unreadable', detail: err.message, log_tail: safeTail(tail) },
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
 * Real handler for run_test. Spawns src/executeTests.js with the run's
 * generated test-cases file and start URL, streams its progress through
 * the log sink, then reads the final verdict for this test_id out of
 * storage/outputs/execution_results.json.
 *
 * Always resolves to { result } | { error } (same contract as exploreSite).
 */
function runTest(args) {
  const run = resolveRun(args.run_id);
  if (!run) return Promise.resolve({ error: { ...ERRORS.RUN_NOT_FOUND, data: { run_id: args.run_id } } });

  const test = run.tests.find(
    (t) => String(t.id).toLowerCase() === String(args.test_id).toLowerCase()
  );
  if (!test) {
    return Promise.resolve({
      error: {
        ...ERRORS.TEST_NOT_FOUND,
        data: { run_id: args.run_id, test_id: args.test_id, known_ids: run.tests.map((t) => t.id) },
      },
    });
  }

  if (!run.result.test_cases_file || !fs.existsSync(run.result.test_cases_file)) {
    return Promise.resolve({
      error: {
        ...ERRORS.STAGE_FAILED,
        data: { reason: 'test_cases_file_missing', detail: String(run.result.test_cases_file || '') },
      },
    });
  }
  if (!run.result.start_url) {
    return Promise.resolve({
      error: {
        ...ERRORS.STAGE_FAILED,
        data: { reason: 'no_start_url', detail: 'exploration result lacks start_url; cannot replay' },
      },
    });
  }

  if (campaignBusy) return Promise.resolve({ error: { ...ERRORS.BUSY } });

  // executeTests.js executes EVERY test in the file; that is fine (the suite
  // is small and it writes one report), but we report only the requested test.
  const startedWallClock = Date.now();
  const tail = [];
  const pushTail = (line) => {
    tail.push(line);
    if (tail.length > TAIL_LINES) tail.shift();
  };

  return new Promise((resolve) => {
    campaignBusy = true;
    emitLog(`[mcp] spawning executeTests for ${test.id} (suite file from ${args.run_id})`);

    const child = spawn(
      process.execPath,
      [path.join('src', 'executeTests.js'), run.result.test_cases_file, run.result.start_url],
      { cwd: VISION_ROOT, env: buildChildEnv(), stdio: ['ignore', 'pipe', 'pipe'] }
    );

    const streamOut = lineStreamer((l) => emitLog(`[execute] ${l}`));
    const streamErr = lineStreamer((l) => {
      emitLog(`[execute:err] ${l}`);
      pushTail(l);
    });
    child.stdout.on('data', streamOut);
    child.stderr.on('data', streamErr);

    let settled = false;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      campaignBusy = false;
      clearTimeout(timer);
      resolve(fn());
    };

    const timer = setTimeout(() => {
      emitLog('[mcp] execution timed out; killing process tree');
      killTree(child);
      finish(() => ({
        error: {
          ...ERRORS.STAGE_FAILED,
          data: { reason: 'timeout_ms', timeout_ms: RUN_TEST_TIMEOUT_MS, log_tail: safeTail(tail) },
        },
      }));
    }, RUN_TEST_TIMEOUT_MS);

    child.on('error', (err) =>
      finish(() => ({
        error: {
          ...ERRORS.STAGE_FAILED,
          data: { reason: 'spawn_failed', detail: redact(err.message), log_tail: safeTail(tail) },
        },
      }))
    );

    // 'exit' not 'close' — same inherited-pipe rationale as exploreSite:
    // the executor spawns Vision services with shell:true whose
    // grandchildren can hold our stdio pipes open after it exits.
    child.on('exit', (code) => {
      child.stdout.destroy();
      child.stderr.destroy();
      // executeTests exits 1 when any test ends ERROR (not FAIL); both carry
      // usable records in execution_results.json, so read it either way.
      const execAll = readJsonSafe(EXECUTION_RESULTS);
      const records =
        execAll && Array.isArray(execAll.results)
          ? execAll.results.filter(
              (r) =>
                execAll.run_id === deriveRunIdFromCases(run.result.test_cases_file) &&
                String(r.id).toLowerCase() === String(test.id).toLowerCase()
            )
          : [];
      const record = records[records.length - 1] || null;

      if (!record) {
        return finish(() => ({
          error: {
            ...ERRORS.STAGE_FAILED,
            data: {
              reason: code === 0 ? 'no_record_for_test' : 'exit_code',
              exit_code: code,
              test_id: test.id,
              log_tail: safeTail(tail),
            },
          },
        }));
      }

      emitLog(`[mcp] run_test finished: ${record.id} -> ${record.status}`);
      return finish(() => ({
        result: {
          run_id: args.run_id,
          test_id: record.id,
          status: record.status,
          failure_reason: record.failure_reason ?? null,
          verification: record.verification ?? null,
          verification_strength: record.verification_strength ?? null,
          warnings: record.warnings || [],
          url_before: record.url_before,
          url_after: record.url_after,
          steps_executed: record.steps_executed || [],
          evidence_dir: record.before_screenshot
            ? withinRepo(path.dirname(path.join(VISION_ROOT, record.before_screenshot)))
            : execAll.evidence_dir || null,
          screenshots: collectTestScreenshots(record),
          exit_code: code,
          duration_ms: Date.now() - startedWallClock,
        },
      }));
    });
  });
}

/** Run id embedded in a test-cases filename (test_cases_run_<ts>_exploration.json). */
function deriveRunIdFromCases(casesFile) {
  const m = path.basename(String(casesFile)).match(/(run_\d+)/);
  return m ? m[1] : null;
}

/** Per-step + final screenshot paths recorded by the executor. */
function collectTestScreenshots(record) {
  const shots = [];
  for (const s of record.steps_executed || []) {
    if (s.after_screenshot) shots.push(s.after_screenshot);
  }
  if (record.failure_screenshot) shots.push(record.failure_screenshot);
  return shots.map(withinRepo);
}

/**
 * Dispatch. Synchronous for read-only tools and stubs; explore_site and
 * run_test return Promises with the same { result } | { error } shape.
 * Argument validation against each tool's inputSchema.required happens in
 * server.js.
 */
function callTool(name, args) {
  if (!TOOLS.some((t) => t.name === name)) {
    return { error: { code: -32602, message: `unknown tool "${name}"` } };
  }
  if (name === 'explore_site') {
    return exploreSite(args || {});
  }
  if (name === 'get_visual_dom') {
    return getVisualDom(args || {});
  }
  if (name === 'list_tests') {
    return listTests(args || {});
  }
  if (name === 'get_evidence') {
    return getEvidence(args || {});
  }
  if (name === 'run_test') {
    return runTest(args || {});
  }
  return { error: { ...ERRORS.NOT_IMPLEMENTED, data: { tool: name } } };
}

module.exports = {
  TOOLS,
  ERRORS,
  callTool,
  setLogSink,
  resolveRun,
  // exported for offline tests only
  redact,
  safeTail,
  buildChildEnv,
};
