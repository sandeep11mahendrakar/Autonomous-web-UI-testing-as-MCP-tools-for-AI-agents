'use strict';

/**
 * interactive.js — live, persistent Architecture-A testing session.
 *
 * The browser and exploration memory STAY ALIVE across commands: run a full
 * cycle, then keep issuing directives ("test the add-to-cart feature",
 * "quickly check the login page") without restarting anything.
 *
 * Usage:
 *   node interactive.js [url] [--headless] [--auth <user> <pass>]
 *
 * Commands (at the itest> prompt):
 *   explore <url> [--quick|--extensive]   full exploration cycle of a site
 *   test <description> [--quick|--extensive] [--url <u>]
 *                                         DIRECTED testing — e.g.
 *                                         "test the add to cart feature extensively"
 *                                         Explores toward the target, generates
 *                                         tests, AUTO-EXECUTES them live.
 *   status                                current session summary
 *   states                                list visited states
 *   tests                                 list generated test cases
 *   run <TCID>                            execute one generated test live
 *   headless on|off                       toggle browser visibility (relaunch)
 *   quit                                  end session
 */

const path = require('path');
const fs = require('fs');
const ROOT = __dirname;

// Load provider config from the existing untracked .env files (same
// convention as runBoth.js). Secrets are never printed.
for (const envFile of ['web/.env', 'vision/.env']) {
  try {
    for (const line of fs.readFileSync(path.join(ROOT, envFile), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
    }
  } catch (_) { /* optional */ }
}

const readline = require('readline');

const { ExploreSession } = require(path.join(ROOT, 'web', 'src', 'engine'));

// ── CLI args ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const startUrl = argv.find(a => !a.startsWith('--')) || null;
const headlessFlag = argv.includes('--headless');
let seed = null;
{
  const i = argv.indexOf('--auth');
  if (i !== -1 && argv[i + 1] && argv[i + 2]) {
    seed = { username: argv[i + 1], password: argv[i + 2] };
  }
}

const sessionId = `session_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)}`;
const outDir = process.env.ARCH_A_OUTPUT_DIR ||
  path.join(__dirname, 'runs', sessionId);
fs.mkdirSync(outDir, { recursive: true });

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  Capstone Interactive Testing Session (Architecture A)  ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(`Session artifacts: ${outDir}`);
console.log(`Browser: ${headlessFlag ? 'HEADLESS' : 'VISIBLE'} (toggle anytime: headless on|off)`);
if (seed) console.log('Auth seed: enabled (values not logged)');
console.log('Type "help" for commands.\n');

const session = new ExploreSession({
  headless: headlessFlag,
  outputDir: outDir,
  seed,
});

function printHelp() {
  console.log(`
Commands:
  explore <url> [--quick|--extensive]      Full exploration cycle; browser stays open after.
  test <what> [--quick|--extensive] [--url <u>]
                                           Directed testing, e.g.:
                                             test add to cart feature extensively
                                             quickly check the login page
                                           → explores toward the target, generates
                                             tests, AUTO-EXECUTES them live.
  status                                   Session summary (steps/states/tests).
  states                                   List visited states.
  tests                                    List generated test cases.
  run <TCID>                               Execute a generated test live.
  headless on|off                          Toggle browser visibility.
  quit                                     Close session.`);
}

function parseEffort(args) {
  if (args.includes('--quick')) return 'quick';
  if (args.includes('--extensive') || args.includes('--deep')) return 'extensive';
  return null; // let engine infer from wording
}

function extractUrl(text) {
  const m = text.match(/https?:\/\/[^\s]+/);
  return m ? m[0] : null;
}

async function cmdExplore(rest) {
  const url = extractUrl(rest) || rest.trim().split(/\s+/)[0];
  if (!/^https?:\/\//.test(url || '')) {
    console.log('Usage: explore <url> [--quick|--extensive]');
    return;
  }
  if (!session.homeUrl) await session.launch(url);
  else await session.gotoPage(url);
  const effort = parseEffort(rest.split(/\s+/)) || ExploreSession.effortFromText('');
  await session.runFlow({ name: 'explore', url: null, goalDirective: null, effort });
}

async function cmdTest(line) {
  // Strip flags to get the natural-language directive.
  const directive = line
    .replace(/--(quick|deep|extensive)/g, '')
    .replace(/--url\s+\S+/g, '')
    .trim();
  if (!directive) {
    console.log('Usage: test <description> [--quick|--extensive] [--url <u>]');
    return;
  }
  const effort = parseEffort(line.split(/\s+/)) || ExploreSession.effortFromText(directive);
  const url = extractUrl(line);

  if (!session.browser) {
    const launchUrl = url || directiveToLikelyHome(directive);
    console.log(`[itest] Launching browser at ${launchUrl}`);
    await session.launch(launchUrl);
  } else if (url && !session.page.url().startsWith(url)) {
    await session.gotoPage(url);
  }

  const before = session.loadGeneratedTests().length;
  await session.runFlow({
    name: 'directed',
    url: null,
    goalDirective: directive,
    effort,
  });

  // Generate + AUTO-EXECUTE whatever is new.
  await session.generateTests();
  const all = session.loadGeneratedTests();
  const fresh = all.slice(before);
  if (!fresh.length) {
    console.log('[itest] No new test cases generated from this cycle.');
    return;
  }
  console.log(`\n[itest] ${fresh.length} new test(s) — AUTO-EXECUTING live:`);
  for (const tc of fresh) {
    await session.executeTestCase(tc);
  }
}

/** Best-effort home URL when user gives none: reuse visited origin. */
function directiveToLikelyHome() {
  if (session.homeUrl) return session.homeUrl;
  if (session.states.length) return session.states[0].url;
  return null;
}

async function cmdRun(tcid) {
  const all = session.loadGeneratedTests();
  const tc = all.find(t => t.id.toLowerCase() === String(tcid).toLowerCase());
  if (!tc) {
    console.log(`Test "${tcid}" not found. Available: ${all.map(t => t.id).join(', ') || '(none)'}`);
    return;
  }
  await session.executeTestCase(tc);
}

async function handle(line) {
  const trimmed = line.trim();
  if (!trimmed) return;
  const spaceIdx = trimmed.indexOf(' ');
  const cmd = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();
  const rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1);

  switch (cmd) {
  case 'help':
  case '?':
    printHelp();
    break;
  case 'explore':
    await cmdExplore(rest);
    break;
  case 'test':
    await cmdTest(rest);
    break;
  case 'status': {
    const s = session.status();
    console.log(JSON.stringify(s, null, 2));
    break;
  }
  case 'states': {
    for (const s of session.listStates()) {
      console.log(`${s.id}  via:${s.via.padEnd(9)} els:${String(s.elements).padEnd(4)} ${s.title?.slice(0, 40)} @ ${s.url}`);
    }
    if (!session.states.length) console.log('(no states yet)');
    break;
  }
  case 'tests': {
    const tcs = session.loadGeneratedTests();
    for (const tc of tcs) console.log(`${tc.id} (${tc.steps.length} steps): ${tc.objective}`);
    if (!tcs.length) console.log('(no tests yet — run explore/test first)');
    break;
  }
  case 'run':
    await cmdRun(rest.trim());
    break;
  case 'headless': {
    const on = /^on|true|yes$/i.test(rest.trim());
    console.log(`Relaunching browser ${on ? 'HEADLESS' : 'VISIBLE'}...`);
    await session.relaunch(on);
    console.log(`Done — now at ${session.page.url()}`);
    break;
  }
  case 'quit':
  case 'exit':
    return true;
  default:
    console.log(`Unknown command "${cmd}". Type "help".`);
  }
  return false;
}

