'use strict';

/**
 * runBoth.js — unified Capstone demo runner.
 *
 * Runs Architecture A (DOM + Memory Log, web/) and Architecture B (Vision,
 * vision/) against the SAME URL in parallel under ONE shared run ID.
 *
 * The runner is ONLY an orchestrator: both architectures keep their own
 * internal pipelines, ports and output locations untouched. When each
 * finishes, its artifacts are COLLECTED into a shared run folder:
 *
 *   runs/<run_id>/
 *     run_manifest.json
 *     dom/      <- Architecture A artifacts (memory log, screenshots, ...)
 *     vision/   <- Architecture B artifacts (evidence, visual DOMs, tests...)
 *
 * Usage:
 *   node runBoth.js [url]
 *   (interactive prompt when no URL is given; default https://demoqa.com)
 *
 * Optional environment overrides:
 *   ARCH_A_TIMEOUT_MS  (default 900000 = 15 min)
 *   ARCH_B_TIMEOUT_MS  (default 900000 = 15 min)
 *
 * API keys are NEVER hard-coded: GROQ_API_KEY is taken from the process
 * environment or from the existing untracked .env files (web/.env,
 * vision/.env). Secrets are never printed.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const net = require('net');
const { selectExplorationTestCases, archBOutcome } = require('./lib/archBStage');
// Audit ADDENDUM remediation (defect candidate #24): per-artifact provenance
// guard shared with test/provenance_guard.test.js.
const { artifactBelongsToRun } = require('./lib/provenanceGuard');

const ROOT = __dirname;
const WEB_DIR = path.join(ROOT, 'web');
const VISION_DIR = path.join(ROOT, 'vision');

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function log(channel, msg) {
  console.log(`[${channel}] ${msg}`);
}

// ---------------------------------------------------------------------------
// Environment handling (no secrets printed)
// ---------------------------------------------------------------------------

function loadEnvFile(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch (_) { /* file optional */ }
  return out;
}

/** Resolve the child env without ever echoing secret values. */
function buildChildEnv() {
  const env = { ...process.env };
  if (!env.GROQ_API_KEY) {
    // Both architectures use the same variable name already; borrow it from
    // the existing untracked .env conventions if the shell did not provide it.
    for (const f of [path.join(VISION_DIR, '.env'), path.join(WEB_DIR, '.env')]) {
      const vals = loadEnvFile(f);
      if (vals.GROQ_API_KEY) {
        env.GROQ_API_KEY = vals.GROQ_API_KEY;
        break;
      }
    }
  }
  env.GROQ_API_KEY_SET = env.GROQ_API_KEY ? 'true' : 'false';
  return env;
}

/**
 * Architecture-B child env. Groq rate limits (TPD) are PER MODEL, so a single
 * shared model can starve one architecture when the other burns the pool.
 * Set GROQ_MODEL_B (legacy) or ARCH_B_LLM_* variables to route B's LLM calls
 * to a different model/provider/quota pool. A reads only ARCH_A_ and GROQ_A
 * variables; B reads only ARCH_B_ and GROQ_ variables — the configurations
 * can never mix because each architecture's client resolves its own prefix.
 */
function buildVisionEnv(childEnv) {
  const modelB = process.env.GROQ_MODEL_B;
  return modelB ? { ...childEnv, GROQ_MODEL: modelB } : childEnv;
}

/** Provider/model summary for logs — NEVER includes API keys. */
function logLLMConfig(label, env, prefix) {
  const provider = (env[prefix + 'LLM_PROVIDER'] || 'groq').toLowerCase();
  const model = env[prefix + 'LLM_MODEL'] ||
    (prefix === 'ARCH_A_' ? (env.GROQ_MODEL_A || env.GROQ_MODEL) : (env.GROQ_MODEL_B || env.GROQ_MODEL)) ||
    '(provider default)';
  log('RUN', `${label} LLM: provider=${provider} model=${model} key=${env[prefix + 'LLM_API_KEY'] || env.GROQ_API_KEY ? 'set' : 'NOT SET'}`);
}

// ---------------------------------------------------------------------------
// Port safety (Vision uses 5000-5004)
// ---------------------------------------------------------------------------

function isPortOpen(port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host: '127.0.0.1' }, () => {
      s.destroy();
      resolve(true);
    });
    s.on('error', () => resolve(false));
    s.setTimeout(800, () => { s.destroy(); resolve(false); });
  });
}

