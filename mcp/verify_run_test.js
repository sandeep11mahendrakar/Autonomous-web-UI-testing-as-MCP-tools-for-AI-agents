'use strict';

/**
 * mcp/verify_run_test.js — protocol-level run_test + get_evidence check.
 * Usage: node mcp/verify_run_test.js <run_id> <test_id>
 */

const { spawn } = require('child_process');
const path = require('path');

const RUN_ID = process.argv[2];
const TEST_ID = process.argv[3] || 'TC01';
if (!RUN_ID) {
  console.error('Usage: node mcp/verify_run_test.js <run_id> [test_id]');
  process.exit(1);
}

const server = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  cwd: path.join(__dirname, '..'),
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buf = '';
let nextId = 1;
const pending = new Map();

server.stdout.setEncoding('utf8');
server.stdout.on('data', (c) => {
  buf += c;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let m;
    try { m = JSON.parse(line); } catch (_) { continue; }
    if (m.method === 'notifications/message') {
      const d = String((m.params && m.params.data) || '');
      if (/execute|error|fatal/i.test(d)) process.stderr.write(`  [srv] ${d.slice(0, 160)}\n`);
      continue; // MUST be continue: a response can share this chunk
    }
    if (m.id !== undefined && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  }
});
server.stderr.setEncoding('utf8');
server.stderr.on('data', (d) => process.stderr.write(`[server:err] ${d}`));

function req(method, params) {
  const id = nextId++;
  return new Promise((res) => {
    pending.set(id, res);
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

(async () => {
  await req('initialize', {});
  console.log(`run_test ${RUN_ID}/${TEST_ID} (live replay; be patient)`);
  const t0 = Date.now();
  const rt = await req('tools/call', {
    name: 'run_test',
    arguments: { run_id: RUN_ID, test_id: TEST_ID },
  });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (!rt.result || rt.result.isError) {
    console.log(`RUN_TEST FAILED (${secs}s):`, rt.error ? JSON.stringify(rt.error) : rt.result.content[0].text.slice(0, 500));
    server.kill();
    process.exit(1);
  }
  const d = JSON.parse(rt.result.content[0].text);
  console.log(`RUN_TEST OK (${secs}s): status=${d.status} steps=${d.steps_executed.length}`);
  console.log('verification:', JSON.stringify(d.verification), 'strength:', d.verification_strength);
  console.log('screenshots:', JSON.stringify(d.screenshots));

  const ev = await req('tools/call', {
    name: 'get_evidence',
    arguments: { run_id: RUN_ID, test_id: TEST_ID },
  });
  const e = JSON.parse(ev.result.content[0].text);
  console.log(`GET_EVIDENCE OK: executed=${e.executed} step_screenshots=${e.step_screenshots.length}`);

  console.log('\nRUN_TEST+GET_EVIDENCE CHECKS PASSED');
  try { server.stdin.end(); } catch (_) {}
  try { server.kill(); } catch (_) {}
  process.exitCode = 0;
  setTimeout(() => process.exit(0), 300);
})().catch((err) => {
  console.error(err);
  server.kill();
  process.exit(1);
});
