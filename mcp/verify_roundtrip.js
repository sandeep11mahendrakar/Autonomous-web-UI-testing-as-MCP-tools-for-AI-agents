'use strict';

/**
 * mcp/verify_roundtrip.js — offline roundtrip verification for vision-mcp.
 *
 * Spawns mcp/server.js, then over stdio:
 *   1. initialize            -> expects protocolVersion + serverInfo
 *   2. notifications/initialized
 *   3. tools/list            -> expects 5 tools
 *   4. tools/call get_visual_dom (stub) -> expects isError with code -32006
 *   5. tools/call explore_site {url}    -> expects result containing run_id
 *
 * Step 5 runs a REAL pipeline pass. Set STUB_LLM=true for a no-API smoke
 * run (recommended); without it the caller's LLM env/key and quota are used.
 *
 * Usage:
 *   STUB_LLM=true node mcp/verify_roundtrip.js https://example.com
 */

const { spawn } = require('child_process');
const path = require('path');

const URL_TO_EXPLORE = process.argv[2] || 'https://example.com';
const ROUNDTRIP_TIMEOUT_MS =
  Number(process.env.MCP_VERIFY_TIMEOUT_MS) || 25 * 60 * 1000;

const server = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env },
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buf = '';
let nextId = 1;
const pending = new Map(); // id -> resolve

server.stdout.setEncoding('utf8');
server.stdout.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (_) {
      continue; // tolerate any non-JSON noise defensively
    }
    if (msg.method === 'notifications/message') {
      console.log(`  [srv] ${msg.params && msg.params.data}`);
      continue;
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

server.stderr.setEncoding('utf8');
server.stderr.on('data', (d) => process.stderr.write(`[server:err] ${d}`));
server.on('exit', (code) => {
  if (!finished) fail(`server exited early (code ${code})`);
});

function request(method, params) {
  const id = nextId++;
  const msg = { jsonrpc: '2.0', id, method };
  if (params !== undefined) msg.params = params;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    server.stdin.write(JSON.stringify(msg) + '\n');
  });
}

function notify(method, params) {
  const msg = { jsonrpc: '2.0', method };
  if (params !== undefined) msg.params = params;
  server.stdin.write(JSON.stringify(msg) + '\n');
}

function fail(why) {
  console.error(`\nFAIL: ${why}`);
  try { server.kill(); } catch (_) {}
  process.exit(1);
}

function assert(cond, why) {
  if (!cond) fail(why);
  console.log(`ok - ${why}`);
}

let finished = false;

(async () => {
  const guard = setTimeout(
    () => fail(`roundtrip exceeded ${ROUNDTRIP_TIMEOUT_MS}ms`),
    ROUNDTRIP_TIMEOUT_MS
  );

  // 1. initialize
  const init = await request('initialize', { protocolVersion: '2024-11-05' });
  assert(init.result && init.result.protocolVersion === '2024-11-05', 'initialize returns protocolVersion');
  assert(/vision-mcp/.test(init.result.serverInfo.name), 'initialize returns serverInfo.name=vision-mcp');

  // 2. initialized notification
  notify('notifications/initialized');

  // 3. tools/list
  const list = await request('tools/list', {});
  assert(list.result && list.result.tools.length === 5, 'tools/list returns 5 tools');

  // 4. stub tool still returns typed -32006
  const stub = await request('tools/call', {
    name: 'get_visual_dom',
    arguments: { run_id: 'nonexistent' },
  });
  assert(stub.result && stub.result.isError === true, 'stub tool call is isError=true');
  assert(/-32006/.test(stub.result.content[0].text), 'stub tool error carries code -32006');

  // 5. real explore_site roundtrip
  console.log(`\nexplore_site -> ${URL_TO_EXPLORE} (this runs the pipeline; be patient)\n`);
  const t0 = Date.now();
  const exp = await request('tools/call', {
    name: 'explore_site',
    arguments: { url: URL_TO_EXPLORE },
  });
  assert(!exp.error, 'explore_site produced a JSON-RPC response');
  let payload;
  try {
    payload = JSON.parse(exp.result.content[0].text);
  } catch (e) {
    return fail(`explore_site content not JSON: ${e.message}`);
  }
  if (exp.result.isError) {
    return fail(`explore_site failed: ${JSON.stringify(payload).slice(0, 2000)}`);
  }
  assert(typeof payload.run_id === 'string' && payload.run_id.length > 0, `explore_site returned run_id=${payload.run_id}`);
  assert(typeof payload.termination_reason === 'string', `termination_reason=${payload.termination_reason}`);
  assert(payload.totals && typeof payload.totals.total_states === 'number', 'totals.total_states present');
  console.log(`\nexplore completed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  clearTimeout(guard);
  finished = true;
  console.log('\nALL CHECKS PASSED — initialize+call roundtrip verified.');
  server.kill();
  // give stdio a beat to flush, then exit cleanly
  setTimeout(() => process.exit(0), 300);
})().catch((e) => fail(e.message));