async function freeVisionPorts() {
  const ports = [5000, 5001, 5002, 5003, 5004];
  for (const port of ports) {
    if (!(await isPortOpen(port))) continue;
    log('RUN', `Port ${port} busy — freeing leftover process...`);
    try {
      const out = execSync('netstat -ano', { encoding: 'utf8' });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (line.includes(`:${port} `) && line.includes('LISTENING')) {
          const pid = line.trim().split(/\s+/).pop();
          if (pid && /^\d+$/.test(pid)) pids.add(pid);
        }
      }
      for (const pid of pids) {
        try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch (_) {}
      }
      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      log('RUN', `Could not free port ${port}: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Child-process plumbing
// ---------------------------------------------------------------------------

function teeSpawn(label, command, args, cwd, env, timeoutMs, logFilePath) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    logStream.write(`\n===== ${label} started ${new Date().toISOString()} =====\n`);

    const child = spawn(command, args, { cwd, env }); // no shell: keeps args with spaces intact
    let timedOut = false;

    const pipe = (stream, isErr) => {
      let buf = '';
      stream.on('data', (d) => {
        buf += d.toString();
        const lines = buf.split(/\r?\n/);
        buf = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          console.log(`[${label}] ${line}`);
          logStream.write(line + '\n');
        }
      }).on('close', () => {
        if (buf.trim()) {
          console.log(`[${label}] ${buf}`);
          logStream.write(buf + '\n');
        }
      });
    };
    pipe(child.stdout, false);
    pipe(child.stderr, true);

    const timer = setTimeout(() => {
      timedOut = true;
      console.log(`[${label}] Timeout (${Math.round(timeoutMs / 60000)} min) — terminating process tree...`);
      try {
        if (process.platform === 'win32' && child.pid) {
          execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
        } else {
          child.kill();
        }
      } catch (_) {}
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      logStream.end(`\n===== exited code=${code} timedOut=${timedOut} =====\n`);
      resolve({
        status: timedOut ? 'timeout' : (code === 0 ? 'success' : `failed(exit ${code})`),
        exitCode: code,
        duration_ms: Date.now() - startedAt,
        log_file: path.relative(ROOT, logFilePath),
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Artifact collection into the unified run tree
// ---------------------------------------------------------------------------

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function collectArchitectureA(domDir) {
  // SAFETY NET only: A now direct-writes into domDir via ARCH_A_OUTPUT_DIR.
  // Never overwrite fresh run artifacts with older copies from web/logs.
  const copied = [];
  const srcLog = path.join(WEB_DIR, 'logs');
  const copyIfMissing = (srcName, destName) => {
    const src = path.join(srcLog, srcName);
    const dest = path.join(domDir, destName);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      copied.push(destName);
    }
  };
  copyIfMissing('memory_log.json', 'memory_log.json');
  copyIfMissing('test_cases.json', 'test_cases.json');
  copyIfMissing('states.json', 'states.json');
  copyIfMissing('transitions.json', 'transitions.json');
  copyIfMissing('exploration_summary.json', 'exploration_summary.json');
  const shots = path.join(srcLog, 'screenshots');
  const destShots = path.join(domDir, 'screenshots');
  if (fs.existsSync(shots) && !fs.existsSync(destShots)) {
    copyDir(shots, destShots);
    copied.push(`screenshots/ (${fs.readdirSync(destShots).length} files)`);
  }
  return copied;
}

// KNOWN_ALIASES / hostMatchesTarget moved to lib/provenanceGuard.js (shared
// with the regression tests).

/**
 * Provenance guard (audit remediation, extended per defect candidate #24):
 * a vision-output artifact is only this run's artifact if every URL it
 * references matches the manifest URL host (redirect aliases allowed).
 * Covers *_exploration_result.json, test_cases_*.json AND
 * execution_results.json — the mtime window previously stitched OTHER
 * pipelines' test cases + execution results into this run's folder even
 * after exploration results were filtered (site 31/32 contamination-skips,
 * 2026-08-26). Anything foreign stays OUT of the run folder.
 */
const PROVENANCE_FILE_RE = /exploration_result|test_cases_.*exploration\.json$|^execution_results\.json$/;

function j(p){ try { return JSON.parse(fs.readFileSync(p,String.fromCharCode(117,116,102,56))); } catch(_) { return null; } }

function collectArchitectureB(visionDir, startedAt, manifestUrl) {
  const copied = [];
  const rejected = [];
  const shotsRoot = path.join(VISION_DIR, 'storage', 'screenshots');
  if (fs.existsSync(shotsRoot)) {
    for (const dir of fs.readdirSync(shotsRoot)) {
      const full = path.join(shotsRoot, dir);
      if (fs.statSync(full).mtimeMs >= startedAt - 5000) { // this run's evidence only
        copyDir(full, path.join(visionDir, 'screenshots', dir));
        copied.push(`screenshots/${dir}/ (${fs.readdirSync(full).length} files)`);
      }
    }
  }
  const outs = path.join(VISION_DIR, 'storage', 'outputs');
  const destOut = path.join(visionDir, 'outputs');
  fs.mkdirSync(destOut, { recursive: true });
  for (const f of fs.readdirSync(outs)) {
    const full = path.join(outs, f);
    if (!fs.statSync(full).isFile() || fs.statSync(full).mtimeMs < startedAt - 5000) continue;
    // Provenance check (audit F-01/F-02 remediation + defect #24 extension):
    // the mtime window previously stitched OTHER studies' artifacts into
    // this run's folder - the root cause of the Tier-2 quarantine and the
    // site 31/32 contamination-skips. Now guards exploration results,
    // test_cases_* files AND execution_results.json.
    let belongs = true;
    if (PROVENANCE_FILE_RE.test(f)) {
      const r = j(full);
      const verdict = artifactBelongsToRun(r, manifestUrl);
      if (!verdict.ok) {
        belongs = false;
        rejected.push(`${f}: ${verdict.via}`);
        log('RUN', `PROVENANCE REJECT ${f} -> ${verdict.via} (quarantined out of run folder)`);
        continue;
      }
    }
    fs.copyFileSync(full, path.join(destOut, f));
    copied.push(`outputs/${f}`);
  }
  if (rejected.length && manifestUrl) {
    try {
      fs.writeFileSync(path.join(visionDir, 'CONTAMINATION_REJECTS.json'),
        JSON.stringify({ manifest_url: manifestUrl, rejected, at: new Date().toISOString() }, null, 2));
    } catch (_) {}
  }
  return copied;
}

// ---------------------------------------------------------------------------

async function askUrl() {
  const urlArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (urlArg) return urlArg;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((res) =>
    rl.question('Enter website URL [https://demoqa.com]: ', res));
  rl.close();
  return answer.trim() || 'https://demoqa.com';
}

/**
 * Authenticated-seed support: `node runBoth.js <url> --auth <user> <pass>`.
 * Credentials travel ONLY through the child process environment; they are
 * never printed, logged, or written to the manifest.
 */
function parseAuthSeed() {
  const idx = process.argv.indexOf('--auth');
  if (idx === -1) return null;
  const user = process.argv[idx + 1];
  const pass = process.argv[idx + 2];
  if (!user || !pass) {
    console.error('[RUN] --auth requires both a username and a password argument.');
    process.exit(2);
  }
  return { username: user, password: pass };
}

(async () => {
  const url = await askUrl();
  const authSeed = parseAuthSeed();
  const runId = `run_${ts()}`;
  const runDir = path.join(ROOT, 'runs', runId);
  const domDir = path.join(runDir, 'dom');
  const visionDir = path.join(runDir, 'vision');
  for (const d of [domDir, visionDir]) fs.mkdirSync(d, { recursive: true });

  log('RUN', `Run ID: ${runId}`);
  log('RUN', `URL: ${url}`);
  log('RUN', `Auth seed: ${authSeed ? 'enabled (username provided; value not logged)' : 'not provided'}`);
  log('RUN', `Output tree: ${path.relative(process.cwd(), runDir)}`);

  const childEnv = buildChildEnv();
  if (authSeed) {
    childEnv.SEED_USERNAME = authSeed.username;
    childEnv.SEED_PASSWORD = authSeed.password;
  }
  const visionEnv = buildVisionEnv(childEnv);
  log('RUN', `GROQ_API_KEY available: ${childEnv.GROQ_API_KEY_SET}`);
  logLLMConfig('ARCH-A', childEnv, 'ARCH_A_');
  logLLMConfig('ARCH-B', visionEnv, 'ARCH_B_');

  await freeVisionPorts();

  const archATimeout = Number(process.env.ARCH_A_TIMEOUT_MS) || 15 * 60 * 1000;
  const archBTimeout = Number(process.env.ARCH_B_TIMEOUT_MS) || 15 * 60 * 1000;

  log('ARCH-A', 'Starting... (DOM + memory-log exploration)');
  log('ARCH-B', 'Starting... (Vision pipeline: capture -> YOLO/OCR -> visual DOM -> LLM tests -> execution)');

  const runStartedAt = Date.now();

  // ----- Architecture B: AUTONOMOUS MULTI-PAGE exploration, then execution.
  // --explore makes B capture every page it navigates to (states, evidence,
  // per-state re-detection) and convert discovered workflows into a
  // replayable test_cases_<run_id>_exploration.json. The one-shot homepage
  // mode is NOT used here — it would only ever capture the landing page.
  const archBPromise = (async () => {
    const gen = await teeSpawn(
      'ARCH-B', 'node', ['runVision.js', '--explore', url], VISION_DIR, visionEnv, archBTimeout,
      path.join(visionDir, 'run_generate.log')
    );
    if (gen.status !== 'success') {
      return { ...gen, stage: 'exploration', collected: [] };
    }
    // Execute ONLY the exploration test cases produced during THIS unified
    // run. Never fall back to stale files from previous runs; a zero/invalid
    // case file is reported honestly instead of executed.
    const outDir = path.join(VISION_DIR, 'storage', 'outputs');
    const sel = selectExplorationTestCases(outDir, runStartedAt - 5000);
    if (!sel.selected || !sel.valid) {
      return {
        status: 'partial_success',
        stage: 'exploration-produced-no-test-cases',
        duration_ms: gen.duration_ms,
        collected: [],
      };
    }
    const exec = await teeSpawn(
      'ARCH-B', 'node',
      ['src/executeTests.js', sel.selected.full, url],
      VISION_DIR, visionEnv, archBTimeout,
      path.join(visionDir, 'run_execute.log')
    );
    return archBOutcome({ gen, sel, exec });
  })();

  // ----- Architecture A: exploration (its own entry point, unchanged).
  // A writes directly into the unified run tree via ARCH_A_OUTPUT_DIR.
  const archAPromise = (async () => {
    const aEnv = { ...childEnv, ARCH_A_OUTPUT_DIR: domDir };
    const res = await teeSpawn(
      'ARCH-A', 'node', ['explore.js', url], WEB_DIR, aEnv, archATimeout,
      path.join(domDir, 'run_explore.log')
    );
    if (res.status === 'success') {
      // Test generation already runs inside explore.js; this is only a
      // safety-net re-invocation if explore.js could not finish it.
      if (!fs.existsSync(path.join(domDir, 'test_cases.json'))) {
        try {
          execSync(
            'node -e "const {generateTestCases}=require(\'./src/testGenerator\');' +
            'const {loadLog}=require(\'./src/memoryLog\');' +
            'const fs=require(\'fs\');let tr=[];try{tr=JSON.parse(fs.readFileSync(\'transitions.json\',\'utf8\'))}catch(_){};' +
            'generateTestCases({memoryLog:loadLog(\'memory_log.json\'),transitions:tr})' +
            '.then(tc=>console.log(\'generated\',tc.length))' +
            '.catch(e=>{console.error(e.message);process.exit(1)})"',
            { cwd: WEB_DIR, env: aEnv, stdio: 'inherit', timeout: 120000, shell: true }
          );
        } catch (err) {
          log('ARCH-A', `Test-case generation step failed: ${err.message.slice(0, 120)}`);
        }
      }
    }
    return res;
  })();

  const [archA, archBraw] = await Promise.all([archAPromise, archBPromise]);

  log('RUN', 'Collecting artifacts into unified run tree...');
  const aCopied = collectArchitectureA(domDir);
  const bCollected = collectArchitectureB(visionDir, runStartedAt, url);
  const archB = { ...archBraw, collected: bCollected };

  const overall = archA.status === 'success' && archB.status === 'success'
    ? 'SUCCESS'
    : (archA.status === 'success' || archB.status === 'success' ? 'PARTIAL_FAILURE' : 'FAILED');

  const manifest = {
    run_id: runId,
    url,
    auth_seed_enabled: !!authSeed,
    started_at: new Date(runStartedAt).toISOString(),
    finished_at: new Date().toISOString(),
    overall_status: overall,
    architecture_a: {
      name: 'DOM + Memory Log (web/)',
      ...archA,
      collected_artifacts: aCopied,
      output_dir: path.relative(ROOT, domDir),
    },
    architecture_b: {
      name: 'Vision (vision/)',
      ...archB,
      output_dir: path.relative(ROOT, visionDir),
    },
  };
  const manifestPath = path.join(runDir, 'run_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('\n=========================================');
  log('RUN', `Architecture A: ${archA.status}`);
  log('RUN', `Architecture B: ${archB.status}`);
  log('RUN', `Overall run: ${overall}`);
  console.log('[RUN] Results:');
  console.log(`  DOM:    ${path.relative(process.cwd(), domDir)}`);
  console.log(`       -> ${aCopied.join(', ') || '(no artifacts produced)'}`);
  console.log(`  VISION: ${path.relative(process.cwd(), visionDir)}`);
  console.log(`       -> ${bCollected.length} artifact(s)`);
  console.log(`Manifest:\n  ${path.relative(process.cwd(), manifestPath)}`);
  console.log('=========================================');
  process.exit(overall === 'FAILED' ? 1 : 0);
})();