(async () => {
  if (startUrl) {
    try {
      await session.launch(startUrl);
      console.log(`[itest] Browser open at ${startUrl}. Ready.\n`);
    } catch (err) {
      console.error(`[itest] Launch failed: ${err.message}`);
    }
  } else {
    console.log('[itest] No start URL given — use: explore <url>\n');
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'itest> ',
  });
  rl.prompt();

  let busy = false;
  let pendingExit = false;
  const doExit = async () => {
    console.log('[itest] Closing session...');
    session.persist();
    await session.close();
    process.exit(0);
  };
  rl.on('line', async (line) => {
    rl.pause(); // serialize commands — never interleave with a running cycle
    busy = true;
    try {
      const quit = await handle(line);
      if (quit) pendingExit = true;
    } catch (err) {
      console.error(`[itest] Command failed: ${err.message.slice(0, 200)}`);
    }
    busy = false;
    if (pendingExit) { await doExit(); return; }
    if (!rl.closed) { rl.resume(); rl.prompt(); }
  }).on('close', () => {
    // Piped/scripted input: stdin ends right after the last line — wait for
    // the in-flight command instead of killing it.
    pendingExit = true;
    if (!busy) doExit();
  });
})().catch(err => {
  console.error('[itest] Fatal:', err.message);
  process.exit(1);
});
