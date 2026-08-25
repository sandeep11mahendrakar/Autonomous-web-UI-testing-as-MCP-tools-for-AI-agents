'use strict';

/** Quick protocol smoke: initialize, tools/list, typed error paths. No pipeline. */

const { spawn } = require('child_process');
const path = require('path');

const server = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  cwd: path.join(__dirname, '..'),
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buf = '';
let nextId = 1;
const pending = new Map();

server.stdout.setEncoding('utf8');
server.stdout.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (_) { continue; }
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
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

function fail(why) {
  console.error(`FAIL: ${why}`);
  server.kill();
  process.exit(1);
}

(async () => {
  const init = await request('initialize', {});
  if (!init.result || !init.result.protocolVersion) fail('initialize');
  console.log('ok - initialize:', init.result.serverInfo.name, init.result.serverInfo.version);

  const list = await request('tools/list', {});
  if (!list.result || list.result.tools.length !== 5) fail('tools/list count');
  console.log('ok - tools/list:', list.result.tools.map((t) => t.name).join(', '));

  // unknown method -> -32601
  const unknown = await request('bogus/method', {});
  if (!unknown.error || unknown.error.code !== -32601) fail(`unknown method code: ${JSON.stringify(unknown.error)}`);
  console.log('ok - bogus/method ->', unknown.error.code);

  // missing required arg -> -32602 (JSON-RPC level)
  const miss = await request('tools/call', { name: 'list_tests', arguments: {} });
  if (!miss.error || miss.error.code !== -32602) {
    fail(`missing-arg handling: ${JSON.stringify(miss).slice(0, 300)}`);
  }
  console.log('ok - list_tests {} -> -32602:', miss.error.message);

  // unknown tool -> -32602 (JSON-RPC level)
  const unkTool = await request('tools/call', { name: 'nope', arguments: {} });
  if (!unkTool.error || unkTool.error.code !== -32602) {
    fail(`unknown tool handling: ${JSON.stringify(unkTool).slice(0, 300)}`);
  }
  console.log('ok - unknown tool -> -32602:', unkTool.error.message);

  // typed run_not_found -> -32001
  const rnf = await request('tools/call', { name: 'list_tests', arguments: { run_id: 'run_1' } });
  if (!rnf.result || !rnf.result.isError || !/-32001/.test(rnf.result.content[0].text)) {
    fail(`typed run_not_found: ${JSON.stringify(rnf).slice(0, 300)}`);
  }
  console.log('ok - list_tests run_1 -> isError with -32001');

  // invalid url on explore_site -> -32602 (fast reject, no spawn)
  const badUrl = await request('tools/call', {
    name: 'explore_site',
    arguments: { url: 'not-a-url' },
  });
  if (!badUrl.result || !badUrl.result.isError || !/-32602/.test(badUrl.result.content[0].text)) {
    fail(`invalid-url handling: ${JSON.stringify(badUrl).slice(0, 300)}`);
  }
  console.log('ok - explore_site "not-a-url" -> isError with -32602');

  console.log('\nALL SMOKE CHECKS PASSED');
  server.kill();
  setTimeout(() => process.exit(0), 200);
})().catch((e) => fail(e.message));
